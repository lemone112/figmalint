# Figma API & Plugin Capabilities Research (2024-2025)

**Research Date:** 2026-03-13
**Scope:** Plugin API, REST API, Widget API, AI features, advanced patterns
**Purpose:** Understand what is technically possible for advanced design tooling (linting, analytics, automation)

---

## 1. Figma Plugin API Updates (2024-2025)

### 1.1 Variables API (Major Expansion)

The Variables API is the most significant area of growth. It now supports the full lifecycle of design tokens within Figma.

#### `figma.variables` Global Object - All Methods

**Retrieval:**
| Method | Returns | Notes |
|--------|---------|-------|
| `getVariableByIdAsync(id)` | `Promise<Variable \| null>` | Preferred async version |
| `getVariableCollectionByIdAsync(id)` | `Promise<VariableCollection \| null>` | |
| `getLocalVariablesAsync(type?)` | `Promise<Variable[]>` | Optional filter by `VariableResolvedDataType` |
| `getLocalVariableCollectionsAsync()` | `Promise<VariableCollection[]>` | |

**Creation:**
| Method | Returns | Notes |
|--------|---------|-------|
| `createVariable(name, collection, resolvedType)` | `Variable` | Types: `BOOLEAN`, `FLOAT`, `STRING`, `COLOR` |
| `createVariableCollection(name)` | `VariableCollection` | |
| `createVariableAlias(variable)` | `VariableAlias` | For binding variables to other variables |
| `createVariableAliasByIdAsync(variableId)` | `Promise<VariableAlias>` | Async version |

**Binding Helpers:**
| Method | Returns | Notes |
|--------|---------|-------|
| `setBoundVariableForPaint(paint, field, variable)` | `SolidPaint` | Pass `null` to unbind |
| `setBoundVariableForEffect(effect, field, variable)` | `Effect` | |
| `setBoundVariableForLayoutGrid(grid, field, variable)` | `LayoutGrid` | |

**Library / Extended Collections (NEW 2025):**
| Method | Returns | Notes |
|--------|---------|-------|
| `importVariableByKeyAsync(key)` | `Promise<Variable>` | Import from team library |
| `extendLibraryCollectionByKeyAsync(collectionKey, name)` | `Promise<ExtendedVariableCollection>` | NEW - Schema 2025 |

#### Variable Interface Properties

| Property | Type | Mutable | Notes |
|----------|------|---------|-------|
| `id` | `string` | No | Unique identifier |
| `name` | `string` | Yes | Variable name |
| `description` | `string` | Yes | |
| `remote` | `boolean` | No | Is from library? |
| `key` | `string` | No | For `importVariableByKeyAsync` |
| `variableCollectionId` | `string` | No | Parent collection |
| `resolvedType` | `VariableResolvedDataType` | No | `BOOLEAN`, `FLOAT`, `STRING`, `COLOR` |
| `valuesByMode` | `{ [modeId]: VariableValue }` | No | Raw values per mode (no alias resolution) |
| `codeSyntax` | `{ [platform]: string }` | No | Platforms: `WEB`, `ANDROID`, `iOS` |
| `scopes` | `VariableScope[]` | Yes | Controls where variable appears in UI |
| `hiddenFromPublishing` | `boolean` | Yes | Local variables only |

#### Variable Methods

| Method | Returns |
|--------|---------|
| `setValueForMode(modeId, newValue)` | `void` |
| `resolveForConsumer(consumer: SceneNode)` | `{ value, resolvedType }` |
| `setVariableCodeSyntax(platform, value)` | `void` |
| `removeVariableCodeSyntax(platform)` | `void` |
| `getPublishStatusAsync()` | `Promise<PublishStatus>` |
| `remove()` | `void` |
| `valuesByModeForCollectionAsync(collection)` | `Promise<{ [modeId]: VariableValue }>` |
| `removeOverrideForMode(extendedModeId)` | `void` |

#### VariableScope — Complete List

Controls where a variable appears in Figma's variable picker UI. Supported for `FLOAT`, `STRING`, and `COLOR` types.

```
ALL_SCOPES          // Special: shown everywhere
TEXT_CONTENT         // Text node content
CORNER_RADIUS       // Border radius
WIDTH_HEIGHT         // Dimensions
GAP                  // Auto-layout gap
ALL_FILLS            // Special: all color fill fields
FRAME_FILL           // Frame background
SHAPE_FILL           // Shape fills
TEXT_FILL            // Text color
STROKE_COLOR         // Stroke color
EFFECT_COLOR         // Effect (shadow, blur) color
STROKE_FLOAT         // Stroke width
EFFECT_FLOAT         // Effect numeric values
OPACITY              // Layer opacity
FONT_FAMILY          // Typography (NEW 2024)
FONT_STYLE           // Typography (NEW 2024)
FONT_WEIGHT          // Typography (NEW 2024)
FONT_SIZE            // Typography (NEW 2024)
LINE_HEIGHT          // Typography (NEW 2024)
LETTER_SPACING       // Typography (NEW 2024)
PARAGRAPH_SPACING    // Typography (NEW 2024)
PARAGRAPH_INDENT     // Typography (NEW 2024)
```

**Linting implications:** A plugin can read `variable.scopes` to verify that variables are properly scoped (e.g., a color variable should not be scoped to `FONT_SIZE`). It can also check if nodes are using the correct variable for the correct scope.

### 1.2 Typography Variables (NEW late 2024)

Typography variables were a major 2024 addition:
- Variables can now bind to: font family, font style, font weight, font size, line height, letter spacing, paragraph spacing, paragraph indent
- `node.getStyledTextSegments()` now returns bound variables for text fields
- New `VariableScope` values for all typography properties

### 1.3 Component Properties API

**`componentPropertyDefinitions`** — Available on `ComponentNode`, `ComponentSetNode`, `InstanceNode`:

| Property Type | Values |
|--------------|--------|
| `type` | `VARIANT`, `BOOLEAN`, `TEXT`, `INSTANCE_SWAP` |
| `defaultValue` | Type-dependent default |
| `preferredValues` | `InstanceSwapPreferredValue[]` for INSTANCE_SWAP |
| `variantOptions` | String array for VARIANT type |

**2024 update:** Component properties can now have **bound variables** for their values (Update 102, Nov 2024).

**`exposedInstances`** — Returns all nested instances exposed to an InstanceNode's level.
**`isExposedInstance`** — Boolean indicating if an InstanceNode is marked as exposed.

### 1.4 Dev Mode APIs (NEW 2024)

As of Update 104 (Dec 2024), plugins running in Dev Mode can:
- **Create and edit annotations** programmatically
- **Create measurements** between elements
- **Read/edit rich-text component descriptions** (full rich text, not just plain text)
- **Access all prototyping reactions** through the Plugin API
- **Annotation categories** (April 2025) for structured organization

### 1.5 Text Decoration Properties (NEW Dec 2024)

New TextNode properties:
- `textDecorationStyle`
- `textDecorationOffset`
- `textDecorationThickness`
- `textDecorationColor`
- `textDecorationSkipInk`

### 1.6 Grid Layout Support (NEW mid-2025)

- CSS Grid-style layout with `fr` units and `HUG` sizing
- Grid properties: `gridRowCount`, `gridColumnCount`, gap and sizing
- Grid gap types added to variable-bindable fields

### 1.7 Visual Effects (NEW 2025)

- **Glass effect type** (Update 116, Jul 2025)
- **Noise/Texture effects** with visibility and color properties
- **PATTERN paint type** support
- **Complex stroke properties** including variable-width strokes and stroke caps

### 1.8 Extended Variable Collections (NEW Nov 2025)

- `variableCollection.extend(name)` — Create brand-specific extensions
- `variable.valuesByModeForCollectionAsync(collection)` — Read values across extended collections
- `rootVariableCollectionId` — Navigate to parent collection
- Enterprise feature for multi-brand design systems

### 1.9 Slots (Open Beta, Schema 2025)

Placeholder containers inside components that let you add, edit, and customize instances without detaching. You can specify which instances a slot accepts.

### 1.10 Full Plugin API Update Timeline

| Date | Version | Key Changes |
|------|---------|-------------|
| Apr 2024 | Update 91 | Various improvements |
| Nov 2024 | Update 102 | Variable binding for component properties |
| Dec 2024 | Update 104 | Annotations API, rich-text descriptions, prototyping reactions |
| Apr 2025 | Update 108~ | Annotation categories |
| May 2025 | Update 113 | TypeScript docstrings in type definitions |
| Jun 2025 | Update 114 | Stroke caps, Noise effect colors |
| Jul 2025 | Update 115 | Grid layout properties |
| Jul 2025 | Update 116 | Glass effect, Noise/Texture visibility |
| Aug 2025 | Update 117 | Grid gap variable binding |
| Oct 2025 | Update 118 | `fontStyle` in text segments |
| Oct 2025 | Update 119 | Figma Buzz support |
| Nov 2025 | Update 120 | Grid `HUG` and `fr` units |
| Nov 2025 | Update 121 | Extended variable collections |
| Jan 2026 | Update 122 | `rootVariableCollectionId` for extended collections |
| Jan 2026 | Update 123 | Text on path, transform groups, dynamic strokes |

---

## 2. REST API vs Plugin API — Capability Matrix

### 2.1 Fundamental Differences

| Capability | Plugin API | Widget API | REST API |
|-----------|-----------|-----------|---------|
| **Read file data** | Current file only | Current file only | Any file with permission |
| **Write file data** | Full read/write | Limited | Mostly read-only (exceptions below) |
| **Multi-file access** | No (unless calling REST) | No | Yes, with team key |
| **Requires Figma open** | Yes | Yes (persists on canvas) | No |
| **User interaction needed** | Yes | No (visible to all) | No |
| **Background operation** | No auto-start | Persists on canvas | Yes, fully headless |
| **Comments access** | No | No | Yes (read/write) |
| **Webhooks** | No | No | Yes |
| **OAuth integration** | No | No | Yes |

### 2.2 REST API Write Capabilities (Exceptions)

The REST API is mostly read-only, BUT can write:
- **Comments** and **Comment Reactions**
- **Variables** (create, update, delete)
- **Dev Resources** (links, annotations)

### 2.3 REST API Unique Endpoints

#### Library Analytics (Enterprise only, Feb 2025)

| Endpoint | Path | Data |
|----------|------|------|
| Component Actions | `GET /v1/analytics/libraries/:key/component/actions` | Weekly insertions/detachments |
| Component Usages | `GET /v1/analytics/libraries/:key/component/usages` | Cross-file instance counts |
| Style Actions | `GET /v1/analytics/libraries/:key/style/actions` | Weekly style usage |
| Style Usages | `GET /v1/analytics/libraries/:key/style/usages` | Cross-file style adoption |
| Variable Actions | `GET /v1/analytics/libraries/:key/variable/actions` | Weekly variable usage |
| Variable Usages | `GET /v1/analytics/libraries/:key/variable/usages` | Cross-file variable adoption |

**Parameters:** `group_by` (required: component/style/variable or team/file), `start_date`, `end_date`, `cursor`
**Scope required:** `library_analytics:read`
**Rate limit tier:** Tier 3 (strictest)
**Update frequency:** Daily

#### Version History

| Endpoint | Path | Scope |
|----------|------|-------|
| File Versions | `GET /v1/files/:key/versions` | `file_versions:read` |

Versions ordered by creation time (updated Oct 2024). No dedicated branch diffing endpoint exists.

#### File Metadata (NEW Apr 2025)

| Endpoint | Path | Scope |
|----------|------|-------|
| File Metadata | GET /v1/files/:key/meta | `file_metadata:read` |

Returns metadata without file content (lighter weight).

#### Discovery API (Enterprise Governance+ only, Jun 2025)

Returns text events from files, including user-submitted AI prompts. For governance/compliance.

#### Webhooks V2 (May 2025)

- Now supports **file-level** and **project-level** contexts (was team-only)
- New event type: `DEV_MODE_STATUS_UPDATE`
- New endpoint: `GET /v2/webhooks`

### 2.4 REST API 2025 Permission Model Changes

Granular scopes replaced `files:read`:
- `file_content:read` — File data
- `file_metadata:read` — Metadata only
- `file_versions:read` — Version history
- `library_analytics:read` — Library analytics

Personal Access Tokens now max 90 days (no more non-expiring tokens).

### 2.5 What REST API Cannot Do (Plugin Advantage)

- Cannot traverse the full node tree with computed styles
- Cannot read/write to individual node properties
- Cannot bind variables to nodes
- Cannot create/modify components in place
- Cannot access prototyping reactions
- Cannot read `getStyledTextSegments()` data
- Cannot read the resolved value of a variable for a specific consumer node

---

## 3. Config 2024 + Config 2025 + Schema 2025 Announcements

### 3.1 Config 2024 (June 2024)

| Feature | Description | API Impact |
|---------|-------------|------------|
| **Figma AI** | Make Designs (text-to-UI), Visual Search, Automated Actions | No public API yet |
| **UI3** | Complete interface redesign | Plugin UI may need updates |
| **Dev Mode GA** | Ready for Dev View, Focus View | Dev Mode plugin APIs |
| **Code Connect** | Maps component code to Figma components | Dev Mode extension point |
| **Figma Slides** | Presentation tool | `figma.editorType` can return `slides` |

### 3.2 Config 2025 (May 2025)

| Feature | Description | API Impact |
|---------|-------------|------------|
| **Figma Sites** | Design-to-website without leaving Figma | New editor type |
| **Figma Make** | Prompt-to-code for animations/interactions | React component import |
| **Figma MCP Server** | AI tools can read Figma design data via MCP | 3 tools: code context, images, variables |
| **Code Connect UI** | Visual GitHub repo connection + AI code suggestions | No plugin API yet |
| **GitHub Copilot integration** | Push/pull between Figma and VS Code | Via MCP server |

### 3.3 Schema 2025 (October 2025 — Design Systems Conference)

| Feature | Status | API Impact |
|---------|--------|------------|
| **Check Designs (linter)** | Early Access (Org/Enterprise) | Figma's native linting — direct competitor to third-party lint plugins |
| **Extended Collections** | GA (Enterprise) | `extendLibraryCollectionByKeyAsync()`, multi-brand theming |
| **Slots** | Open Beta | Flexible component customization without detach |
| **Code Connect UI** | GA | AI-powered code file mapping |
| **Variable Mode Limits** | GA | Pro: 10 modes, Org: 20 modes per collection |
| **Design Systems Architecture Rewrite** | GA | Faster instance updates across complex files |
| **Figma Make + NPM Import** | GA | Production React components in prototypes |
| **Make Kits** | Early Access | Generate React/CSS from design components |

### 3.4 Figma MCP Server (Sept 2025 beta, Oct 2025 GA)

Three tools exposed:
1. **Code context** — Structured node tree, layout constraints, design tokens, variant info
2. **Images** — Rendered assets from selections
3. **Variable definitions** — Token values and structure

Available on all plans. Rate limits based on seat tier.

---

## 4. Advanced Plugin Patterns

### 4.1 Plugin Architecture

**Two-context model:**
1. **Main thread (sandbox)** — Access to Figma scene/document, no browser APIs, runs in Realms sandbox
2. **iframe** — Full browser APIs, DOM, no direct scene access, created via `figma.showUI()`
3. **Communication:** Message passing between the two contexts via `figma.ui.postMessage()` and `window.parent.postMessage()`

### 4.2 Network Requests

**Manifest configuration:**
```json
{
  "networkAccess": {
    "allowedDomains": ["api.example.com"],
    "reasoning": "Sync design data with backend",
    "devAllowedDomains": ["http://localhost:3000"]
  }
}
```

**Key constraints:**
- Plugin iframes have `null` origin — can only call APIs with `Access-Control-Allow-Origin: *`
- Domains must be whitelisted in manifest
- Fetch API available directly (no need for iframe workaround anymore)
- CSP enforced on unlisted domains

**Workaround for CORS:** Use a proxy server that adds `Access-Control-Allow-Origin: *` headers.

### 4.3 Real-time Monitoring Patterns

Plugins cannot auto-start or run in the background. Patterns used by top plugins:

1. **Event listeners while running:**
   - `figma.on('selectionchange', callback)` — Selection changes
   - `figma.on('currentpagechange', callback)` — Page navigation
   - `figma.on('documentchange', callback)` — Any document modification
   - `figma.on('close', callback)` — Plugin close
   - `figma.on('run', callback)` — Plugin command run

2. **Keep-alive pattern:** Plugin stays open showing UI, monitoring changes via `documentchange` events

3. **Widget alternative:** Widgets persist on canvas, visible to all users, can react to interactions

4. **External polling:** REST API from external service polling file changes on interval

### 4.4 Multi-file / Multi-page Analysis

**Plugin limitations:**
- Can only access current file
- Pages load on-demand (good for performance with large files)
- To analyze across files: plugin must call REST API from within iframe

**Page traversal:**
```typescript
// Pages load on-demand
for (const page of figma.root.children) {
  await page.loadAsync() // Load page data
  // Now traverse page.children
}
```

**REST API for multi-file:**
```
GET /v1/files/:file_key — Full file data
GET /v1/files/:file_key/nodes?ids=x,y,z — Specific nodes
GET /v1/teams/:team_id/components — Team components across files
```

### 4.5 Plugin Performance Best Practices

1. **Lazy page loading** — Only load pages you need with `page.loadAsync()`
2. **Batch operations** — Group reads/writes to minimize redraws
3. **Async methods** — Use async versions of all variable/node methods
4. **Node filtering** — Use `figma.currentPage.findAll()` with type filters
5. **Limit traversal depth** — Don't recurse into every nested instance unless needed
6. **Message batching** — Batch postMessage calls between main thread and iframe
7. **Client storage** — `figma.clientStorage` for caching analysis results

### 4.6 Plugin-to-External-Service Communication Patterns

1. **Direct fetch from plugin main thread** — Simple API calls
2. **iframe fetch** — For APIs that need browser features
3. **WebSocket from iframe** — Real-time bidirectional communication (e.g., Figma Desktop Bridge pattern)
4. **REST API callback** — Plugin triggers analysis, polls for results
5. **postMessage bridge** — iframe talks to external service, relays to main thread

---

## 5. Design Linting Capabilities — What Exists and What's Missing

### 5.1 What Plugin API Already Enables for Linting

| Linting Capability | API Support | How |
|-------------------|-------------|-----|
| **Color consistency** | Full | Read fills/strokes, check against variables via `boundVariables` |
| **Typography consistency** | Full (2024+) | `getStyledTextSegments()` with bound variables, check font/size/weight |
| **Spacing/gap consistency** | Full | Read auto-layout gap, padding, check against float variables |
| **Component usage** | Full | Traverse nodes, check `type === 'INSTANCE'`, verify `mainComponent` |
| **Detached instances** | Partial | Check for frames that were formerly instances (heuristic) |
| **Variable binding audit** | Full | Check if nodes use variables vs hard-coded values |
| **Variable scope validation** | Full | Read `variable.scopes`, verify correct usage |
| **Code syntax completeness** | Full | Check `variable.codeSyntax` for WEB/ANDROID/iOS |
| **Naming conventions** | Full | Read `node.name`, `variable.name`, regex validation |
| **Layer structure** | Full | Full node tree traversal |
| **Auto-layout usage** | Full | Check `layoutMode`, `primaryAxisAlignItems`, etc. |
| **Constraint consistency** | Full | Read `constraints` on all nodes |
| **Effect consistency** | Full | Read effects, check against variables |
| **Component property validation** | Full | Read `componentPropertyDefinitions` |
| **Description completeness** | Full (2024+) | Rich-text component descriptions |
| **Publishing status** | Full | `variable.getPublishStatusAsync()`, etc. |

### 5.2 What Figma's Native "Check Designs" Does (Competitor)

- Surfaces hard-coded values that should be variables
- AI suggests the correct variable to use in context
- Triggered manually or on "Ready for Dev" status change
- Currently Early Access (Org/Enterprise only)

**Gap opportunity for third-party linting plugins:**
- "Check Designs" focuses on variable alignment only
- Does not cover naming conventions, component structure, accessibility
- Does not produce reports or dashboards
- No custom rules engine
- No CI/CD integration
- No historical tracking

### 5.3 What Doesn't Exist Yet (Opportunities)

| Capability | Status | Potential Approach |
|-----------|--------|-------------------|
| **Design system health dashboard** | No native solution | REST API analytics + plugin-collected data -> external dashboard |
| **Automated component migration** | No API | Plugin could find deprecated instances, suggest replacements |
| **Version-to-version comparison** | REST API versions exist, no diff | Snapshot node tree at versions, diff externally |
| **Team-level design metrics** | REST API analytics (Enterprise) | Aggregate Library Analytics API data |
| **Real-time lint-on-change** | Possible with `documentchange` | Plugin listens for changes, runs lint rules incrementally |
| **Cross-file lint consistency** | Not in Plugin API alone | Hybrid: REST API for file list + Plugin API per file |
| **Branch comparison** | REST API has branches, no diff | Snapshot + compare approach |
| **Accessibility audit** | No native (beyond contrast) | Plugin reads colors, sizes, spacing -> WCAG checks |
| **Design token drift detection** | Possible now | Compare variable values/scopes across collections |
| **Custom rule engine** | Not native | Plugin with configurable rules, stored in `clientStorage` or fetched from server |

---

## 6. Figma AI Features — Overlap and Complement Analysis

### 6.1 Figma's AI Features (Current)

| Feature | Description | Overlap with Linting |
|---------|-------------|---------------------|
| **Make Designs** | Text-to-UI generation | None — creates new designs |
| **Visual Search** | Find similar designs by image | Low — discovery, not validation |
| **Automated Actions** | Rename layers, rewrite text, generate images | Medium — auto-rename could conflict with naming rules |
| **Check Designs** | Variable alignment suggestions | **HIGH** — directly overlaps variable linting |
| **Code Connect AI** | Suggest code file mappings | Low — developer-facing |
| **MCP Server** | Expose design data to AI tools | **Complementary** — can feed data to external AI lint |

### 6.2 Where AI Complements a Linting Plugin

1. **AI-suggested fixes:** A linting plugin identifies issues; AI suggests the best fix (which variable, which component)
2. **Natural language rules:** Users describe lint rules in plain English; AI translates to executable checks
3. **Pattern learning:** AI learns team's design patterns and flags deviations
4. **MCP integration:** External AI reads design via MCP, applies lint rules from a codebase

### 6.3 Where Linting Plugin Adds Value Beyond AI

1. **Deterministic rules:** AI suggestions can be wrong; lint rules are consistent and predictable
2. **CI/CD enforcement:** AI features are interactive; lint can run in pipelines via REST API
3. **Custom team standards:** AI uses generic best practices; lint enforces team-specific rules
4. **Historical tracking:** AI is point-in-time; lint can track compliance over time
5. **Accountability:** Lint produces auditable reports; AI suggestions are ephemeral
6. **Speed:** Rule-based checks are instant; AI requires inference time

---

## 7. Key Technical APIs for a Design Linting Plugin

### 7.1 Essential Plugin API Methods

```typescript
// Document traversal
figma.root.children                    // All pages
page.loadAsync()                       // Load page on demand
page.findAll(predicate)                // Find nodes matching criteria
page.findAllWithCriteria({ types })    // Find by node type
node.children                          // Direct children
node.parent                            // Parent node

// Selection & events
figma.currentPage.selection            // Current selection
figma.on('selectionchange', cb)        // Selection change
figma.on('documentchange', cb)         // Any document change
figma.on('currentpagechange', cb)      // Page change

// Variables
figma.variables.getLocalVariablesAsync()
figma.variables.getLocalVariableCollectionsAsync()
variable.scopes                        // Where variable can be used
variable.codeSyntax                    // Code mapping
variable.valuesByMode                  // Values per mode
variable.resolveForConsumer(node)      // Resolved value for node
node.boundVariables                    // Variables bound to node

// Components
node.mainComponent                     // Source component (on instances)
node.componentPropertyDefinitions      // Component property definitions
node.componentProperties               // Current property values
node.exposedInstances                  // Exposed nested instances
node.type                              // 'COMPONENT', 'INSTANCE', 'COMPONENT_SET'
node.isExposedInstance                 // Is this exposed?

// Text
textNode.getStyledTextSegments([...])  // Styled segments with bound variables
textNode.fontName                      // Font family + style
textNode.fontSize                      // Size
textNode.lineHeight                    // Line height

// Styling
node.fills                             // Fill paints
node.strokes                           // Stroke paints
node.effects                           // Effects (shadow, blur)
node.opacity                           // Layer opacity
node.cornerRadius                      // Border radius

// Layout
node.layoutMode                        // AUTO_LAYOUT direction
node.primaryAxisAlignItems             // Main axis alignment
node.counterAxisAlignItems             // Cross axis alignment
node.paddingTop/Right/Bottom/Left      // Padding
node.itemSpacing                       // Gap between items

// Storage
figma.clientStorage.getAsync(key)      // Persistent local storage
figma.clientStorage.setAsync(key, val) // Save data locally

// UI
figma.showUI(html, options)            // Show plugin UI
figma.ui.postMessage(msg)              // Send to UI
figma.ui.onmessage = handler           // Receive from UI
```

### 7.2 Essential REST API Endpoints (for dashboards/CI)

```
GET /v1/files/:key                              // Full file data
GET /v1/files/:key/nodes?ids=...                // Specific nodes
GET /v1/files/:key/styles                       // File styles
GET /v1/files/:key/variables/local              // Local variables
GET /v1/files/:key/variables/published          // Published variables
GET /v1/teams/:team_id/components               // Team components
GET /v1/teams/:team_id/styles                   // Team styles
GET /v1/analytics/libraries/:key/component/*    // Component analytics (Enterprise)
GET /v1/analytics/libraries/:key/style/*        // Style analytics (Enterprise)
GET /v1/analytics/libraries/:key/variable/*     // Variable analytics (Enterprise)
GET /v1/files/:key/versions                     // Version history
POST /v2/webhooks                               // Create webhook
```

---

## 8. Competitive Landscape — Existing Linting Plugins

| Plugin | Approach | Limitations |
|--------|----------|-------------|
| **Design Lint** (destefanis) | Rule-based color/type/spacing checks | No variable awareness, no custom rules |
| **Design System Linter Pro** | Advanced DS compliance checks | Subscription model |
| **FigmaLint** (Southleft) | AI-powered audit for DS compliance, accessibility, dev readiness | External AI dependency |
| **AI Design Reviewer** | AI-based UI/UX + accessibility + linting | Broad scope, less DS-specific |
| **Variable Linter** | Specifically checks variable usage | Narrow scope |
| **Figma's Check Designs** | Native AI variable alignment | Early Access only, limited to variable suggestions |

---

## Sources

- [Figma Plugin API Updates](https://developers.figma.com/docs/plugins/updates/)
- [Figma REST API Changelog](https://developers.figma.com/docs/rest-api/changelog/)
- [Compare Figma APIs](https://developers.figma.com/compare-apis/)
- [figma.variables API Reference](https://developers.figma.com/docs/plugins/api/figma-variables/)
- [Variable Interface](https://developers.figma.com/docs/plugins/api/Variable/)
- [VariableScope Reference](https://www.figma.com/plugin-docs/api/VariableScope/)
- [Working with Variables](https://developers.figma.com/docs/plugins/working-with-variables/)
- [Library Analytics Endpoints](https://developers.figma.com/docs/rest-api/library-analytics-endpoints/)
- [Making Network Requests](https://developers.figma.com/docs/plugins/making-network-requests/)
- [How Plugins Run](https://developers.figma.com/docs/plugins/how-plugins-run/)
- [Config 2024 Recap](https://www.figma.com/blog/config-2024-recap/)
- [Config 2025 Press Release](https://www.figma.com/blog/config-2025-press-release/)
- [Schema 2025 Recap](https://www.figma.com/blog/schema-2025-design-systems-recap/)
- [What's New from Schema 2025](https://help.figma.com/hc/en-us/articles/35794667554839-What-s-new-from-Schema-2025)
- [Figma MCP Server Introduction](https://www.figma.com/blog/introducing-figma-mcp-server/)
- [Figma MCP Server Docs](https://developers.figma.com/docs/figma-mcp-server/)
- [Widget API vs Plugin API](https://www.figma.com/widget-docs/widgets-vs-plugins/)
- [Component Properties API](https://www.figma.com/plugin-docs/api/properties/ComponentPropertiesMixin-componentpropertydefinitions/)
- [Version History Endpoints](https://developers.figma.com/docs/rest-api/version-history-endpoints/)
- [Variables REST API Endpoints](https://developers.figma.com/docs/rest-api/variables-endpoints/)
- [Design Systems and AI MCP](https://www.figma.com/blog/design-systems-ai-mcp/)
- [How Figma Built the Plugin System](https://www.figma.com/blog/how-we-built-the-figma-plugin-system/)
