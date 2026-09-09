# Box Office Tycoon Bug Stability Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with focused verification after each task.

**Goal:** Repair reproducible engine, economy, automation, save, and mobile UI defects while preserving the existing game model.

**Architecture:** Keep the existing immutable-style `tick` and action functions. Centralize release-path setup and protect every cash mutation at its owning action. Keep migration defensive and additive. Use CSS containment and mobile breakpoints rather than component rewrites.

**Tech Stack:** React 18, TypeScript, Vite, Capacitor, plain CSS, existing `tsx` verification scripts.

## Global Constraints

- Preserve existing public game actions and save compatibility.
- Do not add a runtime dependency for behavior already supported by the repository.
- Invalid user actions must not create negative cash or deadlocked productions.
- Validate with typecheck, build, finance verification, and focused regression checks.

### Task 1: Release and Revenue Contracts

**Files:**
- Modify: `src/game/engine.ts`
- Modify: `src/game/formulas.ts`
- Test: `scripts/verify-finance.ts` or a focused new script using exported actions

- [ ] Ensure streaming selection assigns a valid release week and clears the marketing decision path.
- [ ] Apply release timing to opening calculations through the existing timing multiplier.
- [ ] Trace theatrical, streaming, and weekly gross settlement so cash, revenue, total gross, and weekly history agree.
- [ ] Verify with deterministic fixtures and `npm run verify`.

### Task 2: Cash and Talent Safety

**Files:**
- Modify: `src/game/engine.ts`
- Modify: `src/components/Casting.tsx`
- Test: focused regression script

- [ ] Reject talent offers that exceed current cash without mutation.
- [ ] Refund cast cost and clear availability when a cast member is dropped before production starts.
- [ ] Disable or explain unaffordable hire controls in the casting UI.
- [ ] Verify no invalid action produces negative cash.

### Task 3: Defensive Save Migration

**Files:**
- Modify: `src/game/save.ts`
- Test: focused migration regression script

- [ ] Validate required identity fields and supply defaults for missing arrays and nested feature fields.
- [ ] Keep malformed JSON recoverable without throwing.
- [ ] Verify partial legacy saves load into a playable state.

### Task 4: Manager Automation

**Files:**
- Modify: `src/game/engine.ts`
- Test: focused manager regression script

- [ ] Base manager hit/sequel decisions on opening or settled gross available at release, not a value that is still zero.
- [ ] Ensure manager-produced releases never require player input.
- [ ] Verify managers continue producing after release and salary/production cash flows remain consistent.

### Task 5: Responsive UI Stability

**Files:**
- Modify: `src/styles.css`
- Modify: affected components only when a concrete overflow source is found

- [ ] Prevent document-level horizontal overflow on narrow screens.
- [ ] Constrain header controls, cards, grids, long titles, buttons, and navigation labels.
- [ ] Preserve internal scrolling for tables, tabs, release lists, and news.
- [ ] Verify at narrow and desktop viewport sizes with a production preview smoke check.

### Task 6: Final Verification

- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Run `npm run verify`.
- [ ] Run focused regression scripts and inspect the final diff.
