/**
 * Shared data helpers: balance computation + ledger writes (PostgreSQL, async).
 *
 * Each function accepts an optional query function `q` so it can participate in
 * an open transaction (passed from db.withTx). When omitted it uses the global
 * pooled query.
 */
const db = require('./db');

async function getAvailableBalance(userId, q = db.query) {
  const r = await q(
    `SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE -amount END), 0) AS bal
     FROM transactions WHERE user_id = $1`, [userId]);
  return round2(r.rows[0].bal);
}

async function getPendingBalance(userId, q = db.query) {
  const r = await q(
    `SELECT COALESCE(SUM(amount), 0) AS p FROM conversions WHERE user_id = $1 AND status = 'pending'`,
    [userId]);
  return round2(r.rows[0].p);
}

async function getTotalEarnings(userId, q = db.query) {
  const r = await q(
    `SELECT COALESCE(SUM(amount), 0) AS t FROM transactions
     WHERE user_id = $1 AND type='credit' AND category='earning'`, [userId]);
  return round2(r.rows[0].t);
}

/** Insert a ledger row and return the new available balance. */
async function addTransaction({ userId, type, category, amount, reference = '' }, q = db.query) {
  const current = await getAvailableBalance(userId, q);
  const delta = type === 'credit' ? amount : -amount;
  const balanceAfter = round2(current + delta);
  await q(
    `INSERT INTO transactions (user_id, type, category, amount, balance_after, reference)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, type, category, amount, balanceAfter, reference]);
  return balanceAfter;
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

module.exports = {
  getAvailableBalance, getPendingBalance, getTotalEarnings, addTransaction, round2,
};
