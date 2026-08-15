// Simulates the full player loop for many movies and measures engine
// performance, proving the game stays fast past 100+ movies.
import { newGame, tick, createScript, putIntoProduction, hireTalent, startProduction, setRelease } from '../src/game/engine'
import type { GameState } from '../src/game/types'

const cheapDepts = { acting: 150_000, writing: 150_000, direction: 150_000, effects: 150_000, music: 150_000, editing: 150_000 }

function makeMovie(s: GameState): GameState {
  let st = { ...s, cash: 1_000_000_000 } // infinite money for the test
  st = createScript(st, 'Action', 65, '')
  const script = st.scripts[st.scripts.length - 1]
  st = putIntoProduction(st, script.id)
  const writer = st.talents.filter((t) => t.role === 'writer' && t.busyUntil <= st.week).sort((a, b) => a.asking - b.asking)[0]
  const director = st.talents.filter((t) => t.role === 'director' && t.busyUntil <= st.week).sort((a, b) => a.asking - b.asking)[0]
  const actors = st.talents.filter((t) => t.role === 'actor' && t.busyUntil <= st.week).sort((a, b) => a.asking - b.asking).slice(0, 2)
  if (!writer || !director || actors.length < 2) return { ...st, production: null } // pool exhausted; abandon
  st = hireTalent(st, writer.id, writer.asking)
  st = hireTalent(st, director.id, director.asking)
  for (const a of actors) st = hireTalent(st, a.id, a.asking)
  st = startProduction(st, cheapDepts)
  return st
}

function runGame(targetMovies: number): GameState {
  let s = newGame('Perf Test Studio')
  let made = 0
  const start = performance.now()
  while (made < targetMovies && s.week < 3000 && !s.gameOver) {
    // handle pending decisions the way an idle player would
    if (s.production && s.production.phase === 'marketing' && s.production.releaseWeek === null) {
      s = setRelease(s, s.week + 6, 'Standard')
    }
    if (!s.production && made < targetMovies) {
      s = makeMovie(s)
      if (s.production) made++
    }
    s = tick(s)
  }
  const elapsed = performance.now() - start
  const movies = s.movies.length
  const ai = s.aiMovies.length
  const logLen = s.log.length
  const saveBytes = JSON.stringify(s).length
  console.log(`movies made: ${made}, in state: ${movies} player + ${ai} AI, log: ${logLen}, save size: ${(saveBytes / 1024).toFixed(1)} KB`)
  console.log(`simulated ${s.week} weeks in ${elapsed.toFixed(0)} ms -> ${(elapsed / Math.max(s.week, 1)).toFixed(3)} ms/week`)
  console.log(`cash: $${Math.round(s.cash).toLocaleString()}, rep: ${Math.round(s.reputation)}, week: ${s.week}`)
  return s
}

const s = runGame(150) // 150 movies made
// final heavy tick: with everything in state, one more month of ticks
const t0 = performance.now()
let x = s
for (let i = 0; i < 12; i++) x = tick(x)
console.log(`final 12 ticks with ${x.movies.length + x.aiMovies.length} movies: ${(performance.now() - t0).toFixed(1)} ms`)
