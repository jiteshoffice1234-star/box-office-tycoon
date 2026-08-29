import { clamp, rand } from './formulas'
import {
  GENRES,
  GENRE_NAMES,
  START_CASH,
  BANKRUPT_AT,
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
  awardScore,
  deptBalance,
  productionWeeks,
  dateInfo,
  timingMultiplier,
} from './formulas'
import type {
  AiStudio,
  Achievement,
  AwardsCampaign,
  AwardEntry,
  DepartmentAlloc,
  GameState,
  Genre,
  Investment,
  Loan,
  LoanFrequency,
  Manager,
  MerchandiseDeal,
  Movie,
  NewsItem,
  Production,
  RandomEvent,
  Role,
  Script,
  Talent,
} from './types'

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

let idCounter = 0
const uid = (): string => `g${++idCounter}_${Math.floor(Math.random() * 1e6)}`

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
  const names = ['Horizon Pictures', 'Sable Entertainment', 'Ironwood Films', 'Northgate Studios', 'Vesper Media']
  return shuffled(names).slice(0, 3).map((name, i) => ({
    name, nextReleaseWeek: Math.round(rand(4, 14)) + i * 3,
    budget: rand(0.8, 4) * 1_000_000, quality: rand(45, 62),
    genre: pick(GENRES).name, aggression: rand(0.3, 0.7),
    streaming: Math.random() < 0.3,
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
    talents: initialTalents(),
    scripts: [],
    market,
    production: null,
    movies: [],
    aiMovies: [],
    aiStudios: initAiStudios(),
    awards: [],
    nextAwardYear: 1,
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
    stats: { moviesMade: 0, totalEarned: 0, totalSpent: 0, awardsWon: 0, blockbusters: 0, disasters: 0, seriesMade: 0, franchises: 0, boxOfficeRecords: [], achievements: [], streamingReleases: 0, awardsCampaigns: 0, merchandiseEarned: 0, soundtrackEarned: 0, commentaryAdded: 0, internationalDeals: 0, totalMerchandise: 0, totalSoundtrack: 0 },
    loans: [],
    investments: [],
    managers: [],
    nextManagerIdx: 0,
    managerProductions: [],
    createdAt: Date.now(),
    randomEvents: [], activeEvent: null, genreTrends: [],
    awardsCampaigns: [], talentRivalries: [], merchandiseDeals: [],
    directorCommentaries: [], streamingPlatform: false, internationalMarkets: false,
    lastEventWeek: 0,
  }
}

// ---------------------------------------------------------------------------
// decision / fast forward
// ---------------------------------------------------------------------------

export function decisionNeeded(s: GameState): string | null {
  if (s.gameOver) return null
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

  // ---- weekly studio overhead
  const overhead = 15_000 + st.reputation * 250
  st.cash -= overhead

  // ---- random events (every 8-12 weeks) ----
  if (st.week - st.lastEventWeek >= Math.round(rand(8, 12))) {
    const eventTypes: Array<{ type: RandomEvent['type']; titles: string[]; descs: string[]; effect: RandomEvent['effect'] }> = [
      { type: 'scandal', titles: ['Star Caught in Scandal', 'Director Controversy', 'Producer Fraud'], descs: ['Audiences boycott the opening', 'Negative press coverage', 'Investors pull funding'], effect: 'negative' },
      { type: 'viral', titles: ['Trailer Goes Viral', 'Meme Takes Over', 'Fan Campaign Explodes'], descs: ['Social media buzz doubles', 'Organic marketing surge', 'Audience anticipation skyrockets'], effect: 'positive' },
      { type: 'weather', titles: ['Hurricane Hits Coast', 'Blizzard Shuts Down', 'Heat Wave Warning'], descs: ['Theater attendance drops 40%', 'Opening weekend delayed', 'Families stay home'], effect: 'negative' },
      { type: 'strike', titles: ['Writers Strike', 'Actors Walk Out', 'Crew Union Action'], descs: ['Production halted indefinitely', 'Delays cost millions', 'Release pushed back'], effect: 'negative' },
      { type: 'award_buzz', titles: ['Award Season Buzz', 'Critics Rave', 'Festival Standing Ovation'], descs: ['Oscar buzz builds', 'Reviews overwhelmingly positive', 'Awards campaigns gain traction'], effect: 'positive' },
      { type: 'leak', titles: ['Script Leaked Online', 'Plot Twist Revealed', 'Behind-the-Scenes Drama'], descs: ['Piracy concerns spike', 'Audience expectations shift', 'Curiosity drives traffic'], effect: 'neutral' },
      { type: 'rival_release', titles: ['Rival Drops Surprise Release', 'Competitor Announces Sequel', 'Studio War Escalates'], descs: ['Box office competition intensifies', 'Audience splits between films', 'Marketing costs rise'], effect: 'negative' },
      { type: 'streaming_war', titles: ['Streaming Giant Enters', 'Platform Price War', 'Exclusive Deal Announced'], descs: ['Theater chains lose leverage', 'Distribution costs rise', 'New revenue streams open'], effect: 'neutral' },
      { type: 'talent_feud', titles: ['Co-Stars Public Feud', 'Director vs Studio', 'Actor Demands Reshoots'], descs: ['Production turmoil', 'Publicity nightmare', 'Budget overruns'], effect: 'negative' },
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
      magnitude: Math.round(rand(20, 80)),
      resolved: false,
    };
    st.randomEvents = [...st.randomEvents, evt].slice(-20);
    st.activeEvent = evt;
    st.lastEventWeek = st.week;
    addLog(st, events, evt.title + ' — ' + evt.description, evt.effect === 'positive' ? 'good' : evt.effect === 'negative' ? 'bad' : 'info');
    // Apply effect to in-production movies
    if (evt.effect === 'negative') {
      for (const m of st.movies.filter(m => m.phase === 'inTheaters')) {
        m.hype = clamp(m.hype - evt.magnitude * 0.3, 0, 100);
      }
    } else if (evt.effect === 'positive') {
      for (const m of st.movies.filter(m => m.phase === 'inTheaters')) {
        m.hype = clamp(m.hype + evt.magnitude * 0.2, 0, 100);
      }
    }
  }

  // ---- manager salaries (weekly, for every active manager)
  for (const m of st.managers) {
    if (m.active && m.weeklySalary > 0) st.cash -= m.weeklySalary
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
      const spend = strat.pct * prod.movie.productionBudget
      st.cash -= spend
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
        const spend = strat.pct * prod.movie.productionBudget
        st.cash -= spend
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
          if (!movie.isDisaster && mgr && movie.part < 6 && movie.totalGross > 0 && movie.totalGross >= movie.cost * 2.5) {
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
              cancelled: false,               releaseWindow: 'theatrical' as const, streamingRevenue: 0, merchandiseRevenue: 0, soundtrackRevenue: 0, commentaryActive: false, awardsCampaignActive: false, awardsBuzz: 0, hasMerchandise: false, internationalDeal: false,
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
              st = { ...st, cash: st.cash - t.asking, talents: st.talents.map((x) => (x.id === t.id ? hired : x)) }
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
              st = { ...st, cash: st.cash - budget }
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
          const gain = clamp(m.totalGross / Math.max(m.cost, 1), 0, 4) * 6 + m.quality * 0.25
          st.reputation = clamp(Math.round(st.reputation + gain), 0, REP_MAX)
          if (m.totalGross >= 100_000_000) st.stats.blockbusters += 1
          const profit = m.revenue - m.cost
          if (profit > 0) {
            addLog(st, events, `"${m.title}" finished its run: ${fmt(m.totalGross)} total, profit ${fmt(profit)}.`, 'good')
          } else {
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
        st.stats.totalEarned += share
      } else if (m.owner === 'distributed') {
        const share = g * 0.5
        m.revenue += share
        st.cash += share
        st.stats.totalEarned += share
      } else if (m.owner === 'ai') {
        // player investment stakes earn a slice of the gross each week
        for (const inv of st.investments) {
          if (inv.movieId === m.id && !inv.settled) {
            const pay = Math.round((inv.amount / Math.max(m.productionBudget, 1)) * g)
            if (pay > 0) {
              st.cash += pay
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
        loan.outstanding -= pay
        loan.collectionsDone += 1
        if (loan.outstanding <= 0) {
          addLog(st, events, `🏦 Your ${fmt(loan.principal)} loan is fully repaid.`, 'good')
        } else {
          loan.nextDueWeek = week + loan.intervalWeeks
          nextLoans.push(loan)
        }
      } else {
        const total = Math.round(loan.principal * (1 + loan.rate))
        const final = loan.collectionsDone + 1 >= loan.totalCollections
        const pay = final ? total - loan.received : loan.installment
        st.cash += pay
        loan.received += pay
        loan.collectionsDone += 1
        if (final) {
          addLog(
            st,
            events,
            `🏦 Loan to ${loan.studioName} fully repaid: ${fmt(loan.received)} received (+${fmt(loan.received - loan.principal)}).`,
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

  // ---- yearly awards
  if (week % 52 === 0) {
    const completedYear = dateInfo(week).year - 1
    const candidates: AwardEntry[] = []
    for (const m of [...st.movies, ...st.aiMovies]) {
      if (m.releasedYear === completedYear && m.quality >= 55) {
        candidates.push({
          movieId: m.id,
          title: m.title,
          genre: m.genre,
          quality: m.quality,
          owner: m.owner,
          studioName: m.studioName,
          won: false,
        })
      }
    }
    candidates.sort((a, b) => awardScore(b.quality, b.genre) - awardScore(a.quality, a.genre))
    const nominees = candidates.slice(0, 5)
    if (nominees.length > 0) {
      const winner = nominees[0]
      winner.won = true
      const year = { year: completedYear, nominees, winner }
      st.awards = [year, ...st.awards].slice(0, 5)
      if (winner.owner === 'player' || winner.owner === 'distributed') {
        const bonus = 1_500_000 + winner.quality * 60_000
        st.cash += bonus
        st.reputation = clamp(st.reputation + 20, 0, REP_MAX)
        st.stats.awardsWon += 1
        addLog(
          st,
          events,
          `🏆 Year ${completedYear} awards: "${winner.title}" wins Best Picture! +${fmt(bonus)}, +20 reputation.`,
          'gold',
        )
      } else {
        addLog(st, events, `🏆 ${completedYear} awards: "${winner.title}" (${winner.studioName}) wins Best Picture.`, 'info')
      }
    }
  }


  // ---- achievements ----
  {
    const checks: Array<{ id: string; name: string; desc: string; icon: string; cond: boolean }> = [
      { id: 'first_movie', name: 'First Light', desc: 'Release your first movie', icon: '🎬', cond: st.stats.moviesMade >= 1 },
      { id: 'blockbuster', name: 'Blockbuster', desc: 'Earn $100M+ opening', icon: '💥', cond: st.movies.some(m => m.opening >= 100_000_000) },
      { id: 'billionaire', name: 'Billionaire', desc: 'Reach $1B cash', icon: '💰', cond: st.cash >= 1_000_000_000 },
      { id: 'franchise_king', name: 'Franchise King', desc: 'Reach Part 5', icon: '👑', cond: st.stats.franchises >= 5 },
      { id: 'series_maker', name: 'Series Maker', desc: 'Release 10 series/shows', icon: '📺', cond: st.stats.seriesMade >= 10 },
      { id: 'disaster_avoider', name: 'Disaster Avoider', desc: 'Make 20 movies with 0 disasters', icon: '🛡️', cond: st.stats.moviesMade >= 20 && st.stats.disasters === 0 },
      { id: 'awards_sweep', name: 'Awards Sweep', desc: 'Win 5 awards', icon: '🏆', cond: st.stats.awardsWon >= 5 },
      { id: 'global_major', name: 'Global Major', desc: 'Reach 220 reputation', icon: '🌍', cond: st.reputation >= 220 },
      { id: 'streaming_giant', name: 'Streaming Giant', desc: 'Release 5 movies on streaming', icon: '📡', cond: st.stats.streamingReleases >= 5 },
      { id: 'merch_mogul', name: 'Merch Mogul', desc: 'Sign 10 merchandise deals', icon: '🧸', cond: st.merchandiseDeals.length >= 10 },
      { id: 'record_breaker', name: 'Record Breaker', desc: 'Set 3 box office records', icon: '📊', cond: st.stats.boxOfficeRecords.length >= 3 },
      { id: 'hundred_movies', name: 'Century Club', desc: 'Make 100 movies', icon: '🎞️', cond: st.stats.moviesMade >= 100 },
      { id: 'trillionaire', name: 'Trillionaire', desc: 'Earn $1T total', icon: '🏦', cond: st.stats.totalEarned >= 1_000_000_000_000 },
      { id: 'hall_of_fame', name: 'Hall of Fame', desc: 'Win 10 awards', icon: '⭐', cond: st.stats.awardsWon >= 10 },
    ];
    for (const ach of checks) {
      const existing = st.stats.achievements.find(a => a.id === ach.id);
      if (!existing && ach.cond) {
        const unlocked: Achievement = { id: ach.id, name: ach.name, description: ach.desc, icon: ach.icon, unlocked: true, unlockedWeek: st.week, condition: ach.desc };
        st.stats.achievements = [...st.stats.achievements, unlocked];
        addLog(st, events, ach.icon + ' ACHIEVEMENT UNLOCKED: ' + ach.name + ' — ' + ach.desc, 'gold');
      }
    }
  }

  // ---- bankruptcy
  if (st.cash < BANKRUPT_AT) {
    st.gameOver = true
    addLog(st, events, '💀 Your studio is bankrupt. The lights have gone out.', 'bad')
  }

  // ---- hired managers keep the pipeline moving
  if (!st.gameOver) {
    st = managerMakeMovie(st, events)
  }

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
    isDisaster: false, seasons: 0, episodesPerSeason: 0, viewership: 0, cancelled: false, releaseWindow: 'theatrical' as const, streamingRevenue: 0, merchandiseRevenue: 0, soundtrackRevenue: 0, commentaryActive: false, awardsCampaignActive: false, awardsBuzz: 0, hasMerchandise: false, internationalDeal: false, }
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
  return {
    ...s,
    cash: s.cash - cost,
    scripts: [...s.scripts, script],
    log: [
      news(s.week, `✍️ You wrote a ${label} script "${title}" (${genre}, quality ${q}) for ${fmt(cost)}.`, 'good'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
}

export function buyScript(s: GameState, scriptId: string): GameState {
  const sc = s.market.find((x) => x.id === scriptId)
  if (!sc || s.cash < sc.price) return s
  return {
    ...s,
    cash: s.cash - sc.price,
    market: s.market.filter((x) => x.id !== scriptId),
    scripts: [...s.scripts, sc],
    log: [
      news(s.week, `📜 Bought spec script "${sc.title}" (${sc.genre}, quality ${sc.quality}) for ${fmt(sc.price)}.`, 'good'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
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
    cancelled: false,               releaseWindow: 'theatrical' as const, streamingRevenue: 0, merchandiseRevenue: 0, soundtrackRevenue: 0, commentaryActive: false, awardsCampaignActive: false, awardsBuzz: 0, hasMerchandise: false, internationalDeal: false,
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
  return {
    ...s,
    cash: s.cash - offerAmt,
    talents: s.talents.map((x) => (x.id === t.id ? hired : x)),
    production: prod,
    log: [
      news(
        s.week,
        offerAmt < t.asking
          ? `✒️ ${t.name} accepted your counter-offer of ${fmt(offerAmt)}.`
          : `✒️ Signed ${t.name} for ${fmt(offerAmt)}.`,
        'good',
      ),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
}

/** Remove a cast member from the current production (they keep the money). */
export function dropCast(s: GameState, talentId: string): GameState {
  if (!s.production || s.production.phase !== 'preProduction') return s
  const t = findTalent(s, talentId)
  if (!t) return s
  const prod = { ...s.production, movie: { ...s.production.movie } }
  if (prod.movie.writerId === talentId) prod.movie.writerId = null
  else if (prod.movie.directorId === talentId) prod.movie.directorId = null
  else prod.movie.actorIds = prod.movie.actorIds.filter((id) => id !== talentId)
  return {
    ...s,
    production: prod,
    log: [news(s.week, `${t.name} was dropped from "${prod.movie.title}".`, 'info'), ...s.log].slice(0, LOG_CAP),
  }
}

/** Pay the production budget and start filming. */
export function startProduction(s: GameState, depts: DepartmentAlloc): GameState {
  if (!s.production || s.production.phase !== 'preProduction') return s
  const movie = s.production.movie
  const c = castOf(s, movie)
  if (!c.writer || !c.director || c.actors.length === 0) return s
  const budget = Object.values(depts).reduce((sum, v) => sum + v, 0)
  if (budget <= 0) return s
  const tier = tierForRep(s.reputation)
  if (budget > tier.maxBudget) return s
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
  return {
    ...s,
    cash: s.cash - budget,
    production: prod,
    log: [
      news(s.week, `🎬 Production begins on "${movie.title}" — ${fmt(budget)} budget, ${weeks} weeks of filming. Estimated quality ${q}.`, 'good'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
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

/** Start an awards campaign for a released movie — spend weekly to build buzz. */
export function startAwardsCampaign(s: GameState, movieId: string, spendPerWeek: number): GameState {
  const m = s.movies.find(x => x.id === movieId)
  if (!m || m.owner !== 'player' || m.phase === 'done') return s
  if (s.awardsCampaigns.some(c => c.movieId === movieId)) return s
  const spend = Math.round(spendPerWeek)
  if (spend < 100_000 || s.cash < spend) return s
  const campaign: AwardsCampaign = { movieId, spendPerWeek: spend, active: true, weeksRunning: 0, totalSpent: 0, buzz: 0 }
  return {
    ...s,
    cash: s.cash - spend,
    awardsCampaigns: [...s.awardsCampaigns, campaign],
    stats: { ...s.stats, awardsCampaigns: s.stats.awardsCampaigns + 1 },
    log: [
      news(s.week, `🏆 Awards campaign launched for "${m.title}" — spending ${fmt(spend)}/week to build buzz.`, 'gold'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
}

/** Add director commentary to boost evergreen earnings. */
export function addDirectorCommentary(s: GameState, movieId: string): GameState {
  const m = s.movies.find(x => x.id === movieId)
  if (!m || m.owner !== 'player' || m.commentaryActive) return s
  if (m.quality < 60) return s
  const cost = Math.round(m.cost * 0.05)
  if (s.cash < cost) return s
  return {
    ...s,
    cash: s.cash - cost,
    movies: s.movies.map(x => x.id === movieId ? { ...x, commentaryActive: true } : x),
    stats: { ...s.stats, commentaryAdded: (s.stats.commentaryAdded || 0) + 1 },
    log: [
      news(s.week, `🎬 Director commentary added to "${m.title}" for ${fmt(cost)}. Evergreen earnings boosted!`, 'good'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
}

/** Choose streaming release for the current production. */
export function setStreamingRelease(s: GameState): GameState {
  if (!s.production) return s
  const movie = s.production.movie
  return {
    ...s,
    production: { ...s.production, movie: { ...movie, releaseWindow: 'streaming' } },
    stats: { ...s.stats, streamingReleases: s.stats.streamingReleases + 1 },
    log: [
      news(s.week, `📡 "${movie.title}" will release on your streaming platform — guaranteed revenue!`, 'info'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
}

/** Sign a merchandise deal for a hit movie. */
export function signMerchandiseDeal(s: GameState, movieId: string): GameState {
  const m = s.movies.find(x => x.id === movieId)
  if (!m || m.owner !== 'player' || m.hasMerchandise || m.quality < 70) return s
  if (m.totalGross < m.cost * 2) return s
  const types: MerchandiseDeal['type'][] = ['toys', 'clothing', 'video_game', 'book', 'theme_park']
  const type = types[Math.floor(Math.random() * types.length)]
  const weeklyRev = Math.round(m.opening * 0.001 * (m.quality / 100))
  if (weeklyRev < 1000) return s
  const deal: MerchandiseDeal = { movieId: m.id, type, revenuePerWeek: weeklyRev, active: true, weeksRemaining: Math.round(rand(52, 156)) }
  return {
    ...s,
    movies: s.movies.map(x => x.id === movieId ? { ...x, hasMerchandise: true } : x),
    merchandiseDeals: [...s.merchandiseDeals, deal],
    log: [
      news(s.week, `🧸 Merchandise deal signed for "${m.title}" — ${type} line launches! +${fmt(weeklyRev)}/week.`, 'gold'),
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
    cancelled: false,               releaseWindow: 'theatrical' as const, streamingRevenue: 0, merchandiseRevenue: 0, soundtrackRevenue: 0, commentaryActive: false, awardsCampaignActive: false, awardsBuzz: 0, hasMerchandise: false, internationalDeal: false,
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
  return {
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
  }
}

/** Repay a borrow loan in full, immediately. */
export function payOffLoan(s: GameState, loanId: string): GameState {
  const loan = s.loans.find((l) => l.id === loanId && l.kind === 'borrow')
  if (!loan) return s
  if (s.cash < loan.outstanding) return s
  return {
    ...s,
    cash: s.cash - loan.outstanding,
    loans: s.loans.filter((l) => l.id !== loanId),
    log: [
      news(s.week, `🏦 You paid off your ${fmt(loan.principal)} loan early (${fmt(loan.outstanding)} total).`, 'good'),
      ...s.log,
    ].slice(0, LOG_CAP),
  }
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
  return {
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
  }
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
  return {
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
  }
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
  },
): GameState {
  const salary = Math.round(opts.weeklySalary)
  if (!Number.isFinite(salary) || salary < 1_000 || salary > MAX_LOAN_AMOUNT) return s
  const budget = Math.round(opts.maxBudget)
  if (!Number.isFinite(budget) || budget < 500_000 || budget > MAX_LOAN_AMOUNT) return s
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
  }
  return {
    ...s,
    managers: [...s.managers, manager],
    log: [
      news(
        s.week,
        `👔 Hired ${manager.name} for ${fmt(salary)}/week. They'll write, cast, produce, market, and release movies in parallel with your other managers.`,
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
  const idle = active.filter((m) => !hasProd(m.id))
  if (idle.length === 0) return s

  let st: GameState = { ...s }
  for (const mgr of idle) {
    // no cash gate — managers always try to start a movie

    // managers randomly produce series/shows ~25% of the time
    const mgrContentType: 'movie' | 'series' | 'show' = Math.random() < 0.15 ? 'series' : Math.random() < 0.12 ? 'show' : 'movie'

    // 1) script — step quality down until one is affordable
    const genre: Genre = mgr.genre ?? pick(GENRE_NAMES)
    let script: Script | null = null
    for (let q = Math.round(clamp(mgr.qualityTarget, 30, 90)); q >= 35; q -= 5) {
      const cost = writeScriptCost(q)
      // script cost ignored — managers always produce
      const title = randomTitle()
      script = { id: uid(), title, genre, quality: q, price: 0, source: 'written', contentType: mgrContentType }
      st = { ...st, cash: st.cash - cost, scripts: [...st.scripts, script] }
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
      franchiseName: null,
      part: 1,
      releasedYear: 0,
      finished: false,
      phase: 'preProduction',
      isDisaster: false,
      seasons: mgrContentType !== 'movie' ? Math.floor(rand(1, 6)) : 0,
      episodesPerSeason: mgrContentType !== 'movie' ? Math.floor(rand(6, 24)) : 0,
      viewership: 0,
      cancelled: false,               releaseWindow: 'theatrical' as const, streamingRevenue: 0, merchandiseRevenue: 0, soundtrackRevenue: 0, commentaryActive: false, awardsCampaignActive: false, awardsBuzz: 0, hasMerchandise: false, internationalDeal: false,
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
      st = { ...st, cash: st.cash - t.asking, talents: st.talents.map((x) => (x.id === t.id ? hired : x)) }
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

    st = { ...st, cash: st.cash - budget }
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
    addLog(
      st,
      events,
      `👔 ${mgr.name} started a ${contentLabel} "${movie.title}" (${movie.genre}, ${fmt(budget)} budget) — handling everything from here.`,
      'info',
    )
  }

  return st
}
