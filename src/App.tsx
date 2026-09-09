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
import { Bank } from './components/Bank'
import { Managers } from './components/Managers'
import { Btn, fmtMoney } from './components/ui'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'studio', label: 'Studio', icon: '🎬' },
  { id: 'scripts', label: 'Scripts', icon: '✍️' },
  { id: 'casting', label: 'Cast', icon: '🎭' },
  { id: 'marketing', label: 'Stream', icon: '📡' },
  { id: 'movies', label: 'Films', icon: '🎥' },
  { id: 'bank', label: 'Bank', icon: '🏦' },
  { id: 'managers', label: 'Staff', icon: '👔' },
]

function pendingTab(s: GameState): Tab | null {
  if (s.production) {
    const c = castOf(s, s.production.movie)
    if (s.production.phase === 'preProduction' && (!c.writer || !c.director || c.actors.length === 0)) return 'casting'
    if (s.production.phase === 'marketing' && s.production.releaseWeek === null) return 'scripts'
  }
  return null
}

export default function App() {
  const [state, setState] = useState<GameState | null>(() => loadGame())
  const [tab, setTab] = useState<Tab>('studio')
  // VYRA-style paper light by default, persisted
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof localStorage !== 'undefined' && localStorage.getItem('box-office-tycoon-theme') === 'dark' ? 'dark' : 'light',
  )

  const apply = (fn: (s: GameState) => GameState) => setState((s) => (s ? fn(s) : s))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('box-office-tycoon-theme', theme)
    } catch {
      /* private mode — ignore */
    }
  }, [theme])

  // autosave (debounced)
  useEffect(() => {
    if (!state) return
    const t = setTimeout(() => saveGame(state), 700)
    return () => clearTimeout(t)
  }, [state])

  // auto-advance: keep the world turning until a decision is needed
  // 850ms (was 500ms) — fewer renders per second = no jank on mobile
  const decision = useMemo(() => (state ? decisionNeeded(state) : null), [state])
  useEffect(() => {
    if (!state) return
    if (state.autoAdvance && !decision) {
      const t = setTimeout(() => apply(tick), 850)
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



  const pending = pendingTab(state)

  return (
    <div className="app">
      <Header
        state={state}
        onNextWeek={() => apply(tick)}
        onFastForward={() => apply(fastForward)}
        onToggleAuto={() => apply(toggleAutoAdvance)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
        onNewGame={() => {
          if (window.confirm('Start a brand-new studio? Your current save will be discarded.')) {
            clearSave()
            setState(null)
          }
        }}
      />
      <div className="app-body">
        <aside className="studio-rail" aria-label="Studio control room">
          <div className="rail-brand">
            <span className="rail-mark" aria-hidden="true">BO</span>
            <span><b>Box Office</b><small>Studio control room</small></span>
          </div>
          <div className="rail-section-label">Operations</div>
          <TabNav tabs={TABS} tab={tab} pending={pending} onSelect={setTab} variant="rail" />
          <div className="rail-footer">
            <span className="live-dot" aria-hidden="true" /> Autosave active
          </div>
        </aside>
        <div className="app-content">
          {decision && (
            <div className="banner">
              <span><b>Decision required</b> {decision}</span>
              <Btn small kind="primary" onClick={() => pending && setTab(pending)}>
                Open decision →
              </Btn>
            </div>
          )}
          <main id="main-content">
            {tab === 'studio' && <Studio state={state} go={setTab} />}
            {tab === 'scripts' && <Scripts state={state} apply={apply} />}
            {tab === 'casting' && <Casting state={state} apply={apply} />}
            {tab === 'marketing' && <Marketing state={state} apply={apply} />}
            {tab === 'movies' && <Movies state={state} apply={apply} />}
            {tab === 'bank' && <Bank state={state} apply={apply} />}
            {tab === 'managers' && <Managers state={state} apply={apply} />}
          </main>
          <footer className="footer">
            <span>Box Office Tycoon · saves automatically</span>
          </footer>
        </div>
      </div>
      <TabNav tabs={TABS} tab={tab} pending={pending} onSelect={setTab} variant="bottom" />
    </div>
  )
}

function TabNav({
  tabs,
  tab,
  pending,
  onSelect,
  variant,
}: {
  tabs: typeof TABS
  tab: Tab
  pending: Tab | null
  onSelect: (tab: Tab) => void
  variant: 'rail' | 'bottom'
}) {
  return (
    <nav className={variant === 'rail' ? 'rail-nav' : 'bottom-nav'} aria-label="Main navigation">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={variant === 'rail' ? `rail-item${tab === t.id ? ' active' : ''}` : `nav-item${tab === t.id ? ' active' : ''}`}
          onClick={() => onSelect(t.id)}
          aria-current={tab === t.id ? 'page' : undefined}
        >
          <span className={variant === 'rail' ? 'rail-icon' : 'nav-icon'} aria-hidden="true">{t.icon}</span>
          <span className={variant === 'rail' ? 'rail-label' : 'nav-label'}>{t.label}</span>
          {pending === t.id && <span className="nav-dot" aria-hidden="true" title="New decision ready for this tab" />}
        </button>
      ))}
    </nav>
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
          Start an indie studio and climb to Global Major. Write scripts, negotiate with stars, and let your empire grow.
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


