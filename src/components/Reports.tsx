import { useMemo, useState } from 'react'
import { calculateReports } from '../game/reports'
import type { GameState, LedgerCategory, ReportPoint, ReportRange } from '../game/types'
import { Card, Stat, fmtMoney } from './ui'

type ReportView = 'overview' | 'balanceSheet' | 'profitAndLoss'
type RangeChoice = 'week' | 'year' | 'all'

const incomeLabels: Partial<Record<LedgerCategory, string>> = {
  boxOffice: 'Theatrical / box-office share',
  streaming: 'Streaming and platform revenue',
  otherIncome: 'Other operating income',
  lending: 'Lending income',
  investmentReturn: 'Investment returns',
}

const expenseLabels: Partial<Record<LedgerCategory, string>> = {
  production: 'Production costs',
  marketing: 'Marketing and distribution',
  scripts: 'Scripts and development',
  talent: 'Talent costs',
  managerSalary: 'Manager salaries',
  operatingCost: 'Operating and event costs',
  loanInterest: 'Finance costs / loan interest',
}

export function Reports({ state }: { state: GameState }) {
  const [view, setView] = useState<ReportView>('overview')
  const [rangeChoice, setRangeChoice] = useState<RangeChoice>('all')
  const range = useMemo<ReportRange>(() => {
    if (rangeChoice === 'week') return { startWeek: state.week, endWeek: state.week }
    if (rangeChoice === 'year') return { startWeek: Math.max(0, state.week - 52), endWeek: state.week }
    return { startWeek: 0, endWeek: state.week }
  }, [rangeChoice, state.week])
  const report = useMemo(() => calculateReports(state, range), [state, range])

  return (
    <div className="reports-page">
      <div className="reports-heading">
        <div>
          <span className="eyebrow">Finance desk · ICAI-inspired game statements</span>
          <h1>Studio reports</h1>
          <p className="muted small">A clear view of performance, position, and cash movement. Losses stay visible.</p>
        </div>
        <div className="reports-range" role="group" aria-label="Report period">
          {([
            ['week', 'This week'],
            ['year', 'Financial year'],
            ['all', 'All time'],
          ] as const).map(([id, label]) => (
            <button key={id} className={`report-range-btn${rangeChoice === id ? ' active' : ''}`} onClick={() => setRangeChoice(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="report-tabs" role="tablist" aria-label="Financial statements">
        <ReportTab active={view === 'overview'} onClick={() => setView('overview')} label="Financial overview" detail="Trend + cash" />
        <ReportTab active={view === 'balanceSheet'} onClick={() => setView('balanceSheet')} label="Balance sheet" detail="Position today" />
        <ReportTab active={view === 'profitAndLoss'} onClick={() => setView('profitAndLoss')} label="Income & expenditure" detail="Profit / loss" />
      </div>

      {view === 'overview' && <Overview report={report.overview} />}
      {view === 'balanceSheet' && <BalanceSheet state={state} report={report.balanceSheet} />}
      {view === 'profitAndLoss' && <ProfitAndLoss range={range} report={report.profitAndLoss} />}
    </div>
  )
}

function ReportTab({ active, onClick, label, detail }: { active: boolean; onClick: () => void; label: string; detail: string }) {
  return (
    <button className={`report-tab${active ? ' active' : ''}`} role="tab" aria-selected={active} onClick={onClick}>
      <strong>{label}</strong>
      <span>{detail}</span>
    </button>
  )
}

function Overview({ report }: { report: { points: ReportPoint[]; totals: { income: number; expenses: number; netProfit: number; cash: number } } }) {
  return (
    <>
      <div className="row stats-row reports-stats">
        <Stat label="Income" value={fmtMoney(report.totals.income)} />
        <Stat label="Expenditure" value={fmtMoney(report.totals.expenses)} />
        <Stat label="Net profit / (loss)" value={<Amount value={report.totals.netProfit} />} />
        <Stat label="Cash at period end" value={<Amount value={report.totals.cash} />} />
      </div>
      <Card title="Financial movement" right={<span className="muted">Week-by-week · zero line included</span>}>
        <FinancialChart points={report.points} />
        <div className="chart-legend">
          <span><i className="legend-dot income" />Income</span>
          <span><i className="legend-dot expense" />Expenditure</span>
          <span><i className="legend-dot profit" />Profit / loss</span>
          <span><i className="legend-dot cash" />Cash</span>
        </div>
      </Card>
    </>
  )
}

function FinancialChart({ points }: { points: ReportPoint[] }) {
  if (points.length === 0) return <div className="empty report-empty">No financial activity in this period.</div>
  const width = 760
  const height = 250
  const values = points.flatMap((p) => [p.income, p.expenses, p.netProfit, p.cash])
  const max = Math.max(1, ...values)
  const min = Math.min(0, ...values)
  const span = max - min || 1
  const x = (i: number) => points.length === 1 ? width / 2 : (i / (points.length - 1)) * (width - 24) + 12
  const y = (value: number) => height - 20 - ((value - min) / span) * (height - 36)
  const line = (key: keyof Pick<ReportPoint, 'income' | 'expenses' | 'netProfit' | 'cash'>) =>
    points.map((point, i) => `${x(i)},${y(point[key])}`).join(' ')
  const zeroY = y(0)
  return (
    <div className="finance-chart-wrap">
      <svg className="finance-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Income, expenditure, profit and cash trend">
        <line x1="0" x2={width} y1={zeroY} y2={zeroY} className="chart-zero" />
        <polyline points={line('income')} className="chart-line chart-income" />
        <polyline points={line('expenses')} className="chart-line chart-expense" />
        <polyline points={line('netProfit')} className="chart-line chart-profit" />
        <polyline points={line('cash')} className="chart-line chart-cash" />
        <text x="6" y={Math.max(12, zeroY - 5)} className="chart-axis-label">0</text>
        <text x="6" y="13" className="chart-axis-label">{fmtMoney(max)}</text>
        <text x="6" y={height - 23} className="chart-axis-label">{fmtMoney(min)}</text>
      </svg>
      <div className="chart-axis-foot"><span>W{points[0].week}</span><span>W{points[points.length - 1].week}</span></div>
    </div>
  )
}

function BalanceSheet({ state, report }: { state: GameState; report: ReturnType<typeof calculateReports>['balanceSheet'] }) {
  const balanced = Math.abs(report.balanceCheck) < 0.01
  return (
    <Card title={`Balance sheet · ${state.studioName}`} right={<span className="muted">As at week {report.asOfWeek}</span>}>
      <div className="statement-grid">
        <StatementSection title="Assets" rows={[
          ['Cash and cash equivalents', report.assets.cash],
          ['Film / content work in progress', report.assets.workInProgress],
          ['Released content balance', report.assets.releasedContent],
          ['Loans receivable', report.assets.loansReceivable],
          ['Investments', report.assets.investments],
          ['Other current assets', report.assets.other],
        ]} total={report.totalAssets} />
        <StatementSection title="Liabilities" rows={[
          ['Borrowed loans outstanding', report.liabilities.borrowedLoans],
          ['Other obligations', report.liabilities.other],
        ]} total={report.totalLiabilities} />
        <StatementSection title="Equity" rows={[
          ['Opening studio capital', report.equity.openingCapital],
          ['Retained earnings', report.equity.retainedEarnings],
          ['Current period profit / (loss)', report.equity.currentPeriodProfit],
        ]} total={report.totalEquity} />
      </div>
      <div className={`balance-check ${balanced ? 'balanced' : 'unbalanced'}`}>
        <span>{balanced ? '✓ Balance check' : '! Balance check needs review'}</span>
        <strong>{fmtMoney(report.balanceCheck)}</strong>
      </div>
    </Card>
  )
}

function StatementSection({ title, rows, total }: { title: string; rows: [string, number][]; total: number }) {
  return (
    <section className="statement-section">
      <h2>{title}</h2>
      {rows.map(([label, value]) => <div className="statement-row" key={label}><span>{label}</span><Amount value={value} /></div>)}
      <div className="statement-total"><span>Total {title}</span><Amount value={total} /></div>
    </section>
  )
}

function ProfitAndLoss({ range, report }: { range: ReportRange; report: ReturnType<typeof calculateReports>['profitAndLoss'] }) {
  return (
    <Card title="Income & expenditure statement" right={<span className="muted">Weeks {range.startWeek}–{range.endWeek}</span>}>
      <div className="pnl-columns">
        <PnlSection title="Income" labels={incomeLabels} values={report.income} total={report.totalIncome} />
        <PnlSection title="Expenditure" labels={expenseLabels} values={report.expenses} total={report.totalExpenses} />
      </div>
      <div className={`pnl-result ${report.netProfit < 0 ? 'negative' : ''}`}>
        <span>Net profit / (loss)</span><strong><Amount value={report.netProfit} /></strong>
      </div>
    </Card>
  )
}

function PnlSection({ title, labels, values, total }: { title: string; labels: Partial<Record<LedgerCategory, string>>; values: Partial<Record<LedgerCategory, number>>; total: number }) {
  return (
    <section className="pnl-section">
      <h2>{title}</h2>
      {Object.entries(labels).map(([category, label]) => {
        const value = values[category as LedgerCategory] ?? 0
        return <div className="statement-row" key={category}><span>{label}</span><Amount value={value} /></div>
      })}
      <div className="statement-total"><span>Total {title}</span><Amount value={total} /></div>
    </section>
  )
}

function Amount({ value }: { value: number }) {
  return <span className={value < 0 ? 'amount negative' : 'amount'}>{fmtMoney(value)}</span>
}
