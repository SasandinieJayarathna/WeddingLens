-- WeddingLens database schema
-- Run this once against a fresh database to create the tables the app needs.
-- See backend/README.md for how to create the database and run this file.

-- ---------------------------------------------------------------------------
-- vendors: the businesses we recommend to a user once we know their style
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendors (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,                 -- business name shown to the user
    category        VARCHAR(50)  NOT NULL,                 -- one of: venue, photographer, decorator,
                                                             -- florist, caterer, makeup_artist, wedding_planner
    wedding_style   VARCHAR(50)  NOT NULL,                  -- one of the 6 model classes, e.g. boho_chic
    location        VARCHAR(150),                           -- city/region the vendor operates in
    contact_info    VARCHAR(255),                           -- phone/email, kept as free text for simplicity
    description     TEXT,                                   -- short marketing blurb shown on the vendor card
    image_url       VARCHAR(500),                           -- representative photo for the vendor card -
                                                             -- a real, distinct Unsplash photo per vendor
                                                             -- (NOT that vendor's own work - see seed.sql)
    rating          NUMERIC(2, 1) DEFAULT 0.0                -- e.g. 4.5, out of 5
        CHECK (rating >= 0 AND rating <= 5),
    instagram_url   VARCHAR(500),                            -- real social/website links, where found -
    facebook_url    VARCHAR(500),                            -- NULL where none was found (never invented,
    tiktok_url      VARCHAR(500),                            -- see backend/db/seed.sql's sourcing notes)
    website_url     VARCHAR(500),
    image_photographer      VARCHAR(150),                    -- Unsplash attribution for image_url - name
    image_photographer_url  VARCHAR(500),                    -- and link, per Unsplash's guidelines
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Migration safety net: these columns were added after vendors already
-- existed in earlier versions of this schema - safe to re-run on a fresh
-- database too, since IF NOT EXISTS guards them.
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS instagram_url VARCHAR(500);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS facebook_url VARCHAR(500);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS tiktok_url VARCHAR(500);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS website_url VARCHAR(500);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS image_photographer VARCHAR(150);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS image_photographer_url VARCHAR(500);

-- Vendors are looked up by style very frequently (GET /api/vendors?style=...),
-- and often filtered by category too, so index both.
CREATE INDEX IF NOT EXISTS idx_vendors_style ON vendors (wedding_style);
CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors (category);

-- ---------------------------------------------------------------------------
-- users: registered accounts, for the "save previous analyses / personalized
-- inspiration board" feature. Predictions made while logged out still work
-- (predictions.user_id is nullable) - an account is only needed to keep a
-- history across visits, not to use the classifier itself.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,   -- bcrypt hash, never the plain password
    display_name    VARCHAR(100),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- predictions: a log of every image a user has uploaded and what the model said
-- (useful both as an audit trail, future training data, and - when linked to a
-- user_id - the "inspiration board" history shown on the profile page)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS predictions (
    id                  SERIAL PRIMARY KEY,
    uploaded_image_path VARCHAR(500) NOT NULL,   -- where the uploaded file was stored on disk
    gradcam_image_path  VARCHAR(500),             -- where the Grad-CAM overlay was stored (nullable: heatmap generation can fail without failing the prediction)
    predicted_style     VARCHAR(50)  NOT NULL,   -- the model's top-1 predicted class
    confidence_score    NUMERIC(5, 4) NOT NULL,  -- softmax probability of the predicted class, 0-1
    user_id             INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- NULL = anonymous/logged-out prediction
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions (created_at);

-- Migration safety net: this project's predictions table already existed (from
-- an earlier version of this schema) before user_id/gradcam_image_path were
-- added. CREATE TABLE IF NOT EXISTS above is a no-op against an existing
-- table, so these ALTER statements upgrade an already-running database too -
-- safe to re-run on a fresh database as well, since IF NOT EXISTS guards them.
-- (Must run BEFORE the idx_predictions_user_id index below, since that index
-- needs the user_id column to already exist.)
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS gradcam_image_path VARCHAR(500);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions (user_id);
