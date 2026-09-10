# Box Office Tycoon Professional Overhaul Design

## Goal

Evolve Box Office Tycoon into a deeper, more believable film-studio management simulation while preserving the existing game identity, React/TypeScript architecture, save compatibility, and ledger-backed accounting foundation.

This is a phased overhaul, not a rewrite. Existing working systems remain available while individual subsystems are strengthened behind typed interfaces.

## Success criteria

- Player decisions create understandable short-, medium-, and long-term trade-offs.
- Production, talent, marketing, release strategy, market conditions, revenue, finance, and progression affect one another.
- Financial reports remain auditable from the append-only ledger.
- Existing saves load without losing player progress.
- Negative values, very large values, empty data, and partial state are handled safely.
- Desktop and mobile layouts remain usable, including long report pages and narrow screens.
- Every implemented feature has real state and gameplay effects; no fake controls or placeholder analytics.
- Each phase passes typecheck, targeted verification, production build, and regression checks before the next phase begins.

## Architecture and boundaries

The existing engine remains the authoritative state-transition layer. New behavior is separated into focused modules:

- `game/engine.ts`: coordinates weekly simulation and player actions.
- `game/accounting.ts` or existing ledger helpers: records all cash and statement events.
- `game/production.ts`: project lifecycle, risk, delays, overruns, and outcomes.
- `game/talent.ts`: skill, specialization, reliability, morale, chemistry, and availability.
- `game/market.ts`: demand, trends, seasons, competition, and industry shocks.
- `game/progression.ts`: tiers, capacity, unlocks, milestones, and achievements.
- `game/reports.ts`: pure financial and management analytics.
- React components: presentation, interaction, and local view state only.

Modules must return typed values or immutable state transitions. Complex calculations must not be embedded directly in JSX. Deterministic inputs should produce deterministic outputs; randomness must use the existing simulation conventions and be testable.

## Phase 1 — Audit and foundation

Before expanding gameplay:

- Inventory current state, engine transitions, save versions, UI routes, and ledger categories.
- Add or strengthen validation for optional and legacy fields.
- Identify duplicated cash, revenue, and production calculations.
- Add invariants for cash effects, loan balances, investment settlement, revenue counting, expense counting, and the balance-sheet equation.
- Preserve and test old-save migration.
- Record a baseline for current gameplay behavior and financial results.

No feature in later phases may bypass the ledger or silently replace existing save data.

## Phase 2 — Core gameplay depth

### Projects and production

Projects gain meaningful typed attributes where compatible with the existing model:

- Story and script quality
- Commercial potential
- Production difficulty
- Target audience
- Expected market
- Budget and cost risk
- Release strategy
- Hype and reputation impact

The lifecycle remains development, pre-production, casting, production, post-production, marketing, and release. Production consumes money, time, talent availability, and capacity. Risk can cause balanced delays, overruns, conflicts, unexpected costs, or positive surprises.

### Talent and chemistry

Actors, directors, and writers receive gameplay-relevant characteristics:

- Skill
- Fame/popularity
- Genre specialization
- Reliability
- Asking price
- Availability
- Morale
- Chemistry
- Reputation
- Career stage

Chemistry, rivalries, and compatibility influence quality, schedule risk, hype, or cost within bounded ranges. Expensive talent increases upside and financial exposure; lower-cost talent can be strategically correct.

### Marketing and release strategy

Marketing choices include low, standard, aggressive, premium, and international approaches. Marketing affects awareness, hype, reach, streaming interest, and opening potential without guaranteeing success.

Release strategies include wide theatrical, limited theatrical, streaming-first, hybrid, international, and delayed release. Strategies affect timing, revenue mix, longevity, risk, and audience reach.

## Phase 3 — Industry, franchises, events, and progression

### Market and rivals

Introduce lightweight but real industry behavior:

- Rival studio projects and releases
- Genre demand and trends
- Seasonal demand
- Competition for talent and audiences
- Breakout and declining genres
- Major releases and market shocks

Rivals may grow, lose money, compete, and occasionally fail. Their state must affect the player rather than exist as decorative text.

### Revenue

Revenue uses bounded contributions from quality, script, cast, director, genre, hype, marketing, reputation, demand, competition, release strategy, word of mouth, opening performance, and longevity. Outcomes range from disaster through mega blockbuster and remain probabilistic rather than guaranteed.

Streaming uses a distinct model based on platform deals, licensing, viewership, contract value, longevity, international performance, and platform popularity.

### Franchises and progression

Successful content can create sequel, spin-off, character, and franchise opportunities. Sequels consider prior performance, fatigue, story quality, talent, budget, marketing, and franchise reputation; failure can damage a franchise.

Progression moves through startup, small, established, major, global, and entertainment-empire stages. Unlocks must provide meaningful capacity or strategic capability. Achievements reinforce real gameplay milestones.

### Events

Events have context, player choice, and consequences. Examples include disputes, delays, viral opportunities, market crashes, genre trends, streaming offers, rival competition, legal issues, and talent breakthroughs. Event frequency and impact must be bounded and tested.

## Phase 4 — Finance and management analytics

The existing append-only ledger remains the source of truth for financial events. Maintain separation of:

- Income
- Expenses
- Assets
- Liabilities
- Equity
- Cash movements

Principal transfers must not become income or expense. Interest remains expense or income as appropriate. Investment funding remains an asset movement and investment returns remain separate.

Expand Reports progressively with:

- Cash-flow view
- Revenue breakdown
- Expense breakdown
- Profit margin
- Debt ratio
- Return on investment
- Project profitability
- Studio growth
- Financial trends
- Month/year comparisons

Reports should optionally explain why cash, profit, debt, or project performance changed without overwhelming the primary statement views.

## Phase 5 — Executive dashboard and UI/UX

The Studio dashboard becomes an executive control center showing:

- Cash, revenue, expenses, profit, and debt
- Reputation and tier
- Active productions and upcoming releases
- Recent financial events
- Current risks
- Opportunities
- Important alerts
- Recommended next actions

Add practical quality-of-life features where they improve decisions: search, filtering, sorting, project status filters, talent filters, financial period filters, quick actions, confirmations, tooltips, and contextual explanations.

Maintain the current professional studio/finance visual language, clear hierarchy, consistent controls, semantic status colors, useful motion, strong empty/error states, and first-class mobile behavior. Only genuinely wide content may scroll horizontally; the page itself must remain vertically scrollable.

## Persistence and compatibility

Every schema change requires:

1. Version detection.
2. Preservation of existing fields.
3. Safe defaults for new fields.
4. Ledger migration where reconstruction is possible.
5. Validation that excludes malformed optional entries without crashing.
6. Tests for new saves, old saves, missing fields, and partial state.

No migration may silently destroy progress.

## Testing and release gates

Each phase must run:

- TypeScript typecheck.
- Targeted finance/gameplay verification.
- Regression verification.
- Production web build.
- Manual browser checks at desktop and mobile widths.

The final phase additionally checks:

- New game, production, casting, marketing, release, streaming, and franchise loops.
- Loans, interest, repayment, lending, defaults, investments, returns, negative cash, loss, and large numbers.
- Overview, balance sheet, P&L, cash flow, trends, periods, zero values, negative values, and large values.
- Save migration and malformed optional data.
- Economy exploits, guaranteed-profit paths, repeated events, debt exploits, and save/reload exploits.
- Android APK build and GitHub release asset.

Known limitations must be documented instead of hidden. ICAI-inspired statements remain game management analytics, not statutory filings.
