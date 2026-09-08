import { type ReactNode, useEffect, useRef, useState } from 'react'
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
      <div className="bar-fill" style={{ transform: `scaleX(${pct / 100})`, background: color ?? 'var(--color-primary)' }} />
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

export function AnimatedCounter({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)

  useEffect(() => {
    const start = prev.current
    const end = value
    prev.current = value
    if (start === end) return
    const duration = 400
    const startTime = performance.now()
    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(start + (end - start) * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value])

  return <span>{prefix}{display.toLocaleString()}{suffix}</span>
}

export function LineChart({ data, width = 200, height = 60, color = 'var(--color-primary)' }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 8) - 4
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function BarChart({ data, labels, width = 200, height = 60, color = 'var(--color-primary)' }: { data: number[]; labels?: string[]; width?: number; height?: number; color?: string }) {
  const max = Math.max(...data, 1)
  const barWidth = Math.floor(width / data.length) - 2
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {data.map((v, i) => {
        const barHeight = (v / max) * (height - 8)
        const x = i * (barWidth + 2)
        const y = height - barHeight - 2
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx="2" fill={color} opacity="0.8" />
            {labels?.[i] && (
              <text x={x + barWidth / 2} y={height - 2} textAnchor="middle" fontSize="8" fill="var(--color-text-secondary)">{labels[i]}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export function DonutChart({ segments, size = 80 }: { segments: { value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1
  const r = size / 2 - 6
  const circumference = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width={size} height={size} style={{ display: 'block', transform: 'rotate(-90deg)' }}>
      {segments.map((seg, i) => {
        const pct = seg.value / total
        const dash = pct * circumference
        const dashOffset = -offset
        offset += dash
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="8"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={dashOffset}
          />
        )
      })}
    </svg>
  )
}
