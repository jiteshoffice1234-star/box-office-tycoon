import { createScript, decisionNeeded, dropCast, hireTalent, newGame, putIntoProduction, setStreamingRelease } from '../src/game/engine'
import { computeOpening, timingMultiplier } from '../src/game/formulas'
import { MIN_MARKETING_WEEKS } from '../src/game/data'
import { loadGame } from '../src/game/save'

let failures = 0
function assert(condition: boolean, message: string): void {
  if (condition) console.log(`ok: ${message}`)
  else {
    console.error(`FAIL: ${message}`)
    failures += 1
  }
}

const originalRandom = Math.random
Math.random = () => 0.5

try {
  const scripted = createScript(newGame('Regression Studios', 1_000_000), 'Action', 70, 'Streaming Test')
  const script = scripted.scripts[0]
  const productionState = putIntoProduction(scripted, script.id)
  const marketingState = {
    ...productionState,
    production: productionState.production
      ? { ...productionState.production, phase: 'marketing' as const, releaseWeek: null }
      : null,
  }
  const streamed = setStreamingRelease(marketingState)
  assert(streamed.production?.releaseWeek === streamed.week + MIN_MARKETING_WEEKS, 'streaming release gets a real release week')
  assert(decisionNeeded(streamed) === null, 'streaming release does not leave auto-run blocked')

  const timingArgs = {
    quality: 70,
    genre: 'Action' as const,
    avgActorFame: 60,
    hype: 50,
    sameWeekCompetition: 0,
    franchiseBonus: 1,
    productionBudget: 1_000_000,
  }
  const winter = computeOpening({ ...timingArgs, releaseWeek: 10 })
  const summer = computeOpening({ ...timingArgs, releaseWeek: 25 })
  assert(timingMultiplier('Action', 25) > timingMultiplier('Action', 10), 'summer timing multiplier is stronger for action')
  assert(summer > winter, 'release timing changes opening gross')

  const castingScripted = createScript(newGame('Casting Studios', 10_000_000), 'Drama', 55, 'Casting Test')
  const castingState = putIntoProduction(castingScripted, castingScripted.scripts[0].id)
  const candidate = castingState.talents.find((talent) => talent.role === 'actor')
  assert(Boolean(candidate && hireTalent(castingState, candidate.id, castingState.cash + 1).cash === castingState.cash), 'unaffordable talent hire leaves cash unchanged')

  const fundedScripted = createScript(newGame('Refund Studios', 10_000_000), 'Drama', 55, 'Refund Test')
  const funded = putIntoProduction(fundedScripted, fundedScripted.scripts[0].id)
  const refundCandidate = funded.talents.find((talent) => talent.role === 'actor')
  const hired = refundCandidate ? hireTalent(funded, refundCandidate.id, refundCandidate.asking) : funded
  const dropped = refundCandidate ? dropCast(hired, refundCandidate.id) : hired
  assert(refundCandidate ? dropped.cash === funded.cash : false, 'dropping cast refunds the paid fee')
  assert(refundCandidate ? dropped.talents.find((talent) => talent.id === refundCandidate.id)?.busyUntil === 0 : false, 'dropped talent becomes available again')
} finally {
  Math.random = originalRandom
}

class MemoryStorage {
  private values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
  removeItem(key: string): void { this.values.delete(key) }
}

;(globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage()
;(globalThis as unknown as { localStorage: MemoryStorage }).localStorage.setItem(
  'box-office-tycoon-save-v1',
  JSON.stringify({ studioName: 'Recovered Studio', week: 4, movies: [], talents: [] }),
)
const recovered = loadGame()
assert(recovered !== null && Array.isArray(recovered.aiMovies) && recovered.stats !== undefined, 'partial save migrates into a playable state')

if (failures > 0) throw new Error(`${failures} regression assertion(s) failed`)
console.log('done')
