import { useMemo, useState } from 'react'
import type { DepartmentAlloc, GameState, Role, Talent } from '../game/types'
import { castOf, dropCast, hireTalent, startProduction, tierForRep } from '../game/engine'
import { deptBalance } from '../game/formulas'
import { Btn, Card, FameStars, GenreBadge, fmtMoney } from './ui'

const DEPTS: { key: keyof DepartmentAlloc; label: string }[] = [
  { key: 'acting', label: 'Acting' },
  { key: 'writing', label: 'Writing' },
  { key: 'direction', label: 'Direction' },
  { key: 'effects', label: 'Effects' },
  { key: 'music', label: 'Music' },
  { key: 'editing', label: 'Editing' },
]

export function Casting({ state, apply }: { state: GameState; apply: (fn: (s: GameState) => GameState) => void }) {
  const p = state.production
  const [role, setRole] = useState<Role>('actor')
  const [offers, setOffers] = useState<Record<string, number>>({})
  const [depts, setDepts] = useState<DepartmentAlloc>({ acting: 0, writing: 0, direction: 0, effects: 0, music: 0, editing: 0 })

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
        <p className="muted">Write or buy a script, then put it into production to start casting.</p>
      </div>
    )
  }

  const m = p.movie
  const c = castOf(state, m)
  const tier = tierForRep(state.reputation)
  const budget = Object.values(depts).reduce((sum, v) => sum + v, 0)
  const ready = c.writer !== null && c.director !== null && c.actors.length > 0

  const setDept = (key: keyof DepartmentAlloc, v: number) => setDepts((d) => ({ ...d, [key]: v }))

  const balance = () => {
    const target = Math.min(tier.maxBudget, Math.max(1_000_000, Math.floor(state.cash * 0.4)))
    const per = Math.max(0, Math.floor(target / 6))
    setDepts({ acting: per, writing: per, direction: per, effects: per, music: per, editing: per })
  }

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

      <Card
        title="Production budget"
        right={
          <span className="muted">
            Budget {fmtMoney(budget)} · max {fmtMoney(tier.maxBudget)}
          </span>
        }
      >
        <div className="dept-grid">
          {DEPTS.map((d) => (
            <label key={d.key} className="dept">
              <span className="dept-name">
                {d.label}: <b>{fmtMoney(depts[d.key])}</b>
              </span>
              <input
                type="range"
                min={0}
                max={tier.maxBudget}
                step={50_000}
                value={depts[d.key]}
                onChange={(e) => setDept(d.key, Number(e.target.value))}
              />
            </label>
          ))}
        </div>
        <div className="btn-row">
          <Btn onClick={balance}>Balance evenly</Btn>
          <Btn
            kind="primary"
            disabled={!ready || budget <= 0 || budget > tier.maxBudget || state.cash < budget}
            onClick={() => {
              apply((s) => startProduction(s, depts))
              setDepts({ acting: 0, writing: 0, direction: 0, effects: 0, music: 0, editing: 0 })
            }}
          >
            Start production — {fmtMoney(budget)}
          </Btn>
        </div>
        {state.cash < budget && <div className="hint">You don't have enough cash for this budget.</div>}
        {budget > tier.maxBudget && <div className="hint">Your {tier.name} tier caps budgets at {fmtMoney(tier.maxBudget)}.</div>}
        {ready && budget > 0 && (
          <div className="hint">
            Balance score: {Math.round(deptBalance(depts) * 100)}% — balanced funding across departments boosts quality.
          </div>
        )}
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

