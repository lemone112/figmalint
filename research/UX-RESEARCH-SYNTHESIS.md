# FigmaLint UX Research Synthesis
## From Findings to Actionable Recommendations

**Date:** 2026-03-13
**Methodology:** Triangulated synthesis across competitive analysis, designer pain point research, AI SOTA review, Figma API capability analysis, internal audit report, and pipeline evaluation
**Evidence base:** 80+ cited sources, 5 industry surveys (n=8,000+ combined), codebase audit (200 findings)

---

## 1. User Personas with Jobs-to-be-Done

### Persona 1: Maya — Solo Designer / Freelancer

**Demographics and Context**
- Age Range: 25-34
- Works independently for 3-8 clients simultaneously
- Tech Proficiency: High within design tools, limited DevOps/CI knowledge
- Device: MacBook, single monitor, Figma Professional plan
- Design system maturity: Ad-hoc (project-by-project token sets, no formal governance)

**Behavioral Patterns**
- Usage Frequency: Sporadically, at handoff milestones (not daily)
- Task Priorities: Ship fast, avoid embarrassing mistakes, look professional
- Decision Factors: Time-to-value must be under 2 minutes. Will not read documentation
- Pain Points: No second pair of eyes for review; clients assume pixel-perfect; accessibility violations discovered by client's dev team erode trust
- Motivations: Professional credibility, fewer revision rounds, faster client approval

**Jobs-to-be-Done**
1. "When I'm about to share a design with a client, I want a quick sanity check so I don't look unprofessional"
2. "When a developer tells me my design has contrast issues, I want to catch those myself next time so I maintain credibility"
3. "When I'm working without a design system, I want to know where I've been inconsistent so I can clean it up before handoff"

**What FigmaLint Must Do for Maya**
- Zero-config value: Run Analyze, get useful output immediately. No API key setup for basic lint. (Evidence: Pain point research Section 5.1 -- "five minutes of setup for two minutes of value" causes abandonment)
- AI review as mentor: Maya has no senior designer to review her work. The AI visual review + Refero comparison fills the "second pair of eyes" gap. (Evidence: Pipeline Evaluation Part 4 -- junior designers rate AI Visual Review 5/5, Refero Comparison 5/5)
- Speed over depth: She needs the score and top 3 issues, not 7 AI categories. (Evidence: UX-1 from audit -- 11-12 cards in 600px panel causes information collapse)

**Quotes from Research**
> "If a plugin required five minutes of setup for two minutes of value, it didn't make the list" -- Plugin ecosystem analysis
> "46.3% of teams report significant inconsistencies between design specs and coded implementations" -- UXTools 2024 (n=2,220)

**Research Evidence:** Based on UXTools 2024 survey data (n=2,220), Figma 2025 AI Report (n=2,500), plugin abandonment patterns from Fig Stats analytics, community feature request analysis

---

### Persona 2: Raj — Design System Lead at a Mid-Size Company

**Demographics and Context**
- Age Range: 30-40
- Manages a design system used by 8-15 designers and 20-30 engineers
- Tech Proficiency: High; comfortable with tokens, variables, DTCG spec, some CLI
- Device: MacBook Pro, dual monitors, Figma Organization plan
- Design system maturity: Established (published library, token collections, but governance is manual)

**Behavioral Patterns**
- Usage Frequency: Would use daily IF the tool shows system-wide health, not just per-component
- Task Priorities: Governance, adoption metrics, preventing drift, justifying DS investment to leadership
- Decision Factors: Must produce shareable reports. Executive-facing metrics. ROI narratives
- Pain Points: Cannot quantify design debt; detachment rates climb within 6 weeks without enforcement; cannot tell if the system is getting healthier or sicker
- Motivations: Prove DS value, reduce support burden, establish quality standards

**Jobs-to-be-Done**
1. "When my DS has been live for 6 weeks, I want to see detachment and override trends so I can identify components that need redesign"
2. "When I report to leadership, I want a Design Debt Score with trend lines so I can justify continued DS investment"
3. "When a new designer joins, I want the linter to teach them our conventions in-context so onboarding takes days instead of weeks"
4. "When Figma's native Check Designs catches basic variable misuse, I still need deeper analysis (accessibility, cognitive, flow consistency) so my tool remains essential"

**What FigmaLint Must Do for Raj**
- Design Debt Score with trending: No tool does this today. ComponentQA has a basic health score but no holistic debt quantification with severity weighting, fix cost estimation, or trend prediction. (Evidence: Competitive analysis Section 3.2 -- "No widely adopted tool exists to quantify design debt the way SonarQube quantifies technical debt")
- Team-configurable rules: His team uses 6px grid, not 8px. The default spacing scale produces false positives that kill trust. (Evidence: Pipeline Evaluation Part 2 -- "design system configuration is the single most impactful missing feature for teams")
- File/page-level batch analysis: He needs to scan 20+ screens at once, not one component at a time. (Evidence: Pipeline Evaluation Part 4 -- design leads want "breadth across many screens")
- Compliance audit trails: European Accessibility Act (June 2025) creates legal requirements for documented accessibility compliance. (Evidence: Competitive analysis Section 2.4 -- "organizations need to map design issues to specific regulatory requirements")

**Quotes from Research**
> "Component detachment rates climb within 6 weeks of a design system launch if there's no enforcement mechanism" -- Design system governance research
> "Only 79% of mature design systems have official governance; the rest operate on trust alone" -- Industry data

**Research Evidence:** Based on design system governance research (Supernova, UXPin, Netguru), ComponentQA feature analysis, DTCG Community Group spec, European Accessibility Act compliance requirements, Figma Library Analytics API documentation

---

### Persona 3: Lena — Product Designer in a Large Organization

**Demographics and Context**
- Age Range: 28-38
- Part of a 40+ person design org with multiple product teams
- Tech Proficiency: Moderate; uses DS components but doesn't build them
- Device: MacBook, Figma Enterprise plan (employer-provided)
- Design system maturity: Mature (dedicated DS team, published library, governance process)

**Behavioral Patterns**
- Usage Frequency: Wants it active continuously while she works (ambient quality indicator)
- Task Priorities: Ship features on deadline; pass design review on first try; avoid "ready for dev" rejection
- Decision Factors: Must not slow her down. Must integrate with existing review process (Figma comments, Jira)
- Pain Points: Manual quality checklists consume 20-30% of project time; design review feedback is inconsistent depending on the reviewer; "ready for dev" rejection means rework that delays sprint commitments
- Motivations: Fewer revision cycles, smoother handoffs, personal velocity

**Jobs-to-be-Done**
1. "When I'm about to mark a design 'ready for dev,' I want a pre-flight check so the design passes review on the first try"
2. "When I'm designing a multi-screen flow, I want cross-screen consistency validation so I don't discover inconsistencies in QA"
3. "When I receive design review feedback, I want most mechanical issues already fixed so the review can focus on product decisions"
4. "When I use a design system component, I want to know instantly if I've detached or overridden something incorrectly"

**What FigmaLint Must Do for Lena**
- Ambient mode with selection-aware badge: Show score + issue count on selection change. Zero-cost quality awareness while she works. (Evidence: Pipeline Evaluation Part 4 -- "ambient mode" as a habit-driving workflow; audit finding UX-6 -- no selection-change awareness)
- Auto-fix as primary value: Lena cares most about speed. Batch fixes resolve issues without context-switching. (Evidence: Pipeline Evaluation Part 4 -- "Senior designers care most about speed -- auto-fixes applied quickly" rated 5/5)
- Progressive disclosure: Show verdict in 5 seconds (score + actionable count), not 30 seconds of scrolling. (Evidence: UX-1 -- current UI requires 15-30 seconds of scrolling for situation assessment)
- Pre-share gate: Trigger analysis at the "about to share" moment, which maps to Figma's "ready for dev" workflow. (Evidence: Figma API research Section 3.3 -- "Check Designs" fires at ready-for-dev status change; Pipeline Evaluation suggests FigmaLint as "pre-flight check")

**Quotes from Research**
> "QA typically consumes 20-30% of total project time in mature processes" -- Industry standard
> "Fix during design: 1x. Fix during development: 5-10x. Fix post-launch: 30-100x" -- Cost escalation research

**Research Evidence:** Based on Zeplin handoff data (4-8 hrs/employee/week), design QA checklist analysis (Eleken, HubSpot), Figma 2025 collaboration data (84% collaborate with devs weekly, 33-37% rate it ineffective)

---

### Persona 4: Carlos — Engineering Lead Who Cares About Design Quality

**Demographics and Context**
- Age Range: 32-45
- Leads a frontend team of 6-12 engineers implementing designs
- Tech Proficiency: Very high; thinks in systems, APIs, CI/CD
- Device: MacBook or Linux workstation, VS Code/Cursor, uses Figma MCP server
- Design system maturity: He consumes it; he does not maintain it

**Behavioral Patterns**
- Usage Frequency: At sprint planning and code review, not during design
- Task Priorities: Reduce design-implementation mismatch; prevent rework; get actionable specs
- Decision Factors: Must produce structured data (JSON/API), not just visual reports. Must integrate with existing dev toolchain
- Pain Points: 46.3% inconsistency rate between design specs and code; developers make assumptions when specs are ambiguous; fixing design issues post-build costs 5-10x more
- Motivations: Fewer tickets reopened for design inconsistency, cleaner component APIs, predictable implementation effort

**Jobs-to-be-Done**
1. "When a design is handed off to my team, I want a structured quality report so I can estimate implementation effort accurately"
2. "When my team implements a design, I want to know which values are tokens vs. hard-coded so we don't hard-code things in CSS"
3. "When I set up CI/CD for our design system, I want a quality gate for design branches so regressions don't reach production"
4. "When AI code generation tools consume Figma designs via MCP, I want the design to be clean and token-compliant so the generated code is correct"

**What FigmaLint Must Do for Carlos**
- JSON export with token compliance data: The existing JSON export format is already useful. But token analysis is orphaned from the pipeline. (Evidence: Pipeline Evaluation Gap 4 -- token analysis output never forwarded to AI or export)
- Design-to-code readiness score: No tool predicts how cleanly a design translates to code. (Evidence: Competitive analysis Section 3.4 -- "No tool predicts at design time whether a design will translate cleanly to code")
- CI/CD integration via API: Carlos needs a headless quality gate, not a plugin UI. The REST API endpoints for variables + component analytics exist on Enterprise. FigmaLint's backend could expose a webhook/API. (Evidence: Competitive analysis Section 4.2 -- "CI/CD Integration" as a Tier 2 differentiator)
- MCP pre-flight: Before Figma MCP feeds design data to Cursor/Copilot, FigmaLint ensures the design is clean. "Garbage in, garbage out" prevention. (Evidence: Competitive analysis Section 2.5 -- "LLMs still struggle to bridge visual information with component properties")

**Quotes from Research**
> "46.3% of teams report significant inconsistencies between design specs and coded implementations" -- UXTools 2024 (n=2,220)
> "Design-dev handoff challenges eat 4-8 hours per employee per week" -- Zeplin/Industry Data

**Research Evidence:** Based on UXTools 2024 survey data, Figma MCP Server documentation, design-to-code tool analysis (Anima, Locofy), Applitools visual comparison capabilities

---

## 2. Journey Map: Design Review Workflow

### Current State: "Design Review" Journey (Without FigmaLint)

```
Phase 1: DESIGN                Phase 2: SELF-REVIEW           Phase 3: PEER REVIEW
[Create/iterate]               [Manual QA checklist]           [Share link + wait]
                               Time: 30-60 min                 Time: 1-3 days
                               Pain: Tedious, inconsistent     Pain: Inconsistent feedback
                               Emotion: Dread, boredom         Emotion: Anxiety

Phase 4: REVISION              Phase 5: HANDOFF               Phase 6: DEV QA
[Fix feedback items]           [Mark "Ready for Dev"]          [Developer discovers issues]
Time: 1-4 hours                Time: 15-30 min                 Time: 2-8 hours
Pain: Rework feeling           Pain: "Did I miss anything?"    Pain: Design-code mismatch
Emotion: Frustration           Emotion: Uncertainty            Emotion: Blame, rework
```

**Total time:** 4-8 hours per employee per week on handoff challenges alone
**Cost:** At $80/hr for a 10-person team, $166K-$332K/year in review and rework friction
**Failure rate:** 46.3% report significant spec-to-code inconsistencies

### Target State: With FigmaLint Integrated

```
Phase 1: DESIGN + AMBIENT LINT
[Create/iterate with FigmaLint open]
- Selection-aware badge shows score on every selection change
- Real-time incremental linting catches issues AS they're created
- Auto-fixable issues resolved with one click (token binding, naming, spacing)
>>> FigmaLint value: Issues caught at 1x cost. Zero context-switching.
>>> Evidence: Audit UX-6 (selection change awareness), research Section 4.4 (real-time linting)

Phase 2: PRE-SHARE CHECK (replaces manual QA)
[Run full analysis before sharing]
- Deterministic lint: instant results (< 1 second)
- AI visual review: 3-15 seconds, progressive loading
- Summary-first UI: Score + actionable issue count in 5 seconds
- Batch "Fix All" for auto-fixable issues
- Before/after preview for fixes (already built, not wired to UI)
>>> FigmaLint value: 30-60 min manual checklist -> 2-5 min automated check
>>> Evidence: Audit UX-2 (phased progress), UX-4 (fix preview unwired), UX-9 (most fix types hidden)

Phase 3: INFORMED PEER REVIEW
[Share annotated results]
- Shareable quality report (export as PDF/Markdown)
- Issues mapped to specific WCAG criteria and severity levels
- AI suggestions clearly labeled as opinions vs. deterministic rules as facts
- Reviewer focuses on product/UX decisions, not mechanical errors
>>> FigmaLint value: Review focuses on judgment calls, not spacing verification
>>> Evidence: Pipeline Evaluation Part 4 (facts vs. opinions distinction)

Phase 4: TARGETED REVISION
[Fix remaining issues with guided navigation]
- Issue navigator: Previous/Next walker with canvas zoom
- Auto-rescan after batch fixes shows updated score
- Persistent ignore state: no re-dismissing acknowledged false positives
>>> FigmaLint value: Issues resolved per session: 2-3 -> 8+ (guided navigation)
>>> Evidence: Pipeline Evaluation P2 #17 (guided issue navigator)

Phase 5: CONFIDENT HANDOFF
[Mark "Ready for Dev" with quality report]
- Design-to-code readiness score
- Token compliance summary for developers
- Structured JSON export for programmatic consumption
- AI prompt export for code generation tools
>>> FigmaLint value: Developers receive clean, annotated designs
>>> Evidence: Competitive analysis Section 3.4 (design-to-code fidelity prediction)

Phase 6: DEV QA (REDUCED)
[Developer builds from clean, documented design]
- Token-compliant design means correct CSS variable usage
- Component structure validated means cleaner code architecture
- Accessibility pre-validated means fewer post-build WCAG failures
>>> FigmaLint value: Design-code inconsistency rate drops from 46.3% baseline
>>> Evidence: UXTools 2024 inconsistency data, cost escalation research (5-10x post-design)
```

### Key Touchpoints Where FigmaLint Adds Measured Value

| Touchpoint | Current Pain | FigmaLint Intervention | Time Saved | Evidence |
|---|---|---|---|---|
| During design | Issues accumulate invisibly | Ambient score badge on selection change | 10 min/session | Audit UX-6 |
| Self-review | 30-60 min manual checklist | Automated scan + batch fix | 20-50 min/review | Pain points Section 4.3 |
| Peer review | Reviewer catches mechanical errors | Mechanical issues pre-resolved | 30 min/review | Pipeline Evaluation value map |
| Revision | Unguided fixing in flat list | Guided navigator with auto-rescan | 15 min/revision cycle | Pipeline Evaluation P2 #17 |
| Handoff | Ambiguous specs, missing docs | Structured export + readiness score | 30 min/handoff | Pain points Section 1.2.4 |
| Dev QA | 46.3% inconsistency rate | Pre-validated token compliance | 60 min/week per dev | UXTools 2024 data |

**Conservative total: 18.3 hours/week saved for a 10-person design team = $76,000/year** (from Pipeline Evaluation value map)

---

## 3. Top 15 Unmet Needs — Ranked by Composite Score

**Scoring methodology:** Each dimension rated 1-5. Score = Frequency x Severity x Breadth x Solvability (max = 625).

| Rank | Unmet Need | Freq | Sev | Breadth | Solve | Score | Evidence |
|------|-----------|------|-----|---------|-------|-------|----------|
| **1** | **Design system config UI (custom spacing scale, allowed radii, severity overrides)** | 5 | 5 | 4 | 5 | **500** | Pipeline Eval: "single most impactful missing feature for teams." TeamLintConfig type EXISTS, save/load messages defined, but NO UI surface. Teams on non-4px grids get flooded with false positives -> abandonment. |
| **2** | **Design Debt Score with trend tracking** | 4 | 5 | 5 | 5 | **500** | Competitive analysis: "No widely adopted tool exists to quantify design debt." ComponentQA has basic health score but no severity weighting or trend prediction. FigmaLint already has scoring infra + backend session storage. |
| **3** | **Expose all 5 auto-fix types with preview** | 5 | 5 | 5 | 4 | **500** | Pipeline Eval: only 1 of 5 fix types exposed (20%). Token binding, style application, layer renaming, radius fixing -- all implemented in `src/fix/` but hidden. Exposing them "moves fix rate from ~20% to ~60%." |
| **4** | **Summary-first information hierarchy (verdict in 5 seconds)** | 5 | 4 | 5 | 5 | **500** | Audit UX-1: 11-12 cards in 600px panel. Pipeline Eval: "Designer should assess situation and begin acting within 5 seconds. Currently takes 15-30 seconds of scrolling." |
| **5** | **Regulatory compliance audit trails (WCAG 2.2 + EAA mapping)** | 3 | 5 | 4 | 5 | **300** | European Accessibility Act in force since June 2025. Competitive analysis: "No design tool generates compliance-ready audit trails with regulation references." Enterprise buyers need documented compliance. Automated tools catch only 30-40% of WCAG issues; AI-assisted can expand to ~60-70%. |
| **6** | **Cross-screen flow consistency validation** | 4 | 4 | 4 | 4 | **256** | Competitive analysis Section 3.1: "Every existing linter works frame-by-frame." FigmaLint's flow analysis exists in `src/flow/` and backend `flow-analysis.ts` but is not prominently surfaced. No competitor validates "Does the error state on Screen 3 use the same pattern as Screen 7?" |
| **7** | **Selection-aware ambient quality indicator** | 5 | 4 | 5 | 5 | **500** | Audit UX-6: "Results from previous component persist when selection changes." Pipeline Eval: "#1 plugin UX failure." `figma.on('selectionchange')` is already wired in `code.ts` line 20, but UI does not yet show ambient score badge. |
| **8** | **Design-to-code readiness prediction** | 3 | 5 | 3 | 4 | **180** | Competitive analysis Section 3.4: "No tool predicts at design time whether a design will translate cleanly to code." Pain points: 4-8 hrs/employee/week lost to handoff. FigmaLint has token analysis + component structure checks + auto-layout lint -- the building blocks exist. |
| **9** | **Multi-theme / multi-brand simultaneous validation** | 3 | 4 | 3 | 4 | **144** | Competitive analysis Section 3.5: "No tool validates that a design works correctly across ALL themes/brands simultaneously." Figma Extended Collections (Schema 2025) enable multi-brand. Dark mode validation is task #18 (in progress). Variable API supports `valuesByMode` and `resolveForConsumer`. |
| **10** | **Component API quality linting** | 3 | 4 | 3 | 4 | **144** | Competitive analysis Section 3.9: "No tool validates whether a component's API is well-designed." Figma Plugin API exposes `componentPropertyDefinitions` with full type/variant/default data. Check: excessive boolean props, inconsistent variant naming, missing descriptions. |
| **11** | **File/page-level batch analysis** | 3 | 3 | 3 | 5 | **135** | Pipeline Evaluation: "File/page-level batch scan saves 60 min/week for design leads." Current tool analyzes single selection. Figma API supports `figma.root.children` traversal with `page.loadAsync()` for on-demand page loading. |
| **12** | **Persistent ignore state with annotations** | 4 | 3 | 4 | 5 | **240** | Pipeline Evaluation: "ignoredNodeIds stored in volatile memory, lost on restart." Every session re-dismisses false positives. `figma.clientStorage` available for persistence. Pain point research Section 5.1: "information overload" as abandonment cause. |
| **13** | **Issue-to-ticket filing (Jira/Linear)** | 2 | 3 | 3 | 4 | **72** | Competitive analysis: "Stark has Jira/Linear integration." Table stakes for enterprise. FigmaLint backend already has session/analysis storage; webhook to issue tracker is incremental. |
| **14** | **Natural language custom rules** | 2 | 4 | 3 | 3 | **72** | Pain point research Section 3.3: "Custom rule authoring that's accessible to non-developers" as community feature request. AI could translate plain English rules to executable checks, but reliability is a concern (50-75% accuracy for generic AI tools -- Baymard research). |
| **15** | **Predictive quality degradation alerts** | 2 | 4 | 2 | 3 | **48** | Competitive analysis Section 3.10: "No tool uses historical data to PREDICT quality degradation." FigmaLint has baseline/diff tracking infrastructure. Would require sufficient historical data (minimum 4-6 data points per component). |

### Priority Grouping

**Immediate (already built, needs wiring):** #3 (expose fixes), #4 (info hierarchy), #7 (ambient mode), #12 (persistent ignore)
These four items require no new backend capabilities. The code exists in `src/fix/`, `previewFix()`, `dryRun`, `figma.on('selectionchange')`, and `figma.clientStorage`. Total estimated effort from Pipeline Evaluation: 25-35 hours.

**Next sprint (requires moderate new work):** #1 (DS config UI), #2 (debt score trending), #6 (flow consistency), #11 (batch analysis)
These require new UI surfaces and backend persistence. The TeamLintConfig type and session scoring already exist.

**Strategic (requires significant investment):** #5 (compliance audit trails), #8 (code readiness), #9 (multi-theme), #10 (component API lint)
These create competitive moats no competitor can replicate within 12 months.

---

## 4. "What Would Make Designers Use This DAILY"

### 4.1 How Should Errors Be Presented?

**Principle: Three-tier hierarchy, grouped by actionability, not by category.**

Evidence: Pipeline Evaluation Part 4 found designers think in "layers of confidence" (looks right -> matches system -> works -> communicable), not in lint categories. The current flat list mixes all layers with equal visual weight. Pain point research Section 5.3 documents that flat error lists without prioritization "feel overwhelming rather than helpful."

**Recommended structure:**

**Tier 1 -- The Verdict (always visible, no scroll)**
- Composite score (0-100)
- One-sentence summary: "3 issues need attention, 2 are auto-fixable"
- Single "Fix All Auto-Fixable" button
- Evidence: Pipeline Evaluation recommends "assess situation and begin acting within 5 seconds"

**Tier 2 -- Actionable Issues (grouped by what the designer should DO)**
- Auto-fixable issues: inline "Fix" buttons per issue, "Fix All" at group level. Show before/after preview (previewFix() exists but is unwired -- audit UX-4)
- Manual fixes needed: specific guidance, not just "increase contrast." Include the current value and the target value
- AI suggestions: clearly labeled with "AI" badge. Visually distinct from deterministic findings. Do not affect the score
- Evidence: Pipeline Evaluation Part 4 -- "Visually distinguish 'Rule' findings from 'AI Suggestion' findings. Only deterministic rules affect the score"

**Tier 3 -- Deep Dive (expandable, tabbed)**
- Full AI visual review commentary (all 7 categories, not 4)
- Refero comparisons
- Category-by-category score breakdown
- Chat interface for follow-up questions
- Evidence: Audit UX-16 confirms 3 AI categories are computed and paid for but discarded

**Error severity framework (from pain point research Section 5.3):**

| Severity | Visual Treatment | Criteria | Examples |
|----------|-----------------|----------|----------|
| Critical (red) | Badge + count | Accessibility violation, broken pattern | Contrast below 3:1, touch target under 24px |
| Error (orange) | Badge + count | Design system violation | Detached component, hardcoded token value |
| Warning (yellow) | Count only | Potential inconsistency | Off-grid spacing, unusual weight |
| Info (gray) | Collapsed by default | Optimization opportunity | Naming suggestion, newer component available |

### 4.2 What Triggers Should Activate the Plugin?

**The key insight from research: plugins that require explicit invocation get forgotten. Plugins that attach to existing behaviors become habits.**

Recommended triggers, ranked by habit-formation potential:

1. **Selection change (ambient mode):** Show a small badge in the plugin panel with score + critical issue count. Updates on every `figma.on('selectionchange')`. Already partially wired in `code.ts` lines 20-30. Cost: near-zero (deterministic lint is < 1 second). This is the "spell-check model" from pain point research Section 5.2.
   - Evidence: "Background/passive mode -- runs without designer needing to invoke it" identified as the stickiest UX pattern

2. **"Ready for Dev" status change:** Figma's Check Designs fires at this moment. FigmaLint should too. Run full analysis (deterministic + AI) when the designer marks a frame ready for development. This is the "pre-share gate" from Pipeline Evaluation Part 4.
   - Evidence: Figma API research confirms Dev Mode APIs support annotations and status management

3. **Document change (incremental):** `figma.on('documentchange')` fires on every edit. Run only the affected lint rules (not full AI review) on changed nodes. Task #23 (real-time incremental linting) is in progress.
   - Evidence: Pain point research Section 4.4 -- "Real-time, in-canvas linting that catches issues AS designers work"

4. **First open of the day (dashboard):** For Raj (design system lead), show file-level health overview on plugin open. Score trends, recent regressions, team-wide metrics.
   - Evidence: Pipeline Evaluation Part 4 -- "Morning Dashboard" as habit driver

**Triggers to avoid:**
- Modal popups or blocking dialogs (research: "plugins that slow down Figma are quickly abandoned")
- Auto-running AI analysis on every selection change (too slow, too expensive)
- Notifications for info-level findings (noise causes abandonment)

### 4.3 How Do You Avoid Plugin Fatigue?

Six evidence-based anti-fatigue mechanisms:

1. **Persistent ignore state.** Currently, `ignoredNodeIds` is stored in volatile memory and lost on restart (Pipeline Evaluation). Every session re-dismisses the same false positives. Store ignored issues in `figma.clientStorage` keyed by `nodeId + ruleType`. This is the single highest-impact anti-fatigue fix.

2. **Team-configurable rules.** The `TeamLintConfig` type already exists in the codebase. Without configuration, teams on non-4px grids get flooded with spacing violations (Pipeline Evaluation: "single most impactful missing feature for teams"). False positives are the fastest path to abandonment.

3. **Severity filtering.** Let users choose their threshold: "Show me errors and above" vs. "Show everything." Default to errors + critical for returning users. Show all for first run (educational).

4. **Progressive cost disclosure.** AI analysis costs API tokens. Show deterministic results instantly (free, fast). Offer AI review as an opt-in deeper analysis. Do not gate the basic value proposition behind an API key.

5. **Session memory.** The backend already stores `score_initial` and `score_current`. Show: "Your score improved from 72 to 87 this session." Persist the session across plugin close/reopen via `figma.clientStorage` (audit UX-17: chat history not persisted).

6. **Diminishing returns signal.** When a component scores above 90, say "This component looks great. 2 minor suggestions if you want to polish further." Do not present a full 12-card analysis for a nearly-perfect component.

Evidence: Pain point research Section 5.1 identifies the six causes of plugin fatigue: low value-to-setup ratio, maintenance rot, file clutter, information overload, no workflow integration, one-size-fits-all rules. The mechanisms above address all six.

### 4.4 What Positive Reinforcement Works?

Evidence-based positive reinforcement patterns:

1. **Score improvement celebration.** "Score: 87 (+15 from last check)". The delta is the reward signal. Research on gamification in productivity tools shows relative improvement is more motivating than absolute scores.
   - Implementation: Backend already stores `score_initial` and `score_current`. Surface the delta prominently in Tier 1

2. **Streak tracking.** "3 consecutive designs above 85." For Lena (product designer), this creates a personal quality standard she wants to maintain.
   - Implementation: Store per-component scores in `figma.clientStorage`. Display streak in header

3. **Team percentile.** "Your average score is in the top 20% of your team." For organizations with auth (Raj's use case), this creates healthy competition.
   - Implementation: Requires backend auth (Sprint 2 in audit action plan). Use session data aggregated by team

4. **Completion momentum.** "12 of 15 issues resolved. 3 remaining." Progress bars work because they activate the Zeigarnik effect (incomplete tasks create psychological tension). The current flat list provides no completion signal.
   - Implementation: Issue count badge that decrements as fixes are applied. Auto-rescan after batch fix (Pipeline Evaluation: P2 #14)

5. **"You caught this before the developer did" framing.** Instead of "5 errors found," frame as "5 issues caught before handoff." This reframes the tool from critic to ally.
   - Implementation: Copy change in summary text. No code change required

6. **Monthly learning insight.** "Your most common issue this month: off-grid spacing (12px instead of 16px). Down 40% from last month." For Maya (solo designer), this is the mentoring she does not otherwise receive.
   - Implementation: Aggregate issue types from session history. Display on "Morning Dashboard" trigger

**What NOT to do:**
- Do not use confetti, badges, or gamification gimmicks. Designers are sophisticated users who will find these patronizing. Evidence: no successful design tool uses achievement badges
- Do not celebrate the tool's findings ("We found 47 issues!"). Celebrate the designer's improvement ("You resolved 12 issues in 3 minutes")
- Do not show scores below 50 in red with alarm-style UI. A low score on a work-in-progress is expected and normal. Reserve alarm styling for regressions (score dropped from previous check)

---

## 5. Top 5 Features No Competitor Offers (Technically Feasible)

### Feature 1: Design Debt Score with Predictive Trending

**What it is:** A composite 0-100 score that quantifies design debt across token compliance, component integrity, accessibility, naming, and structural quality -- tracked over time with trend lines and predictive alerts.

**Why no competitor has it:** ComponentQA has a basic health score but limits it to style compliance. No tool weights severity, estimates fix cost, tracks trends, or predicts degradation. SonarQube exists for code; nothing equivalent exists for design.

**Evidence:**
- Pain point research Section 2.4: "No widely adopted tool exists to quantify design debt the way SonarQube quantifies technical debt"
- Competitive analysis Section 3.2: "No tool provides a holistic design debt score that weights severity, impact, fix cost"
- Pipeline Evaluation Part 3: "Design Debt Dashboard (SonarQube for design)" listed as blue ocean opportunity
- FigmaLint already computes a 0-100 Design Health Score (5 categories in UI, 9 in backend). The backend already stores `score_initial` and `score_current` per session

**Technical feasibility:** HIGH. FigmaLint's backend has SQLite with session storage. Extend with a `component_scores` table tracking `(file_id, node_id, score, timestamp, breakdown_json)`. Trend computation is basic time-series math. Predictive alert requires minimum 4-6 data points per component (linear regression on score trajectory). The Figma REST API `file_versions` endpoint provides version history for correlation.

**Moat strength:** STRONG. Requires persistent scoring infrastructure + historical data accumulation. A new competitor would need months of user data before their trends become meaningful.

---

### Feature 2: Three-Layer "Why + How" Per Finding (Deterministic Rule + AI Explanation + Real-World Reference)

**What it is:** When a lint rule fires, the tool explains WHY via AI reasoning AND shows HOW real products solved the same issue via Refero's 75,000+ production UI database. Example: "Your button contrast is 2.8:1 (fails WCAG AA). Large buttons in similar dashboards typically use at least 5:1 contrast. Here are 3 examples from production apps."

**Why no competitor has it:** Deterministic linters show the rule violation. AI tools give generic advice. Reference databases show examples. No single tool has all three layers feeding into a single, per-finding explanation. This requires the architecture FigmaLint already has: lint engine + AI + Refero MCP.

**Evidence:**
- Pipeline Evaluation Part 3: "AI 'Why' explanations per violation" and "Real-world fix suggestions ('Others solved this by...')" listed as blue ocean opportunities that "no one else has both"
- Competitive analysis: EXDERA has AI review, Stark has rules, but neither has a reference database
- Refero database: 75,000+ production UIs. Competitive analysis: "Years to replicate"
- AI SOTA research: Rubric-based evaluation with evidence grounding reduces hallucination

**Technical feasibility:** HIGH. The three components already exist independently. Lint rules produce structured findings with `nodeId`, `type`, `severity`, `currentValue`. The AI review pipeline already receives component context. Refero MCP is already integrated. The integration is: (1) for each finding, construct a micro-prompt asking Claude to explain WHY this matters and HOW to fix it, (2) query Refero for examples matching the finding type (e.g., "button with high contrast" for a contrast violation), (3) render as an expandable detail card per issue.

**Moat strength:** VERY STRONG. Requires three independent capabilities (rules + AI + reference DB) simultaneously. No competitor has all three.

---

### Feature 3: Multi-Theme Simultaneous Validation

**What it is:** Validate a design across ALL variable modes (light/dark/high-contrast, Brand A/Brand B) in a single pass. Report: "This component passes in 4/5 themes. Brand-B Dark fails contrast on 3 elements. Here are the specific failures."

**Why no competitor has it:** Most linters check the currently visible mode. No tool resolves variables across ALL modes and validates each. Figma's Extended Collections (Schema 2025, November 2025) made multi-brand systems mainstream, but tooling has not caught up.

**Evidence:**
- Competitive analysis Section 3.5: "No tool validates that a design works correctly across ALL themes/brands simultaneously"
- Pain point research Section 6.3.6: "Light mode passes WCAG; dark mode doesn't. This is rarely checked"
- Figma API research: `variable.valuesByMode` provides values per mode. `variable.resolveForConsumer(node)` resolves the current mode value. `getLocalVariableCollectionsAsync()` returns all collections with their modes

**Technical feasibility:** MEDIUM-HIGH. The Figma Plugin API provides `variable.valuesByMode` which gives raw values for every mode. The approach: (1) enumerate all modes from all variable collections, (2) for each mode, resolve all bound variables on the target node, (3) run contrast checks, token compliance, and other color-dependent rules against each mode's resolved values, (4) aggregate results per mode. The challenge is performance: a component with 50 nodes, 5 modes = 250 resolution passes. Mitigatable by only resolving color variables (not spacing/sizing, which typically do not vary across themes).

**Moat strength:** STRONG. Requires deep Variable API integration + multi-pass analysis architecture.

---

### Feature 4: Component API Quality Linting

**What it is:** Analyze a component's property structure (variants, booleans, instance swaps, text props) and flag API design problems: too many boolean props (creates 2^n combinations), inconsistent variant naming, missing descriptions, duplicate functionality between variants and booleans, unpublished components with instances.

**Why no competitor has it:** All linters check how components are USED. No tool validates how components are DESIGNED. This is "linting the linter's source" -- ensuring the design system's building blocks are well-constructed.

**Evidence:**
- Competitive analysis Section 3.9: "No tool validates whether a component's API is well-designed -- e.g., 'This component has 14 boolean props, which is a usability problem for consumers'"
- Pain point research Section 2.2: "High detachment can signal: components too rigid, gaps in the library"
- Figma API research: `componentPropertyDefinitions` exposes full property metadata including type, default value, preferred values, variant options
- Figma API: `exposedInstances` and `isExposedInstance` for slot analysis

**Technical feasibility:** HIGH. All data is available through the Plugin API's `componentPropertyDefinitions`. Specific rules:
- Boolean count > 5: warning ("Consider consolidating into variant groups")
- Variant naming inconsistency: check that all variants in a set use consistent property name patterns
- Missing description: `component.description === ''` with `getPublishStatusAsync() === 'CHANGED' || 'UNPUBLISHED'`
- Instance swap without `preferredValues`: warning ("Consumers won't know which components to swap in")
- Component set with single variant: warning ("Consider whether this needs to be a component set")

**Moat strength:** MEDIUM. Rules are not technically difficult, but the insight that component API quality matters is not obvious to most tool builders. First-mover advantage in framing the category.

---

### Feature 5: CI/CD Design Quality Gate via Figma Branch Review

**What it is:** A headless service that runs FigmaLint analysis on a Figma branch when a "ready for dev" webhook fires. Returns pass/fail with detailed findings. Integrates with GitHub Actions, Jira, and Slack. Blocks merge if design quality score drops below a configurable threshold.

**Why no competitor has it:** Stark has Jira integration (filing issues) but no CI/CD quality gate. Chromatic does visual regression testing (screenshot comparison) but not design quality analysis. No tool runs design linting in a headless pipeline triggered by Figma events.

**Evidence:**
- Competitive analysis Section 4.2: "CI/CD Integration -- Webhook or API that runs FigmaLint on Figma branch merge" as Tier 2 differentiator
- Pain point research Section 3.3: "Integration with CI/CD pipelines for automated design QA before handoff" as community feature request
- Pipeline Evaluation Part 3: "Figma branch review gate" listed as blue ocean opportunity
- Figma API: Webhooks V2 (May 2025) support file-level contexts and `DEV_MODE_STATUS_UPDATE` event type. REST API provides file data for headless analysis

**Technical feasibility:** MEDIUM. FigmaLint's backend (Hono + SQLite) can be extended with: (1) Webhook receiver for Figma V2 webhooks (`DEV_MODE_STATUS_UPDATE`), (2) REST API endpoint for headless analysis (fetch file data via Figma REST API, run deterministic rules, optionally run AI review), (3) GitHub Actions integration (post results as PR comment or check status), (4) Slack/Teams webhook for notifications. The main challenge is that the Figma REST API does not provide the full computed node tree (it is simplified JSON). Some lint rules that depend on `getStyledTextSegments()` or `resolveForConsumer()` would not run headlessly. Mitigation: run deterministic-only rules in headless mode (token compliance, naming, structure); flag for human review when AI analysis is needed.

**Moat strength:** STRONG. Requires backend infrastructure, Figma webhook integration, and CI/CD toolchain knowledge. Most design tool companies do not have engineering DNA; most engineering tool companies do not understand design quality.

---

## Appendix: Evidence Cross-Reference Table

| Claim | Primary Source | Supporting Sources |
|-------|---------------|-------------------|
| 46.3% design-code inconsistency | UXTools 2024 (n=2,220) | Zeplin handoff data, Figma 2025 collaboration report |
| 4-8 hrs/week lost to handoff | Zeplin industry data | UXTools survey, Figma State of Designer 2026 |
| Component detachment within 6 weeks | Design system governance research | UXPin, Netguru, Supernova analysis |
| 30-40% WCAG automated coverage | Industry consensus | TestParty, Uxia, AllAccessible analysis |
| 50-75% AI accuracy for UX evaluation | Baymard research | NNGroup validation study |
| Plugin abandonment: 5-min setup issue | Plugin ecosystem analysis | Fig Stats data, Product Hunt reviews |
| European Accessibility Act June 2025 | EU regulatory source | AllAccessible compliance guide |
| Fix cost escalation 1x/5-10x/30-100x | Industry standard | CODE Magazine, HubSpot design debt research |
| Only 32% trust AI output quality | Figma 2025 AI Report (n=2,500) | State of AI in Design 2025 |
| 20-30% project time on QA | Industry standard | Eleken, HubSpot QA guides |

---

**Prepared by:** UX Researcher Agent
**Date:** 2026-03-13
**Next steps:**
1. Wire existing but hidden fix types (P0, 8-12 hours)
2. Implement summary-first UI hierarchy (P0, 8-12 hours)
3. Add design system configuration UI surface (P1, 8-12 hours)
4. Build Design Debt Score trending (P1, 16-24 hours)
5. Develop Three-Layer "Why + How" per finding (P2, 12-16 hours)
