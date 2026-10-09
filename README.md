# SkyGoLink — Affiliate / Referral Rewards Platform (PostgreSQL)

A full-stack affiliate marketing platform where users register, share referral
links, promote campaigns (CPI / CPA / CPL), earn per qualified conversion, and
withdraw their earnings. Admins manage users, campaigns, conversions and
withdrawals.

## Tech stack
- **Backend:** Node.js + Express (REST API)
- **Database:** **PostgreSQL** (via `pg`)
  - For zero-setup local development the app can fall back to an **embedded**
    Postgres (PGlite) when `DATABASE_URL` is not set — same SQL dialect.
- **Auth:** JWT + bcrypt password hashing
- **Frontend:** Vanilla JS single-page app (dark theme), served as static files

## Features
**User side:** landing page, register/login, dashboard (balances + referral
link), campaigns list & detail, my referrals, my earnings, wallet, withdraw,
transaction ledger, profile, security (change password).

**Admin side:** metrics dashboard, user management (suspend/activate),
campaign CRUD, conversion moderation (qualify/reject), withdrawal processing
(approve/reject with automatic refund).

## Run locally (zero-setup, embedded Postgres)
```bash
npm install        # installs dependencies
cp .env.example .env
npm run seed       # creates demo data (admin + user accounts)
npm start          # http://127.0.0.1:3000
npm test           # optional: run the end-to-end smoke tests (18 checks)
```
With no `DATABASE_URL`, data is stored locally under `data/pgdata` via PGlite.

## Run locally against a real PostgreSQL
```bash
export DATABASE_URL=postgresql://user:pass@localhost:5432/skygolink
export PGSSL=disable        # if your local Postgres has no SSL
npm run seed && npm start
```

### Demo accounts (after `npm run seed`)
| Role  | Email                 | Password  |
|-------|-----------------------|-----------|
| Admin | admin@skygolink.com   | admin123  |
| User  | user@skygolink.com    | user123   |

## Deploy to Render (PostgreSQL) — step by step
1. Push this folder to a **GitHub** repository.
2. On **render.com** create a **PostgreSQL** instance:
   - New + → PostgreSQL → give it a name → Create.
   - When ready, copy its **Internal Database URL**.
3. Create a **Web Service** pointing at your repo:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Instance type:** Free
4. Add environment variables to the Web Service:
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | the Postgres URL you copied |
   | `HOST` | `0.0.0.0` |
   | `JWT_SECRET` | a long random string |
   | `MIN_WITHDRAWAL` | `10` |
   `PORT` is injected by Render automatically.
5. **Create Web Service** and wait for the build. The schema is created
   automatically on first boot.
6. (Optional) Load demo data: open the service **Shell** and run `npm run seed`.
7. Open the generated URL — e.g. `https://skygolink.onrender.com`.

> Because data now lives in managed PostgreSQL, it **persists** across
> redeploys (unlike the previous SQLite version).

## Security notes
- Passwords hashed with bcrypt; API protected with JWT bearer tokens; admin
  routes role-guarded; SQL uses parameterised queries.
- Managed Postgres connections use SSL by default (`PGSSL=disable` to turn off).
- **Before production:** set a strong `JWT_SECRET`, keep HTTPS (Render handles
  it), and integrate a real payment processor if you need actual bank payouts
  (withdrawals here are recorded, not sent to a bank).

## Project structure
```
server.js            Express app + static hosting + db.init()
db.js                PostgreSQL layer (pg / PGlite) + schema
helpers.js           balance + ledger helpers (async)
seed.js              demo data
smoke.js             end-to-end tests (npm test)
middleware/auth.js   JWT sign + guards
routes/              auth, user, campaigns, withdrawals, admin
public/              SPA frontend (html/css/js)
```
