//  this is how the backend talks to the database. Every other
// file that needs to read/write data imports this and runs queries through it.
//
// PostgreSQL connection pool, configured from environment variables (.env).
// A "pool" is used instead of a single client so multiple requests can query
// the database concurrently without waiting on each other.

const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "weddinglens",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
});

// Fail loudly on connection errors instead of letting them disappear silently.
pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});

module.exports = pool;
