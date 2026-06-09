export type ExpeditionAction = 'start-expedition' | 'claim-reward'
export type ExpeditionStatus = 'started' | 'claimed' | 'cancelled'
export type ExpeditionType = 'orange' | 'apple' | 'snow-peach'
export type PetElement = 'citrus' | 'ember' | 'frost' | 'bloom'

export interface LocalizedText {
  zh: string
  en: string
}

export interface ExpeditionReward {
  exp: number
  sepoliaAmount: string
  materials: Array<{
    id: string
    count: number
  }>
}

export interface ExpeditionSummary {
  id: string
  petIds: string[]
  expeditionType: ExpeditionType
  startedAt: string
  endsAt: string
  status: ExpeditionStatus
  reward: ExpeditionReward | null
}

export interface ExpeditionLogEntry {
  id: string
  expeditionId: string | null
  at: string
  message: LocalizedText
  variant: 'notice' | null
}

export interface ExpeditionEventResult {
  index: number
  eventId: string
  outcomeId: string
  success: boolean
  chance: number
  roll: number
  effectiveTotalLevel: number
  levelPenaltyApplied: number
  materialId: string | null
  materialAmount: number
  message: LocalizedText
  tags: string[]
}

export interface ExpeditionPetSnapshot {
  tokenId: string
  owner: string
  name: string
  level: number
  iv: number
}

export interface ExpeditionRecord {
  id: string
  wallet: string
  petIds: string[]
  expeditionType: ExpeditionType
  startedAt: string
  endsAt: string
  claimedAt: string | null
  status: ExpeditionStatus
  totalLevel: number
  sumIv: number
  petSnapshot: ExpeditionPetSnapshot[]
  events: ExpeditionEventResult[]
  reward: ExpeditionReward | null
  materialMintTxHash: string | null
}

export interface ExpeditionDetails extends ExpeditionSummary {
  wallet: string
  totalLevel: number
  sumIv: number
  events: ExpeditionEventResult[]
  logs: ExpeditionLogEntry[]
  materialMintTxHash: string | null
}

export interface ChainExpeditionPet {
  tokenId: string
  owner: string
  name: string
  level: string
  iv: number
}
