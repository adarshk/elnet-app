# Plan: Electricity Usage Tracker App

## TL;DR
Build a full-stack app to track home electricity consumption by polling an external dashboard API, storing data in DuckDB, serving it via an Express backend, and visualizing it in a React+Redux frontend. TypeScript throughout.

## Architecture Overview

```
┌──────────────┐     ┌──────────────────┐     ┌──────────┐     ┌───────────────────────┐
│  React+RTK   │◄───►│  Express Backend  │◄───►│  DuckDB  │◄───│  Poller Service        │
│  Frontend    │     │  (API server)     │     │          │    │  (fetches upstream)    │
└──────────────┘     └──────────────────┘     └──────────┘     └───────────────────────┘
                                                                        │
                                                                        ▼
                                                               External Dashboard API
                                                               (login, live, home, etc.)
```

Three folders at `/root/elec/`:
- `backend/` — Express API server + Poller service + DuckDB
- `frontend/` — React + Redux Toolkit web app
- `crypto-tester/` — Existing crypto test code + new test suite

## Key Crypto Detail (Critical)

The encryption in `node-crypto-test.js` uses:
- **Key**: `"A29C4A3EA99E7DE9F2AE3C7D21050D26"` — 32 ASCII chars used directly as key (not hex-decoded)
- **IV**: `"D9A3DEFBD3B38144C3C7088735C601C7".toString("hex").slice(0, 16)` — `.toString("hex")` on a string is a no-op, so IV = `"D9A3DEFBD3B38144"` (first 16 chars)
- Algorithm: `aes-256-cbc`
- Input encoding: `utf8`, output encoding: `base64`

The plaintext to encrypt is the **exact JSON string with whitespace preserved** (not a minified/re-serialized version). This is critical for matching the expected test outputs.

---

## Phase 1: Crypto Module & Tests

### Step 1: Create shared crypto utility (TypeScript)
- Create `backend/src/crypto.ts` with `encrypt(plaintext: string): string` and `decrypt(ciphertext: string): string`
- Key and IV sourced from environment variables (with defaults matching the test values)
- Port the exact logic from `crypto-tester/node-crypto-test.js`

### Step 2: Write encryption test suite
- Create `crypto-tester/crypto.test.js` (or `.ts`) using a test runner (Jest or Node's built-in test runner)
- 7 test cases from `test-encrypt-decrypt-prompt.md`:
  1. Login payload → `FPAhqvGun9uyxt2WfRfOs...z1Q==`
  2. GetDashboardDetails `{"MeterID":"478"}` → `oXLjqdCNoKGT4cnWSN1WZqtCN6IvI/+E8ghLOdee7Fs=`
  3. PasswordExpired `{"UserId":479,"MeterID":"478"}` → `xbyhbS+RYHkBgbtDEbA6EOiePm4NdOvq3Ov2uGBNYFK0Sby4fJ315kvOL/YBTIPx`
  4. GetResourcesDetails → `0+ZqMfXd9pl9aNvp1km3h...5Uyy`
  5. RechargeHistory → `ZQcHDzZuka4Y9dl27i7A7J...Nw==`
  6. GetLiveUpdates `{"MeterID":478}` (number!) → `oXLjqdCNoKGT4cnWSN1WZpb7s/gMA6rM8faU8k3eNh0=`
  7. HomeData `{"MeterID":"478"}` (string!) → `oXLjqdCNoKGT4cnWSN1WZqtCN6IvI/+E8ghLOdee7Fs=`
- Each test must encrypt the **exact JSON string** (preserving whitespace, key order, types) and compare to expected base64
- Also test round-trip: decrypt(encrypt(input)) === input

**Critical**: Cases 2 vs 6 and 2 vs 7 show that `"478"` (string) vs `478` (number) produce different ciphertexts. The encrypt function takes raw strings, so the caller must produce the exact JSON.

---

## Phase 2: Backend Scaffolding

### Step 3: Initialize backend project
- `backend/package.json` with TypeScript, Express, duckdb (use `duckdb-async` or `duckdb`), node-cron, dotenv
- `backend/tsconfig.json`
- `backend/.env` with: `ENC_KEY`, `IV_KEY`, `USER_AGENT`, `UPSTREAM_API_BASE_URL`, `POLL_INTERVAL_MS`

### Step 4: DuckDB schema design
- Create `backend/src/db.ts` — initializes DuckDB, creates tables
- Tables:
  - `sites` — id, name, api_base_url, enc_key, iv_key, user_agent, created_at
  - `site_credentials` — site_id, username, password, fcm_id, input_type (cached encrypted login payload), auth_token, refresh_token, user_id, flat_id, meter_sn, logged_in_at
  - `dashboard_details` — site_id, avg_energy, avg_cost, balance, exp_recharge_days, polled_at
  - `live_updates` — site_id, supply, present_load, balance, eb, dg, sanction_eb, sanction_dg, updated_on, polled_at
  - `home_data` — site_id, device_id, meter_sn, eb_dg_status, rel_status, current_day_eb, current_day_dg, current_month_eb, current_month_dg, meter_bal, polled_at
  - `recharge_history` — site_id, serial_no, datetime, amount, status, polled_at
- DuckDB is file-based; store at `backend/data/elec.duckdb`

---

## Phase 3: Backend — Upstream API Client (Poller)

### Step 5: Upstream API client
- Create `backend/src/upstream/client.ts`
- Functions for each external endpoint:
  - `login(site)` → calls POST `/api/Dashboard/login`, stores auth token + flat_id
  - `checkPasswordExpired(site)` → POST `/api/Dashboard/PasswordExpired`
  - `getDashboardDetails(site)` → POST `/api/Dashboard/GetDashboardDetails`
  - `getLiveUpdates(site)` → POST `/api/Dashboard/GetLiveUpdates`
  - `getHomeData(site)` → POST `/api/Dashboard/HomeData`
  - `getRechargeHistory(site)` → POST `/api/Dashboard/RechargeHistory`
  - `getResourcesDetails(site)` → POST `/api/Dashboard/GetResourcesDetails`
- Each function: builds the JSON payload string, encrypts it, wraps in `{"InputType": "..."}`, POSTs with correct headers
- Headers: Content-Type, Accept, Connection, User-Agent (from env), Accept-Language, Authorization Bearer (from stored auth_token, except login)
- **Important type distinctions**: MeterID is string for some endpoints, number for others (GetLiveUpdates, GetResourcesDetails)

### Step 6: Poller service
- Create `backend/src/upstream/poller.ts`
- Uses node-cron or setInterval to poll at configurable interval
- For each site: call getDashboardDetails, getLiveUpdates, getHomeData, getRechargeHistory → write to DB
- On auth failure, re-login automatically
- Log errors, don't crash on individual endpoint failures

---

## Phase 4: Backend — Express API Server

### Step 7: Express routes
- Create `backend/src/server.ts` — Express app setup, CORS, JSON parsing
- Create `backend/src/routes/`:
  - `POST /api/login` — accepts {username, password, apiBaseUrl, encKey, ivKey, userAgent}, creates a site, calls upstream login, stores credentials, returns site info
  - `GET /api/sites` — list all configured sites
  - `GET /api/sites/:siteId/dashboard` — latest dashboard details from DB
  - `GET /api/sites/:siteId/live` — latest live updates from DB
  - `GET /api/sites/:siteId/home` — latest home data from DB
  - `GET /api/sites/:siteId/recharge-history` — recharge history from DB
  - `GET /api/sites/:siteId/consumption?start=&end=` — time-range query for consumption data (live_updates + home_data over time for charting)
  - `POST /api/sites/:siteId/refresh` — triggers immediate re-poll of all endpoints for the site, returns updated data
- Each route reads from DuckDB and returns JSON

### Step 8: Entry point
- `backend/src/index.ts` — starts Express server + starts poller for all configured sites

---

## Phase 5: Frontend

### Step 9: Initialize frontend project
- `npx create-react-app frontend --template redux-typescript` or Vite + React + RTK
- Dependencies: react, react-dom, @reduxjs/toolkit, react-redux, recharts (charting), axios

### Step 10: Redux store & slices
- `frontend/src/store/` — configure store
- Slices:
  - `siteSlice` — current site selection, list of sites
  - `dashboardSlice` — dashboard details (balance, avg energy, avg cost, exp recharge days)
  - `liveSlice` — live data (supply/EB-DG status, present load, balance, EB, DG units, updated_on)
  - `homeSlice` — home data (EBDGStatus, meter info, daily/monthly EB vs DG)
  - `rechargeSlice` — recharge history
  - `consumptionSlice` — time-series data for charts
- Async thunks for each API call

### Step 11: UI components
- `frontend/src/components/`:
  - `LoginForm` — username, password, API base URL entry
  - `SiteSelector` — dropdown to switch between sites
  - `StatusBanner` — EB vs DG status indicator (green for EB, orange/red for DG)
  - `LiveDashboard` — balance, present load, EB units, DG units, last updated time
  - `DashboardSummary` — avg energy, avg cost, exp recharge days
  - `ConsumptionChart` — Recharts line/bar chart showing EB vs DG consumption over time
  - `DailyEBDGSummary` — per-day breakdown of time on EB vs DG
  - `RechargeHistory` — table of recharge events
  - `RefreshButton` — calls POST /api/sites/:siteId/refresh
- Mobile-responsive using CSS flexbox/grid or a lightweight CSS framework (e.g., Tailwind CSS or plain responsive CSS)

### Step 12: Pages & routing
- `frontend/src/pages/`:
  - `LoginPage` — login form
  - `DashboardPage` — main page with LiveDashboard, StatusBanner, DashboardSummary, ConsumptionChart, DailyEBDGSummary, RefreshButton
  - `HistoryPage` — RechargeHistory with date filters
- Use react-router-dom for routing

---

## Phase 6: Integration & Polish

### Step 13: End-to-end wiring
- Frontend pointed at backend via proxy or env var
- Backend CORS configured for frontend origin
- Test full flow: login → poll → view data → refresh

### Step 14: Environment & config
- `backend/.env.example` with all required vars documented
- `frontend/.env` with `REACT_APP_API_URL`

---

## Relevant Files

- `crypto-tester/node-crypto-test.js` — reference encryption implementation; IV = first 16 chars of the hex string (no actual hex decode)
- `crypto-tester/crypto.test.js` — new test file with 7 test cases
- `backend/src/crypto.ts` — shared encrypt/decrypt module replicating node-crypto-test.js logic
- `backend/src/db.ts` — DuckDB initialization and schema
- `backend/src/upstream/client.ts` — external API client with per-endpoint payload builders
- `backend/src/upstream/poller.ts` — periodic polling service
- `backend/src/routes/*.ts` — Express route handlers
- `backend/src/server.ts` — Express app configuration
- `backend/src/index.ts` — entry point
- `frontend/src/store/` — Redux store and slices
- `frontend/src/components/` — UI components
- `frontend/src/pages/` — Page-level components

## Verification

1. Run crypto test suite — all 7 encrypt cases must produce exact expected base64 output; decrypt round-trip must restore original
2. Backend unit tests — crypto module, DB operations
3. Start backend, manually call `/api/login` with test credentials, verify upstream calls succeed and data lands in DuckDB
4. Start frontend, verify login flow, dashboard rendering, chart display, refresh button triggers re-poll
5. Check mobile responsiveness in browser dev tools

## Decisions

- **Database**: DuckDB (per prompt) — file-based, good for analytical queries over time-series data. Stored at `backend/data/elec.duckdb`
- **Single user, multiple sites**: No user auth on the backend API itself; sites are the unit of multi-tenancy
- **Polling interval**: Configurable via env var, default ~5 minutes
- **Test runner**: Jest (widely supported, works with both JS in crypto-tester and TS in backend)
- **Charting**: Recharts (lightweight, React-native, good for line/bar charts)
- **Frontend tooling**: Vite (faster than CRA) with React + TypeScript + Redux Toolkit template

## Further Considerations

1. **Auth on backend API**: Currently no authentication on the Express API routes. If this app is exposed beyond localhost, consider adding basic auth or API key. *Recommendation: skip for now, add if needed.*
2. **Poller error handling & retries**: If upstream API is down, the poller should back off exponentially. *Recommendation: simple retry with exponential backoff, max 3 retries per poll cycle.*
3. **Historical EB/DG time tracking**: The prompt asks for "per day, summary of EB vs DG time." The upstream API doesn't directly provide hourly EB/DG switch times — we can only track `EBDGStatus` at each poll interval. *Recommendation: store each polled EBDGStatus with timestamp, then compute approximate daily EB vs DG duration from the time-series of status changes.*
