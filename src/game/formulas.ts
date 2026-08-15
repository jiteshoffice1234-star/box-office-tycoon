import { genreMeta, SEASONS, MONTH_NAMES } from './data'
import type { DepartmentAlloc, Genre } from './types'

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v))

export const rand = (lo: number, hi: number): number =>
  lo + Math.random() * (hi - lo)

export interface QualityArgs {
  scriptQuality: number
  writerFame: number
  directorFame: number
  directorAffinity: string | null
  actorFames: number[]
  genre: Genre
  productionBudget: number
  deptBalance: number // 0..1 how evenly departments were funded
}

/** Overall movie quality 0-100. Higher budget buys better filmmaking, but talent + script dominate. */
export function computeQuality(a: QualityArgs): number {
  let q = a.scriptQuality
  q += a.writerFame * 0.06
  q += a.directorFame * 0.1 + (a.directorAffinity === a.genre ? 4 : 0)
  const avgActor =
    a.actorFames.length > 0
      ? a.actorFames.reduce((s, f) => s + f, 0) / a.actorFames.length
      : 0
  const actW = genreMeta(a.genre).act
  q += clamp(avgActor, 0, 100) * actW * 0.15
  // expensive genres need more money to reach the same quality
  const effective = a.productionBudget / genreMeta(a.genre).cost
  // log scale: ~$3k -> 0, ~$100M+ -> 1
  const bf = clamp((Math.log10(effective) - 3.5) / 3.5, 0, 1)
  q += bf * 8
  q += a.deptBalance >= 0.75 ? 3 : 0
  q += rand(-2, 2) // the magic of moviemaking
  return Math.round(clamp(q, 0, 100))
}

export interface OpeningArgs {
  quality: number
  genre: Genre
  avgActorFame: number
  hype: number // 0-100
  releaseWeek: number
  sameWeekCompetition: number // other major releases that week
  franchiseBonus: number // 1 + 0.13*(part-1)
  productionBudget: number
}

/**
 * Hype drives the box office exponentially:
 *   hype <= 30  -> 1x
 *   hype = 50   -> 2x
 *   hype = 75   -> ~14x
 *   hype = 100  -> 100x
 * Max hype means a movie can make 100x+ its money.
 */
export function hypeMultiplier(hype: number): number {
  const h = clamp(hype, 0, 100)
  if (h <= 30) return 1
  if (h < 50) return 1 + (h - 30) / 20 // linear 1x -> 2x
  return 2 * Math.pow(50, (h - 50) / 50) // exponential 2x -> 100x
}

/** Opening weekend domestic gross in dollars. */
export function computeOpening(a: OpeningArgs): number {
  const q = a.quality / 100
  const genre = genreMeta(a.genre)
  const qualityFactor = Math.pow(q, 2.1) * genre.mult
  const draw = 0.85 + (a.avgActorFame / 100) * 0.65
  const hypeM = hypeMultiplier(a.hype)
  const timing = timingMultiplier(a.genre, a.releaseWeek)
  const comp = clamp(1 - 0.09 * a.sameWeekCompetition, 0.6, 1)
  const spend = Math.pow(a.productionBudget, 0.72)
  const rnd = rand(0.88, 1.12)
  return (
    qualityFactor *
    draw *
    hypeM *
    timing *
    comp *
    a.franchiseBonus *
    spend *
    76 *
    rnd
  )
}

// ~5 months in theaters (21 weeks of gross, then the run ends)
const LEGS = [
  1, 0.48, 0.32, 0.23, 0.17, 0.13, 0.1, 0.085, 0.072, 0.061,
  0.052, 0.045, 0.039, 0.034, 0.03, 0.027, 0.024, 0.021, 0.019, 0.017, 0.015,
]

/** Gross for week i (0 = opening). Legs get longer for better movies. */
export function weeklyGross(opening: number, quality: number, i: number): number {
  if (i >= LEGS.length) return 0
  const legsAdj = 1 + (quality - 50) * 0.002
  const g = opening * LEGS[i] * Math.pow(legsAdj, i) * rand(0.9, 1.1)
  if (g < opening * 0.008) return 0 // theater run ends
  return g
}

/** Studio's take on a given movie's total gross. */
export function studioShare(totalGross: number, genre: Genre): number {
  const intl = genreMeta(genre).intl
  // domestic share 55%, international share 40%, home video/VOD 18% of theatrical
  return totalGross * (0.55 + 0.4 * intl + 0.18)
}

/** Hype added by one week of marketing at a given spend fraction of budget. */
export function hypeGain(strategyPct: number, productionBudget: number): number {
  if (strategyPct <= 0) return -1.5
  const weeklySpend = strategyPct * productionBudget
  // smaller movies get relatively more hype per dollar
  const eff = weeklySpend / Math.max(productionBudget, 1) / 0.1
  return clamp(eff * 10, 2, 20)
}

export function initialHype(avgActorFame: number): number {
  return 5 + (avgActorFame / 100) * 25
}

export function timingMultiplier(genre: Genre, week: number): number {
  const wy = week % 52
  let m = 1
  for (const s of SEASONS) {
    if (wy >= s.start && wy <= s.end) {
      if (s.boost[genre]) m *= s.boost[genre]!
      if (s.penalize[genre]) m *= s.penalize[genre]!
    }
  }
  return m
}

export function seasonName(week: number): string {
  const wy = week % 52
  for (const s of SEASONS) {
    if (wy >= s.start && wy <= s.end) return s.name
  }
  return ''
}

/** Asking price by fame. Actors are the priciest, writers the cheapest. */
export function talentPrice(fame: number, role: string): number {
  const base = Math.pow(fame, 2.0) * 600
  if (role === 'director') return Math.round(base * 0.5)
  if (role === 'writer') return Math.round(base * 0.18)
  return Math.round(base)
}

/** Chance a talent accepts an offer below asking. offer >= asking -> 1. */
export function acceptChance(offer: number, asking: number): number {
  if (offer >= asking) return 1
  const ratio = offer / asking
  return clamp(Math.pow(ratio, 1.5), 0.05, 0.97)
}

export function scriptPrice(quality: number): number {
  return Math.round(Math.pow(quality, 2.2) * 170)
}

export function writeScriptCost(quality: number): number {
  return Math.round(Math.pow(quality, 1.9) * 300)
}

export function awardScore(quality: number, genre: Genre): number {
  return quality * 0.7 + genreMeta(genre).award * 25
}

export function deptBalance(d: DepartmentAlloc): number {
  const vals = Object.values(d)
  const total = vals.reduce((s, v) => s + v, 0)
  if (total <= 0) return 0
  const avg = total / vals.length
  const dev = Math.sqrt(vals.reduce((s, v) => s + (v - avg) ** 2, 0) / vals.length)
  return clamp(1 - dev / Math.max(total, 1), 0, 1)
}

export function productionWeeks(budget: number): number {
  return 3 + Math.round(budget / 6_000_000)
}

export interface DateInfo {
  year: number
  weekOfYear: number
  monthName: string
  month: number
  season: string
}

export function dateInfo(week: number): DateInfo {
  const year = Math.floor(week / 52) + 1
  const wy = week % 52
  const month = Math.min(11, Math.floor((wy / 52) * 12))
  return {
    year,
    weekOfYear: wy + 1,
    monthName: MONTH_NAMES[month],
    month,
    season: seasonName(week),
  }
}

