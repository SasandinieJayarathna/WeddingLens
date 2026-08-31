"""
gradcam_utils.py
------------------
IN ONE SENTENCE: the actual code that draws a heatmap showing which part of
a photo made the AI pick that style - shared by the demo script and the real
prediction script so they always match.

Shared Grad-CAM implementation, used by both:
  - 08_gradcam.py    (Phase 2, Step 4: generates demo overlays for the
                       dissertation - one correct/one misclassified/one random
                       test image)
  - 09_predict.py     (Phase 3: generates a heatmap for whatever photo a real
                       user uploads through the web app, alongside the
                       prediction)

Keeping this logic in one place means the explainability shown to a live
user and the explainability discussed in the dissertation come from
identical code, not two versions that could drift apart.

See 08_gradcam.py's module docstring for a plain-language explanation of
what Grad-CAM is doing and why.
"""

from pathlib import Path

import cv2
import numpy as np
import tensorflow as tf

IMG_SIZE = (300, 300)

# Name of the last convolutional layer inside EfficientNet-B3 - the richest,
# most class-specific feature representation in the network, which is why
# Grad-CAM is computed here rather than at an earlier layer.
LAST_CONV_LAYER_NAME = "top_conv"


def load_and_preprocess(image_path: Path):
    """Loads one image file, resizes it to the model's expected input size,
    and returns both the raw HxWx3 array (used later to draw the overlay on
    top of the original-looking image) and a batched (1,H,W,3) version ready
    to feed into the model."""
    img = tf.keras.utils.load_img(image_path, target_size=IMG_SIZE)
    img_array = tf.keras.utils.img_to_array(img)
    batched = np.expand_dims(img_array, axis=0)
    return img_array, batched


def find_base_model(model):
    """Our saved model wraps EfficientNetB3 as a nested sub-model (see
    06_train_model.py's functional API). Grad-CAM needs direct access to
    that inner model's last conv layer, so find it here.

    NOTE: picking the first `isinstance(layer, tf.keras.Model)` is NOT
    enough - the data_augmentation block (a Sequential of RandomFlip/
    RandomRotation/RandomZoom/RandomContrast) is ALSO a tf.keras.Model
    subclass and comes BEFORE the EfficientNetB3 sub-model in model.layers,
    so that naive check grabs the wrong one. Instead, specifically look for
    the nested model that actually contains our target conv layer.
    """
    for layer in model.layers:
        if isinstance(layer, tf.keras.Model):
            try:
                layer.get_layer(LAST_CONV_LAYER_NAME)
                return layer
            except ValueError:
                continue
    raise RuntimeError(
        f"Could not find a nested sub-model containing a '{LAST_CONV_LAYER_NAME}' layer "
        "inside the saved model."
    )


def generate_gradcam(image_path, model, class_index=None):
    """
    Runs Grad-CAM for a single image against the given model.

    Returns:
        overlay_bgr: the original image with the Grad-CAM heatmap blended on
                      top (OpenCV BGR uint8 array, ready to save with cv2.imwrite)
        predicted_class_index: the class the model predicted (or class_index,
                                if one was explicitly requested)
        confidence: softmax confidence for that class
    """
    original_array, batched = load_and_preprocess(image_path)
    base_model = find_base_model(model)

    grad_model = tf.keras.models.Model(
        inputs=base_model.input,
        outputs=[base_model.get_layer(LAST_CONV_LAYER_NAME).output, base_model.output],
    )

    # Re-create the head layers (GlobalAveragePooling2D -> Dropout -> Dense)
    # so we can trace gradients all the way from the final prediction back
    # to the last conv layer's feature maps.
    head_layers = [layer for layer in model.layers if layer not in model.layers[: model.layers.index(base_model) + 1]]

    preprocessed = tf.keras.applications.efficientnet.preprocess_input(batched.copy())

    with tf.GradientTape() as tape:
        conv_output, base_output = grad_model(preprocessed, training=False)
        tape.watch(conv_output)
        x = base_output
        for layer in head_layers:
            x = layer(x)
        predictions = x
        if class_index is None:
            class_index = int(tf.argmax(predictions[0]))
        class_score = predictions[:, class_index]

    grads = tape.gradient(class_score, conv_output)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

    conv_output = conv_output[0]
    heatmap = conv_output @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)
    heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-8)  # ReLU + normalise to [0,1]
    heatmap = heatmap.numpy()

    heatmap_resized = cv2.resize(heatmap, IMG_SIZE)
    heatmap_uint8 = np.uint8(255 * heatmap_resized)
    heatmap_color = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)

    original_bgr = cv2.cvtColor(original_array.astype(np.uint8), cv2.COLOR_RGB2BGR)
    overlay_bgr = cv2.addWeighted(original_bgr, 0.6, heatmap_color, 0.4, 0)

    # predictions already come from a softmax Dense layer, so this is a probability.
    confidence = float(predictions[0][class_index])
    return overlay_bgr, class_index, confidence
