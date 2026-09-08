import { useMemo, useState } from 'react'
import type { DepartmentAlloc, GameState, Role, Talent } from '../game/types'
import { castOf, dropCast, hireTalent, startProduction } from '../game/engine'
import { Btn, Card, FameStars, GenreBadge, fmtMoney } from './ui'

export function Casting({ state, apply }: { state: GameState; apply: (fn: (s: GameState) => GameState) => void }) {
  const p = state.production
  const [role, setRole] = useState<Role>('actor')
  const [offers, setOffers] = useState<Record<string, number>>({})
  const [budget, setBudget] = useState(5_000_000)

  const pool = useMemo(
    () =>
      state.talents
        .filter((t) => t.role === role && t.busyUntil <= state.week)
        .sort((a, b) => b.fame - a.fame),
    [state.talents, role, state.week],
  )

  if (!p || p.phase !== 'preProduction') {
    return (
      <div className="empty">
        <p>Nothing is in pre-production right now.</p>
        <p className="muted">Write a script, then put it into production to start casting.</p>
      </div>
    )
  }

  const m = p.movie
  const c = castOf(state, m)
  const ready = c.writer !== null && c.director !== null && c.actors.length > 0
  const actualBudget = Math.max(0, budget)

  return (
    <div className="grid">
      <Card title={`Casting — “${m.title}”`} right={<GenreBadge g={m.genre} />}>
        <div className="roster">
          <RosterSlot label="Writer" talent={c.writer} onDrop={c.writer ? () => apply((s) => dropCast(s, c.writer!.id)) : undefined} />
          <RosterSlot label="Director" talent={c.director} onDrop={c.director ? () => apply((s) => dropCast(s, c.director!.id)) : undefined} />
          {[0, 1, 2].map((i) => {
            const t = c.actors[i] ?? null
            return (
              <RosterSlot
                key={i}
                label={`Actor ${i + 1}`}
                talent={t}
                onDrop={t ? () => apply((s) => dropCast(s, t.id)) : undefined}
              />
            )
          })}
        </div>
        {!ready && <div className="hint">Need a writer, a director, and at least one actor before you can start production.</div>}
      </Card>

      <Card title="Talent pool" right={<span className="muted">Select a role · offers below asking are negotiations</span>}>
        <div className="tabs-mini">
          {(['actor', 'director', 'writer'] as Role[]).map((r) => (
            <button key={r} className={`tab-mini${role === r ? ' active' : ''}`} onClick={() => setRole(r)}>
              {r === 'actor' ? 'Actors' : r === 'director' ? 'Directors' : 'Writers'}
            </button>
          ))}
        </div>
        <div className="list">
          {pool.length === 0 && <div className="muted">No {role}s available right now.</div>}
          {pool.map((t) => {
            const pct = offers[t.id] ?? 100
            const amt = Math.round((t.asking * pct) / 100)
            const hired = c.writer?.id === t.id || c.director?.id === t.id || c.actors.some((a) => a.id === t.id)
            return (
              <div key={t.id} className="talent-row">
                <div className="talent-info">
                  <div className="item-title">
                    {t.name} {hired && <span className="hired-badge">✓</span>}
                  </div>
                  <div className="item-sub">
                    <FameStars fame={t.fame} />
                    {t.genreAffinity && <span className="affinity">favors {t.genreAffinity}</span>}
                  </div>
                </div>
                <div className="talent-offer">
                  {hired ? (
                    <span className="hired-label">In the cast</span>
                  ) : (
                    <>
                      <div className="offer-line">
                        <span className="asking">{fmtMoney(t.asking)}</span>
                        <input
                          type="range"
                          min={40}
                          max={100}
                          value={pct}
                          onChange={(e) => setOffers((o) => ({ ...o, [t.id]: Number(e.target.value) }))}
                        />
                      </div>
                      <Btn small kind={pct < 100 ? 'primary' : 'default'} onClick={() => apply((s) => hireTalent(s, t.id, amt))}>
                        {pct < 100 ? `Negotiate ${pct}% → ${fmtMoney(amt)}` : `Hire ${fmtMoney(amt)}`}
                      </Btn>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card title="Production budget" right={<span className="muted">No limits — you're the boss</span>}>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
              Budget: <strong style={{ color: 'var(--color-accent-dark)', fontSize: 16 }}>{fmtMoney(actualBudget)}</strong>
            </span>
            <input
              type="range"
              min={100_000}
              max={Math.max(actualBudget, state.cash, 1_000_000)}
              step={100_000}
              value={actualBudget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
          </label>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {[1, 5, 10, 50, 100, 500].map(m => (
              <Btn key={m} small onClick={() => setBudget(m * 1_000_000)}>
                {fmtMoney(m * 1_000_000)}
              </Btn>
            ))}
            <Btn small onClick={() => setBudget(Math.floor(state.cash * 0.5))}>Half cash</Btn>
            <Btn small onClick={() => setBudget(state.cash)}>All cash</Btn>
          </div>
        </div>
        <div className="btn-row">
          <Btn
            kind="primary"
            disabled={!ready || actualBudget <= 0 || state.cash < actualBudget}
            onClick={() => {
              const per = Math.floor(actualBudget / 6)
              const depts: DepartmentAlloc = { acting: per, writing: per, direction: per, effects: per, music: per, editing: per }
              apply((s) => startProduction(s, depts))
            }}
          >
            Start production — {fmtMoney(actualBudget)}
          </Btn>
        </div>
        {state.cash < actualBudget && <div className="hint">You don't have enough cash for this budget.</div>}
      </Card>
    </div>
  )
}

function RosterSlot({ label, talent, onDrop }: { label: string; talent: Talent | null; onDrop?: () => void }) {
  return (
    <div className={`roster-slot${talent ? ' filled' : ''}`}>
      <div className="roster-label">{label}</div>
      {talent ? (
        <>
          <div className="roster-name">{talent.name}</div>
          <div className="roster-sub">
            <FameStars fame={talent.fame} /> {fmtMoney(talent.asking)}
          </div>
          {onDrop && (
            <button className="drop-btn" onClick={onDrop}>
              ✕
            </button>
          )}
        </>
      ) : (
        <div className="roster-empty">—</div>
      )}
    </div>
  )
}

