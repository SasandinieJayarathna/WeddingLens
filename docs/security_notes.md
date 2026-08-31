# WeddingLens — Security Notes

Security considerations reviewed and addressed as of Phase 5 (integration testing).
This is a student capstone project, not a production system handling real payments
or sensitive personal data, so the measures below are proportionate to that: solid
fundamentals, clearly documented gaps, not enterprise-grade hardening.

## Input validation

- **File upload type checking**: `backend/middleware/upload.js` checks BOTH the
  reported MIME type and the file extension against an allow-list (JPEG/PNG/WEBP)
  before accepting a file. Neither check alone is bulletproof (both can be spoofed
  by a malicious client), but together they block accidental/casual misuse. A
  production system handling untrusted uploads at scale would add magic-byte
  sniffing (e.g. checking the file's actual binary signature) as a third layer.
- **File size limits**: capped at 5MB via `MAX_UPLOAD_BYTES` (multer's `limits.fileSize`),
  tested and confirmed rejecting oversized uploads with a 400, not silently truncating
  or crashing.
- **Style query validation**: `GET /api/vendors` rejects any `style` value not in the
  fixed set of 6 known classes (`vendorController.js`'s `VALID_STYLES`), rather than
  passing arbitrary user input into a query.

## SQL injection

- All database queries (`vendorController.js`, `routes/predict.js`) use **parameterized
  queries** via `pg`'s `$1`/`$2` placeholders — user input is never string-concatenated
  into SQL. This is the standard, correct defense against SQL injection and was
  verified by code review of every `pool.query(...)` call in the codebase.

## Uploaded file handling

- Uploaded files are renamed on save (`upload_<timestamp>-<random>.<ext>`) rather than
  keeping the user-supplied filename, which avoids path traversal via a crafted
  filename (e.g. `../../etc/passwd`) and avoids filename collisions.
- Failed predictions clean up their uploaded file (`fs.unlink` in `routes/predict.js`'s
  catch block) so failed requests don't accumulate orphaned files indefinitely. Note:
  *successful* predictions currently keep their uploaded image and Grad-CAM overlay on
  disk indefinitely (needed so the frontend can display them) — a production
  deployment would want a retention/cleanup policy (e.g. delete after N days) since
  disk usage otherwise grows unbounded.

## Secrets management

- `backend/.env`, `frontend/.env`, and `ml-service/.env` (containing the Postgres
  password and the Unsplash API key respectively) are all gitignored and were never
  committed. `.env.example` files with placeholder values are provided instead so
  the real structure is documented without leaking real credentials.

## Authentication

- **Passwords are hashed with bcrypt** (via `bcryptjs`, 10 salt rounds) before
  storage — `users.password_hash` never holds a plaintext password, and the
  hash is never returned in any API response.
- **Login/register use a deliberately generic error message** ("Incorrect
  email or password") for both "no such account" and "wrong password", so the
  endpoint can't be used to enumerate which emails have registered accounts.
- **Sessions are JWTs** signed with a secret (`JWT_SECRET` in `backend/.env`,
  gitignored, generated once with `secrets.token_hex(32)`), expiring after 30
  days. There is no server-side session store or revocation list — a leaked
  token remains valid until it expires. This is an accepted simplification
  for a student project; a production system would want short-lived access
  tokens plus a refresh-token/revocation mechanism.
- **Login/register are rate-limited** (20 attempts/15min/IP, see
  `backend/routes/auth.js`) as brute-force protection.
- **The core classifier requires no account.** Login is used only to link a
  prediction to a user for the "inspiration board" history feature
  (`optionalAuth` in `middleware/auth.js`) — this keeps the attack surface of
  the main feature (image upload/prediction) independent of the auth system.

## Rate limiting

- **Implemented on `/api/predict`** via `express-rate-limit`: 10 requests/minute per
  IP address (see `backend/routes/predict.js`). This endpoint is the one that matters
  most, since each request spawns a full Python/TensorFlow process (expensive — see
  `docs/testing_checklist.md`'s "known limitations"), making it a straightforward
  resource-exhaustion / accidental-DoS risk even without malicious intent (e.g. a user
  double-clicking "submit" repeatedly). `/api/vendors` is a cheap, read-only database
  query and was left unlimited as lower risk, though the same middleware could be
  applied there too if needed.

## CORS

- `server.js` currently uses `cors()` with no configuration, which allows requests
  from any origin. Acceptable for local development; a real deployment should
  restrict this to the actual frontend's origin via `cors({ origin: "https://..." })`.

## Not addressed (out of scope for this project)

- No HTTPS/TLS setup — this runs over plain HTTP on localhost for development;
  a real deployment would sit behind a reverse proxy (e.g. nginx) terminating TLS,
  which matters more now than before since login credentials/JWTs are transmitted.
- No email verification or password-reset flow for accounts — registering with
  any syntactically valid email works, and there is no way to recover a forgotten
  password other than creating a new account. Acceptable for a demo/prototype,
  not for a real deployment with real users.
- No server-side session revocation (see "Authentication" above) — a JWT can't
  be invalidated before it expires short of rotating `JWT_SECRET` (which would
  log out every user, not just one).
