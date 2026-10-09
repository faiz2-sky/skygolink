/**
 * Campaign routes (user-facing, PostgreSQL async).
 */
const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

router.get('/', async (req, res) => {
  const rows = (await db.query("SELECT * FROM campaigns WHERE status = 'active' ORDER BY id DESC")).rows;
  res.json({ items: rows });
});

router.get('/:id', async (req, res) => {
  const c = await db.one('SELECT * FROM campaigns WHERE id = $1', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Campaign not found' });
  res.json({ campaign: c });
});

router.post('/:id/join', async (req, res) => {
  const c = await db.one("SELECT * FROM campaigns WHERE id = $1 AND status = 'active'", [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Campaign not available' });
  const dup = await db.one(
    "SELECT id FROM conversions WHERE user_id = $1 AND campaign_id = $2 AND status='pending'",
    [req.user.id, c.id]);
  if (dup) return res.status(409).json({ error: 'You already have a pending submission for this campaign' });
  const row = await db.one(
    `INSERT INTO conversions (user_id, campaign_id, amount, status, note)
     VALUES ($1, $2, $3, 'pending', 'Submitted by affiliate') RETURNING id`,
    [req.user.id, c.id, c.payout]);
  res.status(201).json({ id: row.id, message: 'Submission received, pending review' });
});

module.exports = router;
