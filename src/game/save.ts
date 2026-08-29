import type { GameState, Loan } from './types'

const KEY = 'box-office-tycoon-save-v1'
const CURRENT_VERSION = 2

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
    // migrate v1 saves -> v2 (loans & investments were added)
    if (!Array.isArray(parsed.loans)) parsed.loans = []
    if (!Array.isArray(parsed.investments)) parsed.investments = []
    // migrate saves without hired managers
    if (!Array.isArray(parsed.managers)) parsed.managers = []
    if (typeof parsed.nextManagerIdx !== 'number') parsed.nextManagerIdx = 0
    if (!Array.isArray(parsed.managerProductions)) parsed.managerProductions = []
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
    if (!Array.isArray(parsed.stats.boxOfficeRecords)) parsed.stats.boxOfficeRecords = []
    if (!Array.isArray(parsed.stats.achievements)) parsed.stats.achievements = []
    if (typeof parsed.stats.streamingReleases !== 'number') parsed.stats.streamingReleases = 0
    if (typeof parsed.stats.awardsCampaigns !== 'number') parsed.stats.awardsCampaigns = 0
    if (typeof parsed.stats.merchandiseEarned !== 'number') parsed.stats.merchandiseEarned = 0
    if (typeof parsed.stats.soundtrackEarned !== 'number') parsed.stats.soundtrackEarned = 0
    if (typeof parsed.stats.commentaryAdded !== 'number') parsed.stats.commentaryAdded = 0
    if (typeof parsed.stats.internationalDeals !== 'number') parsed.stats.internationalDeals = 0
    if (typeof parsed.stats.totalMerchandise !== 'number') parsed.stats.totalMerchandise = 0
    if (typeof parsed.stats.totalSoundtrack !== 'number') parsed.stats.totalSoundtrack = 0
    if (!Array.isArray(parsed.randomEvents)) parsed.randomEvents = []
    if (parsed.activeEvent === undefined) parsed.activeEvent = null
    if (!Array.isArray(parsed.genreTrends)) parsed.genreTrends = []
    if (!Array.isArray(parsed.awardsCampaigns)) parsed.awardsCampaigns = []
    if (!Array.isArray(parsed.talentRivalries)) parsed.talentRivalries = []
    if (!Array.isArray(parsed.merchandiseDeals)) parsed.merchandiseDeals = []
    if (!Array.isArray(parsed.directorCommentaries)) parsed.directorCommentaries = []
    if (typeof parsed.streamingPlatform !== 'boolean') parsed.streamingPlatform = false
    if (typeof parsed.internationalMarkets !== 'boolean') parsed.internationalMarkets = false
    if (typeof parsed.lastEventWeek !== 'number') parsed.lastEventWeek = 0
    // migrate movies with new fields
    for (const m of [...parsed.movies, ...parsed.aiMovies]) {
      if (!m.releaseWindow) m.releaseWindow = 'theatrical'
      if (typeof m.streamingRevenue !== 'number') m.streamingRevenue = 0
      if (typeof m.merchandiseRevenue !== 'number') m.merchandiseRevenue = 0
      if (typeof m.soundtrackRevenue !== 'number') m.soundtrackRevenue = 0
      if (typeof m.commentaryActive !== 'boolean') m.commentaryActive = false
      if (typeof m.awardsCampaignActive !== 'boolean') m.awardsCampaignActive = false
      if (typeof m.awardsBuzz !== 'number') m.awardsBuzz = 0
      if (typeof m.hasMerchandise !== 'boolean') m.hasMerchandise = false
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
