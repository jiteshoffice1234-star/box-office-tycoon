# Financial Reporting Design

## Goal

Add a Reports area to Box Office Tycoon with three connected views:

1. **Financial Overview**: a from-start-to-current financial trend dashboard.
2. **Balance Sheet**: an Indian accounting-style statement of assets, liabilities, and equity.
3. **Income & Expenditure / Profit & Loss**: grouped income and expense reporting with period and cumulative totals.

The reports are game analytics presented in an ICAI-inspired format. They are not statutory financial statements or tax filings.

## Navigation and UX

- Add a `Reports` option at the end of the existing rail and bottom navigation.
- Selecting Reports opens a report selector with three buttons/cards.
- Keep the selected report and date range local to the Reports component; changing reports must not mutate game state.
- Date ranges are represented by game weeks: current week, current financial year, all time, and a custom week range where practical.
- All monetary values use the existing `fmtMoney` formatter.
- Losses, negative cash, negative retained earnings, and negative net profit are rendered with a minus sign and danger styling.
- The overview chart is an SVG/CSS chart with a visible zero line, labeled axes, tooltips or point labels, and no new chart dependency.

## Accounting data model

Add a persisted `LedgerEntry` collection to `GameState`.

Each entry contains:

- stable id
- absolute game week
- account/category
- signed amount from the studio perspective
- cash effect (signed)
- statement classification (`income`, `expense`, `asset`, `liability`, `equity`, or `transfer`)
- human-readable description

Ledger categories cover all existing money-moving paths: opening capital, production, marketing, scripts, talent, manager salaries, operating/random-event costs, box-office and streaming revenue, investments, loans received, loan principal repayments, loan interest, lending receipts, and investment returns.

The ledger is append-only during normal play. Report calculations derive from entries plus current operational assets and obligations, rather than duplicating totals in UI components.

### Migration

- Bump the game state version.
- When loading an older save without a ledger, create a ledger containing an opening capital entry equal to the original starting cash and a migration adjustment entry for the difference between that opening amount and the current cash implied by the existing totals.
- Preserve all existing gameplay state and saves.
- New games begin with an opening capital entry at week 0.

## Statements

### Financial Overview

For each selected week/range, aggregate:

- income
- expenses
- net profit/loss
- cash balance
- total liabilities
- total equity

Plot income, expenses, net profit/loss, and cash balance. The chart scale must include both positive and negative values and use a zero baseline.

### Balance Sheet

Present the date and studio name, then:

**Assets**

- Cash and cash equivalents
- Film/content work in progress (unreleased production cost)
- Released content asset balance (remaining cost basis, if applicable)
- Loans receivable
- Investments
- Other current assets

**Liabilities**

- Borrowed loans outstanding
- Accrued/other obligations represented by the game

**Equity**

- Opening capital
- Retained earnings (cumulative income less expenses)
- Current period profit/loss

Show total assets, total liabilities and equity, and an explicit `Balance check` equal to assets minus liabilities/equity. A non-zero check is surfaced as an error state rather than silently rounded away.

### Income & Expenditure / Profit & Loss

Use an ICAI-style vertical statement:

**Income**

- Theatrical/box-office share
- Streaming and platform revenue
- International, merchandise, soundtrack, and other operating income
- Investment and lending income
- Other income
- Total income

**Expenditure**

- Production costs
- Marketing and distribution
- Scripts and development
- Talent and manager costs
- Loan interest and finance costs
- Operating/event costs
- Other expenditure
- Total expenditure

Show `Net profit/(loss)` as total income less total expenditure. Support current financial year and all-time views, with the selected period clearly printed.

## Integration boundaries

- Ledger write helpers live in the game layer and are called beside existing cash/stat mutations.
- A pure report selector/calculator module consumes `GameState` and returns typed view models.
- `Reports.tsx` is presentation-only and uses existing UI primitives.
- `App.tsx` owns the new tab registration and renders the Reports component.
- Existing Bank, Studio, Movies, and gameplay screens remain behaviorally unchanged.

## Error handling and compatibility

- Invalid or missing ledger entries are ignored only when they fail validation; the loader should report the migration path and retain a valid empty ledger rather than crash the game.
- Report calculators must handle zero entries, empty ranges, negative cash, and partially completed productions.
- Existing totals remain available for legacy screens; reports use the ledger as their source of truth after migration.

## Testing

- Type-check and production build.
- Extend finance verification with ledger balancing checks, negative cash/loss cases, loan/investment events, and migration of a version-2 save.
- Verify that balance sheet assets equal liabilities plus equity for representative game states.
- Verify report range aggregation and zero-line chart data for positive and negative series.
