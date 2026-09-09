import { createOpeningLedger } from './reports'
import type { GameState, LedgerEntry, Loan } from './types'

const KEY = 'box-office-tycoon-save-v1'
const CURRENT_VERSION = 3

export function saveGame(s: GameState): void {
  try {
    const slim = { ...s, log: s.log.slice(0, 30) }
    localStorage.setItem(KEY, JSON.stringify(slim))
  } catch {
    // storage full or unavailable — ignore
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GameState
    if (
      typeof parsed.studioName !== 'string' ||
      typeof parsed.week !== 'number' ||
      !Array.isArray(parsed.movies) ||
      !Array.isArray(parsed.talents)
    ) {
      return null
    }
    // Older and partially written saves may omit newer top-level collections.
    // Fill those before feature migrations so a recoverable save is not thrown away.
    if (!Array.isArray(parsed.scripts)) parsed.scripts = []
    if (!Array.isArray(parsed.market)) parsed.market = []
    if (!Array.isArray(parsed.aiMovies)) parsed.aiMovies = []
    if (!Array.isArray(parsed.aiStudios)) parsed.aiStudios = []
    if (!Array.isArray(parsed.log)) parsed.log = []
    if (!parsed.production) parsed.production = null
    if (!parsed.stats) {
      parsed.stats = {
        moviesMade: 0,
        totalEarned: 0,
        totalSpent: 0,
        blockbusters: 0,
        disasters: 0,
        seriesMade: 0,
        franchises: 0,
        streamingReleases: 0,
        internationalDeals: 0,
      }
    }
    if (typeof parsed.cash !== 'number' || !Number.isFinite(parsed.cash)) parsed.cash = 0
    if (typeof parsed.reputation !== 'number' || !Number.isFinite(parsed.reputation)) parsed.reputation = 0
    if (typeof parsed.autoAdvance !== 'boolean') parsed.autoAdvance = false
    if (typeof parsed.defaultStrategy !== 'string') parsed.defaultStrategy = 'Standard'
    if (typeof parsed.gameOver !== 'boolean') parsed.gameOver = false
    if (typeof parsed.createdAt !== 'number') parsed.createdAt = Date.now()
    // migrate v1 saves -> v2 (loans & investments were added)
    if (!Array.isArray(parsed.loans)) parsed.loans = []
    if (!Array.isArray(parsed.investments)) parsed.investments = []
    // Ledger was introduced after the original save format. Reconstruct a
    // cash-balanced opening ledger without discarding any gameplay state.
    if (!Array.isArray(parsed.ledger)) {
      const opening = parsed.cash - (parsed.stats.totalEarned || 0) + (parsed.stats.totalSpent || 0)
      parsed.ledger = createOpeningLedger(opening)
      const adjustment = parsed.cash - opening
      if (adjustment !== 0) {
        parsed.ledger.push({
          id: 'ledger-migration-adjustment',
          week: parsed.week,
          category: 'otherIncome',
          amount: adjustment,
          cashEffect: adjustment,
          classification: 'transfer',
          description: 'Legacy save balance adjustment',
        })
      }
    } else {
      parsed.ledger = parsed.ledger.filter(validLedgerEntry)
    }
    // migrate saves without hired managers
    if (!Array.isArray(parsed.managers)) parsed.managers = []
    // migrate manager content control fields
    for (const mgr of parsed.managers) {
      if (typeof mgr.contentType !== 'string') mgr.contentType = 'any'
      if (typeof mgr.franchiseName !== 'string' && mgr.franchiseName !== null) mgr.franchiseName = null
      if (typeof mgr.customLabel !== 'string' && mgr.customLabel !== null) mgr.customLabel = null
      if (typeof mgr.sequelsOnly !== 'boolean') mgr.sequelsOnly = false
      if (typeof mgr.mood !== 'number') mgr.mood = 50
      if (typeof mgr.cooldownUntil !== 'number') mgr.cooldownUntil = 0
    }

    function validLedgerEntry(entry: unknown): entry is LedgerEntry {
      if (!entry || typeof entry !== 'object') return false
      const e = entry as LedgerEntry
      return typeof e.id === 'string' && typeof e.week === 'number' && Number.isFinite(e.week)
        && typeof e.category === 'string' && typeof e.amount === 'number' && Number.isFinite(e.amount)
        && typeof e.cashEffect === 'number' && Number.isFinite(e.cashEffect)
        && typeof e.classification === 'string' && typeof e.description === 'string'
    }
    if (typeof parsed.nextManagerIdx !== 'number') parsed.nextManagerIdx = 0
    if (!Array.isArray(parsed.managerProductions)) parsed.managerProductions = []
    if (!Array.isArray(parsed.managerShows)) parsed.managerShows = []
    if (typeof parsed.playerCreditScore !== 'number') parsed.playerCreditScore = 50
    if (typeof parsed.loansRepaid !== 'number') parsed.loansRepaid = 0
    if (typeof parsed.loansDefaulted !== 'number') parsed.loansDefaulted = 0
    if (parsed.production && typeof (parsed.production as { managerId?: unknown }).managerId !== 'string') {
      ;(parsed.production as { managerId: string | null }).managerId = null
    }
    // festivals were removed — drop any leftover festival state from old saves
    delete (parsed as { festival?: unknown }).festival
    // migrate loans created before player-set terms existed
    parsed.loans = parsed.loans.map(migrateLoan)
    if (typeof parsed.stats.disasters !== 'number') parsed.stats.disasters = 0
    if (typeof parsed.stats.seriesMade !== 'number') parsed.stats.seriesMade = 0
    if (typeof parsed.stats.franchises !== 'number') parsed.stats.franchises = 0
    // migrate new feature fields
    if (typeof parsed.stats.streamingReleases !== 'number') parsed.stats.streamingReleases = 0
    if (typeof parsed.stats.internationalDeals !== 'number') parsed.stats.internationalDeals = 0
    if (!Array.isArray(parsed.randomEvents)) parsed.randomEvents = []
    if (parsed.activeEvent === undefined) parsed.activeEvent = null
    if (!Array.isArray(parsed.genreTrends)) parsed.genreTrends = []
    if (!Array.isArray(parsed.talentRivalries)) parsed.talentRivalries = []
    if (typeof parsed.streamingPlatform !== 'boolean') parsed.streamingPlatform = false
    if (!parsed.myStreamingPlatform) parsed.myStreamingPlatform = { name: 'My Streaming', active: false, subscriptionPrice: 9.99, subscribers: 0, maxSubscribers: 0, totalRevenue: 0, contentLibrary: [], weeklyRevenue: 0, adTierEnabled: false, freeViewers: 0, maxFreeViewers: 0, adsPerMovie: 6, adRevenuePerAd: 0.05, weeklyAdRevenue: 0, totalAdRevenue: 0, adsShownLastWeek: 0, adFreePrice: 10, adFreeSubscribers: 0, totalSubRevenue: 0, adDeals: [], adRateCard: 1, autoRelease: true, autoReleaseDelay: 15 }
    // migrate ad-tier fields
    if (typeof parsed.myStreamingPlatform.adTierEnabled !== 'boolean') parsed.myStreamingPlatform.adTierEnabled = false
    if (typeof parsed.myStreamingPlatform.freeViewers !== 'number') parsed.myStreamingPlatform.freeViewers = 0
    if (typeof parsed.myStreamingPlatform.maxFreeViewers !== 'number') parsed.myStreamingPlatform.maxFreeViewers = 0
    if (typeof parsed.myStreamingPlatform.adsPerMovie !== 'number') parsed.myStreamingPlatform.adsPerMovie = 6
    if (typeof parsed.myStreamingPlatform.adRevenuePerAd !== 'number') parsed.myStreamingPlatform.adRevenuePerAd = 0.05
    if (typeof parsed.myStreamingPlatform.weeklyAdRevenue !== 'number') parsed.myStreamingPlatform.weeklyAdRevenue = 0
    if (typeof parsed.myStreamingPlatform.totalAdRevenue !== 'number') parsed.myStreamingPlatform.totalAdRevenue = 0
    if (typeof parsed.myStreamingPlatform.adsShownLastWeek !== 'number') parsed.myStreamingPlatform.adsShownLastWeek = 0
    if (typeof parsed.myStreamingPlatform.adFreePrice !== 'number') parsed.myStreamingPlatform.adFreePrice = 10
    if (typeof parsed.myStreamingPlatform.adFreeSubscribers !== 'number') parsed.myStreamingPlatform.adFreeSubscribers = 0
    if (typeof parsed.myStreamingPlatform.totalSubRevenue !== 'number') parsed.myStreamingPlatform.totalSubRevenue = 0
    if (!Array.isArray(parsed.myStreamingPlatform.adDeals)) parsed.myStreamingPlatform.adDeals = []
    else {
      const seenIds = new Set<string>()
      const seenPendingIds = new Set<string>()
      parsed.myStreamingPlatform.adDeals = parsed.myStreamingPlatform.adDeals.filter((d: { company?: string; id?: string; weeksRemaining?: number; movieId?: string | null; movieTitle?: string | null }) => {
        if (!d || typeof d !== 'object') return false
        const did = d.id ?? ''
        // migrate new fields
        if (d.movieId === undefined) d.movieId = null
        if (d.movieTitle === undefined) d.movieTitle = null
        // dedupe by id only (same company can have multiple deals on different movies)
        if (seenIds.has(did)) return false
        seenIds.add(did)
        // cap pending at 8
        if (d.weeksRemaining === 0) {
          if (seenPendingIds.has(did) || seenPendingIds.size >= 8) return false
          seenPendingIds.add(did)
        }
        return true
      })
    }
    if (typeof parsed.myStreamingPlatform.adRateCard !== 'number') parsed.myStreamingPlatform.adRateCard = 1
    // Migrate old short-term deals to 30-year contracts
    // Also clean up corrupted deals from the pending offer bug
    parsed.myStreamingPlatform.adDeals = parsed.myStreamingPlatform.adDeals.filter((d: { weeksRemaining?: number }) => {
      // Remove corrupted pending deals (should be negative but were set to 1 by bug)
      if (d.weeksRemaining !== undefined && d.weeksRemaining > 0 && d.weeksRemaining < 10) {
        return false // corrupted — was a pending offer that got wrong value
      }
      return true
    })
    for (const d of parsed.myStreamingPlatform.adDeals) {
      if (d.weeksRemaining > 0 && d.weeksRemaining < 1560) {
        d.weeksRemaining = 1560 // extend signed deals to 30 years
      }
      if (d.movieId === undefined) d.movieId = null
      if (d.movieTitle === undefined) d.movieTitle = null
    }
    // Cap total deals at 50 to prevent unbounded growth from corrupted saves
    if (parsed.myStreamingPlatform.adDeals.length > 50) {
      // Keep the newest 50 deals (sorted by id which contains timestamp)
      parsed.myStreamingPlatform.adDeals = parsed.myStreamingPlatform.adDeals
        .sort((a: { id: string }, b: { id: string }) => b.id.localeCompare(a.id))
        .slice(0, 50)
    }
    if (typeof parsed.myStreamingPlatform.autoRelease !== 'boolean') parsed.myStreamingPlatform.autoRelease = true
    if (typeof parsed.myStreamingPlatform.autoReleaseDelay !== 'number') parsed.myStreamingPlatform.autoReleaseDelay = 15
    // Ensure active flag is correct: if platform was launched (streamingPlatform=true) OR has content, activate it
    if (parsed.streamingPlatform || parsed.myStreamingPlatform.contentLibrary?.length > 0 || parsed.myStreamingPlatform.subscribers > 0) {
      parsed.myStreamingPlatform.active = true
      parsed.streamingPlatform = true
    }
    // Ensure subscribers maxSubscribers is sane
    if (parsed.myStreamingPlatform.maxSubscribers < 1000 && parsed.myStreamingPlatform.contentLibrary?.length > 0) {
      parsed.myStreamingPlatform.maxSubscribers = Math.max(parsed.myStreamingPlatform.maxSubscribers, parsed.myStreamingPlatform.contentLibrary.length * 1000)
    }
    // Clamp subscription price to reasonable range
    if (typeof parsed.myStreamingPlatform.subscriptionPrice === 'number') {
      parsed.myStreamingPlatform.subscriptionPrice = Math.max(1, Math.min(50, parsed.myStreamingPlatform.subscriptionPrice))
    }
    if (typeof parsed.internationalMarkets !== 'boolean') parsed.internationalMarkets = false
    if (typeof parsed.lastEventWeek !== 'number') parsed.lastEventWeek = 0
    // migrate movies with new fields
    for (const m of [...parsed.movies, ...parsed.aiMovies]) {
      if (!m.releaseWindow) m.releaseWindow = 'theatrical'
      if (typeof m.streamingRevenue !== 'number') m.streamingRevenue = 0
      if (typeof m.internationalDeal !== 'boolean') m.internationalDeal = false
    }
    // migrate talents with new fields
    for (const t of parsed.talents) {
      if (!Array.isArray(t.rivalries)) t.rivalries = []
      if (typeof t.feuding !== 'boolean') t.feuding = false
    }
    // migrate AI studios
    for (const ai of parsed.aiStudios) {
      if (typeof ai.aggression !== 'number') ai.aggression = 0.5
      if (typeof ai.streaming !== 'boolean') ai.streaming = false
    }
    parsed.version = CURRENT_VERSION
    return parsed
  } catch {
    return null
  }
}

/** Upgrade a pre-custom-terms loan to the current shape. */
function migrateLoan(l: Loan & { weeklyPayment?: number; endWeek?: number }): Loan {
  if (typeof (l as Loan).intervalWeeks === 'number') return l as Loan
  if (l.kind === 'borrow') {
    const wp = l.weeklyPayment ?? 0
    const out = l.outstanding ?? 0
    const collections = wp > 0 ? Math.max(1, Math.ceil(out / wp)) : 1
    return {
      ...l,
      rate: 0.15,
      frequency: 'weekly',
      termValue: collections,
      intervalWeeks: 1,
      totalCollections: collections,
      collectionsDone: 0,
      installment: wp,
      nextDueWeek: (l.takenWeek ?? 0) + 1,
      received: 0,
      settled: false,
    }
  }
  return {
    ...l,
    rate: 0.12,
    frequency: 'weekly',
    termValue: 1,
    intervalWeeks: 1,
    totalCollections: 1,
    collectionsDone: 0,
    installment: 0,
    nextDueWeek: l.endWeek ?? (l.takenWeek ?? 0) + 6,
    received: 0,
    settled: false,
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
