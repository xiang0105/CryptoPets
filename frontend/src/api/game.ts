import type {
  AddFriendRequest,
  ClaimRewardRequest,
  ExpeditionSummary,
  ExpeditionType,
  FriendSummary,
  ListingIdRequest,
  ListMarketMaterialRequest,
  MaterialBackpack,
  MarketListing,
  PlayerResources,
  PlayerProfile,
  PlayerTransaction,
  StartExpeditionRequest,
} from '@cryptopets/shared'
import { apiRequest } from './client'

export function getPlayer() {
  return apiRequest<PlayerProfile>('/player')
}

export function getResources() {
  return apiRequest<PlayerResources>('/resources')
}

export function getMaterialBackpack() {
  return apiRequest<MaterialBackpack>('/materials/backpack')
}

export function startExpedition(petIds: string[], expeditionType: ExpeditionType = 'orange') {
  const payload: StartExpeditionRequest = { petIds, expeditionType }

  return apiRequest<ExpeditionSummary>('/start-expedition', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function claimReward(expeditionId: string) {
  const payload: ClaimRewardRequest = { expeditionId }

  return apiRequest<ExpeditionSummary>('/claim-reward', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function addFriend(wallet: string) {
  const payload: AddFriendRequest = { wallet }

  return apiRequest<{ status: 'pending' | 'accepted' }>('/add-friend', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getFriends() {
  return apiRequest<FriendSummary[]>('/friends')
}

export function getMarketListings() {
  return apiRequest<MarketListing[]>('/market/listings')
}

export function listMarketMaterial(materialId: string, amount: number, price: number) {
  const payload: ListMarketMaterialRequest = { materialId, amount, price }

  return apiRequest<MarketListing>('/market/listings', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function cancelMarketListing(listingId: string) {
  const payload: ListingIdRequest = { listingId }

  return apiRequest<MarketListing>('/market/cancel-listing', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function buyMarketListing(listingId: string) {
  const payload: ListingIdRequest = { listingId }

  return apiRequest<MarketListing>('/market/buy-listing', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getTransactions() {
  return apiRequest<PlayerTransaction[]>('/transactions')
}
