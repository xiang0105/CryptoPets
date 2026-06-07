import { z } from 'zod'
import type {
  MarketListing,
  MaterialBackpack,
  PlayerResources,
  PlayerTransaction,
  ListingIdRequest,
  ListMarketMaterialRequest,
  WalletAddress,
} from '@cryptopets/shared'
import { isKnownMaterialId } from '@cryptopets/game-content'
import { env } from '../config/env.js'
import { supabase } from '../config/supabase.js'
import { HttpError } from '../utils/httpError.js'
import { materialBalanceProvider } from './materialBalanceProvider.js'

const listMaterialSchema: z.ZodType<ListMarketMaterialRequest> = z.object({
  materialId: z.string().min(1).max(64).refine(isKnownMaterialId, 'UNKNOWN_MATERIAL_ID'),
  amount: z.number().int().positive().max(999),
  price: z.number().positive().max(1_000_000),
}).strict()

const listingIdSchema: z.ZodType<ListingIdRequest> = z.object({
  listingId: z.string().uuid(),
}).strict()

export async function getPlayerResources(userId: string): Promise<PlayerResources> {
  const inventory = await materialBalanceProvider.listBalances(userId)

  return {
    sepoliaBalance: '0',
    inventory,
  }
}

export async function getMaterialBackpack(userId: string): Promise<MaterialBackpack> {
  const resources = await getPlayerResources(userId)

  return {
    ...resources,
    source: env.MATERIAL_BACKPACK_SOURCE,
    syncedAt: new Date().toISOString(),
    chain: {
      enabled:
        env.MATERIAL_BACKPACK_SOURCE === 'chain-db' && Boolean(env.RPC_URL) && isConfiguredContract(env.MATERIAL_CONTRACT_ADDRESS),
      chainId: env.CHAIN_ID,
      materialContractAddress: isConfiguredContract(env.MATERIAL_CONTRACT_ADDRESS)
        ? toWalletAddress(env.MATERIAL_CONTRACT_ADDRESS)
        : null,
    },
  }
}

function toWalletAddress(address: string | undefined): WalletAddress | null {
  return address ? (address as WalletAddress) : null
}

function isConfiguredContract(address: string | undefined) {
  return Boolean(address && !/^0x0{40}$/i.test(address))
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
    sepoliaAmount: String(transaction.coin_amount ?? 0),
    createdAt: transaction.created_at,
  }))
}

export async function listMaterial(userId: string, input: unknown): Promise<MarketListing> {
  const body = listMaterialSchema.parse(input)
  await materialBalanceProvider.decrease(userId, body.materialId, body.amount)

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
    await materialBalanceProvider.increase(userId, body.materialId, body.amount)
    throw new HttpError(500, 'MARKET_LISTING_CREATE_FAILED')
  }

  await recordTransaction(userId, {
    listingId: listing.id,
    action: 'list',
    materialId: body.materialId,
    materialAmount: body.amount,
    sepoliaAmount: 0,
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

  await materialBalanceProvider.increase(userId, listing.material_id, listing.amount)
  await recordTransaction(userId, {
    listingId: listing.id,
    action: 'cancel',
    materialId: listing.material_id,
    materialAmount: listing.amount,
    sepoliaAmount: 0,
  })

  return mapListing(updated)
}

export async function buyListing(userId: string, input: unknown): Promise<MarketListing> {
  const body = listingIdSchema.parse(input)
  const listing = await getActiveListing(body.listingId)

  if (listing.seller_id === userId) {
    throw new HttpError(400, 'CANNOT_BUY_OWN_LISTING')
  }

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
    throw new HttpError(409, 'MARKET_LISTING_BUY_CONFLICT')
  }

  await Promise.all([
    materialBalanceProvider.increase(userId, listing.material_id, listing.amount),
    recordTransaction(userId, {
      listingId: listing.id,
      counterpartyId: listing.seller_id,
      action: 'buy',
      materialId: listing.material_id,
      materialAmount: listing.amount,
      sepoliaAmount: 0,
    }),
    recordTransaction(listing.seller_id, {
      listingId: listing.id,
      counterpartyId: userId,
      action: 'sell',
      materialId: listing.material_id,
      materialAmount: listing.amount,
      sepoliaAmount: 0,
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

async function recordTransaction(
  userId: string,
  input: {
    listingId: string
    counterpartyId?: string
    action: 'list' | 'buy' | 'sell' | 'cancel'
    materialId: string
    materialAmount: number
    sepoliaAmount: number
  },
) {
  const { error } = await supabase.from('transactions').insert({
    user_id: userId,
    counterparty_id: input.counterpartyId ?? null,
    listing_id: input.listingId,
    action: input.action,
    material_id: input.materialId,
    material_amount: input.materialAmount,
    coin_amount: input.sepoliaAmount,
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
  price: number | string
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
    price: Number(listing.price),
    status: listing.status,
    buyerId: listing.buyer_id,
    createdAt: listing.created_at,
    updatedAt: listing.updated_at,
  }
}
