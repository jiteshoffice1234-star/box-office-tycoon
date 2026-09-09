# Box Office Tycoon Bug and Stability Design

**Goal:** Make every currently reproducible game-state, revenue, automation, save, and mobile-layout failure fixable and verifiable without changing the game's core management-sim identity.

## Behavioral Contracts

- Every player action that spends cash must reject insufficient funds without mutating the game state.
- Every release path (theatrical, streaming, or simultaneous) must assign a release week, leave the production pipeline, and create a revenue path.
- Movie revenue must update `cash`, `movie.revenue`, `movie.totalGross`, and weekly history together so the displayed business result matches the balance.
- Auto-run must never remain blocked on a decision that the selected automation mode can resolve.
- Removing talent from an unstarted production must make that talent available again and refund the associated cast cost.
- Save migration must tolerate missing optional fields and preserve a recoverable game instead of silently discarding a structurally partial save.
- Responsive layout must prevent page-level horizontal overflow; dense tables and lists may scroll inside their own containers.

## Scope

The first repair pass covers the engine release/revenue path, marketing cash guards, talent lifecycle, save migration, manager automation, and mobile CSS. Each issue receives a focused executable check. After those checks pass, a second read-only audit will inspect remaining feature actions and UI components for additional reproducible defects.

## Error Handling

Invalid actions return the original state or a state with a user-facing log message; they do not throw during normal play. Corrupt saves return to a clean start screen only when the JSON cannot be parsed or the minimum identity fields are unusable.

## Verification

Use `npm run typecheck`, `npm run build`, `npm run verify`, and focused TypeScript regression scripts under `scripts/`. Run a production preview smoke check for the responsive shell after CSS changes.
