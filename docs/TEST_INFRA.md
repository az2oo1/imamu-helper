# E2E Test Suite Infrastructure & Strategy (`TEST_INFRA.md`)

## 1. Overview & Architecture

The **imamu-helper** End-to-End (E2E) testing framework provides comprehensive automated validation for all authentication flows, session persistence, user database operations, route authorization guards, and error handling across the system.

### Tech Stack
- **Test Runner**: Node.js 22 Native Test Runner (`node:test` + `node:assert`) executed via `tsx --test`
- **HTTP Client**: Native `fetch` with custom cookie jar and session/token handling helper (`tests/helpers/api-client.ts`)
- **Server Harness**: Express background server manager with readiness polling (`tests/helpers/server-runner.ts`)
- **Database Engine**: Dual PGlite WASM (embedded) + CockroachDB fallback

---

## 2. Directory Structure

```
tests/
├── helpers/
│   ├── server-runner.ts        # Spawns server.ts on port 3001 & polls health check
│   └── api-client.ts           # HTTP client wrapper with Cookie jar & Bearer token support
├── auth_tier1.test.ts          # Tier 1: Feature Coverage (Registration, Login, Reset, /api/users/me)
├── auth_tier2.test.ts          # Tier 2: Boundary & Edge Cases (Duplicates, Invalid/Expired tokens, Wrong password, PasswordHash sanitization)
├── auth_tier3.test.ts          # Tier 3: Cross-Feature & Infrastructure (Session rehydration, 401 recovery, Dual DB resilience)
└── auth_tier4.test.ts          # Tier 4: Real-World Application Scenarios (Full onboarding, Password reset journey, Guard matrix)
```

---

## 3. Test Coverage Matrix

### Tier 1: Feature Coverage (Core API Happy Paths)
- `T1.1`: `GET /api/health` -> HTTP 200 OK `{ status: "ok" }`.
- `T1.2`: `POST /api/auth/send-code` -> HTTP 200 OK + verification code (`devCode`).
- `T1.3`: `POST /api/auth/register` -> Registration with email (`studentEmail`/`googleEmail`), username, password -> HTTP 200 OK + JWT token + user object + cookie.
- `T1.4`: `POST /api/auth/login` via Email -> HTTP 200 OK + token + cookie.
- `T1.5`: `POST /api/auth/login` via Username -> HTTP 200 OK + token + cookie.
- `T1.6`: `GET /api/users/me` -> HTTP 200 OK user profile details.
- `T1.7`: `POST /api/users/me` -> Profile update (phone, major, GPA, finishedHours).
- `T1.8`: `POST /api/auth/reset-password` -> Password reset flow validation.
- `T1.9`: `GET /api/resources` -> Protected resource fetching.

### Tier 2: Boundary & Edge Cases
- `T2.1`: Missing required registration fields -> HTTP 400 Bad Request.
- `T2.2`: Invalid / expired verification codes -> HTTP 400 Bad Request.
- `T2.3`: Duplicate username and email registration rejection -> HTTP 400 Bad Request.
- `T2.4`: Incorrect password login -> HTTP 401 Unauthorized.
- `T2.5`: Non-existent user login -> HTTP 401 Unauthorized.
- `T2.6`: Unauthenticated request guards on protected endpoints -> HTTP 401 Unauthorized.
- `T2.7`: Tampered or invalid JWT tokens -> HTTP 401 Unauthorized.
- `T2.8`: Sensitive field sanitization (`passwordHash` not leaked in user API responses).
- `T2.9`: Email and username case sensitivity & normalization (leading `@` trimming, lowercase email).

### Tier 3: Cross-Feature & Infrastructure Integrations
- `T3.1`: Session cookie & token rehydration logic.
- `T3.2`: 401 recovery without redirect loops.
- `T3.3`: Dual database resilience & cross-app account sync (`"User"` table fallback).
- `T3.4`: End-to-end password reset cycle (Old password invalidation -> New password login validation).
- `T3.5`: Username availability checking (`GET /api/check-username`).

### Tier 4: Real-World Scenarios
- `T4.1`: Full student registration & onboarding lifecycle (Send code -> Register -> Profile update -> Resource access -> Logout).
- `T4.2`: Complete account recovery journey (Login failure -> Code request -> Wrong code error -> Successful reset -> Login success).
- `T4.3`: Concurrent session rehydration & parallel requests handling.
- `T4.4`: Protected route auth guards matrix (`/profile`, `/admin/*`, `/resources`).

---

## 4. Execution Commands

```bash
# Run all E2E tests
npx tsx --test tests/**/*.test.ts

# Run using npm scripts
npm test
npm run test:tier1
npm run test:tier2
npm run test:tier3
npm run test:tier4
```
