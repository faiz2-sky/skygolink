/* Shared UI helpers: escaping, toast, money, badges, shell layout. */
window.UI = (function () {
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function money(n) {
    const v = Number(n || 0);
    return '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtDate(s) {
    if (!s) return '-';
    let d = new Date(s);
    if (isNaN(d)) d = new Date(String(s).replace(' ', 'T') + 'Z');
    if (isNaN(d)) return esc(s);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
  function badge(status) {
    const map = {
      qualified: 'green', approved: 'green', paid: 'green', active: 'green', credit: 'green',
      pending: 'amber', rejected: 'red', suspended: 'red', debit: 'red', paused: 'gray',
    };
    const cls = map[String(status).toLowerCase()] || 'blue';
    return `<span class="badge ${cls}">${esc(status)}</span>`;
  }
  let toastT;
  function toast(msg, type) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show ' + (type || '');
    clearTimeout(toastT);
    toastT = setTimeout(() => { el.className = 'toast ' + (type || ''); }, 3200);
  }

  const USER_NAV = [
    ['dashboard', '\u25A0', 'Dashboard'],
    ['campaigns', '\uD83C\uDFAF', 'Campaigns'],
    ['referrals', '\uD83D\uDC65', 'My Referrals'],
    ['earnings', '\uD83D\uDCB0', 'My Earnings'],
    ['wallet', '\uD83D\uDC5B', 'Wallet'],
    ['withdraw', '\uD83C\uDFE6', 'Withdraw'],
    ['transactions', '\uD83D\uDCC4', 'Transactions'],
    ['profile', '\uD83D\uDC64', 'Profile'],
    ['security', '\uD83D\uDD12', 'Security'],
  ];
  const ADMIN_NAV = [
    ['admin', '\u25A0', 'Dashboard'],
    ['admin/users', '\uD83D\uDC65', 'Users'],
    ['admin/campaigns', '\uD83C\uDFAF', 'Campaigns'],
    ['admin/conversions', '\uD83D\uDD01', 'Conversions'],
    ['admin/withdrawals', '\uD83C\uDFE6', 'Withdrawals'],
  ];

  // Renders the sidebar shell and returns the inner content container element.
  function shell(active) {
    const user = API.getUser();
    const nav = user && user.role === 'admin' ? ADMIN_NAV : USER_NAV;
    const links = nav.map(([route, ic, label]) =>
      `<a class="side-link ${route === active ? 'active' : ''}" href="#/${route}">
        <span class="ic">${ic}</span>${esc(label)}</a>`).join('');
    document.getElementById('app').innerHTML = `
      <div class="shell">
        <aside class="sidebar" id="sidebar">
          <div class="brand"><span class="logo">S</span> SkyGoLink</div>
          ${links}
          <div class="side-sep"></div>
          <div class="card" style="padding:12px;margin-bottom:10px">
            <div style="font-weight:600;font-size:14px">${esc(user ? user.name : '')}</div>
            <div class="muted" style="font-size:12px">${esc(user ? user.email : '')}</div>
          </div>
          <button class="btn btn-ghost" id="logoutBtn"><span>\u21AA</span> Logout</button>
        </aside>
        <main class="main">
          <div class="mobile-bar">
            <button class="hamb" id="hambBtn">\u2630</button>
            <div class="brand" style="font-size:17px"><span class="logo">S</span> SkyGoLink</div>
          </div>
          <div id="view"><div class="loader">Loading\u2026</div></div>
        </main>
      </div>`;
    document.getElementById('logoutBtn').onclick = () => { API.clearSession(); location.hash = '#/login'; };
    const hamb = document.getElementById('hambBtn');
    if (hamb) hamb.onclick = () => document.getElementById('sidebar').classList.toggle('open');
    return document.getElementById('view');
  }

  return { esc, money, fmtDate, badge, toast, shell };
})();
