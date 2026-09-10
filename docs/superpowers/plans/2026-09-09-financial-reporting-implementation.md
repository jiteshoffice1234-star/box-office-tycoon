# Financial Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a ledger-backed Reports tab with financial overview, ICAI-inspired balance sheet, and income/expenditure statement.

**Architecture:** Extend `GameState` with an append-only ledger and centralize ledger entry creation in the game engine. A pure `src/game/reports.ts` module will calculate typed report models from state; `src/components/Reports.tsx` will render the three views and SVG trend chart without a chart dependency. Existing gameplay screens continue using their current totals and cash mutations.

**Tech Stack:** React 18, TypeScript, Vite, existing UI primitives and CSS, localStorage save format, TSX verification scripts.

## Global Constraints

- Reports are ICAI-inspired game analytics, not statutory or tax filings.
- Preserve existing gameplay behavior and existing saves.
- Do not add a charting dependency; use SVG/CSS.
- Display negative cash, losses, negative equity, and negative profit explicitly.
- Keep report calculations pure and keep report UI state local to `Reports.tsx`.
- Maintain `Assets = Liabilities + Equity`; surface a non-zero balance check.

---

### Task 1: Add ledger types, migration, and report primitives

**Files:**
- Modify: `src/game/types.ts` (`GameState`, new ledger types)
- Modify: `src/game/save.ts` (load normalization and migration)
- Create: `src/game/reports.ts` (typed report models and pure calculators)
- Test: `scripts/verify-finance.ts` (ledger and calculator assertions)

**Interfaces:**
- `LedgerCategory` is a string union covering opening capital, production, marketing, scripts, talent, manager salary, operating cost, box office, streaming, other income, investment, loan principal, loan interest, and loan repayment.
- `LedgerEntry = { id: string; week: number; category: LedgerCategory; amount: number; cashEffect: number; classification: 'income' | 'expense' | 'asset' | 'liability' | 'equity' | 'transfer'; description: string }`.
- `GameState.ledger: LedgerEntry[]`.
- `createOpeningLedger(cash: number): LedgerEntry[]`.
- `calculateReports(state: GameState, range: ReportRange): ReportBundle`.

- [ ] **Step 1: Add the ledger and report types**

Add `LedgerEntry`, `LedgerCategory`, `StatementClassification`, `ReportRange`, `ReportTotals`, `BalanceSheet`, `ProfitAndLoss`, and `ReportBundle` to `src/game/types.ts`. Add `ledger: LedgerEntry[]` to `GameState`.

- [ ] **Step 2: Add version-safe save normalization**

In `src/game/save.ts`, normalize missing `ledger` to `createOpeningLedger(parsed.cash)` plus a migration adjustment entry when legacy totals cannot be reconstructed. Keep malformed entries out of calculations, preserve all other save fields, and bump the state version used by new games.

- [ ] **Step 3: Implement pure report calculations**

In `src/game/reports.ts`, filter entries by absolute week range, aggregate income and expense categories, calculate cumulative retained earnings, derive loan balances from current loans, derive investments and content work-in-progress from state, and return:

```ts
type ReportBundle = {
  overview: { points: ReportPoint[]; totals: ReportTotals }
  balanceSheet: BalanceSheet
  profitAndLoss: ProfitAndLoss
}
```

The balance check must be `totalAssets - (totalLiabilities + totalEquity)`.

- [ ] **Step 4: Add finance assertions**

Extend `scripts/verify-finance.ts` with checks for opening ledger creation, legacy-save normalization, positive and negative period profit, empty ranges, negative cash, and balance-sheet equation output.

- [ ] **Step 5: Run targeted verification**

Run `npm run verify`. Expected: all existing finance assertions and the new ledger/report assertions pass.

- [ ] **Step 6: Commit**

```bash
git add src/game/types.ts src/game/save.ts src/game/reports.ts scripts/verify-finance.ts
git commit -m "feat: add financial reporting model"
```

### Task 2: Wire ledger entries into game transactions

**Files:**
- Modify: `src/game/engine.ts` (all existing player cash mutations)
- Modify: `src/game/save.ts` (ensure normalized ledger survives save/load)
- Test: `scripts/verify-finance.ts`

**Interfaces:**
- Add an internal helper in `engine.ts`:

```ts
function recordLedger(
  state: GameState,
  entry: Omit<LedgerEntry, 'id' | 'week'> & { week?: number },
): GameState
```

It returns a new state with one appended entry and never mutates the existing ledger array.

- [ ] **Step 1: Cover transaction categories with assertions**

Add verification scenarios that call existing engine operations and assert ledger entries for script purchase, hiring, production/marketing spend, box-office income, loan receipt, loan repayment, lending receipts, investment funding, and streaming income.

- [ ] **Step 2: Implement the helper**

Use a stable engine id source (the existing `nextId` mechanism) for ledger ids. Default `week` to `state.week`, preserve signed amount semantics, and store cash movement separately from statement amount for principal transfers.

- [ ] **Step 3: Instrument every cash mutation**

At each existing `cash +=` or `cash -=` path in `engine.ts`, append the matching ledger entry in the same state transition. Principal loan receipt/repayment and investment funding/return are transfers or balance-sheet movements, not P&L income/expense. Interest, revenue, wages, development, production, marketing, and events receive their proper P&L classification.

- [ ] **Step 4: Verify invariants**

Run `npm run verify` and `npm run verify:regressions`. Expected: cash results remain unchanged and ledger cash-effect sum reconciles to the current cash for new games.

- [ ] **Step 5: Commit**

```bash
git add src/game/engine.ts src/game/save.ts scripts/verify-finance.ts
git commit -m "feat: record gameplay transactions in ledger"
```

### Task 3: Add Reports navigation and report UI

**Files:**
- Modify: `src/components/Studio.tsx` (`Tab` union)
- Modify: `src/App.tsx` (tab list and rendering)
- Create: `src/components/Reports.tsx`
- Modify: `src/styles.css` (report layout, table, chart, negative states)

**Interfaces:**
- `Reports` props: `{ state: GameState }`.
- `Reports` owns `view: 'overview' | 'balanceSheet' | 'profitAndLoss'` and `range: ReportRange`.
- It consumes `calculateReports(state, range)` and existing `Card`, `Btn`, `Stat`, and `fmtMoney`.

- [ ] **Step 1: Add the tab**

Append `{ id: 'reports', label: 'Reports', icon: '📊' }` to `TABS`, extend `Tab`, and render `<Reports state={state} />` when selected.

- [ ] **Step 2: Build the report selector**

Render three accessible buttons/cards labeled `Financial Overview`, `Balance Sheet`, and `Income & Expenditure`. Add range controls for `This week`, `Financial year`, `All time`, and a valid custom/current range.

- [ ] **Step 3: Build the overview**

Render summary cards for income, expenditure, net profit/loss, and cash. Render an SVG chart with a calculated min/max including zero, horizontal zero line, four series, labels, and an empty-state message when no period data exists.

- [ ] **Step 4: Build the balance sheet**

Render date/studio heading, Assets, Liabilities, Equity, totals, and a highlighted balance check. Use a visible error state when the absolute check exceeds a small currency tolerance.

- [ ] **Step 5: Build the P&L**

Render the vertical ICAI-inspired income and expenditure sections, category rows, totals, and `Net profit/(loss)`. Print the selected period and use consistent negative formatting.

- [ ] **Step 6: Add responsive styles**

Use existing surface, border, typography, and semantic color variables. Make tables horizontally safe on mobile and preserve chart readability at the current app width.

- [ ] **Step 7: Run typecheck and build**

Run `npm run typecheck` and `npm run build`. Expected: both complete without errors.

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/components/Studio.tsx src/components/Reports.tsx src/styles.css
git commit -m "feat: add financial reports screens"
```

### Task 4: End-to-end compatibility verification

**Files:**
- Modify: `README.md` (document Reports feature)
- Modify: `scripts/verify-regressions.ts` if a compatibility assertion is needed

- [ ] **Step 1: Verify save compatibility**

Run the existing regression verifier and confirm a legacy state loads with a valid ledger and no gameplay fields are lost.

- [ ] **Step 2: Verify report behavior manually**

Start the app with `npm run dev`, create a game, perform a spend and revenue-producing action, open Reports, and confirm the overview changes, negative values render below the zero line, the balance sheet balances, and P&L totals match the ledger.

- [ ] **Step 3: Update README**

Add Reports to the feature list and state that the views are ICAI-inspired in-game analytics rather than statutory accounting advice.

- [ ] **Step 4: Run the complete validation set**

Run `npm run typecheck`, `npm run build`, `npm run verify`, and `npm run verify:regressions`. Expected: all commands pass.

- [ ] **Step 5: Commit**

```bash
git add README.md scripts/verify-regressions.ts
git commit -m "docs: document financial reporting"
```
