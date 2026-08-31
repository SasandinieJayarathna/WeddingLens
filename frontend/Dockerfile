# WeddingLens frontend image - multi-stage: build the static Vite bundle,
# then serve it with nginx (no Node.js needed at runtime).
#
# In plain terms: this turns the React app into plain HTML/CSS/JS files and
# packages a tiny web server (nginx) to serve them - no Node.js needed to run it.
#
# Build-verified live via `docker compose up --build` (page loads, and
# nginx's client-side-route fallback confirmed working - see CLAUDE.md's
# Docker section).

# ---- Stage 1: build ----
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Vite inlines import.meta.env.* values into the built JS at BUILD time, not
# read at container startup - so this has to be a build arg, not a runtime
# environment variable. Defaults to the same value the non-Docker frontend
# .env.example uses; override via
# `docker compose build --build-arg VITE_API_BASE_URL=...` if the backend is
# reachable at a different URL from the browser.
ARG VITE_API_BASE_URL=http://localhost:5000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ---- Stage 2: serve ----
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# SPA fallback (try_files ... /index.html) so client-side routes like
# /vendors/category/florist work on a direct load/refresh, not just via
# in-app navigation - see nginx.conf's own comment.
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
