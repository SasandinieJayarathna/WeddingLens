// In plain terms: this checks whether a request came from a logged-in user,
// by reading a "login token" the user's browser sends. Two flavours below:
// one that requires login, one that just checks IF someone's logged in
// without blocking anyone who isn't.
//
// JWT-based auth middleware.
//
// WeddingLens's core feature (upload a photo, get a style + vendors) works
// fully anonymously - an account is only needed for the "personalized
// inspiration board" feature (save/revisit past analyses). So most routes
// use `optionalAuth` (attach req.user if a valid token is present, but never
// reject the request), while only the profile/board routes use `requireAuth`.

const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = "30d";

// Issues a signed JWT for a user, called by authController.js right after a
// successful register/login. Only the user id + email are embedded - never
// the password hash.
function signToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

// Pulls the raw token string out of an "Authorization: Bearer <token>"
// header, or returns null if the header is missing/malformed.
function getTokenFromHeader(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

/** Attaches req.user if a valid token is present; otherwise leaves req.user
 * undefined and continues anyway. Use for routes that behave differently for
 * logged-in users but must still work for anonymous ones (e.g. POST /api/predict). */
function optionalAuth(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.userId, email: payload.email };
  } catch (err) {
    // An invalid/expired token on an optional route is not an error worth
    // blocking the request over - just proceed as anonymous.
  }
  next();
}

/** Rejects the request with 401 unless a valid token is present. Use for
 * routes that only make sense for a logged-in user (e.g. the profile board). */
function requireAuth(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) {
    return res.status(401).json({ error: "Login required for this action." });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.userId, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired login session. Please log in again." });
  }
}

module.exports = { signToken, optionalAuth, requireAuth };
