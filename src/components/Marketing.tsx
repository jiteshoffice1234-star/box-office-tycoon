import { useState } from 'react'
import type { GameState } from '../game/types'
import { setRelease, setDefaultStrategy } from '../game/engine'
import { STRATEGIES, MIN_MARKETING_WEEKS, MAX_MARKETING_WEEKS } from '../game/data'
import { dateInfo, hypeGain, hypeMultiplier, timingMultiplier } from '../game/formulas'
import { Bar, Btn, Card, GenreBadge, fmtMoney } from './ui'

export function Marketing({ state, apply }: { state: GameState; apply: (fn: (s: GameState) => GameState) => void }) {
  const [strategy, setStrategy] = useState(state.defaultStrategy)
  const [weeksOut, setWeeksOut] = useState(6)
  const [remember, setRemember] = useState(true)

  const p = state.production
  if (!p || p.phase !== 'marketing') {
    return (
      <div className="empty">
        <p>No movie is in the marketing phase right now.</p>
        <p className="muted">Marketing kicks in automatically once filming wraps.</p>
      </div>
    )
  }

  const m = p.movie
  const strat = STRATEGIES.find((x) => x.name === strategy) ?? STRATEGIES[2]
  const weeklySpend = strat.pct * m.productionBudget
  const projectedHype = Math.min(100, m.hype + hypeGain(strat.pct, m.productionBudget) * weeksOut)

  const handleSet = () => {
    if (remember) apply((s) => setDefaultStrategy(s, strategy))
    apply((s) => setRelease(s, state.week + weeksOut, strategy))
  }

  return (
    <div className="grid">
      <Card title={`Marketing — “${m.title}”`} right={<GenreBadge g={m.genre} />}>
        <div className="quality-line">
          <span>Hype now: {Math.round(m.hype)}/100</span>
          <Bar value={m.hype} color="var(--yellow)" />
        </div>
        <div className="hint">
          Hype drives the box office: 50 hype = ×2 opening, and it climbs fast — 100 hype = ×100. Aim for max hype.
        </div>
        <div className="quality-line">
          <span>Quality: {m.quality}</span>
          <Bar value={m.quality} />
        </div>
        <div className="muted small">
          Spent so far on marketing: {fmtMoney(m.marketingSpent)}. Marketing runs <b>automatically</b> every week until
          release — you only choose the strategy once.
        </div>

        <h3>Campaign strategy (chosen once)</h3>
        <div className="strategy-grid">
          {STRATEGIES.map((s) => (
            <label key={s.name} className={`strategy-card${strategy === s.name ? ' active' : ''}`}>
              <input type="radio" name="strategy" checked={strategy === s.name} onChange={() => setStrategy(s.name)} />
              <div className="strategy-name">{s.name}</div>
              <div className="strategy-label">{s.label}</div>
              <div className="strategy-cost">{s.pct === 0 ? 'No spend' : `${fmtMoney(s.pct * m.productionBudget)}/week`}</div>
            </label>
          ))}
        </div>
      </Card>

      <Card title="Release date" right={<span className="muted">Timing moves the needle</span>}>
        <div className="release-list">
          {Array.from({ length: MAX_MARKETING_WEEKS - MIN_MARKETING_WEEKS + 1 }, (_, i) => MIN_MARKETING_WEEKS + i).map(
            (wo) => {
              const w = state.week + wo
              const dd = dateInfo(w)
              const t = timingMultiplier(m.genre, w)
              const comp = state.aiStudios.filter((a) => a.nextReleaseWeek === w).length
              const hype = Math.min(100, m.hype + hypeGain(strat.pct, m.productionBudget) * wo)
              return (
                <label key={w} className={`release-row${weeksOut === wo ? ' active' : ''}`}>
                  <input type="radio" name="release" checked={weeksOut === wo} onChange={() => setWeeksOut(wo)} />
                  <div className="release-main">
                    <div>
                      <b>{dd.monthName}</b> · week {dd.weekOfYear}, Year {dd.year}
                      <span className="muted"> ({wo} weeks out)</span>
                    </div>
                    <div className="release-meta">
                      {dd.season && <span>{dd.season}</span>}
                      <span className={t >= 1.15 ? 'good' : t <= 0.9 ? 'bad' : ''}>timing ×{t.toFixed(2)}</span>
                      {comp > 0 && <span className="bad">⚠ {comp} rival release{comp > 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  <div className="release-hype">hype ~{Math.round(hype)} · ×{hypeMultiplier(hype).toFixed(1)}</div>
                </label>
              )
            },
          )}
        </div>
        <div className="btn-row">
          <Btn kind="primary" onClick={handleSet} disabled={p.releaseWeek !== null}>
            {p.releaseWeek !== null
              ? `Releasing ${dateInfo(p.releaseWeek).monthName}, Year ${dateInfo(p.releaseWeek).year}`
              : `Lock it in — ${fmtMoney(weeklySpend)}/week auto-campaign`}
          </Btn>
          <label className="check">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Use this strategy for all future movies
          </label>
        </div>
        {p.releaseWeek !== null && (
          <div className="hint">Release set. Marketing now runs automatically until opening weekend.</div>
        )}
        {projectedHype >= 100 && <div className="hint">Hype will hit 100% well before release — consider a shorter campaign.</div>}
      </Card>
    </div>
  )
}
