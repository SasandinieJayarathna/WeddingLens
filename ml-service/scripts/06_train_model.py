"""
06_train_model.py
------------------
IN ONE SENTENCE: teaches the AI model to recognise the 6 wedding aesthetic
styles by showing it the training photos, over and over, adjusting itself
each time.

Phase 2, Step 2: train the WeddingLens style classifier.

NOTE (taxonomy history): partway through this project, this script was
temporarily changed to train a 5-class Sri Lankan wedding-market taxonomy
(sinhala_kandyan, tamil_hindu_traditional, western_white, modern_fusion,
indian_influenced) instead of the original 6-class generic-aesthetic
taxonomy. That change was reverted at the project owner's request, to stay
aligned with the formal project proposal's original 6-class taxonomy
(boho_chic, rustic_barn, luxury_glamour, garden_floral, minimalist_modern,
traditional_classic). The 5-class dataset/model this script produced are
archived at ml-service/archive_5class_taxonomy/ rather than deleted (see
that folder and CLAUDE.md for the full retaxonomy-and-revert story).

What this script does (in plain English):
  We use "transfer learning": instead of teaching a neural network to
  recognise images from zero (which needs millions of photos), we start
  from EfficientNet-B3, a network Google already trained on 1.4 million
  general photos (ImageNet). It already knows how to recognise edges,
  textures, shapes, colours etc. We just teach its final layers to map
  those learned features onto OUR 6 wedding-style categories.

  Training happens in two phases:
    Phase A ("feature extraction"): freeze all of EfficientNet-B3's
      original layers (so their learned weights don't change) and only
      train the small new classification head we added on top. This is
      fast and prevents the new, randomly-initialised head from wrecking
      the pretrained weights early on.
    Phase B ("fine-tuning"): unfreeze the last ~30 layers of
      EfficientNet-B3 and continue training everything together, but with
      a MUCH lower learning rate, so we gently adjust the pretrained
      weights to specialise in wedding photos without destroying what
      they already know.

  EarlyStopping + ModelCheckpoint mean training automatically stops once
  validation loss stops improving, and only the best-performing version of
  the model (by validation loss) is kept on disk.
"""

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
import tensorflow as tf
from tensorflow.keras import layers, models

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
MODELS_DIR = SCRIPT_DIR.parent / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

IMG_SIZE = (300, 300)  # EfficientNet-B3's expected input resolution
BATCH_SIZE = 32
NUM_CLASSES = 6
# Epoch budget/patience is the "v2" config from the retraining experiment in
# extension #8 (see ml-service/archive_5class_taxonomy/ and CLAUDE.md) rather
# than the ORIGINAL v1 config that actually trained the live restored model
# (a hard 10+10 epoch cap, patience 4 - see docs/03_methodology.md §3.3 for
# that run's real history). v2 scored worse on this same 6-class taxonomy
# (53.63% vs v1's 55.31%), so this wider budget was never used to produce the
# currently-live model - it's kept here as the recommended starting point for
# any FUTURE retraining attempt (EarlyStopping deciding when to stop on real
# val_loss plateauing is a better default than a tight fixed epoch count),
# not a claim about how the current model was actually trained.
PHASE_A_EPOCHS = 15
PHASE_B_EPOCHS = 35
PHASE_A_LR = 1e-4
PHASE_B_LR = 1e-5
FINE_TUNE_LAST_N_LAYERS = 30
EARLY_STOPPING_PATIENCE = 6

MODEL_PATH = MODELS_DIR / "weddinglens_effnetb3.keras"
HISTORY_CSV = MODELS_DIR / "training_history.csv"
CURVES_PNG = MODELS_DIR / "training_curves.png"
CLASS_NAMES_JSON = MODELS_DIR / "class_names.json"


def load_datasets():
    """Loads the train/ and val/ folders as batched tf.data datasets (labels
    inferred from subfolder names), saves the detected class order to
    class_names.json so every other script agrees on it, and prefetches both
    datasets for training speed."""
    train_ds = tf.keras.utils.image_dataset_from_directory(
        DATA_DIR / "train",
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="int",
        shuffle=True,
        seed=42,
    )
    val_ds = tf.keras.utils.image_dataset_from_directory(
        DATA_DIR / "val",
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="int",
        shuffle=False,
    )
    class_names = train_ds.class_names
    print(f"Detected classes ({len(class_names)}): {class_names}")

    # Save class names now so downstream scripts (evaluation, Grad-CAM,
    # inference, backend) always agree on which index means which style,
    # regardless of directory iteration order on a different machine.
    CLASS_NAMES_JSON.write_text(json.dumps(class_names, indent=2), encoding="utf-8")

    # Cache + prefetch for training speed; images stay as uint8 in [0,255]
    # here, EfficientNet's own preprocessing is baked into the model below.
    autotune = tf.data.AUTOTUNE
    train_ds = train_ds.prefetch(autotune)
    val_ds = val_ds.prefetch(autotune)
    return train_ds, val_ds, class_names


def build_augmentation_layer():
    """Random flip/rotation/zoom/contrast/translation/brightness - applied
    only to training data, so the model sees slightly different versions of
    each photo every epoch and generalises better instead of memorising
    exact pixels. With most classes around ~140 real training images, and
    sinhala_kandyan at only ~22, more varied augmentation matters more here
    than it would on a larger dataset, to reduce overfitting to those exact
    photos - though augmentation stretches what's there, it can't invent
    genuinely new visual information, so sinhala_kandyan is still expected
    to underperform the other 4 classes (see data/raw/README.md)."""
    return tf.keras.Sequential(
        [
            layers.RandomFlip("horizontal"),
            layers.RandomRotation(0.1),
            layers.RandomZoom(0.1),
            layers.RandomContrast(0.1),
            layers.RandomTranslation(0.1, 0.1),
            layers.RandomBrightness(0.1),
        ],
        name="data_augmentation",
    )


def build_model():
    """Assembles the full model: EfficientNet-B3 (frozen, ImageNet weights)
    wrapped with an augmentation layer, EfficientNet's own preprocessing, and
    a small new classification head (pooling -> dropout -> softmax over the
    6 styles) on top. Returns both the full model and a direct reference to
    the base_model, since Phase B needs to selectively unfreeze its layers."""
    base_model = tf.keras.applications.EfficientNetB3(
        include_top=False,
        weights="imagenet",
        input_shape=(*IMG_SIZE, 3),
    )
    base_model.trainable = False  # frozen for Phase A

    inputs = layers.Input(shape=(*IMG_SIZE, 3))
    x = build_augmentation_layer()(inputs)
    # EfficientNet's own preprocess_input rescales pixels the way it was
    # trained to expect - required for the pretrained weights to work well.
    x = tf.keras.applications.efficientnet.preprocess_input(x)
    x = base_model(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(NUM_CLASSES, activation="softmax")(x)

    model = models.Model(inputs, outputs)
    return model, base_model


def main():
    """Entry point: loads data, builds the model, runs Phase A (frozen base)
    then Phase B (fine-tuning) training, then saves combined history, accuracy/
    loss curve plots, and reports the best epoch found."""
    print("=" * 70)
    print("WeddingLens - Model Training (Phase 2, Step 2)")
    print("=" * 70)

    train_ds, val_ds, class_names = load_datasets()

    model, base_model = build_model()
    model.summary()

    # IMPORTANT: this ONE checkpoint instance is shared across BOTH phases
    # (created once, here, not inside make_callbacks() below). ModelCheckpoint
    # tracks its own "best value seen so far" internally on the instance -
    # if Phase B got a brand-new ModelCheckpoint, its tracker would start
    # fresh (not knowing Phase A's best val_loss), and it could overwrite an
    # already-better Phase A checkpoint on disk with a worse Phase B epoch
    # just because that epoch looked like an "improvement" relative to its
    # own uninformed starting point. Sharing the instance keeps the "best
    # across the whole run" comparison correct. (Caught this by comparing
    # the script's own end-of-run summary against the actual saved file
    # during a real training run - see CLAUDE.md's model retraining notes.)
    checkpoint = tf.keras.callbacks.ModelCheckpoint(
        filepath=str(MODEL_PATH), monitor="val_loss", save_best_only=True
    )

    def make_callbacks():
        # EarlyStopping and ReduceLROnPlateau, by contrast, get FRESH
        # instances per phase - their "epochs since improvement" counters
        # SHOULD reset at the Phase A -> Phase B boundary, since the
        # optimizer/LR/loss landscape genuinely resets when we recompile
        # with unfrozen layers and a new learning rate.
        return [
            tf.keras.callbacks.EarlyStopping(
                monitor="val_loss", patience=EARLY_STOPPING_PATIENCE, restore_best_weights=True
            ),
            checkpoint,
            # When val_loss plateaus but hasn't plateaued long enough to
            # trigger EarlyStopping, try a smaller learning rate first
            # rather than stopping outright - lets the model keep
            # converging on the plateau instead of overshooting it.
            tf.keras.callbacks.ReduceLROnPlateau(
                monitor="val_loss", factor=0.5, patience=3, min_lr=1e-7, verbose=1
            ),
        ]

    # ---------------- Phase A: train the new head, base frozen ----------------
    print("\n--- Phase A: training classification head (base model frozen) ---")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=PHASE_A_LR),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    history_a = model.fit(
        train_ds, validation_data=val_ds, epochs=PHASE_A_EPOCHS, callbacks=make_callbacks()
    )

    # ---------------- Phase B: fine-tune the last N layers ----------------
    print(f"\n--- Phase B: fine-tuning last {FINE_TUNE_LAST_N_LAYERS} layers of EfficientNet-B3 ---")
    base_model.trainable = True
    for layer in base_model.layers[:-FINE_TUNE_LAST_N_LAYERS]:
        layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=PHASE_B_LR),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    history_b = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=PHASE_A_EPOCHS + PHASE_B_EPOCHS,
        initial_epoch=len(history_a.history["loss"]),
        callbacks=make_callbacks(),
    )

    # ---------------- Combine history from both phases and save ----------------
    combined_history = {}
    for key in history_a.history:
        combined_history[key] = history_a.history[key] + history_b.history.get(key, [])
    history_df = pd.DataFrame(combined_history)
    history_df.index.name = "epoch"
    history_df.to_csv(HISTORY_CSV)
    print(f"\nTraining history saved to: {HISTORY_CSV}")

    # ---------------- Plot accuracy / loss curves ----------------
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    axes[0].plot(history_df["accuracy"], label="train")
    axes[0].plot(history_df["val_accuracy"], label="val")
    axes[0].axvline(PHASE_A_EPOCHS - 1, color="gray", linestyle="--", label="fine-tune starts")
    axes[0].set_title("Accuracy")
    axes[0].set_xlabel("epoch")
    axes[0].legend()

    axes[1].plot(history_df["loss"], label="train")
    axes[1].plot(history_df["val_loss"], label="val")
    axes[1].axvline(PHASE_A_EPOCHS - 1, color="gray", linestyle="--", label="fine-tune starts")
    axes[1].set_title("Loss")
    axes[1].set_xlabel("epoch")
    axes[1].legend()

    plt.tight_layout()
    plt.savefig(CURVES_PNG, dpi=150)
    print(f"Training curves saved to: {CURVES_PNG}")

    best_epoch = int(history_df["val_loss"].idxmin())
    best_val_acc = float(history_df.loc[best_epoch, "val_accuracy"])
    print("\n" + "=" * 70)
    print(f"Best epoch (lowest val_loss): {best_epoch}  |  val_accuracy: {best_val_acc:.4f}")
    print(f"Best model saved to: {MODEL_PATH}")
    print("=" * 70)


if __name__ == "__main__":
    main()
