import type { ReactNode } from 'react'
import { genreMeta } from '../game/data'
import type { Genre } from '../game/types'

const MONEY_UNITS: [number, string][] = [
  [1e27, 'Oc'],
  [1e24, 'Se'],
  [1e21, 'Sp'],
  [1e18, 'Sx'],
  [1e15, 'Q'],
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K'],
]

export function fmtMoney(v: number): string {
  const sign = v < 0 ? '-' : ''
  const a = Math.abs(v)
  for (const [th, suf] of MONEY_UNITS) {
    if (a >= th) {
      const val = a / th
      // Show 1 decimal for small numbers, 2 for large
      const decimals = val < 10 ? 2 : val < 100 ? 1 : 0
      return `${sign}$${val.toFixed(decimals)}${suf}`
    }
  }
  return `${sign}$${Math.round(a).toLocaleString('en-US')}`
}

export function Card({ title, right, children, tone }: { title?: ReactNode; right?: ReactNode; children: ReactNode; tone?: 'gold' | 'alert' }) {
  return (
    <div className={`card${tone ? ` card-${tone}` : ''}`}>
      {(title || right) && (
        <div className="card-head">
          <div className="card-title">
            {title && <span className="tick">▸</span>}
            {title}
          </div>
          <div className="card-right">{right}</div>
        </div>
      )}
      {children}
    </div>
  )
}

export function Btn({
  children,
  onClick,
  disabled,
  kind = 'default',
  small,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  kind?: 'primary' | 'default' | 'danger' | 'ghost'
  small?: boolean
}) {
  return (
    <button className={`btn btn-${kind}${small ? ' btn-sm' : ''}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export function Bar({ value, max = 100, color }: { value: number; max?: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  // GPU-only motion: scaleX transform instead of width (no layout thrash)
  return (
    <div className="bar">
      <div className="bar-fill" style={{ transform: `scaleX(${pct / 100})`, background: color ?? 'var(--red)' }} />
    </div>
  )
}

export function GenreBadge({ g }: { g: Genre }) {
  const meta = genreMeta(g)
  return (
    <span className="genre-badge" title={g}>
      {meta.emoji} {g}
    </span>
  )
}

export function FameStars({ fame }: { fame: number }) {
  const stars = Math.round((fame / 100) * 5)
  return (
    <span className="stars" title={`Fame ${fame}/100`}>
      {'★'.repeat(Math.max(1, stars))}
      <span className="stars-dim">{'★'.repeat(Math.max(0, 5 - stars))}</span>
    </span>
  )
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}
