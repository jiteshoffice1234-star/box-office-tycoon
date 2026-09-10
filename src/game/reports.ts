import type {
  BalanceSheet,
  GameState,
  LedgerCategory,
  LedgerEntry,
  ProfitAndLoss,
  ReportBundle,
  ReportPoint,
  ReportRange,
  ReportTotals,
} from './types'

const incomeCategories: LedgerCategory[] = ['boxOffice', 'streaming', 'otherIncome', 'lending', 'investmentReturn']
const expenseCategories: LedgerCategory[] = [
  'production',
  'marketing',
  'scripts',
  'talent',
  'managerSalary',
  'operatingCost',
  'loanInterest',
]

export function createOpeningLedger(cash: number): LedgerEntry[] {
  const amount = Number.isFinite(cash) ? cash : 0
  return [{
    id: 'ledger-opening',
    week: 0,
    category: 'openingCapital',
    amount,
    cashEffect: amount,
    classification: 'equity',
    description: 'Opening studio capital',
  }]
}

function validEntry(entry: unknown): entry is LedgerEntry {
  if (!entry || typeof entry !== 'object') return false
  const e = entry as LedgerEntry
  return typeof e.id === 'string' && typeof e.week === 'number' && Number.isFinite(e.week)
    && typeof e.category === 'string' && typeof e.amount === 'number' && Number.isFinite(e.amount)
    && typeof e.cashEffect === 'number' && Number.isFinite(e.cashEffect)
    && typeof e.classification === 'string' && typeof e.description === 'string'
}

function entriesFor(state: GameState): LedgerEntry[] {
  return (state.ledger ?? []).filter(validEntry)
}

function inRange(entry: LedgerEntry, range: ReportRange): boolean {
  return entry.week >= range.startWeek && entry.week <= range.endWeek
}

function sumCategory(entries: LedgerEntry[], categories: LedgerCategory[]): Partial<Record<LedgerCategory, number>> {
  const out: Partial<Record<LedgerCategory, number>> = {}
  for (const entry of entries) {
    if (!categories.includes(entry.category)) continue
    out[entry.category] = (out[entry.category] ?? 0) + Math.abs(entry.amount)
  }
  return out
}

function total(values: Partial<Record<LedgerCategory, number>>): number {
  return Object.values(values).reduce((sum, value) => sum + (value ?? 0), 0)
}

function totalsFor(entries: LedgerEntry[], state: GameState, range: ReportRange): ReportTotals {
  const period = entries.filter((entry) => inRange(entry, range))
  const incomeByCategory = sumCategory(period, incomeCategories)
  const expenseByCategory = sumCategory(period, expenseCategories)
  const income = total(incomeByCategory)
  const expenses = total(expenseByCategory)
  const cashAtStart = state.cash - entries.filter((entry) => entry.week > range.endWeek).reduce((sum, e) => sum + e.cashEffect, 0)
  const liabilities = state.loans.filter((loan) => loan.kind === 'borrow' && !loan.settled).reduce((sum, loan) => sum + Math.max(0, loan.outstanding), 0)
  return {
    income,
    expenses,
    netProfit: income - expenses,
    cash: cashAtStart,
    liabilities,
    equity: cashAtStart - liabilities,
    incomeByCategory,
    expenseByCategory,
  }
}

function balanceSheet(state: GameState, entries: LedgerEntry[], range: ReportRange, profit: number): BalanceSheet {
  const cash = state.cash
  const workInProgress = state.production?.movie.cost ?? 0
  const releasedContent = state.movies
    .filter((movie) => movie.releaseWeek > 0)
    .reduce((sum, movie) => sum + Math.max(0, movie.cost - movie.revenue), 0)
  const loansReceivable = state.loans
    .filter((loan) => loan.kind === 'lend' && !loan.settled)
    .reduce((sum, loan) => sum + Math.max(0, loan.principal - loan.received), 0)
  const investments = state.investments
    .filter((investment) => !investment.settled)
    .reduce((sum, investment) => sum + Math.max(0, investment.amount - investment.totalReturn), 0)
  const borrowedLoans = state.loans
    .filter((loan) => loan.kind === 'borrow' && !loan.settled)
    .reduce((sum, loan) => sum + Math.max(0, loan.outstanding), 0)
  const openingCapital = entries
    .filter((entry) => entry.category === 'openingCapital' && entry.classification === 'equity')
    .reduce((sum, entry) => sum + entry.amount, 0)
  const allProfit = totalsFor(entries, state, { startWeek: Number.MIN_SAFE_INTEGER, endWeek: range.endWeek }).netProfit
  const retainedEarnings = allProfit - profit
  const totalAssets = cash + workInProgress + releasedContent + loansReceivable + investments
  const totalLiabilities = borrowedLoans
  const totalEquity = openingCapital + retainedEarnings + profit
  return {
    asOfWeek: range.endWeek,
    assets: { cash, workInProgress, releasedContent, loansReceivable, investments, other: 0 },
    liabilities: { borrowedLoans, other: 0 },
    equity: { openingCapital, retainedEarnings, currentPeriodProfit: profit },
    totalAssets,
    totalLiabilities,
    totalEquity,
    balanceCheck: totalAssets - (totalLiabilities + totalEquity),
  }
}

export function calculateReports(state: GameState, range: ReportRange): ReportBundle {
  const normalized: ReportRange = {
    startWeek: Math.min(range.startWeek, range.endWeek),
    endWeek: Math.max(range.startWeek, range.endWeek),
  }
  const entries = entriesFor(state)
  const totals = totalsFor(entries, state, normalized)
  const points: ReportPoint[] = []
  for (let week = normalized.startWeek; week <= normalized.endWeek; week++) {
    const weekEntries = entries.filter((entry) => entry.week === week)
    const income = total(sumCategory(weekEntries, incomeCategories))
    const expenses = total(sumCategory(weekEntries, expenseCategories))
    const cash = state.cash - entries.filter((entry) => entry.week > week).reduce((sum, entry) => sum + entry.cashEffect, 0)
    points.push({ week, income, expenses, netProfit: income - expenses, cash, liabilities: totals.liabilities, equity: cash - totals.liabilities })
  }
  const profitAndLoss: ProfitAndLoss = {
    range: normalized,
    income: totals.incomeByCategory,
    expenses: totals.expenseByCategory,
    totalIncome: totals.income,
    totalExpenses: totals.expenses,
    netProfit: totals.netProfit,
  }
  return { overview: { points, totals }, balanceSheet: balanceSheet(state, entries, normalized, totals.netProfit), profitAndLoss }
}
