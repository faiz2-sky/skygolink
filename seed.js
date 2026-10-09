/**
 * Seed script (PostgreSQL, async): admin + demo user, campaigns, sample data.
 * Run with: npm run seed
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');
const h = require('./helpers');

function code(prefix) { return prefix + Math.random().toString(36).slice(2, 7).toUpperCase(); }

(async () => {
  await db.init();
  await db.withTx(async (q) => {
    // Reset (dev only) — TRUNCATE resets identity sequences too.
    await q('TRUNCATE transactions, withdrawals, conversions, campaigns, users RESTART IDENTITY CASCADE');

    const adminHash = bcrypt.hashSync('admin123', 10);
    const userHash = bcrypt.hashSync('user123', 10);

    await q(`INSERT INTO users (name,email,password_hash,role,referral_code) VALUES ($1,$2,$3,$4,$5)`,
      ['Platform Admin', 'admin@skygolink.com', adminHash, 'admin', code('ADMIN')]);
    const user = (await q(`INSERT INTO users (name,email,password_hash,role,referral_code) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      ['Demo User', 'user@skygolink.com', userHash, 'user', code('DEMO')])).rows[0];
    const uid = user.id;

    await q(`INSERT INTO users (name,email,password_hash,role,referral_code,referred_by) VALUES ($1,$2,$3,$4,$5,$6)`,
      ['Amina Bello', 'amina@example.com', userHash, 'user', code('AMINA'), uid]);
    await q(`INSERT INTO users (name,email,password_hash,role,referral_code,referred_by) VALUES ($1,$2,$3,$4,$5,$6)`,
      ['Yusuf Musa', 'yusuf@example.com', userHash, 'user', code('YUSUF'), uid]);

    const campaigns = [
      ['Shop App Install', 'Earn when a referred user installs the Shop app and signs up.', 'CPI', 2.5, 'Shopping', 'User must install and open the app once.'],
      ['Bank Account Signup', 'Reward for each qualified new bank account registration.', 'CPA', 8.0, 'Finance', 'KYC must be completed by the referral.'],
      ['Food Delivery Order', 'Earn on each referred user that completes a first order.', 'CPA', 4.0, 'Food', 'First order must be above the minimum basket.'],
      ['Newsletter Lead', 'Get paid per verified email lead you generate.', 'CPL', 0.75, 'Lead Gen', 'Email must be confirmed via double opt-in.'],
      ['Game Install', 'Reward for referred users who reach level 5 in the game.', 'CPI', 1.5, 'Gaming', 'Referral reaches level 5 within 7 days.'],
    ];
    const campIds = [];
    for (const c of campaigns) {
      const r = (await q(`INSERT INTO campaigns (title,description,type,payout,category,requirements) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, c)).rows[0];
      campIds.push(r.id);
    }

    const conv = [
      [campIds[0], 2.5, 'qualified', 'Approved by admin'],
      [campIds[1], 8.0, 'qualified', 'Approved by admin'],
      [campIds[2], 4.0, 'pending', 'Submitted by affiliate'],
      [campIds[3], 0.75, 'rejected', 'Invalid lead'],
      [campIds[4], 1.5, 'pending', 'Submitted by affiliate'],
    ];
    for (const [cid, amt, st, note] of conv) {
      await q(`INSERT INTO conversions (user_id,campaign_id,amount,status,note) VALUES ($1,$2,$3,$4,$5)`, [uid, cid, amt, st, note]);
    }

    await h.addTransaction({ userId: uid, type: 'credit', category: 'earning', amount: 2.5, reference: 'Conversion qualified' }, q);
    await h.addTransaction({ userId: uid, type: 'credit', category: 'earning', amount: 8.0, reference: 'Conversion qualified' }, q);
  });

  console.log('Seed complete.');
  console.log('  Admin:  admin@skygolink.com / admin123');
  console.log('  User:   user@skygolink.com  / user123');
  process.exit(0);
})().catch(e => { console.error('Seed failed:', e); process.exit(1); });
