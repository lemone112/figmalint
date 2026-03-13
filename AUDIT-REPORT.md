# FigmaLint — Consolidated Audit Report

**Date:** 2026-03-13
**Agents:** 16 (Code Reviewer, Security Engineer, Backend Architect, Frontend Developer, DevOps Automator, Technical Writer, Software Architect, UX Researcher, UI Designer, Accessibility Auditor, UX Architect, AI Engineer, MCP Builder, Database Optimizer, Performance Benchmarker, API Tester)

## Summary

- **~200 unique findings** (after cross-agent deduplication)
- **Snyk SAST:** 0 automated issues
- **WCAG 2.1 AA:** DOES NOT CONFORM (28 accessibility issues, 8 critical)
- **Documentation:** 4/10

---

## TOP-10 Critical / Must Fix

| # | Issue | Source | Effort |
|---|-------|--------|--------|
| 1 | **No backend authentication** — open Claude proxy, anyone can burn API credits | Security, Backend, Code Review, Architect | Medium |
| 2 | **API keys logged to console** (`save-api-key` handler logs plaintext `sk-ant-...`) | Security, Code Review | Trivial |
| 3 | **Google API key in URL** (`?key=...`) — appears in proxy logs, browser history | Security, Code Review | Medium |
| 4 | **XSS in legacy `ui-enhanced.html`** — innerHTML with unsanitized AI content | Security | Medium |
| 5 | **Chat invisible to screen readers** — no `aria-live`, `role="log"`, landmarks | Accessibility | Low |
| 6 | **Settings panel is not a modal** — no focus trap, Escape key, `role="dialog"` | Accessibility | Low |
| 7 | **No AbortController for streams** — concurrent streams interleave into one bubble | Frontend | Low |
| 8 | **Race condition in `appendConversation`** — read-modify-write without transaction | Backend | Low |
| 9 | **Fix preview not wired to UI** — `previewFix()` + `dryRun` infrastructure exists but unused | UX Research | Medium |
| 10 | **No onboarding** — blank screen + Analyze button, zero explanation | UX Research | Medium |

---

## Security (12 findings)

### HIGH

**S-1: API keys logged to console**
- File: `src/ui/message-handler.ts:87`
- The `save-api-key` handler logs `data` including the full API key in plaintext.
- Fix: `const safeData = type === 'save-api-key' ? { ...data, apiKey: '***REDACTED***' } : data;`

**S-2: Google API key in URL query parameter**
- File: `src/api/providers/index.ts:181`, `src/api/providers/google.ts:332`
- Key appended as `?key=...`, logged via `console.log`, visible in proxy logs and browser history.
- Fix: Route Google calls through backend proxy; redact URL before logging.

### MEDIUM

**S-3: No authentication or rate limiting on backend**
- File: `backend/src/index.ts`
- All routes open. Anyone who discovers the URL can call `/api/analyze` and burn Anthropic credits.
- Fix: Add `bearerAuth` middleware from Hono + rate limiting.

**S-4: Session ID enumeration**
- Files: `backend/src/routes/session.ts`, `backend/src/services/session.ts`
- nanoid(12) provides good entropy (~71 bits), but without auth any valid ID leaks full session data.
- Fix: Implement auth (S-3), then bind sessions to client identifier.

**S-5: XSS in legacy HTML via innerHTML**
- File: `ui-enhanced.html:6854-6894`
- AI-generated content rendered via `innerHTML` after markdown conversion without escaping source text.
- Note: React UI (`AiMessage.tsx`) is clean — no `dangerouslySetInnerHTML`.
- Fix: Escape HTML before markdown transformation, or delete legacy file.

**S-6: No request body size limits**
- Files: `backend/src/routes/analyze.ts`, `backend/src/routes/flow.ts`
- Base64 screenshots accepted with no size cap. OOM risk.
- Fix: `app.use('/api/analyze', bodyLimit({ maxSize: 25 * 1024 * 1024 }));`

**S-7: MCP clients lack timeout configuration**
- Files: `backend/src/mcp/client.ts`, `backend/src/mcp/design-systems-client.ts`
- No connection or request timeouts. Unresponsive MCP server = indefinite hang.
- Fix: Wrap `client.callTool()` with `Promise.race` timeout (15s).

**S-8: CORS returns `'null'` for blocked origins**
- File: `backend/src/index.ts:30-31`
- `Access-Control-Allow-Origin: null` allows any sandboxed iframe to access the API.
- Fix: Return empty string or omit header for non-allowed origins.

### LOW

**S-9: `.env` not in `.gitignore`**
- File: `.gitignore`
- Fix: Add `.env`, `.env.*`, `!.env.example`, `backend/.env`, `data/`.

**S-10: Missing security headers in Caddyfile**
- File: `backend/Caddyfile`
- No `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Referrer-Policy`.
- Fix: Add `header` block to Caddyfile.

**S-11: Error messages may leak internal details**
- Files: `backend/src/routes/*.ts`
- `error.message` passed directly to client. Could expose Anthropic SDK internals.
- Fix: Generic 500 message to client; log full error server-side.

**S-12: SQL column name interpolation (mitigated)**
- File: `backend/src/db/queries.ts:60-71`
- Column names from `ALLOWED_COLUMNS` interpolated into SQL. Safe due to allowlist but fragile.
- Fix: Add comment documenting the security invariant.

---

## Architecture (15 findings)

### P0 — Critical

**A-1: No backend authentication**
- See S-3. The backend is an open Claude proxy.

### P1 — High

**A-2: Duplicated types between plugin and UI**
- Plugin `src/types.ts` defines `LintErrorType` including `'visualQuality' | 'microcopy'`
- UI `ui/src/lib/messages.ts` defines `LintErrorType` missing these two types
- Impact: `buildFullReport` fails to report visual quality and microcopy issues; `byType` record incomplete.
- Fix: Create shared types package or single source of truth.

**A-3: `message-handler.ts` is an 800-line monolith**
- File: `src/ui/message-handler.ts`
- Handles all 33 message types in one giant switch/if chain. Highest coupling point.
- Fix: Split into per-feature handlers: `lint-commands.ts`, `fix-commands.ts`, `screenshot-commands.ts`, `chat-commands.ts`, `settings-commands.ts`.

**A-4: No test suite**
- `package.json`: `"test": "echo \"Error: no test specified\" && exit 1"`
- Lint rules, scoring, batch fixer, JSON normalization — all pure functions, highly testable.
- Fix: Add vitest with unit tests for deterministic logic.

### P2 — Medium

**A-5: Triple Anthropic client singletons**
- `backend/src/services/claude.ts:7-12`, `analyzer.ts:8-13`, `flow-analyzer.ts:5-10`
- Fix: Export single shared `getAnthropicClient()` from `claude.ts`.

**A-6: Duplicate MCP client code**
- `backend/src/mcp/client.ts` and `design-systems-client.ts` are nearly identical.
- Fix: Create `createMcpClient(name, url)` factory.

**A-7: MODEL constant defined 3 times**
- `claude.ts:15`, `refero.ts:6`, `flow-analyzer.ts:13` — all `'claude-sonnet-4-20250514'`
- Fix: Export from `claude.ts`, import elsewhere.

**A-8: `src/fix/` vs `src/fixes/` overlap**
- Two directories for fix-related code with overlapping responsibility.
- Fix: Merge into single `src/fixes/` directory.

**A-9: Plugin-side LLM providers are dead code**
- `src/api/providers/` — multi-provider abstraction predates the backend. Backend now handles all AI calls.
- Fix: Evaluate for removal or document as optional direct-mode feature.

**A-10: Cache doesn't account for lint settings**
- File: `src/core/consistency-engine.ts`
- Hash omits `lintSettings`, `severityOverrides`, `ignorePatterns`. Changed settings → stale cache.
- Fix: Include settings hash in cache key.

**A-11: No protection against huge selections**
- `traverseAndLint` is synchronous and recursive. Thousands of nodes = frozen sandbox.
- Fix: Add node count limit or yield between chunks.

**A-12: Greedy JSON regex for AI response parsing**
- Pattern: `text.match(/\{[\s\S]*\}/)` — matches first `{` to last `}`.
- Fix: Balanced brace matcher or use Claude's structured output / tool-use mode.

**A-13: Unbounded consistency engine cache**
- File: `src/core/consistency-engine.ts:12-13`
- Map grows without limit. No LRU eviction, no max size.
- Fix: Add max-entries cap (e.g., 100) with LRU eviction.

**A-14: Conversation history sent to Claude twice**
- `backend/src/prompts/chat-followup.ts` embeds last 8 messages in system prompt.
- `chat.ts` and `stream.ts` also pass full history as API messages.
- Fix: Remove history from system prompt; let messages array carry it.

**A-15: 3 sequential Claude API calls could be optimized**
- `detectPageType` + `generateReview` are sequential.
- Fix: Fold page type detection into the review prompt to save one round trip.

---

## Frontend (34 findings)

### HIGH — Correctness Bugs

**F-1: Stale closure in `handleRescan`**
- File: `ui/src/hooks/useChat.ts:222-261`
- Reads `state.score` outside `setState` updater — captures stale reference.
- Fix: Use `prev.score` inside the `setState` callback.

**F-2: No AbortController for streams**
- File: `ui/src/lib/api.ts:97-165`
- No abort on new analysis or navigation. Old stream calls `onChunk` on stale state.
- Fix: Pass `AbortSignal` to `fetch`; expose cancellation to caller.

**F-3: Concurrent streams interleave**
- File: `ui/src/App.tsx:190-212`
- No guard against sending while `isStreaming`. Two streams write to same bubble.
- Fix: Disable input during streaming or abort previous stream.

**F-4: Polling interval leaks on unmount**
- File: `ui/src/App.tsx:72-99`
- `referoPollingRef` interval never cleared on component unmount.
- Fix: Add `useEffect` cleanup.

**F-5: `text-10` class undefined in Tailwind**
- Files: `ui/src/components/messages/AiReviewCard.tsx:16`, `ReferoGallery.tsx:54`
- Class silently ignored; elements inherit parent font size.
- Fix: Add `'10': ['10px', '14px']` to Tailwind fontSize config.

**F-6: `bg-bg-success/10` opacity modifier broken with CSS variables**
- File: `ui/src/components/messages/ReferoGallery.tsx:9-10`
- Tailwind opacity modifiers require decomposable color values; CSS vars can't be decomposed.
- Fix: Use `style` prop with `color-mix()` or define explicit semi-transparent tokens.

**F-7: `focus:ring-fg-brand` references nonexistent token**
- File: `ui/src/components/shared/SettingsPanel.tsx:98`
- Fix: Change to `focus:ring-bg-brand` or add `fg-brand` alias.

### MEDIUM — Type Safety / Robustness

**F-8: `PluginEvent` catch-all defeats exhaustive checking**
- File: `ui/src/lib/messages.ts:197`
- `| { type: string; data: unknown }` matches everything.
- Fix: Remove catch-all member.

**F-9: Pervasive `as any` casts in message handler**
- File: `ui/src/App.tsx:118,128,134,139,144,164,167`
- Fix: Narrow to correct union members.

**F-10: Two divergent code paths for Re-scan**
- `ChatContainer.tsx:35-38` routes to `onAnalyze`; `App.tsx:299-302` posts `rescan-lint`.
- Fix: Unify to single path.

**F-11: Module-level mutable `messageIdCounter`**
- File: `ui/src/hooks/useChat.ts:5`
- Fix: Use `crypto.randomUUID()` or `useId()`.

**F-12: Dead `postToPlugin` function**
- File: `ui/src/lib/messages.ts:200-202` — standalone function duplicates hook; appears unused.
- Fix: Remove.

### LOW — Architecture / Polish

**F-13: App.tsx monolith (485 lines)**
- Fix: Extract `handleAction` into `useActions` hook; move `buildFullReport` to `lib/`.

**F-14: Inline SVG duplication**
- Settings gear in `App.tsx` and `StickyHeader.tsx`; checkmark in `FixResult.tsx` and `MessageList.tsx`.
- Fix: Extract into shared `icons/` module.

**F-15: No `React.memo` on message components**
- `appendStreamChunk` called per SSE chunk → entire MessageList re-renders.
- Fix: Wrap `AiMessage`, `ScoreCard`, `IssuesList` etc. in `React.memo()`.

**F-16: `parseBold` regex runs on every render without memoization**
- File: `ui/src/components/messages/AiMessage.tsx:10`
- Fix: `useMemo` or wrap component in `memo`.

**F-17: Redundant CSS variables in globals.css**
- `:root` variables may conflict with Figma-injected values.
- Fix: Remove or mark as development-only fallbacks.

---

## Accessibility (28 findings)

**WCAG 2.1 AA Conformance: FAIL**

### CRITICAL (8)

| # | Issue | WCAG | File |
|---|-------|------|------|
| AC-1 | No landmark regions (`<main>`, `<header>`, `<footer>`) | 1.3.1 | App.tsx, ChatContainer.tsx |
| AC-2 | Loading spinner has no accessible announcement | 4.1.3 | ChatContainer.tsx:57-61 |
| AC-3 | Message list has no live region — new messages invisible | 4.1.3 | MessageList.tsx:41 |
| AC-4 | Settings panel not a dialog — no focus trap, Escape, role | 2.1.2, 1.3.1 | SettingsPanel.tsx:43 |
| AC-5 | Settings close button has no accessible name | 4.1.2 | SettingsPanel.tsx:47-55 |
| AC-6 | Score bars conveyed only visually — no progressbar role | 1.1.1, 1.3.1 | ScoreCard.tsx:14-29 |
| AC-7 | SVG icons lack `aria-hidden` everywhere | 1.1.1 | All components with SVGs |
| AC-8 | API key input has no label | 1.3.1, 4.1.2 | SettingsPanel.tsx:93-99 |

### SERIOUS (10)

| # | Issue | WCAG | File |
|---|-------|------|------|
| AC-9 | Zero headings in the application (except Settings `<h3>`) | 1.3.1, 2.4.6 | All components |
| AC-10 | No skip link or focus management on transitions | 2.4.1 | ChatContainer.tsx |
| AC-11 | Provider selector has no radiogroup role or checked state | 4.1.2 | SettingsPanel.tsx:78-91 |
| AC-12 | Jump-to-node buttons lack context about purpose | 2.4.4 | IssuesList.tsx:59-64 |
| AC-13 | Chat messages have no role or sender identification | 1.3.1 | MessageList.tsx:48-54 |
| AC-14 | Streaming messages provide no feedback mechanism | 4.1.3 | useChat.ts, MessageList.tsx |
| AC-15 | IssuesList not structured as `<ul>`/`<li>` | 1.3.1 | IssuesList.tsx:48-69 |
| AC-16 | Quick/Deep toggle doesn't convey current state | 4.1.2 | QuickActions.tsx:39-45 |
| AC-17 | Fix results lack semantic structure | 1.3.1 | MessageList.tsx:64-76, FixResult.tsx |
| AC-18 | AI review evidence lists have no heading or label | 2.4.6 | AiReviewCard.tsx:29-34 |

### MODERATE (7)

| # | Issue | WCAG |
|---|-------|------|
| AC-19 | Color contrast failures: `#b3b3b3` on white = 2.4:1 (need 4.5:1) | 1.4.3 |
| AC-20 | No `prefers-reduced-motion` support | 2.3.3 |
| AC-21 | No visible focus indicators on most buttons | 2.4.7 |
| AC-22 | Refero gallery not keyboard-navigable | 2.1.1 |
| AC-23 | Status dots convey info through color alone | 1.4.1 |
| AC-24 | Show more/less button lacks `aria-expanded` | 4.1.2 |
| AC-25 | No dark mode fallback colors defined | 1.4.3 |

### MINOR (3)

| # | Issue | WCAG |
|---|-------|------|
| AC-26 | Empty state SVG not hidden from AT | 1.1.1 |
| AC-27 | Refero images lack descriptive alt text | 1.1.1 |
| AC-28 | Font sizes in px, not rem | 1.4.4 |

---

## UX (23 findings)

### CRITICAL

**UX-1: Information hierarchy collapses after analysis**
- 11-12 discrete cards in a 600px panel. ScoreCard scrolls out of view immediately.
- Fix: Tabbed post-analysis view (Overview / Issues / AI Review / Chat).

**UX-2: Single generic spinner for multi-phase analysis**
- 4 phases (lint <1s → screenshot <1s → AI 3-15s → Refero 0-60s), one spinner.
- Fix: Phased progress indicators; show lint results immediately.

**UX-3: No first-run experience**
- Zero onboarding, no explanation of features, scoring, or setup.
- Fix: 3-step welcome flow stored in `figma.clientStorage`.

**UX-4: Fix preview not wired to UI**
- `previewFix()`, `previewRename()`, `dryRun` — all implemented but never surfaced.
- Fix: Show before/after preview card before applying batch fixes.

**UX-5: No undo guidance**
- Batch fix = N separate undo steps, user never told about Cmd+Z.
- Fix: Wrap in `figma.commitUndo()` group; show "Undo all" button.

### HIGH

**UX-6: No selection-change awareness**
- Results from previous component persist when selection changes.
- Fix: Listen to `figma.on('selectionchange')`, show "Selection changed" banner.

**UX-7: Two competing scoring systems**
- Deterministic 0-100 (5 categories) + AI Pass/Fail rubric (4 categories). Different names, overlapping concerns.
- Fix: Unified composite view.

**UX-8: AI confidence not communicated**
- Ratings presented as facts. Scoring weights unexplained. No "AI-generated" label.
- Fix: Tooltips on category bars; "AI-generated" disclosure; actionable gap info.

**UX-9: Most fix types inaccessible from UI**
- Only spacing fixes exposed. Token binding, style application, layer renaming — fully implemented but hidden.
- Fix: Inline fix buttons per issue type in IssuesList.

### MEDIUM

**UX-10: Backend unavailability is silent**
- `checkHealth()` once on mount, `backendAvailable = false` silently disables AI features.
- Fix: Dismissible banner when backend unavailable; periodic retry.

**UX-11: Errors look identical to informational messages**
- All errors rendered as plain `ai-text` messages.
- Fix: Dedicated `ErrorMessage` component with danger styling + recovery action.

**UX-12: No suggested follow-up questions in chat**
- Fix: Show 2-3 contextual suggestion chips after AI review.

**UX-13: Streaming has no visual indicator**
- `streaming` flag exists but `AiMessage` doesn't use it.
- Fix: Blinking cursor or typing dots during stream.

**UX-14: 2 of 10 lint categories missing from UI**
- `visualQuality` and `microcopy` not in `TYPE_LABELS`, not in score computation.
- Fix: Add to type labels, add to score breakdown.

**UX-15: Flat issue list with no grouping**
- No grouping by category, no severity sorting. Critical mixed with informational.
- Fix: Group by category with count headers; sort by severity within groups.

**UX-16: AI evaluates 7 categories, renders only 4**
- Visual Balance, Microcopy Quality, Cognitive Load — requested, paid for, discarded.
- Fix: Render all 7 or remove 3 from prompt.

**UX-17: Chat history not persisted**
- `ChatState` in-memory only. Close plugin = lose everything.
- Fix: Save `sessionId` to `figma.clientStorage`; restore via `GET /api/session/:id`.

### LOW

**UX-18: Refero polling silently times out** — Fix: Show "comparison unavailable" message.
**UX-19: No dead-end recovery for empty selection** — Fix: Disable Analyze when nothing selected.
**UX-20: No chat error retry** — Fix: Show original message with "Retry" button.

---

## UI Design (12 findings)

| # | Issue | File |
|---|-------|------|
| UI-1 | `text-10` undefined — rating badges unstyled | tailwind.config.js |
| UI-2 | `focus:ring-fg-brand` — nonexistent token | SettingsPanel.tsx:98 |
| UI-3 | Opacity modifiers broken with CSS variables | ReferoGallery.tsx:9-10 |
| UI-4 | No `focus-visible` ring on buttons (WCAG 2.4.7) | ActionButtons, QuickActions |
| UI-5 | Progress bars missing ARIA progressbar role | ScoreCard.tsx |
| UI-6 | Disabled input has no visual `disabled:` styling | InputBar.tsx |
| UI-7 | No streaming cursor/typing indicator | AiMessage.tsx |
| UI-8 | No message entrance animations | MessageList.tsx |
| UI-9 | Inconsistent border-radius (`rounded-xl` vs `rounded-lg`) | Multiple components |
| UI-10 | Dark mode: hardcoded fallbacks for light only | globals.css |
| UI-11 | Limited markdown rendering (bold only) | AiMessage.tsx |
| UI-12 | Duplicate SVG icons across components | App.tsx, StickyHeader.tsx |

---

## DevOps (19 findings)

### CRITICAL

**D-1: No CI/CD pipeline** — No `.github/workflows/`. Everything manual.

**D-2: Manifest divergence** — Root `manifest.json` and `dist/manifest.json` have different `allowedDomains`. Published plugin may not reach correct backend.

**D-3: No startup env var validation** — Missing `ANTHROPIC_API_KEY` → cryptic runtime error.

### HIGH

**D-4: No `.dockerignore`** — `node_modules/`, `.git/` copied into Docker build context.

**D-5: No Docker health checks** — Docker can't detect if Node process is actually responding.

**D-6: `dist/` committed to git** — 341KB `code.js` + 248KB `ui.html` + 284KB `ui-enhanced.html`.

**D-7: `ui-enhanced.html` is dead code** — 284KB legacy file at repo root and in dist.

### MEDIUM

**D-8: No multi-stage Docker build** — TypeScript compilation happens outside container.

**D-9: No structured logging** — `console.log` / `console.error` with ad-hoc messages.

**D-10: No database backup strategy** — SQLite on single host volume.

**D-11: esbuild without `--minify`** — 341KB bundle could be significantly smaller.

**D-12: No database indexes** — Only PK index. No index on `node_id`, `created_at`.

**D-13: No database migration system** — Single `CREATE TABLE IF NOT EXISTS`.

**D-14: No session cleanup / TTL** — Sessions grow unboundedly.

**D-15: Node.js version requirement outdated** — README says "16+", Dockerfile uses 22.

### LOW

**D-16: No pinned Docker image tags** — `node:22-alpine` and `caddy:2` are floating.

**D-17: No version coordination** — Root at 2.4.0, backend at 1.0.0, UI at 1.0.0, health endpoint hardcoded 1.0.0.

**D-18: No error tracking service** — Errors logged to stdout and lost.

**D-19: No request tracing** — No request IDs or correlation headers.

---

## Documentation (4/10)

| Area | Score | Key Gap |
|------|-------|---------|
| README | 6/10 | Backend completely absent |
| Code comments | 7/10 | `message-handler.ts` (key file) undocumented |
| API docs | 2/10 | No OpenAPI, no request/response examples |
| Config docs | 3/10 | `.env.example` has no descriptions |
| Architecture | 3/10 | No diagram of 3-layer system |
| Setup guide | 4/10 | No instructions for `ui/` and `backend/` workspaces |
| Manifest | 1/10 | No field explained |

### Priority Documentation Tasks
1. Backend section in README (purpose, setup, env vars, deployment)
2. Complete development setup guide (3-workspace install)
3. Architecture overview with diagram (plugin sandbox → UI iframe → backend)
4. API reference for all 7 endpoints
5. Environment variable table with descriptions
6. Manifest field documentation

---

## Positive Findings

- **Parameterized SQL everywhere** — no string concatenation for values
- **Non-root Docker user** — `appuser` created and used
- **Backend port bound to localhost** — `127.0.0.1:3000:3000`
- **React UI avoids innerHTML** — `AiMessage.tsx` explicitly documents "no dangerouslySetInnerHTML"
- **CORS restriction** — only allows `null` (Figma sandbox), backend domain, localhost
- **API key format validation** — all 3 providers validate key format before use
- **Graceful degradation** — MCP down? Falls back. Claude fails? Skeleton result. Backend offline? Lint-only mode.
- **Clean LLM provider abstraction** — well-typed Strategy pattern in `src/api/providers/types.ts`
- **Deterministic scoring** — Design Health Score independent of AI, reproducible
- **Good prompt engineering** — rubric-based review with explicit pass/fail criteria

---

## Action Plan

### Sprint 0 — Quick Wins (1 day)

- [ ] Redact API key in console log (1 line fix)
- [ ] Add `.env` + `data/` to `.gitignore`
- [ ] Add body size limits (`hono/body-limit`)
- [ ] Add MCP timeout wrapper (`Promise.race`, 15s)
- [ ] Add security headers to Caddyfile
- [ ] Add `aria-hidden="true"` to all SVG icons
- [ ] Add `aria-live="polite"` + `role="log"` to message list
- [ ] Add `text-10` to Tailwind config
- [ ] Add `aria-label="Close settings"` to close button
- [ ] Add `aria-label="API Key"` to password input

### Sprint 1 — Security & Stability (3-5 days)

- [ ] Bearer auth middleware on backend
- [ ] Rate limiting per IP/key
- [ ] AbortController for streaming requests
- [ ] Fix `appendConversation` race condition (SQLite `json_insert`)
- [ ] Settings panel → proper dialog with focus trap + Escape
- [ ] Delete `ui-enhanced.html` (284KB dead code)
- [ ] Fix `handleRescan` stale closure
- [ ] Fix polling interval cleanup on unmount
- [ ] Add startup env var validation
- [ ] Fix `PluginEvent` catch-all (remove it)

### Sprint 2 — Architecture (1 week)

- [ ] Shared types package (plugin + UI sync)
- [ ] Split `message-handler.ts` into per-feature handlers
- [ ] Merge 3 Anthropic clients → 1 shared factory
- [ ] Merge 2 MCP clients → generic factory
- [ ] Merge `src/fix/` and `src/fixes/`
- [ ] Remove or document dead plugin-side LLM provider code
- [ ] Add `visualQuality` + `microcopy` to UI types and scoring
- [ ] Render all 7 AI review categories (or remove 3 from prompt)
- [ ] Include lint settings in cache hash

### Sprint 3 — UX & Accessibility (1 week)

- [ ] Tabbed post-analysis view (Overview / Issues / AI Review / Chat)
- [ ] Progressive disclosure (lint results immediately, AI when ready)
- [ ] Wire fix preview UI to existing `previewFix()` + `dryRun`
- [ ] First-run onboarding (3 steps + `clientStorage`)
- [ ] Session persistence + restore on reopen
- [ ] Selection change detection + "stale results" banner
- [ ] Heading hierarchy (`<h1>` → `<h3>`) throughout UI
- [ ] Landmark regions (`<main>`, `<header>`, `<footer>`)
- [ ] Focus management on state transitions
- [ ] Contrast fixes (`text-fg-tertiary` ≥ #767676, `text-fg-success` ≥ #0F7B3F)
- [ ] `focus-visible:ring-2` on all interactive elements
- [ ] `prefers-reduced-motion` media query
- [ ] Grouped issue list with severity sorting

### Sprint 4 — DevOps & Polish (3-5 days)

- [ ] GitHub Actions CI/CD (typecheck + build + Docker image)
- [ ] Multi-stage Docker build
- [ ] `.dockerignore` file
- [ ] Docker health checks
- [ ] Structured logging (pino)
- [ ] `--minify` flag for esbuild
- [ ] Database indexes on `node_id`, `created_at`
- [ ] Session TTL / cleanup routine
- [ ] Backend docs + API reference in README
- [ ] Pin Docker image tags
- [ ] Unit tests for lint rules + scoring logic
