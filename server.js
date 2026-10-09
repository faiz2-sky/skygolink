/**
 * SkyGoLink server entrypoint.
 * NOTE: binds to 127.0.0.1 by default. Set HOST=0.0.0.0 when deploying to a
 * hosting provider (Render / Railway / etc.) so the platform can route traffic.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const campaignRoutes = require('./routes/campaigns');
const withdrawalRoutes = require('./routes/withdrawals');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(cors());
app.use(express.json());

// API
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/admin', adminRoutes);
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'skygolink' }));

// Static frontend (SPA)
const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

// Only start listening when run directly (allows importing `app` in tests).
if (require.main === module) {
  db.init()
    .then(() => {
      app.listen(PORT, HOST, () => console.log(`SkyGoLink running at http://${HOST}:${PORT}`));
    })
    .catch((e) => { console.error('DB init failed:', e); process.exit(1); });
}

module.exports = app;
