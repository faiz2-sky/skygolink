/* Live demo: logs in and prints real API responses so you can see the app work. */
process.env.PORT = '0';
const http = require('http');
const app = require('./server');

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const u = new URL(BASE + path);
    const r = http.request({ hostname: u.hostname, port: u.port, path: u.pathname, method,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { Authorization: 'Bearer ' + token } : {}) } },
      (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d || '{}'))); });
    r.on('error', reject); if (data) r.write(data); r.end();
  });
}
let BASE;
const line = (t) => console.log('\n\x1b[36m===== ' + t + ' =====\x1b[0m');

(async () => {
  await require('./db').init();
  const s = app.listen(0, '127.0.0.1');
  await new Promise(r => s.on('listening', r));
  BASE = 'http://127.0.0.1:' + s.address().port;

  line('1. USER LOGIN (user@skygolink.com)');
  const u = await req('POST', '/api/auth/login', { email: 'user@skygolink.com', password: 'user123' });
  console.log('Logged in as:', u.user.name, '| referral code:', u.user.referral_code);

  line('2. USER DASHBOARD');
  const d = await req('GET', '/api/user/dashboard', null, u.token);
  console.log('Available: $' + d.balances.available, '| Pending: $' + d.balances.pending, '| Total earned: $' + d.balances.total_earnings);
  console.log('Conversions -> qualified:', d.conversions.qualified, 'pending:', d.conversions.pending, 'rejected:', d.conversions.rejected);
  console.log('Referred users:', d.referral_count);

  line('3. AVAILABLE CAMPAIGNS');
  const c = await req('GET', '/api/campaigns', null, u.token);
  c.items.forEach(x => console.log(` - [${x.type}] ${x.title}  -> $${x.payout}  (${x.category})`));

  line('4. ADMIN LOGIN + PLATFORM METRICS');
  const a = await req('POST', '/api/auth/login', { email: 'admin@skygolink.com', password: 'admin123' });
  const m = await req('GET', '/api/admin/dashboard', null, a.token);
  console.log('Total users:', m.total_users, '| Active campaigns:', m.active_campaigns);
  console.log('Pending withdrawals:', m.pending_withdrawals, '| Pending conversions:', m.pending_conversions);
  console.log('Total paid out: $' + m.total_paid_out, '| Earnings credited: $' + m.total_earnings_credited);

  line('5. ADMIN VIEW OF USERS');
  const users = await req('GET', '/api/admin/users', null, a.token);
  users.items.forEach(x => console.log(` - ${x.name} <${x.email}> role=${x.role} balance=$${x.available} status=${x.status}`));

  s.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
