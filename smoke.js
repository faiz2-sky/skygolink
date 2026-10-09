/* In-process smoke test: boots the app, exercises key flows, then exits. */
process.env.HOST = '127.0.0.1';
process.env.PORT = '0';
const http = require('http');
const app = require('./server');

let BASE;
function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const u = new URL(BASE + path);
    const r = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
                 ...(token ? { Authorization: 'Bearer ' + token } : {}) } },
      (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => {
        let j = {}; try { j = JSON.parse(d); } catch {}
        resolve({ status: res.statusCode, body: j }); }); });
    r.on('error', reject); if (data) r.write(data); r.end();
  });
}

let pass = 0, fail = 0;
function check(name, cond, extra) { if (cond) { pass++; console.log('  \u2713', name); } else { fail++; console.log('  \u2717', name, extra || ''); } }

(async () => {
  await require('./db').init();
  const server = app.listen(0, '127.0.0.1');
  await new Promise(r => server.on('listening', r));
  BASE = 'http://127.0.0.1:' + server.address().port;

  // Health
  let r = await req('GET', '/api/health');
  check('health ok', r.status === 200 && r.body.ok);

  // Register a brand new user
  const email = 'test' + Date.now() + '@ex.com';
  r = await req('POST', '/api/auth/register', { name: 'Test Person', email, password: 'secret1' });
  check('register', r.status === 201 && r.body.token, JSON.stringify(r.body));
  const userToken = r.body.token;
  const refCode = r.body.user.referral_code;

  // Referral signup using that code
  r = await req('POST', '/api/auth/register', { name: 'Invited', email: 'inv' + Date.now() + '@ex.com', password: 'secret1', ref: refCode });
  check('referral signup', r.status === 201);

  // Login as seeded user & admin
  r = await req('POST', '/api/auth/login', { email: 'user@skygolink.com', password: 'user123' });
  check('user login', r.status === 200, JSON.stringify(r.body));
  const demoToken = r.body.token;
  r = await req('POST', '/api/auth/login', { email: 'admin@skygolink.com', password: 'admin123' });
  check('admin login', r.status === 200);
  const adminToken = r.body.token;

  // Wrong password
  r = await req('POST', '/api/auth/login', { email: 'user@skygolink.com', password: 'nope' });
  check('bad login rejected', r.status === 401);

  // Dashboard
  r = await req('GET', '/api/user/dashboard', null, demoToken);
  check('dashboard loads', r.status === 200 && r.body.balances, JSON.stringify(r.body).slice(0,120));
  const availBefore = r.body.balances.available;

  // Campaigns list + detail + join (new user)
  r = await req('GET', '/api/campaigns', null, userToken);
  check('campaigns list', r.status === 200 && r.body.items.length > 0);
  const campId = r.body.items[0].id;
  r = await req('POST', '/api/campaigns/' + campId + '/join', {}, userToken);
  check('join campaign', r.status === 201, JSON.stringify(r.body));

  // Admin: find that pending conversion & qualify it
  r = await req('GET', '/api/admin/conversions', null, adminToken);
  check('admin conversions', r.status === 200);
  const pending = r.body.items.find(c => c.status === 'pending');
  r = await req('PUT', '/api/admin/conversions/' + pending.id + '/qualify', {}, adminToken);
  check('qualify conversion', r.status === 200);

  // Admin guard: user cannot access admin route
  r = await req('GET', '/api/admin/dashboard', null, userToken);
  check('admin guard blocks user', r.status === 403);

  // Withdrawal flow on seeded demo user (has balance)
  r = await req('POST', '/api/withdrawals', { amount: 10, bank_name: 'Test Bank', account_no: '123', account_name: 'Demo' }, demoToken);
  check('withdraw request', r.status === 201, JSON.stringify(r.body));
  const availAfter = r.body.available;
  check('balance debited', availAfter === availBefore - 10, `before=${availBefore} after=${availAfter}`);

  // Admin reject that withdrawal -> refund
  r = await req('GET', '/api/admin/withdrawals', null, adminToken);
  const wd = r.body.items.find(w => w.status === 'pending');
  r = await req('PUT', '/api/admin/withdrawals/' + wd.id + '/reject', {}, adminToken);
  check('reject withdrawal', r.status === 200);
  r = await req('GET', '/api/user/wallet', null, demoToken);
  check('balance refunded', r.body.available === availBefore, `expected=${availBefore} got=${r.body.available}`);

  // Insufficient balance guard
  r = await req('POST', '/api/withdrawals', { amount: 999999, bank_name: 'B', account_no: '1', account_name: 'X' }, demoToken);
  check('insufficient balance blocked', r.status === 400);

  // Password change
  r = await req('PUT', '/api/user/password', { current_password: 'secret1', new_password: 'secret2' }, userToken);
  check('password change', r.status === 200);

  server.close();
  console.log(`\nResult: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
