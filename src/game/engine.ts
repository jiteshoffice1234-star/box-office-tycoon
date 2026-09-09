import { clamp, rand } from './formulas'
import {
  GENRES,
  GENRE_NAMES,
  START_CASH,
  MAX_SCRIPT_MARKET,
  TALENT_CAPS,
  MIN_MARKETING_WEEKS,
  MAX_MARKETING_WEEKS,
  MAX_FRANCHISE_PARTS,
  LOG_CAP,
  TIERS,
  STRATEGIES,
  REP_MAX,
  LOAN_TERM,
  LOAN_INTEREST,
  LEND_TERM,
  LEND_INTEREST,
  INVEST_MAX_SHARE,
  INVEST_MIN,
  MAX_LOAN_AMOUNT,
  genreMeta,
} from './data'
import {
  randomTitle,
  randomTalentName,
  sequelTitle,
  resetNameRegistry,
} from './names'
import {
  computeQuality,
  computeOpening,
  weeklyGross,
  hypeGain,
  initialHype,
  talentPrice,
  acceptChance,
  scriptPrice,
  writeScriptCost,
  deptBalance,
  productionWeeks,
  dateInfo,
  timingMultiplier,
} from './formulas'
import type {
  AiStudio,
  DepartmentAlloc,
  GameState,
  Genre,
  Investment,
  Loan,
  LoanFrequency,
  Manager,
  Movie,
  NewsItem,
  Production,
  RandomEvent,
  Role,
  Script,
  Talent,
  LedgerEntry,
} from './types'

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

let idCounter = 0
const uid = (): string => `g${++idCounter}_${Math.floor(Math.random() * 1e6)}`

function recordLedger(
  state: GameState,
  entry: Omit<LedgerEntry, 'id' | 'week'> & { week?: number },
): GameState {
  const nextId = state.nextId ?? 1
  return {
    ...state,
    nextId: nextId + 1,
    ledger: [
      ...(state.ledger ?? []),
      { ...entry, id: `ledger-${nextId}`, week: entry.week ?? state.week },
    ],
  }
}

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

const shuffled = <T,>(arr: readonly T[]): T[] => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const avg = (arr: number[]): number =>
  arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0

function addLog(s: GameState, events: string[], text: string, kind: NewsItem['kind'] = 'info'): void {
  events.push(text)
  s.log = [news(s.week, text, kind), ...s.log].slice(0, LOG_CAP)
}

function news(week: number, text: string, kind: NewsItem['kind'] = 'info'): NewsItem {
  return { week, text, kind }
}

function fameDist(): number {
  // triangular-ish centered on 50
  return Math.round(clamp(((Math.random() + Math.random() + Math.random()) / 3) * 92 + 4, 4, 96))
}

function genTalent(role: Role): Talent {
  const fame = fameDist()
  const affinity =
    role === 'director' && Math.random() < 0.35
      ? pick(GENRE_NAMES)
      : role === 'actor' && Math.random() < 0.2
        ? pick(GENRE_NAMES)
        : null
  return {
    id: uid(), name: randomTalentName(), role, fame,
    asking: talentPrice(fame, role), hiredWeek: -1, busyUntil: 0,
    genreAffinity: affinity, rivalries: [], feuding: false,
  }
}

function initialTalents(): Talent[] {
  const out: Talent[] = []
  for (let i = 0; i < 24; i++) out.push(genTalent('actor'))
  for (let i = 0; i < 14; i++) out.push(genTalent('director'))
  for (let i = 0; i < 12; i++) out.push(genTalent('writer'))
  return out
}

function genMarketScript(existingTitles: string[]): Script {
  const quality = Math.round(rand(42, 88))
  const genre = pick(GENRES).name
  return {
    id: uid(),
    title: randomTitle(existingTitles),
    genre,
    quality,
    price: scriptPrice(quality),
    source: 'market',
    contentType: 'movie',
  }
}

function initAiStudios(): AiStudio[] {
  const names = [
    'Horizon Pictures', 'Sable Entertainment', 'Ironwood Films',
    'Northgate Studios', 'Vesper Media', 'Apex Productions',
    'Crimson Wave Films', 'Pacific Rim Studios', 'Nova Entertainment',
    'Summit Global', 'Atlas Media Group', 'Zenith Pictures',
    'Pinnacle Studios', 'Eclipse Film Co', 'Titan Studios',
  ]
  return shuffled(names).slice(0, 6).map((name, i) => ({
    name, nextReleaseWeek: Math.round(rand(4, 14)) + i * 3,
    budget: rand(0.8, 4) * 1_000_000, quality: rand(45, 62),
    genre: pick(GENRES).name, aggression: rand(0.3, 0.7),
    streaming: Math.random() < 0.3,
    assets: rand(5, 50) * 1_000_000, creditScore: Math.round(rand(40, 80)),
    totalBorrowed: 0, defaults: 0,
  }))
}

export function tierForRep(rep: number) {
  let tier = TIERS[0]
  for (const t of TIERS) if (rep >= t.minRep) tier = t
  return tier
}

export function castOf(s: GameState, movie: Movie): {
  writer: Talent | null
  director: Talent | null
  actors: Talent[]
} {
  const byId = (id: string | null) => s.talents.find((t) => t.id === id) ?? null
  return {
    writer: byId(movie.writerId),
    director: byId(movie.directorId),
    actors: movie.actorIds.map(byId).filter(Boolean) as Talent[],
  }
}

export function avgActorFame(movie: Movie, s: GameState): number {
  const c = castOf(s, movie)
  return avg(c.actors.map((a) => a.fame))
}

export function resolveScript(s: GameState, scriptId: string): Script | null {
  return s.scripts.find((sc) => sc.id === scriptId) ?? null
}

export function findTalent(s: GameState, id: string): Talent | null {
  return s.talents.find((t) => t.id === id) ?? null
}

// ---------------------------------------------------------------------------
// new game
// ---------------------------------------------------------------------------

export function newGame(studioName: string, startCash: number = START_CASH): GameState {
  resetNameRegistry()
  idCounter = 0
  const cash = Math.max(100_000, Math.round(startCash))
  const market: Script[] = []
  const titles: string[] = []
  for (let i = 0; i < 8; i++) {
    const sc = genMarketScript(titles)
    titles.push(sc.title)
    market.push(sc)
  }
  return {
    version: 2,
    studioName,
    cash,
    reputation: 0,
    week: 0,
    ledger: [{
      id: 'ledger-opening',
      week: 0,
      category: 'openingCapital',
      amount: cash,
      cashEffect: cash,
      classification: 'equity',
      description: 'Opening studio capital',
    }],
    talents: initialTalents(),
    scripts: [],
    market,
    production: null,
    movies: [],
    aiMovies: [],
    aiStudios: initAiStudios(),
    log: [
      news(
        0,
        `Welcome to ${studioName}. You're starting with ${fmt(cash)} — write a script, hire talent, and make your first movie.`,
        'gold',
      ),
    ],
    nextId: 1,
    autoAdvance: false,
    defaultStrategy: 'Standard',
    gameOver: false,
    stats: { moviesMade: 0, totalEarned: 0, totalSpent: 0, blockbusters: 0, disasters: 0, seriesMade: 0, franchises: 0, streamingReleases: 0, internationalDeals: 0 },
    loans: [],
    investments: [],
    managers: [],
    nextManagerIdx: 0,
    managerProductions: [],
    managerShows: [],
    playerCreditScore: 50,
    loansRepaid: 0,
    loansDefaulted: 0,
    createdAt: Date.now(),
    randomEvents: [], activeEvent: null, genreTrends: [],
 talentRivalries: [],
    streamingPlatform: false,
    myStreamingPlatform: { name: 'My Streaming', active: false, subscriptionPrice: 9.99, subscribers: 0, maxSubscribers: 0, totalRevenue: 0, contentLibrary: [], weeklyRevenue: 0, adTierEnabled: false, freeViewers: 0, maxFreeViewers: 0, adsPerMovie: 6, adRevenuePerAd: 0.05, weeklyAdRevenue: 0, totalAdRevenue: 0, adsShownLastWeek: 0, adFreePrice: 10, adFreeSubscribers: 0, totalSubRevenue: 0, adDeals: [], adRateCard: 1, autoRelease: true, autoReleaseDelay: 15 }, internationalMarkets: false,
    lastEventWeek: 0,
  }
}

// ---------------------------------------------------------------------------
// decision / fast forward
// ---------------------------------------------------------------------------

export function decisionNeeded(s: GameState): string | null {
  if (s.production) {
    const c = castOf(s, s.production.movie)
    if (s.production.phase === 'preProduction') {
      if (!c.writer || !c.director || c.actors.length === 0) {
        return 'Hire a writer, director, and at least one actor for your next movie.'
      }
    }
    if (s.production.phase === 'marketing' && s.production.releaseWeek === null) {
      return 'Pick a release date and marketing strategy for your movie.'
    }
  }
  return null
}

export function fastForward(s: GameState): GameState {
  let cur = s
  let steps = 0
  while (steps < 12) {
    if (decisionNeeded(cur)) break
    const prevWeek = cur.week
    cur = tick(cur)
    steps++
    const released = cur.week !== prevWeek && cur.movies.some((m) => m.releaseWeek === cur.week)
    const aiReleased = cur.week !== prevWeek && cur.aiMovies.some((m) => m.releaseWeek === cur.week)
    const yearEnded = cur.week % 52 === 0 && cur.week !== prevWeek
    if (released || aiReleased || yearEnded) break
  }
  return cur
}

// ---------------------------------------------------------------------------
// weekly tick
// ---------------------------------------------------------------------------

export function tick(s: GameState): GameState {
  const events: string[] = []
  let st: GameState = {
    ...s,
    week: s.week + 1,
    log: [...s.log],
    talents: s.talents.map((t) => ({ ...t })),
    market: [...s.market],
    scripts: [...s.scripts],
    movies: s.movies.map((m) => ({ ...m, weekly: m.weekly.slice() })),
    aiMovies: s.aiMovies.map((m) => ({ ...m, weekly: m.weekly.slice() })),
    aiStudios: s.aiStudios.map((a) => ({ ...a })),
    stats: { ...s.stats },
    loans: s.loans.map((l) => ({ ...l })),
    investments: s.investments.map((i) => ({ ...i })),
  }
  const week = st.week
  const year = dateInfo(week).year

  // ---- CHAOS EVENTS (every 4-8 weeks — much more frequent!) ----
  if (st.week - st.lastEventWeek >= Math.round(rand(4, 8))) {
    const eventTypes: Array<{ type: RandomEvent['type']; titles: string[]; descs: string[]; effect: RandomEvent['effect'] }> = [
      // --- FINANCIAL CHAOS ---
      { type: 'scandal', titles: ['Stock Market Crash', 'Market Plummets', 'Recession Hits', 'Banking Crisis'], descs: ['Market value drops 30%', 'Your investments lose value', 'Investors flee entertainment', 'Credit markets freeze'], effect: 'negative' },
      { type: 'scandal', titles: ['Internal Fraud Discovered', 'Accountant Embezzles Funds', 'CEO Caught Stealing', 'Financial Records Falsified'], descs: ['Millions vanish overnight', 'Audit reveals massive losses', 'Legal fees pile up', 'Insurance premiums skyrocket'], effect: 'negative' },
      { type: 'scandal', titles: ['Money Laundering Probe', 'Tax Evasion Scandal', 'Bribery Investigation', 'Shell Company Exposed'], descs: ['Government freezes assets', 'Heavy fines imposed', 'Sponsors pull out', 'Bank accounts audited'], effect: 'negative' },
      
      // --- STUDIO CHAOS ---
      { type: 'talent_feud', titles: ['Studio Hack Leaked', 'Private Emails Exposed', 'Secret Deals Revealed', 'Internal Memo Goes Public'], descs: ['Embarrassing secrets out', 'Public trust shattered', 'Investors demand answers', 'Board calls emergency meeting'], effect: 'negative' },
      { type: 'talent_feud', titles: ['Actor Arrested', 'Director DUI Scandal', 'Producer #MeToo Accusations', 'Studio Head Resigns'], descs: ['Major PR disaster', 'Release pulled from theaters', 'Cast becomes toxic', 'Management chaos ensues'], effect: 'negative' },
      { type: 'talent_feud', titles: ['Co-Stars Public Feud', 'Director vs Studio', 'Actor Demands Reshoots', 'Cast Walks Out', 'Talent Union Backlash', 'Pay Equity Scandal', 'Actor Exposes Low Pay', 'Director Boycotts Studio', 'Crew Strike Over Wages', 'Star Refuses Sequel Over Pay'], descs: ['Production turmoil', 'Publicity nightmare', 'Budget overruns', 'Talent refuses to work with you', 'Union files complaint', 'Press covers pay disparity', 'Social media outrage', 'Industry blacklists studio', 'Production halted', 'Franchise future in doubt'], effect: 'negative' },
      
      // --- BOX OFFICE CHAOS ---
      { type: 'strike', titles: ['Writers Strike', 'Actors Walk Out', 'Crew Union Action', 'SAG-AFTRA Strike', 'IATSE Walkout'], descs: ['Production halted indefinitely', 'Delays cost millions', 'Release pushed back', 'Studios scrambling', 'Industry paralyzed'], effect: 'negative' },
      { type: 'weather', titles: ['Hurricane Hits Coast', 'Blizzard Shuts Down', 'Heat Wave Warning', 'Earthquake Damages Studios', 'Tornado Devastation'], descs: ['Theater attendance drops 40%', 'Opening weekend delayed', 'Families stay home', 'Sets destroyed', 'Distribution halted'], effect: 'negative' },
      { type: 'rival_release', titles: ['Rival Drops Surprise Release', 'Competitor Announces Sequel', 'Studio War Escalates', 'Disney Declares War', 'Netflix Attacks'], descs: ['Box office competition intensifies', 'Audience splits between films', 'Marketing costs rise', 'Price war begins', 'Content flood drowns you'], effect: 'negative' },
      
      // --- REPUTATION CHAOS ---
      { type: 'leak', titles: ['Script Leaked Online', 'Plot Twist Revealed', 'Behind-the-Scenes Drama', 'Ending Spoiled Everywhere', 'Rotten Tomatoes Bombing'], descs: ['Piracy concerns spike', 'Audience expectations shift', 'Curiosity drives traffic', 'Fans furious about spoilers', 'Review bombing campaign'], effect: 'neutral' },
      { type: 'streaming_war', titles: ['Streaming Giant Enters', 'Platform Price War', 'Exclusive Deal Announced', 'Piracy Site Leaks Film', 'Deepfake Scandal'], descs: ['Theater chains lose leverage', 'Distribution costs rise', 'New revenue streams open', 'Opening weekend destroyed', 'AI-generated fake scenes go viral'], effect: 'neutral' },
      
      // --- POSITIVE EVENTS ---
      { type: 'viral', titles: ['Trailer Goes Viral', 'Meme Takes Over', 'Fan Campaign Explodes', 'TikTok Trend Explodes', 'Celebrity Endorsement'], descs: ['Social media buzz doubles', 'Organic marketing surge', 'Audience anticipation skyrockets', 'Gen Z discovers your film', 'Global reach achieved'], effect: 'positive' },
      { type: 'viral', titles: ['Award Season Buzz', 'Critics Rave', 'Festival Standing Ovation', 'Oscar Front-Runner', 'Golden Globe Nomination'], descs: ['Oscar buzz builds', 'Reviews overwhelmingly positive', 'Awards campaigns gain traction', 'Best Picture frontrunner', 'Awards season momentum'], effect: 'positive' },
      { type: 'viral', titles: ['Soundtrack Chart-Topper', 'Theme Park Ride Announced', 'Cultural Phenomenon', 'Nostalgia Wave'], descs: ['Brand deals flood in', 'Music revenue explodes', 'New income stream opens', 'Your movie defines the year', 'Classic status achieved'], effect: 'positive' },
      
      // --- MIXED EVENTS ---
      { type: 'leak', titles: ['AI Generates Sequel Script', 'Fan Remake Goes Viral', 'Rival Studios Merge', 'New Streaming Platform', 'Movie Theater Renaissance'], descs: ['Creative chaos ensues', 'Unexpected competition', 'Industry reshuffles', 'New distribution channel', 'Theaters making comeback'], effect: 'neutral' },
    ];
    const pick2 = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const evtDef = pick2(eventTypes);
    const evt: RandomEvent = {
      id: 'evt_' + st.week + '_' + Math.floor(Math.random() * 1e6),
      week: st.week,
      type: evtDef.type,
      title: pick2(evtDef.titles),
      description: pick2(evtDef.descs),
      effect: evtDef.effect,
      targetMovieId: null,
      magnitude: Math.round(rand(20, 90)),
      resolved: false,
    };
    st.randomEvents = [...st.randomEvents, evt].slice(-30);
    st.activeEvent = evt;
    st.lastEventWeek = st.week;
    addLog(st, events, evt.title + ' — ' + evt.description, evt.effect === 'positive' ? 'good' : evt.effect === 'negative' ? 'bad' : 'info');
    
    // --- APPLY CHAOS EFFECTS ---
    const mag = evt.magnitude
    
    // Financial events: directly hit cash
    if (evt.type === 'scandal' && evt.effect === 'negative') {
      const loss = Math.round(st.cash * rand(0.05, 0.20)) // lose 5-20% of cash
      st.cash -= loss
      st = recordLedger(st, { category: 'operatingCost', amount: loss, cashEffect: -loss, classification: 'expense', description: 'Financial event loss' })
      st.reputation = clamp(Math.round(st.reputation - rand(3, 12)), 0, 300)
      addLog(st, events, `💸 Financial damage: -${fmt(loss)} cash, -reputation`, 'bad')
    }
    
    // Talent events: hit reputation hard
    if (evt.type === 'talent_feud' && evt.effect === 'negative') {
      st.reputation = clamp(Math.round(st.reputation - rand(5, 15)), 0, 300)
    }
    
    // Strike events: halt production, lose money
    if (evt.type === 'strike' && evt.effect === 'negative') {
      const penalty = Math.round(rand(500_000, 5_000_000))
      st.cash -= penalty
      st = recordLedger(st, { category: 'operatingCost', amount: penalty, cashEffect: -penalty, classification: 'expense', description: 'Strike disruption cost' })
      st.reputation = clamp(Math.round(st.reputation - rand(3, 8)), 0, 300)
    }
    
    // Weather events: lose revenue
    if (evt.type === 'weather' && evt.effect === 'negative') {
      for (const m of st.movies.filter(m => m.phase === 'inTheaters')) {
        m.hype = clamp(m.hype - mag * 0.4, 0, 100)
      }
    }
    
    // Rival events: lose hype
    if (evt.type === 'rival_release' && evt.effect === 'negative') {
      for (const m of st.movies.filter(m => m.phase === 'inTheaters')) {
        m.hype = clamp(m.hype - mag * 0.3, 0, 100)
      }
    }
    
    // Positive events: boost hype and reputation
    if (evt.effect === 'positive') {
      st.reputation = clamp(Math.round(st.reputation + rand(2, 8)), 0, REP_MAX)
      for (const m of st.movies.filter(m => m.phase === 'inTheaters')) {
        m.hype = clamp(m.hype + mag * 0.25, 0, 100)
      }
    }
    
    // Neutral events: small random effect
    if (evt.effect === 'neutral') {
      const repChange = Math.round(rand(-3, 3))
      st.reputation = clamp(Math.round(st.reputation + repChange), 0, REP_MAX)
    }
  }

  // ---- manager salaries (weekly, for every active manager)
  for (const m of st.managers) {
    if (m.active && m.weeklySalary > 0) {
      st.cash -= m.weeklySalary
      st = recordLedger(st, { category: 'managerSalary', amount: m.weeklySalary, cashEffect: -m.weeklySalary, classification: 'expense', description: `${m.name} weekly salary` })
    }
  }

  // ---- production / marketing / release
  if (st.production) {
    const prod = { ...st.production, movie: { ...st.production.movie, weekly: [] } }
    if (prod.phase === 'production') {
      prod.weeksLeft -= 1
      if (prod.weeksLeft <= 0) {
        prod.phase = 'marketing'
        prod.releaseWeek = null
        if (prod.managerId) {
          // a hired manager books the release themselves — no decisions needed
          const mgr = st.managers.find((m) => m.id === prod.managerId)
          const releaseW = pickBestRelease(st, prod.movie.genre)
          prod.releaseWeek = releaseW
          prod.marketingStrategy = mgr ? mgr.marketingStrategy : st.defaultStrategy
          prod.movie.hype = initialHype(avgActorFame(prod.movie, st))
          prod.movie.status = `Marketing for release in ${releaseW - st.week} weeks`
          addLog(
            st,
            events,
            `📣 ${mgr ? mgr.name : 'Your manager'} booked "${prod.movie.title}" for release in ${releaseW - st.week} weeks (${prod.marketingStrategy} campaign).`,
            'info',
          )
        } else {
          addLog(st, events, `Production wrapped on "${prod.movie.title}". Time to plan the release.`, 'info')
        }
      }
    } else if (prod.phase === 'marketing') {
      const strat = STRATEGIES.find((x) => x.name === prod.marketingStrategy) ?? STRATEGIES[2]
      const spend = Math.min(st.cash, strat.pct * prod.movie.productionBudget)
      st.cash -= spend
      if (spend > 0) st = recordLedger(st, { category: 'marketing', amount: spend, cashEffect: -spend, classification: 'expense', description: `Marketing for "${prod.movie.title}"` })
      prod.movie.marketingSpent += spend
      prod.movie.cost += spend
      const gain = hypeGain(strat.pct, prod.movie.productionBudget)
      prod.movie.hype = clamp(prod.movie.hype + gain, 0, 100)
      if (prod.releaseWeek !== null && week >= prod.releaseWeek) {
        // RELEASE
        const movie = prod.movie
        const sameWeek =
          st.aiStudios.filter((a) => a.nextReleaseWeek === week).length +
          st.movies.filter((m) => m.releaseWeek === week).length
        const fame = avgActorFame(movie, st)
        movie.opening = computeOpening({
          quality: movie.quality,
          genre: movie.genre,
          avgActorFame: fame,
          hype: movie.hype,
          releaseWeek: week,
          sameWeekCompetition: sameWeek,
          franchiseBonus: 1 + 0.13 * (movie.part - 1),
          productionBudget: movie.productionBudget,
          contentType: movie.contentType || 'movie',
        })
        movie.releasedYear = year
        movie.phase = 'inTheaters'
        movie.status = 'Opening weekend'
        movie.releaseWeek = week
        st.movies = [...st.movies, movie]
        st.production = null
        st.stats.moviesMade += 1
        if (movie.contentType === 'series' || movie.contentType === 'show') st.stats.seriesMade += 1
        // disaster check: low quality + terrible opening = flop
        if (movie.quality < 30 && movie.opening < 1_000_000) {
          movie.isDisaster = true
          movie.status = 'DISASTER'
          st.stats.disasters += 1
          st.reputation = clamp(Math.round(st.reputation - 15), 0, 300)
          addLog(
            st,
            events,
            `💀 "${movie.title}" is a DISASTER — quality ${movie.quality}, opening ${fmt(movie.opening)}. Massive reputation loss.`,
            'bad',
          )
        } else {
          addLog(
            st,
            events,
            `🎬 "${movie.title}" opens to ${fmt(movie.opening)} on its opening weekend!`,
            movie.opening > 10_000_000 ? 'gold' : 'info',
          )
        }
        // franchise tracking
        if (movie.part > 1 && movie.franchiseName) {
          st.stats.franchises = Math.max(st.stats.franchises, movie.part)
        }
      }
    }
    if (st.production) st.production = prod
  }

  // ---- manager productions (each runs independently)
  {
    const nextMgrProds: Production[] = []
    for (const mprod of st.managerProductions) {
      const prod = { ...mprod, movie: { ...mprod.movie, weekly: [] } }
      if (prod.phase === 'production') {
        prod.weeksLeft -= 1
        if (prod.weeksLeft <= 0) {
          prod.phase = 'marketing'
          const mgr = st.managers.find((m) => m.id === prod.managerId)
          const releaseW = pickBestRelease(st, prod.movie.genre)
          prod.releaseWeek = releaseW
          prod.marketingStrategy = mgr ? mgr.marketingStrategy : st.defaultStrategy
          prod.movie.hype = initialHype(avgActorFame(prod.movie, st))
          prod.movie.status = `Marketing for release in ${releaseW - st.week} weeks`
          addLog(
            st,
            events,
            `📣 ${mgr ? mgr.name : 'A manager'} booked \"${prod.movie.title}\" for release in ${releaseW - st.week} weeks (${prod.marketingStrategy} campaign).`,
            'info',
          )
        }
      } else if (prod.phase === 'marketing') {
        const strat = STRATEGIES.find((x) => x.name === prod.marketingStrategy) ?? STRATEGIES[2]
        const spend = Math.min(st.cash, strat.pct * prod.movie.productionBudget)
        st.cash -= spend
        if (spend > 0) st = recordLedger(st, { category: 'marketing', amount: spend, cashEffect: -spend, classification: 'expense', description: `Marketing for "${prod.movie.title}"` })
        prod.movie.marketingSpent += spend
        prod.movie.cost += spend
        const gain = hypeGain(strat.pct, prod.movie.productionBudget)
        prod.movie.hype = clamp(prod.movie.hype + gain, 0, 100)
        if (prod.releaseWeek !== null && week >= prod.releaseWeek) {
          // RELEASE
          const movie = prod.movie
          const sameWeek =
            st.aiStudios.filter((a) => a.nextReleaseWeek === week).length +
            st.movies.filter((m) => m.releaseWeek === week).length
          const fame = avgActorFame(movie, st)
          movie.opening = computeOpening({
            quality: movie.quality,
            genre: movie.genre,
            avgActorFame: fame,
            hype: movie.hype,
            releaseWeek: week,
            sameWeekCompetition: sameWeek,
            franchiseBonus: 1 + 0.13 * (movie.part - 1),
            productionBudget: movie.productionBudget,
            contentType: movie.contentType || 'movie',
          })
          movie.releasedYear = year
          movie.phase = 'inTheaters'
          movie.status = 'Opening weekend'
          movie.releaseWeek = week
          st.movies = [...st.movies, movie]
          st.stats.moviesMade += 1
          if (movie.contentType === 'series' || movie.contentType === 'show') st.stats.seriesMade += 1
          const mgr = st.managers.find((m) => m.id === prod.managerId)
          if (mgr) mgr.moviesMade += 1
          // disaster check
          if (movie.quality < 30 && movie.opening < 1_000_000) {
            movie.isDisaster = true
            movie.status = 'DISASTER'
            st.stats.disasters += 1
            st.reputation = clamp(Math.round(st.reputation - 10), 0, 300)
            addLog(st, events, `💀 \"${movie.title}\" (manager) is a DISASTER — quality ${movie.quality}.`, 'bad')
          } else {
            addLog(
              st,
              events,
              `🎬 \"${movie.title}\" opens to ${fmt(movie.opening)} on its opening weekend!`,
              movie.opening > 10_000_000 ? 'gold' : 'info',
            )
          }
          // manager franchise: auto-sequel if hit
          if (!movie.isDisaster && mgr && movie.part < 6 && movie.opening >= movie.cost * 2.5) {
            st.stats.franchises = Math.max(st.stats.franchises, movie.part + 1)
            // Actually create the franchise sequel production
            const franchiseName = movie.franchiseName ?? movie.title
            const nextPart = movie.part + 1
            const sequelTitle = franchiseName + ' ' + ['II','III','IV','V','VI'][nextPart - 2]
            const sequelScript: Script = {
              id: uid(),
              title: sequelTitle,
              genre: movie.genre,
              quality: clamp(movie.scriptQuality - 5 + nextPart * 2, 30, 92),
              price: 0,
              source: 'written',
              contentType: movie.contentType || 'movie',
            }
            const sequelMovie: Movie = {
              id: uid(),
              title: sequelTitle,
              genre: movie.genre,
              owner: 'player',
              studioName: st.studioName,
              scriptQuality: sequelScript.quality,
              writerId: null,
              directorId: null,
              actorIds: [],
              productionBudget: 0,
              departments: { acting: 0, writing: 0, direction: 0, effects: 0, music: 0, editing: 0 },
              quality: sequelScript.quality,
              hype: 0,
              marketingSpent: 0,
              releaseWeek: 0,
              opening: 0,
              weekly: [],
              totalGross: 0,
              cost: 0,
              revenue: 0,
              contentType: movie.contentType || 'movie',
              status: 'Casting',
              franchiseName,
              part: nextPart,
              releasedYear: 0,
              finished: false,
              phase: 'preProduction',
              isDisaster: false,
              seasons: movie.seasons,
              episodesPerSeason: movie.episodesPerSeason,
              viewership: 0,
              cancelled: false,               releaseWindow: 'theatrical' as const, streamingRevenue: 0, internationalDeal: false,
            }
            // Auto-cast: writer + director + 1-2 actors
            const pickFree = (role: Role, excludeId?: string): Talent | null => {
              const free = st.talents.filter((t) => t.role === role && t.busyUntil <= st.week && t.id !== excludeId)
              if (free.length === 0) return null
              free.sort((a, b) => b.fame - a.fame)
              return free[0]
            }
            const hireSequel = (t: Talent | null): boolean => {
              if (!t) return false
              const busy = t.role === 'actor' ? Math.round(rand(6, 14)) : t.role === 'director' ? Math.round(rand(8, 16)) : Math.round(rand(4, 10))
              const hired = { ...t, hiredWeek: st.week, busyUntil: st.week + busy, asking: t.asking }
              st = recordLedger({ ...st, cash: st.cash - t.asking, talents: st.talents.map((x) => (x.id === t.id ? hired : x)) },
                { category: 'talent', amount: t.asking, cashEffect: -t.asking, classification: 'expense', description: `Manager hired ${t.name}` })
              if (t.role === 'writer') sequelMovie.writerId = t.id
              else if (t.role === 'director') sequelMovie.directorId = t.id
              else sequelMovie.actorIds = [...sequelMovie.actorIds, t.id]
              sequelMovie.cost += t.asking
              return true
            }
            const w = pickFree('writer')
            const d = pickFree('director')
            const a1 = pickFree('actor')
            const a2 = pickFree('actor', a1?.id)
            if (hireSequel(w) && hireSequel(d) && hireSequel(a1)) {
              if (a2) hireSequel(a2)
              // Fund production — no budget limit for managers
              const budget = Math.max(500_000, Math.round(mgr.maxBudget))
              const weeks = 3 // productionWeeks always returns 3
              const share = budget / 6
              const depts: DepartmentAlloc = { acting: share, writing: share, direction: share, effects: share, music: share, editing: share }
              const castLookup = {
                writer: sequelMovie.writerId ? st.talents.find((t) => t.id === sequelMovie.writerId) ?? null : null,
                director: sequelMovie.directorId ? st.talents.find((t) => t.id === sequelMovie.directorId) ?? null : null,
                actors: sequelMovie.actorIds.map((id) => st.talents.find((t) => t.id === id)).filter(Boolean) as Talent[],
              }
              const q = computeQuality({
                scriptQuality: sequelMovie.scriptQuality,
                writerFame: castLookup.writer ? castLookup.writer.fame : 0,
                directorFame: castLookup.director ? castLookup.director.fame : 0,
                directorAffinity: castLookup.director ? castLookup.director.genreAffinity : null,
                actorFames: castLookup.actors.map((a) => a.fame),
                genre: sequelMovie.genre,
                productionBudget: budget,
                deptBalance: deptBalance(depts),
              })
              st = recordLedger({ ...st, cash: st.cash - budget },
                { category: 'production', amount: budget, cashEffect: -budget, classification: 'expense', description: `Manager production budget for "${sequelMovie.title}"` })
              const sequelProd: Production = {
                movie: { ...sequelMovie, productionBudget: budget, departments: { ...depts }, quality: q, cost: sequelMovie.cost + budget, status: `Filming (${weeks} weeks)` },
                phase: 'production',
                weeksLeft: weeks,
                releaseWeek: null,
                marketingStrategy: mgr.marketingStrategy,
                managerId: mgr.id,
              }
              st = { ...st, managerProductions: [...st.managerProductions, sequelProd] }
              const contentLabel = (movie.contentType === 'series' || movie.contentType === 'show') ? (movie.contentType === 'series' ? 'TV series' : 'TV show') : 'movie'
              addLog(st, events, `🏆 \"${movie.title}\" was a hit! ${mgr.name} greenlighting ${contentLabel} franchise sequel: \"${sequelTitle}\" (Part ${nextPart}).`, 'gold')
            } else {
              // Not enough talent — log the announcement but skip production
              addLog(st, events, `🏆 \"${movie.title}\" was a hit! ${mgr.name} wants a sequel but talent pool is dry.`, 'gold')
            }
          }
          continue // released — don't carry forward
        }
      }
      nextMgrProds.push(prod)
    }
    st.managerProductions = nextMgrProds
  }

  // ---- streaming platform revenue
  st = collectStreamingRevenue(st)
  // ---- ad-supported free tier (ads, advertiser deals, ad-free upgrades)
  st = collectAdRevenue(st, events)
  // ---- auto-release finished titles to the platform N weeks after release
  st = autoReleaseToPlatform(st)

  // ---- box office runs
  for (const list of [st.movies, st.aiMovies]) {
    for (const m of list) {
      if (m.phase !== 'inTheaters' && m.phase !== 'evergreen') continue
      const i = week - m.releaseWeek
      if (i < 0) continue // not open yet
      const g = weeklyGross(m.opening, m.quality, i, m.contentType || 'movie')
      if (g <= 0) {
        // theater run ends — but quality movies go evergreen
        if (m.contentType === 'movie' && m.quality >= 70 && !m.isDisaster && m.phase !== 'evergreen') {
          m.phase = 'evergreen'
          m.status = 'Evergreen — still earning'
        } else {
          m.phase = 'done'
          m.finished = true
          m.status = 'Completed'
        }
        if (m.owner === 'player' || m.owner === 'distributed') {
          const profit = m.revenue - m.cost
          const profitRatio = m.cost > 0 ? m.totalGross / m.cost : 0
          // --- Reputation from movie performance ---
          let repChange = 0
          if (profitRatio >= 10) {
            // Mega blockbuster — big rep boost
            repChange = 15
            addLog(st, events, `🔥 "${m.title}" is a MEGA BLOCKBUSTER! +15 reputation.`, 'gold')
          } else if (profitRatio >= 3) {
            // Blockbuster — solid boost
            repChange = 8
            addLog(st, events, `💥 "${m.title}" is a BLOCKBUSTER! +8 reputation.`, 'gold')
          } else if (profitRatio >= 1) {
            // Profitable — small boost
            repChange = 3
            addLog(st, events, `"${m.title}" finished profitable: ${fmt(m.totalGross)} total, +3 reputation.`, 'good')
          } else if (profitRatio >= 0.5) {
            // Flop — lose rep
            repChange = -5
            addLog(st, events, `📉 "${m.title}" flopped — earned ${fmt(m.totalGross)} vs ${fmt(m.cost)} cost. -5 reputation.`, 'bad')
          } else if (profitRatio >= 0.1) {
            // Bad flop — lose more rep
            repChange = -8
            addLog(st, events, `💀 "${m.title}" was a bad flop — only earned ${fmt(m.totalGross)} of ${fmt(m.cost)}. -8 reputation.`, 'bad')
          } else {
            // Disaster — massive rep loss (already handled above, but reinforce)
            repChange = -12
          }
          st.reputation = clamp(Math.round(st.reputation + repChange), 0, REP_MAX)
          if (m.totalGross >= 100_000_000) st.stats.blockbusters += 1
          if (profit <= 0) {
            addLog(st, events, `"${m.title}" closed with ${fmt(m.totalGross)} total — a ${fmt(-profit)} loss.`, 'bad')
          }
        }
        // settle any player investments in this movie
        for (const inv of st.investments) {
          if (inv.movieId === m.id && !inv.settled) {
            inv.settled = true
            const profit = inv.totalReturn - inv.amount
            addLog(
              st,
              events,
              `📈 Your investment in "${m.title}" settled: ${fmt(inv.totalReturn)} returned (${profit >= 0 ? '+' : ''}${fmt(profit)}).`,
              profit >= 0 ? 'good' : 'bad',
            )
          }
        }
        continue
      }
      // evergreen movies earn a small residual each week
      if (m.phase === 'evergreen') {
        const residual = m.opening * 0.001 * (m.quality / 100) * rand(0.5, 1.5)
        if (residual > 100 && m.owner === 'player') {
          st.cash += residual
          st = recordLedger(st, { category: 'boxOffice', amount: residual, cashEffect: residual, classification: 'income', description: `Evergreen revenue from "${m.title}"` })
          st.stats.totalEarned += residual
        }
        // evergreen eventually fades (after ~2 years total)
        if (i > 120) {
          m.phase = 'done'
          m.finished = true
          m.status = 'Archived'
        }
        continue
      }
      m.weekly.push({ week, gross: g })
      m.totalGross += g
      if (m.owner === 'player') {
        const share = g * (0.55 + 0.4 * genreMeta(m.genre).intl + 0.18)
        m.revenue += share
        st.cash += share
        st = recordLedger(st, { category: 'boxOffice', amount: share, cashEffect: share, classification: 'income', description: `Box office share from "${m.title}"` })
        st.stats.totalEarned += share
      } else if (m.owner === 'distributed') {
        const share = g * 0.5
        m.revenue += share
        st.cash += share
        st = recordLedger(st, { category: 'boxOffice', amount: share, cashEffect: share, classification: 'income', description: `Distributed box office share from "${m.title}"` })
        st.stats.totalEarned += share
      } else if (m.owner === 'ai') {
        // player investment stakes earn a MASSIVE slice — up to 1000x potential
        for (const inv of st.investments) {
          if (inv.movieId === m.id && !inv.settled) {
            const baseShare = inv.amount / Math.max(m.productionBudget, 1)
            // Success multiplier: movies that earn big pay investors MUCH more
            const successRatio = m.totalGross / Math.max(m.productionBudget, 1)
            let megaMultiplier = 1
            if (successRatio >= 50) megaMultiplier = 50  // mega hit: 50x
            else if (successRatio >= 20) megaMultiplier = 20  // huge hit: 20x
            else if (successRatio >= 10) megaMultiplier = 10  // blockbuster: 10x
            else if (successRatio >= 5) megaMultiplier = 5   // hit: 5x
            else if (successRatio >= 2) megaMultiplier = 2   // profitable: 2x
            const pay = Math.round(baseShare * g * megaMultiplier)
            if (pay > 0) {
              st.cash += pay
              st = recordLedger(st, { category: 'investmentReturn', amount: pay, cashEffect: pay, classification: 'income', description: `Investment return from "${m.title}"` })
              st.stats.totalEarned += pay
              inv.totalReturn += pay
            }
          }
        }
      }
    }
  }

  // ---- loans (player-chosen rate, term, and payment schedule)
  if (st.loans.length > 0) {
    const nextLoans: Loan[] = []
    for (const loan of st.loans) {
      if (week < loan.nextDueWeek) {
        nextLoans.push(loan)
        continue
      }
      if (loan.kind === 'borrow') {
        const pay = Math.min(loan.installment, loan.outstanding)
        st.cash -= pay
        const principalPaid = Math.min(loan.principal - Math.round(loan.principal * loan.collectionsDone / loan.totalCollections), pay)
        const interestPaid = pay - principalPaid
        st = recordLedger(st, { category: 'loanRepayment', amount: principalPaid, cashEffect: -principalPaid, classification: 'transfer', description: `Loan principal repayment` })
        if (interestPaid > 0) st = recordLedger(st, { category: 'loanInterest', amount: interestPaid, cashEffect: -interestPaid, classification: 'expense', description: `Loan interest payment` })
        loan.outstanding -= pay
        loan.collectionsDone += 1
        if (loan.outstanding <= 0) {
          // Loan fully repaid — boost credit score
          st.loansRepaid = (st.loansRepaid || 0) + 1
          st.playerCreditScore = Math.min(100, (st.playerCreditScore || 50) + 5)
          addLog(st, events, `🏦 Your ${fmt(loan.principal)} loan is fully repaid. Credit score: ${st.playerCreditScore}`, 'good')
        } else {
          loan.nextDueWeek = week + loan.intervalWeeks
          nextLoans.push(loan)
        }
      } else {
        // LEND: check for default
        const studio = st.aiStudios.find(a => a.name === loan.studioName)
        const total = Math.round(loan.principal * (1 + loan.rate))
        const final = loan.collectionsDone + 1 >= loan.totalCollections
        
        // Default chance: 5% per payment if studio is struggling, lower if credit is good
        const defaultChance = studio ? Math.max(0.01, 0.05 - (studio.creditScore / 1000)) : 0.02
        if (studio && Math.random() < defaultChance && !final) {
          // STUDIO DEFAULTS! Transfer assets to player
          const assetTransfer = Math.round(studio.assets * 0.5) // get 50% of their assets
          st.cash += assetTransfer
          st = recordLedger(st, { category: 'lending', amount: assetTransfer, cashEffect: assetTransfer, classification: 'income', description: `Assets seized after ${loan.studioName} loan default` })
          st.stats.totalEarned += assetTransfer
          studio.defaults = (studio.defaults || 0) + 1
          studio.creditScore = Math.max(0, studio.creditScore - 20) // tank their credit
          loan.settled = true
          st.loansDefaulted = (st.loansDefaulted || 0) + 1
          // Player credit score drops slightly for being associated with a default
          st.playerCreditScore = Math.max(0, (st.playerCreditScore || 50) - 2)
          addLog(
            st,
            events,
            `💀 ${loan.studioName} DEFAULTED on your ${fmt(loan.principal)} loan! Seized ${fmt(assetTransfer)} in assets. Credit score: ${st.playerCreditScore}`,
            'bad',
          )
          continue
        }
        
        const pay = final ? total - loan.received : loan.installment
        st.cash += pay
        const principalReceived = Math.min(loan.principal - Math.round(loan.principal * loan.collectionsDone / loan.totalCollections), pay)
        const interestReceived = pay - principalReceived
        st = recordLedger(st, { category: 'lending', amount: principalReceived, cashEffect: principalReceived, classification: 'transfer', description: `Lending principal received from ${loan.studioName}` })
        if (interestReceived > 0) st = recordLedger(st, { category: 'otherIncome', amount: interestReceived, cashEffect: interestReceived, classification: 'income', description: `Lending interest received from ${loan.studioName}` })
        loan.received += pay
        loan.collectionsDone += 1
        if (final) {
          // Loan fully repaid — boost studio credit and player credit
          if (studio) studio.creditScore = Math.min(100, studio.creditScore + 3)
          st.playerCreditScore = Math.min(100, (st.playerCreditScore || 50) + 3)
          addLog(
            st,
            events,
            `🏦 Loan to ${loan.studioName} fully repaid: ${fmt(loan.received)} received (+${fmt(loan.received - loan.principal)}). Your credit: ${st.playerCreditScore}`,
            'good',
          )
        } else {
          loan.nextDueWeek = week + loan.intervalWeeks
          nextLoans.push(loan)
        }
      }
    }
    st.loans = nextLoans
  }

  // ---- talent availability
  // (no state change needed: availability is computed as busyUntil <= week)

  // ---- talent + market refresh every 4 weeks
  if (week % 4 === 0) {
    const addTalent = (role: Role) => {
      const cap = TALENT_CAPS[role]
      const existing = st.talents.filter((t) => t.role === role)
      if (existing.length >= cap) return
      st.talents = [...st.talents, genTalent(role)]
    }
    addTalent('actor')
    if (Math.random() < 0.7) addTalent('director')
    if (Math.random() < 0.7) addTalent('writer')
    // refresh market scripts
    const remove = Math.min(2, st.market.length)
    const keep = shuffled(st.market).slice(remove)
    const existingTitles = st.scripts.map((sc) => sc.title).concat(keep.map((sc) => sc.title))
    for (let i = 0; i < remove; i++) keep.push(genMarketScript(existingTitles))
    st.market = keep.slice(0, MAX_SCRIPT_MARKET)
  }

  // ---- AI studios
  for (const ai of st.aiStudios) {
    if (ai.nextReleaseWeek !== week) continue
    const m = makeAiMovie(ai, week)
    st.aiMovies = [...st.aiMovies, m]
    // link any player investments to the released movie
    const backed = st.investments.filter((i) => i.studioName === ai.name && i.releaseWeek === week && !i.settled)
    for (const inv of backed) {
      inv.movieId = m.id
      addLog(st, events, `📈 "${m.title}" (${ai.name}) opens — your ${fmt(inv.amount)} investment is now earning.`, 'gold')
    }
    ai.budget *= 1 + ai.quality * 0.004
    ai.quality = clamp(ai.quality + rand(-2, 4), 40, 88)
    ai.genre = pick(GENRES).name
    ai.nextReleaseWeek = week + Math.round(rand(6, 14))
    addLog(st, events, `${ai.name} releases "${m.title}" this week.`, 'info')
  }


  // ---- hired managers keep the pipeline moving
  st = managerMakeMovie(st, events)

  return st
}

function makeAiMovie(ai: AiStudio, week: number): Movie {
  const quality = Math.round(clamp(ai.quality + rand(-6, 6), 30, 88))
  const genre = ai.genre
  const title = randomTitle()
  const opening = computeOpening({
    quality,
    genre,
    avgActorFame: rand(20, 70),
    hype: rand(20, 55),
    releaseWeek: week,
    sameWeekCompetition: 0,
    franchiseBonus: 1,
    productionBudget: ai.budget,
  })
  return {
    id: uid(),
    title,
    genre,
    owner: 'ai',
    studioName: ai.name,
    scriptQuality: quality,
    writerId: null,
    directorId: null,
    actorIds: [],
    productionBudget: ai.budget,
    departments: { acting: 0, writing: 0, direction: 0, effects: 0, music: 0, editing: 0 },
    quality,
    hype: 50,
    marketingSpent: ai.budget * 0.3,
    releaseWeek: week,
    opening,
    weekly: [],
    totalGross: 0,
    cost: ai.budget * 1.3,
    revenue: 0,
    contentType: 'movie',
    status: 'Opening weekend',
    franchiseName: null,
    part: 1,
    releasedYear: dateInfo(week).year,
    finished: false,
    phase: 'inTheaters',
    isDisaster: false, seasons: 0, episodesPerSeason: 0, viewership: 0, cancelled: false, releaseWindow: 'theatrical' as const, streamingRevenue: 0, internationalDeal: false, }
}

// ---------------------------------------------------------------------------
// player actions
// ---------------------------------------------------------------------------

export function createScript(s: GameState, genre: Genre, quality: number, customTitle: string, contentType: 'movie' | 'series' | 'show' = 'movie'): GameState {
  const q = clamp(Math.round(quality), 25, 85)
  const cost = writeScriptCost(q)
  if (s.cash < cost) return s
  const title = (customTitle || randomTitle(s.scripts.map((x) => x.title))).trim()
  const script: Script = {
    id: uid(),
    title,
    genre,
    quality: q,
    price: 0,
    source: 'written',
    contentType,
  }
  const label = contentType === 'movie' ? 'movie' : contentType === 'series' ? 'TV series' : 'TV show'
  return recordLedger({
    ...s,
    cash: s.cash - cost,
    scripts: [...s.scripts, script],
    log: [
      news(s.week, `✍️ You wrote a ${label} script "${title}" (${genre}, quality ${q}) for ${fmt(cost)}.`, 'good'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }, { category: 'scripts', amount: cost, cashEffect: -cost, classification: 'expense', description: `Wrote ${label} script "${title}"` })
}

export function buyScript(s: GameState, scriptId: string): GameState {
  const sc = s.market.find((x) => x.id === scriptId)
  if (!sc || s.cash < sc.price) return s
  return recordLedger({
    ...s,
    cash: s.cash - sc.price,
    market: s.market.filter((x) => x.id !== scriptId),
    scripts: [...s.scripts, sc],
    log: [
      news(s.week, `📜 Bought spec script "${sc.title}" (${sc.genre}, quality ${sc.quality}) for ${fmt(sc.price)}.`, 'good'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }, { category: 'scripts', amount: sc.price, cashEffect: -sc.price, classification: 'expense', description: `Bought script "${sc.title}"` })
}

/** Start a new production from an owned script. */
export function putIntoProduction(s: GameState, scriptId: string): GameState {
  if (s.production) return s
  const sc = resolveScript(s, scriptId)
  if (!sc) return s
  const movie: Movie = {
    id: uid(),
    title: sc.title,
    genre: sc.genre,
    owner: 'player',
    studioName: s.studioName,
    scriptQuality: sc.quality,
    writerId: null,
    directorId: null,
    actorIds: [],
    productionBudget: 0,
    departments: { acting: 0, writing: 0, direction: 0, effects: 0, music: 0, editing: 0 },
    quality: sc.quality,
    hype: 0,
    marketingSpent: 0,
    releaseWeek: 0,
    opening: 0,
    weekly: [],
    totalGross: 0,
    cost: 0,
    revenue: 0,
    contentType: sc.contentType || 'movie',
    status: 'Casting',
    franchiseName: null,
    part: 1,
    releasedYear: 0,
    finished: false,
    phase: 'preProduction',
    isDisaster: false,
    seasons: 0,
    episodesPerSeason: 0,
    viewership: 0,
    cancelled: false,               releaseWindow: 'theatrical' as const, streamingRevenue: 0, internationalDeal: false,
  }
  return {
    ...s,
    scripts: s.scripts.filter((x) => x.id !== scriptId),
    production: {
      movie,
      phase: 'preProduction',
      weeksLeft: 0,
      releaseWeek: null,
      marketingStrategy: s.defaultStrategy,
      managerId: null,
    },
    log: [
      news(s.week, `🎥 "${sc.title}" (${sc.contentType || 'movie'}) is now in pre-production. Cast your talent.`, 'info'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
}

/** Hire talent for the in-production movie. offer <= asking triggers a negotiation roll. */
export function hireTalent(s: GameState, talentId: string, offer: number): GameState {
  if (!s.production || s.production.phase !== 'preProduction') return s
  const t = findTalent(s, talentId)
  if (!t) return s
  if (t.busyUntil > s.week) {
    return {
      ...s,
      log: [news(s.week, `${t.name} is unavailable right now.`, 'bad'), ...s.log].slice(0, LOG_CAP),
    }
  }
  const offerAmt = Math.round(offer)
  if (offerAmt <= 0 || offerAmt > s.cash) {
    return {
      ...s,
      log: [news(s.week, `You cannot afford ${t.name}'s ${fmt(offerAmt)} offer.`, 'bad'), ...s.log].slice(0, LOG_CAP),
    }
  }
  if (offerAmt < t.asking && Math.random() > acceptChance(offerAmt, t.asking)) {
    const next = { ...t, busyUntil: s.week + 2 }
    return {
      ...s,
      talents: s.talents.map((x) => (x.id === t.id ? next : x)),
      log: [
        news(s.week, `${t.name} turned down your offer of ${fmt(offerAmt)}. They want closer to ${fmt(t.asking)}.`, 'bad'),
        ...s.log,
      ].slice(0, LOG_CAP),
    }
  }
  const busy = t.role === 'actor' ? Math.round(rand(6, 14)) : t.role === 'director' ? Math.round(rand(8, 16)) : Math.round(rand(4, 10))
  const hired = { ...t, hiredWeek: s.week, busyUntil: s.week + busy, asking: offerAmt }
  const prod = {
    ...s.production,
    movie: { ...s.production.movie, cost: s.production.movie.cost + offerAmt },
  }
  if (t.role === 'writer') prod.movie.writerId = t.id
  else if (t.role === 'director') prod.movie.directorId = t.id
  else prod.movie.actorIds = [...prod.movie.actorIds, t.id]
  // --- Reputation impact from pay ---
  let repChange = 0
  const payRatio = offerAmt / t.asking
  if (payRatio < 0.6) {
    // Underpaid — reputation hit + controversy chance
    repChange = -3
    if (Math.random() < 0.4) {
      // Cast controversy: talent talks
      const evt: RandomEvent = {
        id: 'evt_controversy_' + s.week + '_' + Math.floor(Math.random() * 1e6),
        week: s.week,
        type: 'talent_feud',
        title: `${t.name} Slams Studio Over Pay`,
        description: `${t.name} publicly criticizes your studio for underpaying talent. Other actors take notice.`,
        effect: 'negative',
        targetMovieId: null,
        magnitude: Math.round(rand(15, 40)),
        resolved: false,
      }
      s = { ...s, randomEvents: [...s.randomEvents, evt].slice(-20), activeEvent: evt, lastEventWeek: s.week }
    }
  } else if (payRatio >= 1.0) {
    // Paid asking or above — reputation boost
    repChange = 1
  }
  return recordLedger({
    ...s,
    cash: s.cash - offerAmt,
    reputation: clamp(Math.round(s.reputation + repChange), 0, REP_MAX),
    talents: s.talents.map((x) => (x.id === t.id ? hired : x)),
    production: prod,
    log: [
      news(
        s.week,
        offerAmt < t.asking
          ? (payRatio < 0.6
            ? `✒️ ${t.name} reluctantly accepted ${fmt(offerAmt)} — they feel undervalued. ${repChange} reputation.`
            : `✒️ ${t.name} accepted your counter-offer of ${fmt(offerAmt)}.`)
          : `✒️ Signed ${t.name} for ${fmt(offerAmt)}.` + (repChange > 0 ? ' Good pay — +1 reputation.' : ''),
        payRatio < 0.6 ? 'bad' : 'good',
      ),
      ...s.log,
    ].slice(0, LOG_CAP),
  }, { category: 'talent', amount: offerAmt, cashEffect: -offerAmt, classification: 'expense', description: `Hired ${t.name}` })
}

/** Remove a cast member from the current production (they keep the money). */
export function dropCast(s: GameState, talentId: string): GameState {
  if (!s.production || s.production.phase !== 'preProduction') return s
  const t = findTalent(s, talentId)
  if (!t) return s
  const prod = { ...s.production, movie: { ...s.production.movie } }
  const inCast = prod.movie.writerId === talentId || prod.movie.directorId === talentId || prod.movie.actorIds.includes(talentId)
  if (!inCast) return s
  if (prod.movie.writerId === talentId) prod.movie.writerId = null
  else if (prod.movie.directorId === talentId) prod.movie.directorId = null
  else prod.movie.actorIds = prod.movie.actorIds.filter((id) => id !== talentId)
  const refund = Math.max(0, t.asking)
  const released = { ...t, hiredWeek: -1, busyUntil: 0 }
  return recordLedger({
    ...s,
    cash: s.cash + refund,
    stats: { ...s.stats, totalSpent: Math.max(0, s.stats.totalSpent - refund) },
    talents: s.talents.map((x) => (x.id === talentId ? released : x)),
    production: { ...prod, movie: { ...prod.movie, cost: Math.max(0, prod.movie.cost - refund) } },
    log: [news(s.week, `${t.name} was dropped from "${prod.movie.title}" and ${fmt(refund)} was refunded.`, 'info'), ...s.log].slice(0, LOG_CAP),
  }, { category: 'talent', amount: refund, cashEffect: refund, classification: 'transfer', description: `Refund for dropping ${t.name}` })
}

/** Pay the production budget and start filming. */
export function startProduction(s: GameState, depts: DepartmentAlloc): GameState {
  if (!s.production || s.production.phase !== 'preProduction') return s
  const movie = s.production.movie
  const c = castOf(s, movie)
  if (!c.writer || !c.director || c.actors.length === 0) return s
  const budget = Object.values(depts).reduce((sum, v) => sum + v, 0)
  if (budget <= 0) return s
  if (s.cash < budget) return s
  const q = computeQuality({
    scriptQuality: movie.scriptQuality,
    writerFame: c.writer.fame,
    directorFame: c.director.fame,
    directorAffinity: c.director.genreAffinity,
    actorFames: c.actors.map((a) => a.fame),
    genre: movie.genre,
    productionBudget: budget,
    deptBalance: deptBalance(depts),
  })
  const weeks = productionWeeks(budget)
  const prod: Production = {
    ...s.production,
    phase: 'production',
    weeksLeft: weeks,
    movie: {
      ...movie,
      productionBudget: budget,
      departments: { ...depts },
      quality: q,
      cost: movie.cost + budget,
      status: `Filming (${weeks} weeks)`,
    },
  }
  return recordLedger({
    ...s,
    cash: s.cash - budget,
    production: prod,
    log: [
      news(s.week, `🎬 Production begins on "${movie.title}" — ${fmt(budget)} budget, ${weeks} weeks of filming. Estimated quality ${q}.`, 'good'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }, { category: 'production', amount: budget, cashEffect: -budget, classification: 'expense', description: `Production budget for "${movie.title}"` })
}

export function setRelease(s: GameState, releaseWeek: number, strategy: string): GameState {
  if (!s.production || s.production.phase !== 'marketing') return s
  const weeksOut = releaseWeek - s.week
  if (weeksOut < MIN_MARKETING_WEEKS || weeksOut > MAX_MARKETING_WEEKS) return s
  const strat = STRATEGIES.find((x) => x.name === strategy)
  if (!strat) return s
  const prod = {
    ...s.production,
    releaseWeek,
    marketingStrategy: strategy,
    movie: { ...s.production.movie, status: `Marketing for release in ${weeksOut} weeks`, hype: initialHype(avgActorFame(s.production.movie, s)) },
  }
  return {
    ...s,
    production: prod,
    log: [
      news(s.week, `📣 "${prod.movie.title}" will release in ${weeksOut} weeks with a "${strat.name}" marketing campaign. Marketing runs automatically.`, 'info'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
}

export function setDefaultStrategy(s: GameState, strategy: string): GameState {
  return { ...s, defaultStrategy: strategy }
}

// ---- new feature actions ----



/** Choose streaming release for the current production. */
export function setStreamingRelease(s: GameState): GameState {
  if (!s.production || s.production.phase !== 'marketing') return s
  const movie = s.production.movie
  const releaseWeek = s.week + MIN_MARKETING_WEEKS
  return {
    ...s,
    production: {
      ...s.production,
      releaseWeek,
      marketingStrategy: s.defaultStrategy,
      movie: {
        ...movie,
        releaseWindow: 'streaming',
        hype: initialHype(avgActorFame(movie, s)),
        status: `Streaming release in ${MIN_MARKETING_WEEKS} weeks`,
      },
    },
    stats: { ...s.stats, streamingReleases: s.stats.streamingReleases + 1 },
    log: [
      news(s.week, `📡 "${movie.title}" is scheduled for streaming release in ${MIN_MARKETING_WEEKS} weeks.`, 'info'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
}


export function makeSequel(s: GameState, movieId: string): GameState {
  if (s.production) return s
  const m = s.movies.find((x) => x.id === movieId)
  if (!m || m.owner !== 'player' || !m.finished) return s
  if (m.part >= MAX_FRANCHISE_PARTS) return s
  if (m.totalGross < m.cost * 2.5) return s
  const franchiseName = m.franchiseName ?? m.title
  const part = m.part + 1
  const movie: Movie = {
    id: uid(),
    title: sequelTitle(franchiseName, part),
    genre: m.genre,
    owner: 'player',
    studioName: s.studioName,
    scriptQuality: clamp(m.scriptQuality - 10 + part * 3 - (part > 4 ? (part - 4) * 8 : 0), 30, 92),
    writerId: null,
    directorId: null,
    actorIds: [],
    productionBudget: 0,
    departments: { acting: 0, writing: 0, direction: 0, effects: 0, music: 0, editing: 0 },
    quality: m.scriptQuality,
    hype: 0,
    marketingSpent: 0,
    releaseWeek: 0,
    opening: 0,
    weekly: [],
    totalGross: 0,
    cost: 0,
    revenue: 0,
    contentType: m.contentType || 'movie',
    status: 'Casting',
    franchiseName,
    part,
    releasedYear: 0,
    finished: false,
    phase: 'preProduction',
    isDisaster: false,
    seasons: 0,
    episodesPerSeason: 0,
    viewership: 0,
    cancelled: false,               releaseWindow: 'theatrical' as const, streamingRevenue: 0, internationalDeal: false,
  }
  return {
    ...s,
    production: { movie, phase: 'preProduction', weeksLeft: 0, releaseWeek: null, marketingStrategy: s.defaultStrategy, managerId: null },
    log: [
      news(s.week, `🎬 Greenlit ${part > 2 ? `${part}rd` : `${part}nd`} installment: "${movie.title}". A sequel carries built-in fanbase.`, 'gold'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
}

export function toggleAutoAdvance(s: GameState): GameState {
  return { ...s, autoAdvance: !s.autoAdvance }
}

// ---------------------------------------------------------------------------
// loans & investing
// ---------------------------------------------------------------------------

/**
 * Payment plan for a loan: how often cash moves and in what size.
 *   weekly  -> term is weeks, one collection per week
 *   monthly -> term is months, one collection every 4 weeks
 *   daily   -> term is days, collected weekly (7 daily payments per week)
 */
export function loanPlan(
  principal: number,
  rate: number,
  frequency: LoanFrequency,
  termValue: number,
): { intervalWeeks: number; collections: number; installment: number; total: number } {
  const total = Math.round(principal * (1 + clamp(rate, 0, 1)))
  if (frequency === 'monthly') {
    const collections = Math.max(1, Math.round(termValue))
    return { intervalWeeks: 4, collections, installment: Math.round(total / collections), total }
  }
  if (frequency === 'daily') {
    const collections = Math.max(1, Math.ceil(termValue / 7))
    return { intervalWeeks: 1, collections, installment: Math.round(total / collections), total }
  }
  const collections = Math.max(1, Math.round(termValue))
  return { intervalWeeks: 1, collections, installment: Math.round(total / collections), total }
}

const freqLabel = (f: LoanFrequency): string => (f === 'monthly' ? 'monthly' : f === 'daily' ? 'daily' : 'weekly')

/** Borrow cash from the bank on your own terms — no limits on amount or count. */
export function takeLoan(
  s: GameState,
  amount: number,
  rate: number = LOAN_INTEREST,
  termValue: number = LOAN_TERM,
  frequency: LoanFrequency = 'weekly',
): GameState {
  const amt = Math.round(amount)
  if (!Number.isFinite(amt) || amt < INVEST_MIN || amt > MAX_LOAN_AMOUNT) return s
  // Credit score limits: generous from the start, effectively unlimited at 50+
  const maxBorrow = s.playerCreditScore >= 50 ? Infinity : s.playerCreditScore * 10_000_000_000_000
  if (amt > maxBorrow) return s
  if (!Number.isFinite(termValue) || termValue <= 0 || termValue > 100_000) return s
  const plan = loanPlan(amt, rate, frequency, termValue)
  const loan: Loan = {
    id: uid(),
    kind: 'borrow',
    principal: amt,
    rate: clamp(rate, 0, 1),
    frequency,
    termValue,
    intervalWeeks: plan.intervalWeeks,
    totalCollections: plan.collections,
    collectionsDone: 0,
    installment: plan.installment,
    nextDueWeek: s.week + plan.intervalWeeks,
    outstanding: plan.total,
    received: 0,
    studioName: null,
    takenWeek: s.week,
    settled: false,
  }
  return recordLedger({
    ...s,
    cash: s.cash + amt,
    loans: [...s.loans, loan],
    log: [
      news(
        s.week,
        `🏦 You borrowed ${fmt(amt)} at ${Math.round(loan.rate * 100)}% — ${fmt(loan.installment)} ${freqLabel(frequency)} for ${plan.collections} ${freqLabel(frequency)} collections.`,
        'good',
      ),
      ...s.log,
    ].slice(0, LOG_CAP),
  }, { category: 'loanPrincipal', amount: amt, cashEffect: amt, classification: 'liability', description: `Borrowed ${fmt(amt)}` })
}

/** Repay a borrow loan in full, immediately. */
export function payOffLoan(s: GameState, loanId: string): GameState {
  const loan = s.loans.find((l) => l.id === loanId && l.kind === 'borrow')
  if (!loan) return s
  if (s.cash < loan.outstanding) return s
  const principalRemaining = Math.max(0, loan.principal - Math.round(loan.principal * loan.collectionsDone / loan.totalCollections))
  const interest = Math.max(0, loan.outstanding - principalRemaining)
  let result = recordLedger({
    ...s,
    cash: s.cash - loan.outstanding,
    loans: s.loans.filter((l) => l.id !== loanId),
    log: [
      news(s.week, `🏦 You paid off your ${fmt(loan.principal)} loan early (${fmt(loan.outstanding)} total).`, 'good'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }, { category: 'loanRepayment', amount: principalRemaining, cashEffect: -principalRemaining, classification: 'transfer', description: 'Early loan principal repayment' })
  if (interest > 0) result = recordLedger(result, { category: 'loanInterest', amount: interest, cashEffect: -interest, classification: 'expense', description: 'Early loan interest repayment' })
  return result
}

/** Lend cash to any rival studio on your own terms — no limits on amount or count. */
export function giveLoan(
  s: GameState,
  studioName: string,
  amount: number,
  rate: number = LEND_INTEREST,
  termValue: number = LEND_TERM,
  frequency: LoanFrequency = 'weekly',
): GameState {
  const amt = Math.round(amount)
  if (!Number.isFinite(amt) || amt < INVEST_MIN || amt > MAX_LOAN_AMOUNT) return s
  // Credit check: studio's credit score limits how much they can borrow
  const studio = s.aiStudios.find(a => a.name === studioName)
  if (studio) {
    const maxLoan = studio.creditScore * 100_000 // 50 = $5M max, 80 = $8M max
    if (amt > maxLoan) return s
  }
  if (!Number.isFinite(termValue) || termValue <= 0 || termValue > 100_000) return s
  if (s.cash < amt) return s
  const plan = loanPlan(amt, rate, frequency, termValue)
  const loan: Loan = {
    id: uid(),
    kind: 'lend',
    principal: amt,
    rate: clamp(rate, 0, 1),
    frequency,
    termValue,
    intervalWeeks: plan.intervalWeeks,
    totalCollections: plan.collections,
    collectionsDone: 0,
    installment: plan.installment,
    nextDueWeek: s.week + plan.intervalWeeks,
    outstanding: 0,
    received: 0,
    studioName,
    takenWeek: s.week,
    settled: false,
  }
  return recordLedger({
    ...s,
    cash: s.cash - amt,
    loans: [...s.loans, loan],
    log: [
      news(
        s.week,
        `🏦 You lent ${fmt(amt)} to ${studioName} at ${Math.round(loan.rate * 100)}% — ${fmt(loan.installment)} ${freqLabel(frequency)} for ${plan.collections} collections.`,
        'good',
      ),
      ...s.log,
    ].slice(0, LOG_CAP),
  }, { category: 'lending', amount: amt, cashEffect: -amt, classification: 'asset', description: `Lent ${fmt(amt)} to ${studioName}` })
}

/** Stake cash in an AI studio's upcoming movie for a slice of its gross. */
export function investInMovie(s: GameState, studioName: string, amount: number): GameState {
  const ai = s.aiStudios.find((a) => a.name === studioName && a.nextReleaseWeek > s.week)
  if (!ai) return s
  const amt = Math.round(amount)
  const max = Math.round(ai.budget * INVEST_MAX_SHARE)
  if (amt < INVEST_MIN || amt > max) return s
  if (s.cash < amt) return s
  const inv: Investment = {
    id: uid(),
    studioName,
    releaseWeek: ai.nextReleaseWeek,
    movieId: null,
    amount: amt,
    share: amt / ai.budget,
    totalReturn: 0,
    settled: false,
    takenWeek: s.week,
  }
  return recordLedger({
    ...s,
    cash: s.cash - amt,
    investments: [...s.investments, inv],
    log: [
      news(
        s.week,
        `📈 You invested ${fmt(amt)} in ${studioName}'s upcoming movie (${Math.round(inv.share * 100)}% stake, opens in ${ai.nextReleaseWeek - s.week} weeks).`,
        'gold',
      ),
      ...s.log,
    ].slice(0, LOG_CAP),
  }, { category: 'investment', amount: amt, cashEffect: -amt, classification: 'asset', description: `Investment in ${studioName}` })
}

// ---------------------------------------------------------------------------
// misc
// ---------------------------------------------------------------------------

const ENG_UNITS: [number, string][] = [
  [1e27, 'Oc'],
  [1e24, 'Se'],
  [1e21, 'Sp'],
  [1e18, 'Sx'],
  [1e15, 'Q'],
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M'],
  [1e4, 'K'],
]

export function fmt(v: number): string {
  const sign = v < 0 ? '-' : ''
  const a = Math.abs(v)
  for (const [th, suf] of ENG_UNITS) {
    if (a >= th) return `${sign}$${(a / th).toFixed(2)}${suf}`
  }
  return `${sign}$${Math.round(a).toLocaleString('en-US')}`
}

// ---------------------------------------------------------------------------
// hired managers — they take a weekly salary and run the whole pipeline
// ---------------------------------------------------------------------------

export function hireManager(
  s: GameState,
  opts: {
    name?: string
    weeklySalary: number
    genre: Genre | null
    qualityTarget: number
    maxBudget: number
    marketingStrategy: string
    contentType?: 'movie' | 'series' | 'show' | 'any'
    franchiseName?: string | null
    customLabel?: string | null
    sequelsOnly?: boolean
  },
): GameState {
  const salary = Math.round(opts.weeklySalary)
  if (!Number.isFinite(salary) || salary < 1_000 || salary > MAX_LOAN_AMOUNT) return s
  const budget = Math.round(opts.maxBudget)
  if (!Number.isFinite(budget) || budget < 500_000 || budget > MAX_LOAN_AMOUNT) return s
  const ct = opts.contentType ?? 'any'
  const franchise = (opts.franchiseName ?? '').trim() || null
  const label = (opts.customLabel ?? '').trim() || null
  const sequelOnly = opts.sequelsOnly ?? false
  const contentDesc = ct === 'any' ? 'any content' : ct === 'movie' ? 'movies' : ct === 'series' ? 'TV series' : 'TV shows'
  const franchiseDesc = franchise ? ` — franchise: "${franchise}"` : ''
  const labelDesc = label ? ` (${label})` : ''
  const manager: Manager = {
    id: uid(),
    name: (opts.name ?? randomTalentName()).trim() || 'Studio Manager',
    weeklySalary: salary,
    genre: opts.genre,
    qualityTarget: Math.round(clamp(opts.qualityTarget, 30, 90)),
    maxBudget: budget,
    marketingStrategy: opts.marketingStrategy,
    active: true,
    hiredWeek: s.week,
    moviesMade: 0,
    contentType: ct,
    franchiseName: franchise,
    customLabel: label,
    sequelsOnly: sequelOnly,
    mood: 50,
    cooldownUntil: 0,
  }
  return {
    ...s,
    managers: [...s.managers, manager],
    log: [
      news(
        s.week,
        `👔 Hired ${manager.name}${labelDesc} for ${fmt(salary)}/week — making ${contentDesc}${franchiseDesc}.`,
        'good',
      ),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
}

/** Fire a manager — their salary stops immediately. */
export function fireManager(s: GameState, id: string): GameState {
  const m = s.managers.find((x) => x.id === id)
  if (!m) return s
  return {
    ...s,
    managers: s.managers.filter((x) => x.id !== id),
    log: [news(s.week, `👔 ${m.name} was let go. Their salary stops immediately.`, 'info'), ...s.log].slice(0, LOG_CAP),
  }
}

/** Change a manager's standing orders. */
export function updateManager(
  s: GameState,
  id: string,
  patch: Partial<Pick<Manager, 'genre' | 'qualityTarget' | 'maxBudget' | 'marketingStrategy' | 'weeklySalary' | 'active'>>,
): GameState {
  return {
    ...s,
    managers: s.managers.map((m) =>
      m.id === id
        ? {
            ...m,
            ...patch,
            weeklySalary:
              patch.weeklySalary !== undefined ? Math.min(MAX_LOAN_AMOUNT, Math.max(1_000, Math.round(patch.weeklySalary))) : m.weeklySalary,
            maxBudget:
              patch.maxBudget !== undefined ? Math.min(MAX_LOAN_AMOUNT, Math.max(500_000, Math.round(patch.maxBudget))) : m.maxBudget,
          }
        : m,
    ),
  }
}

/** Best release window (weeks out) for a genre, avoiding AI competition. */
function pickBestRelease(s: GameState, genre: Genre): number {
  let best = s.week + MIN_MARKETING_WEEKS
  let bestScore = -Infinity
  for (let w = s.week + MIN_MARKETING_WEEKS; w <= s.week + MAX_MARKETING_WEEKS; w++) {
    const comp = s.aiStudios.filter((a) => a.nextReleaseWeek === w).length
    const score = timingMultiplier(genre, w) - 0.04 * comp
    if (score > bestScore) {
      bestScore = score
      best = w
    }
  }
  return best
}

/**
 * A manager runs the whole pipeline in one go: write a script, start the
 * production, hire the best affordable cast, fund a balanced production.
 * Release/marketing get booked automatically when filming wraps (in tick).
 */
function managerMakeMovie(s: GameState, events: string[]): GameState {
  const active = s.managers.filter((m) => m.active)
  if (active.length === 0) return s
  const hasProd = (mgrId: string) => s.managerProductions.some((p) => p.managerId === mgrId)
  const idle = active.filter((m) => !hasProd(m.id) && m.cooldownUntil <= s.week)
  if (idle.length === 0) return s

  let st: GameState = { ...s }
  for (const mgr of idle) {
    // --- MOOD SYSTEM: salary determines output frequency and quality ---
    // Low salary: 10-12/year (cooldown 4-5 weeks), quality -20
    // Medium salary: 20-30/year (cooldown 2 weeks), normal quality
    // High salary: 50-100/year (cooldown 1 week), quality +10
    // Ultra salary: 100+/year (no cooldown), quality +20
    const salary = mgr.weeklySalary
    let moodScore: number // 0-100
    let cooldownWeeks: number
    let qualityBonus: number
    if (salary < 10_000) {
      // Very unhappy — slow and lazy
      moodScore = clamp(Math.round(salary / 200), 5, 45)
      cooldownWeeks = Math.round(rand(4, 6)) // 10-12 per year
      qualityBonus = -15
    } else if (salary < 50_000) {
      // Unmotivated — moderate pace
      moodScore = clamp(Math.round(45 + (salary - 10_000) / 1000), 45, 65)
      cooldownWeeks = Math.round(rand(2, 3)) // 20-30 per year
      qualityBonus = -5
    } else if (salary < 200_000) {
      // Happy — productive
      moodScore = clamp(Math.round(65 + (salary - 50_000) / 5000), 65, 85)
      cooldownWeeks = 1 // ~50 per year
      qualityBonus = 5
    } else {
      // THRILLED — machine mode
      moodScore = clamp(Math.round(85 + Math.min(15, (salary - 200_000) / 50_000)), 85, 100)
      cooldownWeeks = 0 // can produce every week
      qualityBonus = 15
    }
    
    // Update manager mood
    st = { ...st, managers: st.managers.map(m => m.id === mgr.id ? { ...m, mood: moodScore, cooldownUntil: st.week + cooldownWeeks } : m) }
    
    // no cash gate — managers always try to start a movie

    // Respect manager content type preference
    let mgrContentType: 'movie' | 'series' | 'show'
    if (mgr.contentType === 'any') {
      mgrContentType = Math.random() < 0.15 ? 'series' : Math.random() < 0.12 ? 'show' : 'movie'
    } else {
      mgrContentType = mgr.contentType as 'movie' | 'series' | 'show'
    }

    // 1) Check if this manager already has a show/series — add season
    const existingShow = (mgrContentType === 'series' || mgrContentType === 'show')
      ? st.managerShows.find(s => s.managerId === mgr.id)
      : undefined
    
    if (existingShow) {
      // ADD NEW SEASON to existing show
      const seasonNum = existingShow.seasons.length + 1
      const quality = Math.round(clamp(mgr.qualityTarget + rand(-10, 10) + qualityBonus, 30, 95))
      const budget = Math.max(500_000, Math.round(mgr.maxBudget))
      const episodes = Math.floor(rand(8, 24))
      
      // Create the season as a movie entry for tracking
      const seasonTitle = `${existingShow.title} — Season ${seasonNum}`
      const seasonMovie: Movie = {
        id: uid(), title: seasonTitle, genre: existingShow.genre, owner: 'player',
        studioName: st.studioName, scriptQuality: quality, writerId: null, directorId: null,
        actorIds: [], productionBudget: budget,
        departments: { acting: 0, writing: 0, direction: 0, effects: 0, music: 0, editing: 0 },
        quality, hype: 0, marketingSpent: 0, releaseWeek: 0, opening: 0, weekly: [],
        totalGross: 0, cost: 0, revenue: 0, contentType: mgrContentType,
        status: 'Season Production', franchiseName: existingShow.title,
        part: seasonNum, releasedYear: 0, finished: false, phase: 'preProduction',
        isDisaster: false, seasons: seasonNum, episodesPerSeason: episodes,
        viewership: 0, cancelled: false, releaseWindow: 'theatrical',
        streamingRevenue: 0,
       
        internationalDeal: false,
      };
      
      // Auto-cast
      const pickFree = (role: Role, excludeId?: string): Talent | null => {
        const free = st.talents.filter(t => t.role === role && t.busyUntil <= st.week && t.id !== excludeId)
        if (free.length === 0) return null
        free.sort((a, b) => b.fame - a.fame)
        return free[0]
      }
      const hire = (t: Talent | null): boolean => {
        if (!t) return false
        const busy = t.role === 'actor' ? Math.round(rand(6, 14)) : t.role === 'director' ? Math.round(rand(8, 16)) : Math.round(rand(4, 10))
        const hired = { ...t, hiredWeek: st.week, busyUntil: st.week + busy, asking: t.asking }
        st = recordLedger({ ...st, cash: st.cash - t.asking, talents: st.talents.map(x => x.id === t.id ? hired : x) },
          { category: 'talent', amount: t.asking, cashEffect: -t.asking, classification: 'expense', description: `Manager hired ${t.name}` })
        if (t.role === 'writer') seasonMovie.writerId = t.id
        else if (t.role === 'director') seasonMovie.directorId = t.id
        else seasonMovie.actorIds = [...seasonMovie.actorIds, t.id]
        seasonMovie.cost += t.asking
        return true
      }
      const w = pickFree('writer')
      const d = pickFree('director')
      const a1 = pickFree('actor')
      const a2 = pickFree('actor', a1?.id)
      if (!hire(w) || !hire(d) || !hire(a1)) continue
      if (a2) hire(a2)
      
      // Fund production
      const share = budget / 6
      const depts = { acting: share, writing: share, direction: share, effects: share, music: share, editing: share }
      const castLookup = {
        writer: seasonMovie.writerId ? st.talents.find(t => t.id === seasonMovie.writerId) ?? null : null,
        director: seasonMovie.directorId ? st.talents.find(t => t.id === seasonMovie.directorId) ?? null : null,
        actors: seasonMovie.actorIds.map(id => st.talents.find(t => t.id === id)).filter(Boolean) as Talent[],
      }
      const q = computeQuality({
        scriptQuality: quality, writerFame: castLookup.writer ? castLookup.writer.fame : 0,
        directorFame: castLookup.director ? castLookup.director.fame : 0,
        directorAffinity: castLookup.director ? castLookup.director.genreAffinity : null,
        actorFames: castLookup.actors.map((a: any) => a.fame), genre: existingShow.genre,
        productionBudget: budget, deptBalance: deptBalance(depts),
      })
      
      st = recordLedger({ ...st, cash: st.cash - budget },
        { category: 'production', amount: budget, cashEffect: -budget, classification: 'expense', description: `Manager production budget for "${seasonMovie.title}"` })
      const weeks = 3
      const prod: Production = {
        movie: { ...seasonMovie, productionBudget: budget, departments: { ...depts }, quality: q, cost: seasonMovie.cost + budget, status: `Filming (${weeks} weeks)` },
        phase: 'production', weeksLeft: weeks, releaseWeek: null,
        marketingStrategy: mgr.marketingStrategy, managerId: mgr.id,
      }
      st = { ...st, managerProductions: [...st.managerProductions, prod] }
      
      // Add season to the show
      st = { ...st, managerShows: st.managerShows.map(s =>
        s.id === existingShow.id
          ? { ...s, seasons: [...s.seasons, { seasonNumber: seasonNum, quality: q, episodes, releaseWeek: 0, totalGross: 0, status: 'earning' as const }] }
          : s
      )}
      
      const labelDesc = mgr.customLabel ? ` [${mgr.customLabel}]` : ''
      addLog(st, events,
        `📺 ${mgr.name}${labelDesc} starting Season ${seasonNum} of "${existingShow.title}" (${existingShow.genre}, ${fmt(budget)} budget, ${episodes} episodes)`,
        'info',
      )
      continue
    }
    
    // 2) No existing show — create new one
    const genre2: Genre = mgr.genre ?? pick(GENRE_NAMES)
    let script: Script | null = null
    for (let q = Math.round(clamp(mgr.qualityTarget + qualityBonus, 30, 90)); q >= 35; q -= 5) {
      const cost = writeScriptCost(q)
      const title = mgr.customLabel ? `${mgr.customLabel}: ${randomTitle()}` : mgr.franchiseName ? `${mgr.franchiseName} ${['Part', 'II', 'III', 'IV', 'V', 'VI'][Math.min(5, (mgr.moviesMade % 6) + 1)]}` : randomTitle()
      script = { id: uid(), title, genre: genre2, quality: q, price: 0, source: 'written', contentType: mgrContentType }
      st = recordLedger({ ...st, cash: st.cash - cost, scripts: [...st.scripts, script] },
        { category: 'scripts', amount: cost, cashEffect: -cost, classification: 'expense', description: `Manager wrote script "${title}"` })
      break
    }
    if (!script) continue

    // 2) create the movie & production object directly
    const movie: Movie = {
      id: uid(),
      title: script.title,
      genre: script.genre,
      owner: 'player',
      studioName: st.studioName,
      scriptQuality: script.quality,
      writerId: null,
      directorId: null,
      actorIds: [],
      productionBudget: 0,
      departments: { acting: 0, writing: 0, direction: 0, effects: 0, music: 0, editing: 0 },
      quality: script.quality,
      hype: 0,
      marketingSpent: 0,
      releaseWeek: 0,
      opening: 0,
      weekly: [],
      totalGross: 0,
      cost: 0,
      revenue: 0,
      contentType: mgrContentType,
      status: 'Casting',
      franchiseName: mgr.franchiseName ?? null,
      part: mgr.franchiseName ? Math.min(6, 1 + (mgr.moviesMade % 6)) : 1,
      releasedYear: 0,
      finished: false,
      phase: 'preProduction',
      isDisaster: false,
      seasons: mgrContentType !== 'movie' ? Math.floor(rand(1, 6)) : 0,
      episodesPerSeason: mgrContentType !== 'movie' ? Math.floor(rand(6, 24)) : 0,
      viewership: 0,
      cancelled: false,               releaseWindow: 'theatrical' as const, streamingRevenue: 0, internationalDeal: false,
    }
    st = { ...st, scripts: st.scripts.filter((x) => x.id !== script.id) }

    // 3) cast — best affordable talent, falling back to cheapest available
    const castCap = Math.min(mgr.maxBudget * 0.5, st.cash * 0.2)
    const pickTalent = (role: Role, excludeId?: string): Talent | null => {
      const free = st.talents.filter((t) => t.role === role && t.busyUntil <= st.week && t.id !== excludeId)
      if (free.length === 0) return null
      const capped = free.filter((t) => t.asking <= castCap)
      if (capped.length > 0) {
        capped.sort((a, b) => b.fame - a.fame)
        return capped[0]
      }
      free.sort((a, b) => a.asking - b.asking)
      return free[0]
    }
    const writer = pickTalent('writer')
    const director = pickTalent('director')
    const actor1 = pickTalent('actor')
    const actor2 = pickTalent('actor', actor1 ? actor1.id : undefined)

    const hire = (t: Talent | null): boolean => {
      if (!t) return false
      const busy =
        t.role === 'actor' ? Math.round(rand(6, 14)) : t.role === 'director' ? Math.round(rand(8, 16)) : Math.round(rand(4, 10))
      const hired = { ...t, hiredWeek: st.week, busyUntil: st.week + busy, asking: t.asking }
      st = recordLedger({ ...st, cash: st.cash - t.asking, talents: st.talents.map((x) => (x.id === t.id ? hired : x)) },
        { category: 'talent', amount: t.asking, cashEffect: -t.asking, classification: 'expense', description: `Manager hired ${t.name}` })
      if (t.role === 'writer') movie.writerId = t.id
      else if (t.role === 'director') movie.directorId = t.id
      else movie.actorIds = [...movie.actorIds, t.id]
      movie.cost += t.asking
      return true
    }
    const hiredAll = hire(writer) && hire(director) && hire(actor1)
    if (actor2) hire(actor2)
    if (!hiredAll) continue

    // 4) fund production
    // funding always available for managers
    const budget = Math.max(500_000, Math.round(mgr.maxBudget))
    const weeks = productionWeeks(budget)
    const share = budget / 6
    const depts: DepartmentAlloc = {
      acting: share,
      writing: share,
      direction: share,
      effects: share,
      music: share,
      editing: share,
    }

    const castLookup = {
      writer: movie.writerId ? st.talents.find((t) => t.id === movie.writerId) ?? null : null,
      director: movie.directorId ? st.talents.find((t) => t.id === movie.directorId) ?? null : null,
      actors: movie.actorIds.map((id) => st.talents.find((t) => t.id === id)).filter(Boolean) as Talent[],
    }
    const q = computeQuality({
      scriptQuality: movie.scriptQuality,
      writerFame: castLookup.writer ? castLookup.writer.fame : 0,
      directorFame: castLookup.director ? castLookup.director.fame : 0,
      directorAffinity: castLookup.director ? castLookup.director.genreAffinity : null,
      actorFames: castLookup.actors.map((a) => a.fame),
      genre: movie.genre,
      productionBudget: budget,
      deptBalance: deptBalance(depts),
    })

    st = recordLedger({ ...st, cash: st.cash - budget },
      { category: 'production', amount: budget, cashEffect: -budget, classification: 'expense', description: `Manager production budget for "${movie.title}"` })
    const prod: Production = {
      movie: {
        ...movie,
        productionBudget: budget,
        departments: { ...depts },
        quality: q,
        cost: movie.cost + budget,
        status: `Filming (${weeks} weeks)`,
      },
      phase: 'production',
      weeksLeft: weeks,
      releaseWeek: null,
      marketingStrategy: mgr.marketingStrategy,
      managerId: mgr.id,
    }
    st = { ...st, managerProductions: [...st.managerProductions, prod] }
    const contentLabel = mgrContentType === 'movie' ? 'movie' : mgrContentType === 'series' ? 'TV series' : 'TV show'
    const labelDesc = mgr.customLabel ? ` [${mgr.customLabel}]` : ''
    const franchiseDesc = mgr.franchiseName ? ` — franchise: "${mgr.franchiseName}"` : ''
    
    // If this is a new series/show, create the ManagerShow entry
    if (mgrContentType === 'series' || mgrContentType === 'show') {
      const newShow = {
        id: uid(),
        managerId: mgr.id,
        title: movie.title,
        genre: movie.genre,
        contentType: mgrContentType as 'series' | 'show',
        seasons: [{ seasonNumber: 1, quality: q, episodes: Math.floor(rand(8, 24)), releaseWeek: 0, totalGross: 0, status: 'earning' as const }],
        totalEarnings: 0,
      }
      st = { ...st, managerShows: [...st.managerShows, newShow] }
    }
    
    addLog(
      st,
      events,
      `👔 ${mgr.name}${labelDesc} started ${contentLabel} "${movie.title}" (${movie.genre}, ${fmt(budget)} budget)${franchiseDesc}`,
      'info',
    )
  }

  return st
}


// ---------------------------------------------------------------------------
// MY STREAMING PLATFORM — player can create their own Netflix-like service
// ---------------------------------------------------------------------------

/** Launch your own streaming platform */
export function createStreamingPlatform(s: GameState, name: string): GameState {
  return {
    ...s,
    streamingPlatform: true,
    myStreamingPlatform: {
      name: name || 'My Stream',
      active: true,
      subscriptionPrice: 9.99,
      subscribers: 100,
      maxSubscribers: 1000,
      totalRevenue: 0,
      contentLibrary: [],
      weeklyRevenue: 0,
      adTierEnabled: false,
      freeViewers: 0,
      maxFreeViewers: 12000,
      adsPerMovie: 6,
      adRevenuePerAd: 0.05,
      weeklyAdRevenue: 0,
      totalAdRevenue: 0,
      adsShownLastWeek: 0,
      adFreePrice: 10,
      adFreeSubscribers: 0,
      totalSubRevenue: 0,
      adDeals: [],
      adRateCard: 1,
      autoRelease: true,
      autoReleaseDelay: 15,
    },
    log: [
      news(s.week, `🎬 ${name || 'My Stream'} launches! 100 founding subscribers at $9.99/week.`, 'gold'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
}

/** Set the subscription price for your platform */
export function setPlatformPrice(s: GameState, price: number): GameState {
  const p = s.myStreamingPlatform
  if (!p.active) return s
  const clamped = Math.max(1, Math.min(50, Math.round(price * 100) / 100))
  return {
    ...s,
    myStreamingPlatform: { ...p, subscriptionPrice: clamped },
    log: [
      news(s.week, `💰 ${p.name} subscription set to $${clamped.toFixed(2)}/week.`, 'info'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
}

/** Release a finished/evergreen movie on your streaming platform */
export function releaseOnPlatform(s: GameState, movieId: string): GameState {
  const p = s.myStreamingPlatform
  if (!p.active) return s
  const movie = s.movies.find(m => m.id === movieId)
  if (!movie) return s
  // Already on platform?
  if (p.contentLibrary.some(c => c.movieId === movieId)) return s
  
  // Calculate subscriber draw based on quality and fame
  const qualityDraw = movie.quality * 10
  const sequelDraw = movie.part > 1 ? 5000 : 0
  const draw = Math.round(qualityDraw + sequelDraw + rand(1000, 5000))
  
  const newMax = p.maxSubscribers + draw
  const viewsPerWeek = Math.round(movie.quality * movie.hype * rand(50, 200))
  
  const content: import('./types').StreamingContent = {
    movieId,
    title: movie.title,
    genre: movie.genre,
    quality: movie.quality,
    contentType: movie.contentType || 'movie',
    seasons: movie.seasons,
    addedWeek: s.week,
    viewsPerWeek,
    subscriberDraw: draw,
  }
  
  return {
    ...s,
    myStreamingPlatform: {
      ...p,
      contentLibrary: [...p.contentLibrary, content],
      maxSubscribers: newMax,
    },
    stats: { ...s.stats, streamingReleases: s.stats.streamingReleases + 1 },
    log: [
      news(s.week, `📺 "${movie.title}" (${movie.quality}q) added to ${p.name}. +${draw.toLocaleString()} potential subscribers.`, 'good'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
}

/** Calculate weekly streaming platform revenue (called in tick) */
function collectStreamingRevenue(s: GameState): GameState {
  const p = s.myStreamingPlatform
  if (p.contentLibrary.length === 0) return s
  
  // Subscriber growth: based on content library quality and price
  const avgQuality = p.contentLibrary.reduce((sum, c) => sum + c.quality, 0) / p.contentLibrary.length
  const libraryBonus = p.contentLibrary.length * 500 // more content = more growth
  const pricePenalty = p.subscriptionPrice > 20 ? (p.subscriptionPrice - 20) * 200 : 0
  const priceBonus = p.subscriptionPrice < 5 ? 2000 : 0
  const churnRate = 0.03 + (p.subscriptionPrice / 200) // higher price = more churn
  
  const rawGrowth = avgQuality * 20 + libraryBonus - pricePenalty + priceBonus
  const newSubs = Math.max(0, Math.round(rawGrowth * rand(0.5, 1.5)))
  const churned = Math.round(p.subscribers * churnRate * rand(0.8, 1.2))
  
  const subscribers = Math.max(0, Math.min(p.maxSubscribers, p.subscribers + newSubs - churned))
  const weeklyRevenue = Math.round(subscribers * p.subscriptionPrice)

  
  return recordLedger({
    ...s,
    streamingPlatform: true,
    myStreamingPlatform: {
      ...p,
      active: true,
      subscribers,
      weeklyRevenue,
      totalRevenue: p.totalRevenue + weeklyRevenue,
    },
    cash: s.cash + weeklyRevenue,
    stats: { ...s.stats, totalEarned: s.stats.totalEarned + weeklyRevenue },
  }, { category: 'streaming', amount: weeklyRevenue, cashEffect: weeklyRevenue, classification: 'income', description: 'Weekly streaming subscription revenue' })
}

/**
 * Auto-release: every finished title (movie/series/show) lands on the platform
 * N weeks after its theatrical release. Runs every tick — cheap scan.
 */
function autoReleaseToPlatform(s: GameState): GameState {
  const p = s.myStreamingPlatform
  if (!p.active || !p.autoRelease) return s
  const delay = Math.max(0, Math.round(p.autoReleaseDelay))

  const candidates = s.movies.filter(m =>
    m.finished
    && m.releaseWeek > 0
    && s.week - m.releaseWeek >= delay
    && !p.contentLibrary.some(c => c.movieId === m.id)
  )
  if (candidates.length === 0) return s

  const library = [...p.contentLibrary]
  let maxSubs = p.maxSubscribers
  const titles: string[] = []
  for (const m of candidates) {
    const qualityDraw = m.quality * 10
    const sequelDraw = m.part > 1 ? 5000 : 0
    const draw = Math.round(qualityDraw + sequelDraw + rand(1000, 5000))
    const viewsPerWeek = Math.round(m.quality * m.hype * rand(50, 200))
    library.push({
      movieId: m.id,
      title: m.title,
      genre: m.genre,
      quality: m.quality,
      contentType: m.contentType || 'movie',
      seasons: m.seasons,
      addedWeek: s.week,
      viewsPerWeek,
      subscriberDraw: draw,
    })
    maxSubs += draw
    titles.push(`"${m.title}"`)
  }

  return {
    ...s,
    stats: { ...s.stats, streamingReleases: s.stats.streamingReleases + candidates.length },
    myStreamingPlatform: { ...p, contentLibrary: library, maxSubscribers: maxSubs },
    log: [
      news(s.week, `📺 Auto-release: ${candidates.length} title${candidates.length > 1 ? 's' : ''} arrived on ${p.name} (${titles.slice(0, 3).join(', ')}${titles.length > 3 ? '…' : ''}).`, 'good'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
}

/** Toggle auto-release of finished titles to the platform */
export function setAutoRelease(s: GameState, enabled: boolean): GameState {
  const p = s.myStreamingPlatform
  if (!p.active) return s
  return {
    ...s,
    myStreamingPlatform: { ...p, autoRelease: enabled },
    log: [
      news(s.week, enabled
        ? `📺 Auto-release ON — every title lands on ${p.name} automatically after ${p.autoReleaseDelay} weeks.`
        : `📺 Auto-release OFF — you decide what goes on ${p.name}.`, 'info'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
}

/** Set how many weeks after theatrical release a title auto-arrives on the platform */
export function setAutoReleaseDelay(s: GameState, weeks: number): GameState {
  const p = s.myStreamingPlatform
  if (!p.active) return s
  const clamped = Math.max(0, Math.min(520, Math.round(weeks)))
  return {
    ...s,
    myStreamingPlatform: { ...p, autoReleaseDelay: clamped },
    log: [
      news(s.week, `📺 Auto-release delay set to ${clamped} weeks after theatrical release.`, 'info'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
}

/** Remove content from your streaming platform */
export function removeFromPlatform(s: GameState, movieId: string): GameState {
  const p = s.myStreamingPlatform
  if (!p.active) return s
  const content = p.contentLibrary.find(c => c.movieId === movieId)
  if (!content) return s
  
  const subsLost = content.subscriberDraw
  return {
    ...s,
    myStreamingPlatform: {
      ...p,
      contentLibrary: p.contentLibrary.filter(c => c.movieId !== movieId),
      maxSubscribers: Math.max(0, p.maxSubscribers - subsLost),
      subscribers: Math.max(0, p.subscribers - Math.round(subsLost * 0.3)),
    },
    log: [
      news(s.week, `📺 "${content.title}" removed from ${p.name}.`, 'info'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
}

// ---------------------------------------------------------------------------
// AD-SUPPORTED FREE TIER — free viewers watch with ads, advertisers pay YOU
// ---------------------------------------------------------------------------

/** Enable or disable the free ad-supported tier */
export function toggleAdTier(s: GameState, enabled: boolean): GameState {
  const p = s.myStreamingPlatform
  if (!p.active) return s
  return {
    ...s,
    myStreamingPlatform: { ...p, adTierEnabled: enabled },
    log: [
      news(s.week, enabled
        ? `📺 ${p.name} opens a FREE ad-supported tier — anyone can watch, you earn per ad.`
        : `📺 ${p.name} closes the free ad tier.`, 'info'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
}

/** Set how many ad breaks you force into each movie (the more, the more money, the more churn) */
export function setAdsPerMovie(s: GameState, count: number): GameState {
  const p = s.myStreamingPlatform
  if (!p.active) return s
  const clamped = Math.max(0, Math.min(50, Math.round(count)))
  return {
    ...s,
    myStreamingPlatform: { ...p, adsPerMovie: clamped },
    log: [
      news(s.week, `📢 Ad load set to ${clamped} ads per movie.`, 'info'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
}

/** Set your ad rate card — multiplier on what advertisers pay you */
export function setAdRateCard(s: GameState, multiplier: number): GameState {
  const p = s.myStreamingPlatform
  if (!p.active) return s
  const clamped = Math.max(0.5, Math.min(20, Math.round(multiplier * 10) / 10))
  return {
    ...s,
    myStreamingPlatform: { ...p, adRateCard: clamped },
    log: [
      news(s.week, `💵 Ad rate card set to ${clamped}× standard rates.`, 'info'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
}

/** Set the weekly price for the ad-free subscription tier */
export function setAdFreePrice(s: GameState, price: number): GameState {
  const p = s.myStreamingPlatform
  if (!p.active) return s
  const clamped = Math.max(1, Math.min(100, Math.round(price * 100) / 100))
  return {
    ...s,
    myStreamingPlatform: { ...p, adFreePrice: clamped },
    log: [
      news(s.week, `⭐ Ad-free tier priced at $${clamped.toFixed(2)}/week.`, 'info'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
}

/** Accept an advertiser deal — 30-year contract, removes the pending offer */
export function acceptAdDeal(s: GameState, dealId: string): GameState {
  const p = s.myStreamingPlatform
  if (!p.active) return s
  const offer = pendingAdDeals(s).find(d => d.id === dealId)
  if (!offer) return s
  const deal: import('./types').AdvertiserDeal = { ...offer, weeksRemaining: 1560, breached: false }
  return {
    ...s,
    myStreamingPlatform: {
      ...p,
      adDeals: [
        ...p.adDeals.filter(d => d.id !== dealId), // remove the pending offer
        deal,
      ],
    },
    log: [
      news(s.week, `🤝 Signed ${offer.company} ad deal: ${fmt(offer.weeklyPayment)}/week for 30 years on ${offer.movieTitle || 'all content'}.`, 'gold'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
}

/** Decline an advertiser offer (it just expires) */
export function declineAdDeal(s: GameState, _dealId: string): GameState {
  const p = s.myStreamingPlatform
  return { ...s, myStreamingPlatform: { ...p, adDeals: p.adDeals } }
}

/** Generate advertiser offers — each tied to a specific movie, 30+ companies, max 8 pending */
function rollAdOffers(s: GameState, _events: string[]): GameState {
  const p = s.myStreamingPlatform
  if (!p.adTierEnabled || p.freeViewers < 10_000) return s

  const companies = [
    'CocaVola', 'MegaMart', 'Zephyr Motors', 'NovaTel', 'Burger Forge',
    'Glamour Cosmetics', 'Titan Energy', 'PixelPlay Games', 'CloudNine Airlines',
    'Fortune Insurance', 'SilverBank', 'Orbit Soda', 'Zenith Perfume',
    'Atlas Auto', 'Crimson Brew', 'Pacific Snacks', 'Horizon Telecom',
    'Apex Insurance', 'Summit Travel', 'Eclipse Cosmetics', 'Pinnacle Tech',
    'Lunar Games', 'Nova Bio', 'Sterling Bank', 'Orbit Airlines',
    'Vortex Motors', 'Quantum Labs', 'Cobalt Steel', 'Solaria Energy',
    'Radiant Jewel', 'Ember Foods', 'Tidal Swim', 'Nimbus Cloud',
    'Zenith Media', 'Prism Optics', 'Aurora Health', 'Crest Pharma',
    'Gale Outdoor', 'Terra Farm', 'Icicle Ice Cream', 'Fusion Gym',
  ]

  // Determine how many offers to roll this week (1-3, with 70% chance)
  if (Math.random() > 0.7) return s
  const numOffers = Math.floor(rand(1, 4)) // 1, 2, or 3 offers per week
  const pending = p.adDeals.filter(d => d.weeksRemaining <= 0 && d.weeksRemaining > -8)
  const availableSlots = Math.max(0, 8 - pending.length) // max 8 pending
  const offersToAdd = Math.min(numOffers, availableSlots)
  if (offersToAdd <= 0) return s

  // Pick companies that don't already have an offer for the same movie
  // (same company CAN advertise on multiple movies)
  const availableMovies = p.contentLibrary.slice() // every title is fair game
  if (availableMovies.length === 0) return s

  const newDeals: import('./types').AdvertiserDeal[] = []
  const usedMovies = new Set<string>()
  const usedCompanyMovies = new Set<string>() // track company+movie combos in this batch

  for (let i = 0; i < offersToAdd; i++) {
    const movie = pick(availableMovies.filter(m => !usedMovies.has(m.movieId)))
    if (!movie) break
    usedMovies.add(movie.movieId)

    const company = pick(companies.filter(c => {
      // No duplicate offer from same company for the same movie (check both existing AND this batch)
      const key = c + '|' + movie.movieId
      if (usedCompanyMovies.has(key)) return false
      return !p.adDeals.some(d => d.company === c && d.movieId === movie.movieId)
    }))
    if (!company) continue
    usedCompanyMovies.add(company + '|' + movie.movieId)

    // Payment scales with: audience × movie quality × rate card
    const movieBonus = movie.quality * 0.01 // q100 → 1×, q50 → 0.5×
    const base = p.freeViewers * 5 * p.adRateCard * movieBonus
    const weeklyPayment = Math.round(base * rand(0.7, 1.4))

    newDeals.push({
      id: uid(),
      company,
      weeklyPayment,
      cpmBonus: rand(0.01, 0.10),
      minViewers: Math.round(p.freeViewers * rand(0.5, 0.8)),
      weeksRemaining: 0,
      breached: false,
      movieId: movie.movieId,
      movieTitle: movie.title,
    })
  }

  if (newDeals.length === 0) return s
  return {
    ...s,
    myStreamingPlatform: { ...p, adDeals: [...p.adDeals, ...newDeals] },
  }
}

/** Offers waiting for a decision (weeksRemaining <= 0, not yet expired at -8) */
export function pendingAdDeals(s: GameState): import('./types').AdvertiserDeal[] {
  return s.myStreamingPlatform.adDeals.filter(d => d.weeksRemaining <= 0 && d.weeksRemaining > -8)
}

/** The full weekly ad economy tick — called from tick() */
function collectAdRevenue(s: GameState, events: string[]): GameState {
  const p0 = s.myStreamingPlatform
  if (!p0.active) return s

  // --- 6. New advertiser offers roll in first so they're visible this week ---
  let s2 = rollAdOffers(s, events)
  const p = s2.myStreamingPlatform
  if (!p.adTierEnabled || p.contentLibrary.length === 0) return s2

  // --- 1. Free viewer growth (ad tier pulls a MUCH bigger audience than subs) ---
  const avgQuality = p.contentLibrary.reduce((sum, c) => sum + c.quality, 0) / p.contentLibrary.length
  const libraryBonus = p.contentLibrary.length * 3000
  // Free tier grows ~6x faster than the sub tier — friction is zero
  const rawGrowth = avgQuality * 120 + libraryBonus
  const newViewers = Math.max(0, Math.round(rawGrowth * rand(0.5, 1.5)))
  // ad load churns free viewers — more than 10 ads per movie starts driving people away
  const adChurn = Math.max(0, p.adsPerMovie - 10) * p.freeViewers * 0.004
  const churned = Math.round(p.freeViewers * 0.04 * rand(0.8, 1.2) + adChurn)
  const maxFree = p.maxSubscribers * 12 + libraryBonus * 20
  const freeViewers = Math.max(0, Math.min(maxFree, p.freeViewers + newViewers - churned))

  // --- 2. Ad views served: every movie watched = adsPerMovie ads shown ---
  const viewsThisWeek = p.contentLibrary.reduce((sum, c) => sum + c.viewsPerWeek, 0)
  const adsShown = Math.round(viewsThisWeek * p.adsPerMovie)

  // --- 3. Ad revenue: per-ad rate × ads shown × rate card + deal CPM bonuses ---
  const dealCpm = p.adDeals.filter(d => d.weeksRemaining > 0).reduce((sum, d) => sum + d.cpmBonus, 0)
  const perAd = (0.05 + dealCpm) * p.adRateCard // $0.05 base per ad view, deals boost it
  const weeklyAdRevenue = Math.round(adsShown * perAd)

  // --- 4. Advertiser deals pay out weekly (deduped by id — defensive) ---
  let dealIncome = 0
  const seenIds = new Set<string>()
  const surviving: import('./types').AdvertiserDeal[] = []
  let pendingCount = 0
  for (const d0 of p.adDeals) {
    const d = { ...d0 }
    if (d.weeksRemaining <= 0) {
      // pending offers (0) or countdown (-1 to -7): expire after 8 weeks if not signed
      d.weeksRemaining -= 1
      if (d.weeksRemaining <= -8) {
        addLog(s2, events, `📄 ${d.company} withdrew their ad offer for "${d.movieTitle || 'all content'}".`, 'info')
        continue
      }
      if (pendingCount < 8) { surviving.push(d); pendingCount++ }
      continue
    }
    // Extend any old short SIGNED deals to 30 years (migration-in-place)
    // Only extend if already accepted (weeksRemaining > 0) — don't extend pending offers
    if (d.weeksRemaining > 0 && d.weeksRemaining < 1560) {
      d.weeksRemaining = 1560
    }
    if (seenIds.has(d.id)) continue // dedupe only by id, same company can have multiple deals
    seenIds.add(d.id)
    // Cap total active deals at 50 to prevent unbounded growth
    if (surviving.length >= 50) {
      addLog(s2, events, `📄 ${d.company} deal skipped — max 50 active deals reached.`, 'info')
      continue
    }
    if (freeViewers < d.minViewers) {
      if (!d.breached) {
        d.breached = true
        addLog(s2, events, `⚠️ ${d.company} warns: audience fell below ${d.minViewers.toLocaleString()} viewers for "${d.movieTitle || 'all content'}". Contract at risk.`, 'bad')
      }
    } else {
      d.breached = false
    }
    dealIncome += d.weeklyPayment
    d.weeksRemaining -= 1
    if (d.weeksRemaining > 0) surviving.push(d)
    else addLog(s2, events, `📄 ${d.company} ad deal expired after 30 years.`, 'info')
  }

  // --- 5. Ad-free tier: some free viewers upgrade to skip ads ---
  // At $10/wk, roughly 8% of free viewers convert over time; higher price = fewer
  const upgradeRate = Math.max(0.005, 0.10 - (p.adFreePrice - 10) * 0.006)
  const upgrades = Math.round(freeViewers * upgradeRate * rand(0.05, 0.15) * (p.adsPerMovie > 8 ? 1.5 : 1))
  // Heavy ad load pushes people to upgrade; but upgrades leave the ad pool
  const adFreeSubscribers = Math.min(p.maxSubscribers, p.adFreeSubscribers + upgrades)
  const freeAfterUpgrades = Math.max(0, freeViewers - upgrades)
  const subRevenue = Math.round(adFreeSubscribers * p.adFreePrice)

  const totalAdCash = weeklyAdRevenue + dealIncome + subRevenue

  if (weeklyAdRevenue > 0) {
    addLog(s2, events, `📢 Ads served: ${adsShown.toLocaleString()} views → ${fmt(weeklyAdRevenue)} ad revenue${dealIncome > 0 ? ` + ${fmt(dealIncome)} from advertisers` : ''}.`, 'good')
  }

  return recordLedger({
    ...s2,
    cash: s2.cash + totalAdCash,
    stats: { ...s2.stats, totalEarned: s2.stats.totalEarned + totalAdCash },
    myStreamingPlatform: {
      ...p,
      freeViewers: freeAfterUpgrades,
      maxFreeViewers: maxFree,
      adsShownLastWeek: adsShown,
      weeklyAdRevenue,
      totalAdRevenue: p.totalAdRevenue + weeklyAdRevenue,
      adDeals: surviving,
      adFreeSubscribers,
      totalSubRevenue: p.totalSubRevenue + subRevenue,
    },
  }, { category: 'streaming', amount: totalAdCash, cashEffect: totalAdCash, classification: 'income', description: 'Weekly advertising and ad-free subscription revenue' })
}
