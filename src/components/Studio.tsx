import { dateInfo } from '../game/formulas'
import { tierForRep, castOf } from '../game/engine'
import { TIERS } from '../game/data'
import type { GameState } from '../game/types'
import { Bar, Btn, Card, Stat, fmtMoney } from './ui'
import { genreMeta } from '../game/data'

export type Tab = 'studio' | 'scripts' | 'casting' | 'marketing' | 'movies' | 'bank' | 'managers'

export function Studio({ state, go }: { state: GameState; go: (t: Tab) => void }) {
  const tier = tierForRep(state.reputation)
  const tierIdx = TIERS.findIndex((t) => t.name === tier.name)
  const nextTier = TIERS[tierIdx + 1]
  const s = state
  const weekNum = s.week % 52
  const currentGross = s.movies.reduce((sum, movie) => sum + (movie.weekly.find((w) => w.week === s.week)?.gross ?? 0), 0)
  const pulsePhase = s.production
    ? s.production.phase === 'preProduction'
      ? 'Casting'
      : s.production.phase === 'production'
        ? `Filming · ${s.production.weeksLeft}w`
        : s.production.releaseWeek
          ? `Release · W${s.production.releaseWeek - s.week}`
          : 'Release decision'
    : 'Open slate'
  const pulseStatus = s.production?.movie.title ?? 'Your next move is ready'

  return (
    <div className="grid">
      {/* Hero stats row */}
      <div className="row stats-row">
        <Stat label="Cash" value={fmtMoney(s.cash)} />
        <Stat label="Tier" value={tier.name} sub={nextTier ? `→ ${nextTier.name} at ${nextTier.minRep} rep` : '★ Max tier'} />
        <Stat label="Reputation" value={`${Math.round(s.reputation)}/300`} sub={<Bar value={s.reputation} max={300} color="var(--color-accent)" />} />
        <Stat label="Content" value={s.stats.moviesMade} sub={`${s.stats.blockbusters} 🔥 ${s.stats.disasters} 💀 ${s.stats.seriesMade} 📺`} />
        <Stat label="Total earned" value={fmtMoney(s.stats.totalEarned)} sub={`🔁 ${s.stats.franchises} franchise parts`} />
      </div>

      <section className="studio-pulse" aria-label="Studio pulse">
        <div className="pulse-heading">
          <span className="eyebrow">Live studio board</span>
          <span className="pulse-week">WEEK {String(s.week).padStart(2, '0')}</span>
        </div>
        <div className="pulse-track" aria-hidden="true">
          <span className="pulse-node active" />
          <span className="pulse-line" />
          <span className={`pulse-node${s.production ? ' active' : ''}`} />
          <span className="pulse-line" />
          <span className={`pulse-node${s.production?.releaseWeek ? ' active' : ''}`} />
          <span className="pulse-line" />
          <span className={`pulse-node${currentGross > 0 ? ' active' : ''}`} />
        </div>
        <div className="pulse-labels">
          <span>Now</span>
          <span>{pulsePhase}</span>
          <span>Release</span>
          <span>Cashflow</span>
        </div>
        <div className="pulse-footer">
          <strong>{pulseStatus}</strong>
          <span>{currentGross > 0 ? `+${fmtMoney(currentGross)} this week` : 'No box office recorded this week'}</span>
        </div>
      </section>

      <div className="row">
        <Card title="Production pipeline">
          {s.production ? (
            <Pipeline state={s} go={go} />
          ) : (
            <div className="empty">
              <p>No movie is currently in production.</p>
              <div className="btn-row">
                <Btn kind="primary" onClick={() => go('scripts')}>
                  Write or buy a script
                </Btn>
                {s.movies.some((m) => sequelEligible(m)) && (
                  <Btn onClick={() => go('movies')}>Sequel eligible!</Btn>
                )}
              </div>
            </div>
          )}
        </Card>

        <Card title="This week at the box office" right={<span className="muted">{dateInfo(s.week).monthName} W{weekNum}</span>}>
          <WeeklyBoxOffice state={s} />
        </Card>
      </div>

      {s.production && (
        <Card title="Up next">
          <NextUp state={s} />
        </Card>
      )}

      {s.managerProductions.length > 0 && (
        <Card title={`Manager productions (${s.managerProductions.length})`} right={<span className="muted">All running in parallel</span>}>
          <div className="list">
            {s.managerProductions.map((mp) => {
              const mgr = s.managers.find((m) => m.id === mp.managerId)
              const phaseLabel = mp.phase === 'production' ? `Filming (${mp.weeksLeft}w left)` : mp.phase === 'marketing' ? (mp.releaseWeek ? `Marketing → release in ${mp.releaseWeek - s.week}w` : 'Marketing') : mp.phase
              return (
                <div key={mp.movie.id} className="row-item">
                  <div>
                    <div className="item-title">"{mp.movie.title}"</div>
                    <div className="item-sub">
                      {mgr?.name ?? 'Manager'} · {mp.movie.contentType === 'series' ? '📺 TV Series' : mp.movie.contentType === 'show' ? '📡 TV Show' : '🎬 Movie'} · {mp.movie.genre} · quality {mp.movie.quality} · {phaseLabel}
                    </div>
                  </div>
                  <div className="item-sub">Budget {fmtMoney(mp.movie.productionBudget)}</div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {s.managerShows.length > 0 && (
        <Card title={`📺 Shows & Series (${s.managerShows.length})`} right={<span className="muted">Seasons added automatically</span>}>
          <div className="list">
            {s.managerShows.map((show) => {
              const mgr = s.managers.find((m) => m.id === show.managerId)
              const totalSeasons = show.seasons.length
              const icon = show.contentType === 'series' ? '📺' : '📡'
              return (
                <div key={show.id} className="row-item" style={{ borderLeft: '3px solid ' + (show.contentType === 'series' ? 'var(--color-info)' : 'var(--color-primary)') }}>
                  <div style={{ flex: 1 }}>
                    <div className="item-title">{icon} &ldquo;{show.title}&rdquo;</div>
                    <div className="item-sub">{mgr?.name ?? 'Manager'} · {show.genre} · {totalSeasons} season{totalSeasons === 1 ? '' : 's'}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 9, background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 3, padding: '1px 5px', fontFamily: 'var(--font-data)' }}>
                        Latest: S{show.seasons[show.seasons.length - 1]?.seasonNumber} · q{show.seasons[show.seasons.length - 1]?.quality} · {show.seasons[show.seasons.length - 1]?.episodes}ep
                      </span>
                      <span style={{ fontSize: 9, color: 'var(--color-text-muted)', fontFamily: 'var(--font-data)' }}>
                        {totalSeasons} total seasons · {show.seasons.reduce((s, sn) => s + sn.episodes, 0)} episodes
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="price">{fmtMoney(show.totalEarnings)}</div>
                    <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>total earned</div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {s.genreTrends.length > 0 && (
        <Card title="Genre Trends">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {s.genreTrends.map((t, i) => (
              <span key={i} style={{ background: t.multiplier > 1 ? 'rgba(76,175,80,0.12)' : 'rgba(255,107,107,0.12)', border: '1px solid ' + (t.multiplier > 1 ? 'var(--color-success)' : 'var(--color-danger)'), borderRadius: 4, padding: '2px 6px', fontSize: 11 }}>
                {genreMeta(t.genre as any)?.emoji} {t.genre} {t.multiplier > 1 ? '↑' : '↓'} {t.multiplier.toFixed(1)}x ({t.weeksRemaining}w left)
              </span>
            ))}
          </div>
        </Card>
      )}

      {s.streamingPlatform && (
        <Card title="📡 Streaming Platform">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: 'var(--color-surface-alt)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
              <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'var(--font-data)' }}>Revenue</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-success)', fontFamily: 'var(--font-data)' }}>{fmtMoney(s.myStreamingPlatform.totalRevenue)}</div>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{s.myStreamingPlatform.subscribers.toLocaleString()} subscribers</div>
            </div>
            <div style={{ background: 'var(--color-surface-alt)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
              <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'var(--font-data)' }}>Library</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-info)', fontFamily: 'var(--font-data)' }}>{s.myStreamingPlatform.contentLibrary.length} titles</div>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{fmtMoney(s.myStreamingPlatform.weeklyRevenue)}/week</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

function sequelEligible(m: { owner: string; totalGross: number; cost: number; isDisaster: boolean; part: number; finished: boolean }): boolean {
  return m.owner === 'player' && m.totalGross > m.cost * 2.5 && !m.isDisaster && m.part < 6 && m.finished
}

function Pipeline({ state, go }: { state: GameState; go: (t: Tab) => void }) {
  const p = state.production!
  const m = p.movie
  const c = castOf(state, m)
  return (
    <div>
      <div className="quality-line">
        <span>{m.title}</span>
        <span>{m.genre}</span>
      </div>
      <div className="quality-line">
        <span>Quality: {m.quality}</span>
        <Bar value={m.quality} />
      </div>
      <div className="muted small">
        {p.phase === 'production' ? `Filming — ${p.weeksLeft} weeks left` : p.phase === 'marketing' ? (p.releaseWeek ? `Marketing → releasing ${dateInfo(p.releaseWeek).monthName}` : 'Marketing — pick a release date') : 'Pre-production'}
        {' · '}Budget {fmtMoney(m.productionBudget)}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
        {!c.writer && <Btn small kind="primary" onClick={() => go('casting')}>Hire writer</Btn>}
        {!c.director && <Btn small kind="primary" onClick={() => go('casting')}>Hire director</Btn>}
        {c.actors.length === 0 && <Btn small kind="primary" onClick={() => go('casting')}>Cast actors</Btn>}
        {p.phase === 'marketing' && !p.releaseWeek && <Btn small kind="primary" onClick={() => go('marketing')}>Pick release date</Btn>}
      </div>
    </div>
  )
}

function NextUp({ state }: { state: GameState }) {
  const p = state.production!
  return (
    <div className="muted small">
      Next: {p.movie.title} ({p.phase})
    </div>
  )
}

export function WeeklyBoxOffice({ state }: { state: GameState }) {
  const week = state.week
  const movies = [...state.movies, ...state.aiMovies]
    .filter(m => m.phase === 'inTheaters' && m.releaseWeek <= week)
    .sort((a, b) => {
      const aGross = a.weekly.find(w => w.week === week)?.gross ?? 0
      const bGross = b.weekly.find(w => w.week === week)?.gross ?? 0
      return bGross - aGross
    })
    .slice(0, 5)
  if (movies.length === 0) return <div className="muted">No releases this week</div>
  return (
    <div style={{ fontSize: 12 }}>
      {movies.map(m => {
        const g = m.weekly.find(w => w.week === week)?.gross ?? 0
        return (
          <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
            <span>{m.title}</span>
            <span style={{ fontFamily: 'var(--font-data)', color: m.owner === 'player' ? 'var(--gold)' : 'var(--ink-soft)' }}>{fmtMoney(g)}</span>
          </div>
        )
      })}
    </div>
  )
}
