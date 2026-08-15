import type { GameState } from '../game/types'
import { WeeklyBoxOffice } from './Studio'
import { Card, fmtMoney } from './ui'

export function News({ state }: { state: GameState }) {
  return (
    <div className="grid">
      <Card title="Full weekly box office">
        <WeeklyBoxOffice state={state} />
        <div className="muted small">All figures domestic + international. You keep ~55% of domestic, 40% of
          international, plus home-video revenue.</div>
      </Card>

      <Card title="Studio news">
        {state.log.length === 0 ? (
          <div className="muted">No news yet.</div>
        ) : (
          <div className="news-list">
            {state.log.map((n, i) => (
              <div key={`${n.week}-${i}`} className={`news-item news-${n.kind}`}>
                <span className="news-week">W{n.week + 1}</span>
                <span>{n.text}</span>
              </div>
            ))}
          </div>
        )}
        <div className="muted small">Latest {state.log.length} entries kept — the log never grows unbounded.</div>
      </Card>

      <Card title="Lifetime stats">
        <div className="stats-grid">
          <div className="stat">
            <div className="stat-label">Movies made</div>
            <div className="stat-value">{state.stats.moviesMade}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Blockbusters ($100M+)</div>
            <div className="stat-value">{state.stats.blockbusters}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Awards won</div>
            <div className="stat-value">{state.stats.awardsWon}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Festival wins</div>
            <div className="stat-value">{state.stats.festivalsWon}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Total earned</div>
            <div className="stat-value">{fmtMoney(state.stats.totalEarned)}</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
