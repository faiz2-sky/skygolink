/**
 * User routes (PostgreSQL, async): dashboard, profile, security, referrals,
 * earnings, transactions, wallet.
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const h = require('../helpers');

const router = express.Router();
router.use(authRequired);

router.get('/dashboard', async (req, res) => {
  try {
    const uid = req.user.id;
    const user = await db.one('SELECT * FROM users WHERE id = $1', [uid]);
    const refStats = await db.one(
      `SELECT COUNT(*) AS total,
        SUM(CASE WHEN status='qualified' THEN 1 ELSE 0 END) AS qualified,
        SUM(CASE WHEN status='pending'   THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status='rejected'  THEN 1 ELSE 0 END) AS rejected
       FROM conversions WHERE user_id = $1`, [uid]);
    const recent = (await db.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY id DESC LIMIT 5', [uid])).rows;
    const referrals = await db.one('SELECT COUNT(*) AS c FROM users WHERE referred_by = $1', [uid]);
    res.json({
      balances: {
        available: await h.getAvailableBalance(uid),
        pending: await h.getPendingBalance(uid),
        total_earnings: await h.getTotalEarnings(uid),
      },
      referral_code: user.referral_code,
      referral_count: Number(referrals.c),
      conversions: {
        total: Number(refStats.total) || 0,
        qualified: Number(refStats.qualified) || 0,
        pending: Number(refStats.pending) || 0,
        rejected: Number(refStats.rejected) || 0,
      },
      recent_transactions: recent,
    });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/referrals', async (req, res) => {
  const uid = req.user.id;
  const people = (await db.query(
    'SELECT id, name, email, status, created_at FROM users WHERE referred_by = $1 ORDER BY id DESC', [uid])).rows;
  const conversions = (await db.query(
    `SELECT c.id, c.amount, c.status, c.created_at, c.note, cp.title AS campaign
     FROM conversions c JOIN campaigns cp ON cp.id = c.campaign_id
     WHERE c.user_id = $1 ORDER BY c.id DESC`, [uid])).rows;
  res.json({ people, conversions });
});

router.get('/earnings', async (req, res) => {
  const uid = req.user.id;
  const rows = (await db.query(
    `SELECT c.id, c.amount, c.status, c.created_at, cp.title AS campaign, cp.type
     FROM conversions c JOIN campaigns cp ON cp.id = c.campaign_id
     WHERE c.user_id = $1 ORDER BY c.id DESC`, [uid])).rows;
  res.json({ total_earnings: await h.getTotalEarnings(uid), pending: await h.getPendingBalance(uid), items: rows });
});

router.get('/transactions', async (req, res) => {
  const uid = req.user.id;
  const rows = (await db.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY id DESC', [uid])).rows;
  res.json({ items: rows, available: await h.getAvailableBalance(uid) });
});

router.get('/wallet', async (req, res) => {
  const uid = req.user.id;
  const wd = (await db.query('SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY id DESC', [uid])).rows;
  res.json({
    available: await h.getAvailableBalance(uid),
    pending: await h.getPendingBalance(uid),
    total_earnings: await h.getTotalEarnings(uid),
    withdrawals: wd,
  });
});

router.put('/profile', async (req, res) => {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
  await db.query('UPDATE users SET name = $1 WHERE id = $2', [String(name).trim(), req.user.id]);
  const user = await db.one('SELECT id,name,email,role,referral_code,status,created_at FROM users WHERE id = $1', [req.user.id]);
  res.json({ user });
});

router.put('/password', async (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) return res.status(400).json({ error: 'Both current and new password are required' });
  if (String(new_password).length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
  const user = await db.one('SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (!bcrypt.compareSync(String(current_password), user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [bcrypt.hashSync(String(new_password), 10), req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
