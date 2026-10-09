/* Admin views */
window.ViewsAdmin = (function () {
  const esc = UI.esc, money = UI.money, fmtDate = UI.fmtDate, badge = UI.badge, toast = UI.toast;

  async function dashboard() {
    const view = UI.shell('admin');
    try {
      const d = await API.get('/admin/dashboard');
      view.innerHTML = `<div class="page-head"><div><h1>Admin Dashboard</h1><div class="muted">Platform overview</div></div></div>
        <div class="grid grid-3 mb">
          <div class="stat"><div class="label">\uD83D\uDC65 Total Users</div><div class="value">${d.total_users}</div></div>
          <div class="stat"><div class="label">\uD83C\uDFAF Active Campaigns</div><div class="value blue">${d.active_campaigns}</div></div>
          <div class="stat"><div class="label">\uD83D\uDCB8 Total Paid Out</div><div class="value green">${money(d.total_paid_out)}</div></div>
        </div>
        <div class="grid grid-3">
          <div class="stat"><div class="label">\u23F3 Pending Withdrawals</div><div class="value amber">${d.pending_withdrawals}</div></div>
          <div class="stat"><div class="label">\uD83D\uDD01 Pending Conversions</div><div class="value amber">${d.pending_conversions}</div></div>
          <div class="stat"><div class="label">\uD83D\uDCC8 Earnings Credited</div><div class="value blue">${money(d.total_earnings_credited)}</div></div>
        </div>`;
    } catch (e) { view.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  }

  async function users() {
    const view = UI.shell('admin/users');
    try {
      const d = await API.get('/admin/users');
      const rows = d.items.map(u => `
        <tr><td>${esc(u.name)}</td><td class="muted">${esc(u.email)}</td><td>${badge(u.role)}</td>
        <td>${u.referrals}</td><td>${money(u.available)}</td><td>${badge(u.status)}</td>
        <td>${u.role === 'admin' ? '' : `<button class="btn btn-sm ${u.status === 'active' ? 'btn-red' : 'btn-green'}" data-id="${u.id}" data-st="${u.status === 'active' ? 'suspended' : 'active'}">${u.status === 'active' ? 'Suspend' : 'Activate'}</button>`}</td></tr>`).join('');
      view.innerHTML = `<div class="page-head"><div><h1>Users</h1><div class="muted">${d.items.length} accounts</div></div></div>
        <div class="card"><table class="table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Referrals</th><th>Balance</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
      view.querySelectorAll('button[data-id]').forEach(b => b.onclick = async () => {
        try { await API.put('/admin/users/' + b.dataset.id + '/status', { status: b.dataset.st }); toast('Updated', 'ok'); users(); }
        catch (e) { toast(e.message, 'err'); }
      });
    } catch (e) { view.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  }

  async function conversions() {
    const view = UI.shell('admin/conversions');
    try {
      const d = await API.get('/admin/conversions');
      const rows = d.items.length ? d.items.map(c => `
        <tr><td>#${c.id}</td><td>${esc(c.user_name)}<div class="muted" style="font-size:12px">${esc(c.user_email)}</div></td>
        <td>${esc(c.campaign)}</td><td>${money(c.amount)}</td><td>${badge(c.status)}</td>
        <td>${c.status !== 'qualified' ? `<button class="btn btn-sm btn-green" data-act="qualify" data-id="${c.id}">Qualify</button> ` : ''}
          ${c.status !== 'rejected' ? `<button class="btn btn-sm btn-red" data-act="reject" data-id="${c.id}">Reject</button>` : ''}</td></tr>`).join('')
        : `<tr><td colspan="6" class="muted center">No conversions</td></tr>`;
      view.innerHTML = `<div class="page-head"><div><h1>Conversions</h1><div class="muted">Review and moderate affiliate conversions</div></div></div>
        <div class="card"><table class="table"><thead><tr><th>ID</th><th>Affiliate</th><th>Campaign</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>`;
      view.querySelectorAll('button[data-act]').forEach(b => b.onclick = async () => {
        try { await API.put('/admin/conversions/' + b.dataset.id + '/' + b.dataset.act, {}); toast('Done', 'ok'); conversions(); }
        catch (e) { toast(e.message, 'err'); }
      });
    } catch (e) { view.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  }

  async function withdrawals() {
    const view = UI.shell('admin/withdrawals');
    try {
      const d = await API.get('/admin/withdrawals');
      const rows = d.items.length ? d.items.map(w => `
        <tr><td>#${w.id}</td><td>${esc(w.user_name)}<div class="muted" style="font-size:12px">${esc(w.user_email)}</div></td>
        <td>${money(w.amount)}</td><td>${esc(w.bank_name)}<div class="muted" style="font-size:12px">${esc(w.account_no)} \u2022 ${esc(w.account_name)}</div></td>
        <td>${badge(w.status)}</td><td>${fmtDate(w.created_at)}</td>
        <td>${w.status === 'pending' ? `<button class="btn btn-sm btn-green" data-act="approve" data-id="${w.id}">Approve</button> <button class="btn btn-sm btn-red" data-act="reject" data-id="${w.id}">Reject</button>` : ''}</td></tr>`).join('')
        : `<tr><td colspan="7" class="muted center">No withdrawal requests</td></tr>`;
      view.innerHTML = `<div class="page-head"><div><h1>Withdrawals</h1><div class="muted">Process payout requests</div></div></div>
        <div class="card"><table class="table"><thead><tr><th>ID</th><th>User</th><th>Amount</th><th>Bank details</th><th>Status</th><th>Date</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>`;
      view.querySelectorAll('button[data-act]').forEach(b => b.onclick = async () => {
        try { await API.put('/admin/withdrawals/' + b.dataset.id + '/' + b.dataset.act, {}); toast('Done', 'ok'); withdrawals(); }
        catch (e) { toast(e.message, 'err'); }
      });
    } catch (e) { view.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  }

  async function campaignsAdmin() {
    const view = UI.shell('admin/campaigns');
    try {
      const d = await API.get('/admin/campaigns');
      const rows = d.items.length ? d.items.map(c => `
        <tr><td>${esc(c.title)}</td><td><span class="badge blue">${esc(c.type)}</span></td><td>${esc(c.category)}</td>
        <td>${money(c.payout)}</td><td>${badge(c.status)}</td>
        <td><button class="btn btn-sm" data-act="toggle" data-id="${c.id}" data-st="${c.status === 'active' ? 'paused' : 'active'}">${c.status === 'active' ? 'Pause' : 'Activate'}</button>
          <button class="btn btn-sm btn-red" data-act="del" data-id="${c.id}">Delete</button></td></tr>`).join('')
        : `<tr><td colspan="6" class="muted center">No campaigns</td></tr>`;
      view.innerHTML = `<div class="page-head"><div><h1>Campaigns</h1><div class="muted">Create and manage offers</div></div>
          <button class="btn btn-primary" id="newBtn">+ New campaign</button></div>
        <div class="card mb hidden" id="formCard">
          <h3 class="mb">New campaign</h3>
          <form id="cForm"><div class="grid grid-2">
            <div class="field"><label>Title</label><input class="input" name="title" required></div>
            <div class="field"><label>Category</label><input class="input" name="category" value="General"></div>
            <div class="field"><label>Type</label><select class="input" name="type"><option>CPA</option><option>CPI</option><option>CPL</option></select></div>
            <div class="field"><label>Payout</label><input class="input" type="number" step="0.01" name="payout" value="1.00"></div>
          </div>
          <div class="field"><label>Description</label><input class="input" name="description" required></div>
          <div class="field"><label>Requirements</label><input class="input" name="requirements"></div>
          <button class="btn btn-primary" type="submit">Create</button></form>
        </div>
        <div class="card"><table class="table"><thead><tr><th>Title</th><th>Type</th><th>Category</th><th>Payout</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>`;
      document.getElementById('newBtn').onclick = () => document.getElementById('formCard').classList.toggle('hidden');
      document.getElementById('cForm').onsubmit = async (e) => {
        e.preventDefault(); const f = e.target;
        try {
          await API.post('/admin/campaigns', {
            title: f.title.value, category: f.category.value, type: f.type.value,
            payout: f.payout.value, description: f.description.value, requirements: f.requirements.value,
          });
          toast('Campaign created', 'ok'); campaignsAdmin();
        } catch (err) { toast(err.message, 'err'); }
      };
      view.querySelectorAll('button[data-act]').forEach(b => b.onclick = async () => {
        try {
          if (b.dataset.act === 'del') { await API.del('/admin/campaigns/' + b.dataset.id); }
          else { await API.put('/admin/campaigns/' + b.dataset.id, { status: b.dataset.st }); }
          toast('Done', 'ok'); campaignsAdmin();
        } catch (e) { toast(e.message, 'err'); }
      });
    } catch (e) { view.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  }

  return { dashboard, users, conversions, withdrawals, campaignsAdmin };
})();
