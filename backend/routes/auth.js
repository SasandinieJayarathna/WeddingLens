// In plain terms: the 3 web addresses (routes) for signing up, logging in,
// and checking who's currently logged in.
//
// POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
// Simple email+password accounts, purely so a user can save/revisit past
// style analyses (the "inspiration board" feature) - not required to use
// the classifier itself.

const express = require("express");
const rateLimit = require("express-rate-limit");
const { registerUser, verifyLogin, getUserById } = require("../controllers/authController");
const { signToken, requireAuth } = require("../middleware/auth");

const router = express.Router();

// Brute-force protection: login/register are the two endpoints where
// unlimited attempts would actually matter (password guessing, mass account
// creation). 20 attempts/15min/IP is generous for a real user who mistypes a
// password a few times, but blocks automated guessing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a few minutes and try again." },
});
router.use(authLimiter);

// Creates a new account and immediately logs the caller in (returns a token,
// same as /login does), so a fresh signup doesn't need a separate login step.
router.post("/register", async (req, res) => {
  const { email, password, displayName } = req.body || {};
  try {
    const user = await registerUser({ email, password, displayName });
    const token = signToken(user);
    return res.status(201).json({ token, user });
  } catch (err) {
    // Validation/duplicate-email errors are user-facing and safe to return
    // directly; anything else is an unexpected server error.
    const knownError = [
      "Please enter a valid email address.",
      "Password must be at least 8 characters long.",
      "An account with that email already exists.",
    ].includes(err.message);
    if (knownError) {
      return res.status(400).json({ error: err.message });
    }
    console.error("Registration failed:", err.message);
    return res.status(500).json({ error: "Could not create account right now. Please try again." });
  }
});

// Verifies email/password and returns a fresh token on success.
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  try {
    const user = await verifyLogin({ email, password });
    const token = signToken(user);
    return res.status(200).json({ token, user });
  } catch (err) {
    if (err.message === "Incorrect email or password.") {
      return res.status(401).json({ error: err.message });
    }
    console.error("Login failed:", err.message);
    return res.status(500).json({ error: "Could not log in right now. Please try again." });
  }
});

// Returns the currently logged-in user's own profile, re-verified against
// the database (see the comment inside for why that matters).
router.get("/me", requireAuth, async (req, res) => {
  // requireAuth only proves the JWT's signature is valid and unexpired - it
  // does NOT prove the account it names still exists (jwt.verify() never
  // touches the database). Re-checking here is what lets the frontend
  // detect and clear a stale session for a since-deleted account, instead
  // of trusting a 30-day-old token forever - see authController.js's
  // getUserById for the full reasoning.
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: "This account no longer exists. Please log in again." });
    }
    return res.status(200).json({ user });
  } catch (err) {
    console.error("Fetching current user failed:", err.message);
    return res.status(500).json({ error: "Could not verify your login right now. Please try again." });
  }
});

module.exports = router;
