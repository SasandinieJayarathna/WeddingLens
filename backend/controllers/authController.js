// In plain terms: this file creates accounts, checks passwords when someone
// logs in, and looks up a user's info. It doesn't handle web requests
// directly - routes/auth.js calls into these functions.
//
// Registration/login logic. Kept separate from routes/auth.js for the same
// reason as vendorController.js: routes handle HTTP concerns, this file
// handles the actual database + password logic.

const bcrypt = require("bcryptjs");
const pool = require("../config/db");

const SALT_ROUNDS = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Quick shape check (not a full RFC 5322 validator) - just enough to reject
// obviously-bad input before it reaches the database.
function isValidEmail(email) {
  return typeof email === "string" && EMAIL_RE.test(email);
}

/**
 * Creates a new user with a bcrypt-hashed password. Throws a plain Error with
 * a user-facing message on validation failure or duplicate email, so the
 * route can turn it into a 400 response.
 */
async function registerUser({ email, password, displayName }) {
  if (!isValidEmail(email)) {
    throw new Error("Please enter a valid email address.");
  }
  if (typeof password !== "string" || password.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
  if (existing.rows.length > 0) {
    throw new Error("An account with that email already exists.");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, display_name)
     VALUES ($1, $2, $3)
     RETURNING id, email, display_name, created_at`,
    [email.toLowerCase(), passwordHash, displayName || null]
  );
  return result.rows[0];
}

/**
 * Verifies email/password and returns the user row if correct. Throws a
 * plain Error (deliberately the SAME message for "no such user" and "wrong
 * password") so the route can't be used to enumerate registered emails.
 */
async function verifyLogin({ email, password }) {
  const result = await pool.query(
    "SELECT id, email, display_name, password_hash FROM users WHERE email = $1",
    [(email || "").toLowerCase()]
  );
  const user = result.rows[0];
  if (!user) {
    throw new Error("Incorrect email or password.");
  }

  const passwordMatches = await bcrypt.compare(password || "", user.password_hash);
  if (!passwordMatches) {
    throw new Error("Incorrect email or password.");
  }

  return { id: user.id, email: user.email, display_name: user.display_name };
}

/**
 * Looks up a user by id, for revalidating a JWT against the DB (see GET
 * /api/auth/me) - a JWT's signature being valid only proves it was issued
 * by us, not that the account it names still exists. Without this check, a
 * token for a deleted account (e.g. test accounts cleaned up after manual
 * verification) stays "logged in" client-side for its full 30-day expiry,
 * since jsonwebtoken.verify() alone never touches the database. Returns
 * undefined (not an error) if no such user exists, so the caller can turn
 * that into a clean 401.
 */
async function getUserById(id) {
  const result = await pool.query("SELECT id, email, display_name, created_at FROM users WHERE id = $1", [id]);
  return result.rows[0];
}

module.exports = { registerUser, verifyLogin, getUserById };
