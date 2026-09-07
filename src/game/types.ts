// Core types for Box Office Tycoon

export type Role = 'actor' | 'director' | 'writer'

export interface Talent {
  id: string
  name: string
  role: Role
  fame: number // 0-100
  asking: number // current asking price (dollars)
  hiredWeek: number // -1 if not hired; else week they were hired
  busyUntil: number // week they become available again; 0 = available
  genreAffinity: string | null
  rivalries: string[] // ids of talents this person refuses to work with
  feuding: boolean // currently in a public feud
}

export type Genre =
  | 'Action'
  | 'Adventure'
  | 'Animation'
  | 'Comedy'
  | 'Crime'
  | 'Documentary'
  | 'Drama'
  | 'Family'
  | 'Fantasy'
  | 'Horror'
  | 'Musical'
  | 'Romance'
  | 'Sci-Fi'
  | 'Thriller'
  | 'War'
  | 'Western'

export interface Script {
  id: string
  title: string
  genre: Genre
  quality: number // 0-100
  price: number
  source: 'written' | 'market'
  contentType: ContentType
}

export interface DepartmentAlloc {
  acting: number
  writing: number
  direction: number
  effects: number
  music: number
  editing: number
}

export type Owner = 'player' | 'ai' | 'distributed'

export type ContentType = 'movie' | 'series' | 'show'

export type MoviePhase =
  | 'preProduction'
  | 'production'
  | 'marketing'
  | 'inTheaters'
  | 'done'
  | 'evergreen' // long-running earner for quality content

export interface WeeklyGross {
  week: number
  gross: number
}

export interface Movie {
  id: string
  title: string
  genre: Genre
  owner: Owner
  studioName: string
  contentType: ContentType
  scriptQuality: number
  writerId: string | null
  directorId: string | null
  actorIds: string[]
  productionBudget: number
  departments: DepartmentAlloc
  quality: number
  hype: number
  marketingSpent: number
  releaseWeek: number // absolute week of release (0 = unreleased)
  opening: number
  weekly: WeeklyGross[]
  totalGross: number
  cost: number // total cash spent making + marketing it
  revenue: number // studio share earned so far
  status: string // human readable
  isDisaster: boolean // true if the movie bombed critically and commercially
  franchiseName: string | null
  part: number // 1 = original, 2+ = sequel
  releasedYear: number
  finished: boolean
  phase: MoviePhase
  // series / show fields
  seasons: number // 0 for movies; 1+ for series/shows
  episodesPerSeason: number
  viewership: number // 0-100, determines weekly earnings for series
  cancelled: boolean // true if a series was cancelled due to low viewership
  releaseWindow: ReleaseWindow
  streamingRevenue: number
  internationalDeal: boolean
}

export type ProductionPhase = 'preProduction' | 'production' | 'marketing'

export interface Production {
  movie: Movie
  phase: ProductionPhase
  weeksLeft: number
  releaseWeek: number | null
  marketingStrategy: string
  managerId: string | null // set when a hired manager is running this movie
}

/** A hired studio manager — takes a weekly salary, runs the whole pipeline. */
export interface Manager {
  id: string
  name: string
  weeklySalary: number
  genre: Genre | null // null = any genre, manager picks
  qualityTarget: number // 30-90 — how good they try to make each movie
  maxBudget: number // cap on each movie's production budget
  marketingStrategy: string
  active: boolean
  hiredWeek: number
  moviesMade: number
  // --- Content control ---
  contentType: 'movie' | 'series' | 'show' | 'any' // what they produce
  franchiseName: string | null // assigned franchise (null = new IP each time)
  customLabel: string | null // user-given label like "Marvel" or "Star Wars"
  sequelsOnly: boolean // only make sequels in assigned franchise
  // --- Mood system ---
  mood: number // 0-100 satisfaction based on salary
  cooldownUntil: number // week when manager can produce next
}



export interface NewsItem {
  week: number
  text: string
  kind: 'good' | 'bad' | 'info' | 'gold'
}

export interface AiStudio {
  name: string
  nextReleaseWeek: number
  budget: number
  quality: number
  genre: Genre
  aggression: number // 0-1, how aggressively they compete
  streaming: boolean // has a streaming platform
  assets: number // studio value — transferred on default
  creditScore: number // 0-100 — repayment reliability
  totalBorrowed: number // lifetime loans received
  defaults: number // times they defaulted
}

export interface GameStats {
  moviesMade: number
  totalEarned: number
  totalSpent: number
  blockbusters: number // gross >= $100M
  disasters: number // movies that bombed
  seriesMade: number
  franchises: number
  streamingReleases: number
  internationalDeals: number
}

export type LoanFrequency = 'daily' | 'weekly' | 'monthly'

export interface Loan {
  id: string
  kind: 'borrow' | 'lend'
  principal: number // cash moved at signing
  rate: number // interest rate 0-1, set by the player
  frequency: LoanFrequency // payment schedule chosen by the player
  termValue: number // weeks (weekly), months (monthly), or days (daily)
  intervalWeeks: number // weeks between collections (1 weekly/daily, 4 monthly)
  totalCollections: number
  collectionsDone: number
  installment: number // cash per collection (borrow: paid out · lend: received)
  nextDueWeek: number // next week a collection happens
  outstanding: number // borrow: remaining debt
  received: number // lend: cash received so far
  studioName: string | null // lend: who we lent to
  takenWeek: number
  settled: boolean
}

export interface Investment {
  id: string
  studioName: string // AI studio we backed
  releaseWeek: number // week their movie opens
  movieId: string | null // set once the movie actually releases
  amount: number // cash put in
  share: number // fraction of the movie's gross we earn (amount / budget)
  totalReturn: number // cash returned so far
  settled: boolean
  takenWeek: number
}




// --- My Streaming Platform ---
export interface StreamingPlatform {
  name: string
  active: boolean
  subscriptionPrice: number
  subscribers: number
  maxSubscribers: number
  totalRevenue: number
  contentLibrary: StreamingContent[]
  weeklyRevenue: number
  // --- Ad-supported free tier ---
  adTierEnabled: boolean        // free viewers can watch with ads
  freeViewers: number           // ad-supported audience (huge, grows faster than subs)
  maxFreeViewers: number        // ceiling driven by library size/quality
  adsPerMovie: number           // how many ad breaks you force per movie (user controls)
  adRevenuePerAd: number        // $ per ad view (set by advertiser deals)
  weeklyAdRevenue: number       // cash earned from ads last week
  totalAdRevenue: number        // lifetime ad income
  adsShownLastWeek: number      // total ad views served last week
  // --- Ad-free subscription tier ---
  adFreePrice: number           // $/week to skip ads (default $10)
  adFreeSubscribers: number     // people paying to skip ads
  totalSubRevenue: number       // lifetime ad-free subscription income
  // --- Advertiser deals ---
  adDeals: AdvertiserDeal[]     // companies paying to advertise
  adRateCard: number            // your CPM rate multiplier (1 = standard)
  // --- Auto-release pipeline ---
  autoRelease: boolean          // titles arrive on the platform automatically
  autoReleaseDelay: number      // weeks after theatrical release before auto-adding
}

export interface StreamingContent {
  movieId: string
  title: string
  genre: Genre
  quality: number
  contentType: 'movie' | 'series' | 'show'
  seasons: number
  addedWeek: number
  viewsPerWeek: number
  subscriberDraw: number
}

// --- Advertiser deals: companies pay you to show ads to your free viewers ---
export interface AdvertiserDeal {
  id: string
  company: string
  weeklyPayment: number         // cash they pay every week
  cpmBonus: number              // adds to adRevenuePerAd while active
  minViewers: number            // contract requirement: free viewers must stay above this
  weeksRemaining: number
  breached: boolean             // viewers dropped below minViewers
  movieId: string | null        // which movie/show the ads run on (null = any)
  movieTitle: string | null     // display name of the assigned content
}

// --- Random Events ---
export interface RandomEvent {
  id: string
  week: number
  type: 'scandal' | 'viral' | 'weather' | 'strike' | 'pandemic' | 'leak' | 'rival_release' | 'streaming_war' | 'talent_feud'
  title: string
  description: string
  effect: 'positive' | 'negative' | 'neutral'
  targetMovieId: string | null // null = studio-wide
  magnitude: number // 0-100, how strong the effect is
  resolved: boolean
}

// --- Streaming Platform ---
export type ReleaseWindow = 'theatrical' | 'streaming' | 'simultaneous'


// --- Talent Rivalries ---
export interface TalentRivalry {
  talentA: string
  talentB: string
  reason: string // 'ego', 'past_conflict', 'romantic_drama', 'method_acting_clash'
  severity: number // 1-10
  active: boolean
}




// --- Genre Trends ---
export interface GenreTrend {
  genre: string
  multiplier: number // 1.0 = normal, 2.0 = peak, 0.5 = slump
  weeksRemaining: number
}


// Extend GameStats
export interface GameStatsExtended extends GameStats {
  streamingReleases: number
  merchandiseEarned: number
  soundtrackEarned: number
  commentaryAdded: number
  internationalDeals: number
  totalSoundtrack: number
}

// Extend Movie with new fields
export interface MovieExtended extends Movie {
  releaseWindow: ReleaseWindow
  streamingRevenue: number
  merchandiseRevenue: number
  hasMerchandise: boolean
  internationalDeal: boolean
}

// --- Manager Shows: one show per manager, seasons added over time ---
export interface ManagerShow {
  id: string
  managerId: string
  title: string
  genre: Genre
  contentType: 'series' | 'show'
  seasons: ManagerSeason[]
  totalEarnings: number
}

export interface ManagerSeason {
  seasonNumber: number
  quality: number
  episodes: number
  releaseWeek: number
  totalGross: number
  status: 'earning' | 'completed'
}

export interface GameState {
  version: number
  studioName: string
  cash: number
  reputation: number // 0-300
  week: number // absolute week, week 0 = Jan week 1, year 1
  talents: Talent[]
  scripts: Script[] // player-owned scripts
  market: Script[] // spec scripts for sale
  production: Production | null
  movies: Movie[] // all player-owned movies (incl. distributed), chronological
  aiMovies: Movie[]
  aiStudios: AiStudio[]
  log: NewsItem[]
  nextId: number
  autoAdvance: boolean
  defaultStrategy: string
  gameOver: boolean
  stats: GameStats
  loans: Loan[]
  investments: Investment[]
  managers: Manager[]
  nextManagerIdx: number
  managerProductions: Production[]
  managerShows: ManagerShow[]
  playerCreditScore: number // 0-100 — based on loan repayment history
  loansRepaid: number // total loans fully repaid
  loansDefaulted: number // total loans defaulted
  createdAt: number
  // --- New feature state ---
  randomEvents: RandomEvent[]
  activeEvent: RandomEvent | null
  genreTrends: GenreTrend[]
  talentRivalries: TalentRivalry[]
  streamingPlatform: boolean
  myStreamingPlatform: StreamingPlatform
  internationalMarkets: boolean
  lastEventWeek: number
}
