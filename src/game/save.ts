import type { GameState, Loan } from './types'

const KEY = 'box-office-tycoon-save-v1'
const CURRENT_VERSION = 2

export function saveGame(s: GameState): void {
  try {
    const slim = { ...s, log: s.log.slice(0, 30) }
    localStorage.setItem(KEY, JSON.stringify(slim))
  } catch {
    // storage full or unavailable — ignore
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GameState
    if (
      typeof parsed.studioName !== 'string' ||
      typeof parsed.week !== 'number' ||
      !Array.isArray(parsed.movies) ||
      !Array.isArray(parsed.talents)
    ) {
      return null
    }
    // migrate v1 saves -> v2 (loans & investments were added)
    if (!Array.isArray(parsed.loans)) parsed.loans = []
    if (!Array.isArray(parsed.investments)) parsed.investments = []
    // migrate saves without hired managers
    if (!Array.isArray(parsed.managers)) parsed.managers = []
    if (typeof parsed.nextManagerIdx !== 'number') parsed.nextManagerIdx = 0
    if (parsed.production && typeof (parsed.production as { managerId?: unknown }).managerId !== 'string') {
      ;(parsed.production as { managerId: string | null }).managerId = null
    }
    // migrate loans created before player-set terms existed
    parsed.loans = parsed.loans.map(migrateLoan)
    parsed.version = CURRENT_VERSION
    return parsed
  } catch {
    return null
  }
}

/** Upgrade a pre-custom-terms loan to the current shape. */
function migrateLoan(l: Loan & { weeklyPayment?: number; endWeek?: number }): Loan {
  if (typeof (l as Loan).intervalWeeks === 'number') return l as Loan
  if (l.kind === 'borrow') {
    const wp = l.weeklyPayment ?? 0
    const out = l.outstanding ?? 0
    const collections = wp > 0 ? Math.max(1, Math.ceil(out / wp)) : 1
    return {
      ...l,
      rate: 0.15,
      frequency: 'weekly',
      termValue: collections,
      intervalWeeks: 1,
      totalCollections: collections,
      collectionsDone: 0,
      installment: wp,
      nextDueWeek: (l.takenWeek ?? 0) + 1,
      received: 0,
      settled: false,
    }
  }
  return {
    ...l,
    rate: 0.12,
    frequency: 'weekly',
    termValue: 1,
    intervalWeeks: 1,
    totalCollections: 1,
    collectionsDone: 0,
    installment: 0,
    nextDueWeek: l.endWeek ?? (l.takenWeek ?? 0) + 6,
    received: 0,
    settled: false,
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
