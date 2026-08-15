import type { Genre } from './types'

export interface GenreMeta {
  name: Genre
  emoji: string
  mult: number // audience size multiplier
  intl: number // international box office multiplier
  act: number // how much actor fame matters for quality
  award: number // award-friendliness (0-1)
  cost: number // production cost factor (cheap genres get more quality per dollar)
}

export const GENRES: GenreMeta[] = [
  { name: 'Action', emoji: '💥', mult: 1.3, intl: 1.1, act: 0.7, award: 0.45, cost: 1.15 },
  { name: 'Adventure', emoji: '🗺️', mult: 1.25, intl: 1.05, act: 0.65, award: 0.55, cost: 1.1 },
  { name: 'Animation', emoji: '🐭', mult: 1.15, intl: 0.9, act: 0.5, award: 0.6, cost: 1.3 },
  { name: 'Comedy', emoji: '😂', mult: 1.1, intl: 0.6, act: 0.9, award: 0.4, cost: 0.7 },
  { name: 'Crime', emoji: '🕵️', mult: 0.9, intl: 0.7, act: 0.95, award: 0.7, cost: 0.75 },
  { name: 'Documentary', emoji: '📹', mult: 0.35, intl: 0.5, act: 0.3, award: 0.9, cost: 0.4 },
  { name: 'Drama', emoji: '🎭', mult: 0.75, intl: 0.6, act: 1.0, award: 0.95, cost: 0.6 },
  { name: 'Family', emoji: '👨‍👩‍👧', mult: 1.15, intl: 0.9, act: 0.6, award: 0.5, cost: 1.0 },
  { name: 'Fantasy', emoji: '🐉', mult: 1.1, intl: 1.05, act: 0.6, award: 0.6, cost: 1.25 },
  { name: 'Horror', emoji: '👻', mult: 0.8, intl: 0.8, act: 0.55, award: 0.35, cost: 0.5 },
  { name: 'Musical', emoji: '🎵', mult: 0.7, intl: 0.7, act: 0.85, award: 0.7, cost: 0.7 },
  { name: 'Romance', emoji: '💘', mult: 0.85, intl: 0.65, act: 1.0, award: 0.6, cost: 0.55 },
  { name: 'Sci-Fi', emoji: '🚀', mult: 1.15, intl: 1.1, act: 0.6, award: 0.6, cost: 1.3 },
  { name: 'Thriller', emoji: '🔪', mult: 0.95, intl: 0.9, act: 0.8, award: 0.65, cost: 0.75 },
  { name: 'War', emoji: '🎖️', mult: 0.8, intl: 0.85, act: 0.75, award: 0.8, cost: 1.2 },
  { name: 'Western', emoji: '🤠', mult: 0.65, intl: 0.6, act: 0.7, award: 0.7, cost: 0.6 },
]

export const genreMeta = (g: Genre): GenreMeta => GENRES.find((x) => x.name === g)!

export const GENRE_NAMES = GENRES.map((g) => g.name)

export interface SeasonDef {
  name: string
  start: number // week-of-year inclusive
  end: number // week-of-year inclusive
  boost: Partial<Record<Genre, number>>
  penalize: Partial<Record<Genre, number>>
}

export const SEASONS: SeasonDef[] = [
  {
    name: 'Awards Season',
    start: 0,
    end: 7,
    boost: { Drama: 1.2, Documentary: 1.15, 'Musical': 1.1 },
    penalize: {},
  },
  {
    name: 'Spring',
    start: 8,
    end: 21,
    boost: { Romance: 1.15, 'Sci-Fi': 1.1 },
    penalize: {},
  },
  {
    name: 'Summer',
    start: 22,
    end: 34,
    boost: { Action: 1.25, Adventure: 1.25, Animation: 1.2, Fantasy: 1.2, 'Sci-Fi': 1.2, Family: 1.15 },
    penalize: { Drama: 0.85, Romance: 0.85 },
  },
  {
    name: 'Fall',
    start: 35,
    end: 42,
    boost: { Thriller: 1.1, Horror: 1.1, Crime: 1.05 },
    penalize: {},
  },
  {
    name: 'Halloween',
    start: 43,
    end: 43,
    boost: { Horror: 1.4, Thriller: 1.1 },
    penalize: {},
  },
  {
    name: 'Holidays',
    start: 44,
    end: 51,
    boost: { Family: 1.25, Animation: 1.25, Comedy: 1.2, Romance: 1.2, Fantasy: 1.1 },
    penalize: { Horror: 0.9, Thriller: 0.9, 'War': 0.9 },
  },
]

export interface Tier {
  name: string
  minRep: number
  maxBudget: number
}

export const TIERS: Tier[] = [
  { name: 'Indie Studio', minRep: 0, maxBudget: 5_000_000 },
  { name: 'Mini-Major', minRep: 50, maxBudget: 50_000_000 },
  { name: 'Major Studio', minRep: 120, maxBudget: 200_000_000 },
  { name: 'Global Major', minRep: 220, maxBudget: 600_000_000 },
]

export const REP_MAX = 300

export interface Strategy {
  name: string
  pct: number // fraction of production budget spent per week
  label: string
}

export const STRATEGIES: Strategy[] = [
  { name: 'None', pct: 0, label: 'Word of mouth only' },
  { name: 'Bare Bones', pct: 0.04, label: 'Social + a few billboards' },
  { name: 'Standard', pct: 0.07, label: 'TV spots + digital' },
  { name: 'Aggressive', pct: 0.11, label: 'Full media blitz' },
  { name: 'Maximum', pct: 0.16, label: 'Super Bowl ads + everything' },
]

export const START_CASH = 3_000_000
export const START_CASH_CHOICES = [
  500_000,
  1_000_000,
  3_000_000,
  5_000_000,
  10_000_000,
  25_000_000,
  100_000_000,
  1_000_000_000,
  10_000_000_000,
  1_000_000_000_000,
  1_000_000_000_000_000,
]
export const BANKRUPT_AT = -5_000_000

// ---- loans & investing ----
// Loan terms are fully player-chosen (no caps on amount or count); these are
// only the default values the Bank screen pre-fills.
export const LOAN_TERM = 10 // default borrow term, in weeks
export const LOAN_INTEREST = 0.15 // default borrow interest rate
export const LEND_TERM = 6 // default lend term, in weeks
export const LEND_INTEREST = 0.12 // default lend interest rate
export const INVEST_MAX_SHARE = 0.4 // max fraction of an AI movie's budget we can fund

export const INVEST_MIN = 100_000

// Ceiling for loan amounts and salaries ($1 sextillion). There are no gameplay
// limits on money — this only stops values so large that JS float math (which
// can hold integers exactly only up to ~9e15) would wobble by visible amounts
// and, past ~1e30, corrupt cash/loans into nonsense. 1e21 is a thousand times
// beyond "thousands of trillions" (1e18) and displays fine.
export const MAX_LOAN_AMOUNT = 1e21
export const MAX_SCRIPT_MARKET = 10
export const TALENT_CAPS = { actor: 28, director: 16, writer: 14 }
export const MIN_MARKETING_WEEKS = 3
export const MAX_MARKETING_WEEKS = 12
export const MAX_FRANCHISE_PARTS = 6
export const LOG_CAP = 40

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
