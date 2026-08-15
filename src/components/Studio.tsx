import { castOf } from '../game/engine'
import { dateInfo } from '../game/formulas'
import { tierForRep } from '../game/engine'
import { GENRES, STRATEGIES, TIERS } from '../game/data'
import type { GameState, Movie } from '../game/types'
import { Bar, Btn, Card, GenreBadge, Stat, fmtMoney } from './ui'

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
        <Stat label="Movies made" value={s.stats.moviesMade} sub={`${s.stats.blockbusters} blockbusters`} />
        <Stat label="Total earned" value={fmtMoney(s.stats.totalEarned)} sub={`Awards won: ${s.stats.awardsWon}`} />
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
