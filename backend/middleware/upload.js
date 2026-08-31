// In plain terms: this checks that an uploaded file is really a small,
// genuine image before saving it to disk - rejects anything too big or the
// wrong file type.
//
// Multer configuration for handling image uploads on POST /api/predict.
//
// Design choices explained:
//  - Files are stored on disk (not memory) under backend/uploads/, because
//    the Python inference script needs a real file path to load the image
//    from - it can't easily read an in-memory buffer without extra plumbing.
//  - We validate BOTH the file extension and the reported MIME type before
//    accepting a file, and cap the file size via env var, to avoid someone
//    uploading something that isn't really an image (see docs/security_notes.md
//    written in Phase 5 for more on this).

const fs = require("fs");
const path = require("path");
const multer = require("multer");
require("dotenv").config();

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 5 * 1024 * 1024; // 5MB default

// Tells multer where to save uploads and how to name them: every file goes
// into UPLOAD_DIR, renamed to "upload_<timestamp>-<random>.<ext>" so two
// simultaneous uploads (or two uploads with the same original filename)
// never collide.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `upload_${uniqueSuffix}${ext}`);
  },
});

// Rejects a file before it's saved unless BOTH its extension and reported
// MIME type look like an allowed image - checking only one would let a
// renamed non-image file (e.g. "virus.exe" -> "virus.jpg") slip through.
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype);
  const extOk = ALLOWED_EXTENSIONS.has(ext);

  if (!mimeOk || !extOk) {
    return cb(new Error("Only JPEG, PNG, or WEBP image files are allowed."));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

module.exports = upload;
