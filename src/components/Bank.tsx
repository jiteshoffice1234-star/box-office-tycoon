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
// weeks per unit — used to convert the term when the payment frequency changes
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
        <div className="list">
          {upcoming.length === 0 && <div className="muted">No other studio has a scheduled release right now.</div>}
          {upcoming.map((a) => {
            const max = Math.round(a.budget * INVEST_MAX_SHARE)
            return (
              <div key={a.name} className="row-item">
                <div>
                  <div className="item-title">{a.name}</div>
                  <div className="item-sub">
                    <GenreBadge g={a.genre} /> · budget {fmtMoney(a.budget)} · opens in {a.nextReleaseWeek - state.week} weeks · up to {fmtMoney(max)}
                  </div>
                </div>
                <div className="row-actions">
                  <Btn
                    small
                    kind={investIn === a.name ? 'primary' : 'default'}
                    disabled={investIn === a.name}
                    onClick={() => {
                      setInvestIn(a.name)
                      setInvestAmt(Math.min(Math.max(500_000, investAmt), max))
                    }}
                  >
                    {investIn === a.name ? 'Selected' : 'Select'}
                  </Btn>
                </div>
              </div>
            )
          })}
        </div>
        {investTarget && (
          <div className="form-row" style={{ marginTop: 12 }}>
            <label className="grow">
              Investment in {investTarget.name}: <strong>{fmtMoney(investAmount)}</strong> (
              {investMax > 0 ? Math.round((investAmount / investMax) * INVEST_MAX_SHARE * 100) : 0}% of budget)
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
        )}
        <div className="btn-row">
          <Btn
            kind="primary"
            disabled={!investTarget || investAmount < INVEST_MIN}
            onClick={() => apply((s) => investInMovie(s, investIn, investAmount))}
          >
            Invest {fmtMoney(investAmount)}
          </Btn>
          {state.cash < investAmount && <span className="muted">Not enough cash.</span>}
        </div>
        {investments.length > 0 && (
          <div className="list" style={{ marginTop: 12 }}>
            {investments.map((inv) => {
              const earning = inv.movieId !== null && !inv.settled
              return (
                <div key={inv.id} className="row-item">
                  <div>
                    <div className="item-title">{fmtMoney(inv.amount)} in {inv.studioName}</div>
                    <div className="item-sub">
                      {inv.settled
                        ? `Settled · returned ${fmtMoney(inv.totalReturn)}`
                        : earning
                          ? `Earning · ${fmtMoney(inv.totalReturn)} back so far`
                          : `Opens ${dateInfo(inv.releaseWeek).monthName} Y${dateInfo(inv.releaseWeek).year} · ${Math.round(inv.share * 100)}% stake`}
                    </div>
                  </div>
                </div>
              )
            })}
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
                  // keep the duration the same when the unit changes (10 weeks = 2.3 months = 70 days)
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
