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
  const [contentType, setContentType] = useState<string>('any')
  const [franchiseName, setFranchiseName] = useState('')
  const [customLabel, setCustomLabel] = useState('')
  const [sequelsOnly, setSequelsOnly] = useState(false)

  const managers = state.managers
  const managerProds = state.managerProductions
  const busyManagerIds = new Set(managerProds.map((p) => p.managerId))
  const busyMgrTitles = new Map(managerProds.map((p) => [p.managerId, p.movie.title]))

  // Collect all existing franchise names from movies
  const existingFranchises = [...new Set(state.movies.filter(m => m.franchiseName).map(m => m.franchiseName!))]

  const hire = () =>
    apply((s) =>
      hireManager(s, {
        name: randomTalentName(),
        weeklySalary: salary,
        genre: genre === 'any' ? null : (genre as Genre),
        qualityTarget: quality,
        maxBudget: budget,
        marketingStrategy: strategy,
        contentType: contentType as 'movie' | 'series' | 'show' | 'any',
        franchiseName: franchiseName.trim() || null,
        customLabel: customLabel.trim() || null,
        sequelsOnly,
      }),
    )

  return (
    <div className="grid">
      <Card title="Hire a manager" right={<span className="muted">No limit on how many</span>}>
        <p className="muted small">
          Managers take a <b>weekly salary</b> and run the <b>entire pipeline themselves</b> — scripting, casting,
          production, marketing, and release — following the standing orders you give them once. Every manager
          works <b>in parallel</b>, so hiring more means more movies in production at the same time.
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
        {/* Content Control */}
        <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--color-surface-alt)', border: 'none', borderRadius: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent-dark)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontFamily: 'var(--font-data)' }}>
            🎯 Content Control — What will they make?
          </div>
          <div className="form-row">
            <label className="grow">
              Content type
              <select value={contentType} onChange={(e) => setContentType(e.target.value)}>
                <option value="any">🎲 Any (random mix)</option>
                <option value="movie">🎬 Movies only</option>
                <option value="series">📺 TV Series only</option>
                <option value="show">📡 TV Shows only</option>
              </select>
            </label>
            <label className="grow">
              Franchise name (optional)
              <input
                type="text"
                placeholder="e.g. Star Wars, Marvel, Fast & Furious"
                value={franchiseName}
                onChange={(e) => setFranchiseName(e.target.value)}
                list="franchise-list"
              />
              <datalist id="franchise-list">
                {existingFranchises.map(f => <option key={f} value={f} />)}
              </datalist>
            </label>
          </div>
          <div className="form-row" style={{ marginTop: 6 }}>
            <label className="grow">
              Custom label / studio name
              <input
                type="text"
                placeholder="e.g. Marvel Studios, Pixar, A24"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
              />
            </label>
            <label className="check" style={{ minWidth: 120 }}>
              <input type="checkbox" checked={sequelsOnly} onChange={(e) => setSequelsOnly(e.target.checked)} />
              Sequels only
            </label>
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-data)' }}>
            {!franchiseName && !customLabel && '🎲 Manager will create original content each time'}
            {franchiseName && !customLabel && `🔁 Building "${franchiseName}" franchise — Part ${1 + (managers.length % 6)}`}
            {customLabel && !franchiseName && `🏷️ Everything will be branded "${customLabel}"`}
            {customLabel && franchiseName && `🏷️ "${customLabel}" — "${franchiseName}" franchise`}
            {sequelsOnly && franchiseName && ' · sequels only (no new IPs)'}
          </div>
        </div>
        <div className="btn-row">
          <Btn kind="primary" onClick={hire}>
            Hire {customLabel ? customLabel : 'manager'} — {fmtMoney(salary)}/week
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
          <p className="muted">Hire one above and they'll start making movies automatically. Hire more for parallel production!</p>
        </div>
      ) : (
        <div className="list">
          {managers.map((m) => (
            <div key={m.id} className="row-item">
              <div>
                <div className="item-title">
                  {m.name}
                  {busyManagerIds.has(m.id) && <span className="hired-badge">NOW RUNNING: {busyMgrTitles.get(m.id)}</span>}
                  {!m.active && <span className="dist-badge">PAUSED</span>}
                </div>
                <div className="item-sub">
                  {fmtMoney(m.weeklySalary)}/week · {m.genre ?? 'Any genre'} · quality {m.qualityTarget} · max {fmtMoney(m.maxBudget)} · {m.marketingStrategy} marketing
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-data)', color: m.mood >= 85 ? 'var(--color-success)' : m.mood >= 65 ? 'var(--color-accent-dark)' : m.mood >= 45 ? 'var(--color-text-muted)' : 'var(--color-danger)' }}>
                    {m.mood >= 85 ? '🔥 THRILLED' : m.mood >= 65 ? '😊 Happy' : m.mood >= 45 ? '😐 Okay' : '😤 Unhappy'} ({m.mood}/100)
                  </span>
                  <span style={{ fontSize: 9, color: 'var(--color-text-muted)', fontFamily: 'var(--font-data)' }}>
                    ~{m.mood >= 85 ? '100+' : m.mood >= 65 ? '50' : m.mood >= 45 ? '25' : '12'} per year
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
                  <span style={{ fontSize: 9, background: 'var(--color-surface-alt)', border: 'none', borderRadius: 3, padding: '1px 5px', fontFamily: 'var(--font-data)' }}>
                    {m.contentType === 'any' ? '🎲 Any' : m.contentType === 'movie' ? '🎬 Movies' : m.contentType === 'series' ? '📺 Series' : '📡 Shows'}
                  </span>
                  {m.franchiseName && (
                    <span style={{ fontSize: 9, background: 'var(--gold-bg)', border: '1px solid var(--gold-border)', borderRadius: 3, padding: '1px 5px', fontFamily: 'var(--font-data)', color: 'var(--color-accent-dark)' }}>
                      🔁 {m.franchiseName}{m.sequelsOnly ? ' (sequels only)' : ''}
                    </span>
                  )}
                  {m.customLabel && (
                    <span style={{ fontSize: 9, background: 'var(--blue-bg)', border: '1px solid rgba(100,181,246,0.3)', borderRadius: 3, padding: '1px 5px', fontFamily: 'var(--font-data)', color: 'var(--color-info)' }}>
                      🏷️ {m.customLabel}
                    </span>
                  )}
                  <span style={{ fontSize: 9, color: 'var(--color-text-muted)', fontFamily: 'var(--font-data)' }}>
                    {m.moviesMade} made
                  </span>
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
