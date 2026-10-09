/* Authenticated user views */
window.ViewsUser = (function () {
  const esc = UI.esc, money = UI.money, fmtDate = UI.fmtDate, badge = UI.badge, toast = UI.toast;

  async function dashboard() {
    const view = UI.shell('dashboard');
    try {
      const d = await API.get('/user/dashboard');
      const link = location.origin + '/#/register?ref=' + encodeURIComponent(d.referral_code);
      const rows = d.recent_transactions.length ? d.recent_transactions.map(t => `
        <tr><td>${fmtDate(t.created_at)}</td><td>${esc(t.reference || t.category)}</td>
        <td>${badge(t.type)}</td><td>${money(t.amount)}</td></tr>`).join('')
        : `<tr><td colspan="4" class="muted center">No transactions yet</td></tr>`;
      view.innerHTML = `
        <div class="page-head"><div><h1>Dashboard</h1><div class="muted">Welcome back, ${esc(API.getUser().name)}</div></div></div>
        <div class="grid grid-3 mb">
          <div class="stat"><div class="label">\uD83D\uDCB5 Available Balance</div><div class="value green">${money(d.balances.available)}</div></div>
          <div class="stat"><div class="label">\u23F3 Pending Balance</div><div class="value amber">${money(d.balances.pending)}</div></div>
          <div class="stat"><div class="label">\uD83D\uDCC8 Total Earnings</div><div class="value blue">${money(d.balances.total_earnings)}</div></div>
        </div>
        <div class="grid grid-4 mb">
          <div class="stat"><div class="label">Qualified</div><div class="value">${d.conversions.qualified}</div></div>
          <div class="stat"><div class="label">Pending</div><div class="value">${d.conversions.pending}</div></div>
          <div class="stat"><div class="label">Rejected</div><div class="value">${d.conversions.rejected}</div></div>
          <div class="stat"><div class="label">Referred Users</div><div class="value">${d.referral_count}</div></div>
        </div>
        <div class="card mb">
          <h3 style="margin-bottom:12px">Your referral link</h3>
          <div class="reflink"><input id="refIn" readonly value="${esc(link)}">
            <button class="btn btn-sm btn-primary" id="copyRef">Copy</button></div>
          <div class="muted" style="margin-top:8px;font-size:13px">Share this link \u2014 anyone who signs up through it becomes your referral.</div>
        </div>
        <div class="card">
          <h3 style="margin-bottom:10px">Recent transactions</h3>
          <table class="table"><thead><tr><th>Date</th><th>Detail</th><th>Type</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
        </div>`;
      document.getElementById('copyRef').onclick = () => {
        const i = document.getElementById('refIn'); i.select();
        navigator.clipboard.writeText(i.value).then(() => toast('Referral link copied', 'ok'));
      };
    } catch (e) { view.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  }

  async function campaigns() {
    const view = UI.shell('campaigns');
    try {
      const d = await API.get('/campaigns');
      const cards = d.items.length ? d.items.map(c => `
        <div class="feature">
          <div class="row" style="justify-content:space-between;align-items:center">
            <span class="badge blue">${esc(c.type)}</span><span class="muted">${esc(c.category)}</span></div>
          <h3 style="margin:12px 0 6px">${esc(c.title)}</h3>
          <p style="min-height:40px">${esc(c.description)}</p>
          <div class="row" style="justify-content:space-between;align-items:center;margin-top:14px">
            <div><div class="muted" style="font-size:12px">Payout</div><div style="font-weight:800;color:#4ade80">${money(c.payout)}</div></div>
            <a class="btn btn-sm btn-primary" href="#/campaign/${c.id}">View</a>
          </div>
        </div>`).join('') : `<div class="empty">No active campaigns right now</div>`;
      view.innerHTML = `<div class="page-head"><div><h1>Campaigns</h1><div class="muted">Pick an offer to promote</div></div></div>
        <div class="grid grid-3">${cards}</div>`;
    } catch (e) { view.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  }

  async function campaignDetail(id) {
    const view = UI.shell('campaigns');
    try {
      const { campaign: c } = await API.get('/campaigns/' + id);
      view.innerHTML = `
        <div class="page-head"><div><h1>${esc(c.title)}</h1><div class="muted">${esc(c.category)} \u2022 ${esc(c.type)}</div></div>
          <a class="btn" href="#/campaigns">\u2190 Back</a></div>
        <div class="grid grid-2">
          <div class="card">
            <h3 class="mb">About this campaign</h3>
            <p class="muted">${esc(c.description)}</p>
            <hr class="hr">
            <h3 class="mb">Requirements</h3>
            <p class="muted">${esc(c.requirements || 'No special requirements.')}</p>
          </div>
          <div class="card">
            <div class="stat" style="border:none;padding:0"><div class="label">Payout per conversion</div>
              <div class="value green">${money(c.payout)}</div></div>
            <hr class="hr">
            <p class="muted mb">Submit this campaign to generate a conversion. It will be reviewed by our anti-fraud team before your reward is credited.</p>
            <button class="btn btn-primary btn-block" id="joinBtn">Submit conversion</button>
          </div>
        </div>`;
      document.getElementById('joinBtn').onclick = async (ev) => {
        ev.target.disabled = true;
        try { const r = await API.post('/campaigns/' + id + '/join', {}); toast(r.message, 'ok'); }
        catch (e) { toast(e.message, 'err'); ev.target.disabled = false; }
      };
    } catch (e) { view.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  }

  async function referrals() {
    const view = UI.shell('referrals');
    try {
      const d = await API.get('/user/referrals');
      const people = d.people.length ? d.people.map(p => `
        <tr><td>${esc(p.name)}</td><td class="muted">${esc(p.email)}</td><td>${badge(p.status)}</td><td>${fmtDate(p.created_at)}</td></tr>`).join('')
        : `<tr><td colspan="4" class="muted center">No referred users yet</td></tr>`;
      const conv = d.conversions.length ? d.conversions.map(c => `
        <tr><td>${esc(c.campaign)}</td><td>${money(c.amount)}</td><td>${badge(c.status)}</td><td>${fmtDate(c.created_at)}</td></tr>`).join('')
        : `<tr><td colspan="4" class="muted center">No conversions yet</td></tr>`;
      view.innerHTML = `<div class="page-head"><div><h1>My Referrals</h1><div class="muted">People you invited and your conversions</div></div></div>
        <div class="card mb"><h3 class="mb">Referred users</h3>
          <table class="table"><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Joined</th></tr></thead><tbody>${people}</tbody></table></div>
        <div class="card"><h3 class="mb">Conversions</h3>
          <table class="table"><thead><tr><th>Campaign</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>${conv}</tbody></table></div>`;
    } catch (e) { view.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  }

  async function earnings() {
    const view = UI.shell('earnings');
    try {
      const d = await API.get('/user/earnings');
      const rows = d.items.length ? d.items.map(i => `
        <tr><td>${esc(i.campaign)}</td><td><span class="badge blue">${esc(i.type)}</span></td>
        <td>${money(i.amount)}</td><td>${badge(i.status)}</td><td>${fmtDate(i.created_at)}</td></tr>`).join('')
        : `<tr><td colspan="5" class="muted center">No earnings yet</td></tr>`;
      view.innerHTML = `<div class="page-head"><div><h1>My Earnings</h1><div class="muted">All your conversion payouts</div></div></div>
        <div class="grid grid-2 mb">
          <div class="stat"><div class="label">Total Earnings</div><div class="value green">${money(d.total_earnings)}</div></div>
          <div class="stat"><div class="label">Pending</div><div class="value amber">${money(d.pending)}</div></div>
        </div>
        <div class="card"><table class="table"><thead><tr><th>Campaign</th><th>Type</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    } catch (e) { view.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  }

  async function wallet() {
    const view = UI.shell('wallet');
    try {
      const d = await API.get('/user/wallet');
      const rows = d.withdrawals.length ? d.withdrawals.map(w => `
        <tr><td>${fmtDate(w.created_at)}</td><td>${money(w.amount)}</td><td>${esc(w.bank_name)}</td><td>${badge(w.status)}</td></tr>`).join('')
        : `<tr><td colspan="4" class="muted center">No withdrawals yet</td></tr>`;
      view.innerHTML = `<div class="page-head"><div><h1>Wallet</h1><div class="muted">Your balances and payout history</div></div>
          <a class="btn btn-primary" href="#/withdraw">Withdraw funds</a></div>
        <div class="grid grid-3 mb">
          <div class="stat"><div class="label">Available</div><div class="value green">${money(d.available)}</div></div>
          <div class="stat"><div class="label">Pending</div><div class="value amber">${money(d.pending)}</div></div>
          <div class="stat"><div class="label">Total Earnings</div><div class="value blue">${money(d.total_earnings)}</div></div>
        </div>
        <div class="card"><h3 class="mb">Withdrawal history</h3>
          <table class="table"><thead><tr><th>Date</th><th>Amount</th><th>Bank</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    } catch (e) { view.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  }

  async function withdraw() {
    const view = UI.shell('withdraw');
    try {
      const w = await API.get('/user/wallet');
      const info = await API.get('/withdrawals');
      view.innerHTML = `<div class="page-head"><div><h1>Withdraw</h1><div class="muted">Request a payout to your bank account</div></div></div>
        <div class="grid grid-2">
          <div class="card">
            <div class="stat" style="border:none;padding:0;margin-bottom:14px"><div class="label">Available balance</div>
              <div class="value green">${money(w.available)}</div></div>
            <div class="muted" style="font-size:13px">Minimum withdrawal: <b>${money(info.min_withdrawal)}</b></div>
          </div>
          <div class="card">
            <form id="wdForm">
              <div class="field"><label>Amount</label><input class="input" type="number" step="0.01" min="0" name="amount" required></div>
              <div class="field"><label>Bank name</label><input class="input" name="bank_name" required></div>
              <div class="field"><label>Account number</label><input class="input" name="account_no" required></div>
              <div class="field"><label>Account name</label><input class="input" name="account_name" required></div>
              <button class="btn btn-primary btn-block" type="submit">Request withdrawal</button>
            </form>
          </div>
        </div>`;
      document.getElementById('wdForm').onsubmit = async (e) => {
        e.preventDefault();
        const f = e.target;
        try {
          const r = await API.post('/withdrawals', {
            amount: f.amount.value, bank_name: f.bank_name.value,
            account_no: f.account_no.value, account_name: f.account_name.value,
          });
          toast(r.message, 'ok'); location.hash = '#/wallet';
        } catch (err) { toast(err.message, 'err'); }
      };
    } catch (e) { view.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  }

  async function transactions() {
    const view = UI.shell('transactions');
    try {
      const d = await API.get('/user/transactions');
      const rows = d.items.length ? d.items.map(t => `
        <tr><td>${fmtDate(t.created_at)}</td><td>${esc(t.reference || t.category)}</td>
        <td><span class="badge gray">${esc(t.category)}</span></td><td>${badge(t.type)}</td>
        <td>${money(t.amount)}</td><td>${money(t.balance_after)}</td></tr>`).join('')
        : `<tr><td colspan="6" class="muted center">No transactions yet</td></tr>`;
      view.innerHTML = `<div class="page-head"><div><h1>Transactions</h1><div class="muted">Full ledger of credits and debits</div></div></div>
        <div class="card"><table class="table"><thead><tr><th>Date</th><th>Reference</th><th>Category</th><th>Type</th><th>Amount</th><th>Balance</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    } catch (e) { view.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  }

  async function profile() {
    const view = UI.shell('profile');
    const u = API.getUser();
    view.innerHTML = `<div class="page-head"><div><h1>Profile</h1><div class="muted">Manage your account information</div></div></div>
      <div class="grid grid-2">
        <div class="card">
          <form id="pForm">
            <div class="field"><label>Full name</label><input class="input" name="name" value="${esc(u.name)}" required></div>
            <div class="field"><label>Email (read-only)</label><input class="input" value="${esc(u.email)}" disabled></div>
            <button class="btn btn-primary" type="submit">Save changes</button>
          </form>
        </div>
        <div class="card">
          <h3 class="mb">Account</h3>
          <p class="muted">Referral code</p><p style="font-weight:700;font-size:18px;margin-bottom:12px">${esc(u.referral_code)}</p>
          <p class="muted">Role</p><p>${badge(u.role)}</p>
        </div>
      </div>`;
    document.getElementById('pForm').onsubmit = async (e) => {
      e.preventDefault();
      try {
        const r = await API.put('/user/profile', { name: e.target.name.value });
        API.setSession(API.getToken(), r.user); toast('Profile updated', 'ok');
      } catch (err) { toast(err.message, 'err'); }
    };
  }

  async function security() {
    const view = UI.shell('security');
    view.innerHTML = `<div class="page-head"><div><h1>Security</h1><div class="muted">Update your password</div></div></div>
      <div class="card" style="max-width:460px">
        <form id="sForm">
          <div class="field"><label>Current password</label><input class="input" type="password" name="current_password" required></div>
          <div class="field"><label>New password</label><input class="input" type="password" name="new_password" minlength="6" required></div>
          <button class="btn btn-primary" type="submit">Change password</button>
        </form>
      </div>`;
    document.getElementById('sForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        await API.put('/user/password', { current_password: f.current_password.value, new_password: f.new_password.value });
        toast('Password changed', 'ok'); f.reset();
      } catch (err) { toast(err.message, 'err'); }
    };
  }

  return { dashboard, campaigns, campaignDetail, referrals, earnings, wallet, withdraw, transactions, profile, security };
})();
