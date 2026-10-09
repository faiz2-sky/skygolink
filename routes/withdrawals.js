/**
 * Withdrawal routes (user-facing, PostgreSQL async). The requested amount is
 * debited from the ledger immediately (held). A rejection by an admin credits
 * it back.
 */
const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const h = require('../helpers');

const router = express.Router();
router.use(authRequired);

const MIN_WITHDRAWAL = Number(process.env.MIN_WITHDRAWAL || 10);

router.post('/', async (req, res) => {
  try {
    const { amount, bank_name, account_no, account_name } = req.body || {};
    const amt = Number(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: 'Enter a valid amount' });
    if (amt < MIN_WITHDRAWAL) return res.status(400).json({ error: `Minimum withdrawal is ${MIN_WITHDRAWAL}` });
    if (!bank_name || !account_no || !account_name) return res.status(400).json({ error: 'Complete bank details are required' });

    const available = await h.getAvailableBalance(req.user.id);
    if (amt > available) return res.status(400).json({ error: 'Insufficient available balance' });

    const id = await db.withTx(async (q) => {
      const row = (await q(
        `INSERT INTO withdrawals (user_id, amount, bank_name, account_no, account_name)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [req.user.id, amt, bank_name, account_no, account_name])).rows[0];
      await h.addTransaction({
        userId: req.user.id, type: 'debit', category: 'withdrawal',
        amount: amt, reference: `Withdrawal #${row.id} requested`,
      }, q);
      return row.id;
    });
    res.status(201).json({ id, message: 'Withdrawal request submitted', available: await h.getAvailableBalance(req.user.id) });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/', async (req, res) => {
  const rows = (await db.query('SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY id DESC', [req.user.id])).rows;
  res.json({ items: rows, min_withdrawal: MIN_WITHDRAWAL });
});

module.exports = router;
