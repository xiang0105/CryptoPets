import { starterCapybaras, type PetElement } from '@cryptopets/game-content'
import type { LocalizedText, PetSkillDefinition } from '@cryptopets/game-content'

export type { PetElement }

export interface Pet {
  id: string
  name: string
  element: PetElement
  stage: number
  level: number
  tokenURI: string
  stats: {
    iv: number
    hp: number
    maxHp: number
    atk: number
    def: number
  }
  profile?: LocalizedText
  leaderSkill?: PetSkillDefinition
  skills?: PetSkillDefinition[]
  exp: {
    current: number
    next: number
  }
  owner: string
  birthTime: string
}

// Keep this local cache empty until it is hydrated from wallet-owned on-chain NFTs.
export const pets: Pet[] = []

export function createStarterPets(owner: string): Pet[] {
  const birthTime = new Date().toISOString()

  return [
    ...starterCapybaras.map((pet) => ({
      id: pet.id,
      name: pet.name,
      element: pet.element,
      stage: pet.stage,
      level: 0,
      tokenURI: pet.tokenURI,
      stats: { ...pet.stats },
      profile: { ...pet.profile },
      leaderSkill: { ...pet.leaderSkill },
      skills: pet.skills.map((skill) => ({ ...skill })),
      exp: { current: 0, next: 1 },
      owner,
      birthTime,
    })),
  ]
}

export function replacePets(nextPets: Pet[]) {
  pets.splice(0, pets.length, ...nextPets)
}
