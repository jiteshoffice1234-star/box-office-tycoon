import { useState } from 'react'
import type { GameState, Genre } from '../game/types'
import { createScript, putIntoProduction, setRelease, setDefaultStrategy, setStreamingRelease } from '../game/engine'
import { GENRES, STRATEGIES, MIN_MARKETING_WEEKS, MAX_MARKETING_WEEKS } from '../game/data'
import { writeScriptCost } from '../game/formulas'
import { dateInfo, hypeGain, hypeMultiplier, timingMultiplier } from '../game/formulas'
import { randomTitle } from '../game/names'
import { Bar, Btn, Card, GenreBadge, fmtMoney } from './ui'

export function Scripts({
  state,
  apply,
}: {
  state: GameState
  apply: (fn: (s: GameState) => GameState) => void
}) {
  const [genre, setGenre] = useState<Genre>('Action')
  const [quality, setQuality] = useState(55)
  const [title, setTitle] = useState('')
  const [contentType, setContentType] = useState<'movie' | 'series' | 'show'>('movie')
  const busy = state.production !== null

  const cost = writeScriptCost(quality)

  const handleWrite = () => {
    apply((s) => createScript(s, genre, quality, title, contentType))
    setTitle('')
  }

  return (
    <div className="grid">
      <Card title="Write a script" right={<span className="muted">Cheaper than buying — you control quality</span>}>
        <div className="form-row">
          <label>
            Type
            <select value={contentType} onChange={(e) => setContentType(e.target.value as 'movie' | 'series' | 'show')}>
              <option value="movie">🎬 Movie</option>
              <option value="series">📺 TV Series (long-run, up to 1000x earnings)</option>
              <option value="show">📡 TV Show (long-run, up to 1000x earnings)</option>
            </select>
          </label>
          <label>
            Genre
            <select value={genre} onChange={(e) => setGenre(e.target.value as Genre)}>
              {GENRES.map((g) => (
                <option key={g.name} value={g.name}>
                  {g.emoji} {g.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grow">
            Script quality: <strong>{quality}</strong>
            <input type="range" min={25} max={85} value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
          </label>
          <label className="grow">
            Title (optional)
            <input
              type="text"
              placeholder={randomTitle()}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
            />
          </label>
        </div>
        <div className="btn-row">
          <Btn kind="primary" onClick={handleWrite} disabled={state.cash < cost}>
            Write it for {fmtMoney(cost)}
          </Btn>
          {state.cash < cost && <span className="muted">Not enough cash.</span>}
        </div>
        <p className="muted small">
          Higher quality scripts cost more but give every movie a head start. Genre affects audience size and awards
          chances.
        </p>
      </Card>

      <Card title="Your scripts">
        {state.scripts.length === 0 ? (
          <div className="muted">No scripts yet. Write one above to get started.</div>
        ) : (
          <div className="list">
            {state.scripts.map((sc) => (
              <div key={sc.id} className="row-item">
                <div>
                  <div className="item-title">“{sc.title}”</div>
                  <div className="item-sub">
                    <GenreBadge g={sc.genre} /> · Quality <b>{sc.quality}</b>
                  </div>
                </div>
                <Btn kind="primary" small disabled={busy} onClick={() => apply((s) => putIntoProduction(s, sc.id))}>
                  {busy ? 'Studio busy' : 'Into production'}
                </Btn>
              </div>
            ))}
          </div>
        )}
      </Card>


      {/* MARKETING CAMPAIGN — only when movie is in marketing phase */}
      {state.production && state.production.phase === 'marketing' && (
        <MarketingCampaign state={state} apply={apply} />
      )}
    </div>
  )
}

function MarketingCampaign({ state, apply }: { state: GameState; apply: (fn: (s: GameState) => GameState) => void }) {
  const [strategy, setStrategy] = useState(state.defaultStrategy)
  const [weeksOut, setWeeksOut] = useState(6)
  const [remember, setRemember] = useState(true)
  const p = state.production!
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
      {/* Theatrical vs Streaming comparison */}
      <Card title="📡 Theatrical vs Streaming" right={<span className="muted">Choose your release path</span>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: 'var(--slate)', border: '2px solid var(--gold-border)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--font-display)', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>🎬 Theatrical</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              <div>• Opening weekend variable</div>
              <div>• Total gross depends on quality + hype</div>
              <div>• Box office run: 21 weeks</div>
              <div>• Potential: <strong style={{ color: 'var(--green-bright)' }}>{fmtMoney(m.quality * 300_000 * (projectedHype / 50))}</strong></div>
              <div>• Risk: <span style={{ color: 'var(--red-soft)' }}>can flop</span></div>
            </div>
          </div>
          <div style={{ background: 'var(--slate)', border: '2px solid rgba(74,140,212,0.3)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--font-display)', textTransform: 'uppercase', color: 'var(--blue-bright)', marginBottom: 6 }}>📡 Streaming</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              <div>• Guaranteed: <strong style={{ color: 'var(--green-bright)' }}>{fmtMoney(m.productionBudget * 0.6)}</strong></div>
              <div>• Subscriber boost: +{Math.round(m.quality * 0.3).toLocaleString()}</div>
              <div>• Passive weekly income starts immediately</div>
              <div>• No marketing spend needed</div>
              <div>• Risk: <strong style={{ color: 'var(--green-bright)' }}>zero</strong></div>
            </div>
          </div>
        </div>
      </Card>

      <Card title={`Marketing — "${m.title}"`} right={<GenreBadge g={m.genre} />}>
        <div className="quality-line">
          <span>Hype now: {Math.round(m.hype)}/100</span>
          <Bar value={m.hype} color="var(--gold)" />
        </div>
        <div className="hint">
          Hype drives the box office: 50 hype = ×2 opening, 100 hype = ×100. Aim for max hype.
        </div>
        <div className="quality-line">
          <span>Quality: {m.quality}</span>
          <Bar value={m.quality} />
        </div>
        <div className="muted small">
          Spent so far: {fmtMoney(m.marketingSpent)}. Marketing runs automatically every week until release.
        </div>

        <h3 style={{ marginTop: 10, fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Campaign strategy (chosen once)</h3>
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
          <Btn onClick={() => apply((s) => setStreamingRelease(s))} disabled={p.releaseWeek !== null || m.releaseWindow === 'streaming'}>
            📡 Stream Instead (guaranteed revenue)
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
