# FigmaLint Backend -- Comprehensive API Test Plan

**Version**: 1.0
**Date**: 2026-03-13
**Scope**: All 6 routes (7 endpoints) in `backend/src/routes/`
**Stack**: Hono + better-sqlite3 + Anthropic SDK

---

## Table of Contents

1. [Test Infrastructure Recommendations](#1-test-infrastructure-recommendations)
2. [Endpoint Inventory](#2-endpoint-inventory)
3. [Test Cases by Endpoint](#3-test-cases-by-endpoint)
   - [GET /api/health](#31-get-apihealth)
   - [POST /api/analyze](#32-post-apianalyze)
   - [POST /api/chat](#33-post-apichat)
   - [POST /api/stream/:sessionId](#34-post-apistreamssessionid-sse)
   - [GET /api/session/:id](#35-get-apisessionid)
   - [GET /api/session/:id/refero](#36-get-apisessionidrefero)
   - [POST /api/analyze-flow](#37-post-apianalyze-flow)
4. [Cross-Cutting Test Cases](#4-cross-cutting-test-cases)
   - [CORS](#41-cors)
   - [Concurrency](#42-concurrency)
   - [Performance](#43-performance)
   - [Security](#44-security)
5. [Example Test Code](#5-example-test-code-5-most-critical-tests)
6. [Priority Matrix](#6-priority-matrix)

---

## 1. Test Infrastructure Recommendations

### Framework: Vitest + Hono Test Client

**Why Vitest** over Jest:
- Native ESM support (the project is `"type": "module"`)
- Compatible with the `ES2022` target in tsconfig
- Fast execution via esbuild transforms
- Built-in mocking with `vi.mock()` / `vi.fn()`

**Why Hono's built-in `app.request()`** over supertest:
- Zero extra dependency; Hono ships a test-friendly `.request()` method
- Works in-process (no actual TCP listener needed)
- SSE testing can be done by reading the response body as a ReadableStream

### Mock Strategy

| Dependency | Mock Method |
|---|---|
| `@anthropic-ai/sdk` | `vi.mock()` the entire module; return canned responses |
| `better-sqlite3` | Use a real in-memory SQLite (`:memory:`) for true DB coverage |
| `@modelcontextprotocol/sdk` (Refero MCP) | `vi.mock()` the `refero.ts` service |
| `nanoid` | `vi.mock()` to return deterministic IDs |

### Required dev dependencies to add

```
vitest @vitest/coverage-v8
```

### Vitest config (`backend/vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/routes/**', 'src/services/**', 'src/db/**'],
    },
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

---

## 2. Endpoint Inventory

| # | Method | Path | Route File | Depends On |
|---|--------|------|-----------|-----------|
| 1 | GET | `/api/health` | `health.ts` | Nothing |
| 2 | POST | `/api/analyze` | `analyze.ts` | `analyzer.ts` -> `claude.ts`, `refero.ts`, `session.ts`, `design-knowledge.ts` |
| 3 | POST | `/api/chat` | `chat.ts` | `claude.ts` (streamChat), `session.ts` |
| 4 | POST | `/api/stream/:sessionId` | `stream.ts` | `claude.ts` (streamChat), `session.ts`, SSE via `hono/streaming` |
| 5 | GET | `/api/session/:id` | `session.ts` | `session.ts` (loadSession) |
| 6 | GET | `/api/session/:id/refero` | `session.ts` | `session.ts` (loadSession) |
| 7 | POST | `/api/analyze-flow` | `flow.ts` | `flow-analyzer.ts` -> `claude.ts` |

---

## 3. Test Cases by Endpoint

### 3.1 GET /api/health

| ID | Category | Description | Input | Expected | Priority |
|---|----------|-------------|-------|----------|----------|
| H-01 | Happy path | Returns health status | `GET /api/health` | `200`, body `{ status: "ok", timestamp: <ISO>, version: "1.0.0" }` | P1 |
| H-02 | Validation | Timestamp is valid ISO 8601 | `GET /api/health` | `timestamp` matches ISO pattern | P2 |
| H-03 | Method guard | POST to health endpoint | `POST /api/health` | `404` or `405` (Hono default) | P3 |

---

### 3.2 POST /api/analyze

#### Happy Path

| ID | Category | Description | Input | Expected | Priority |
|---|----------|-------------|-------|----------|----------|
| A-01 | Happy path | Full valid analysis (quick mode) | Valid `AnalyzeRequest` with `mode: "quick"` | `200`, body has `sessionId`, `pageType`, `lintResult`, `aiReview`, `designHealthScore` (0-100) | P0 |
| A-02 | Happy path | Full valid analysis (deep mode) | Valid `AnalyzeRequest` with `mode: "deep"` | `200`, same as A-01 plus `referoComparison` present | P0 |
| A-03 | Happy path | Re-analysis with existing sessionId | Valid request + `sessionId` of prior session | `200`, same sessionId returned, `score_initial` unchanged in DB | P1 |
| A-04 | Happy path | Zero lint errors | `lintResult.summary.totalErrors: 0`, empty `errors` array | `200`, `designHealthScore` should be 100 | P1 |
| A-05 | Happy path | `designSystemSources` present when knowledge found | Request for "Button" component | `200`, body includes `designSystemSources` array | P2 |

#### Input Validation

| ID | Category | Description | Input | Expected | Priority |
|---|----------|-------------|-------|----------|----------|
| A-10 | Validation | Missing body entirely | Empty POST | `400`, `{ error: "Invalid JSON body" }` | P0 |
| A-11 | Validation | Non-JSON body (plain text) | `Content-Type: text/plain`, body `"hello"` | `400`, `{ error: "Invalid JSON body" }` | P1 |
| A-12 | Validation | Missing `screenshot` | Body without `screenshot` field | `400`, `{ error: "screenshot is required..." }` | P0 |
| A-13 | Validation | `screenshot` is number, not string | `{ screenshot: 12345, ... }` | `400`, error about screenshot type | P0 |
| A-14 | Validation | Missing `lintResult` | Body with screenshot but no lintResult | `400`, `{ error: "lintResult is required" }` | P0 |
| A-15 | Validation | `lintResult` is string, not object | `{ lintResult: "not an object" }` | `400`, `{ error: "lintResult is required" }` | P1 |
| A-16 | Validation | Missing `extractedData` | Body missing extractedData | `400`, `{ error: "extractedData is required" }` | P0 |
| A-17 | Validation | Missing `extractedData.componentName` | `extractedData: {}` | `400`, `{ error: "extractedData.componentName is required" }` | P0 |
| A-18 | Validation | `extractedData.componentName` is empty string | `componentName: ""` | `400` (empty string is falsy) | P1 |
| A-19 | Validation | `sessionId` references nonexistent session | `sessionId: "nonexistent123"` | `404`, `{ error: "Session not found: nonexistent123" }` | P1 |
| A-20 | Validation | Body is an array, not object | `POST` with `[1, 2, 3]` | `400`, `{ error: "Request body must be a JSON object" }` | P2 |
| A-21 | Validation | Body is `null` | `POST` with `null` | `400` | P2 |

#### Edge Cases

| ID | Category | Description | Input | Expected | Priority |
|---|----------|-------------|-------|----------|----------|
| A-30 | Edge case | Very large screenshot (10MB base64) | 10MB base64 string in `screenshot` | Either processes successfully or returns meaningful error; no crash | P1 |
| A-31 | Edge case | Screenshot is valid base64 but not a real image | Random base64 gibberish | `200` or graceful error from Claude; no unhandled exception | P2 |
| A-32 | Edge case | `lintResult.errors` is empty array | `errors: [], summary.totalErrors: 0` | `200`, score = 100 | P1 |
| A-33 | Edge case | `lintResult.summary.byType` is empty object | `byType: {}` | `200`, lint summary text has all zeros | P2 |
| A-34 | Edge case | Component name with special chars | `componentName: "<script>alert('xss')</script>"` | Processes without execution; stored safely | P1 |
| A-35 | Edge case | `mode` is missing from request | No `mode` field | Falls through to default behavior; verify no crash | P2 |
| A-36 | Edge case | `mode` is invalid value | `mode: "turbo"` | No validation on mode currently -- should still work (no Refero in non-deep) | P3 |
| A-37 | Edge case | Extremely long component name (10000 chars) | 10000 char string | Processes without error or truncates gracefully | P2 |
| A-38 | Edge case | `lintResult.summary.totalNodes` is 0 | `totalNodes: 0` | No division by zero; Math.max guards this | P1 |

#### Error Handling

| ID | Category | Description | Setup | Expected | Priority |
|---|----------|-------------|-------|----------|----------|
| A-50 | Error | Claude API returns error (auth failure) | Mock `detectPageType` to throw | `500`, `{ error: <message> }` | P0 |
| A-51 | Error | Claude API timeout | Mock with delayed rejection | `500`, error message returned | P1 |
| A-52 | Error | Claude returns empty/unparseable response | Mock `generateReview` to throw "No JSON in review response" | `500`, error propagated | P1 |
| A-53 | Error | Refero MCP timeout (deep mode) | Mock `runReferoComparison` to hang | Should eventually timeout; response or error | P2 |
| A-54 | Error | Database write fails | Mock `saveAnalysisResult` to throw | `500` | P2 |
| A-55 | Error | `ANTHROPIC_API_KEY` env var missing | Unset env var | Error when constructing client | P1 |

---

### 3.3 POST /api/chat

#### Happy Path

| ID | Category | Description | Input | Expected | Priority |
|---|----------|-------------|-------|----------|----------|
| C-01 | Happy path | Valid chat message | `{ sessionId: <valid>, message: "How can I fix the spacing?" }` | `200`, `{ message: <AI response>, sessionId }` | P0 |
| C-02 | Happy path | Message is saved to conversation | After C-01, load session | Conversation has user + assistant messages | P1 |
| C-03 | Happy path | Multiple messages build conversation | Send 3 sequential messages | All 6 entries in conversation (3 user + 3 assistant) | P1 |

#### Input Validation

| ID | Category | Description | Input | Expected | Priority |
|---|----------|-------------|-------|----------|----------|
| C-10 | Validation | Missing body | Empty POST | `400`, `{ error: "Invalid JSON body" }` | P0 |
| C-11 | Validation | Missing `sessionId` | `{ message: "hello" }` | `400`, `{ error: "sessionId is required" }` | P0 |
| C-12 | Validation | `sessionId` is number | `{ sessionId: 123, message: "hello" }` | `400` | P1 |
| C-13 | Validation | Missing `message` | `{ sessionId: "abc" }` | `400`, `{ error: "message is required..." }` | P0 |
| C-14 | Validation | `message` is empty string | `{ sessionId: "abc", message: "" }` | `400` | P0 |
| C-15 | Validation | `message` is whitespace only | `{ sessionId: "abc", message: "   " }` | `400` (trim check) | P1 |
| C-16 | Validation | Session does not exist | `{ sessionId: "nonexistent", message: "hi" }` | `404`, `{ error: "Session not found" }` | P0 |

#### Error Handling

| ID | Category | Description | Setup | Expected | Priority |
|---|----------|-------------|-------|----------|----------|
| C-30 | Error | Claude streaming fails mid-response | Mock `streamChat` to yield 2 chunks then throw | `500`, `{ error: <message> }` | P1 |
| C-31 | Error | Claude returns empty stream | Mock `streamChat` to yield nothing | `200`, `{ message: "", sessionId }` (empty response saved) | P2 |

---

### 3.4 POST /api/stream/:sessionId (SSE)

#### Happy Path

| ID | Category | Description | Input | Expected | Priority |
|---|----------|-------------|-------|----------|----------|
| S-01 | Happy path | Valid SSE stream | Valid sessionId + message | SSE response with `event: chunk` messages, ends with `event: done` | P0 |
| S-02 | Happy path | Chunk data is valid JSON | Parse each `data:` line | Each chunk has `{ text: <string> }` | P1 |
| S-03 | Happy path | Done event includes sessionId | Parse final event | `{ sessionId: <id> }` | P1 |
| S-04 | Happy path | Full response saved to conversation | After stream completes, load session | User + assistant messages present | P1 |

#### Input Validation

| ID | Category | Description | Input | Expected | Priority |
|---|----------|-------------|-------|----------|----------|
| S-10 | Validation | Invalid JSON body | Malformed body | `400`, `{ error: "Invalid JSON body" }` | P0 |
| S-11 | Validation | Missing `message` | `{}` | `400`, `{ error: "message is required..." }` | P0 |
| S-12 | Validation | Empty message | `{ message: "" }` | `400` | P1 |
| S-13 | Validation | Whitespace-only message | `{ message: "   " }` | `400` | P1 |
| S-14 | Validation | Nonexistent sessionId in URL | `/api/stream/nonexistent` | `404`, `{ error: "Session not found" }` | P0 |

#### SSE-Specific

| ID | Category | Description | Setup | Expected | Priority |
|---|----------|-------------|-------|----------|----------|
| S-20 | SSE | Error mid-stream | Mock `streamChat` to throw after 2 chunks | SSE `event: error` emitted with error message | P0 |
| S-21 | SSE | Client disconnect during streaming | Abort request mid-stream | Server-side: no crash; partial response may or may not be saved | P1 |
| S-22 | SSE | Content-Type header | Valid request | Response `Content-Type: text/event-stream` | P1 |
| S-23 | SSE | Very long AI response (100+ chunks) | Mock `streamChat` to yield 150 chunks | All chunks delivered; done event sent; full response saved | P2 |

---

### 3.5 GET /api/session/:id

#### Happy Path

| ID | Category | Description | Input | Expected | Priority |
|---|----------|-------------|-------|----------|----------|
| SE-01 | Happy path | Retrieve existing session | Valid session ID after analysis | `200`, body has all expected fields (`id`, `createdAt`, `nodeId`, `scoreInitial`, `lintResult`, `aiReview`, `conversationLength`) | P0 |
| SE-02 | Happy path | Fresh session (no analysis yet) | Session just created, no analysis | `200`, nullable fields are null, `conversationLength: 0` | P1 |
| SE-03 | Happy path | Session with refero data | Session after deep analysis | `200`, `referoData` is parsed JSON object | P2 |

#### Validation & Errors

| ID | Category | Description | Input | Expected | Priority |
|---|----------|-------------|-------|----------|----------|
| SE-10 | Validation | Nonexistent session ID | `GET /api/session/nope` | `404`, `{ error: "Session not found" }` | P0 |
| SE-11 | Edge case | Session ID with special characters | `GET /api/session/ab%20cd` | `404` (no such session) or proper handling | P2 |
| SE-12 | Edge case | Very long session ID (1000 chars) | Long string | `404`, no crash | P3 |

#### Data Integrity

| ID | Category | Description | Input | Expected | Priority |
|---|----------|-------------|-------|----------|----------|
| SE-20 | Integrity | JSON fields are properly parsed | Session with stored JSON | `lintResult`, `aiReview`, `referoData` are objects, not strings | P1 |
| SE-21 | Integrity | Corrupt JSON in DB | Manually insert bad JSON into `ai_review` | Verify error handling (currently would throw `JSON.parse` error) | P2 |
| SE-22 | Integrity | `conversationLength` matches actual count | Session with 5 messages | `conversationLength: 5` | P1 |

---

### 3.6 GET /api/session/:id/refero

| ID | Category | Description | Input | Expected | Priority |
|---|----------|-------------|-------|----------|----------|
| R-01 | Happy path | Refero data ready | Session with `refero_data` populated | `200`, `{ ready: true, data: {...} }` | P0 |
| R-02 | Happy path | Refero data not ready | Session without `refero_data` | `200`, `{ ready: false }` | P0 |
| R-03 | Validation | Nonexistent session | Invalid ID | `404`, `{ error: "Session not found" }` | P1 |
| R-04 | Polling | Multiple rapid polls | Poll 10 times in 1 second | All return consistent results; no errors | P2 |

---

### 3.7 POST /api/analyze-flow

#### Happy Path

| ID | Category | Description | Input | Expected | Priority |
|---|----------|-------------|-------|----------|----------|
| F-01 | Happy path | Valid flow analysis | Valid `FlowAnalyzeRequest` with 3 frames, edges, screenshots | `200`, `{ success: true, flowAnalysis: {...} }` with all expected sub-fields | P0 |
| F-02 | Happy path | Flow with no edges | Frames but empty `edges` array | `200`, analysis runs with disconnected frames | P2 |
| F-03 | Happy path | Flow with no graph issues | Empty `graphIssues` array | `200` | P2 |

#### Input Validation

| ID | Category | Description | Input | Expected | Priority |
|---|----------|-------------|-------|----------|----------|
| F-10 | Validation | Missing body | Empty POST | `400`, `{ error: "Invalid JSON body" }` | P0 |
| F-11 | Validation | Missing `frames` | Body without `frames` | `400`, `{ error: "Missing frames array" }` | P0 |
| F-12 | Validation | `frames` is empty array | `frames: []` | `400`, `{ error: "Missing frames array" }` | P0 |
| F-13 | Validation | `frames` is not array | `frames: "not array"` | `400` | P1 |
| F-14 | Validation | Missing `screenshots` | Body without screenshots | `400`, `{ error: "Missing screenshots" }` | P0 |
| F-15 | Validation | `screenshots` is empty object | `screenshots: {}` | `400`, `{ error: "Missing screenshots" }` | P1 |
| F-16 | Validation | Non-JSON body | Plain text | `400` | P1 |

#### Edge Cases

| ID | Category | Description | Input | Expected | Priority |
|---|----------|-------------|-------|----------|----------|
| F-30 | Edge case | Many frames (50+) | 50 frames with screenshots | Processes (large payload); no timeout | P2 |
| F-31 | Edge case | Frame ID in screenshots not matching any frame | Extra screenshot keys | Ignored gracefully | P3 |
| F-32 | Edge case | Duplicate frame IDs | Two frames with same `id` | No crash; last one wins in map | P3 |

#### Error Handling

| ID | Category | Description | Setup | Expected | Priority |
|---|----------|-------------|-------|----------|----------|
| F-40 | Error | Claude API failure | Mock to throw | `500`, `{ error: <message> }` | P1 |
| F-41 | Error | Claude returns unparseable JSON | Mock response with no JSON match | `200`, `{ success: true, flowAnalysis: null }` (analyzeFlow returns null) | P2 |
| F-42 | Error | Missing `ANTHROPIC_API_KEY` | Unset env var | `200`, `{ success: true, flowAnalysis: null }` (early return in analyzeFlow) | P2 |

---

## 4. Cross-Cutting Test Cases

### 4.1 CORS

| ID | Category | Description | Input | Expected | Priority |
|---|----------|-------------|-------|----------|----------|
| X-01 | CORS | Request from allowed origin | `Origin: https://api.figmalint.labpics.com` | `Access-Control-Allow-Origin: https://api.figmalint.labpics.com` | P0 |
| X-02 | CORS | Request from localhost | `Origin: http://localhost:3000` | `Access-Control-Allow-Origin: http://localhost:3000` | P0 |
| X-03 | CORS | Figma iframe (null origin) | `Origin: null` | `Access-Control-Allow-Origin: null` | P0 |
| X-04 | CORS | Request with no origin header | No `Origin` header | `Access-Control-Allow-Origin: null` (the CORS handler returns `'null'` for falsy origin) | P1 |
| X-05 | CORS | Request from disallowed origin | `Origin: https://evil.com` | `Access-Control-Allow-Origin: null` (not reflected) | P0 |
| X-06 | CORS | Preflight OPTIONS request | `OPTIONS /api/analyze` with proper headers | `200` with allowed methods `GET, POST, OPTIONS` | P1 |
| X-07 | CORS | Disallowed method (PUT) | `PUT /api/analyze` | No CORS pass-through for PUT | P2 |

### 4.2 Concurrency

| ID | Category | Description | Setup | Expected | Priority |
|---|----------|-------------|-------|----------|----------|
| X-10 | Concurrency | Parallel analyze requests (different sessions) | 5 simultaneous POST /api/analyze | All return 200 with unique sessionIds | P1 |
| X-11 | Concurrency | Parallel chat messages to same session | 3 rapid POSTs to /api/chat with same sessionId | All succeed; conversation order may interleave but no crash | P1 |
| X-12 | Concurrency | Read session while analysis writes | GET /api/session/:id during ongoing analyze | Returns current state (possibly partial); no SQLite lock error (WAL mode) | P2 |
| X-13 | Concurrency | Parallel stream connections to same session | 2 SSE streams to same session | Both deliver responses; conversation has all entries | P2 |
| X-14 | Concurrency | Rapid refero polling | 20 GET /api/session/:id/refero in 1 second | All return 200; no DB contention | P2 |

### 4.3 Performance

| ID | Category | Description | Target | Priority |
|---|----------|-------------|--------|----------|
| X-20 | Performance | Health endpoint latency | < 10ms p95 | P1 |
| X-21 | Performance | Session GET latency | < 50ms p95 (DB read only) | P1 |
| X-22 | Performance | Refero polling latency | < 50ms p95 | P2 |
| X-23 | Performance | Analyze end-to-end (mocked Claude) | < 200ms p95 (excluding AI call) | P2 |
| X-24 | Performance | Large payload handling (10MB screenshot) | Does not OOM the process; responds within 30s | P2 |

### 4.4 Security

| ID | Category | Description | Input | Expected | Priority |
|---|----------|-------------|-------|----------|----------|
| X-30 | Security | SQL injection in session ID | `GET /api/session/' OR 1=1 --` | `404` (parameterized query); no data leak | P0 |
| X-31 | Security | SQL injection in chat sessionId | `{ sessionId: "' OR 1=1 --", message: "hi" }` | `404` (parameterized query) | P0 |
| X-32 | Security | XSS in componentName stored in DB | `componentName: "<img src=x onerror=alert(1)>"` | Stored as-is in DB; returned as JSON (not rendered); no execution path | P1 |
| X-33 | Security | XSS in chat message | `message: "<script>alert('xss')</script>"` | Stored in conversation; returned as JSON string; no execution | P1 |
| X-34 | Security | Prototype pollution in request body | `{ "__proto__": { "polluted": true } }` | No object prototype modification | P1 |
| X-35 | Security | Oversized request body (50MB) | 50MB JSON payload | Server rejects or handles without crash | P1 |
| X-36 | Security | `updateSession` only allows whitelisted columns | Attempt to set `id` or `created_at` via update | `ALLOWED_COLUMNS` set blocks non-listed fields | P1 |
| X-37 | Security | Session ID enumeration | Sequential/predictable IDs vs nanoid | Verify nanoid(12) produces non-sequential, non-guessable IDs | P2 |
| X-38 | Security | Path traversal in session ID | `GET /api/session/../../etc/passwd` | `404`; no file system access | P1 |
| X-39 | Security | Anthropic API key not leaked in error responses | Trigger auth error | Error message does not contain the key value | P0 |
| X-40 | Security | updateSession column injection | Key with SQL: `"id = 'pwn'; --"` | Filtered out by `ALLOWED_COLUMNS` set check | P0 |

---

## 5. Example Test Code (5 Most Critical Tests)

### Setup file: `backend/src/test/setup.ts`

```typescript
import { vi, beforeAll, afterAll, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Use in-memory SQLite for tests
let testDb: Database.Database;

beforeAll(() => {
  testDb = new Database(':memory:');
  testDb.pragma('journal_mode = WAL');
  const schema = readFileSync(join(__dirname, '../db/schema.sql'), 'utf-8');
  testDb.exec(schema);
});

afterEach(() => {
  // Clean sessions between tests
  testDb.exec('DELETE FROM sessions');
});

afterAll(() => {
  testDb.close();
});

export { testDb };
```

### Test file: `backend/src/routes/__tests__/critical.test.ts`

```typescript
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

// ---------------------------------------------------------------------------
// Mocks — must be declared before any import that touches the mocked modules
// ---------------------------------------------------------------------------

// Mock nanoid to produce deterministic session IDs
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-sess-001'),
}));

// Mock the Claude service so no real API calls are made
vi.mock('../../services/claude.js', () => ({
  detectPageType: vi.fn(async () => 'component'),
  generateReview: vi.fn(async () => ({
    visualHierarchy: { rating: 'pass', evidence: ['Good'], recommendation: null },
    statesCoverage: { rating: 'pass', evidence: [], recommendation: null, missingStates: [] },
    platformAlignment: { rating: 'pass', evidence: [], recommendation: null, detectedPlatform: 'web' },
    colorHarmony: { rating: 'pass', evidence: [], recommendation: null },
    visualBalance: { rating: 'pass', evidence: [], recommendation: null },
    microcopyQuality: { rating: 'pass', evidence: [], recommendation: null },
    cognitiveLoad: { rating: 'pass', evidence: [], recommendation: null },
    recommendations: [],
    summary: 'Looks great.',
  })),
  streamChat: vi.fn(async function* () {
    yield 'Hello ';
    yield 'from ';
    yield 'AI.';
  }),
}));

// Mock design-knowledge to avoid MCP calls
vi.mock('../../services/design-knowledge.js', () => ({
  fetchDesignSystemContext: vi.fn(async () => null),
}));

// Mock refero to avoid MCP calls
vi.mock('../../services/refero.js', () => ({
  runReferoComparison: vi.fn(async () => null),
}));

// ---------------------------------------------------------------------------
// Build the Hono app exactly as in index.ts (minus the TCP listener)
// ---------------------------------------------------------------------------
import health from '../health.js';
import analyze from '../analyze.js';
import chat from '../chat.js';
import stream from '../stream.js';
import session from '../session.js';
import flow from '../flow.js';

function buildApp(): Hono {
  const app = new Hono();
  app.use(
    '*',
    cors({
      origin: (origin) => {
        if (!origin || origin === 'null') return 'null';
        const allowed = ['https://api.figmalint.labpics.com', 'http://localhost:3000'];
        return allowed.includes(origin) ? origin : 'null';
      },
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type'],
    })
  );
  app.route('/api', health);
  app.route('/api', analyze);
  app.route('/api', chat);
  app.route('/api', stream);
  app.route('/api', session);
  app.route('/api', flow);
  return app;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid AnalyzeRequest body */
function validAnalyzeBody() {
  return {
    screenshot: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    lintResult: {
      summary: { totalErrors: 2, byType: { fill: 1, text: 1 }, totalNodes: 10, nodesWithErrors: 2 },
      errors: [
        { nodeId: 'n1', nodeName: 'Button', errorType: 'fill', message: 'Non-token fill', value: '#FF0000' },
        { nodeId: 'n2', nodeName: 'Label', errorType: 'text', message: 'Non-token text', value: '14px' },
      ],
    },
    extractedData: {
      componentName: 'PrimaryButton',
      metadata: { nodeId: 'node-1', nodeType: 'COMPONENT', width: 200, height: 48, hasAutoLayout: true, childCount: 2 },
    },
    mode: 'quick' as const,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST 1 (A-01): POST /api/analyze — happy path, quick mode
// Priority: P0 — This is the primary endpoint of the entire product.
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/analyze', () => {
  const app = buildApp();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('A-01: returns valid analysis result for quick mode', async () => {
    const res = await app.request('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validAnalyzeBody()),
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    // Structure assertions
    expect(body).toHaveProperty('sessionId');
    expect(typeof body.sessionId).toBe('string');
    expect(body).toHaveProperty('pageType', 'component');
    expect(body).toHaveProperty('lintResult');
    expect(body.lintResult.summary.totalErrors).toBe(2);
    expect(body).toHaveProperty('aiReview');
    expect(body.aiReview).toHaveProperty('visualHierarchy');
    expect(body.aiReview).toHaveProperty('summary');
    expect(body).toHaveProperty('designHealthScore');
    expect(body.designHealthScore).toBeGreaterThanOrEqual(0);
    expect(body.designHealthScore).toBeLessThanOrEqual(100);

    // Quick mode should NOT include referoComparison synchronously
    // (it fires in background)
    // The response may or may not have it, but no crash.
  });

  // ═════════════════════════════════════════════════════════════════════════
  // TEST 2 (A-12): POST /api/analyze — missing screenshot field
  // Priority: P0 — Input validation prevents garbage-in / garbage-out.
  // ═════════════════════════════════════════════════════════════════════════
  it('A-12: rejects request with missing screenshot', async () => {
    const body = validAnalyzeBody();
    const { screenshot, ...noScreenshot } = body;

    const res = await app.request('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noScreenshot),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/screenshot is required/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TEST 3 (X-30): SQL injection in session ID
// Priority: P0 — SQLite parameterized queries must prevent injection.
// ═══════════════════════════════════════════════════════════════════════════
describe('Security: SQL injection', () => {
  const app = buildApp();

  it('X-30: SQL injection in GET /api/session/:id is neutralized', async () => {
    const maliciousId = "' OR 1=1; DROP TABLE sessions; --";
    const res = await app.request(`/api/session/${encodeURIComponent(maliciousId)}`, {
      method: 'GET',
    });

    // Should simply not find the session — parameterized query treats it as a literal
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Session not found');
  });

  it('X-31: SQL injection in POST /api/chat sessionId is neutralized', async () => {
    const res = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: "'; DROP TABLE sessions; --",
        message: 'hi',
      }),
    });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Session not found');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TEST 4 (X-05): CORS blocks disallowed origins
// Priority: P0 — Prevents unauthorized cross-origin access.
// ═══════════════════════════════════════════════════════════════════════════
describe('CORS policy', () => {
  const app = buildApp();

  it('X-01: allows requests from the production domain', async () => {
    const res = await app.request('/api/health', {
      method: 'GET',
      headers: { Origin: 'https://api.figmalint.labpics.com' },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://api.figmalint.labpics.com'
    );
  });

  it('X-03: allows Figma iframe null origin', async () => {
    const res = await app.request('/api/health', {
      method: 'GET',
      headers: { Origin: 'null' },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('null');
  });

  it('X-05: blocks requests from evil.com', async () => {
    const res = await app.request('/api/health', {
      method: 'GET',
      headers: { Origin: 'https://evil.com' },
    });

    // The request still succeeds (CORS is enforced by browsers),
    // but the Allow-Origin header should NOT reflect evil.com.
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('null');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TEST 5 (S-20): SSE error mid-stream emits error event
// Priority: P0 — Clients must handle streaming errors gracefully.
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/stream/:sessionId (SSE)', () => {
  const app = buildApp();

  it('S-20: emits SSE error event when Claude throws mid-stream', async () => {
    // Override the streamChat mock to fail after 2 chunks
    const { streamChat } = await import('../../services/claude.js');
    (streamChat as ReturnType<typeof vi.fn>).mockImplementation(async function* () {
      yield 'chunk1 ';
      yield 'chunk2 ';
      throw new Error('Claude API overloaded');
    });

    // First, create a session so the stream endpoint can find it
    // (Use the analyze endpoint to create one via the mocked flow)
    const analyzeRes = await app.request('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validAnalyzeBody()),
    });
    const { sessionId } = await analyzeRes.json();

    const res = await app.request(`/api/stream/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Fix the contrast issue' }),
    });

    // Read the SSE stream body
    const text = await res.text();

    // Should contain chunk events followed by an error event
    expect(text).toContain('event: chunk');
    expect(text).toContain('event: error');
    expect(text).toContain('Claude API overloaded');
    // Should NOT contain a done event
    expect(text).not.toContain('event: done');
  });
});
```

---

## 6. Priority Matrix

### P0 -- Must-have before any deployment (17 tests)

| IDs | Area |
|-----|------|
| A-01, A-02 | Analyze happy path (core product flow) |
| A-10, A-12, A-14, A-16, A-17 | Analyze input validation |
| A-50 | Analyze error handling (Claude failure) |
| C-01, C-10, C-13, C-14, C-16 | Chat validation and happy path |
| S-01, S-14, S-20 | SSE happy path and error handling |
| X-01, X-03, X-05 | CORS (Figma iframe, allowed, blocked origins) |
| X-30, X-31, X-39, X-40 | SQL injection and API key leak prevention |
| SE-01, SE-10 | Session retrieval |
| F-01, F-10, F-11, F-14 | Flow analysis basics |
| H-01 | Health check |

### P1 -- Required for production readiness (28 tests)

| IDs | Area |
|-----|------|
| A-03, A-04, A-11, A-13, A-15, A-18, A-19, A-30, A-34, A-38 | Analyze edge cases and deeper validation |
| A-51, A-52, A-55 | Analyze error scenarios |
| C-02, C-03, C-12, C-15, C-30 | Chat conversation integrity |
| S-04, S-11, S-21, S-22 | SSE completeness |
| SE-20, SE-22 | Session data integrity |
| X-06, X-10, X-11, X-32, X-33, X-34, X-35, X-36, X-38 | Security and concurrency |
| F-12, F-13, F-15, F-16, F-40 | Flow validation |
| X-20, X-21 | Performance baselines |

### P2 -- Should-have for confidence (22 tests)

| IDs | Area |
|-----|------|
| A-05, A-20, A-21, A-31, A-33, A-35, A-37 | Analyze edge coverage |
| A-53, A-54 | Analyze rare failures |
| C-31 | Chat edge case |
| S-02, S-03, S-13, S-23 | SSE detail validation |
| SE-03, SE-11, SE-21 | Session edge cases |
| R-01, R-02, R-04 | Refero polling |
| X-12, X-13, X-14, X-22, X-23, X-24, X-37 | Concurrency and performance |
| F-02, F-03, F-30, F-41, F-42 | Flow edge cases |

### P3 -- Nice-to-have (6 tests)

| IDs | Area |
|-----|------|
| H-03, A-36, SE-12, F-31, F-32, X-07 | Method guards, invalid mode, degenerate inputs |

---

## Summary

| Metric | Value |
|--------|-------|
| **Total test cases** | 107 |
| **Endpoints covered** | 7/7 (100%) |
| **P0 (critical)** | 34 |
| **P1 (production)** | 38 |
| **P2 (confidence)** | 29 |
| **P3 (nice-to-have)** | 6 |
| **Categories covered** | Happy path, validation, edge cases, error handling, security, concurrency, SSE, CORS, performance |
| **Recommended framework** | vitest + hono `app.request()` + in-memory SQLite |
| **Estimated implementation** | 2-3 days for P0+P1 |

### Identified Risks (from code review)

1. **No request body size limit**: The Hono app has no `bodyLimit` middleware. A 50MB+ payload could exhaust memory. Recommend adding `hono/body-limit` middleware.

2. **No authentication/authorization**: All endpoints are publicly accessible. The CORS policy limits browser-based cross-origin calls but does not prevent direct HTTP requests. If the API is internet-facing, consider adding an API key or Figma plugin token validation.

3. **`updateSession` column name injection**: While `ALLOWED_COLUMNS` filters keys, the column names are interpolated directly into SQL (`${k} = ?`). This is safe because the set is hardcoded, but if the set were ever dynamically populated, it would be a SQL injection vector. Test X-40 validates this.

4. **JSON.parse without try/catch in session GET**: `session.ts` route line 25-31 calls `JSON.parse` on `lint_result`, `ai_review`, `refero_data`, and `conversation` without individual try/catch blocks. Corrupt data in any field will crash the entire response. Test SE-21 targets this.

5. **SSE client disconnect handling**: The `stream.ts` route does not explicitly handle `stream.onAbort()`. If the client disconnects, the `streamChat` generator will continue running until it finishes or the connection error propagates. This is not a bug per se, but wastes Claude API tokens.
