# FigmaLint Competitive Landscape Analysis
## Design Linting & AI-Powered Design Quality Tools (2025-2026)

*Research Date: March 2026*
*Market Context: Figma $1.05B revenue (2025), 40.65% UI/UX market share, 13M+ MAU*

---

## TABLE OF CONTENTS

1. [Direct Competitor Analysis](#1-direct-competitor-analysis)
2. [Emerging Trends](#2-emerging-trends-in-design-quality-tools)
3. [Top 10 Unmet Needs](#3-top-10-unmet-needs)
4. [Differentiation Strategy](#4-differentiation-strategy-for-figmalint)
5. [Threat Assessment](#5-threat-assessment)
6. [Sources](#sources)

---

## 1. DIRECT COMPETITOR ANALYSIS

### 1.1 Deterministic Linting Tools

#### Design Lint (Daniel Destefanis) -- FREE, Open Source
- **What it does**: Finds missing styles (text, fills, strokes, border radius, effects). Recent update adds auto-fix for missing styles across files. Custom lint rules allow flagging misused color styles, unpublished components, components without descriptions.
- **Strengths**: Free, open-source (forkable -- Discord has a customized version), no accounts/syncing required, lightweight.
- **What FigmaLint does that Design Lint does NOT**:
  - No AI review of any kind
  - No accessibility checks (contrast, touch targets, WCAG)
  - No Gestalt/Fitts's Law analysis
  - No DTCG token compliance
  - No variable system audit
  - No design debt scoring
  - No flow analysis or cognitive walkthrough
  - No responsive/dark mode validation
  - No real-time incremental linting
  - No baseline/diff tracking
  - No spacing or auto-layout checks
- **What Design Lint does that FigmaLint may not**: "Browse styles" tab showing which layers use which style (style inventory view).

#### Roller (Design Linter) -- FREE
- **What it does**: Finds and fixes style inconsistencies. Users create a "Roller Library" of approved styles, and the plugin detects non-matching values and replaces them.
- **Strengths**: Shared team library concept; "fix" flow is well-designed.
- **What FigmaLint does that Roller does NOT**: Everything listed above for Design Lint, plus Roller is limited to colors, text styles, shadows, borders, radiuses only.
- **What Roller does differently**: The "library-first" approach (define approved values, then scan) is a different mental model vs. "detect what's wrong." Some teams prefer the prescriptive approach.

#### Yet Another Design Linter (YADL)
- **What it does**: Design system integrity enforcement. Positioned for teams caring about consistency, scalability, and DS integrity.
- **Limited public documentation** on exact feature set.

#### Design System Linter Pro
- **What it does**: Professional auditing tool that scans Figma files for design system violations and inconsistencies automatically.
- **Limited public documentation** on exact feature set. Appears to be a paid/pro tool.

#### Design System Compliance Checker
- **What it does**: Audits and maintains design system consistency across Figma files.

#### ComponentQA -- FREE (currently)
- **What it does**: Comprehensive design system audit including detached instances, broken components, token violations, style drift, rogue overrides. Provides a single "health score" with history tracking across audits.
- **Strengths**: File-wide or selection-based scanning, prioritized error lists, health score with trend history. Claims 24/7 monitoring capability.
- **What FigmaLint does that ComponentQA does NOT**:
  - No AI review
  - No accessibility beyond style compliance
  - No UX psychology analysis
  - No DTCG compliance
  - No dark mode/responsive validation
  - No copy/tone analysis
- **What ComponentQA does that FigmaLint should note**: The "health score with history" concept -- tracking improvement over time is compelling for design system leads justifying ROI.

#### Figma Native "Check Designs" Linter (2025)
- **What it does**: Matches raw values with corresponding variables when marking designs "ready for dev." Uses a custom ML model to suggest the right variable in context.
- **Strengths**: Built into Figma, zero plugin overhead. Works at the "ready for dev" handoff moment.
- **CRITICAL THREAT**: This is Figma eating into the basic linting value prop. If Figma's native linter covers variable matching, a portion of deterministic lint value erodes.
- **Limitations**: Only fires at "ready for dev" trigger (not real-time). Focused on variable matching, not broader design quality. No accessibility, UX psychology, or AI review.

---

### 1.2 Accessibility-Focused Tools

#### Stark -- PAID ($5-$50/seat/month estimated)
- **What it does**: Comprehensive accessibility suite -- contrast checking with color suggestions, vision simulation (deuteranopia, protanopia, low vision), alt text suggestions, focus order, touch target sizing, typography analysis, landmarks. Covers WCAG 2.1 and 2.2.
- **2025 highlights**: 36 major updates shipped. 16 new features.
- **2026 roadmap**: Native mobile code integrations (iOS/Android), AI code remediation snippets, elevated contrast checking for gradients/images/modern UI elements.
- **Integrations**: Jira, Linear for issue tracking.
- **What FigmaLint does that Stark does NOT**:
  - No general design linting (fills, strokes, effects, radius, spacing)
  - No AI-powered design review (attention, heuristics, cognitive walkthrough)
  - No DTCG compliance
  - No design debt scoring
  - No brand consistency analysis
  - No copy/tone analysis
  - No Gestalt/Fitts's Law
  - No flow analysis
  - No dark mode validation (beyond contrast)
  - No detached instance detection
- **What Stark does that FigmaLint should note**:
  - Vision simulation (color blindness, low vision previews) -- highly visual, emotionally compelling
  - Focus order visualization
  - Landmark annotations
  - Jira/Linear integration for filing issues directly
  - AI-powered code remediation snippets (2026)
  - Gradients and images contrast checking (2026)

#### Contrast Plugin -- FREE
- **What it does**: Instant contrast ratio checking between layers. Checks against WCAG AA and AAA. Simple, focused UX -- select a layer, see ratio immediately.
- **Strengths**: Free, fast, focused. The simplicity is its advantage.
- **What FigmaLint adds**: Everything beyond basic contrast checking.

#### A11y - Color Contrast Checker -- FREE
- **What it does**: Similar to Contrast but with slightly different UI. WCAG compliance checking for foreground/background pairs.

#### Coloracci Dark Mode -- FREE
- **What it does**: Auto-detects light/dark theme, smart color conversion, WCAG contrast validation.
- **Interesting overlap**: Combines dark mode tooling with accessibility, which is a niche FigmaLint also covers.

---

### 1.3 AI-Powered Design Review Tools

#### EXDERA AI Design Analyzer -- FREE
- **What it does**: Visual hierarchy analysis, brand consistency assessment, color palette usage evaluation, typography alignment checking. AI scans for usability issues, CTA effectiveness, content clarity. Runs persona-based mock user research with behavior analysis and conversion optimization insights.
- **Strengths**: Free, covers both visual analysis and persona-based research.
- **What FigmaLint does that EXDERA does NOT**:
  - No deterministic linting (fills, strokes, effects, etc.)
  - No DTCG compliance
  - No design debt scoring
  - No flow analysis across screens
  - No baseline/diff tracking
  - No real-time incremental linting
  - No Fitts's Law or Gestalt-specific analysis
  - No dark mode or responsive validation
  - No detached instance detection
  - No variable system audit
- **What EXDERA does that is noteworthy**: The "persona-based mock user research" feature overlaps directly with FigmaLint's persona-based research via Claude Vision. EXDERA being free makes it a direct price competitor for the AI review portion.

#### ClarityUX -- Pricing unclear
- **What it does**: Unified plugin combining AI design review, design linting, prompt-to-prototype, A/B testing, and predictive heatmaps. Eye-tracking simulation.
- **Strengths**: All-in-one approach (review + lint + heatmap + A/B testing + prototyping). Broad feature surface.
- **What FigmaLint does that ClarityUX does NOT**:
  - No DTCG compliance
  - No variable system audit
  - No design debt scoring
  - No flow analysis
  - No baseline/diff tracking
  - Likely no Gestalt/Fitts's Law specific analysis
  - No dark mode validation
  - No detached instance detection
  - No responsive validation
  - Depth of AI analysis unclear (Nielsen's heuristics, PURE scoring, cognitive walkthrough)

#### PRE: AI Design Review
- **What it does**: Predicts how users will interact with UI designs before code is written. Upload a frame, get behavioral predictions.
- **Strengths**: Pre-implementation user behavior prediction.

#### Attention Insight -- PAID (subscription after 14-day trial)
- **What it does**: Predictive eye-tracking heatmaps, clarity score, focus score, percentage of attention, contrast map, AI recommendations. Uses AI to predict where users look.
- **Strengths**: Strong attention prediction visualization. Clean heatmap output.
- **What FigmaLint does that Attention Insight does NOT**: Everything in deterministic linting, DTCG, design debt, flow analysis, accessibility checks, etc.
- **What Attention Insight does well**: The heatmap visualization is more mature and visually polished than most competitors. Attention prediction is their entire focus.

#### Heuristic Checker (BETA)
- **What it does**: Automatically analyzes Figma designs against UI/UX best practices and accessibility guidelines.
- **Interesting overlap**: Direct competitor to FigmaLint's heuristic evaluation capabilities.

#### Design Checker 4.0
- **What it does**: Design validation with Google Gemini AI integration.
- **Notable**: Uses a different LLM (Gemini) vs. FigmaLint's Claude Vision.

---

### 1.4 Design-to-Code & Handoff Tools

#### Figma Dev Mode -- PAID (included in Figma plans)
- **What it does**: Code snippets (CSS, Swift, Android XML), variable inspection with alias chains, annotations, "Ready for dev" status management, focus view for isolated inspection, version history per selection.
- **2025 additions**: MCP server (GA) for agentic coding tools, Grid layout with CSS Grid/Flexbox code gen, Code Connect UI for GitHub component mapping.
- **Relevance to FigmaLint**: Dev Mode is the handoff checkpoint. FigmaLint linting BEFORE "Ready for dev" is the quality gate upstream.
- **No linting, no AI review, no design quality assessment** -- it is purely a handoff/inspection tool.

#### Figma Design System Analytics -- PAID (Org/Enterprise)
- **What it does**: Library usage trends, component usage tracking (inserts, instances, detachments), styles and variables data (as of Feb 2025), Library Analytics API (Enterprise).
- **Relevance to FigmaLint**: Analytics shows adoption metrics; FigmaLint shows quality metrics. Complementary, not competitive.
- **Does NOT do**: Quality assessment, linting, AI review, compliance checking.

#### Zeplin -- PAID ($0-$79/month)
- **What it does**: Auto-generated measurements, color/text/spacing extraction, code snippets (CSS/iOS/Android/React Native), auto-generated styleguide, Jira/Trello/Slack integration.
- **Status**: Still active but losing share to Figma Dev Mode.
- **Relevance to FigmaLint**: Minimal direct competition. Zeplin is handoff-focused, not quality-focused.

#### Avocode -- DISCONTINUED (acquired by Ceros, sunsetted)
- **No longer a competitive factor.**

#### Anima -- PAID
- **What it does**: Design-to-code (HTML/CSS, React, Vue, Tailwind, Styled Components, SCSS/SASS). AI Playground (beta) with live code editing alongside Figma design. Responsive layout detection.
- **Relevance to FigmaLint**: Indirect competitor only. Anima generates code; FigmaLint validates design quality. Potential integration opportunity -- lint before export.

#### Locofy -- PAID
- **What it does**: Design-to-code using Large Design Models (React, React Native, Next.js, HTML/CSS, Flutter, Vue, Angular). Element tagging for semantic code generation. Locofy Builder for code refinement before GitHub push.
- **Relevance to FigmaLint**: Same as Anima. Code quality downstream depends on design quality upstream. FigmaLint as the "pre-export quality gate" is a positioning opportunity.

#### Applitools Eyes (Figma Plugin) -- PAID (Enterprise)
- **What it does**: Visual AI comparison of Figma designs vs. code implementations. Design-to-design comparison (version diffing). Visual baselines from Figma frames. Named "Strong Performer" in Forrester Wave Autonomous Testing Platforms Q4 2025.
- **What FigmaLint does that Applitools does NOT**: Everything in design-time linting and AI review. Applitools operates post-implementation.
- **What Applitools does that is unique**: Design-to-code visual comparison (Figma frame vs. rendered UI). This is a gap FigmaLint does not currently fill.
- **Potential integration**: FigmaLint + Applitools = end-to-end quality (design-time lint + implementation-time visual validation).

---

### 1.5 Design Token Management Tools

#### Tokens Studio -- FREE (core) + PAID (Pro)
- **What it does**: Define and manage design tokens in Figma (colors, typography, spacing, borders, shadows). Multi-theme management (light/dark, multi-brand). Graph Engine (2025) -- visual logic editor for token rules, transformations, conditions. Cross-platform (Figma, Penpot, GitHub, VS Code, Framer). DTCG format support.
- **Relevance to FigmaLint**: FigmaLint's DTCG compliance checking and variable system audit operate in the same space. Tokens Studio MANAGES tokens; FigmaLint AUDITS token usage. Complementary.

#### Supernova -- PAID (Enterprise)
- **What it does**: Design system orchestration platform. Token management with automated pipelines to GitHub/GitLab/Bitbucket/Azure DevOps. Multi-brand support. Documentation generation. Connects Figma + GitHub + Jira.
- **Relevance to FigmaLint**: Supernova is the "enterprise design ops platform." FigmaLint is the "quality gate plugin." Different layers of the stack.

#### Specify, Knapsack, zeroheight
- **Design system documentation/management platforms** that are more about governance and delivery than about real-time design quality validation.

---

## 2. EMERGING TRENDS IN DESIGN QUALITY TOOLS

### 2.1 DTCG Standard Adoption

**Status**: The W3C Design Tokens Community Group published the first stable specification (2025.10) in October 2025. Over 20 organizations contributed (Adobe, Amazon, Google, Microsoft, Meta, Figma, Salesforce, Shopify, etc.). 10+ tools support or are implementing it.

**Figma's native support**: Import/export of variables as DTCG-compliant JSON announced at Schema 2025, available since November 2025.

**Current limitations in Figma's native support**:
- Composite tokens (typography, gradients, shadows) NOT yet supported despite being in the stable spec
- `$extensions` not preserved on round-trip
- `description` field not included in export despite being in the spec and in Figma's UI

**FigmaLint opportunity**: These gaps in Figma's native DTCG support are precisely where FigmaLint's DTCG compliance checking adds value. Validating composite token structure, extension preservation, and spec completeness is a differentiator until Figma catches up.

### 2.2 AI-Powered Design Review (Beyond Linting)

**Market state**: The space is fragmenting rapidly. Multiple new plugins appeared in 2024-2025:
- EXDERA (visual hierarchy + persona research)
- ClarityUX (review + heatmaps + A/B + prototype gen)
- PRE (behavioral prediction)
- Attention Insight (eye-tracking heatmaps)
- Heuristic Checker (best-practice analysis)
- Design Checker 4.0 (Gemini-powered)
- Flawless (full-page AI audit for websites)
- onBeacon (GPT-5 + Claude-powered, behavioral science)
- UX-Ray by Baymard (207 heuristics, 95% accuracy for e-commerce)

**Key insight**: Most AI review tools are shallow -- they take a screenshot and run a generic LLM prompt. FigmaLint's structured approach (Nielsen's heuristics, cognitive walkthrough, PURE scoring, Gestalt, Fitts's Law) is methodologically stronger. However, the market may not differentiate "deep" from "shallow" AI analysis without clear demonstration.

**Accuracy concern**: Baymard's research showed generic AI tools achieve 50-75% accuracy for UX analysis. Their specialized UX-Ray achieves 95% but only for e-commerce and only after extensive heuristic-specific training. FigmaLint should benchmark and publish its accuracy rates.

### 2.3 Design System Governance at Scale

**Enterprise trend**: AI agents are detecting design drift across Figma, Jira, and GitHub before production. Tools like Supernova act as central orchestration hubs.

**Key developments**:
- Figma "Slots" (Schema 2025): Allow controlled customization within instances while maintaining DS compliance
- Figma "Extended Collections" (Schema 2025): Multi-brand design system management with white-labeled base + team extensions
- Figma Code Connect: Direct GitHub mapping of Figma components with AI-suggested code files
- ComponentQA: 24/7 monitoring with health scores and trend tracking

**FigmaLint opportunity**: The governance space needs quality metrics, not just usage metrics. Figma's analytics tell you HOW MUCH the design system is used. FigmaLint can tell you HOW WELL it is used -- quality vs. quantity.

### 2.4 Accessibility Automation (WCAG 2.2)

**Regulatory pressure**: European Accessibility Act in force since June 28, 2025. Ongoing ADA litigation in the US. Accessibility is no longer optional.

**Automation ceiling**: Automated tools detect approximately 40% of WCAG 2.2 issues. Manual testing still required for focus visibility, consistent help, redundant entry, and authentication.

**Stark's 2026 push**: Native mobile code integrations, AI code remediation, gradient/image contrast checking.

**FigmaLint opportunity**: Most accessibility tools check contrast and touch targets. Few tools validate at the DESIGN stage (before code) for WCAG 2.2 criteria like 2.5.8 (Target Size), 3.2.6 (Consistent Help), or 3.3.7 (Redundant Entry). FigmaLint's design-time accessibility checking can catch issues BEFORE they become expensive code fixes.

### 2.5 Design-to-Code Quality Bridges

**The gap persists**: Despite Figma MCP, Code Connect, and design-to-code tools, LLMs still struggle to bridge visual information with component properties. Designs using tokens where the LLM cannot infer the right variant remain problematic.

**Key tools**:
- Figma MCP Server (GA): Brings design context to coding agents (VS Code, Cursor, Windsurf, Claude)
- Applitools Eyes: Visual AI comparison of Figma vs. rendered UI
- Drop Design System: Automated visual validation against Figma designs

**FigmaLint opportunity**: "Pre-flight check for design-to-code" -- validate that a design is clean, token-compliant, and structurally sound BEFORE it enters the MCP/code generation pipeline. Garbage in, garbage out. FigmaLint ensures it is NOT garbage in.

### 2.6 DesignOps and CI/CD for Design

**Emerging pattern**: Token pipelines (Supernova, Tokens Studio, Specify) trigger on token update, push to GitHub/GitLab, generate platform-specific code. Visual regression testing with Figma branches.

**FigmaLint opportunity**: CI/CD for design needs a quality gate. Just as code pipelines have linters (ESLint, Prettier), design pipelines need FigmaLint. Integration with Figma branching, "ready for dev" workflow, and token pipelines is the path.

---

## 3. TOP 10 UNMET NEEDS

These are needs that NO tool adequately addresses as of March 2026:

### 3.1 Cross-Screen Flow-Level Quality Validation
**Gap**: Every existing linter works frame-by-frame. No tool validates consistency ACROSS a multi-screen flow -- e.g., "Does the error state on Screen 3 use the same pattern as Screen 7?" or "Is the navigation model consistent across all 12 screens?"
**FigmaLint's position**: Flow analysis is listed as a capability. If it truly validates cross-screen consistency patterns, this is unique.

### 3.2 Design Debt Quantification with Actionable Prioritization
**Gap**: ComponentQA has a "health score" but it is limited to style compliance. No tool provides a holistic "design debt score" that weights severity, impact, fix cost, and produces a prioritized remediation backlog.
**FigmaLint's position**: Design debt scoring is a stated capability. If it includes prioritized remediation, this is category-defining.

### 3.3 Pre-Implementation WCAG 2.2 Compliance Beyond Contrast
**Gap**: Stark checks contrast, touch targets, focus order. But WCAG 2.2 introduced criteria like Consistent Help (3.2.6), Redundant Entry (3.3.7), and Accessible Authentication (3.3.8) that require understanding user FLOWS, not just individual frames. No design-stage tool validates these.
**FigmaLint's position**: If flow analysis + accessibility checks cover these criteria, this is a significant differentiator.

### 3.4 Design-to-Code Fidelity Prediction
**Gap**: Applitools compares AFTER code is written. No tool predicts at design time whether a design will translate cleanly to code -- e.g., "This layout will be hard to implement in CSS Grid" or "This auto-layout nesting is too deep for clean component structure."
**FigmaLint's position**: Not currently addressed. Significant whitespace opportunity.

### 3.5 Multi-Brand/Multi-Theme Validation in a Single Pass
**Gap**: With Figma's Extended Collections (Schema 2025), multi-brand design systems are proliferating. No tool validates that a design works correctly across ALL themes/brands simultaneously -- e.g., "This component works in Light Brand-A but breaks contrast in Dark Brand-B."
**FigmaLint's position**: Dark mode validation is a stated capability. Multi-brand/multi-theme expansion would be unique.

### 3.6 Automated Design Review with Regulatory Compliance Mapping
**Gap**: European Accessibility Act, ADA, Section 508, EN 301 549 -- organizations need to map design issues to specific regulatory requirements. No design tool generates compliance-ready audit trails with regulation references.
**FigmaLint's position**: Not currently addressed. High-value enterprise opportunity.

### 3.7 Real-Time Collaborative Design Quality Dashboard
**Gap**: Designers work simultaneously. No tool provides a live dashboard showing design quality metrics across a team's files in real-time -- like a "build status" monitor for design.
**FigmaLint's position**: Real-time incremental linting exists. A team-level dashboard layer would be new to market.

### 3.8 Intelligent Copy/Content Quality Beyond Tone
**Gap**: FigmaLint does copy/tone analysis. But no tool validates content quality at scale -- reading level, translation readiness, terminology consistency with a glossary, placeholder text detection ("Lorem ipsum" in production frames), truncation risk at different viewport sizes.
**FigmaLint's position**: Copy/tone is a stated capability. Extending to content quality validation would fill a gap.

### 3.9 Component API Quality Linting
**Gap**: Design system components have an "API" (props, variants, slots). No tool validates whether a component's API is well-designed -- e.g., "This component has 14 boolean props, which is a usability problem for consumers" or "This variant set has inconsistent naming."
**FigmaLint's position**: Not explicitly addressed. Would appeal to design system teams.

### 3.10 Historical Quality Trends with Predictive Alerts
**Gap**: ComponentQA tracks health score history. But no tool uses historical data to PREDICT quality degradation -- e.g., "Detachment rate is increasing 15% month-over-month; you'll hit critical drift in 6 weeks."
**FigmaLint's position**: Baseline/diff tracking is a stated capability. Predictive alerting would be a premium feature.

---

## 4. DIFFERENTIATION STRATEGY FOR FIGMALINT

### 4.1 Current Unique Advantages (What No Single Competitor Matches)

1. **Breadth + Depth in one plugin**: FigmaLint is the ONLY tool combining deterministic linting (13+ categories), AI vision review (6+ methodologies), token compliance, and design debt scoring. Every competitor does a subset.

2. **Structured AI methodology**: Claude Vision with explicit frameworks (Nielsen's heuristics, cognitive walkthrough, PURE scoring, Gestalt, Fitts's Law) vs. competitors' generic "AI review" prompts.

3. **DTCG token compliance**: With Figma's native DTCG support still incomplete (no composite tokens, no extensions, no descriptions in export), FigmaLint's compliance checking fills a real gap.

4. **Real-time incremental linting**: Most linters are batch operations. Real-time feedback as you design is a significant UX advantage.

5. **Baseline & diff tracking**: The ability to compare current state vs. a baseline and track changes over time is unique among Figma linting tools.

6. **Dark mode + responsive validation**: Checking that designs work across themes AND breakpoints is rare. Most tools check one or the other.

### 4.2 Recommended Differentiators to Build/Strengthen

**Tier 1 -- High Impact, Achievable (6 months)**

1. **Quality Score Dashboard with Trend Lines**: Extend design debt scoring into a visual dashboard with historical trends. ComponentQA's "health score" proves demand. FigmaLint should own this with richer metrics.

2. **Regulatory Compliance Mapping**: Map accessibility findings to specific WCAG 2.2 criteria, EAA articles, ADA requirements. Generate PDF audit trails. Enterprise buyers need this for legal compliance.

3. **Flow-Level Validation Marketing**: If flow analysis already works across screens, this needs to be the #1 marketed differentiator. No competitor does this. Lead with it.

4. **Accuracy Benchmarking**: Publish accuracy rates for AI review against Baymard's methodology. If FigmaLint can demonstrate 85%+ accuracy on heuristic detection, it puts it in rare company.

**Tier 2 -- Strategic, Medium-Term (6-12 months)**

5. **Design-to-Code Readiness Score**: Predict how cleanly a design will translate to code. Check for auto-layout best practices, token usage completeness, responsive behavior, semantic naming. Output: "This design is 87% code-ready."

6. **Multi-Theme Simultaneous Validation**: Leverage Figma's Extended Collections to validate a design across all theme modes in one pass. "Your design passes in 4/5 themes. Brand-B Dark fails contrast on 3 elements."

7. **CI/CD Integration**: Webhook or API that runs FigmaLint on Figma branch merge or "ready for dev" status change. Returns pass/fail with details. Integrates with GitHub Actions, Jira.

8. **Jira/Linear Issue Filing**: One-click file individual lint findings as Jira/Linear tickets. Stark has this. It is table stakes for enterprise.

**Tier 3 -- Visionary, Long-Term (12-18 months)**

9. **Component API Linting**: Analyze component structure for API quality (prop count, variant naming, slot usage, override complexity). Help DS teams build better components, not just use them correctly.

10. **Predictive Quality Alerts**: Use historical baseline data to forecast quality degradation. "At current trajectory, your file will drop below 80% compliance in 4 weeks."

### 4.3 Positioning Statement

**Current market gap FigmaLint fills**: "Every design linter checks individual styles. Every AI tool gives generic feedback. FigmaLint is the only tool that combines deterministic precision with structured AI methodology to validate entire design flows against real UX science -- Fitts's Law, Gestalt principles, Nielsen's heuristics, WCAG 2.2, DTCG compliance, and design system governance -- in real-time, with historical tracking."

**One-line positioning**: "The design quality platform that catches what human reviewers miss and what generic AI cannot find."

---

## 5. THREAT ASSESSMENT

### 5.1 HIGH Threat

| Threat | Source | Timeline | Mitigation |
|--------|--------|----------|------------|
| Figma native linting expansion | Figma "Check Designs" | 6-18 months | Move up the value stack (AI review, flow analysis, compliance). Basic variable matching will be commoditized. |
| Stark adding design linting | Stark's 2026 roadmap | 12 months | Stark is accessibility-first. Beat them on breadth (design quality beyond a11y). |
| Free AI review tools (EXDERA) | Price pressure | Now | Compete on depth and accuracy, not price. Publish accuracy benchmarks. |

### 5.2 MEDIUM Threat

| Threat | Source | Timeline | Mitigation |
|--------|--------|----------|------------|
| ClarityUX as all-in-one | Feature bundling | 6-12 months | ClarityUX is breadth without depth. Win on methodology rigor and accuracy. |
| Figma Design System Analytics expansion | Figma | 12-18 months | Analytics = usage metrics. FigmaLint = quality metrics. Position as complementary. |
| ComponentQA feature expansion | Health score + monitoring | 6-12 months | ComponentQA is deterministic only. AI review is the moat. |

### 5.3 LOW Threat (but monitor)

| Threat | Source | Timeline | Mitigation |
|--------|--------|----------|------------|
| Baymard UX-Ray expanding to design tools | Currently URL/screenshot only | 18+ months | 95% accuracy is impressive but domain-specific (e-commerce). FigmaLint is universal. |
| Applitools adding design-time features | Currently post-implementation only | 12-18 months | Different point in the workflow. Partner rather than compete. |
| Figma Make/Buzz AI cannibalizing plugin market | Figma platform | 12-24 months | Generation tools, not validation tools. Different use case. |

---

## SOURCES

### Competitor & Tool Pages
- [Design Lint by Daniel Destefanis (GitHub)](https://github.com/destefanis/design-lint)
- [Design Lint (Figma Community)](https://www.figma.com/community/plugin/801195587640428208/design-lint)
- [Roller Design Linter (Figma Community)](https://www.figma.com/community/plugin/751892393146479981/roller-design-linter)
- [Yet Another Design Linter (Figma Community)](https://www.figma.com/community/plugin/1496477931536811576/yet-another-design-linter)
- [Design System Linter Pro (Figma Community)](https://www.figma.com/community/plugin/1529389385810433583/design-system-linter-pro)
- [ComponentQA (Figma Community)](https://www.figma.com/community/plugin/1564328602359376130/componentqa-design-system-audit-detached-instances-component-health-monitoring)
- [Stark Accessibility Suite](https://www.getstark.co/figma/)
- [Stark 2026 Roadmap](https://www.getstark.co/blog/new-year-2026/)
- [Contrast Plugin (Figma Community)](https://www.figma.com/community/plugin/748533339900865323/contrast)
- [EXDERA AI Design Analyzer](https://exdera.ai/)
- [ClarityUX (Figma Community)](https://www.figma.com/community/plugin/1498758216546117553/ai-design-review-accessibility-check-design-linting-prompt-to-prototype-ab-testing-and-heatmaps)
- [PRE: AI Design Review (Figma Community)](https://www.figma.com/community/plugin/1501227113264882797/pre-ai-design-review)
- [Attention Insight](https://attentioninsight.com/)
- [Heuristic Checker BETA (Figma Community)](https://www.figma.com/community/plugin/1462581387114814240/heuristic-checker-beta)
- [Design Checker 4.0 (Figma Community)](https://www.figma.com/community/plugin/1446803626813528380/design-checker)
- [Brand Compliance Check (Figma Community)](https://www.figma.com/community/plugin/1510107734473283360/brand-compliance-check)
- [Design Pulse (Figma Community)](https://www.figma.com/community/plugin/1454479079694504232/design-pulse)
- [Design System Drift Analyzer (Figma Community)](https://www.figma.com/community/plugin/1582210998739586013/design-system-drift-analyzer)
- [Detached Instance Finder (Figma Community)](https://www.figma.com/community/plugin/1596911101440523181/detached-instance-finder)
- [Tokens Studio](https://tokens.studio/)
- [Applitools Eyes Figma Plugin](https://applitools.com/solutions/figma/)
- [Zeplin](https://zeplin.io/)
- [Anima](https://www.animaapp.com/)
- [Locofy](https://www.locofy.ai/)

### Figma Platform & Announcements
- [Figma Config 2025 Recap](https://www.figma.com/blog/config-2025-recap/)
- [Figma Schema 2025: Design Systems Recap](https://www.figma.com/blog/schema-2025-design-systems-recap/)
- [Figma Dev Mode](https://www.figma.com/dev-mode/)
- [Figma Design System Analytics](https://www.figma.com/blog/introducing-design-system-analytics/)
- [Figma Dev Mode Review 2025](https://skywork.ai/blog/figma-dev-mode-review-2025/)
- [Figma Design Handoff](https://www.figma.com/design-handoff/)
- [Figma AI in Design](https://www.figma.com/resource-library/ai-in-design/)
- [Figma State of the Designer 2026](https://www.figma.com/reports/state-of-the-designer-2026/)
- [Figma Bridging Design and Code Report](https://www.figma.com/reports/bridging-design-and-code/)

### Standards & Specifications
- [DTCG Specification Stable Release (2025.10)](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)
- [W3C Design Tokens Community Group](https://www.w3.org/community/design-tokens/)
- [Style Dictionary DTCG Support](https://styledictionary.com/info/dtcg/)
- [Figma DTCG Native Import/Export Announcement](https://figma.obra.studio/design-tokens-community-group-w3c-release/)
- [DTCG Composite Token Export Figma Forum Discussion](https://forum.figma.com/suggest-a-feature-11/dtcg-composite-token-export-support-51314)

### AI & UX Research
- [Baymard AI Heuristic Evaluations (95% Accuracy)](https://baymard.com/blog/ai-heuristic-evaluations)
- [NNGroup on Baymard AI Accuracy](https://www.nngroup.com/articles/baymard-ai-tool-accuracy/)
- [Baymard GPT UX Audit 80% Error Rate](https://baymard.com/blog/gpt-ux-audit)
- [UX-Ray by Baymard](https://baymard.com/product/ux-ray)
- [Flawless AI Audit](https://flawless.is)

### Market & Industry Analysis
- [Figma Revenue & Market Data (Sacra)](https://sacra.com/c/figma/)
- [Figma Statistics 2026](https://sqmagazine.co.uk/figma-statistics/)
- [Design Token Management Tools 2025 Guide](https://cssauthor.com/design-token-management-tools/)
- [Supernova Enterprise Design Systems 2026](https://www.supernova.io/blog/the-future-of-enterprise-design-systems-2026-trends-and-tools-for-success)
- [WCAG 2.2 Compliance Guide 2025](https://www.allaccessible.org/blog/wcag-22-complete-guide-2025)
- [European Accessibility Act Impact](https://www.allaccessible.org/blog/wcag-22-compliance-checklist-implementation-roadmap)
- [Best Figma AI Plugins 2025](https://www.uxdesigninstitute.com/blog/figma-ai-plugins-you-need-in-2025/)
- [Figma Linting Tools Guide](https://thedesignsystem.guide/knowledge-base/linting-tools-for-figma)
- [Design System Mastery 2025/2026 Playbook](https://www.designsystemscollective.com/design-system-mastery-with-figma-variables-the-2025-2026-best-practice-playbook-da0500ca0e66)
