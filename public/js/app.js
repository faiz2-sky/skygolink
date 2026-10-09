/* Hash router + auth guard */
(function () {
  function guard(roleNeeded) {
    const user = API.getUser();
    if (!user || !API.getToken()) { location.hash = '#/login'; return null; }
    if (roleNeeded === 'admin' && user.role !== 'admin') { location.hash = '#/dashboard'; return null; }
    if (roleNeeded === 'user' && user.role === 'admin') { location.hash = '#/admin'; return null; }
    return user;
  }

  function route() {
    const raw = (location.hash || '#/').slice(1);           // e.g. /campaign/3?x=1
    const path = raw.split('?')[0];
    const parts = path.split('/').filter(Boolean);          // ['campaign','3']
    const seg0 = parts[0] || '';
    window.scrollTo(0, 0);

    // Public routes
    if (seg0 === '' ) {
      if (API.getToken()) { location.hash = API.getUser().role === 'admin' ? '#/admin' : '#/dashboard'; return; }
      return ViewsPublic.landing();
    }
    if (seg0 === 'login') return ViewsPublic.login();
    if (seg0 === 'register') return ViewsPublic.register();

    // Admin routes
    if (seg0 === 'admin') {
      if (!guard('admin')) return;
      const sub = parts[1];
      if (sub === 'users') return ViewsAdmin.users();
      if (sub === 'campaigns') return ViewsAdmin.campaignsAdmin();
      if (sub === 'conversions') return ViewsAdmin.conversions();
      if (sub === 'withdrawals') return ViewsAdmin.withdrawals();
      return ViewsAdmin.dashboard();
    }

    // User routes
    if (!guard('user')) return;
    switch (seg0) {
      case 'dashboard': return ViewsUser.dashboard();
      case 'campaigns': return ViewsUser.campaigns();
      case 'campaign': return ViewsUser.campaignDetail(parts[1]);
      case 'referrals': return ViewsUser.referrals();
      case 'earnings': return ViewsUser.earnings();
      case 'wallet': return ViewsUser.wallet();
      case 'withdraw': return ViewsUser.withdraw();
      case 'transactions': return ViewsUser.transactions();
      case 'profile': return ViewsUser.profile();
      case 'security': return ViewsUser.security();
      default: return ViewsUser.dashboard();
    }
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('load', route);
  route();
})();
