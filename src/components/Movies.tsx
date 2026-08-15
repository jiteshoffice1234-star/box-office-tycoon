import { useMemo, useState } from 'react'
import type { GameState } from '../game/types'
import { makeSequel } from '../game/engine'
import { dateInfo } from '../game/formulas'
import { Btn, Card, GenreBadge, fmtMoney } from './ui'

const PAGE = 25

export function Movies({ state, apply }: { state: GameState; apply: (fn: (s: GameState) => GameState) => void }) {
  const [visible, setVisible] = useState(PAGE)
  const [filter, setFilter] = useState<'all' | 'player' | 'distributed'>('all')

  const list = useMemo(() => {
    const rows = state.movies
      .filter((m) => (filter === 'all' ? true : m.owner === filter))
      .sort((a, b) => b.releaseWeek - a.releaseWeek)
    return rows
  }, [state.movies, filter])

  const shown = list.slice(0, visible)

  return (
    <Card
      title="Filmography"
      right={
        <div className="btn-row">
          {(['all', 'player', 'distributed'] as const).map((f) => (
            <button key={f} className={`tab-mini${filter === f ? ' active' : ''}`} onClick={() => { setFilter(f); setVisible(PAGE) }}>
              {f === 'all' ? 'All' : f === 'player' ? 'Produced' : 'Distributed'}
            </button>
          ))}
        </div>
      }
    >
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Movie</th>
              <th>Genre</th>
              <th className="num">Quality</th>
              <th className="num">Budget</th>
              <th className="num">Opening</th>
              <th className="num">Total gross</th>
              <th className="num">Profit</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((m) => {
              const profit = m.revenue - m.cost
              const profitClass = profit >= 0 ? 'good' : 'bad'
              return (
                <tr key={m.id}>
                  <td>
                    <div className="cell-title">
                      {m.franchiseName && <span className="franchise-badge">🔁</span>}
                      {m.title}
                      {m.owner === 'distributed' && <span className="dist-badge">DIST</span>}
                    </div>
                    <div className="cell-sub">
                      {m.owner === 'player' ? 'You' : m.studioName} · {dateInfo(m.releaseWeek).monthName} {dateInfo(m.releaseWeek).year}
                    </div>
                  </td>
                  <td>
                    <GenreBadge g={m.genre} />
                  </td>
                  <td className="num">{m.quality}</td>
                  <td className="num">{fmtMoney(m.cost)}</td>
                  <td className="num">{m.opening > 0 ? fmtMoney(m.opening) : '—'}</td>
                  <td className="num">{fmtMoney(m.totalGross)}</td>
                  <td className={`num ${profitClass}`}>{m.finished ? fmtMoney(profit) : '…'}</td>
                  <td>
                    <span className="status">{m.status}</span>
                  </td>
                  <td>
                    {m.owner === 'player' && m.finished && m.part < 6 && m.totalGross >= m.cost * 2.5 && (
                      <Btn small kind="primary" onClick={() => apply((s) => makeSequel(s, m.id))}>
                        🎬 Sequel (part {m.part + 1})
                      </Btn>
                    )}
                  </td>
                </tr>
              )
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={9} className="muted">
                  No movies yet — write your first script to light up the marquee.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {list.length > visible && (
        <div className="btn-row center">
          <Btn onClick={() => setVisible((v) => v + PAGE)}>
            Load more ({list.length - visible} hidden — keeps things fast)
          </Btn>
        </div>
      )}
      <div className="muted small">
        {list.length} movie{list.length === 1 ? '' : 's'} · showing {shown.length} · the list stays fast no matter how
        many you make
      </div>
    </Card>
  )
}
