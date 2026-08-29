import { castOf } from '../game/engine'
import { dateInfo } from '../game/formulas'
import { tierForRep } from '../game/engine'
import { GENRES, STRATEGIES, TIERS } from '../game/data'
import type { GameState, Movie } from '../game/types'
import { Bar, Btn, Card, GenreBadge, Stat, fmtMoney } from './ui'
import { genreMeta } from '../game/data'

export type Tab = 'studio' | 'scripts' | 'casting' | 'marketing' | 'movies' | 'awards' | 'news' | 'bank' | 'managers'

export function Studio({ state, go }: { state: GameState; go: (t: Tab) => void }) {
  const tier = tierForRep(state.reputation)
  const tierIdx = TIERS.findIndex((t) => t.name === tier.name)
  const nextTier = TIERS[tierIdx + 1]
  const s = state

  return (
    <div className="grid">
      <div className="row stats-row">
        <Stat label="Cash" value={fmtMoney(s.cash)} />
        <Stat label="Studio tier" value={tier.name} sub={nextTier ? `Max budget ${fmtMoney(nextTier.maxBudget)}` : 'Max budget unlimited'} />
        <Stat label="Reputation" value={`${Math.round(s.reputation)}/300`} sub={nextTier ? `${nextTier.name} at ${nextTier.minRep} rep` : 'Industry leader'} />
        <Stat label="Content made" value={s.stats.moviesMade} sub={`${s.stats.blockbusters} blockbusters · ${s.stats.disasters} disasters · ${s.stats.seriesMade} series/shows`} />
        <Stat label="Total earned" value={fmtMoney(s.stats.totalEarned)} sub={`Awards: ${s.stats.awardsWon} · Franchise parts: ${s.stats.franchises}`} />
      </div>

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

        <Card title="This week at the box office" right={<span className="muted">{dateInfo(s.week).monthName}</span>}>
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
                    <div className="item-title">“{mp.movie.title}”</div>
                    <div className="item-sub">
                      {mgr?.name ?? 'Manager'} · {mp.movie.contentType === 'series' ? '📺 TV Series' : mp.movie.contentType === 'show' ? '📡 TV Show' : '🎬 Movie'} · {mp.movie.genre} · quality {mp.movie.quality} · {phaseLabel}
                    </div>
                  </div>
                  <div className="item-sub">
                    Budget {fmtMoney(mp.movie.productionBudget)}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Genre Trends */}
      {s.genreTrends.length > 0 && (
        <Card title="Genre Trends">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {s.genreTrends.map((t, i) => (
              <span key={i} style={{ background: t.multiplier > 1 ? 'rgba(92,196,128,0.12)' : 'rgba(224,85,85,0.12)', border: '1px solid ' + (t.multiplier > 1 ? '#4a9e6a' : '#c44040'), borderRadius: 4, padding: '2px 6px', fontSize: 11 }}>
                {genreMeta(t.genre as any)?.emoji} {t.genre} {t.multiplier > 1 ? '↑' : '↓'} {t.multiplier.toFixed(1)}x ({t.weeksRemaining}w left)
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Active Event */}
      {s.activeEvent && !s.activeEvent.resolved && (
        <Card title="Breaking News" tone={s.activeEvent.effect === 'positive' ? 'gold' : s.activeEvent.effect === 'negative' ? 'alert' : undefined}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{s.activeEvent.title}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{s.activeEvent.description}</div>
        </Card>
      )}

      {/* Achievements */}
      {s.stats.achievements.length > 0 && (
        <Card title={`Achievements (${s.stats.achievements.length})`}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {s.stats.achievements.map(a => (
              <span key={a.id} title={a.description} style={{ background: 'rgba(212,168,67,0.1)', border: '1px solid var(--gold-dim)', borderRadius: 4, padding: '3px 7px', fontSize: 11, cursor: 'help' }}>
                {a.icon} {a.name}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Merchandise Deals */}
      {s.merchandiseDeals.length > 0 && (
        <Card title={`Merchandise (${s.merchandiseDeals.filter(d => d.active).length})`}>
          <div className="list">
            {s.merchandiseDeals.filter(d => d.active).slice(0, 5).map(d => {
              const m = s.movies.find(x => x.id === d.movieId)
              return (
                <div key={d.movieId + d.type} className="row-item">
                  <div>
                    <div className="item-title">{d.type.replace(/_/g, ' ')}</div>
                    <div className="item-sub">{m?.title ?? 'Unknown'} · {d.weeksRemaining}w left</div>
                  </div>
                  <div className="price">+{fmtMoney(d.revenuePerWeek)}/wk</div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

const PHASE_ORDER = ['preProduction', 'production', 'marketing', 'inTheaters'] as const

function Pipeline({ state, go }: { state: GameState; go: (t: Tab) => void }) {
  const p = state.production!
  const m = p.movie
  const c = castOf(state, m)
  const strat = STRATEGIES.find((x) => x.name === p.marketingStrategy)
  const phaseIdx = Math.max(0, PHASE_ORDER.indexOf(p.phase as (typeof PHASE_ORDER)[number]))

  const castComplete = Boolean(c.writer && c.director && c.actors.length > 0)
  const frames: { label: string; detail: string; state: 'done' | 'current' | 'upcoming' }[] = [
    { label: 'Script', detail: m.scriptQuality > 0 ? `q${Math.round(m.scriptQuality)}` : '—', state: 'done' },
    { label: 'Cast', detail: castComplete ? 'full' : `${c.actors.length}/3 actors`, state: castComplete ? 'done' : phaseIdx === 0 ? 'current' : 'upcoming' },
    { label: 'Production', detail: phaseIdx === 1 ? `${p.weeksLeft}w left` : m.quality > 0 ? `q${Math.round(m.quality)}` : '—', state: phaseIdx === 1 ? 'current' : phaseIdx > 1 ? 'done' : 'upcoming' },
    { label: 'Marketing', detail: phaseIdx >= 2 ? (p.releaseWeek ? `hype ${Math.round(m.hype)}` : 'pick date') : '—', state: phaseIdx === 2 ? 'current' : phaseIdx > 2 ? 'done' : 'upcoming' },
    { label: 'Release', detail: phaseIdx >= 3 ? (m.opening > 0 ? fmtMoney(m.opening) : 'week 1') : '—', state: phaseIdx === 3 ? 'current' : 'upcoming' },
  ]

  return (
    <>
      <div className="filmstrip" aria-label="Production phases">
        {frames.map((f) => (
          <div key={f.label} className={`frame ${f.state}`}>
            <div className="frame-label">{f.label}</div>
            <div className="frame-detail">{f.detail}</div>
          </div>
        ))}
      </div>
      <div className="pipeline">
        <div className="pipeline-main">
          <div className="movie-title">“{m.title}”</div>
          <div className="movie-meta">
            <GenreBadge g={m.genre} />
            <span>Script quality {m.scriptQuality}</span>
            <span>Estimated quality {m.quality}</span>
            {m.franchiseName && <span className="franchise-badge">Part {m.part}</span>}
          </div>
          {m.quality > 0 && (
            <div className="quality-line">
              <span>Quality</span>
              <Bar value={m.quality} />
            </div>
          )}
          {p.phase === 'marketing' && (
            <div className="quality-line">
              <span>Hype</span>
              <Bar value={m.hype} color="var(--yellow)" />
            </div>
          )}
          <div className="pipeline-cast">
            <span>Writer: {c.writer ? c.writer.name : '—'}</span>
            <span>Director: {c.director ? c.director.name : '—'}</span>
            <span>Cast: {c.actors.length ? c.actors.map((a) => a.name).join(', ') : '—'}</span>
          </div>
        </div>
        <div className="pipeline-actions">
          {p.phase === 'preProduction' && !castComplete && (
            <Btn kind="primary" onClick={() => go('casting')}>
              Cast the movie
            </Btn>
          )}
          {p.phase === 'preProduction' && castComplete && (
            <div className="phase-note">Ready — open Casting to fund production</div>
          )}
          {p.phase === 'production' && (
            <div className="phase-note">🎬 Filming — {p.weeksLeft} week{p.weeksLeft === 1 ? '' : 's'} left</div>
          )}
          {p.phase === 'marketing' && (
            <div className="phase-note">
              📣 Marketing: {strat?.name ?? p.marketingStrategy}
              {p.releaseWeek ? (
                <> — releasing in {p.releaseWeek - state.week} week{p.releaseWeek - state.week === 1 ? '' : 's'}</>
              ) : (
                ' — pick a release date'
              )}
              <div className="btn-row">
                <Btn kind="primary" onClick={() => go('marketing')}>
                  Plan release
                </Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function NextUp({ state }: { state: GameState }) {
  const p = state.production!
  const m = p.movie
  const others = state.movies
    .filter((x) => x.finished && x.owner === 'player')
    .sort((a, b) => b.totalGross - a.totalGross)
    .slice(0, 3)
  return (
    <div className="nextup">
      <div>
        Next release: <strong>“{m.title}”</strong> ({m.genre})
      </div>
      {others.length > 0 && (
        <div className="muted">Your biggest hits: {others.map((o) => `“${o.title}” (${fmtMoney(o.totalGross)})`).join(' · ')}</div>
      )}
    </div>
  )
}

export function sequelEligible(m: Movie): boolean {
  return m.owner === 'player' && m.finished && m.part < 6 && m.totalGross >= m.cost * 2.5
}

export function WeeklyBoxOffice({ state }: { state: GameState }) {
  const rows: { movie: Movie; weekly: number }[] = []
  for (const m of [...state.movies, ...state.aiMovies]) {
    if (m.phase !== 'inTheaters') continue
    const last = m.weekly[m.weekly.length - 1]
    if (!last || last.week !== state.week) continue
    rows.push({ movie: m, weekly: last.gross })
  }
  rows.sort((a, b) => b.weekly - a.weekly)
  if (rows.length === 0) {
    return <div className="muted">Nothing in theaters this week. The box office is dark.</div>
  }
  const show = rows.slice(0, 5)
  const max = show[0]?.weekly ?? 1
  return (
    <table className="table bo-table">
      <thead>
        <tr>
          <th>Movie</th>
          <th className="num">This week</th>
          <th className="num">Total</th>
        </tr>
      </thead>
      <tbody>
        {show.map((r) => (
          <tr key={r.movie.id}>
            <td>
              <div className="cell-title">
                {r.movie.owner !== 'ai' && <span className="you-dot" title="Your movie" />}
                {r.movie.title}
              </div>
              <div className="cell-bar">
                <div className="bar-fill" style={{ width: `${(r.weekly / max) * 100}%`, background: 'var(--yellow)' }} />
              </div>
            </td>
            <td className="num">{fmtMoney(r.weekly)}</td>
            <td className="num">{fmtMoney(r.movie.totalGross)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function genreOptions(): string[] {
  return GENRES.map((g) => g.name)
}
