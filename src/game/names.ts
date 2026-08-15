// Procedural name generation — movie titles that don't sound like an AI had a stroke.

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

const ADJ = [
  'Last', 'Dark', 'Silent', 'Broken', 'Burning', 'Distant', 'Hidden', 'Eternal',
  'Crimson', 'Savage', 'Golden', 'Forgotten', 'Hollow', 'Neon', 'Quantum',
  'Shadowed', 'Vanished', 'Relentless', 'Furious', 'Fractured', 'Stolen',
  'Midnight', 'Sunken', 'Restless', 'Wild', 'Lonely', 'Perfect', 'Impossible',
  'Frozen', 'Electric', 'Paper', 'Iron', 'Velvet', 'Amber', 'Cobalt', 'Ashen',
]

const NOUN = [
  'Heist', 'Detective', 'Kingdom', 'Revenge', 'Storm', 'Horizon', 'Legacy',
  'Odyssey', 'Inferno', 'Paradise', 'Expanse', 'Requiem', 'Mirage', 'Vendetta',
  'Uprising', 'Salvation', 'Collision', 'Ascent', 'Dominion', 'Fracture',
  'Covenant', 'Omen', 'Genesis', 'Catalyst', 'Eclipse', 'Outlaw', 'Prophet',
  'Vanguard', 'Renegade', 'Sentinel', 'Nomad', 'Phantom', 'Titan', 'Harbor',
  'Summit', 'Journey', 'Empire', 'Frontier', 'Sanctuary', 'Monument', 'Signal',
  'Borderland', 'Archive', 'Carousel', 'Tidal', 'Undertow', 'Wildfire',
]

const VERB = [
  'Chasing', 'Hunting', 'Burning', 'Falling', 'Rising', 'Running', 'Waiting',
  'Breaking', 'Surviving', 'Escaping', 'Chasing', 'Drowning', 'Fighting',
  'Waking', 'Leaving', 'Returning', 'Searching', 'Crossing', 'Vanishing',
  'Remembering', 'Believing', 'Borrowing', 'Stealing', 'Forgiving',
]

const TITLE_NOUN = [
  'the Sky', 'the Dark', 'the Fire', 'the Sea', 'the Truth', 'the Past',
  'the Future', 'the Storm', 'the Crown', 'the Blade', 'the Ghost', 'the Light',
  'Tomorrow', 'Yesterday', 'the Unknown', 'the Horizon', 'the Silence',
  'the Kingdom', 'the Dream', 'the Night', 'the Fall', 'the Ashes',
]

const FIRST = [
  'Marcus', 'Elena', 'Jack', 'Sofia', 'Victor', 'Amara', 'Cole', 'Iris',
  'Dante', 'Raven', 'Theo', 'Mara', 'Silas', 'Nadia', 'Felix', 'Petra',
  'Hugo', 'Luna', 'Cyrus', 'June', 'Oscar', 'Vera', 'Dex', 'Freya',
  'August', 'Cleo', 'Reed', 'Sable', 'Miles', 'Wren', 'Ezra', 'Ines',
]

const LAST = [
  'Whitmore', 'Vance', 'Blackwood', 'Sterling', 'Hale', 'Monroe', 'Kane',
  'Rivers', 'Ashford', 'Quinn', 'Delacroix', 'Preston', 'Holloway', 'March',
  'Sable', 'Crane', 'Wolfe', 'Sinclair', 'Frost', 'Bishop', 'Raines',
  'Vega', 'Caldwell', 'Nash', 'Pike', 'Solano', 'Draper', 'Kirk',
  'Lennox', 'Ortiz', 'Beaumont', 'Gray', 'Flynn', 'Duarte', 'Calloway',
  'Mercer', 'Voss', 'Hanover', 'St.Clair', 'Winslow', 'Torres', 'Beck',
]

const FRANCHISE_SUBTITLES = [
  'Rise of the Ancients', 'Final Gambit', 'No Mercy', 'The Reckoning',
  'Dark Omen', 'Last Stand', 'New Dawn', 'Crimson Tide', 'Bloodline',
  'Shattered Crown', 'The Awakening', 'Beyond the Wall', 'Hour of Vengeance',
  'The Long Road', 'Edge of Tomorrow', 'Endgame', 'Genesis Protocol',
  'The Fallen', 'Empire Rising', 'Echoes of War', 'Cold Vengeance',
  'The Silent War', 'Day of Reckoning', 'Fractured Souls',
]

export function randomTitle(existing: string[] = []): string {
  for (let attempt = 0; attempt < 30; attempt++) {
    let t = ''
    const roll = Math.random()
    if (roll < 0.28) t = `The ${pick(ADJ)} ${pick(NOUN)}`
    else if (roll < 0.5) t = `${pick(ADJ)} ${pick(NOUN)}`
    else if (roll < 0.72) t = `${pick(NOUN)} of ${pick(TITLE_NOUN)}`
    else if (roll < 0.88) t = `${pick(VERB)} ${pick(TITLE_NOUN)}`
    else t = `The ${pick(NOUN)}`
    if (!existing.includes(t)) return t
  }
  return `The ${pick(NOUN)}`
}

export function sequelTitle(base: string, part: number): string {
  const sub = FRANCHISE_SUBTITLES[(part - 1) % FRANCHISE_SUBTITLES.length]
  return `${base}: ${sub}`
}

const usedNames = new Set<string>()

export function randomTalentName(): string {
  for (let attempt = 0; attempt < 40; attempt++) {
    const n = `${pick(FIRST)} ${pick(LAST)}`
    if (!usedNames.has(n)) {
      usedNames.add(n)
      return n
    }
  }
  const n = `${pick(FIRST)} ${pick(LAST)}${Math.floor(Math.random() * 99)}`
  usedNames.add(n)
  return n
}

export function resetNameRegistry(): void {
  usedNames.clear()
}

export function randomStudioName(): string {
  const a = ['Lionsgate', 'Summit', 'Meridian', 'Atlas', 'Cobalt', 'Aurora', 'Redwood', 'Vanguard', 'Skyline', 'Halcyon', 'Northstar', 'Cascade']
  const b = ['Pictures', 'Studios', 'Films', 'Entertainment', 'Productions', 'Media', 'Cinema', 'Works']
  return `${pick(a)} ${pick(b)}`
}
