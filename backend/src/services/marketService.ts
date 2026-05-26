import { z } from 'zod'
import type {
  MarketListing,
  MaterialBackpack,
  PlayerResources,
  PlayerTransaction,
  WalletAddress,
} from '@cryptopets/shared'
import { isKnownMaterialId } from '@cryptopets/game-content'
import { env } from '../config/env.js'
import { supabase } from '../config/supabase.js'
import { HttpError } from '../utils/httpError.js'

const listMaterialSchema = z.object({
  materialId: z.string().min(1).max(64).refine(isKnownMaterialId, 'UNKNOWN_MATERIAL_ID'),
  amount: z.number().int().positive().max(999),
  price: z.number().int().positive().max(1_000_000),
})

const listingIdSchema = z.object({
  listingId: z.string().uuid(),
})

export async function getPlayerResources(userId: string): Promise<PlayerResources> {
  const [currencyResult, inventoryResult] = await Promise.all([
    supabase.from('currencies').select('coins').eq('user_id', userId).maybeSingle(),
    supabase.from('inventory').select('material_id,amount,updated_at').eq('user_id', userId).order('material_id'),
  ])

  if (currencyResult.error) {
    throw new HttpError(500, 'CURRENCY_LOOKUP_FAILED')
  }

  if (inventoryResult.error) {
    throw new HttpError(500, 'INVENTORY_LOOKUP_FAILED')
  }

  return {
    coins: currencyResult.data?.coins ?? 0,
    inventory: (inventoryResult.data ?? []).map((item) => ({
      materialId: item.material_id,
      amount: item.amount,
      updatedAt: item.updated_at,
    })),
  }
}

export async function getMaterialBackpack(userId: string): Promise<MaterialBackpack> {
  const resources = await getPlayerResources(userId)

  return {
    ...resources,
    source: env.MATERIAL_BACKPACK_SOURCE,
    syncedAt: new Date().toISOString(),
    chain: {
      enabled: env.MATERIAL_BACKPACK_SOURCE === 'chain-db',
      chainId: env.CHAIN_ID,
      materialContractAddress: toWalletAddress(env.MATERIAL_CONTRACT_ADDRESS),
    },
  }
}

function toWalletAddress(address: string | undefined): WalletAddress | null {
  return address ? (address as WalletAddress) : null
}

export async function getMarketListings(): Promise<MarketListing[]> {
  const { data, error } = await supabase
    .from('market_listings')
    .select('id,seller_id,material_id,amount,price,status,buyer_id,created_at,updated_at,seller:seller_id(wallet)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(80)

  if (error) {
    throw new HttpError(500, 'MARKET_LISTINGS_LOOKUP_FAILED')
  }

  return (data ?? []).map(mapListing)
}

export async function getPlayerTransactions(userId: string): Promise<PlayerTransaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('id,action,material_id,material_amount,coin_amount,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    throw new HttpError(500, 'TRANSACTIONS_LOOKUP_FAILED')
  }

  return (data ?? []).map((transaction) => ({
    id: transaction.id,
    action: transaction.action,
    materialId: transaction.material_id,
    materialAmount: transaction.material_amount,
    coinAmount: transaction.coin_amount,
    createdAt: transaction.created_at,
  }))
}

export async function listMaterial(userId: string, input: unknown): Promise<MarketListing> {
  const body = listMaterialSchema.parse(input)
  await changeMaterial(userId, body.materialId, -body.amount)

  const { data: listing, error } = await supabase
    .from('market_listings')
    .insert({
      seller_id: userId,
      material_id: body.materialId,
      amount: body.amount,
      price: body.price,
      status: 'active',
    })
    .select('id,seller_id,material_id,amount,price,status,buyer_id,created_at,updated_at,seller:seller_id(wallet)')
    .single()

  if (error || !listing) {
    await changeMaterial(userId, body.materialId, body.amount)
    throw new HttpError(500, 'MARKET_LISTING_CREATE_FAILED')
  }

  await recordTransaction(userId, {
    listingId: listing.id,
    action: 'list',
    materialId: body.materialId,
    materialAmount: body.amount,
    coinAmount: 0,
  })

  return mapListing(listing)
}

export async function cancelListing(userId: string, input: unknown): Promise<MarketListing> {
  const body = listingIdSchema.parse(input)
  const listing = await getOwnedActiveListing(userId, body.listingId)

  const { data: updated, error } = await supabase
    .from('market_listings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', listing.id)
    .eq('seller_id', userId)
    .eq('status', 'active')
    .select('id,seller_id,material_id,amount,price,status,buyer_id,created_at,updated_at,seller:seller_id(wallet)')
    .single()

  if (error || !updated) {
    throw new HttpError(409, 'MARKET_LISTING_CANCEL_CONFLICT')
  }

  await changeMaterial(userId, listing.material_id, listing.amount)
  await recordTransaction(userId, {
    listingId: listing.id,
    action: 'cancel',
    materialId: listing.material_id,
    materialAmount: listing.amount,
    coinAmount: 0,
  })

  return mapListing(updated)
}

export async function buyListing(userId: string, input: unknown): Promise<MarketListing> {
  const body = listingIdSchema.parse(input)
  const listing = await getActiveListing(body.listingId)

  if (listing.seller_id === userId) {
    throw new HttpError(400, 'CANNOT_BUY_OWN_LISTING')
  }

  await changeCoins(userId, -listing.price)

  const { data: updated, error } = await supabase
    .from('market_listings')
    .update({
      status: 'sold',
      buyer_id: userId,
      sold_at: new Date().toISOString(),
    })
    .eq('id', listing.id)
    .eq('status', 'active')
    .select('id,seller_id,material_id,amount,price,status,buyer_id,created_at,updated_at,seller:seller_id(wallet)')
    .single()

  if (error || !updated) {
    await changeCoins(userId, listing.price)
    throw new HttpError(409, 'MARKET_LISTING_BUY_CONFLICT')
  }

  await Promise.all([
    changeCoins(listing.seller_id, listing.price),
    changeMaterial(userId, listing.material_id, listing.amount),
    recordTransaction(userId, {
      listingId: listing.id,
      counterpartyId: listing.seller_id,
      action: 'buy',
      materialId: listing.material_id,
      materialAmount: listing.amount,
      coinAmount: -listing.price,
    }),
    recordTransaction(listing.seller_id, {
      listingId: listing.id,
      counterpartyId: userId,
      action: 'sell',
      materialId: listing.material_id,
      materialAmount: listing.amount,
      coinAmount: listing.price,
    }),
  ])

  return mapListing(updated)
}

async function getActiveListing(listingId: string) {
  const { data, error } = await supabase
    .from('market_listings')
    .select('id,seller_id,material_id,amount,price,status')
    .eq('id', listingId)
    .eq('status', 'active')
    .single()

  if (error || !data) {
    throw new HttpError(404, 'MARKET_LISTING_NOT_FOUND')
  }

  return data
}

async function getOwnedActiveListing(userId: string, listingId: string) {
  const listing = await getActiveListing(listingId)

  if (listing.seller_id !== userId) {
    throw new HttpError(403, 'MARKET_LISTING_NOT_OWNED')
  }

  return listing
}

async function changeCoins(userId: string, delta: number) {
  const { data, error } = await supabase.from('currencies').select('coins').eq('user_id', userId).maybeSingle()

  if (error) {
    throw new HttpError(500, 'CURRENCY_LOOKUP_FAILED')
  }

  const nextCoins = (data?.coins ?? 0) + delta

  if (nextCoins < 0) {
    throw new HttpError(409, 'INSUFFICIENT_COINS')
  }

  const { error: updateError } = await supabase.from('currencies').upsert({
    user_id: userId,
    coins: nextCoins,
    updated_at: new Date().toISOString(),
  })

  if (updateError) {
    throw new HttpError(500, 'CURRENCY_UPDATE_FAILED')
  }
}

async function changeMaterial(userId: string, materialId: string, delta: number) {
  const { data, error } = await supabase
    .from('inventory')
    .select('amount')
    .eq('user_id', userId)
    .eq('material_id', materialId)
    .maybeSingle()

  if (error) {
    throw new HttpError(500, 'INVENTORY_LOOKUP_FAILED')
  }

  const nextAmount = (data?.amount ?? 0) + delta

  if (nextAmount < 0) {
    throw new HttpError(409, 'INSUFFICIENT_MATERIAL')
  }

  const { error: updateError } = await supabase.from('inventory').upsert({
    user_id: userId,
    material_id: materialId,
    amount: nextAmount,
    updated_at: new Date().toISOString(),
  })

  if (updateError) {
    throw new HttpError(500, 'INVENTORY_UPDATE_FAILED')
  }
}

async function recordTransaction(
  userId: string,
  input: {
    listingId: string
    counterpartyId?: string
    action: 'list' | 'buy' | 'sell' | 'cancel'
    materialId: string
    materialAmount: number
    coinAmount: number
  },
) {
  const { error } = await supabase.from('transactions').insert({
    user_id: userId,
    counterparty_id: input.counterpartyId ?? null,
    listing_id: input.listingId,
    action: input.action,
    material_id: input.materialId,
    material_amount: input.materialAmount,
    coin_amount: input.coinAmount,
  })

  if (error) {
    throw new HttpError(500, 'TRANSACTION_CREATE_FAILED')
  }
}

function mapListing(listing: {
  id: string
  seller_id: string
  seller?: { wallet?: string | null } | Array<{ wallet?: string | null }> | null
  material_id: string
  amount: number
  price: number
  status: 'active' | 'sold' | 'cancelled'
  buyer_id: string | null
  created_at: string
  updated_at: string
}): MarketListing {
  const seller = Array.isArray(listing.seller) ? listing.seller[0] : listing.seller

  return {
    id: listing.id,
    sellerId: listing.seller_id,
    sellerWallet: seller?.wallet ? `0x${seller.wallet.slice(2)}` : null,
    materialId: listing.material_id,
    amount: listing.amount,
    price: listing.price,
    status: listing.status,
    buyerId: listing.buyer_id,
    createdAt: listing.created_at,
    updatedAt: listing.updated_at,
  }
}
