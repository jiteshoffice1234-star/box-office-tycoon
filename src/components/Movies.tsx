import { useMemo, useState } from 'react'
import type { GameState, Movie } from '../game/types'
import { makeSequel } from '../game/engine'
import { dateInfo } from '../game/formulas'
import { Btn, Card, GenreBadge, fmtMoney } from './ui'

const PAGE = 25

interface MovieGroup {
  type: 'single' | 'series' | 'show' | 'franchise'
  title: string
  franchiseName: string | null
  genre: Movie['genre']
  owner: Movie['owner']
  studioName: string
  items: Movie[]
  latest: Movie
}

function groupMovies(movies: Movie[]): MovieGroup[] {
  const groups = new Map<string, MovieGroup>()

  for (const m of movies) {
    // Series/shows: group by franchiseName or cleaned title
    if (m.contentType === 'series' || m.contentType === 'show') {
      const cleanTitle = m.title.replace(/Part \d+\s*/, '').replace(/ — Season \d+$/, '')
      const key = m.franchiseName || cleanTitle
      if (!groups.has(key)) {
        groups.set(key, {
          type: m.contentType as 'series' | 'show',
          title: key,
          franchiseName: m.franchiseName,
          genre: m.genre,
          owner: m.owner,
          studioName: m.studioName,
          items: [],
          latest: m,
        })
      }
      const g = groups.get(key)!
      g.items.push(m)
      if (m.releaseWeek > g.latest.releaseWeek) g.latest = m
    } else {
      // Franchise movies: group by franchiseName
      if (m.franchiseName) {
        const key = m.franchiseName
        if (!groups.has(key)) {
          groups.set(key, {
            type: 'franchise',
            title: key,
            franchiseName: m.franchiseName,
            genre: m.genre,
            owner: m.owner,
            studioName: m.studioName,
            items: [],
            latest: m,
          })
        }
        const g = groups.get(key)!
        g.items.push(m)
        if (m.releaseWeek > g.latest.releaseWeek) g.latest = m
      } else {
        // True individual movies (no franchise)
        groups.set(m.id, {
          type: 'single',
          title: m.title,
          franchiseName: m.franchiseName,
          genre: m.genre,
          owner: m.owner,
          studioName: m.studioName,
          items: [m],
          latest: m,
        })
      }
    }
  }

  // Sort: latest release first
  return Array.from(groups.values()).sort((a, b) => b.latest.releaseWeek - a.latest.releaseWeek)
}

export function Movies({ state, apply }: { state: GameState; apply: (fn: (s: GameState) => GameState) => void }) {
  const [visible, setVisible] = useState(PAGE)
  const [filter, setFilter] = useState<'all' | 'player' | 'distributed'>('all')

  const groups = useMemo(() => {
    const filtered = state.movies.filter((m) => (filter === 'all' ? true : m.owner === filter))
    return groupMovies(filtered)
  }, [state.movies, filter])

  const shown = groups.slice(0, visible)

  return (
    <Card
      title="Filmography"
      right={
        <div className="btn-row">
          {(['all', 'player', 'distributed'] as const).map((f) => (
            <button key={f} className={`tab-mini${filter === f ? ' active' : ''}`} onClick={() => { setFilter(f); setVisible(PAGE) }}>
              {f === 'all' ? 'All' : f === 'player' ? 'Produced' : 'Distributed'}
            </button>
          ))}
        </div>
      }
    >
      <div className="list">
        {shown.map((g) => (
          <GroupRow key={g.title + g.owner} group={g} state={state} apply={apply} />
        ))}
        {shown.length === 0 && (
          <div className="empty">
            <p>No movies yet — write your first script to light up the marquee.</p>
          </div>
        )}
      </div>
      {groups.length > visible && (
        <div className="btn-row" style={{ justifyContent: 'center', marginTop: 8 }}>
          <Btn onClick={() => setVisible((v) => v + PAGE)}>
            Load more ({groups.length - visible} hidden)
          </Btn>
        </div>
      )}
      <div className="muted small" style={{ marginTop: 6 }}>
        {state.movies.length} movies · {groups.length} entries · showing {shown.length}
      </div>
    </Card>
  )
}

function GroupRow({ group, apply }: { group: MovieGroup; state: GameState; apply: (fn: (s: GameState) => GameState) => void }) {
  const { type, title, items, latest, owner, genre } = group
  const m = latest

  if (type === 'single') {
    // Single movie — show full details
    return (
      <div className="row-item">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="item-title">
            {m.isDisaster && <span style={{ fontSize: 9, background: '#c0392b', color: '#fff', padding: '1px 4px', borderRadius: 3, marginRight: 4 }}>DISASTER</span>}
            {m.phase === 'evergreen' && <span style={{ fontSize: 9, background: '#27ae60', color: '#fff', padding: '1px 4px', borderRadius: 3, marginRight: 4 }}>EVERGREEN</span>}
            {m.franchiseName && <span style={{ fontSize: 9, background: 'var(--gold-bg)', border: '1px solid var(--gold-border)', color: 'var(--gold-bright)', padding: '1px 4px', borderRadius: 3, marginRight: 4 }}>Part {m.part}</span>}
            {m.title}
            {m.owner === 'distributed' && <span style={{ fontSize: 9, background: 'var(--blue-bg)', border: '1px solid rgba(74,140,212,0.3)', color: 'var(--blue-bright)', padding: '1px 4px', borderRadius: 3, marginLeft: 4 }}>DIST</span>}
          </div>
          <div className="item-sub">
            {owner === 'player' ? 'You' : m.studioName} · {dateInfo(m.releaseWeek).monthName} {dateInfo(m.releaseWeek).year}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <GenreBadge g={genre} />
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--ink-soft)' }}>q{m.quality}</span>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, fontWeight: 700, color: 'var(--gold)' }}>{fmtMoney(m.totalGross)}</span>
          {m.owner === 'player' && m.finished && m.part < 6 && m.totalGross >= m.cost * 2.5 && (
            <Btn small kind="primary" onClick={() => apply((s) => makeSequel(s, m.id))}>Sequel</Btn>
          )}
        </div>
      </div>
    )
  }

  // Series/Show/Franchise group — compact summary
  const totalEarnings = items.reduce((s, x) => s + x.revenue, 0)
  const avgQuality = Math.round(items.reduce((s, x) => s + x.quality, 0) / items.length)

  if (type === 'franchise') {
    // Franchise group: multiple movies under same franchise
    const maxPart = Math.max(...items.map(x => x.part))
    return (
      <div className="row-item" style={{ borderLeft: '3px solid var(--gold)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="item-title">
            <span style={{ fontSize: 9, background: 'var(--gold-bg)', border: '1px solid var(--gold-border)', color: 'var(--gold-bright)', padding: '1px 5px', borderRadius: 3, marginRight: 4 }}>
              🎬 FRANCHISE · {maxPart} parts
            </span>
            {title}
          </div>
          <div className="item-sub">
            {owner === 'player' ? 'You' : m.studioName} · {genre} · {items.length} films · avg quality {avgQuality}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--ink-muted)' }}>
            Latest: Part {latest.part}
          </span>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, fontWeight: 700, color: totalEarnings > 0 ? 'var(--gold)' : 'var(--ink-muted)' }}>
            {fmtMoney(totalEarnings)}
          </span>
        </div>
      </div>
    )
  }

  // Series/Show
  const totalSeasons = items.length
  const latestSeason = m.title.match(/Season (\d+)$/)?.[1] || `${totalSeasons}`
  const icon = type === 'series' ? '📺' : '📡'

  return (
    <div className="row-item" style={{ borderLeft: `3px solid ${type === 'series' ? 'var(--blue)' : '#8b5cf6'}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="item-title">
          <span style={{ fontSize: 9, background: type === 'series' ? 'rgba(74,140,212,0.15)' : 'rgba(139,92,246,0.15)', border: `1px solid ${type === 'series' ? 'rgba(74,140,212,0.3)' : 'rgba(139,92,246,0.3)'}`, color: type === 'series' ? 'var(--blue-bright)' : '#a78bfa', padding: '1px 5px', borderRadius: 3, marginRight: 4 }}>
            {icon} {type.toUpperCase()}
          </span>
          {title}
        </div>
        <div className="item-sub">
          {owner === 'player' ? 'You' : m.studioName} · {genre} · {totalSeasons} seasons · avg quality {avgQuality}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--ink-muted)' }}>
          Latest: S{latestSeason}
        </span>
        <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, fontWeight: 700, color: totalEarnings > 0 ? 'var(--gold)' : 'var(--ink-muted)' }}>
          {fmtMoney(totalEarnings)}
        </span>
      </div>
    </div>
  )
}
