# UI Redesign Design Spec

**Date:** 2026-09-08
**Project:** Box Office Tycoon
**Scope:** Visual design system only (tokens, layouts, component styles)

## Overview

Complete visual redesign of Box Office Tycoon from the current VYRA warm-paper aesthetic to a playful casual mobile game style. The redesign covers the design token system, component restyling, screen layouts, data visualization, navigation, and responsive behavior.

**Approach:** Token-First — define the design token system first, then restyle existing components to use those tokens. Component structure stays intact; visual language changes.

## Design Direction

- **Style:** Playful casual mobile — bright colors, rounded corners, light animations
- **Palette:** Light theme, coral primary, gold accent, warm off-white background
- **Typography:** Rounded sans-serif (Nunito) + JetBrains Mono for data/numbers
- **Platform:** Mobile-first, 7 tabs visible in bottom nav
- **Animation:** Light polish — tab transitions, button feedback, progress fills, animated counters

## Screen Structure

| Screen | Old Name | Purpose |
|--------|----------|---------|
| Home/Dashboard | Studio | Overview with stats, charts, feature shortcuts |
| Scripts | Scripts | Write scripts, manage queue, buy from market |
| Films/Library | Movies | Card grid of all movies/shows/franchises |
| Marketing | Marketing | Campaign strategies, release scheduling |
| Streaming | Marketing (shared) | Streaming platform dashboard, ad deals, library |
| Bank/Finance | Bank | Loans, investments, credit score |
| Staff/Managers | Managers | Hire managers, configure automation |

Cast/Talent management merges into the production flow (no separate screen).

---

## 1. Design Token System

### Color Tokens

```css
:root {
  /* Primary — coral */
  --color-primary: #FF6B6B;
  --color-primary-dark: #E85555;
  --color-primary-light: #FFE0E0;

  /* Accent — gold */
  --color-accent: #FFD93D;
  --color-accent-dark: #E6C235;
  --color-accent-light: #FFF8DB;

  /* Backgrounds */
  --color-bg: #FAFAF8;
  --color-surface: #FFFFFF;
  --color-surface-alt: #F5F3EE;

  /* Borders */
  --color-border: #E8E5DE;
  --color-border-strong: #D4D0C8;

  /* Text */
  --color-text: #2D2A26;
  --color-text-secondary: #8A8580;
  --color-text-muted: #B0ABA3;

  /* Semantic */
  --color-success: #4CAF50;
  --color-danger: #FF6B6B;
  --color-warning: #FFB74D;
  --color-info: #64B5F6;
}
```

### Typography Tokens

```css
:root {
  --font-family: 'Nunito', system-ui, sans-serif;
  --font-data: 'JetBrains Mono', ui-monospace, monospace;

  --font-size-xs: 11px;
  --font-size-sm: 13px;
  --font-size-base: 15px;
  --font-size-lg: 18px;
  --font-size-xl: 24px;
  --font-size-2xl: 32px;

  --font-weight-regular: 400;
  --font-weight-semibold: 600;
  --font-weight-extrabold: 800;

  --line-height-body: 1.5;
  --line-height-heading: 1.2;
}
```

### Spacing Tokens

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
}
```

### Border Radius Tokens

```css
:root {
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;
}
```

### Shadow Tokens

```css
:root {
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.10);
  --shadow-xl: 0 12px 36px rgba(0,0,0,0.12);
}
```

### Animation Tokens

```css
:root {
  --duration-fast: 120ms;
  --duration-normal: 200ms;
  --duration-slow: 350ms;

  --easing: cubic-bezier(0.4, 0, 0.2, 1);
  --easing-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

## 2. Component Restyling

### Buttons

- **Before:** Flat gray, outline border, 13px text, 40px min-height
- **After:** Rounded (radius-sm), filled backgrounds, 15px text, 44px min-height, subtle shadow on hover

```css
.btn {
  font-size: var(--font-size-base);
  min-height: 44px;
  border-radius: var(--radius-sm);
  transition: all var(--duration-fast) var(--easing);
}
.btn:active { transform: scale(0.97); }
.btn-primary { background: var(--color-primary); color: white; box-shadow: var(--shadow-sm); }
.btn-primary:hover { background: var(--color-primary-dark); box-shadow: var(--shadow-md); }
.btn-default { background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text); }
.btn-success { background: var(--color-success); color: white; }
.btn-danger { background: var(--color-danger); color: white; }
.btn-sm { padding: 8px 14px; font-size: var(--font-size-sm); min-height: 36px; }
```

### Cards

- **Before:** 18px radius, 1px outline border, soft shadow
- **After:** 12px radius, no visible border (shadow defines edge), white background, 16px padding

```css
.card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  padding: var(--space-4);
  border: none;
}
```

### Stats

- **Before:** 22px value, gray label, 2-col grid
- **After:** 32px bold value (font-data), small uppercase label, 2-col grid

```css
.stat-label {
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
}
.stat-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-extrabold);
  font-family: var(--font-data);
  color: var(--color-text);
}
```

### Progress Bars

- **Before:** 6px height, red fill, scaleX transform
- **After:** 8px height, rounded (radius-full), gradient fill, smooth transition

```css
.bar {
  height: 8px;
  background: var(--color-surface-alt);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  border-radius: var(--radius-full);
  transform-origin: left center;
  transition: transform var(--duration-normal) var(--easing);
  will-change: transform;
}
```

### Lists

- **Before:** 8px gap, content-visibility auto
- **After:** 8px gap, each item has 12px radius, white background, subtle shadow

```css
.list { display: grid; gap: var(--space-2); }
.row-item {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  box-shadow: var(--shadow-sm);
  border: none;
}
```

### Bottom Navigation

- **Before:** 68px height, surface background, 1px top border
- **After:** 64px height, white background, shadow-lg, radius-lg on top corners

```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  background: var(--color-surface);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  box-shadow: var(--shadow-lg);
  min-height: 64px;
  padding-bottom: env(safe-area-inset-bottom, 0);
}
.nav-item {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
}
.nav-item.active { color: var(--color-primary); }
```

### Header

- **Before:** Sticky, surface background, 1px bottom border
- **After:** Sticky, white background, shadow-sm

```css
.header {
  position: sticky;
  top: 0;
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  padding: var(--space-3) var(--space-4);
  z-index: 100;
}
```

### Inputs

```css
input, select {
  background: var(--color-surface-alt);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  font-size: var(--font-size-base);
}
input:focus, select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
  background: var(--color-surface);
}
```

---

## 3. Screen Layouts

### Home/Dashboard

**Layout:** Stats grid (2x2) → Box office chart → Revenue trend → Feature grid (2x3)

- **Key stats bar:** Cash, Tier, Reputation, Content count
- **Box office chart:** Horizontal bar chart of top 5 movies this week
- **Revenue trend:** Line chart of revenue over 12 weeks
- **Feature grid:** 6 cards linking to each screen (Scripts, Films, Stream, Mktg, Bank, Staff)

### Scripts

**Layout:** Write form → Script list → Market

- **Write form:** Genre dropdown, budget slider, write button
- **Script list:** Cards for each script with genre badge, quality, cost, produce/sell buttons
- **Market:** Available scripts from AI studios

### Films/Library

**Layout:** Filter chips → Card grid → Load more

- **Filter chips:** All | Produced | Distributed
- **Card grid:** 1 column mobile, 2 tablet, 3 desktop
- **Film card:** Image placeholder (emoji/icon), genre badge, quality score, gross, franchise badge, sequel button

### Marketing

**Layout:** Active campaign card → Strategy grid → Release calendar

- **Active campaign:** Movie title, strategy, hype progress bar, spend, release date
- **Strategy grid:** 2x2 grid of campaign strategies (Word of Mouth, Social Media, TV, Blockbuster)
- **Release calendar:** Timeline of upcoming releases

### Streaming

**Layout:** Platform header → Ad tier → Deals → Library

- **Platform header:** Name, status, key metrics (subs, revenue, content count)
- **Ad tier:** Toggle, viewer stats, ad revenue, rate card
- **Deals:** Active deals list, pending offers
- **Library:** Content list with quality bars

### Bank/Finance

**Layout:** Financial overview → Loan form → Active loans → Investments

- **Financial overview:** Credit score, active loans count
- **Loan form:** Amount, rate, term inputs with live calculation
- **Active loans:** Loan cards with payment schedule
- **Investments:** Active and settled investment cards

### Staff/Managers

**Layout:** Hire form → Manager cards

- **Hire form:** Salary, genre, quality target, max budget, marketing strategy
- **Manager cards:** Name, salary, genre, mood indicator, status badge, pause/fire buttons

---

## 4. Data Visualization

### Revenue Line Chart

- **Type:** SVG line chart (no library)
- **Data:** Last 12 weeks of total revenue
- **Style:** Coral stroke (2px), gradient fill below line, rounded dots at data points
- **Size:** Full width, 120px height mobile, 180px desktop

### Box Office Bar Chart

- **Type:** Horizontal bar chart
- **Data:** Top 5 movies this week
- **Style:** Gold bars for player, gray for AI, coral for #1. Animated fill on week change.

### Progress Bars

- **Quality:** Gradient fill (coral → gold based on score)
- **Hype:** Coral fill, pulses when actively marketing
- **Reputation:** Gold fill, shows progress to next tier
- **All:** 8px height, radius-full, scaleX transform (GPU-only)

### Animated Counters

- **Cash:** Counts up/down smoothly (150ms, ease-out)
- **Subscribers:** Counts up with comma formatting
- **Revenue:** Counts up with currency formatting
- **Implementation:** requestAnimationFrame loop, no library

### Budget Donut Chart

- **Type:** SVG donut chart (conic-gradient or SVG arcs)
- **Data:** 6 department allocations
- **Style:** Each department gets a color: Acting=#FF6B6B (coral), Writing=#FFD93D (gold), Direction=#4CAF50 (green), Effects=#64B5F6 (blue), Music=#BA68C8 (purple), Editing=#FFB74D (orange)
- **Size:** 120px diameter

---

## 5. Navigation & Transitions

### Bottom Navigation

- 7 tabs visible at all times on mobile
- Tab labels: Home, Scripts, Films, Stream, Mktg, Bank, Staff
- Tab icons: Emoji-based (existing pattern), 20px size
- Active state: Coral text + small dot indicator (4px circle below icon)
- Inactive state: Gray text, no indicator

### Tab Switching

- Transition: Crossfade with subtle slide (200ms)
- Implementation: `document.startViewTransition()` where supported, fallback to instant swap
- Direction: Content slides in from right when moving forward, left when going backward
- No loading states — all data is in memory

### Button Interactions

- Press: scale(0.97) + shadow reduction (120ms)
- Release: scale(1.0) + shadow restore (120ms)
- Hover (desktop): brightness increase, shadow-md

### Card Appear

- On tab switch: Cards fade in with 20ms stagger
- Duration: 200ms fade + 10px slide up
- Implementation: CSS @keyframes with animation-fill-mode: both

### Celebration Effects

- Blockbuster: Confetti burst (CSS-only, 30 particles, 600ms)
- Disaster: Screen shake (2px offset, 200ms)
- Tier upgrade: Gold sparkle overlay (2s, fades out)
- All respect prefers-reduced-motion

### Scroll Behavior

- Sticky header: Stays at top, shadow appears on scroll
- Bottom nav: Always visible, no hide-on-scroll
- Content scroll: Smooth, momentum-based

---

## 6. Responsive Behavior

### Breakpoints

```css
/* Mobile: 0 - 767px (default) */
/* Tablet: 768px - 1023px */
/* Desktop: 1024px+ */
```

### Mobile (0-767px)

- Single column, full width
- Bottom nav: 7 tabs, 64px height
- Stats: 2-column grid
- Cards: Full width, 16px horizontal padding
- Film cards: 1 column
- Feature grid: 2 columns

### Tablet (768-1023px)

- 2 column grid
- Bottom nav: Hidden, replaced by top horizontal nav (same as desktop)
- Stats: 4-column grid
- Cards: 2-column grid
- Film cards: 2 columns
- Feature grid: 3 columns

### Desktop (1024px+)

- 2-3 column grid, max-width 1200px centered
- Top horizontal nav (7 items) replaces bottom nav
- Stats: 5-column grid
- Cards: 2-column grid with larger padding
- Film cards: 3 columns
- Feature grid: 3 columns with larger cards
- Charts: Larger (180px height)

### Touch Targets

- Minimum: 44x44px for all interactive elements (WCAG)
- Buttons: 44px min-height mobile, 40px desktop
- Nav items: Full tab width as touch target
- Input fields: 48px min-height

---

## Implementation Notes

- **Scope:** Visual design system only. No component architecture changes, no engine refactoring.
- **Font loading:** Add Nunito via @fontsource (latin-only subset). Keep JetBrains Mono for data.
- **CSS structure:** Replace current CSS variables with new token system. Keep single-file CSS approach.
- **No new dependencies:** All charts are SVG/CSS. No chart library needed.
- **Backwards compatibility:** Dark theme support can be added later by defining dark color tokens. The token system supports it.
- **Performance:** All animations use GPU-only properties (transform, opacity). No layout thrash.
