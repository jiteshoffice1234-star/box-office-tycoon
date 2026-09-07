import { useState, useMemo } from 'react'
import type { GameState } from '../game/types'
import {
  createStreamingPlatform, setPlatformPrice, releaseOnPlatform, removeFromPlatform,
  toggleAdTier, setAdsPerMovie, setAdRateCard, setAdFreePrice, acceptAdDeal, pendingAdDeals,
  setAutoRelease, setAutoReleaseDelay,
} from '../game/engine'
import { Btn, Card, fmtMoney } from './ui'

export function Marketing({ state, apply }: { state: GameState; apply: (fn: (s: GameState) => GameState) => void }) {
  const [platformName, setPlatformName] = useState('')
  const [platformPrice, setPlatformPriceVal] = useState(9.99)
  const [adFreePrice, setAdFreePriceVal] = useState(state.myStreamingPlatform.adFreePrice || 10)

  const platform = state.myStreamingPlatform
  const pendingDeals = pendingAdDeals(state)

  // Available content to release (group series/shows)
  const availableContent = useMemo(() => {
    const raw = state.movies.filter(m =>
      m.finished && m.quality >= 40 && !platform.contentLibrary.some(c => c.movieId === m.id)
    )
    const groups = new Map<string, typeof raw[0]>()
    for (const m of raw) {
      if (m.contentType === 'series' || m.contentType === 'show') {
        const key = m.franchiseName || m.title.replace(/Part \d+\s*/, '').replace(/ — Season \d+$/, '')
        if (!groups.has(key) || m.releaseWeek > groups.get(key)!.releaseWeek) {
          groups.set(key, m)
        }
      } else {
        groups.set(m.id, m)
      }
    }
    return Array.from(groups.values()).sort((a, b) => b.releaseWeek - a.releaseWeek)
  }, [state.movies, platform.contentLibrary])

  // Stats
  const avgLibQuality = platform.contentLibrary.length > 0
    ? Math.round(platform.contentLibrary.reduce((s, c) => s + c.quality, 0) / platform.contentLibrary.length)
    : 0
  const totalViews = platform.contentLibrary.reduce((s, c) => s + c.viewsPerWeek, 0)
  const monthlyRevenue = platform.weeklyRevenue * 4
  const annualRevenue = platform.weeklyRevenue * 52
  const activeDeals = platform.adDeals.filter(d => d.weeksRemaining > 0)
  const weeklyDealIncome = activeDeals.reduce((s, d) => s + d.weeklyPayment, 0)
  const adFreeMonthly = platform.adFreeSubscribers * platform.adFreePrice * 4

  // Content by type
  const movies = platform.contentLibrary.filter(c => c.contentType === 'movie')
  const series = platform.contentLibrary.filter(c => c.contentType === 'series')
  const shows = platform.contentLibrary.filter(c => c.contentType === 'show')

  // Launch screen if no platform yet
  if (!state.streamingPlatform) {
    return (
      <div className="grid">
        <Card title="📡 Launch Your Streaming Platform" right={<span className="muted">Build your own Netflix</span>}>
          <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
            Create your own streaming service. Release your movies and shows there for guaranteed weekly income.
            More content = more subscribers. Quality matters.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            <div style={{ textAlign: 'center', padding: 10, background: 'var(--slate)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gold)' }}>100</div>
              <div style={{ fontSize: 10, color: 'var(--ink-soft)' }}>Starting Subs</div>
            </div>
            <div style={{ textAlign: 'center', padding: 10, background: 'var(--slate)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green-bright)' }}>$9.99</div>
              <div style={{ fontSize: 10, color: 'var(--ink-soft)' }}>/week per sub</div>
            </div>
            <div style={{ textAlign: 'center', padding: 10, background: 'var(--slate)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--blue-bright)' }}>~$1K</div>
              <div style={{ fontSize: 10, color: 'var(--ink-soft)' }}>Week 1 revenue</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <input
              type="text"
              className="input"
              placeholder="Platform name (e.g. MyFlix, AuroraStream)"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              style={{ flex: 1 }}
            />
            <Btn kind="primary" onClick={() => apply((s) => createStreamingPlatform(s, platformName || 'My Stream'))}>
              🚀 Launch Platform
            </Btn>
          </div>
        </Card>
      </div>
    )
  }

  // Platform dashboard
  return (
    <div className="grid">
      {/* Platform Header */}
      <Card title={`📡 ${platform.name}`} right={<span className={platform.active ? 'good' : 'bad'}>{platform.active ? '🟢 LIVE' : '🔴 OFF'}</span>}>
        {/* Key Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
          <StatBox label="Subscribers" value={platform.subscribers.toLocaleString()} color="var(--gold)" />
          <StatBox label="Weekly Revenue" value={fmtMoney(platform.weeklyRevenue)} color="var(--green-bright)" />
          <StatBox label="Content" value={`${platform.contentLibrary.length} titles`} color="var(--blue-bright)" />
          <StatBox label="Avg Quality" value={`${avgLibQuality}q`} color="var(--gold)" />
        </div>

        {/* Revenue Breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
          <MiniStat label="Per Week" value={fmtMoney(platform.weeklyRevenue)} />
          <MiniStat label="Per Month" value={fmtMoney(monthlyRevenue)} />
          <MiniStat label="Per Year" value={fmtMoney(annualRevenue)} />
          <MiniStat label="All Time" value={fmtMoney(platform.totalRevenue)} />
        </div>

        {/* Price Control */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>💰 Subscription Price:</span>
          <input
            type="number"
            className="input"
            value={platformPrice}
            onChange={(e) => setPlatformPriceVal(Number(e.target.value))}
            style={{ width: 80 }}
            min={1}
            step={0.5}
          />
          <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>/week per subscriber</span>
          <Btn small onClick={() => apply((s) => setPlatformPrice(s, platformPrice))}>Set Price</Btn>
        </div>

        {/* Platform Health */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 8 }}>
          <div style={{ textAlign: 'center', padding: 6, background: 'var(--slate)', borderRadius: 6, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green-bright)' }}>{platform.maxSubscribers.toLocaleString()}</div>
            <div style={{ fontSize: 9, color: 'var(--ink-muted)' }}>MAX SUBS POTENTIAL</div>
          </div>
          <div style={{ textAlign: 'center', padding: 6, background: 'var(--slate)', borderRadius: 6, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)' }}>{Math.round(subGrowthRate(platform))}%</div>
            <div style={{ fontSize: 9, color: 'var(--ink-muted)' }}>GROWTH RATE</div>
          </div>
          <div style={{ textAlign: 'center', padding: 6, background: 'var(--slate)', borderRadius: 6, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue-bright)' }}>{totalViews.toLocaleString()}</div>
            <div style={{ fontSize: 9, color: 'var(--ink-muted)' }}>VIEWS / WEEK</div>
          </div>
        </div>
      </Card>

      {/* ===== AD-SUPPORTED FREE TIER ===== */}
      <Card
        title="🆓 FREE AD-SUPPORTED TIER"
        right={
          <Btn small kind={platform.adTierEnabled ? 'danger' : 'primary'} onClick={() => apply((s) => toggleAdTier(s, !platform.adTierEnabled))}>
            {platform.adTierEnabled ? 'Disable Free Tier' : 'Enable Free Tier'}
          </Btn>
        }
      >
        <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
          Anyone can watch your content <b>free</b> — they pay nothing. You show them ads and charge advertisers.
          More ads per movie = more money per view, but too many drives viewers away. Heavy ad load pushes viewers to buy the ad-free tier.
        </div>

        {!platform.adTierEnabled ? (
          <div className="empty"><p>Free tier is off. Enable it to open your platform to everyone and start earning ad money.</p></div>
        ) : (
          <>
            {/* Audience stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
              <StatBox label="Free Viewers" value={platform.freeViewers.toLocaleString()} color="var(--blue-bright)" />
              <StatBox label="Ads / Week" value={platform.adsShownLastWeek.toLocaleString()} color="var(--amber)" />
              <StatBox label="Ad Revenue / Wk" value={fmtMoney(platform.weeklyAdRevenue + weeklyDealIncome)} color="var(--green-bright)" />
              <StatBox label="Lifetime Ad $" value={fmtMoney(platform.totalAdRevenue)} color="var(--gold)" />
            </div>

            {/* Ad load control */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>📢 Ads per movie:</span>
              <input
                type="range"
                min={0}
                max={40}
                value={platform.adsPerMovie}
                onChange={(e) => apply((s) => setAdsPerMovie(s, Number(e.target.value)))}
                style={{ flex: 1, minWidth: 140 }}
              />
              <span style={{
                fontFamily: 'var(--font-data)', fontSize: 13, fontWeight: 700,
                color: platform.adsPerMovie <= 10 ? 'var(--green-bright)' : platform.adsPerMovie <= 20 ? 'var(--amber)' : 'var(--red)',
              }}>
                {platform.adsPerMovie}
              </span>
            </div>
            {platform.adsPerMovie > 10 && (
              <div className="hint" style={{ marginBottom: 8 }}>
                ⚠️ Over 10 ads per movie: viewers start leaving ({Math.round((platform.adsPerMovie - 10) * 0.4)}% extra churn/week) — but more upgrade to ad-free.
              </div>
            )}

            {/* Rate card */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>💵 Ad rate card:</span>
              <input
                type="number"
                step={0.1}
                min={0.5}
                max={20}
                value={platform.adRateCard}
                onChange={(e) => apply((s) => setAdRateCard(s, Number(e.target.value)))}
                style={{ width: 70 }}
              />
              <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>× standard CPM (0.5–20×). Higher = advertisers pay more per view.</span>
            </div>

            {/* Ad-free tier pricing */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>⭐ Ad-free tier:</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--green-bright)', fontFamily: 'var(--font-data)' }}>
                ${adFreePrice.toFixed(2)}
              </span>
              <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>/week — pay to skip all ads</span>
              <input
                type="number"
                step={0.5}
                min={1}
                max={100}
                value={adFreePrice}
                onChange={(e) => setAdFreePriceVal(Number(e.target.value))}
                style={{ width: 70 }}
              />
              <Btn small onClick={() => apply((s) => setAdFreePrice(s, adFreePrice))}>Set Price</Btn>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 6 }}>
              <MiniStat label="Ad-Free Subs" value={platform.adFreeSubscribers.toLocaleString()} />
              <MiniStat label="Ad-Free / Month" value={fmtMoney(adFreeMonthly)} />
              <MiniStat label="Ad-Free Lifetime" value={fmtMoney(platform.totalSubRevenue)} />
            </div>
          </>
        )}
      </Card>

      {/* ===== ADVERTISER DEALS ===== */}
      {platform.adTierEnabled && (
        <Card title="🤝 ADVERTISER DEALS" right={<span className="muted">{activeDeals.length} active</span>}>
          {weeklyDealIncome > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
              <MiniStat label="Deal Income / Wk" value={fmtMoney(weeklyDealIncome)} />
              <MiniStat label="Deal Income / Month" value={fmtMoney(weeklyDealIncome * 4)} />
              <MiniStat label="Deal Income / Year" value={fmtMoney(weeklyDealIncome * 52)} />
            </div>
          )}

          {/* Active deals */}
          {activeDeals.length > 0 && (
            <div className="list" style={{ marginBottom: 10 }}>
              {activeDeals.map(d => (
                <div key={d.id} className="row-item" style={{ borderLeft: `3px solid ${d.breached ? 'var(--red)' : 'var(--green)'}` }}>
                  <div>
                    <div className="item-title">
                      {d.company}
                      {d.movieTitle && <span style={{ color: 'var(--gold)', fontSize: 11, marginLeft: 6 }}>on "{d.movieTitle}"</span>}
                    </div>
                    <div className="item-sub">
                      {fmtMoney(d.weeklyPayment)}/week · +{d.cpmBonus.toFixed(2)} per-ad bonus · {d.weeksRemaining > 100 ? `${Math.round(d.weeksRemaining / 52)}y ${d.weeksRemaining % 52}w left` : `${d.weeksRemaining}w left`}
                      {d.breached && <span style={{ color: 'var(--red)', fontWeight: 700 }}> · ⚠️ AUDIENCE TOO LOW</span>}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--ink-muted)' }}>
                    min {d.minViewers.toLocaleString()} viewers
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pending offers */}
          {pendingDeals.length > 0 ? (
            <div className="list">
              {pendingDeals.map(d => (
                <div key={d.id} className="row-item" style={{ borderLeft: '3px solid var(--gold)' }}>
                  <div>
                    <div className="item-title">
                      {d.company} wants in
                      {d.movieTitle && <span style={{ color: 'var(--gold)', fontSize: 11, marginLeft: 6 }}>on "{d.movieTitle}"</span>}
                    </div>
                    <div className="item-sub">
                      {fmtMoney(d.weeklyPayment)}/week · +{d.cpmBonus.toFixed(2)} per-ad · requires {d.minViewers.toLocaleString()}+ viewers · 30 years
                    </div>
                  </div>
                  <Btn small kind="primary" onClick={() => apply((s) => acceptAdDeal(s, d.id))}>
                    🤝 Sign Deal
                  </Btn>
                </div>
              ))}
            </div>
          ) : (
            activeDeals.length === 0 && (
              <div className="empty"><p>No advertiser offers yet. Grow your free audience past 10K viewers and companies will come knocking.</p></div>
            )
          )}
        </Card>
      )}

      {/* Content Library */}
      <Card title="📚 Your Library" right={<span className="muted">{platform.contentLibrary.length} titles</span>}>
        {platform.contentLibrary.length === 0 ? (
          <div className="empty">
            <p>No content yet. Release movies and shows on your platform to attract subscribers.</p>
          </div>
        ) : (
          <>
            {/* Content Summary */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 11, color: 'var(--ink-soft)' }}>
              {movies.length > 0 && <span>🎬 {movies.length} movies</span>}
              {series.length > 0 && <span>📺 {series.length} series</span>}
              {shows.length > 0 && <span>📡 {shows.length} shows</span>}
              <span style={{ marginLeft: 'auto', color: 'var(--gold)' }}>Total views: {totalViews.toLocaleString()}/wk</span>
            </div>

            {/* Content List */}
            <div className="list">
              {platform.contentLibrary
                .sort((a, b) => b.viewsPerWeek - a.viewsPerWeek)
                .map(c => {
                  const icon = c.contentType === 'movie' ? '🎬' : c.contentType === 'series' ? '📺' : '📡'
                  const drawPct = totalSubDrawOf(platform) > 0 ? Math.round((c.subscriberDraw / totalSubDrawOf(platform)) * 100) : 0
                  return (
                    <div key={c.movieId} className="row-item" style={{ borderLeft: `3px solid ${c.quality >= 80 ? 'var(--green)' : c.quality >= 60 ? 'var(--gold)' : 'var(--red)'}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="item-title">{icon} {c.title}</div>
                        <div className="item-sub">
                          {c.genre} · q{c.quality} · {c.viewsPerWeek.toLocaleString()} views/wk · +{c.subscriberDraw.toLocaleString()} subs ({drawPct}%)
                          {c.seasons > 0 && ` · ${c.seasons} seasons`}
                        </div>
                        {/* View bar */}
                        <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, (c.viewsPerWeek / (totalViews || 1)) * 100 * 3)}%`,
                            background: c.quality >= 80 ? 'var(--green)' : c.quality >= 60 ? 'var(--gold)' : 'var(--red)',
                            borderRadius: 2
                          }} />
                        </div>
                      </div>
                      <Btn small kind="danger" onClick={() => apply((s) => removeFromPlatform(s, c.movieId))}>
                        Remove
                      </Btn>
                    </div>
                  )
                })}
            </div>
          </>
        )}
      </Card>

      {/* ===== AUTO-RELEASE PIPELINE ===== */}
      <Card
        title="📺 AUTO-RELEASE PIPELINE"
        right={
          <Btn small kind={platform.autoRelease ? 'danger' : 'primary'} onClick={() => apply((s) => setAutoRelease(s, !platform.autoRelease))}>
            {platform.autoRelease ? 'Turn Off' : 'Turn On'}
          </Btn>
        }
      >
        <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
          Every movie, series, and show your studio releases lands on the platform <b>automatically</b> —
          free for viewers (with ads if the free tier is on, subscription-only otherwise). No clicking, no waiting lists.
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>⏱ Arrival delay:</span>
          <input
            type="range"
            min={0}
            max={52}
            value={platform.autoReleaseDelay}
            onChange={(e) => apply((s) => setAutoReleaseDelay(s, Number(e.target.value)))}
            style={{ flex: 1, minWidth: 140 }}
          />
          <span style={{ fontFamily: 'var(--font-data)', fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>
            {platform.autoReleaseDelay}w
          </span>
          <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>after theatrical release (0 = day-one streaming)</span>
        </div>
        {platform.autoRelease && availableContent.length > 0 && (
          <div className="hint" style={{ marginTop: 6 }}>
            {availableContent.length} recent title{availableContent.length > 1 ? 's' : ''} not yet on the platform — arriving in ≤{platform.autoReleaseDelay} weeks.
          </div>
        )}

        {/* Early release: skip the queue for a fee */}
        {availableContent.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ⚡ Release early (skip the queue)
            </div>
            <div className="list" style={{ maxHeight: 220, overflowY: 'auto' }}>
              {availableContent.slice(0, 12).map(m => {
                const isSeries = m.contentType === 'series' || m.contentType === 'show'
                const displayName = isSeries ? (m.franchiseName || m.title.replace(/Part \d+\s*/, '').replace(/ — Season \d+$/, '')) : m.title
                const icon = m.contentType === 'series' ? '📺' : m.contentType === 'show' ? '📡' : '🎬'
                return (
                  <div key={m.id} className="row-item" style={isSeries ? { borderLeft: '3px solid var(--blue)' } : undefined}>
                    <div>
                      <div className="item-title">{icon} {displayName}</div>
                      <div className="item-sub">
                        {m.genre} · Quality {m.quality} · {isSeries ? (m.contentType === 'series' ? 'Series' : 'Show') : 'Film'}
                      </div>
                    </div>
                    <Btn small kind="primary" onClick={() => apply((s) => releaseOnPlatform(s, m.id))}>
                      ⚡ Release Now
                    </Btn>
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

// Helpers shared with engine math (display only)
function subGrowthRate(p: GameState['myStreamingPlatform']): number {
  if (p.contentLibrary.length === 0) return 0
  const avgQ = p.contentLibrary.reduce((s, c) => s + c.quality, 0) / p.contentLibrary.length
  return Math.min(100, p.contentLibrary.length * 8 + avgQ * 0.3)
}

function totalSubDrawOf(p: GameState['myStreamingPlatform']): number {
  return p.contentLibrary.reduce((s, c) => s + c.subscriberDraw, 0)
}

// Helper components
function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 8, background: 'var(--slate)', borderRadius: 8, border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: 'var(--font-display)' }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 4, background: 'var(--slate-light)', borderRadius: 4 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-data)' }}>{value}</div>
      <div style={{ fontSize: 8, color: 'var(--ink-muted)' }}>{label}</div>
    </div>
  )
}
