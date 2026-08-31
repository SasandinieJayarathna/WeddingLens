# WeddingLens Frontend

React (Vite) single-page app: upload a wedding inspiration photo, see the AI-detected
style with its colour palette and Grad-CAM heatmap, then browse matching vendors.
See the root [README.md](../README.md) for the full-system overview and
[backend/README.md](../backend/README.md) for the API this talks to.

> **Prefer Docker?** See the root README's
> ["Running it with Docker"](../README.md#running-it-with-docker) section for a
> one-command `docker compose up --build` that builds and serves this frontend
> (via nginx) alongside the backend and database. This page covers running the
> dev server directly on your own machine.

## Prerequisites

- Node.js (LTS) and npm
- The backend running (see `../backend/README.md`) - the frontend calls it for every
  prediction, vendor lookup, and auth action; nothing here works standalone.

## 1. Install dependencies

```bash
cd frontend
npm install
```

## 2. Configure environment variables

```bash
cp .env.example .env
```

`VITE_API_BASE_URL` points at the backend and defaults to `http://localhost:5000` if
unset - only change it if the backend runs somewhere else (a different port, or a
deployed host).

## 3. Run it

```bash
npm run dev       # dev server with hot reload, http://localhost:5173
npm run build      # production build to dist/
npm run preview    # serve the production build locally
npm run lint       # oxlint
```

## Routes

| Route                          | Page                     | Notes |
|---------------------------------|--------------------------|-------|
| `/`                              | LandingPage               | Full-screen hero; navbar hidden here. Entry point. |
| `/upload`                        | UploadPage                 | Pick/drag-drop 1-5 images, submits to `POST /api/predict`. |
| `/results`                       | ResultsPage                 | Shown after a 1-image upload. |
| `/results-multi`                 | MultiResultsPage            | Shown after a 2-5 image upload. |
| `/compare`                       | ComparePage                 | Dedicated 2-image side-by-side comparison flow. |
| `/vendors`                       | VendorCategoriesPage        | Browse all 12 vendor categories (general browsing, not tied to a prediction). |
| `/vendors/category/:category`    | VendorCategoryPage          | Every vendor in one category. |
| `/vendors/style/:style`          | VendorsByStylePage          | Vendors matching a detected style, reached from a prediction's "See matching vendors" button. |
| `/login`                         | LoginPage                    | Navbar hidden here (full-screen split-panel layout). |
| `/signup`                        | SignupPage                   | Navbar hidden here. |
| `/profile`                       | ProfilePage                  | Logged-in user's dashboard: stat summary + inspiration board. Requires login. |

An account is entirely optional for the core feature (upload → predict → see
vendors) - `/profile` is the only page that requires login.

## Project structure

```
frontend/
├── src/
│   ├── main.jsx              entry point
│   ├── App.jsx                routes + navbar visibility (NAVBAR_HIDDEN_ROUTES)
│   ├── api/
│   │   └── axiosInstance.js    shared axios instance (baseURL, extended timeout for
│   │                            cold-start predictions)
│   ├── context/
│   │   └── AuthContext.jsx      JWT auth state, localStorage-backed, revalidates
│   │                            the token against GET /api/auth/me on load
│   ├── components/
│   │   ├── Navbar.jsx            top nav, adapts to logged-in/out state
│   │   ├── Logo.jsx               the "W | L" wreath monogram brand mark (SVG,
│   │   │                          computed geometry - no external assets)
│   │   ├── BackButton.jsx          prefers real browser history, falls back to a
│   │   │                          fixed route
│   │   ├── AuthLayout.jsx           shared split-panel shell for Login/Signup
│   │   ├── PredictionCard.jsx       shared "Style Dashboard" display (photo,
│   │   │                          Grad-CAM heatmap, colour palette, keywords,
│   │   │                          confidence breakdown) - reused by
│   │   │                          ResultsPage/MultiResultsPage/ComparePage
│   │   └── VendorCard.jsx           shared vendor display card
│   ├── pages/                    one file per route (see Routes table above)
│   ├── data/
│   │   ├── styleInfo.js           per-style label/fallback palette/keywords/decor
│   │   │                          suggestion (fallback only - PredictionCard
│   │   │                          prefers the real photo-specific palette the
│   │   │                          backend extracts)
│   │   └── vendorCategoryInfo.js   per-category label/icon/gradient/hero image
│   └── utils/
│       └── mediaUrl.js             resolveMediaUrl() - resolves a relative
│                                  backend path or passes an absolute URL through
├── public/
│   └── favicon.svg                simplified wreath+monogram mark
├── index.html                    Google Fonts (Playfair Display, Inter)
└── .env.example
```

## Notes on a couple of non-obvious things

- **Colour palette**: `PredictionCard.jsx` shows the real palette extracted from the
  uploaded photo itself (`dominant_colors` in the `/api/predict` response) and only
  falls back to `styleInfo.js`'s static per-style palette if that extraction failed.
- **Vendor images**: `VendorCard.jsx`/`vendorCategoryInfo.js` render either an
  absolute Unsplash URL or a relative `/vendor-images/...` path served by the
  backend - always go through `resolveMediaUrl()` rather than using `image_url`
  directly, or a relative path will 404.
- **Navbar visibility**: controlled centrally in `App.jsx`'s `NAVBAR_HIDDEN_ROUTES`
  (currently `/`, `/login`, `/signup`, which each have their own full-screen layout).

---

*Originally scaffolded from Vite's React template (`@vitejs/plugin-react` + oxlint).*
