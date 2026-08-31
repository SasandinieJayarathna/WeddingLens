// In plain terms: this file's job is to hand an uploaded photo to the Python
// AI model and get back its answer. It does this by literally running the
// Python script like a command-line program and reading what it prints out.
//
// Integration approach: Node.js spawns the Python inference script
// (ml-service/scripts/09_predict.py) as a short-lived child process via
// Node's built-in child_process module, instead of running a separate
// long-lived Flask microservice or using the python-shell package.
//
// Why: this app does one-off, infrequent predictions (a user uploads a
// photo, waits a few seconds, gets a result) rather than high-throughput
// real-time inference, so the ~1-2s cost of starting a fresh Python
// process per request is an acceptable trade for a much simpler
// architecture - one fewer service to run, deploy, and keep in sync, no
// extra HTTP layer between Node and Python, and no extra npm dependency
// (python-shell is just a wrapper around the same child_process APIs).
// If this ever needs to serve high request volume, revisit this and
// switch to a persistent Flask/FastAPI microservice with the model kept
// loaded in memory.
//
// Multi-image note: 09_predict.py accepts MULTIPLE image paths in one
// invocation and loads the model only once for all of them - so a 3-image
// upload pays TensorFlow's cold-start cost once, not 3 times, at the cost of
// all 3 images sharing one (generous) timeout window.

const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const PYTHON_PATH = path.resolve(__dirname, "..", process.env.PYTHON_PATH || "../ml-service/venv/Scripts/python.exe");
const PREDICT_SCRIPT_PATH = path.resolve(__dirname, "..", process.env.PREDICT_SCRIPT_PATH || "../ml-service/scripts/09_predict.py");

// Base cost covers TensorFlow import + model load (the fixed, one-time part
// of every request); the per-image term covers each image's own
// inference + Grad-CAM pass. Both were measured empirically to be generous,
// not tight, on the CPU-only development machine.
const BASE_TIMEOUT_MS = 60000;
const PER_IMAGE_TIMEOUT_MS = 20000;

/**
 * Runs the Python prediction script on one or more image files and resolves
 * with an array of parsed JSON results, one per input path, in the same
 * order (each either a prediction object or { error: "..." }).
 */
function runPredictions(imagePaths) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(PYTHON_PATH)) {
      return reject(new Error(`Python interpreter not found at ${PYTHON_PATH}. Check PYTHON_PATH in .env.`));
    }
    if (!fs.existsSync(PREDICT_SCRIPT_PATH)) {
      return reject(new Error(`Predict script not found at ${PREDICT_SCRIPT_PATH}. Check PREDICT_SCRIPT_PATH in .env.`));
    }

    const timeout = BASE_TIMEOUT_MS + PER_IMAGE_TIMEOUT_MS * imagePaths.length;
    execFile(PYTHON_PATH, [PREDICT_SCRIPT_PATH, ...imagePaths], { timeout }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`Prediction script failed: ${stderr || error.message}`));
      }
      let parsed;
      try {
        parsed = JSON.parse(stdout.trim());
      } catch (parseErr) {
        return reject(new Error(`Could not parse prediction output as JSON: ${stdout}`));
      }
      if (!Array.isArray(parsed)) {
        return reject(new Error(`Expected a JSON array from the prediction script, got: ${stdout}`));
      }
      resolve(parsed);
    });
  });
}

module.exports = { runPredictions, BASE_TIMEOUT_MS, PER_IMAGE_TIMEOUT_MS };
