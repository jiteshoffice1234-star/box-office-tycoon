import {
  computeOpening,
  weeklyGross,
  studioShare,
  computeQuality,
  hypeGain,
  initialHype,
  talentPrice,
  writeScriptCost,
  scriptPrice,
  deptBalance,
} from '../src/game/formulas'
import { GENRES } from '../src/game/data'
import type { DepartmentAlloc } from '../src/game/types'

function runMovie(q: number, budget: number, marketingPct: number, mktWeeks: number, genre: string, actorFame: number, releaseWeek: number, part: number) {
  const hype = Math.min(100, initialHype(actorFame) + hypeGain(marketingPct, budget) * mktWeeks)
  const opening = computeOpening({
    quality: q,
    genre: genre as never,
    avgActorFame: actorFame,
    hype,
    releaseWeek,
    sameWeekCompetition: 0,
    franchiseBonus: 1 + 0.13 * (part - 1),
    productionBudget: budget,
  })
  let total = 0
  for (let i = 0; i < 14; i++) {
    const g = weeklyGross(opening, q, i)
    if (g <= 0) break
    total += g
  }
  const revenue = studioShare(total, genre as never)
  const marketing = marketingPct * budget * mktWeeks
  const dirFame = Math.min(85, actorFame + 20)
  const wrFame = Math.min(70, actorFame + 15)
  const salaries = talentPrice(actorFame, 'actor') * 2 + talentPrice(dirFame, 'director') + talentPrice(wrFame, 'writer')
  const cost = budget + marketing + salaries
  return { opening, total, revenue, cost, profit: revenue - cost, hype: Math.round(hype) }
}

function fmt(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

const scenarios: Array<[string, number, number, number, number, number, number, number]> = [
  // label, quality, budget, mktPct, mktWeeks, actorFame, releaseWeek, part
  ['FIRST MOVIE: q55 script, $700k, no-name cast', 55, 700_000, 0.07, 4, 25, 25, 1],
  ['Cheap indie horror (q60, $400k, cheap cast)', 60, 400_000, 0.07, 4, 15, 43, 1],
  ['Good indie drama (q68, $800k, cheap cast)', 68, 800_000, 0.07, 5, 25, 15, 1],
  ['Mid action (q70, $8M, standard)', 70, 8_000_000, 0.07, 6, 45, 25, 1],
  ['Mid action (q70, $8M, aggressive)', 70, 8_000_000, 0.11, 6, 45, 25, 1],
  ['Studio comedy (q75, $20M, standard, holidays)', 75, 20_000_000, 0.07, 8, 55, 48, 1],
  ['Blockbuster (q82, $60M, aggressive, summer)', 82, 60_000_000, 0.11, 10, 75, 25, 1],
  ['Blockbuster (q82, $60M, aggressive, wrong season)', 82, 60_000_000, 0.11, 10, 75, 3, 1],
  ['Mega hit (q90, $120M, max, summer, part 3)', 90, 120_000_000, 0.16, 12, 90, 25, 3],
  ['No marketing (q60, $2M, none)', 60, 2_000_000, 0, 6, 25, 20, 1],
  ['Bad movie (q40, $10M, aggressive)', 40, 10_000_000, 0.11, 8, 60, 25, 1],
]

console.log('label'.padEnd(46), 'hype', 'opening'.padStart(9), 'total'.padStart(9), 'revenue'.padStart(9), 'cost'.padStart(9), 'profit'.padStart(9), 'mult')
for (const [label, q, budget, mkt, wk, fame, rw, part] of scenarios) {
  const genre = label.includes('drama') ? 'Drama' : label.includes('comedy') ? 'Comedy' : 'Action'
  const r = runMovie(q, budget, mkt, wk, genre, fame, rw, part)
  console.log(
    label.padEnd(46),
    String(r.hype).padStart(4),
    fmt(r.opening).padStart(9),
    fmt(r.total).padStart(9),
    fmt(r.revenue).padStart(9),
    fmt(r.cost).padStart(9),
    fmt(r.profit).padStart(9),
    (r.total / r.cost).toFixed(2),
  )
}

// quality checks
const even: DepartmentAlloc = { acting: 1e6, writing: 1e6, direction: 1e6, effects: 1e6, music: 1e6, editing: 1e6 }
const lopsided: DepartmentAlloc = { acting: 5.9e6, writing: 1e5, direction: 1e5, effects: 0, music: 0, editing: 0 }
console.log('\nquality: balanced 6M=', computeQuality({ scriptQuality: 65, writerFame: 55, directorFame: 70, directorAffinity: 'Action', actorFames: [50, 60], genre: 'Action', productionBudget: 6e6, deptBalance: deptBalance(even) }))
console.log('quality: lopsided 6M=', computeQuality({ scriptQuality: 65, writerFame: 55, directorFame: 70, directorAffinity: 'Action', actorFames: [50, 60], genre: 'Action', productionBudget: 6e6, deptBalance: deptBalance(lopsided) }))
console.log('quality: 50M blockbuster=', computeQuality({ scriptQuality: 78, writerFame: 80, directorFame: 88, directorAffinity: 'Sci-Fi', actorFames: [85, 82, 70], genre: 'Sci-Fi', productionBudget: 5e7, deptBalance: deptBalance(even) }))
console.log('quality: cheap indie=', computeQuality({ scriptQuality: 52, writerFame: 20, directorFame: 25, directorAffinity: null, actorFames: [15], genre: 'Horror', productionBudget: 4e5, deptBalance: deptBalance(even) }))

console.log('\nprices: script q55=', fmt(scriptPrice(55)), ' q70=', fmt(scriptPrice(70)), ' | write q55=', fmt(writeScriptCost(55)), ' q70=', fmt(writeScriptCost(70)))
console.log('actor fame 20=', fmt(talentPrice(20, 'actor')), ' 50=', fmt(talentPrice(50, 'actor')), ' 70=', fmt(talentPrice(70, 'actor')), ' 90=', fmt(talentPrice(90, 'actor')))
console.log('director fame 70=', fmt(talentPrice(70, 'director')), ' writer fame 55=', fmt(talentPrice(55, 'writer')))

// genre spread for a fixed good movie
const gs = GENRES.map((g) => {
  const r = runMovie(78, 40_000_000, 0.11, 10, g.name, 70, 25, 1)
  return `${g.name}:${fmt(r.profit)}`
})
console.log('\ngenre profit @q78 $40M aggressive summer:\n ', gs.join('\n  '))
