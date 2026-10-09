/**
 * Admin routes (PostgreSQL async): metrics, users, conversions, withdrawals,
 * campaign CRUD. All guarded by admin role.
 */
const express = require('express');
const db = require('../db');
const { authRequired, adminRequired } = require('../middleware/auth');
const h = require('../helpers');

const router = express.Router();
router.use(authRequired, adminRequired);

router.get('/dashboard', async (req, res) => {
  const users = Number((await db.one("SELECT COUNT(*) c FROM users WHERE role='user'")).c);
  const activeCampaigns = Number((await db.one("SELECT COUNT(*) c FROM campaigns WHERE status='active'")).c);
  const pendingWd = Number((await db.one("SELECT COUNT(*) c FROM withdrawals WHERE status='pending'")).c);
  const pendingConv = Number((await db.one("SELECT COUNT(*) c FROM conversions WHERE status='pending'")).c);
  const paidOut = (await db.one("SELECT COALESCE(SUM(amount),0) s FROM withdrawals WHERE status IN ('approved','paid')")).s;
  const totalEarnings = (await db.one("SELECT COALESCE(SUM(amount),0) s FROM transactions WHERE type='credit' AND category='earning'")).s;
  res.json({
    total_users: users, active_campaigns: activeCampaigns,
    pending_withdrawals: pendingWd, pending_conversions: pendingConv,
    total_paid_out: h.round2(paidOut), total_earnings_credited: h.round2(totalEarnings),
  });
});

// ---- Users ----
router.get('/users', async (req, res) => {
  const rows = (await db.query(
    `SELECT u.id, u.name, u.email, u.role, u.status, u.referral_code, u.created_at,
      (SELECT COUNT(*) FROM users r WHERE r.referred_by = u.id) AS referrals
     FROM users u ORDER BY u.id DESC`)).rows;
  const withBal = [];
  for (const u of rows) withBal.push({ ...u, referrals: Number(u.referrals), available: await h.getAvailableBalance(u.id) });
  res.json({ items: withBal });
});

router.put('/users/:id/status', async (req, res) => {
  const { status } = req.body || {};
  if (!['active', 'suspended'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  await db.query('UPDATE users SET status = $1 WHERE id = $2', [status, req.params.id]);
  res.json({ ok: true });
});

// ---- Conversions ----
router.get('/conversions', async (req, res) => {
  const rows = (await db.query(
    `SELECT c.*, u.name AS user_name, u.email AS user_email, cp.title AS campaign
     FROM conversions c JOIN users u ON u.id = c.user_id JOIN campaigns cp ON cp.id = c.campaign_id
     ORDER BY c.id DESC`)).rows;
  res.json({ items: rows });
});

router.put('/conversions/:id/qualify', async (req, res) => {
  const c = await db.one('SELECT * FROM conversions WHERE id = $1', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Conversion not found' });
  if (c.status === 'qualified') return res.status(409).json({ error: 'Already qualified' });
  await db.withTx(async (q) => {
    await q("UPDATE conversions SET status='qualified', note='Approved by admin' WHERE id = $1", [c.id]);
    await h.addTransaction({ userId: c.user_id, type: 'credit', category: 'earning', amount: c.amount, reference: `Conversion #${c.id} qualified` }, q);
  });
  res.json({ ok: true });
});

router.put('/conversions/:id/reject', async (req, res) => {
  const c = await db.one('SELECT * FROM conversions WHERE id = $1', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Conversion not found' });
  await db.withTx(async (q) => {
    if (c.status === 'qualified') {
      await h.addTransaction({ userId: c.user_id, type: 'debit', category: 'adjustment', amount: c.amount, reference: `Conversion #${c.id} reversed` }, q);
    }
    await q("UPDATE conversions SET status='rejected', note='Rejected by admin' WHERE id = $1", [c.id]);
  });
  res.json({ ok: true });
});

// ---- Withdrawals ----
router.get('/withdrawals', async (req, res) => {
  const rows = (await db.query(
    `SELECT w.*, u.name AS user_name, u.email AS user_email
     FROM withdrawals w JOIN users u ON u.id = w.user_id ORDER BY w.id DESC`)).rows;
  res.json({ items: rows });
});

router.put('/withdrawals/:id/approve', async (req, res) => {
  const w = await db.one('SELECT * FROM withdrawals WHERE id = $1', [req.params.id]);
  if (!w) return res.status(404).json({ error: 'Withdrawal not found' });
  if (w.status !== 'pending') return res.status(409).json({ error: 'Already processed' });
  await db.query("UPDATE withdrawals SET status='paid', note='Approved and paid' WHERE id = $1", [w.id]);
  res.json({ ok: true });
});

router.put('/withdrawals/:id/reject', async (req, res) => {
  const w = await db.one('SELECT * FROM withdrawals WHERE id = $1', [req.params.id]);
  if (!w) return res.status(404).json({ error: 'Withdrawal not found' });
  if (w.status !== 'pending') return res.status(409).json({ error: 'Already processed' });
  await db.withTx(async (q) => {
    await q("UPDATE withdrawals SET status='rejected', note='Rejected by admin' WHERE id = $1", [w.id]);
    await h.addTransaction({ userId: w.user_id, type: 'credit', category: 'adjustment', amount: w.amount, reference: `Withdrawal #${w.id} refunded` }, q);
  });
  res.json({ ok: true });
});

// ---- Campaign CRUD ----
router.get('/campaigns', async (req, res) => {
  res.json({ items: (await db.query('SELECT * FROM campaigns ORDER BY id DESC')).rows });
});

router.post('/campaigns', async (req, res) => {
  const { title, description, type, payout, category, requirements, status } = req.body || {};
  if (!title || !description) return res.status(400).json({ error: 'Title and description are required' });
  const row = await db.one(
    `INSERT INTO campaigns (title, description, type, payout, category, requirements, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [title, description, type || 'CPA', Number(payout) || 0, category || 'General', requirements || '', status || 'active']);
  res.status(201).json({ id: row.id });
});

router.put('/campaigns/:id', async (req, res) => {
  const c = await db.one('SELECT * FROM campaigns WHERE id = $1', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Campaign not found' });
  const { title, description, type, payout, category, requirements, status } = req.body || {};
  await db.query(
    `UPDATE campaigns SET title=$1, description=$2, type=$3, payout=$4, category=$5, requirements=$6, status=$7 WHERE id=$8`,
    [title ?? c.title, description ?? c.description, type ?? c.type,
     payout != null ? Number(payout) : c.payout, category ?? c.category,
     requirements ?? c.requirements, status ?? c.status, c.id]);
  res.json({ ok: true });
});

router.delete('/campaigns/:id', async (req, res) => {
  await db.query('DELETE FROM campaigns WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
