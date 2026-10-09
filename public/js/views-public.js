/* Public views: landing, login, register */
window.ViewsPublic = (function () {
  const esc = UI.esc, toast = UI.toast;
  const app = () => document.getElementById('app');

  function landing() {
    app().innerHTML = `
    <header class="topbar"><div class="container">
      <div class="brand"><span class="logo">S</span> SkyGoLink</div>
      <div class="nav-links">
        <a class="btn btn-ghost" href="#/login">Login</a>
        <a class="btn btn-primary" href="#/register">Get Started</a>
      </div>
    </div></header>

    <section class="hero container">
      <span class="pill">\uD83D\uDE80 Affiliate &amp; Referral Rewards</span>
      <h1>Share. Refer. <span class="grad">Earn.</span></h1>
      <p>Join SkyGoLink, promote campaigns from top brands, invite friends with your
         referral link, and get paid for every qualified conversion.</p>
      <div class="cta">
        <a class="btn btn-primary" href="#/register">Create free account</a>
        <a class="btn" href="#/login">I already have an account</a>
      </div>
    </section>

    <section class="section container">
      <h2>How it works</h2>
      <div class="sub">Three simple steps to start earning</div>
      <div class="grid grid-3">
        <div class="feature"><div class="step-num">1</div><h3>Sign up free</h3>
          <p>Create your account and get a unique referral link and dashboard in seconds.</p></div>
        <div class="feature"><div class="step-num">2</div><h3>Share campaigns</h3>
          <p>Pick from multiple CPI, CPA and lead campaigns and share them with your audience.</p></div>
        <div class="feature"><div class="step-num">3</div><h3>Get paid</h3>
          <p>Track qualified conversions in real time and withdraw your earnings to your bank.</p></div>
      </div>
    </section>

    <section class="section container">
      <h2>Why SkyGoLink</h2>
      <div class="sub">Built for affiliates who want transparency and fast payouts</div>
      <div class="grid grid-4">
        <div class="feature"><div class="ic">\uD83C\uDFAF</div><h3>Multiple Campaigns</h3><p>A growing marketplace of offers across many categories.</p></div>
        <div class="feature"><div class="ic">\uD83D\uDCB0</div><h3>Real Rewards</h3><p>Clear payouts per conversion with a live earnings tracker.</p></div>
        <div class="feature"><div class="ic">\uD83D\uDD12</div><h3>Secure Platform</h3><p>Protected accounts and anti-fraud review on every conversion.</p></div>
        <div class="feature"><div class="ic">\uD83D\uDD54</div><h3>24/7 Support</h3><p>We are here around the clock to help you succeed.</p></div>
      </div>
    </section>

    <div class="footer"><div class="container">
      \u00A9 2026 SkyGoLink. All rights reserved. &nbsp;\u2022&nbsp; Multiple Campaigns &nbsp;\u2022&nbsp; Real Rewards &nbsp;\u2022&nbsp; Secure Platform &nbsp;\u2022&nbsp; 24/7 Support
    </div></div>`;
  }

  function login() {
    app().innerHTML = `
    <div class="auth-wrap"><div class="auth-card">
      <div class="brand" style="margin-bottom:18px"><span class="logo">S</span> SkyGoLink</div>
      <h2>Welcome back</h2>
      <div class="muted">Log in to your account to continue</div>
      <form id="loginForm">
        <div class="field"><label>Email</label><input class="input" type="email" name="email" required placeholder="you@example.com"></div>
        <div class="field"><label>Password</label><input class="input" type="password" name="password" required placeholder="\u2022\u2022\u2022\u2022\u2022\u2022"></div>
        <button class="btn btn-primary btn-block" type="submit">Log in</button>
      </form>
      <div class="form-foot">New here? <a href="#/register">Create an account</a></div>
      <div class="form-foot muted" style="margin-top:14px;font-size:12px">Demo \u2014 user@skygolink.com / user123 &nbsp;|&nbsp; admin@skygolink.com / admin123</div>
    </div></div>`;
    document.getElementById('loginForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        const data = await API.post('/auth/login', { email: f.email.value, password: f.password.value });
        API.setSession(data.token, data.user);
        toast('Logged in', 'ok');
        location.hash = data.user.role === 'admin' ? '#/admin' : '#/dashboard';
      } catch (err) { toast(err.message, 'err'); }
    };
  }

  function register() {
    const ref = new URLSearchParams(location.hash.split('?')[1] || '').get('ref') || '';
    app().innerHTML = `
    <div class="auth-wrap"><div class="auth-card">
      <div class="brand" style="margin-bottom:18px"><span class="logo">S</span> SkyGoLink</div>
      <h2>Create your account</h2>
      <div class="muted">Start sharing and earning today</div>
      <form id="regForm">
        <div class="field"><label>Full name</label><input class="input" name="name" required placeholder="Your name"></div>
        <div class="field"><label>Email</label><input class="input" type="email" name="email" required placeholder="you@example.com"></div>
        <div class="field"><label>Password</label><input class="input" type="password" name="password" required minlength="6" placeholder="At least 6 characters"></div>
        <div class="field"><label>Referral code (optional)</label><input class="input" name="ref" value="${esc(ref)}" placeholder="e.g. DEMO1234"></div>
        <button class="btn btn-primary btn-block" type="submit">Create account</button>
      </form>
      <div class="form-foot">Already registered? <a href="#/login">Log in</a></div>
    </div></div>`;
    document.getElementById('regForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        const data = await API.post('/auth/register', {
          name: f.name.value, email: f.email.value, password: f.password.value, ref: f.ref.value,
        });
        API.setSession(data.token, data.user);
        toast('Account created', 'ok');
        location.hash = '#/dashboard';
      } catch (err) { toast(err.message, 'err'); }
    };
  }

  return { landing, login, register };
})();
