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

export type MoviePhase =
  | 'preProduction'
  | 'production'
  | 'marketing'
  | 'inTheaters'
  | 'done'

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
  franchiseName: string | null
  part: number // 1 = original, 2+ = sequel
  releasedYear: number
  finished: boolean
  phase: MoviePhase
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

export interface FestivalOffer {
  id: string
  title: string
  genre: Genre
  quality: number
  estGross: number
  asking: number
  studioName: string
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
}

export interface GameStats {
  moviesMade: number
  totalEarned: number
  totalSpent: number
  awardsWon: number
  blockbusters: number // gross >= $100M
  festivalsWon: number
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
  festival: { open: boolean; openWeek: number; offers: FestivalOffer[]; bidPlaced: boolean } | null
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
  createdAt: number
}
