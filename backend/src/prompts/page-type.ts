/**
 * Page type detection prompt with per-type detection signals.
 * Returns structured JSON with type, confidence, and matched signals.
 */
export const PAGE_TYPE_PROMPT = `Analyze this UI screenshot and determine the page type. Use the detection signals below to match.

## Page Type Detection Rubric

### pricing
Signals: Tiered pricing cards/columns with plan names and dollar amounts; toggle for monthly/annual billing; feature comparison matrix or checklist per tier; "Most popular" or "Recommended" badge on one plan.

### landing
Signals: Large hero section with headline, subheadline, and primary CTA; multiple content sections separated by whitespace; social proof (logos, testimonials, stats); no persistent sidebar navigation.

### dashboard
Signals: Grid of data widgets, charts, or KPI cards; sidebar or top navigation with multiple sections; summary statistics (numbers, percentages, sparklines); date range picker or filter controls.

### onboarding
Signals: Step indicator or progress bar (e.g., "Step 2 of 4"); single-task focus with limited navigation; welcome/setup language ("Get started", "Set up your"); illustration or avatar prompt.

### auth
Signals: Email/username and password input fields; "Sign in" / "Sign up" / "Log in" submit button; "Forgot password?" or "Reset password" link; OAuth/social login buttons (Google, GitHub, etc.).

### settings
Signals: Grouped form controls with section headers (Account, Notifications, Privacy); toggle switches or checkboxes for preferences; "Save" / "Update" button at bottom; sidebar or tab navigation for setting categories.

### profile
Signals: User avatar or photo prominently displayed; user name, bio, or description text; activity feed, stats, or contribution grid; "Edit profile" button or inline editable fields.

### checkout
Signals: Order summary with line items, subtotal, tax, and total; payment method input (card number, expiry, CVV); shipping/billing address form; "Place order" / "Pay now" primary CTA.

### search
Signals: Prominent search input field (often centered or top-positioned); search results list with titles, snippets, or thumbnails; filter/facet sidebar or chips; result count and sort controls.

### listing
Signals: Repeating card or row layout showing multiple items of the same type; pagination or infinite scroll indicator; filter bar or sort dropdown above the list; thumbnail + title + metadata per item.

### detail
Signals: Single entity as focal point (product, article, user, event); large image or media area; descriptive metadata (price, date, author, specs); related items or "You might also like" section.

### error
Signals: Error code displayed prominently (404, 500, 403); illustration or icon indicating something went wrong; message explaining the error ("Page not found"); "Go back" or "Return home" link/button.

### empty_state
Signals: Illustration or icon centered on an otherwise blank content area; message like "No items yet" / "Nothing here" / "Get started"; single CTA to create first item or take primary action; appears within a page shell (nav still visible).

### modal
Signals: Overlay/backdrop dimming the background; centered or side-panel container with close button (X); focused content with 1-2 actions (confirm/cancel); background content visible but not interactive.

### sidebar
Signals: Narrow vertical panel on left or right edge; navigation links or menu items stacked vertically; icons + labels or icon-only collapsed state; active/selected state indicator on current item.

### navigation
Signals: Top bar or bottom tab bar with multiple route items; hamburger menu or expandable drawer; breadcrumbs showing hierarchy; active state highlighting current route.

### form
Signals: Multiple labeled input fields arranged vertically; validation indicators (red borders, error text, checkmarks); required field markers (asterisks); submit/cancel button pair at the bottom.

### table
Signals: Column headers with data rows beneath; sortable column indicators (arrows); row selection checkboxes or radio buttons; pagination controls below the table.

### card
Signals: Single card component in isolation or a small card group; bordered/elevated container with image, title, and body; action buttons or links within the card footer; distinct from a full listing page.

### other
Signals: Does not match any of the above patterns; custom or hybrid layout; specialized domain-specific UI (e.g., code editor, map view, canvas tool).

## Instructions
1. Examine the screenshot for visual elements matching the signals above.
2. Select the BEST matching page type. If multiple types partially match, pick the one with the strongest signal match.
3. Return your confidence level based on how many signals matched.

Respond in this exact JSON format:
{
  "type": "<one of the 20 types listed above>",
  "confidence": <number between 0.0 and 1.0>,
  "signals": ["<matched signal 1>", "<matched signal 2>", "<matched signal 3>"]
}

Confidence guide:
- 0.9-1.0: 3+ strong signals matched, no ambiguity
- 0.7-0.89: 2 signals matched clearly
- 0.5-0.69: 1 signal matched, some ambiguity with other types
- Below 0.5: Very uncertain — use "other" if nothing fits well`;
