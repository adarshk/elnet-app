# Electricity Usage Tracker App

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

Three folders:
- `backend/` — Express API server + Poller service + DuckDB
- `frontend/` — React + Redux Toolkit web app
- `crypto-tester/` — Existing crypto test code + new test suite

---

## Initial Plan

### Phase 1: Crypto Module & Tests

**Step 1: Shared crypto utility**
- Create `backend/src/crypto.ts` with `encrypt(plaintext, key, iv)` and `decrypt(ciphertext, key, iv)`
- Port exact logic from `crypto-tester/node-crypto-test.js`
- Key crypto detail: AES-256-CBC, key is 32 ASCII chars used directly, IV is first 16 chars of the IV string (`.toString("hex")` is a no-op on strings)
- Plaintext must be the **exact JSON string with whitespace preserved**

**Step 2: Encryption test suite**
- 7 test cases from `test-encrypt-decrypt-prompt.md` covering all API endpoints
- Round-trip decrypt tests
- Critical: `"MeterID": "478"` (string) vs `"MeterID": 478` (number) produce different ciphertexts

### Phase 2: Backend Scaffolding

**Step 3: Initialize backend project**
- TypeScript, Express, DuckDB, node-cron, dotenv, axios

**Step 4: DuckDB schema**
- Tables: `sites`, `site_credentials`, `dashboard_details`, `live_updates`, `home_data`, `recharge_history`
- File-based at `backend/data/elec.duckdb`

### Phase 3: Upstream API Client (Poller)

**Step 5: Upstream API client** — Functions for each external endpoint (login, PasswordExpired, GetDashboardDetails, GetLiveUpdates, HomeData, RechargeHistory, GetResourcesDetails). Each builds exact JSON payload, encrypts, wraps in `{"InputType": "..."}`, POSTs with correct headers.

**Step 6: Poller service** — Periodic polling with configurable interval, auto re-login on auth failure.

### Phase 4: Express API Server

**Step 7: Routes**
- `POST /api/login` — create site + upstream login
- `GET /api/sites` — list sites
- `GET /api/sites/:siteId/dashboard` — latest dashboard details
- `GET /api/sites/:siteId/live` — latest live updates
- `GET /api/sites/:siteId/home` — latest home data
- `GET /api/sites/:siteId/recharge-history` — recharge history
- `GET /api/sites/:siteId/consumption?start=&end=` — time-range data for charts
- `POST /api/sites/:siteId/refresh` — trigger immediate re-poll

### Phase 5: Frontend

**Step 9: Vite + React + TypeScript + Redux Toolkit**

**Step 10: Redux slices** — `siteSlice`, `dashboardSlice`, `liveSlice`, `homeSlice`, `rechargeSlice`, `consumptionSlice`

**Step 11: Components** — LoginForm, SiteSelector, StatusBanner, LiveDashboard, DashboardSummary, ConsumptionChart (Recharts), DailyEBDGSummary, RechargeHistory, RefreshButton

**Step 12: Pages** — LoginPage, DashboardPage, HistoryPage with react-router-dom

### Phase 6: Integration

- Frontend → backend via env var (`VITE_API_URL`)
- Backend CORS configured
- `.env.example` files for both

---

## What Was Built

### `crypto-tester/`

| File | Description |
|------|-------------|
| `node-crypto-test.js` | Reference AES-256-CBC encryption (pre-existing) |
| `crypto.test.js` | **15 Jest tests** — 7 encryption cases matching exact expected base64 output for each API endpoint, 2 edge-case tests (same input = same output, string vs number MeterID), 6 round-trip decrypt tests. **All passing.** |
| `package.json` | Jest dev dependency |

### `backend/`

| File | Description |
|------|-------------|
| `src/crypto.ts` | AES-256-CBC encrypt/decrypt module with configurable key/IV |
| `src/db.ts` | DuckDB initialization — 6 tables with sequences (`sites`, `site_credentials`, `dashboard_details`, `live_updates`, `home_data`, `recharge_history`) |
| `src/upstream/client.ts` | 7 upstream API functions (login, checkPasswordExpired, getDashboardDetails, getLiveUpdates, getHomeData, getRechargeHistory, getResourcesDetails) + `pollAllEndpoints()` helper |
| `src/upstream/poller.ts` | Periodic polling service — polls all sites at configurable interval, auto re-login on 401 |
| `src/routes/api.ts` | 8 Express routes (login, list sites, dashboard, live, home, recharge-history, consumption time-range, manual refresh) |
| `src/server.ts` | Express app with CORS + JSON parsing |
| `src/index.ts` | Entry point — starts Express server on port 3001 + starts poller |
| `tsconfig.json` | TypeScript configuration (ES2020, commonjs) |
| `.env` / `.env.example` | Environment variables (ENC_KEY, IV_KEY, USER_AGENT, UPSTREAM_API_BASE_URL, POLL_INTERVAL_MS, PORT) |

**Dependencies:** express, cors, dotenv, duckdb, axios, node-cron + TypeScript/types

### `frontend/`

| File | Description |
|------|-------------|
| `src/App.tsx` | Router — LoginPage → DashboardPage → HistoryPage |
| `src/main.tsx` | Redux Provider + BrowserRouter wrapper |
| `src/api.ts` | Axios instance pointing at backend |
| `src/types.ts` | Shared TypeScript interfaces (Site, DashboardDetails, LiveUpdates, HomeData, RechargeEntry, ConsumptionData, LoginRequest/Response) |
| `src/store/index.ts` | Redux store with 6 reducers |
| `src/store/hooks.ts` | Typed `useAppDispatch` / `useAppSelector` hooks |
| `src/store/slices/siteSlice.ts` | Site management — fetchSites, loginSite, setCurrentSite |
| `src/store/slices/dashboardSlice.ts` | Dashboard details async thunk |
| `src/store/slices/liveSlice.ts` | Live updates async thunk |
| `src/store/slices/homeSlice.ts` | Home data async thunk |
| `src/store/slices/rechargeSlice.ts` | Recharge history async thunk |
| `src/store/slices/consumptionSlice.ts` | Time-range consumption data async thunk |
| `src/components/LoginForm.tsx` | Login form with advanced settings (enc key, IV, user agent, FCM ID) |
| `src/components/SiteSelector.tsx` | Dropdown to switch between sites |
| `src/components/StatusBanner.tsx` | EB (green) vs DG (orange) status indicator |
| `src/components/LiveDashboard.tsx` | Balance, present load, supply, EB/DG units, updated time |
| `src/components/DashboardSummary.tsx` | Avg energy, avg cost, balance, est. recharge days |
| `src/components/ConsumptionChart.tsx` | Recharts line chart — EB vs DG consumption over time |
| `src/components/DailyEBDGSummary.tsx` | Per-day and per-month EB vs DG bar breakdown |
| `src/components/RechargeHistory.tsx` | Recharge history table with colored amounts |
| `src/components/RefreshButton.tsx` | Manual refresh trigger |
| `src/pages/LoginPage.tsx` | Login page |
| `src/pages/DashboardPage.tsx` | Main dashboard — StatusBanner + LiveDashboard + DashboardSummary + DailyEBDGSummary + ConsumptionChart |
| `src/pages/HistoryPage.tsx` | Recharge history page |
| `src/index.css` | Mobile-responsive CSS — cards, metrics grid, EB/DG bars, tables |
| `.env` | `VITE_API_URL=http://localhost:3001` |

**Dependencies:** @reduxjs/toolkit, react-redux, react-router-dom, recharts, axios

---

## How to Run

```bash
# Backend (port 3001)
cd backend
cp .env.example .env   # edit with real values
npm run dev

# Frontend (port 5173)
cd frontend
npm run dev

# Run crypto tests
cd crypto-tester
npm test
```

## Key Decisions

- **Database**: DuckDB — file-based, good for analytical queries over time-series data
- **Single user, multiple sites**: No auth on backend API; sites are the unit of multi-tenancy
- **Polling interval**: Configurable via env var, default 5 minutes
- **Charting**: Recharts (lightweight, React-native)
- **Frontend tooling**: Vite (faster than CRA)
- **Test runner**: Jest (15 tests, all passing)
