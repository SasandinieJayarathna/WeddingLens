# WeddingLens backend image.
#
# In plain terms: this packages the backend (Node.js) AND a mini Python
# install (for the AI script) into one self-contained box that runs anywhere.
#
# Build context is the REPOSITORY ROOT, not backend/ - this image needs both
# backend/ (the Express API) and ml-service/ (the Python prediction script it
# spawns as a subprocess - see controllers/predictController.js's header
# comment for why a subprocess rather than a separate microservice). Build it
# via docker-compose.yml, or manually from the repo root with:
#   docker build -f backend/Dockerfile -t weddinglens-backend .
#
# Build-verified live via `docker compose up --build` (real prediction,
# colour palette, Grad-CAM heatmap, and DB logging all confirmed working
# inside the container - see CLAUDE.md's Docker section and
# docs/03_methodology.md §3.5.2 for the full verification write-up).

FROM node:20-bookworm-slim

# python3/pip/venv: runs ml-service/scripts/09_predict.py as a subprocess,
# exactly like the non-Docker setup, just with Python installed inside this
# container instead of a separate ml-service/venv folder on the host.
# libgl1/libglib2.0-0: opencv-python (imported by 09_predict.py and
# gradcam_utils.py for Grad-CAM overlay generation) links against libGL even
# when only ever used headlessly - without these, `import cv2` fails at
# runtime with an ImportError, even though pip install itself succeeds.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip python3-venv \
      libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ---- Python (ml-service) dependencies ----
# Installed into a dedicated venv (mirrors the non-Docker ml-service/venv setup;
# Debian's system Python also refuses a global `pip install` without one).
# Copied and installed BEFORE the rest of ml-service/backend so this slow,
# rarely-changing layer (TensorFlow is a large download) is Docker-cached
# across rebuilds that only touch application code.
COPY ml-service/requirements.txt ./ml-service/requirements.txt
RUN python3 -m venv /app/ml-service/venv \
    && /app/ml-service/venv/bin/pip install --no-cache-dir --upgrade pip \
    && /app/ml-service/venv/bin/pip install --no-cache-dir -r ml-service/requirements.txt

# Only the scripts + already-trained model are needed to SERVE predictions -
# not the training data, notebooks, or backup/experiment model folders (see
# .dockerignore), which would make this image enormous for no runtime benefit.
COPY ml-service/scripts ./ml-service/scripts
COPY ml-service/models ./ml-service/models

# ---- Node (backend) dependencies ----
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci

# Application code + real project assets (backend/vendor-images/ - NOT
# gitignored, unlike backend/uploads/ which is runtime-only data; see
# CLAUDE.md's extension #7 notes).
COPY backend ./backend

# Absolute paths, so predictController.js's path.resolve() uses them directly
# regardless of the container's working directory (see that file's comment on
# how PYTHON_PATH/PREDICT_SCRIPT_PATH are resolved).
ENV PYTHON_PATH=/app/ml-service/venv/bin/python
ENV PREDICT_SCRIPT_PATH=/app/ml-service/scripts/09_predict.py
ENV PORT=5000

WORKDIR /app/backend
EXPOSE 5000
CMD ["node", "server.js"]
