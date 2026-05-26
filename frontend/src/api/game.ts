import type {
  ExpeditionSummary,
  FriendSummary,
  MaterialBackpack,
  MarketListing,
  PlayerResources,
  PlayerProfile,
  PlayerTransaction,
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

export function startExpedition(petIds: string[], expeditionType = 'forest') {
  return apiRequest<ExpeditionSummary>('/start-expedition', {
    method: 'POST',
    body: JSON.stringify({ petIds, expeditionType }),
  })
}

export function claimReward(expeditionId: string) {
  return apiRequest<ExpeditionSummary>('/claim-reward', {
    method: 'POST',
    body: JSON.stringify({ expeditionId }),
  })
}

export function addFriend(wallet: string) {
  return apiRequest<{ status: 'pending' | 'accepted' }>('/add-friend', {
    method: 'POST',
    body: JSON.stringify({ wallet }),
  })
}

export function getFriends() {
  return apiRequest<FriendSummary[]>('/friends')
}

export function getMarketListings() {
  return apiRequest<MarketListing[]>('/market/listings')
}

export function listMarketMaterial(materialId: string, amount: number, price: number) {
  return apiRequest<MarketListing>('/market/listings', {
    method: 'POST',
    body: JSON.stringify({ materialId, amount, price }),
  })
}

export function cancelMarketListing(listingId: string) {
  return apiRequest<MarketListing>('/market/cancel-listing', {
    method: 'POST',
    body: JSON.stringify({ listingId }),
  })
}

export function buyMarketListing(listingId: string) {
  return apiRequest<MarketListing>('/market/buy-listing', {
    method: 'POST',
    body: JSON.stringify({ listingId }),
  })
}

export function getTransactions() {
  return apiRequest<PlayerTransaction[]>('/transactions')
}
