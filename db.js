/**
 * SkyGoLink - Database layer (PostgreSQL).
 *
 * Unified async interface used across the whole app:
 *   query(text, params)      -> { rows }
 *   one(text, params)        -> first row or undefined
 *   withTx(async (q) => {})  -> run several queries in one transaction
 *   init()                   -> create schema (idempotent)
 *
 * Driver selection:
 *   - If DATABASE_URL is set  -> real PostgreSQL via `pg` (production: Render).
 *   - Otherwise               -> embedded Postgres via PGlite, stored under
 *                                ./data/pgdata (local dev / tests, zero setup).
 * Both back-ends speak the same PostgreSQL SQL dialect.
 */
const path = require('path');
const fs = require('fs');

const USE_PG = !!process.env.DATABASE_URL;
let impl;

if (USE_PG) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
  });
  impl = {
    query: (text, params) => pool.query(text, params),
    exec: (sql) => pool.query(sql),
    withTx: async (fn) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const q = (t, p) => client.query(t, p);
        const result = await fn(q);
        await client.query('COMMIT');
        return result;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },
  };
} else {
  const { PGlite } = require('@electric-sql/pglite');
  const DATA_DIR = path.join(__dirname, 'data', 'pgdata');
  fs.mkdirSync(path.dirname(DATA_DIR), { recursive: true });
  const pg = new PGlite(process.env.PG_MEMORY ? undefined : DATA_DIR);
  const ready = pg.waitReady;
  impl = {
    query: async (text, params) => { await ready; return pg.query(text, params || []); },
    exec: async (sql) => { await ready; return pg.exec(sql); },
    withTx: async (fn) => {
      await ready;
      return pg.transaction(async (tx) => fn((t, p) => tx.query(t, p || [])));
    },
  };
}

async function query(text, params) { return impl.query(text, params); }
async function one(text, params) { const r = await impl.query(text, params); return r.rows[0]; }
async function withTx(fn) { return impl.withTx(fn); }

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user',
  referral_code TEXT NOT NULL UNIQUE,
  referred_by   INTEGER REFERENCES users(id),
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS campaigns (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'CPA',
  payout      DOUBLE PRECISION NOT NULL DEFAULT 0,
  category    TEXT DEFAULT 'General',
  requirements TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS conversions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id),
  amount      DOUBLE PRECISION NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'pending',
  note        TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS transactions (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  type          TEXT NOT NULL,
  category      TEXT NOT NULL,
  amount        DOUBLE PRECISION NOT NULL,
  balance_after DOUBLE PRECISION NOT NULL DEFAULT 0,
  reference     TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS withdrawals (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  amount       DOUBLE PRECISION NOT NULL,
  bank_name    TEXT NOT NULL,
  account_no   TEXT NOT NULL,
  account_name TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
  note         TEXT DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);`;

async function init() {
  await impl.exec(SCHEMA);
}

module.exports = { query, one, withTx, init, USE_PG };
