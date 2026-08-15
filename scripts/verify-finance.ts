import {
  newGame,
  tick,
  takeLoan,
  giveLoan,
  investInMovie,
  payOffLoan,
  loanPlan,
  hireManager,
  fireManager,
  updateManager,
} from '../src/game/engine'

let failures = 0
function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`FAIL: ${msg}`)
    failures += 1
  } else {
    console.log(`ok: ${msg}`)
  }
}

// 1. custom starting balance
const g = newGame('Verify Studios', 10_000_000)
assert(g.cash === 10_000_000, `starting balance honored (${g.cash})`)

// 2. take a loan
const g2 = takeLoan(g, 2_000_000)
assert(g2.cash === 12_000_000, 'loan cash received')
assert(g2.loans.length === 1, 'loan recorded')
const loan = g2.loans[0]
assert(loan.kind === 'borrow' && loan.outstanding === 2_300_000, `outstanding = principal+15% (${loan.outstanding})`)

// 3. weekly repayments over 10 weeks
let cur = g2
for (let i = 0; i < 10; i++) cur = tick(cur)
assert(cur.loans.length === 0, 'loan fully repaid after 10 weeks')
assert(Math.abs(cur.cash - (12_000_000 - 2_300_000 - 10 * 15_000)) < 2, `cash net of loan+interest+overhead (${cur.cash})`)

// 4. pay off early
const g4 = takeLoan(newGame('Verify', 10_000_000), 1_000_000)
const paid = payOffLoan(g4, g4.loans[0].id)
assert(paid.loans.length === 0, 'pay off clears the loan')
assert(paid.cash === 11_000_000 - 1_150_000, 'pay off deducts outstanding only')

// 5. give a loan — matures with interest after 6 weeks
const g5 = giveLoan(newGame('Verify', 10_000_000), 'Horizon Pictures', 1_000_000)
assert(g5.cash === 9_000_000, 'lend cash leaves the account')
let c5 = g5
let matured = false
for (let i = 0; i < 7; i++) {
  c5 = tick(c5)
  if (c5.loans.length === 0 && i >= 5) matured = true
}
assert(matured, 'lend loan matures with interest')
assert(Math.abs(c5.cash - (9_000_000 + 1_120_000 - 7 * 15_000)) < 2, `lend returned +12% (${c5.cash})`)

// 6. invest in an AI movie — payout over the run, settled at end
const g6 = newGame('Verify', 50_000_000)
const ai = g6.aiStudios[0]
const budget = ai.budget
const amount = Math.round(budget * 0.3) // 30% stake
const inv = investInMovie(g6, ai.name, amount)
assert(inv.investments.length === 1, 'investment recorded')
assert(inv.cash === 50_000_000 - amount, 'investment cash deducted')
// advance to release
let c6 = inv
let linked = false
const beforeRelease = ai.nextReleaseWeek
while (c6.week < beforeRelease) c6 = tick(c6)
// the release week: investment should now be linked (movieId set)
linked = c6.investments[0].movieId !== null
assert(linked, 'investment linked to released movie')
// advance through the full 5-month run + a buffer
for (let i = 0; i < 26; i++) c6 = tick(c6)
const finalInv = c6.investments[0]
assert(finalInv.settled, 'investment settled after run')
const movie = c6.aiMovies.find((m) => m.id === finalInv.movieId)
assert(movie !== undefined, 'invested movie exists')
// payout is strictly proportional to the movie's gross (share of budget)
const expect = amount / movie!.productionBudget
assert(
  Math.abs(finalInv.totalReturn / movie!.totalGross - expect) < 0.001 || movie!.totalGross === 0,
  `payout matches share of gross (${finalInv.totalReturn} / ${movie!.totalGross} vs ${expect})`,
)
assert(finalInv.totalReturn > 0, `investment earned money (${finalInv.totalReturn})`)

// 7. hype multiplier curve
const { hypeMultiplier } = await import('../src/game/formulas')
assert(hypeMultiplier(30) === 1, 'hype 30 -> 1x')
assert(Math.abs(hypeMultiplier(50) - 2) < 0.01, 'hype 50 -> 2x')
assert(Math.abs(hypeMultiplier(100) - 100) < 0.01, 'hype 100 -> 100x')

if (failures > 0) {
  throw new Error(`${failures} assertion(s) failed`)
}

// 8. no caps: huge loans and many loans are allowed
const g8 = newGame('Verify', 10_000_000)
const big = takeLoan(g8, 100_000_000, 0.1, 20, 'weekly')
assert(big.loans.length === 1 && big.cash === 110_000_000, '100M loan allowed (no cap)')
const many = takeLoan(takeLoan(takeLoan(big, 5_000_000, 0.2, 5, 'weekly'), 3_000_000, 0.3, 4, 'weekly'), 7_000_000, 0.15, 6, 'weekly')
assert(many.loans.length === 4, 'multiple simultaneous loans allowed')

// 9. custom rate + term + frequency plans
assert(loanPlan(1_000_000, 0.3, 'weekly', 4).total === 1_300_000, 'custom 30% rate applied')
const daily = loanPlan(1_000_000, 0.15, 'daily', 14)
assert(daily.collections === 2 && daily.intervalWeeks === 1, 'daily: 14 days -> 2 weekly collections')
const monthly = loanPlan(1_000_000, 0.12, 'monthly', 2)
assert(monthly.collections === 2 && monthly.intervalWeeks === 4, 'monthly: 2 months -> 2 collections every 4 weeks')

// 10. custom lend terms actually pay out as planned
const g10 = newGame('Verify', 10_000_000)
const lend2 = giveLoan(g10, 'Horizon Pictures', 2_000_000, 0.2, 2, 'monthly')
assert(lend2.loans.length === 1, 'custom lend loan recorded')
assert(lend2.cash === 8_000_000, 'lend cash deducted')
let c10 = lend2
for (let i = 0; i < 9; i++) c10 = tick(c10)
assert(c10.loans.length === 0, 'monthly lend fully collected after ~2 months')
assert(Math.abs(c10.cash - (8_000_000 + 2_400_000 - 9 * 15_000)) < 2, `custom lend returned 20% (${c10.cash})`)

// 11. custom borrow terms repay exactly
const g11 = newGame('Verify', 10_000_000)
const b11 = takeLoan(g11, 1_000_000, 0.5, 2, 'monthly')
assert(b11.loans[0].totalCollections === 2 && b11.loans[0].intervalWeeks === 4, 'monthly borrow plan')
let c11 = b11
for (let i = 0; i < 9; i++) c11 = tick(c11)
assert(c11.loans.length === 0, 'monthly borrow fully repaid')
assert(Math.abs(c11.cash - (11_000_000 - 1_500_000 - 9 * 15_000)) < 2, `borrow repaid 50% interest exactly (${c11.cash})`)

// 12. no limits: quadrillions+ flow freely
const g12 = newGame('Verify', 1_000_000_000_000_000_000) // 1 quintillion start
assert(g12.cash === 1e18, 'quintillion starting balance allowed')
const q = takeLoan(g12, 500_000_000_000_000_000, 0.1, 10, 'weekly')
assert(q.cash === 1.5e18, 'quintillion-scale loan allowed')
assert(Math.abs(q.loans[0].outstanding - 5.5e17) < 1e6, 'quintillion-scale interest computed (float-safe)')

// 13. hired managers
const gm = hireManager(newGame('Verify', 10_000_000), {
  weeklySalary: 50_000,
  genre: 'Action',
  qualityTarget: 80,
  maxBudget: 3_000_000,
  marketingStrategy: 'Aggressive',
})
assert(gm.managers.length === 1, 'manager hired')
assert(gm.managers[0].genre === 'Action' && gm.managers[0].weeklySalary === 50_000, 'manager orders stored')
// salary deduction in isolation: with <400k the manager can't start a movie, so
// the only cash changes this tick are overhead + salary
const poor = tick(
  hireManager(newGame('Verify', 300_000), {
    weeklySalary: 50_000,
    genre: 'Drama',
    qualityTarget: 60,
    maxBudget: 500_000,
    marketingStrategy: 'Standard',
  }),
)
assert(poor.cash === 300_000 - 15_000 - 50_000, 'manager salary deducted weekly')
let cm = tick(gm)
for (let i = 0; i < 20; i++) cm = tick(cm)
assert(cm.production !== null && cm.production.managerId === gm.managers[0].id, 'manager auto-started a movie')
for (let i = 0; i < 80; i++) cm = tick(cm)
assert(cm.managers[0].moviesMade >= 2, `manager keeps making movies one after another (${cm.managers[0].moviesMade} so far)`)
assert(cm.movies.length >= 2, 'manager movies actually release')
const fired = fireManager(cm, cm.managers[0].id)
assert(fired.managers.length === 0, 'manager fired, salary stops')
const hired2 = hireManager(newGame('Verify', 10_000_000), {
  weeklySalary: 50_000,
  genre: null,
  qualityTarget: 70,
  maxBudget: 2_000_000,
  marketingStrategy: 'Standard',
})
const upd = updateManager(hired2, hired2.managers[0].id, { genre: 'Horror', weeklySalary: 80_000 })
assert(upd.managers[0].genre === 'Horror' && upd.managers[0].weeklySalary === 80_000, 'manager orders updated')
// multiple managers, no limit — all take their turn
const multi = hireManager(
  hireManager(newGame('Verify', 100_000_000), {
    weeklySalary: 20_000,
    genre: 'Comedy',
    qualityTarget: 60,
    maxBudget: 1_000_000,
    marketingStrategy: 'Bare Bones',
  }),
  { weeklySalary: 30_000, genre: 'Horror', qualityTarget: 70, maxBudget: 2_000_000, marketingStrategy: 'Standard' },
)
assert(multi.managers.length === 2, 'multiple managers hired, no limit')
let cmulti = multi
for (let i = 0; i < 40; i++) cmulti = tick(cmulti)
assert(cmulti.managers.every((m) => m.moviesMade >= 1), `every manager takes their turn (${cmulti.managers.map((m) => m.moviesMade).join('/')})`)

console.log('done')
