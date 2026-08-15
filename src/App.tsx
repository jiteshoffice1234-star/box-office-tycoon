import { useEffect, useMemo, useState } from 'react'
import { decisionNeeded, fastForward, newGame, tick, toggleAutoAdvance, castOf } from './game/engine'
import { clearSave, loadGame, saveGame } from './game/save'
import { START_CASH, START_CASH_CHOICES } from './game/data'
import type { GameState } from './game/types'
import { Header } from './components/Header'
import { Studio, type Tab } from './components/Studio'
import { Scripts } from './components/Scripts'
import { Casting } from './components/Casting'
import { Marketing } from './components/Marketing'
import { Movies } from './components/Movies'
import { Awards } from './components/Awards'
import { News } from './components/News'
import { Bank } from './components/Bank'
import { Managers } from './components/Managers'
import { Btn, fmtMoney } from './components/ui'

const TABS: { id: Tab; label: string }[] = [
  { id: 'studio', label: 'Studio' },
  { id: 'scripts', label: 'Scripts' },
  { id: 'casting', label: 'Casting' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'movies', label: 'Movies' },
  { id: 'awards', label: 'Awards' },
  { id: 'news', label: 'News' },
  { id: 'bank', label: 'Bank' },
  { id: 'managers', label: 'Managers' },
]

function pendingTab(s: GameState): Tab | null {
  if (s.production) {
    const c = castOf(s, s.production.movie)
    if (s.production.phase === 'preProduction' && (!c.writer || !c.director || c.actors.length === 0)) return 'casting'
    if (s.production.phase === 'marketing' && s.production.releaseWeek === null) return 'marketing'
  }
  return null
}

export default function App() {
  const [state, setState] = useState<GameState | null>(() => loadGame())
  const [tab, setTab] = useState<Tab>('studio')

  const apply = (fn: (s: GameState) => GameState) => setState((s) => (s ? fn(s) : s))

  // autosave (debounced)
  useEffect(() => {
    if (!state) return
    const t = setTimeout(() => saveGame(state), 700)
    return () => clearTimeout(t)
  }, [state])

  // auto-advance: keep the world turning until a decision is needed
  const decision = useMemo(() => (state ? decisionNeeded(state) : null), [state])
  useEffect(() => {
    if (!state || state.gameOver) return
    if (state.autoAdvance && !decision) {
      const t = setTimeout(() => apply(tick), 500)
      return () => clearTimeout(t)
    }
  }, [state, decision])

  if (!state) {
    return (
      <StartScreen
        onStart={(name, cash) => {
          const g = newGame(name, cash)
          setState(g)
          saveGame(g)
        }}
      />
    )
  }

  if (state.gameOver) {
    return <GameOver state={state} onRestart={() => { clearSave(); setState(null) }} />
  }

  const pending = pendingTab(state)

  return (
    <div className="app">
      <Header
        state={state}
        onNextWeek={() => apply(tick)}
        onFastForward={() => apply(fastForward)}
        onToggleAuto={() => apply(toggleAutoAdvance)}
        onNewGame={() => {
          if (window.confirm('Start a brand-new studio? Your current save will be discarded.')) {
            clearSave()
            setState(null)
          }
        }}
      />
      {decision && (
        <div className="banner">
          <span>{decision}</span>
          <Btn small kind="primary" onClick={() => pending && setTab(pending)}>
            Go →
          </Btn>
        </div>
      )}
      <nav className="tabs" aria-label="Studio departments">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {pending === t.id && <span className="dot" />}
          </button>
        ))}
      </nav>
      <main className="content">
        {tab === 'studio' && <Studio state={state} go={setTab} />}
        {tab === 'scripts' && <Scripts state={state} apply={apply} />}
        {tab === 'casting' && <Casting state={state} apply={apply} />}
        {tab === 'marketing' && <Marketing state={state} apply={apply} />}
        {tab === 'movies' && <Movies state={state} apply={apply} />}
        {tab === 'awards' && <Awards state={state} />}
        {tab === 'news' && <News state={state} />}
        {tab === 'bank' && <Bank state={state} apply={apply} />}
        {tab === 'managers' && <Managers state={state} apply={apply} />}
      </main>
      <footer className="footer">
        <span>Box Office Tycoon — a movie studio management sim · saves automatically</span>
      </footer>
    </div>
  )
}

function StartScreen({ onStart }: { onStart: (name: string, cash: number) => void }) {
  const [name, setName] = useState('')
  const [cash, setCash] = useState(START_CASH)
  return (
    <div className="boot">
      <div className="boot-card">
        <div className="boot-title-chip">Box Office Tycoon</div>
        <p className="muted" style={{ marginTop: 16 }}>
          Start an indie studio and climb to Global Major. Write scripts, negotiate with stars, let marketing run
          itself, and chase the #1 spot at the yearly awards.
        </p>
        <input
          className="boot-input"
          placeholder="Name your studio"
          value={name}
          maxLength={30}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onStart(name.trim() || 'Aurora Pictures', cash)}
        />
        <div className="balance-picker">
          <div className="balance-label">Starting balance — you decide, no limits</div>
          <div className="balance-chips">
            {START_CASH_CHOICES.map((c) => (
              <button
                key={c}
                className={`balance-chip${cash === c ? ' active' : ''}`}
                onClick={() => setCash(c)}
              >
                {fmtMoney(c)}
              </button>
            ))}
          </div>
          <input
            className="boot-input"
            type="number"
            min={0}
            step={100_000}
            placeholder="…or type any amount (e.g. 1000000000000000)"
            value={cash === 0 ? '' : cash}
            onChange={(e) => setCash(Math.min(1e21, Math.max(0, Number(e.target.value) || 0)))}
          />
        </div>
        <div className="btn-row">
          <Btn kind="primary" onClick={() => onStart(name.trim() || 'Aurora Pictures', cash)}>
            Start studio with {fmtMoney(cash)}
          </Btn>
        </div>
        <p className="boot-sub">
          Tip: turn on Auto in the header and the game plays itself between decisions — including all marketing.
        </p>
      </div>
    </div>
  )
}

function GameOver({ state, onRestart }: { state: GameState; onRestart: () => void }) {
  return (
    <div className="boot">
      <div className="boot-card">
        <div className="boot-title-chip" style={{ background: '#e5e0d2' }}>
          Dark Marquee
        </div>
        <p className="muted" style={{ marginTop: 16 }}>
          Your studio went bankrupt after {state.stats.moviesMade} movies over {Math.max(1, Math.floor(state.week / 52))} year(s).
        </p>
        <div className="stats-grid" style={{ margin: '16px 0' }}>
          <div className="stat"><div className="stat-label">Movies made</div><div className="stat-value">{state.stats.moviesMade}</div></div>
          <div className="stat"><div className="stat-label">Awards won</div><div className="stat-value">{state.stats.awardsWon}</div></div>
          <div className="stat"><div className="stat-label">Blockbusters</div><div className="stat-value">{state.stats.blockbusters}</div></div>
          <div className="stat"><div className="stat-label">Total earned</div><div className="stat-value">{fmtMoney(state.stats.totalEarned)}</div></div>
        </div>
        <Btn kind="primary" onClick={onRestart}>
          Start over
        </Btn>
      </div>
    </div>
  )
}
