# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle Box Office Tycoon from VYRA warm-paper aesthetic to playful casual mobile game style using a token-first approach.

**Architecture:** Define design tokens as CSS custom properties, then restyle existing components to use those tokens. Add new SVG/CSS data visualization components. No component architecture changes, no engine refactoring.

**Tech Stack:** CSS custom properties, Nunito font (@fontsource), SVG charts (no library), CSS animations.

## Global Constraints

- Scope: Visual design system only. No component architecture changes, no engine refactoring.
- Font: Nunito via @fontsource (latin-only subset). Keep JetBrains Mono for data.
- CSS: Single-file approach (styles.css). Replace current variables with new token system.
- No new dependencies. All charts are SVG/CSS.
- Performance: GPU-only animations (transform, opacity). No layout thrash.
- Accessibility: All interactive elements ≥44x44px touch targets.

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/styles.css` | All CSS tokens, component styles, responsive breakpoints, animations |
| `src/main.tsx` | Add Nunito font imports |
| `src/components/ui.tsx` | Add new visualization components (LineChart, BarChart, DonutChart, AnimatedCounter) |
| `src/components/Studio.tsx` | Update Dashboard layout with new grid and chart components |
| `src/components/Movies.tsx` | Update Films to card grid layout |
| `src/components/Marketing.tsx` | Update Marketing screen layout |
| `src/components/Marketing.tsx` | Update Streaming screen layout |
| `src/components/Bank.tsx` | Update Bank screen layout |
| `src/components/Managers.tsx` | Update Staff screen layout |
| `src/components/Scripts.tsx` | Update Scripts screen layout |
| `src/App.tsx` | Update navigation, add View Transitions, celebration effects |

---

### Task 1: Install Nunito Font

**Files:**
- Modify: `src/main.tsx:1-14`

**Interfaces:**
- Consumes: None (first task)
- Produces: Nunito font available via CSS `--font-family`

- [ ] **Step 1: Add Nunito font imports to main.tsx**

```typescript
import '@fontsource/nunito/latin-400.css'
import '@fontsource/nunito/latin-600.css'
import '@fontsource/nunito/latin-700.css'
import '@fontsource/nunito/latin-800.css'
```

Add these imports after the existing fontsource imports (line 7).

- [ ] **Step 2: Install @fontsource/nunito**

Run: `npm install @fontsource/nunito`

- [ ] **Step 3: Verify font loads**

Run: `npm run dev`
Open browser, inspect any text element, verify `font-family` includes Nunito.

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx package.json package-lock.json
git commit -m "feat: install Nunito font for playful UI redesign"
```

---

### Task 2: Replace CSS Variables with Design Token System

**Files:**
- Modify: `src/styles.css:8-62` (root variables section)

**Interfaces:**
- Consumes: Nunito font from Task 1
- Produces: All design tokens available as CSS custom properties

- [ ] **Step 1: Replace root variables with new token system**

Replace the entire `:root` block (lines 8-62) with:

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

  /* Typography */
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

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;

  /* Border Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.10);
  --shadow-xl: 0 12px 36px rgba(0,0,0,0.12);

  /* Animation */
  --duration-fast: 120ms;
  --duration-normal: 200ms;
  --duration-slow: 350ms;
  --easing: cubic-bezier(0.4, 0, 0.2, 1);
  --easing-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Legacy aliases (keep existing code working during migration) */
  --paper: var(--color-bg);
  --bg: var(--color-bg);
  --bg-accent: var(--color-surface-alt);
  --surface: var(--color-surface);
  --surface-2: var(--color-surface-alt);
  --surface-3: var(--color-border);
  --text: var(--color-text);
  --text-2: var(--color-text-secondary);
  --outline: var(--color-border);
  --primary: var(--color-primary);
  --on-primary: white;
  --primary-container: var(--color-primary-light);
  --on-primary-container: #5C1F12;
  --red: var(--color-danger);
  --red-soft: rgba(255, 107, 107, 0.09);
  --teal: #3C6B5D;
  --amber: var(--color-warning);
  --green: var(--color-success);
  --green-bright: #4CAF50;
  --green-bg: rgba(76, 175, 80, 0.1);
  --blue: #64B5F6;
  --blue-bright: #42A5F5;
  --blue-bg: rgba(100, 181, 246, 0.1);
  --gold: var(--color-accent);
  --gold-bright: var(--color-accent);
  --gold-dim: var(--color-accent-dark);
  --gold-bg: rgba(255, 217, 61, 0.08);
  --gold-border: rgba(255, 217, 61, 0.25);
  --purple: #BA68C8;
  --yellow: var(--color-warning);
  --shadow: var(--shadow-md);
  --shadow-sm: var(--shadow-sm);
  --radius: var(--radius-md);
  --radius-sm: var(--radius-sm);
  --radius-lg: var(--radius-lg);
  --font-display: var(--font-family);
  --font-body: var(--font-family);
  --nav-height: 64px;
  --red-bg: rgba(255, 107, 107, 0.07);
  --bg-input: var(--color-surface-alt);
}
```

- [ ] **Step 2: Update dark theme variables**

Replace the `[data-theme='dark']` block (lines 64-90) with:

```css
[data-theme='dark'] {
  --color-bg: #17150F;
  --color-surface: #1F1B12;
  --color-surface-alt: #272216;
  --color-border: #3A3322;
  --color-border-strong: #4A4232;
  --color-text: #EAE3CB;
  --color-text-secondary: #A69C7F;
  --color-text-muted: #6B6354;
  --color-primary: #FF8A80;
  --color-primary-dark: #FF6B6B;
  --color-primary-light: rgba(255, 107, 107, 0.15);
  --color-accent: #FFE082;
  --color-accent-dark: #FFD93D;
  --color-accent-light: rgba(255, 217, 61, 0.1);
  --color-success: #66BB6A;
  --color-danger: #FF8A80;
  --color-warning: #FFCC80;
  --color-info: #90CAF9;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.2);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.3);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.4);
  --shadow-xl: 0 12px 36px rgba(0,0,0,0.5);

  /* Legacy aliases for dark */
  --red-bg: rgba(255, 107, 107, 0.1);
  --green-bg: rgba(76, 175, 80, 0.1);
  --blue-bg: rgba(100, 181, 246, 0.1);
  --gold-bg: rgba(255, 217, 61, 0.08);
}
```

- [ ] **Step 3: Verify no CSS errors**

Run: `npm run dev`
Open browser, check console for CSS errors. Verify colors changed to coral/gold palette.

- [ ] **Step 4: Commit**

```bash
git add src/styles.css
git commit -m "feat: replace CSS variables with design token system"
```

---

### Task 3: Restyle Base Elements

**Files:**
- Modify: `src/styles.css:92-105` (html, body, selection, keyframes)

**Interfaces:**
- Consumes: Design tokens from Task 2
- Produces: Base typography and background using new tokens

- [ ] **Step 1: Update html, body, and base styles**

Replace lines 92-105 with:

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  line-height: var(--line-height-body);
  -webkit-font-smoothing: antialiased;
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
}

::selection { background: var(--color-primary); color: white; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
}
```

- [ ] **Step 2: Verify base typography**

Run: `npm run dev`
Verify text uses Nunito font, background is warm off-white.

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat: restyle base elements with new tokens"
```

---

### Task 4: Restyle Buttons

**Files:**
- Modify: `src/styles.css:166-182` (button styles)

**Interfaces:**
- Consumes: Design tokens from Task 2
- Produces: Restyled buttons with rounded corners, shadows, press feedback

- [ ] **Step 1: Replace button styles**

Replace lines 166-182 with:

```css
.btn {
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: var(--radius-sm);
  padding: 10px 16px;
  cursor: pointer;
  min-height: 44px;
  transition: all var(--duration-fast) var(--easing);
}
.btn:hover:not(:disabled) { background: var(--color-surface-alt); box-shadow: var(--shadow-sm); }
.btn:active:not(:disabled) { transform: scale(0.97); box-shadow: none; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
  box-shadow: var(--shadow-sm);
}
.btn-primary:hover:not(:disabled) { background: var(--color-primary-dark); box-shadow: var(--shadow-md); }
.btn-success { background: var(--color-success); border-color: var(--color-success); color: white; }
.btn-info { background: var(--color-surface); border-color: var(--color-border); color: var(--color-text); }
.btn-danger { background: transparent; border-color: var(--color-border); color: var(--color-danger); }
.btn-ghost { background: transparent; border-color: var(--color-border); color: var(--color-text-secondary); }
.btn-sm { padding: 8px 14px; font-size: var(--font-size-sm); min-height: 36px; }
.btn-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 10px; }
```

- [ ] **Step 2: Verify button styles**

Run: `npm run dev`
Verify buttons have rounded corners, coral primary color, press feedback (scale on click).

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat: restyle buttons with rounded corners and press feedback"
```

---

### Task 5: Restyle Cards

**Files:**
- Modify: `src/styles.css:192-205` (card styles)

**Interfaces:**
- Consumes: Design tokens from Task 2
- Produces: Cards with shadow instead of border, rounded corners

- [ ] **Step 1: Replace card styles**

Replace lines 192-205 with:

```css
.grid { display: grid; gap: 12px; }
.card {
  background: var(--color-surface);
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-4);
  box-shadow: var(--shadow-md);
}
.card-gold { box-shadow: var(--shadow-md), 0 0 0 1px var(--gold-border); }
.card-alert { box-shadow: var(--shadow-md), 0 0 0 1px var(--color-danger); }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.card-title {
  font-family: var(--font-data);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.card-title::before { content: ''; width: 16px; height: 2px; background: var(--color-primary); flex-shrink: 0; }
.card-title .tick { display: none; }
.card-right { color: var(--color-text-secondary); font-size: 10px; font-family: var(--font-data); }
.row { display: flex; flex-direction: column; gap: 12px; }
```

- [ ] **Step 2: Verify card styles**

Run: `npm run dev`
Verify cards have white background, rounded corners, shadow instead of border.

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat: restyle cards with shadow-based edges"
```

---

### Task 6: Restyle Stats and Progress Bars

**Files:**
- Modify: `src/styles.css:207-218` (stat and bar styles)

**Interfaces:**
- Consumes: Design tokens from Task 2
- Produces: Larger stats, gradient progress bars

- [ ] **Step 1: Replace stat and bar styles**

Replace lines 207-218 with:

```css
.stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; overflow: visible; padding: 0; }
.stat {
  background: var(--color-surface-alt);
  border: none;
  border-radius: var(--radius-md);
  padding: 14px;
  min-width: 0;
}
.stat-label {
  font-family: var(--font-data);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}
.stat-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-extrabold);
  letter-spacing: -0.02em;
  margin: 8px 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--font-data);
}
.stat-sub { font-size: 11px; color: var(--color-text-secondary); font-family: var(--font-data); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.bar {
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-surface-alt);
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  width: 100%;
  border-radius: var(--radius-full);
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  transform-origin: left center;
  transition: transform var(--duration-normal) var(--easing);
  will-change: transform;
}
.quality-line { display: flex; align-items: center; gap: 8px; margin: 6px 0; font-size: 12px; font-family: var(--font-data); color: var(--color-text-secondary); }
.quality-line .bar { flex: 1; }
```

- [ ] **Step 2: Verify stats and bars**

Run: `npm run dev`
Verify stats have larger values, progress bars have coral-to-gold gradient.

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat: restyle stats and progress bars with gradient fills"
```

---

### Task 7: Restyle Lists and Row Items

**Files:**
- Modify: `src/styles.css:234-253` (list and row-item styles)

**Interfaces:**
- Consumes: Design tokens from Task 2
- Produces: Cards-style row items with shadows

- [ ] **Step 1: Replace list and row-item styles**

Replace lines 234-253 with:

```css
.table-scroll { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 12px; }
.table th { text-align: left; font-family: var(--font-data); font-size: 9px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--color-text-secondary); padding: 8px; border-bottom: 1px solid var(--color-border); }
.table td { padding: 9px 8px; border-bottom: 1px solid var(--color-border); vertical-align: middle; }
.table .num { text-align: right; font-family: var(--font-data); font-variant-numeric: tabular-nums; white-space: nowrap; }
.cell-title { font-weight: 700; font-size: 12px; }
.cell-sub { font-size: 10px; color: var(--color-text-secondary); font-family: var(--font-data); }
.cell-bar { height: 5px; margin-top: 5px; background: var(--color-surface-alt); border-radius: 3px; overflow: hidden; }
.you-dot { display: inline-block; width: 6px; height: 6px; background: var(--color-success); border-radius: 50%; margin-right: 5px; }
.status { font-size: 10px; color: var(--color-text-secondary); font-family: var(--font-data); }
.list { display: grid; gap: 8px; content-visibility: auto; }
.row-item, .talent-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: var(--color-surface);
  border: none;
  border-radius: var(--radius-md);
  padding: 11px 14px;
  box-shadow: var(--shadow-sm);
}
.item-title { font-weight: 700; font-size: 13px; }
.item-sub { font-size: 11px; color: var(--color-text-secondary); margin-top: 2px; }
.row-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.price { font-weight: 800; color: var(--color-accent); font-variant-numeric: tabular-nums; font-size: 13px; }
```

- [ ] **Step 2: Verify list styles**

Run: `npm run dev`
Verify row items have white background, rounded corners, shadow instead of border.

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat: restyle lists and row items with card-style shadows"
```

---

### Task 8: Restyle Bottom Navigation

**Files:**
- Modify: `src/styles.css:149-164` (bottom-nav styles)

**Interfaces:**
- Consumes: Design tokens from Task 2
- Produces: Rounded top corners, lifted shadow, coral active state

- [ ] **Step 1: Replace bottom-nav styles**

Replace lines 149-164 with:

```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 200;
  display: flex;
  background: var(--color-surface);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  box-shadow: var(--shadow-lg);
  min-height: 64px;
  padding-bottom: env(safe-area-inset-bottom, 0);
}
.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-family: var(--font-data);
  font-size: 8.5px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  padding: 8px 2px;
  border-radius: 14px;
  transition: color var(--duration-fast) var(--easing);
}
.nav-item .nav-icon { font-size: 20px; }
.nav-item.on, .nav-item.active { color: var(--color-primary); }
.nav-item.on::after, .nav-item.active::after {
  content: '';
  display: block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-primary);
  margin-top: 2px;
}
.nav-dot {
  position: absolute;
  top: 8px;
  right: calc(50% - 14px);
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-primary);
}
```

- [ ] **Step 2: Verify bottom nav**

Run: `npm run dev`
Verify bottom nav has rounded top corners, lifted shadow, coral active state with dot indicator.

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat: restyle bottom navigation with rounded corners and shadow"
```

---

### Task 9: Restyle Header

**Files:**
- Modify: `src/styles.css:115-147` (header styles)

**Interfaces:**
- Consumes: Design tokens from Task 2
- Produces: Header with shadow instead of border

- [ ] **Step 1: Replace header styles**

Replace lines 115-147 with:

```css
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px 16px;
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}
.header-studio { display: flex; align-items: center; gap: 8px; min-width: 0; }
.studio-name-chip {
  background: var(--color-primary);
  color: white;
  padding: 7px 14px;
  font-weight: 800;
  font-size: 14px;
  letter-spacing: -0.01em;
  border-radius: var(--radius-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}
.tier-chip {
  font-family: var(--font-data);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  padding: 5px 10px;
  background: var(--color-surface-alt);
}
.header-rep { min-width: 130px; max-width: 190px; flex: 1; }
.rep-line { font-family: var(--font-data); font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--color-text-secondary); display: flex; justify-content: space-between; margin-bottom: 5px; }
.rep-next { color: var(--color-text-secondary); }
.header-date {
  font-family: var(--font-data);
  font-size: 9.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-alt);
  padding: 7px 12px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
}
.header-date::before { content: ''; width: 6px; height: 6px; background: var(--color-primary); flex-shrink: 0; }
.header-cash { margin-left: auto; text-align: right; }
.cash-label { font-family: var(--font-data); font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--color-text-secondary); }
.cash-now {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-success);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  font-family: var(--font-data);
}
.cash-now.neg { color: var(--color-danger); }
.header-controls { display: flex; gap: 8px; width: 100%; flex-wrap: wrap; }
.theme-toggle { margin-left: auto; }
```

- [ ] **Step 2: Verify header**

Run: `npm run dev`
Verify header has shadow instead of border, coral accent on date indicator.

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat: restyle header with shadow and coral accents"
```

---

### Task 10: Restyle Inputs and Forms

**Files:**
- Modify: `src/styles.css:274-288` (form and input styles)

**Interfaces:**
- Consumes: Design tokens from Task 2
- Produces: Rounded inputs with focus ring

- [ ] **Step 1: Replace input styles**

Replace lines 274-288 with:

```css
.form-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }
.form-row label { display: flex; flex-direction: column; gap: 5px; font-family: var(--font-data); font-size: 9px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--color-text-secondary); }
.form-row label.grow { flex: 1; min-width: 120px; }
select, input[type='text'], input[type='number'] {
  font-family: var(--font-family);
  background: var(--color-surface-alt);
  border: 1px solid transparent;
  color: var(--color-text);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  font-size: var(--font-size-base);
  outline: none;
  width: 100%;
  transition: border-color var(--duration-fast) var(--easing), box-shadow var(--duration-fast) var(--easing);
}
select:focus, input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
  background: var(--color-surface);
}
input[type='range'] { accent-color: var(--color-primary); width: 100%; }
.boot-input {
  width: 100%;
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  font-size: 14px;
  outline: none;
}
.boot-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
```

- [ ] **Step 2: Verify inputs**

Run: `npm run dev`
Verify inputs have transparent border normally, coral focus ring on focus.

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat: restyle inputs with transparent border and coral focus ring"
```

---

### Task 11: Restyle Badges, Misc Elements, and Desktop Layout

**Files:**
- Modify: `src/styles.css:220-272, 341-394` (badges, misc, boot, desktop)

**Interfaces:**
- Consumes: Design tokens from Task 2
- Produces: Restyled badges, boot screen, desktop breakpoints

- [ ] **Step 1: Update badge styles**

Replace lines 220-232 with:

```css
.genre-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--color-surface-alt);
  border: none;
  border-radius: var(--radius-full);
  padding: 5px 11px;
  font-family: var(--font-data);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}
.franchise-badge, .dist-badge, .you-badge, .hired-badge {
  display: inline-flex;
  align-items: center;
  border: none;
  border-radius: var(--radius-full);
  padding: 3px 9px;
  font-family: var(--font-data);
  font-size: 9px;
  font-weight: 600;
  margin-left: 6px;
}
.franchise-badge { background: var(--gold-bg); color: var(--color-accent-dark); }
.dist-badge { background: var(--blue-bg); color: var(--color-info); }
.you-badge, .hired-badge { background: var(--green-bg); color: var(--color-success); }
```

- [ ] **Step 2: Update boot screen styles**

Replace lines 341-353 with:

```css
.boot {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--color-bg);
}
.boot-card {
  max-width: 430px;
  width: 100%;
  background: var(--color-surface);
  border: none;
  border-radius: var(--radius-xl);
  padding: 26px 22px 22px;
  text-align: center;
  box-shadow: var(--shadow-xl);
  animation: fadeUp 0.35s ease;
}
.boot-title-chip {
  display: inline-block;
  background: var(--color-primary);
  color: white;
  padding: 12px 26px;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.01em;
  border-radius: var(--radius-lg);
}
.boot-card .boot-input { margin: 14px auto 0; }
.boot-card .btn-row { justify-content: center; }
.boot-sub { font-family: var(--font-data); font-size: 10px; color: var(--color-text-secondary); margin-top: 14px; }
.balance-picker { margin-top: 14px; text-align: left; }
.balance-label { font-family: var(--font-data); font-size: 9px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--color-text-secondary); margin-bottom: 8px; text-align: center; }
.balance-chips { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
.balance-chip {
  font-family: var(--font-data);
  font-size: 10px;
  font-weight: 600;
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: 8px 11px;
  cursor: pointer;
  border-radius: var(--radius-full);
  min-height: 32px;
}
.balance-chip.active { background: var(--color-text); border-color: var(--color-text); color: var(--color-bg); }
```

- [ ] **Step 3: Update misc and desktop styles**

Replace lines 354-394 with:

```css
.muted { color: var(--color-text-secondary); }
.small { font-size: 11px; }
.good { color: var(--color-success); font-weight: 700; }
.bad { color: var(--color-danger); font-weight: 700; }
.hint {
  font-size: 11px;
  font-weight: 600;
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  padding: 7px 10px;
  display: inline-block;
  border-radius: var(--radius-sm);
  margin-top: 5px;
}
.empty {
  background: var(--color-surface-alt);
  border: 1.5px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: 22px;
  text-align: center;
}
.empty p { margin: 2px 0; font-size: 13px; }
.footer {
  margin-top: 18px;
  text-align: center;
  font-size: 10px;
  color: var(--color-text-secondary);
  padding: 12px 0;
  border-top: 1px solid var(--color-border);
  font-family: var(--font-data);
}
.dept-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; }
.dept { display: flex; flex-direction: column; gap: 3px; font-size: 11px; }
.dept-name { color: var(--color-text-secondary); }
.dept-name b { color: var(--color-text); font-family: var(--font-data); }
.tabs-mini { display: flex; gap: 6px; margin-bottom: 10px; overflow-x: auto; scrollbar-width: none; }
.tabs-mini::-webkit-scrollbar { display: none; }
.tab-mini {
  font-family: var(--font-data);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: 8px 13px;
  cursor: pointer;
  border-radius: var(--radius-full);
  white-space: nowrap;
  transition: all var(--duration-fast) var(--easing);
}
.tab-mini.active { background: var(--color-text); color: var(--color-bg); border-color: var(--color-text); }
:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; border-radius: 4px; }
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 3px; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}

/* Desktop */
@media (min-width: 768px) {
  .app-content { padding: 20px 24px 32px; }
  .stats-row { grid-template-columns: repeat(5, 1fr); }
  .stat-value { font-size: var(--font-size-xl); }
  .bottom-nav { display: none; }
  .header-controls { width: auto; margin-left: auto; }
  .row { display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); gap: 12px; }
  .row.stats-row { display: grid; }
  .studio-name-chip { font-size: 16px; max-width: 260px; }
}
```

- [ ] **Step 4: Verify all styles**

Run: `npm run dev`
Verify badges, boot screen, and desktop layout all use new tokens.

- [ ] **Step 5: Commit**

```bash
git add src/styles.css
git commit -m "feat: restyle badges, boot screen, misc elements, and desktop layout"
```

---

### Task 12: Add Data Visualization Components

**Files:**
- Modify: `src/components/ui.tsx` (add new components)

**Interfaces:**
- Consumes: Design tokens from Task 2
- Produces: `LineChart`, `BarChart`, `DonutChart`, `AnimatedCounter` components

- [ ] **Step 1: Add LineChart component**

Add to `src/components/ui.tsx`:

```typescript
export function LineChart({ data, width = '100%', height = 120 }: { data: number[]; width?: string; height?: number }) {
  if (data.length === 0) return null
  const max = Math.max(...data, 1)
  const min = 0
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = 100 - ((v - min) / range) * 80 - 10
    return `${x},${y}`
  }).join(' ')
  const fillPoints = `0,100 ${points} 100,100`
  return (
    <svg viewBox="0 0 100 100" width={width} height={height} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill="url(#lineGrad)" />
      <polyline points={points} fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
```

- [ ] **Step 2: Add BarChart component**

Add to `src/components/ui.tsx`:

```typescript
export function BarChart({ items, maxWidth = 100 }: { items: { label: string; value: number; color?: string }[]; maxWidth?: number }) {
  const max = Math.max(...items.map(i => i.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
          <span style={{ width: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--color-text-secondary)' }}>{item.label}</span>
          <div style={{ flex: 1, height: 8, background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(item.value / max) * 100}%`, background: item.color || 'var(--color-accent)', borderRadius: 'var(--radius-full)', transition: 'width 0.3s ease' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, fontWeight: 700, minWidth: 50, textAlign: 'right' }}>{fmtMoney(item.value)}</span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Add DonutChart component**

Add to `src/components/ui.tsx`:

```typescript
export function DonutChart({ segments, size = 120 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1
  const radius = 40
  const circumference = 2 * Math.PI * radius
  let accumulated = 0
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {segments.map((seg, i) => {
        const pct = seg.value / total
        const dash = pct * circumference
        const offset = -accumulated * circumference
        accumulated += pct
        return (
          <circle key={i} cx="50" cy="50" r={radius} fill="none" stroke={seg.color} strokeWidth="12"
            strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={offset}
            transform="rotate(-90 50 50)" />
        )
      })}
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="800" fontFamily="var(--font-data)" fill="var(--color-text)">{total}</text>
    </svg>
  )
}
```

- [ ] **Step 4: Add AnimatedCounter component**

Add to `src/components/ui.tsx`:

```typescript
import { useEffect, useRef, useState } from 'react'

export function AnimatedCounter({ value, format = 'number', duration = 150 }: { value: number; format?: 'number' | 'currency' | 'compact'; duration?: number }) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    const from = prev.current
    const to = value
    if (from === to) return
    const start = performance.now()
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
    prev.current = value
  }, [value, duration])
  if (format === 'currency') return <>{fmtMoney(display)}</>
  if (format === 'compact') return <>{fmtMoney(display)}</>
  return <>{display.toLocaleString()}</>
}
```

- [ ] **Step 5: Verify components render**

Run: `npm run dev`
Import and use each component in a test location to verify they render without errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui.tsx
git commit -m "feat: add LineChart, BarChart, DonutChart, AnimatedCounter components"
```

---

### Task 13: Update Dashboard Layout

**Files:**
- Modify: `src/components/Studio.tsx`

**Interfaces:**
- Consumes: New visualization components from Task 12
- Produces: Updated Dashboard with charts and feature grid

- [ ] **Step 1: Update Studio.tsx imports**

Add imports for new components:

```typescript
import { Bar, Btn, Card, Stat, fmtMoney, LineChart, BarChart, AnimatedCounter } from './ui'
```

- [ ] **Step 2: Update Dashboard layout**

Replace the return statement in `Studio` function to use the new layout:
- Stats grid (2x2) with AnimatedCounter for cash values
- Box office section using BarChart
- Revenue trend section using LineChart
- Feature grid with 6 cards linking to other screens

- [ ] **Step 3: Verify Dashboard**

Run: `npm run dev`
Verify Dashboard shows stats, charts, and feature grid with new styling.

- [ ] **Step 4: Commit**

```bash
git add src/components/Studio.tsx
git commit -m "feat: update Dashboard layout with charts and feature grid"
```

---

### Task 14: Update Remaining Screen Layouts

**Files:**
- Modify: `src/components/Scripts.tsx`, `src/components/Movies.tsx`, `src/components/Marketing.tsx`, `src/components/Bank.tsx`, `src/components/Managers.tsx`

**Interfaces:**
- Consumes: Design tokens from Task 2
- Produces: All screens use new card-style layouts

- [ ] **Step 1: Update Scripts.tsx**

Update the Scripts component to use new card-style layout with genre badges and quality indicators.

- [ ] **Step 2: Update Movies.tsx**

Update the Movies component to use card grid layout with film cards showing genre, quality, gross.

- [ ] **Step 3: Update Marketing.tsx**

Update the Marketing component (campaign section) to use new card layout with strategy grid.

- [ ] **Step 4: Update Marketing.tsx (Streaming section)**

Update the Streaming section to use new card layout with stat boxes and deal cards.

- [ ] **Step 5: Update Bank.tsx**

Update the Bank component to use new card layout with loan and investment cards.

- [ ] **Step 6: Update Managers.tsx**

Update the Managers component to use new card layout with manager cards showing mood indicators.

- [ ] **Step 7: Verify all screens**

Run: `npm run dev`
Navigate through all 7 screens, verify consistent styling.

- [ ] **Step 8: Commit**

```bash
git add src/components/Scripts.tsx src/components/Movies.tsx src/components/Marketing.tsx src/components/Bank.tsx src/components/Managers.tsx
git commit -m "feat: update all screen layouts with new card-style design"
```

---

### Task 15: Add Animations and Transitions

**Files:**
- Modify: `src/App.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: Design tokens from Task 2
- Produces: Tab transitions, card appear animations, celebration effects

- [ ] **Step 1: Add card appear animation to CSS**

Add to `src/styles.css`:

```css
@keyframes cardAppear {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
}
.card { animation: cardAppear var(--duration-normal) var(--easing) both; }
.card:nth-child(2) { animation-delay: 20ms; }
.card:nth-child(3) { animation-delay: 40ms; }
.card:nth-child(4) { animation-delay: 60ms; }
```

- [ ] **Step 2: Add celebration effects CSS**

Add to `src/styles.css`:

```css
@keyframes confetti {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(-100px) rotate(720deg); opacity: 0; }
}
@keyframes screenShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}
@keyframes goldSparkle {
  0% { opacity: 0; }
  50% { opacity: 1; }
  100% { opacity: 0; }
}
.celebration-confetti { animation: confetti 600ms var(--easing) forwards; }
.celebration-shake { animation: screenShake 200ms ease; }
.celebration-sparkle { animation: goldSparkle 2s ease forwards; }
```

- [ ] **Step 3: Add View Transitions to App.tsx**

Update tab switching in App.tsx to use `document.startViewTransition()`:

```typescript
const handleTabChange = (newTab: Tab) => {
  if (!document.startViewTransition) {
    setTab(newTab)
    return
  }
  document.startViewTransition(() => setTab(newTab))
}
```

- [ ] **Step 4: Verify animations**

Run: `npm run dev`
Verify card appear animations, tab transitions, and celebration effects work.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/styles.css
git commit -m "feat: add card appear animations, tab transitions, celebration effects"
```

---

### Task 16: Final Responsive Polish

**Files:**
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: All previous tasks
- Produces: Complete responsive behavior across all breakpoints

- [ ] **Step 1: Add tablet breakpoint**

Add to `src/styles.css`:

```css
@media (min-width: 768px) and (max-width: 1023px) {
  .stats-row { grid-template-columns: repeat(4, 1fr); }
  .grid { grid-template-columns: 1fr 1fr; }
  .film-grid { grid-template-columns: 1fr 1fr; }
}
```

- [ ] **Step 2: Verify responsive behavior**

Run: `npm run dev`
Test at 375px, 768px, and 1024px widths. Verify layout adapts correctly.

- [ ] **Step 3: Final commit**

```bash
git add src/styles.css
git commit -m "feat: complete responsive breakpoints for mobile, tablet, desktop"
```

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-08-ui-redesign-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
