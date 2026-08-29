import { useState } from 'react'
import type { GameState, LoanFrequency } from '../game/types'
import { giveLoan, investInMovie, loanPlan, payOffLoan, takeLoan } from '../game/engine'
import { dateInfo } from '../game/formulas'
import {
  LOAN_TERM,
  LOAN_INTEREST,
  LEND_TERM,
  LEND_INTEREST,
  INVEST_MAX_SHARE,
  INVEST_MIN,
  MAX_LOAN_AMOUNT,
} from '../game/data'
import { Btn, Card, GenreBadge, fmtMoney } from './ui'

const FREQS: LoanFrequency[] = ['weekly', 'monthly', 'daily']
const termUnit = (f: LoanFrequency): string => (f === 'monthly' ? 'months' : f === 'daily' ? 'days' : 'weeks')
const termMax = (f: LoanFrequency): number => (f === 'monthly' ? 24 : f === 'daily' ? 365 : 104)
const unitWeeks = (f: LoanFrequency): number => (f === 'monthly' ? 4.33 : f === 'daily' ? 1 / 7 : 1)

export function Bank({ state, apply }: { state: GameState; apply: (fn: (s: GameState) => GameState) => void }) {
  const [investAmt, setInvestAmt] = useState(500_000)
  const [investIn, setInvestIn] = useState('')

  const borrowLoans = state.loans.filter((l) => l.kind === 'borrow')
  const lendLoans = state.loans.filter((l) => l.kind === 'lend')
  const upcoming = state.aiStudios.filter((a) => a.nextReleaseWeek > state.week)
  const investments = state.investments
  const investTarget = upcoming.find((a) => a.name === investIn)
  const investMax = investTarget ? Math.round(investTarget.budget * INVEST_MAX_SHARE) : 0
  const investCap = Math.max(INVEST_MIN, Math.min(investMax, state.cash))
  const investAmount = Math.min(investAmt, investCap)

  // Calculate total investment stats
  const activeInvestments = investments.filter(i => !i.settled)
  const settledInvestments = investments.filter(i => i.settled)
  const totalInvested = investments.reduce((s, i) => s + i.amount, 0)
  const totalReturned = investments.reduce((s, i) => s + i.totalReturn, 0)
  const totalProfit = totalReturned - totalInvested

  return (
    <div className="grid">
      <Card title="Take a loan" right={<span className="muted">Your money, your terms — no limits</span>}>
        <p className="muted small">
          Borrow any amount, as many times as you want. You set the interest rate, the term, and the payment
          schedule (weekly, monthly, or daily).
        </p>
        <LoanConfig
          kind="borrow"
          state={state}
          apply={apply}
          defaultRate={LOAN_INTEREST}
          defaultTerm={LOAN_TERM}
          actionLabel={(amt, _total, freq) => `Borrow ${fmtMoney(amt)} at ${freq}`}
          extra={
            borrowLoans.length > 0 && (
              <div className="list" style={{ marginTop: 12 }}>
                {borrowLoans.map((l) => (
                  <div key={l.id} className="row-item">
                    <div>
                      <div className="item-title">{fmtMoney(l.principal)} loan · {Math.round(l.rate * 100)}%</div>
                      <div className="item-sub">
                        {fmtMoney(l.outstanding)} left · {fmtMoney(l.installment)} {l.frequency} · next due in{' '}
                        {Math.max(0, l.nextDueWeek - state.week)}w
                      </div>
                    </div>
                    <Btn small disabled={state.cash < l.outstanding} onClick={() => apply((s) => payOffLoan(s, l.id))}>
                      Pay off {fmtMoney(l.outstanding)}
                    </Btn>
                  </div>
                ))}
              </div>
            )
          }
        />
      </Card>

      <Card title="Give a loan" right={<span className="muted">Lend to any studio, any amount</span>}>
        <p className="muted small">
          Lend cash to a rival studio and collect on your schedule. Pick the studio, set your rate, term, and payment
          frequency — there's no limit on how many loans you give or how much.
        </p>
        <LoanConfig
          kind="lend"
          state={state}
          apply={apply}
          defaultRate={LEND_INTEREST}
          defaultTerm={LEND_TERM}
          studios={state.aiStudios.map((a) => a.name)}
          actionLabel={(amt, _total, _freq, studio) => `Lend ${fmtMoney(amt)} to ${studio ?? '…'}`}
          extra={
            lendLoans.length > 0 && (
              <div className="list" style={{ marginTop: 12 }}>
                {lendLoans.map((l) => (
                  <div key={l.id} className="row-item">
                    <div>
                      <div className="item-title">
                        {fmtMoney(l.principal)} to {l.studioName} · {Math.round(l.rate * 100)}%
                      </div>
                      <div className="item-sub">
                        {fmtMoney(l.received)} collected · {fmtMoney(l.installment)} {l.frequency} · next due in{' '}
                        {Math.max(0, l.nextDueWeek - state.week)}w
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        />
      </Card>

      <Card title="Invest in other studios" right={<span className="muted">Stake a rival's upcoming movie</span>}>
        <p className="muted small">
          Put cash into another studio's upcoming movie and earn a share of its box office for the whole run. Up to{' '}
          {Math.round(INVEST_MAX_SHARE * 100)}% of their budget.
        </p>

        {/* Investment Stats */}
        {investments.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 6px', fontSize: 10, fontFamily: 'var(--font-data)' }}>
              Invested: <strong>{fmtMoney(totalInvested)}</strong>
            </span>
            <span style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 6px', fontSize: 10, fontFamily: 'var(--font-data)' }}>
              Returned: <strong style={{ color: totalProfit >= 0 ? 'var(--green-bright)' : 'var(--red-soft)' }}>{fmtMoney(totalReturned)}</strong>
            </span>
            <span style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 6px', fontSize: 10, fontFamily: 'var(--font-data)' }}>
              Profit: <strong style={{ color: totalProfit >= 0 ? 'var(--green-bright)' : 'var(--red-soft)' }}>{totalProfit >= 0 ? '+' : ''}{fmtMoney(totalProfit)}</strong>
            </span>
          </div>
        )}

        <div className="list">
          {upcoming.length === 0 && <div className="muted">No other studio has a scheduled release right now.</div>}
          {upcoming.map((a) => {
            const max = Math.round(a.budget * INVEST_MAX_SHARE)
            const isSelected = investIn === a.name
            return (
              <div key={a.name} className="row-item" style={{ borderColor: isSelected ? 'var(--gold)' : undefined, background: isSelected ? 'rgba(212,168,67,0.06)' : undefined }}>
                <div style={{ flex: 1 }}>
                  <div className="item-title">{a.name}</div>
                  <div className="item-sub">
                    <GenreBadge g={a.genre} /> · budget {fmtMoney(a.budget)} · opens in {a.nextReleaseWeek - state.week}w
                  </div>
                  <div className="item-sub" style={{ color: 'var(--gold)', fontWeight: 700 }}>
                    Up to {fmtMoney(max)} investment · {(INVEST_MAX_SHARE * 100).toFixed(0)}% stake
                  </div>
                </div>
                <div className="row-actions">
                  <Btn
                    small
                    kind={isSelected ? 'primary' : 'default'}
                    onClick={() => {
                      setInvestIn(isSelected ? '' : a.name)
                      setInvestAmt(Math.min(Math.max(500_000, investAmt), max))
                    }}
                  >
                    {isSelected ? '✓ Selected' : 'Select'}
                  </Btn>
                </div>
              </div>
            )
          })}
        </div>

        {investTarget && (
          <div style={{ marginTop: 12, padding: 10, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              Invest in {investTarget.name}
            </div>
            <div className="form-row">
              <label className="grow">
                Amount: <strong style={{ color: 'var(--gold)' }}>{fmtMoney(investAmount)}</strong>
                <input
                  type="range"
                  min={INVEST_MIN}
                  max={Math.max(INVEST_MIN, investCap)}
                  step={50_000}
                  value={Math.min(Math.max(investAmount, INVEST_MIN), Math.max(INVEST_MIN, investCap))}
                  onChange={(e) => setInvestAmt(Number(e.target.value))}
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 11, fontFamily: 'var(--font-data)', color: 'var(--ink-muted)' }}>
              <span>Stake: <strong style={{ color: 'var(--ink)' }}>{investMax > 0 ? ((investAmount / investTarget.budget) * 100).toFixed(1) : 0}%</strong></span>
              <span>·</span>
              <span>Share of gross: <strong style={{ color: 'var(--green-bright)' }}>{investMax > 0 ? ((investAmount / investTarget.budget) * 100).toFixed(1) : 0}%</strong></span>
            </div>
          </div>
        )}

        <div className="btn-row">
          <Btn
            kind="primary"
            disabled={!investTarget || investAmount < INVEST_MIN}
            onClick={() => apply((s) => investInMovie(s, investIn, investAmount))}
          >
            💰 Invest {fmtMoney(investAmount)} in {investTarget?.name ?? '...'}
          </Btn>
          {state.cash < investAmount && <span className="muted">Not enough cash.</span>}
        </div>

        {/* Active Investments */}
        {activeInvestments.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, fontFamily: 'var(--font-data)' }}>
              Active ({activeInvestments.length})
            </div>
            <div className="list">
              {activeInvestments.map((inv) => {
                const earning = inv.movieId !== null
                return (
                  <div key={inv.id} className="row-item" style={{ borderLeft: '3px solid ' + (earning ? 'var(--gold)' : 'var(--border)') }}>
                    <div style={{ flex: 1 }}>
                      <div className="item-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{inv.studioName}</span>
                        <span className="price">{fmtMoney(inv.amount)}</span>
                      </div>
                      <div className="item-sub" style={{ marginTop: 2 }}>
                        {earning ? (
                          <span>
                            <span style={{ color: 'var(--gold)' }}>▶ Earning</span> · {Math.round(inv.share * 100)}% stake · {fmtMoney(inv.totalReturn)} earned
                          </span>
                        ) : (
                          <span>Opens {dateInfo(inv.releaseWeek).monthName} Y{dateInfo(inv.releaseWeek).year} · {Math.round(inv.share * 100)}% stake</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Settled Investments */}
        {settledInvestments.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, fontFamily: 'var(--font-data)' }}>
              Settled ({settledInvestments.length})
            </div>
            <div className="list">
              {settledInvestments.slice(-5).reverse().map((inv) => {
                const profit = inv.totalReturn - inv.amount
                return (
                  <div key={inv.id} className="row-item" style={{ borderLeft: '3px solid ' + (profit >= 0 ? 'var(--green)' : 'var(--red)') }}>
                    <div style={{ flex: 1 }}>
                      <div className="item-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{inv.studioName}</span>
                        <span className="price">{fmtMoney(inv.amount)}</span>
                      </div>
                      <div className="item-sub" style={{ marginTop: 2 }}>
                        <span style={{ color: profit >= 0 ? 'var(--green-bright)' : 'var(--red-soft)' }}>
                          {profit >= 0 ? '✅' : '❌'} Returned {fmtMoney(inv.totalReturn)} ({profit >= 0 ? '+' : ''}{fmtMoney(profit)})
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function LoanConfig({
  kind,
  state,
  apply,
  defaultRate,
  defaultTerm,
  studios,
  actionLabel,
  extra,
}: {
  kind: 'borrow' | 'lend'
  state: GameState
  apply: (fn: (s: GameState) => GameState) => void
  defaultRate: number
  defaultTerm: number
  studios?: string[]
  actionLabel: (amount: number, total: number, freq: string, studio: string | null) => string
  extra?: React.ReactNode
}) {
  const [amount, setAmount] = useState(1_000_000)
  const [rate, setRate] = useState(defaultRate)
  const [frequency, setFrequency] = useState<LoanFrequency>('weekly')
  const [term, setTerm] = useState(defaultTerm)
  const [studio, setStudio] = useState('')

  const plan = loanPlan(amount, rate, frequency, term)
  const durationWeeks = plan.collections * plan.intervalWeeks
  const cashOk = kind === 'lend' ? state.cash >= amount : true
  const studioOk = kind === 'lend' ? Boolean(studio) : true
  const ok = amount >= INVEST_MIN && cashOk && studioOk
  const unit = termUnit(frequency)
  const freq = frequency

  return (
    <>
      <div className="form-row">
        {kind === 'lend' && (
          <label className="grow">
            Studio
            <select value={studio} onChange={(e) => setStudio(e.target.value)}>
              <option value="">— choose a studio —</option>
              {(studios ?? []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="grow">
          Amount
          <input
            type="number"
            min={INVEST_MIN}
            max={kind === 'lend' ? Math.min(state.cash, MAX_LOAN_AMOUNT) : MAX_LOAN_AMOUNT}
            step={100_000}
            value={amount}
            onChange={(e) => setAmount(Math.min(MAX_LOAN_AMOUNT, Math.max(0, Number(e.target.value) || 0)))}
          />
        </label>
        <label className="grow">
          Interest rate: <strong>{Math.round(rate * 100)}%</strong>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(rate * 100)}
            onChange={(e) => setRate(Number(e.target.value) / 100)}
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Payments
          <div className="tabs-mini" style={{ marginBottom: 0 }}>
            {FREQS.map((f) => (
              <button
                key={f}
                className={`tab-mini${frequency === f ? ' active' : ''}`}
                onClick={() => {
                  setTerm(Math.max(1, Math.round((term * unitWeeks(frequency)) / unitWeeks(f) * 100) / 100))
                  setFrequency(f)
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </label>
        <label>
          Term ({unit})
          <input
            type="number"
            min={1}
            max={termMax(frequency)}
            value={term}
            onChange={(e) => setTerm(Math.min(termMax(frequency), Math.max(1, Number(e.target.value) || 1)))}
          />
        </label>
      </div>
      <p className="muted small" style={{ marginTop: 8 }}>
        {kind === 'borrow' ? (
          <>
            You get <b>{fmtMoney(amount)}</b>. You repay <b>{fmtMoney(plan.total)}</b> over {durationWeeks} weeks —{' '}
            <b>{fmtMoney(plan.installment)}</b> {freq} per collection ({plan.collections} collections,{' '}
            {plan.intervalWeeks === 4 ? 'every 4 weeks' : 'every week'})
          </>
        ) : (
          <>
            You lend <b>{fmtMoney(amount)}</b>. You receive <b>{fmtMoney(plan.total)}</b> over {durationWeeks} weeks —{' '}
            <b>{fmtMoney(plan.installment)}</b> {freq} per collection ({plan.collections} collections,{' '}
            {plan.intervalWeeks === 4 ? 'every 4 weeks' : 'every week'})
          </>
        )}
        {kind === 'lend' && state.cash < amount && <span className="bad"> · not enough cash</span>}
      </p>
      <div className="btn-row">
        <Btn
          kind="primary"
          disabled={!ok}
          onClick={() =>
            apply((s) =>
              kind === 'borrow'
                ? takeLoan(s, amount, rate, term, frequency)
                : giveLoan(s, studio, amount, rate, term, frequency),
            )
          }
        >
          {actionLabel(amount, plan.total, `${frequency} · ${term} ${unit}`, kind === 'lend' ? studio || null : null)}
        </Btn>
      </div>
      {extra}
    </>
  )
}
