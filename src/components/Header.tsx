import { dateInfo } from '../game/formulas'
import { tierForRep } from '../game/engine'
import { REP_MAX } from '../game/data'
import type { GameState } from '../game/types'
import { Bar, fmtMoney } from './ui'

export function Header({
  state,
  onNextWeek,
  onFastForward,
  onToggleAuto,
  onNewGame,
}: {
  state: GameState
  onNextWeek: () => void
  onFastForward: () => void
  onToggleAuto: () => void
  onNewGame: () => void
}) {
  const d = dateInfo(state.week)
  const tier = tierForRep(state.reputation)
  return (
    <header className="header">
      <div className="header-studio">
        <div className="studio-name-chip">{state.studioName}</div>
        <div className="tier-chip">{tier.name}</div>
      </div>

      <div className="header-rep">
        <div className="rep-line">
          <span>REP {Math.round(state.reputation)}/{REP_MAX}</span>
          <span className="rep-next">{tier.name === 'Global Major' ? '★ TOP' : `NEXT: ${nextTierRep(state.reputation)}`}</span>
        </div>
        <Bar value={state.reputation} max={REP_MAX} />
      </div>

      <div className="header-date">
        {d.monthName} {d.weekOfYear}, Y{d.year} · {d.season || 'Off-season'}
      </div>

      <div className="header-cash">
        <div className="cash-label">Cash</div>
        <div className={`cash-now${state.cash < 0 ? ' neg' : ''}`}>{fmtMoney(state.cash)}</div>
      </div>

      <div className="header-controls">
        <button className="btn btn-primary" onClick={onNextWeek}>
          Next Week ▶
        </button>
        <button className="btn" onClick={onFastForward}>
          Fast Forward ⏩
        </button>
        <button
          className={`btn ${state.autoAdvance ? 'btn-primary' : ''}`}
          onClick={onToggleAuto}
          title="Automatically advance weeks until a decision is needed — marketing runs itself"
        >
          Auto {state.autoAdvance ? 'ON' : 'OFF'}
        </button>
        <button className="btn btn-ghost" onClick={onNewGame} title="Start a new studio (current save is discarded)">
          New Game
        </button>
      </div>
    </header>
  )
}

function nextTierRep(rep: number): number {
  if (rep < 50) return 50
  if (rep < 120) return 120
  if (rep < 220) return 220
  return 300
}
