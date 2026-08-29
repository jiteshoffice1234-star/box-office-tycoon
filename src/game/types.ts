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
  merchandiseRevenue: number
  soundtrackRevenue: number
  commentaryActive: boolean
  awardsCampaignActive: boolean
  awardsBuzz: number
  hasMerchandise: boolean
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
}

export interface AwardEntry {
  movieId: string
  title: string
  genre: Genre
  quality: number
  owner: Owner
  studioName: string
  won: boolean
}

export interface AwardYear {
  year: number
  nominees: AwardEntry[]
  winner: AwardEntry | null
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
}

export interface GameStats {
  moviesMade: number
  totalEarned: number
  totalSpent: number
  awardsWon: number
  blockbusters: number // gross >= $100M
  disasters: number // movies that bombed
  seriesMade: number
  franchises: number
  boxOfficeRecords: BoxOfficeRecord[]
  achievements: Achievement[]
  streamingReleases: number
  awardsCampaigns: number
  merchandiseEarned: number
  soundtrackEarned: number
  commentaryAdded: number
  internationalDeals: number
  totalMerchandise: number
  totalSoundtrack: number
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



// --- Random Events ---
export interface RandomEvent {
  id: string
  week: number
  type: 'scandal' | 'viral' | 'weather' | 'strike' | 'pandemic' | 'award_buzz' | 'leak' | 'rival_release' | 'streaming_war' | 'talent_feud'
  title: string
  description: string
  effect: 'positive' | 'negative' | 'neutral'
  targetMovieId: string | null // null = studio-wide
  magnitude: number // 0-100, how strong the effect is
  resolved: boolean
}

// --- Streaming Platform ---
export type ReleaseWindow = 'theatrical' | 'streaming' | 'simultaneous'

// --- Awards Campaign ---
export interface AwardsCampaign {
  movieId: string
  spendPerWeek: number
  active: boolean
  weeksRunning: number
  totalSpent: number
  buzz: number // 0-100, awards buzz generated
}

// --- Talent Rivalries ---
export interface TalentRivalry {
  talentA: string
  talentB: string
  reason: string // 'ego', 'past_conflict', 'romantic_drama', 'method_acting_clash'
  severity: number // 1-10
  active: boolean
}

// --- Box Office Records ---
export interface BoxOfficeRecord {
  category: string // 'opening_weekend', 'total_gross', 'longest_run', 'biggest_profit'
  movieId: string
  title: string
  value: number
  week: number
  year: number
}

// --- Achievements ---
export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlocked: boolean
  unlockedWeek: number | null
  condition: string // human-readable condition
}

// --- Merchandise & IP ---
export interface MerchandiseDeal {
  movieId: string
  type: 'toys' | 'theme_park' | 'clothing' | 'video_game' | 'book'
  revenuePerWeek: number
  active: boolean
  weeksRemaining: number
}

// --- Genre Trends ---
export interface GenreTrend {
  genre: string
  multiplier: number // 1.0 = normal, 2.0 = peak, 0.5 = slump
  weeksRemaining: number
}

// --- Director Commentary ---
export interface DirectorCommentary {
  movieId: string
  cost: number
  qualityBoost: number
  evergreenBoost: number // multiplier for evergreen earnings
  active: boolean
}

// Extend GameStats
export interface GameStatsExtended extends GameStats {
  boxOfficeRecords: BoxOfficeRecord[]
  achievements: Achievement[]
  streamingReleases: number
  awardsCampaigns: number
  merchandiseEarned: number
  soundtrackEarned: number
  commentaryAdded: number
  internationalDeals: number
  totalMerchandise: number
  totalSoundtrack: number
}

// Extend Movie with new fields
export interface MovieExtended extends Movie {
  releaseWindow: ReleaseWindow
  streamingRevenue: number
  merchandiseRevenue: number
  soundtrackRevenue: number
  commentaryActive: boolean
  awardsCampaignActive: boolean
  awardsBuzz: number
  hasMerchandise: boolean
  internationalDeal: boolean
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
  awards: AwardYear[]
  nextAwardYear: number
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
  createdAt: number
  // --- New feature state ---
  randomEvents: RandomEvent[]
  activeEvent: RandomEvent | null
  genreTrends: GenreTrend[]
  awardsCampaigns: AwardsCampaign[]
  talentRivalries: TalentRivalry[]
  merchandiseDeals: MerchandiseDeal[]
  directorCommentaries: DirectorCommentary[]
  streamingPlatform: boolean
  internationalMarkets: boolean
  lastEventWeek: number
}
