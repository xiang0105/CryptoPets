import type { PetElement } from '@cryptopets/game-content'
import type { LocalizedText, PetSkillDefinition } from '@cryptopets/game-content'

export type { PetElement }

export interface Pet {
  id: string
  name: string
  element: PetElement
  stage: number
  level: number
  tokenURI: string
  basePetId: string
  skinId: number
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

// Backend API is the source of truth. This cache is only a view model store.
export const pets: Pet[] = []

export function replacePets(nextPets: Pet[]) {
  pets.splice(0, pets.length, ...nextPets)
}
