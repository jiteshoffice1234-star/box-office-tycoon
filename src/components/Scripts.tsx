import { useState } from 'react'
import type { GameState, Genre } from '../game/types'
import { buyScript, createScript, putIntoProduction } from '../game/engine'
import { GENRES } from '../game/data'
import { writeScriptCost } from '../game/formulas'
import { randomTitle } from '../game/names'
import { Btn, Card, GenreBadge, fmtMoney } from './ui'

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
  const busy = state.production !== null

  const cost = writeScriptCost(quality)

  const handleWrite = () => {
    apply((s) => createScript(s, genre, quality, title))
    setTitle('')
  }

  return (
    <div className="grid">
      <Card title="Write a script" right={<span className="muted">Cheaper than buying — you control quality</span>}>
        <div className="form-row">
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
          <div className="muted">No scripts yet. Write one above or grab a spec script from the market.</div>
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

      <Card title="Spec script market" right={<span className="muted">Refreshes every month</span>}>
        <div className="list">
          {state.market.map((sc) => (
            <div key={sc.id} className="row-item">
              <div>
                <div className="item-title">“{sc.title}”</div>
                <div className="item-sub">
                  <GenreBadge g={sc.genre} /> · Quality <b>{sc.quality}</b>
                </div>
              </div>
              <div className="row-actions">
                <span className="price">{fmtMoney(sc.price)}</span>
                <Btn small disabled={state.cash < sc.price} onClick={() => apply((s) => buyScript(s, sc.id))}>
                  Buy
                </Btn>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
