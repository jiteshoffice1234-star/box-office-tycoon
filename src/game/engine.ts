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
  randomStudioName,
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
  AwardEntry,
  DepartmentAlloc,
  FestivalOffer,
  GameState,
  Genre,
  Investment,
  Loan,
  LoanFrequency,
  Manager,
  Movie,
  NewsItem,
  Production,
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
    id: uid(),
    name: randomTalentName(),
    role,
    fame,
    asking: talentPrice(fame, role),
    hiredWeek: -1,
    busyUntil: 0,
    genreAffinity: affinity,
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
  }
}

function genFestivalOffers(): FestivalOffer[] {
  const titles: string[] = []
  return Array.from({ length: 3 }, () => {
    const quality = Math.round(rand(50, 78))
    const genre = pick(GENRES).name
    const title = randomTitle(titles)
    titles.push(title)
    const pb = quality * 400_000
    const opening = computeOpening({
      quality,
      genre,
      avgActorFame: rand(30, 70),
      hype: rand(55, 85),
      releaseWeek: 30, // summer-ish
      sameWeekCompetition: 1,
      franchiseBonus: 1,
      productionBudget: pb,
    })
    const estGross = opening * 2.7 * rand(0.9, 1.25)
    return {
      id: uid(),
      title,
      genre,
      quality,
      estGross,
      asking: Math.round(estGross * rand(0.26, 0.34)),
      studioName: randomStudioName(),
    }
  })
}

function initAiStudios(): AiStudio[] {
  const names = ['Horizon Pictures', 'Sable Entertainment', 'Ironwood Films', 'Northgate Studios', 'Vesper Media']
  return shuffled(names).slice(0, 3).map((name, i) => ({
    name,
    nextReleaseWeek: Math.round(rand(4, 14)) + i * 3,
    budget: rand(0.8, 4) * 1_000_000,
    quality: rand(45, 62),
    genre: pick(GENRES).name,
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
    festival: null,
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
    stats: { moviesMade: 0, totalEarned: 0, totalSpent: 0, awardsWon: 0, blockbusters: 0, festivalsWon: 0 },
    loans: [],
    investments: [],
    managers: [],
    nextManagerIdx: 0,
    createdAt: Date.now(),
  }
}

// ---------------------------------------------------------------------------
// decision / fast forward
// ---------------------------------------------------------------------------

export function decisionNeeded(s: GameState): string | null {
  if (s.gameOver) return null
  if (s.festival && s.festival.open && !s.festival.bidPlaced) {
    return 'A film festival is open — consider bidding on distribution rights.'
  }
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
    const festivalOpened = cur.festival && cur.festival.openWeek === cur.week
    const yearEnded = cur.week % 52 === 0 && cur.week !== prevWeek
    if (released || aiReleased || festivalOpened || yearEnded) break
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
        })
        movie.releasedYear = year
        movie.phase = 'inTheaters'
        movie.status = 'Opening weekend'
        movie.releaseWeek = week
        st.movies = [...st.movies, movie]
        st.production = null
        st.stats.moviesMade += 1
        addLog(
          st,
          events,
          `🎬 "${movie.title}" opens to ${fmt(movie.opening)} on its opening weekend!`,
          movie.opening > 10_000_000 ? 'gold' : 'info',
        )
      }
    }
    if (st.production) st.production = prod
  }

  // ---- box office runs
  for (const list of [st.movies, st.aiMovies]) {
    for (const m of list) {
      if (m.phase !== 'inTheaters') continue
      const i = week - m.releaseWeek
      if (i < 0) continue // not open yet (e.g. festival acquisition scheduled next week)
      const g = weeklyGross(m.opening, m.quality, i)
      if (g <= 0) {
        // ~5 months in theaters, then the run ends
        m.phase = 'done'
        m.finished = true
        m.status = 'Completed'
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

  // ---- film festival (bi-annual)
  if (week % 26 === 0) {
    st.festival = { open: true, openWeek: week, offers: genFestivalOffers(), bidPlaced: false }
    addLog(st, events, '🎪 The bi-annual film festival is open — completed movies are up for distribution.', 'gold')
  } else if (st.festival && st.festival.open && week > st.festival.openWeek + 4) {
    st.festival = null
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

  // ---- bankruptcy
  if (st.cash < BANKRUPT_AT) {
    st.gameOver = true
    addLog(st, events, '💀 Your studio is bankrupt. The lights have gone out.', 'bad')
  }

  // ---- hired managers keep the pipeline moving whenever it's free
  if (!st.gameOver && !st.production) {
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
    status: 'Opening weekend',
    franchiseName: null,
    part: 1,
    releasedYear: dateInfo(week).year,
    finished: false,
    phase: 'inTheaters',
  }
}

// ---------------------------------------------------------------------------
// player actions
// ---------------------------------------------------------------------------

export function createScript(s: GameState, genre: Genre, quality: number, customTitle: string): GameState {
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
  }
  return {
    ...s,
    cash: s.cash - cost,
    scripts: [...s.scripts, script],
    log: [
      news(s.week, `✍️ You wrote "${title}" (${genre}, quality ${q}) for ${fmt(cost)}.`, 'good'),
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
    status: 'Casting',
    franchiseName: null,
    part: 1,
    releasedYear: 0,
    finished: false,
    phase: 'preProduction',
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
      news(s.week, `🎥 "${sc.title}" is now in pre-production. Cast your talent.`, 'info'),
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

export function bidFestival(s: GameState, offerId: string, amount: number): GameState {
  if (!s.festival || !s.festival.open || s.festival.bidPlaced) return s
  const offer = s.festival.offers.find((o) => o.id === offerId)
  if (!offer) return s
  const bid = Math.round(amount)
  if (bid < offer.asking) return s
  if (s.cash < bid) return s
  const aiBid = Math.round(offer.asking * rand(0.92, 1.12))
  const won = bid >= aiBid
  let next = {
    ...s,
    cash: s.cash - (won ? bid : 0),
    festival: { ...s.festival, bidPlaced: true },
    stats: { ...s.stats },
  }
  if (won) {
    const opening = offer.estGross / 2.7
    const m: Movie = {
      id: uid(),
      title: offer.title,
      genre: offer.genre,
      owner: 'distributed',
      studioName: offer.studioName,
      scriptQuality: offer.quality,
      writerId: null,
      directorId: null,
      actorIds: [],
      productionBudget: offer.quality * 400_000,
      departments: { acting: 0, writing: 0, direction: 0, effects: 0, music: 0, editing: 0 },
      quality: offer.quality,
      hype: 60,
      marketingSpent: 0,
      releaseWeek: next.week + 1,
      opening,
      weekly: [],
      totalGross: 0,
      cost: bid,
      revenue: 0,
      status: 'Scheduled',
      franchiseName: null,
      part: 1,
      releasedYear: 0,
      finished: false,
      phase: 'inTheaters',
    }
    next.movies = [...next.movies, m]
    next.stats.festivalsWon += 1
    next.log = [
      news(s.week, `🎪 You won the rights to "${offer.title}" for ${fmt(bid)} — it starts its run next week.`, 'gold'),
      ...next.log,
    ].slice(0, LOG_CAP)
  } else {
    next.log = [
      news(s.week, `🎪 Your bid of ${fmt(bid)} on "${offer.title}" lost to a rival (${fmt(aiBid)}).`, 'bad'),
      ...next.log,
    ].slice(0, LOG_CAP)
  }
  return next
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
    scriptQuality: clamp(m.scriptQuality - 5 + part * 2, 30, 92),
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
    status: 'Casting',
    franchiseName,
    part,
    releasedYear: 0,
    finished: false,
    phase: 'preProduction',
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
        `👔 Hired ${manager.name} for ${fmt(salary)}/week. When the pipeline is free, they'll write, cast, produce, market, and release a movie — then start the next one.`,
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
  let mgr: Manager | null = null
  const start = s.nextManagerIdx % Math.max(1, s.managers.length)
  for (let n = 0; n < s.managers.length; n++) {
    const cand = s.managers[(start + n) % s.managers.length]
    if (cand.active) {
      mgr = cand
      break
    }
  }
  if (!mgr) return s
  let st: GameState = { ...s, nextManagerIdx: (s.managers.indexOf(mgr) + 1) % Math.max(1, s.managers.length) }
  if (st.cash < 400_000) return st // can't afford a movie yet — wait

  // 1) script — step quality down until one is affordable
  const genre: Genre = mgr.genre ?? pick(GENRE_NAMES)
  let made: GameState | null = null
  for (let q = Math.round(clamp(mgr.qualityTarget, 30, 90)); q >= 35; q -= 5) {
    const candidate = createScript(st, genre, q, '')
    if (candidate.scripts.length > st.scripts.length) {
      made = candidate
      break
    }
  }
  if (!made) return st
  st = made
  const script = st.scripts[st.scripts.length - 1]

  // 2) start the production, tagged with this manager
  st = putIntoProduction(st, script.id)
  st = { ...st, production: { ...st.production!, managerId: mgr.id } }

  // 3) cast — best affordable talent, falling back to the cheapest available so
  // the pipeline never stalls (stars can ask more than the per-movie cap)
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
    if (st.cash < t.asking * 2) return false // keep enough for the production budget
    st = hireTalent(st, t.id, t.asking)
    return true
  }
  const hiredAll = hire(writer) && hire(director) && hire(actor1)
  if (actor2) hire(actor2)
  if (!hiredAll) {
    // can't assemble a cast right now — abandon and retry on a future week
    st.production = null
    return st
  }

  // 4) fund production — balanced departments, up to the manager's cap
  if (st.cash < 600_000) {
    st.production = null
    return st
  }
  const tier = tierForRep(st.reputation)
  const budget = Math.max(500_000, Math.round(Math.min(mgr.maxBudget, tier.maxBudget, st.cash * 0.85)))
  const share = budget / 6
  const depts: DepartmentAlloc = {
    acting: share,
    writing: share,
    direction: share,
    effects: share,
    music: share,
    editing: share,
  }
  st = startProduction(st, depts)
  if (!st.production || st.production.phase !== 'production' || st.production.managerId !== mgr.id) {
    st.production = null // failed to fund — abandon so a future week can retry
    return st
  }
  mgr.moviesMade += 1
  addLog(
    st,
    events,
    `👔 ${mgr.name} started "${st.production.movie.title}" (${st.production.movie.genre}, ${fmt(st.production.movie.productionBudget)} budget) — handling everything from here.`,
    'info',
  )
  return st
}
