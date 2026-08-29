import type { GameState } from '../game/types'
import { Card, GenreBadge } from './ui'

export function Awards({ state }: { state: GameState }) {
  if (state.awards.length === 0) {
    return (
      <div className="empty">
        <p>No award ceremonies yet.</p>
        <p className="muted">At the end of each year, the industry hands out Best Picture. Make great movies — dramas and
          documentaries get extra love from the judges.</p>
      </div>
    )
  }
  return (
    <div className="grid">
      {state.awards.map((a) => (
        <Card key={a.year} title={`${a.year} Best Picture`}>
          <div className="award-winner">
            {a.winner ? (
              <>
                <div className="winner-title">
                  “{a.winner.title}” <GenreBadge g={a.winner.genre} />
                </div>
                <div className="winner-meta">
                  {a.winner.studioName} · quality {a.winner.quality}
                  {(a.winner.owner === 'player' || a.winner.owner === 'distributed') && <span className="you-badge">YOURS</span>}
                </div>
              </>
            ) : (
              <div className="muted">No eligible films that year.</div>
            )}
          </div>
          <div className="nominees">
            <div className="nominees-label">Nominees</div>
            {a.nominees.map((n) => (
              <div key={n.movieId} className={`nominee${n.won ? ' won' : ''}`}>
                <span>“{n.title}”</span>
                <span className="muted">
                  {n.studioName} · q{n.quality}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
