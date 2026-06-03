export type WalletAddress = `0x${string}`

export type PetElement = 'citrus' | 'ember' | 'frost' | 'bloom'

export interface PetStats {
  iv: number
  hp: number
  maxHp: number
  atk: number
  def: number
}

export interface PlayerPet {
  id: string
  tokenId: string
  contractAddress: WalletAddress
  chainId: number
  name: string
  element: PetElement
  stage: number
  tokenUri: string
  stats: PetStats
  exp: {
    current: number
    next: number
  }
  birthTime: string
}

export interface PlayerProfile {
  id: string
  wallet: WalletAddress
  username: string | null
  chain: {
    enabled: boolean
    chainId: number
    nftContractAddress: WalletAddress | null
  }
  pets: PlayerPet[]
  activeExpedition: ExpeditionSummary | null
}

export type ExpeditionStatus = 'started' | 'claimed' | 'cancelled'
export type ExpeditionType = 'orange' | 'apple' | 'snow-peach'

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
  message: {
    zh: string
    en: string
  }
  variant: 'notice' | null
}

export interface StartExpeditionRequest {
  petIds: string[]
  expeditionType?: ExpeditionType
}

export interface ClaimRewardRequest {
  expeditionId: string
}

export interface ExpeditionReward {
  exp: number
  sepoliaAmount: string
  materials: Array<{
    id: string
    count: number
  }>
}

export interface FriendSummary {
  id: string
  wallet: WalletAddress
  username: string | null
  since: string
}

export interface InventoryItem {
  materialId: string
  amount: number
  updatedAt: string
}

export interface PlayerResources {
  sepoliaBalance: string
  inventory: InventoryItem[]
}

export type MaterialBackpackSource = 'local-db' | 'chain-db'

export interface MaterialBackpack extends PlayerResources {
  source: MaterialBackpackSource
  syncedAt: string
  chain: {
    enabled: boolean
    chainId: number
    materialContractAddress: WalletAddress | null
  }
}

export type MarketListingStatus = 'active' | 'sold' | 'cancelled'

export interface MarketListing {
  id: string
  sellerId: string
  sellerWallet: WalletAddress | null
  materialId: string
  amount: number
  price: number
  status: MarketListingStatus
  buyerId: string | null
  createdAt: string
  updatedAt: string
}

export interface ListMarketMaterialRequest {
  materialId: string
  amount: number
  price: number
}

export interface ListingIdRequest {
  listingId: string
}

export type TransactionAction = 'reward' | 'list' | 'buy' | 'sell' | 'cancel' | 'upgrade' | 'advance'

export interface PlayerTransaction {
  id: string
  action: TransactionAction
  materialId: string | null
  materialAmount: number | null
  sepoliaAmount: string
  createdAt: string
}

export interface AuthNonceResponse {
  nonce: string
  message: string
  expiresAt: string
}

export interface AuthLoginResponse {
  token: string
  player: PlayerProfile
}

export interface AddFriendRequest {
  wallet: string
}
