import { useState } from 'react'
import type { GameState } from '../game/types'
import { bidFestival } from '../game/engine'
import { Btn, Card, GenreBadge, fmtMoney } from './ui'

export function Festival({ state, apply }: { state: GameState; apply: (fn: (s: GameState) => GameState) => void }) {
  const [bid, setBid] = useState<Record<string, number>>({})
  const f = state.festival

  if (!f || !f.open) {
    const next = 26 - (state.week % 26)
    return (
      <div className="empty">
        <p>The bi-annual film festival is between sessions.</p>
        <p className="muted">Next festival opens in {next} week{next === 1 ? '' : 's'} — completed movies go up for
          distribution rights there.</p>
      </div>
    )
  }

  return (
    <Card
      title="Film Festival — distribution rights auction"
      right={f.bidPlaced ? <span className="bad">Bid placed</span> : <span className="good">Open for bidding</span>}
    >
      <p className="muted">
        Bid on completed movies to distribute them. You collect <b>50% of their gross</b> over the run. Rivals bid too —
        overbid them to win.
      </p>
      <div className="list">
        {f.offers.map((o) => {
          const myBid = bid[o.id] ?? o.asking
          return (
            <div key={o.id} className="row-item festival-item">
              <div>
                <div className="item-title">“{o.title}”</div>
                <div className="item-sub">
                  <GenreBadge g={o.genre} /> · Quality <b>{o.quality}</b> · est. gross {fmtMoney(o.estGross)} · from{' '}
                  {o.studioName}
                </div>
                <div className="item-sub muted">Asking {fmtMoney(o.asking)}</div>
                <div className="bid-row">
                  <input
                    type="number"
                    min={o.asking}
                    step={100_000}
                    value={myBid}
                    disabled={f.bidPlaced}
                    onChange={(e) => setBid((b) => ({ ...b, [o.id]: Number(e.target.value) }))}
                  />
                  <Btn
                    small
                    kind="primary"
                    disabled={f.bidPlaced || myBid < o.asking || state.cash < myBid}
                    onClick={() => apply((s) => bidFestival(s, o.id, myBid))}
                  >
                    Bid {fmtMoney(myBid)}
                  </Btn>
                </div>
                {state.cash < myBid && <div className="hint">Not enough cash for that bid.</div>}
              </div>
            </div>
          )
        })}
      </div>
      {f.bidPlaced && <div className="hint">You've made your bid this session — the result is in the news log.</div>}
    </Card>
  )
}
