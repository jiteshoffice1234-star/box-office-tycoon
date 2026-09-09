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
  contentType?: 'movie' | 'series' | 'show'
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

/** Extended hype multiplier for series/franchises — reaches ~15x for hits.
 *  Series earn less per-week than movies at max hype but earn for 520 weeks
 *  (10 years) vs 21 weeks for movies, so total lifetime gross is higher. */
export function megaHypeMultiplier(hype: number): number {
  const h = clamp(hype, 0, 100)
  if (h <= 30) return 1
  if (h < 50) return 1 + (h - 30) / 20 // 1x -> 2x
  if (h < 80) return 2 * Math.pow(5, (h - 50) / 50) // 2x -> ~10x
  return 10 * Math.pow(1.5, (h - 80) / 20) // 10x -> 15x
}

/** Opening weekend domestic gross in dollars. */
export function computeOpening(a: OpeningArgs): number {
  const budget = a.productionBudget
  const quality = a.quality

  // --- Box office luck roll: realistic distribution per 10 movies ---
  // 6 flops (earn ~cost, 0 profit), 2 losses (earn 10% of cost), 2 blockbusters (100x earners)
  const roll = Math.random()
  let luckMultiplier: number
  if (roll < 0.05) {
    // 5% DISASTER — earn almost nothing (quality < 30 helps trigger this)
    luckMultiplier = rand(0.001, 0.01)
  } else if (roll < 0.25) {
    // 20% LOSS — earn ~10% of cost
    luckMultiplier = rand(0.05, 0.15)
  } else if (roll < 0.60) {
    // 35% FLOP — earn ~70-110% of cost (break even, 0 profit)
    luckMultiplier = rand(0.7, 1.1)
  } else if (roll < 0.80) {
    // 20% HIT — earn 3-8x cost
    luckMultiplier = rand(3, 8)
  } else if (roll < 0.95) {
    // 15% BLOCKBUSTER — earn 15-50x cost
    luckMultiplier = rand(15, 50)
  } else {
    // 5% MEGA HIT — earn 50-100x cost
    luckMultiplier = rand(50, 100)
  }

  // Quality modifier: bad quality skews toward flops/losses, good quality toward hits
  const qualityMod = quality < 30 ? rand(0.1, 0.3) : quality < 50 ? rand(0.3, 0.8) : quality < 70 ? rand(0.7, 1.3) : rand(1.0, 1.5)

  // Hype modifier: low hype hurts, high hype helps
  const hypeM = (a.contentType === 'series' || a.contentType === 'show') ? megaHypeMultiplier(a.hype) : hypeMultiplier(a.hype)
  const hypeMod = clamp(hypeM * 0.3, 0.3, 3)

  // Franchise bonus
  const franchiseMod = a.franchiseBonus

  // Competition penalty
  const comp = clamp(1 - 0.08 * a.sameWeekCompetition, 0.5, 1)

  // Final calculation: luck × quality × hype × franchise × competition × timing × budget
  const timing = timingMultiplier(a.genre, a.releaseWeek)
  const raw = luckMultiplier * qualityMod * hypeMod * franchiseMod * comp * timing * budget

  // Floor: even the worst movie earns something
  const opening = Math.max(budget * 0.001, raw)

  // Cap at 100x budget (mega hits don't go beyond that)
  return Math.min(opening, budget * 100)
}

// ~5 months in theaters (21 weeks of gross, then the run ends)
const LEGS = [
  1, 0.48, 0.32, 0.23, 0.17, 0.13, 0.1, 0.085, 0.072, 0.061,
  0.052, 0.045, 0.039, 0.034, 0.03, 0.027, 0.024, 0.021, 0.019, 0.017, 0.015,
]

// Evergreen legs for quality movies — continues earning small amounts for years
const EVERGREEN_LEGS = [
  1, 0.55, 0.40, 0.30, 0.24, 0.19, 0.15, 0.12, 0.10, 0.085,
  0.072, 0.061, 0.052, 0.045, 0.039, 0.034, 0.03, 0.027, 0.024, 0.021,
  0.019, 0.017, 0.015, 0.013, 0.012, 0.011, 0.010, 0.009, 0.008, 0.007,
  0.006, 0.0055, 0.005, 0.0045, 0.004, 0.0035, 0.003, 0.0028, 0.0026, 0.0024,
  0.0022, 0.002, 0.0018, 0.0016, 0.0014, 0.0012, 0.001, 0.0009, 0.0008, 0.0007,
]

// Series legs — long tail for TV shows (520 weeks = 10 years)
const SERIES_LEGS = [
  1,
  0.971833,
  0.944459,
  0.917856,
  0.892003,
  0.866878,
  0.84246,
  0.818731,
  0.795669,
  0.773258,
  0.751477,
  0.73031,
  0.70974,
  0.689748,
  0.67032,
  0.651439,
  0.63309,
  0.615258,
  0.597928,
  0.581086,
  0.564718,
  0.548812,
  0.533353,
  0.51833,
  0.50373,
  0.489542,
  0.475753,
  0.462352,
  0.449329,
  0.436673,
  0.424373,
  0.412419,
  0.400803,
  0.389513,
  0.378542,
  0.367879,
  0.357517,
  0.347447,
  0.337661,
  0.32815,
  0.318907,
  0.309924,
  0.301194,
  0.29271,
  0.284466,
  0.276453,
  0.268666,
  0.261099,
  0.253744,
  0.246597,
  0.239651,
  0.232901,
  0.226341,
  0.221366,
  0.216501,
  0.211743,
  0.20709,
  0.202538,
  0.198087,
  0.193734,
  0.189476,
  0.185312,
  0.181239,
  0.177256,
  0.173361,
  0.169551,
  0.165824,
  0.16218,
  0.158616,
  0.15513,
  0.151721,
  0.148386,
  0.145125,
  0.141936,
  0.138816,
  0.135766,
  0.132782,
  0.129864,
  0.12701,
  0.124218,
  0.121488,
  0.118818,
  0.116207,
  0.113653,
  0.111155,
  0.108713,
  0.106323,
  0.103987,
  0.101701,
  0.099466,
  0.09728,
  0.095142,
  0.093051,
  0.091006,
  0.089006,
  0.08705,
  0.085137,
  0.083266,
  0.081436,
  0.079646,
  0.077896,
  0.076184,
  0.07451,
  0.072872,
  0.071271,
  0.070562,
  0.069859,
  0.069164,
  0.068476,
  0.067795,
  0.06712,
  0.066452,
  0.065791,
  0.065137,
  0.064488,
  0.063847,
  0.063211,
  0.062582,
  0.06196,
  0.061343,
  0.060733,
  0.060129,
  0.05953,
  0.058938,
  0.058352,
  0.057771,
  0.057196,
  0.056627,
  0.056064,
  0.055506,
  0.054953,
  0.054407,
  0.053865,
  0.053329,
  0.052799,
  0.052273,
  0.051753,
  0.051238,
  0.050728,
  0.050224,
  0.049724,
  0.049229,
  0.048739,
  0.048254,
  0.047774,
  0.047299,
  0.046828,
  0.046362,
  0.045901,
  0.045444,
  0.044992,
  0.044544,
  0.044101,
  0.043662,
  0.043228,
  0.042798,
  0.042372,
  0.04195,
  0.041533,
  0.04112,
  0.04071,
  0.040305,
  0.039904,
  0.039507,
  0.039114,
  0.038725,
  0.03834,
  0.037958,
  0.037581,
  0.037207,
  0.036836,
  0.03647,
  0.036107,
  0.035748,
  0.035392,
  0.03504,
  0.034691,
  0.034346,
  0.034004,
  0.033666,
  0.033331,
  0.032999,
  0.032671,
  0.032346,
  0.032024,
  0.031705,
  0.03139,
  0.031078,
  0.030768,
  0.030462,
  0.030159,
  0.029859,
  0.029562,
  0.029268,
  0.028977,
  0.028688,
  0.028403,
  0.02812,
  0.02784,
  0.027563,
  0.027289,
  0.027018,
  0.026749,
  0.026483,
  0.026219,
  0.025958,
  0.0257,
  0.025444,
  0.025191,
  0.02494,
  0.024692,
  0.024446,
  0.024203,
  0.023962,
  0.023724,
  0.023488,
  0.023254,
  0.023023,
  0.022794,
  0.022567,
  0.022342,
  0.02212,
  0.0219,
  0.021682,
  0.021466,
  0.021253,
  0.021041,
  0.020832,
  0.020625,
  0.020419,
  0.020216,
  0.020015,
  0.019816,
  0.019619,
  0.019424,
  0.01923,
  0.019039,
  0.018849,
  0.018662,
  0.018476,
  0.018292,
  0.01811,
  0.01793,
  0.017752,
  0.017575,
  0.0174,
  0.017227,
  0.017056,
  0.016886,
  0.016718,
  0.016552,
  0.016387,
  0.016224,
  0.016062,
  0.015903,
  0.015744,
  0.015588,
  0.015433,
  0.015279,
  0.015127,
  0.014977,
  0.014902,
  0.014828,
  0.014754,
  0.01468,
  0.014607,
  0.014534,
  0.014461,
  0.014389,
  0.014318,
  0.014246,
  0.014175,
  0.014104,
  0.014034,
  0.013964,
  0.013894,
  0.013825,
  0.013756,
  0.013688,
  0.013619,
  0.013551,
  0.013484,
  0.013417,
  0.01335,
  0.013283,
  0.013217,
  0.013151,
  0.013085,
  0.01302,
  0.012955,
  0.01289,
  0.012826,
  0.012762,
  0.012699,
  0.012635,
  0.012572,
  0.012509,
  0.012447,
  0.012385,
  0.012323,
  0.012262,
  0.012201,
  0.01214,
  0.012079,
  0.012019,
  0.011959,
  0.011899,
  0.01184,
  0.011781,
  0.011722,
  0.011664,
  0.011606,
  0.011548,
  0.01149,
  0.011433,
  0.011376,
  0.011319,
  0.011263,
  0.011206,
  0.011151,
  0.011095,
  0.01104,
  0.010985,
  0.01093,
  0.010875,
  0.010821,
  0.010767,
  0.010713,
  0.01066,
  0.010607,
  0.010554,
  0.010501,
  0.010449,
  0.010397,
  0.010345,
  0.010293,
  0.010242,
  0.010191,
  0.01014,
  0.010089,
  0.010039,
  0.009989,
  0.009939,
  0.00989,
  0.00984,
  0.009791,
  0.009742,
  0.009694,
  0.009645,
  0.009597,
  0.009549,
  0.009502,
  0.009454,
  0.009407,
  0.00936,
  0.009314,
  0.009267,
  0.009221,
  0.009175,
  0.009129,
  0.009084,
  0.009038,
  0.008993,
  0.008948,
  0.008904,
  0.008859,
  0.008815,
  0.008771,
  0.008728,
  0.008684,
  0.008641,
  0.008598,
  0.008555,
  0.008512,
  0.00847,
  0.008427,
  0.008385,
  0.008344,
  0.008302,
  0.008261,
  0.008219,
  0.008178,
  0.008138,
  0.008097,
  0.008057,
  0.008016,
  0.007976,
  0.007937,
  0.007897,
  0.007858,
  0.007818,
  0.007779,
  0.007741,
  0.007702,
  0.007664,
  0.007625,
  0.007587,
  0.00755,
  0.007512,
  0.007474,
  0.007437,
  0.0074,
  0.007363,
  0.007326,
  0.00729,
  0.007254,
  0.007217,
  0.007181,
  0.007146,
  0.00711,
  0.007074,
  0.007039,
  0.007004,
  0.006969,
  0.006934,
  0.0069,
  0.006865,
  0.006831,
  0.006797,
  0.006763,
  0.006729,
  0.006696,
  0.006662,
  0.006629,
  0.006596,
  0.006563,
  0.006531,
  0.006498,
  0.006466,
  0.006433,
  0.006401,
  0.006369,
  0.006338,
  0.006306,
  0.006274,
  0.006243,
  0.006212,
  0.006181,
  0.00615,
  0.00612,
  0.006089,
  0.006059,
  0.006028,
  0.005998,
  0.005968,
  0.005939,
  0.005909,
  0.00588,
  0.00585,
  0.005821,
  0.005792,
  0.005763,
  0.005734,
  0.005706,
  0.005677,
  0.005649,
  0.005621,
  0.005593,
  0.005565,
  0.005537,
  0.00551,
  0.005482,
  0.005455,
  0.005428,
  0.0054,
  0.005374,
  0.005347,
  0.00532,
  0.005294,
  0.005267,
  0.005241,
  0.005215,
  0.005189,
  0.005163,
  0.005137,
  0.005111,
  0.005086,
  0.005061,
  0.005035,
  0.00501,
  0.004985,
  0.00496,
  0.004936,
  0.004911,
  0.004887,
  0.004862,
  0.004838,
  0.004814,
  0.00479,
  0.004766,
  0.004742,
  0.004718,
  0.004695,
  0.004672,
  0.004648,
  0.004625,
  0.004602,
  0.004579,
  0.004556,
  0.004533,
  0.004511,
  0.004488,
  0.004466,
  0.004444,
  0.004422,
  0.004399,
  0.004378,
  0.004356,
  0.004334,
  0.004312,
  0.004291,
  0.004269,
  0.004248,
  0.004227,
  0.004206,
  0.004185,
  0.004164,
  0.004143,
  0.004123,
  0.004102,
]

/** Gross for week i (0 = opening). Legs get longer for better movies. */
export function weeklyGross(opening: number, quality: number, i: number, contentType: 'movie' | 'series' | 'show' = 'movie'): number {
  let legs: number[]
  if (contentType === 'series' || contentType === 'show') {
    legs = SERIES_LEGS
  } else if (quality >= 70) {
    // quality movies get evergreen legs — earn for years
    legs = quality >= 85 ? EVERGREEN_LEGS : [...LEGS, ...EVERGREEN_LEGS.slice(LEGS.length)]
  } else {
    legs = LEGS
  }
  if (i >= legs.length) return 0
  // For series/shows, cap quality bonus to prevent exponential explosion over 520 weeks
  const isLongRun = contentType === 'series' || contentType === 'show'
  const adjRate = isLongRun ? 0.0003 : 0.002
  const adjCap = isLongRun ? 1.5 : Infinity
  const legsAdj = Math.min(1 + (quality - 50) * adjRate, adjCap)
  const g = opening * legs[i] * (isLongRun ? legsAdj : Math.pow(legsAdj, i)) * rand(0.9, 1.1)
  if (g < opening * 0.003) return 0 // run ends
  // Cap weekly gross at $2B per title to keep numbers sane
  return Math.min(g, 2_000_000_000)
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

export function productionWeeks(_budget: number): number {
  // All movies take 3 weeks to produce (3w production + 3w marketing = 6w total)
  return 3
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

