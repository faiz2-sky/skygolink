/**
 * Auth routes: register, login, current user (PostgreSQL, async).
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { sign, authRequired } = require('../middleware/auth');

const router = express.Router();

function genReferralCode(name) {
  const base = (name || 'user').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'SKY';
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${base}${rand}`;
}

function publicUser(u) {
  return {
    id: u.id, name: u.name, email: u.email, role: u.role,
    referral_code: u.referral_code, status: u.status, created_at: u.created_at,
  };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, ref } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
    if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await db.one('SELECT id FROM users WHERE email = $1', [String(email).toLowerCase()]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    let referredBy = null;
    if (ref) {
      const refUser = await db.one('SELECT id FROM users WHERE referral_code = $1', [String(ref).toUpperCase()]);
      if (refUser) referredBy = refUser.id;
    }

    let code = genReferralCode(name);
    while (await db.one('SELECT id FROM users WHERE referral_code = $1', [code])) code = genReferralCode(name);

    const hash = bcrypt.hashSync(String(password), 10);
    const inserted = await db.one(
      `INSERT INTO users (name, email, password_hash, referral_code, referred_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, String(email).toLowerCase(), hash, code, referredBy]);

    const token = sign(inserted);
    res.status(201).json({ token, user: publicUser(inserted) });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const user = await db.one('SELECT * FROM users WHERE email = $1', [String(email).toLowerCase()]);
    if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended' });
    const token = sign(user);
    res.json({ token, user: publicUser(user) });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/auth/me
router.get('/me', authRequired, async (req, res) => {
  const user = await db.one('SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

module.exports = router;
