import { useState } from 'react'
import type { GameState, Genre } from '../game/types'
import { fireManager, hireManager, updateManager } from '../game/engine'
import { GENRES, STRATEGIES, MAX_LOAN_AMOUNT } from '../game/data'
import { randomTalentName } from '../game/names'
import { Btn, Card, fmtMoney } from './ui'

export function Managers({ state, apply }: { state: GameState; apply: (fn: (s: GameState) => GameState) => void }) {
  const [salary, setSalary] = useState(50_000)
  const [genre, setGenre] = useState<string>('any')
  const [quality, setQuality] = useState(75)
  const [budget, setBudget] = useState(5_000_000)
  const [strategy, setStrategy] = useState(state.defaultStrategy)

  const managers = state.managers
  const busyManagerId = state.production?.managerId ?? null
  const busyTitle = busyManagerId ? state.production?.movie.title : null

  const hire = () =>
    apply((s) =>
      hireManager(s, {
        name: randomTalentName(),
        weeklySalary: salary,
        genre: genre === 'any' ? null : (genre as Genre),
        qualityTarget: quality,
        maxBudget: budget,
        marketingStrategy: strategy,
      }),
    )

  return (
    <div className="grid">
      <Card title="Hire a manager" right={<span className="muted">No limit on how many</span>}>
        <p className="muted small">
          Managers take a <b>weekly salary</b> and run the <b>entire pipeline themselves</b> — scripting, casting,
          production, marketing, and release — following the standing orders you give them once. They keep making
          movies one after another. Hire as many as you want; each takes their turn.
        </p>
        <div className="form-row">
          <label className="grow">
            Weekly salary
            <input
              type="number"
              min={1_000}
              max={MAX_LOAN_AMOUNT}
              step={1_000}
              value={salary}
              onChange={(e) => setSalary(Math.min(MAX_LOAN_AMOUNT, Math.max(1_000, Number(e.target.value) || 1_000)))}
            />
          </label>
          <label className="grow">
            Genre preference
            <select value={genre} onChange={(e) => setGenre(e.target.value)}>
              <option value="any">Any genre — manager picks</option>
              {GENRES.map((g) => (
                <option key={g.name} value={g.name}>
                  {g.emoji} {g.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label className="grow">
            Quality target: <strong>{quality}</strong>
            <input
              type="range"
              min={30}
              max={90}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
            />
          </label>
          <label className="grow">
            Max budget per movie
            <input
              type="number"
              min={500_000}
              max={MAX_LOAN_AMOUNT}
              step={500_000}
              value={budget}
              onChange={(e) =>
                setBudget(Math.min(MAX_LOAN_AMOUNT, Math.max(500_000, Number(e.target.value) || 500_000)))
              }
            />
          </label>
          <label className="grow">
            Marketing strategy
            <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
              {STRATEGIES.map((st) => (
                <option key={st.name} value={st.name}>
                  {st.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="btn-row">
          <Btn kind="primary" onClick={hire}>
            Hire manager — {fmtMoney(salary)}/week
          </Btn>
        </div>
        {managers.length > 0 && (
          <p className="muted small" style={{ marginTop: 8 }}>
            Weekly manager payroll: <b>{fmtMoney(managers.filter((m) => m.active).reduce((sum, m) => sum + m.weeklySalary, 0))}</b>
          </p>
        )}
      </Card>

      {managers.length === 0 ? (
        <div className="empty">
          <p>No managers on staff yet.</p>
          <p className="muted">Hire one above and they'll start the next movie the moment the pipeline is free.</p>
        </div>
      ) : (
        <div className="list">
          {managers.map((m) => (
            <div key={m.id} className="row-item">
              <div>
                <div className="item-title">
                  {m.name}
                  {busyManagerId === m.id && <span className="hired-badge">NOW RUNNING: {busyTitle}</span>}
                  {!m.active && <span className="dist-badge">PAUSED</span>}
                </div>
                <div className="item-sub">
                  {fmtMoney(m.weeklySalary)}/week · {m.genre ?? 'Any genre'} · quality target {m.qualityTarget} · max{' '}
                  {fmtMoney(m.maxBudget)} · {m.marketingStrategy} marketing · {m.moviesMade} movie{m.moviesMade === 1 ? '' : 's'} made
                </div>
              </div>
              <div className="row-actions">
                <Btn
                  small
                  onClick={() => apply((s) => updateManager(s, m.id, { active: !m.active }))}
                >
                  {m.active ? 'Pause' : 'Resume'}
                </Btn>
                <Btn small kind="danger" onClick={() => apply((s) => fireManager(s, m.id))}>
                  Fire
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
