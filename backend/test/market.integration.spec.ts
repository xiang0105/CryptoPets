import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import jwt from 'jsonwebtoken'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type ListingStatus = 'active' | 'sold' | 'cancelled'

type ListingRow = {
  id: string
  seller_id: string
  material_id: string
  amount: number
  price: number
  status: ListingStatus
  buyer_id: string | null
  created_at: string
  updated_at: string
  sold_at?: string
  cancelled_at?: string
  seller?: { wallet: string | null } | null
}

type CurrencyRow = {
  user_id: string
  coins: number
  updated_at: string
}

type InventoryRow = {
  user_id: string
  material_id: string
  amount: number
  updated_at: string
}

type TransactionRow = {
  user_id: string
  counterparty_id: string | null
  listing_id: string
  action: 'list' | 'buy' | 'sell' | 'cancel'
  material_id: string
  material_amount: number
  coin_amount: number
}

const jwtSecret = 'integration-test-secret'
const sellerId = '00000000-0000-4000-8000-000000000001'
const buyerId = '00000000-0000-4000-8000-000000000002'
const strangerId = '00000000-0000-4000-8000-000000000003'
const sellerWallet = '0x1111111111111111111111111111111111111111'
const buyerWallet = '0x2222222222222222222222222222222222222222'
const strangerWallet = '0x3333333333333333333333333333333333333333'
const materialId = 'MAT-2C'
const listingRows: ListingRow[] = []
const currencyRows: CurrencyRow[] = []
const inventoryRows: InventoryRow[] = []
const transactionRows: TransactionRow[] = []
let nextListingNumber = 1
let rejectNextListingUpdate = false

vi.mock('../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 0,
    SUPABASE_URL: 'http://localhost',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key',
    JWT_SECRET: jwtSecret,
    CORS_ORIGIN: 'http://localhost:5173',
    WEB3_LOGIN_DOMAIN: 'localhost:5173',
    WEB3_LOGIN_STATEMENT: 'Sign in to CryptoPets',
    RPC_URL: undefined,
    NFT_CONTRACT_ADDRESS: undefined,
    MATERIAL_BACKPACK_SOURCE: 'local-db',
    MATERIAL_CONTRACT_ADDRESS: undefined,
    CHAIN_ID: 1,
  },
}))

vi.mock('../src/config/supabase.js', () => ({
  supabase: {
    from(table: string) {
      if (table === 'market_listings') {
        return createListingBuilder()
      }

      if (table === 'currencies') {
        return createCurrencyBuilder()
      }

      if (table === 'inventory') {
        return createInventoryBuilder()
      }

      if (table === 'transactions') {
        return createTransactionBuilder()
      }

      throw new Error(`Unexpected table: ${table}`)
    },
  },
}))

function createListingBuilder() {
  const state: {
    filters: Record<string, unknown>
    inserted?: ListingRow
    patch?: Partial<ListingRow>
  } = { filters: {} }

  return {
    select() {
      return this
    },
    eq(column: string, value: unknown) {
      state.filters[column] = value
      return this
    },
    order() {
      return this
    },
    limit() {
      return this
    },
    insert(row: Pick<ListingRow, 'seller_id' | 'material_id' | 'amount' | 'price' | 'status'>) {
      const now = new Date().toISOString()
      const listing: ListingRow = {
        id: `30000000-0000-4000-8000-${String(nextListingNumber++).padStart(12, '0')}`,
        seller_id: row.seller_id,
        material_id: row.material_id,
        amount: row.amount,
        price: row.price,
        status: row.status,
        buyer_id: null,
        created_at: now,
        updated_at: now,
        seller: sellerFor(row.seller_id),
      }
      listingRows.push(listing)
      state.inserted = listing
      return this
    },
    update(patch: Partial<ListingRow>) {
      state.patch = { ...patch, updated_at: new Date().toISOString() }
      return this
    },
    then(resolve: (value: { data: ListingRow[]; error: null }) => void) {
      resolve({ data: listingRows.filter((row) => matches(row, state.filters)).map(withSeller), error: null })
    },
    async single() {
      if (state.inserted) {
        return { data: withSeller(state.inserted), error: null }
      }

      if (state.patch) {
        if (rejectNextListingUpdate) {
          rejectNextListingUpdate = false
          return { data: null, error: new Error('Conflict') }
        }

        const row = listingRows.find((item) => matches(item, state.filters))
        if (!row) {
          return { data: null, error: new Error('No row updated') }
        }

        Object.assign(row, state.patch)
        return { data: withSeller(row), error: null }
      }

      const row = listingRows.find((item) => matches(item, state.filters))
      return row ? { data: withSeller(row), error: null } : { data: null, error: new Error('No row found') }
    },
  }
}

function createCurrencyBuilder() {
  const state: { filters: Record<string, unknown> } = { filters: {} }

  return {
    select() {
      return this
    },
    eq(column: string, value: unknown) {
      state.filters[column] = value
      return this
    },
    upsert(row: CurrencyRow) {
      const existing = currencyRows.find((item) => item.user_id === row.user_id)
      if (existing) {
        Object.assign(existing, row)
      } else {
        currencyRows.push(row)
      }
      return { error: null }
    },
    async maybeSingle() {
      return { data: currencyRows.find((row) => matches(row, state.filters)) ?? null, error: null }
    },
  }
}

function createInventoryBuilder() {
  const state: { filters: Record<string, unknown> } = { filters: {} }

  return {
    select() {
      return this
    },
    eq(column: string, value: unknown) {
      state.filters[column] = value
      return this
    },
    order() {
      return this
    },
    upsert(row: InventoryRow) {
      const existing = inventoryRows.find(
        (item) => item.user_id === row.user_id && item.material_id === row.material_id,
      )
      if (existing) {
        Object.assign(existing, row)
      } else {
        inventoryRows.push(row)
      }
      return { error: null }
    },
    then(resolve: (value: { data: InventoryRow[]; error: null }) => void) {
      resolve({ data: inventoryRows.filter((row) => matches(row, state.filters)), error: null })
    },
    async maybeSingle() {
      return { data: inventoryRows.find((row) => matches(row, state.filters)) ?? null, error: null }
    },
  }
}

function createTransactionBuilder() {
  return {
    async insert(row: TransactionRow) {
      transactionRows.push(row)
      return { error: null }
    },
  }
}

function withSeller(row: ListingRow): ListingRow {
  return { ...row, seller: sellerFor(row.seller_id) }
}

function sellerFor(userId: string) {
  if (userId === sellerId) {
    return { wallet: sellerWallet }
  }

  if (userId === buyerId) {
    return { wallet: buyerWallet }
  }

  if (userId === strangerId) {
    return { wallet: strangerWallet }
  }

  return { wallet: null }
}

function matches<T extends Record<string, unknown>>(row: T, filters: Record<string, unknown>) {
  return Object.entries(filters).every(([key, value]) => row[key] === value)
}

describe('market integration', () => {
  let server: Server
  let baseUrl: string

  beforeEach(async () => {
    listingRows.length = 0
    currencyRows.length = 0
    inventoryRows.length = 0
    transactionRows.length = 0
    nextListingNumber = 1
    rejectNextListingUpdate = false

    const { createApp } = await import('../src/app.js')
    server = createApp().listen(0)
    const address = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${address.port}`
  })

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  })

  it('rejects listing when material balance is insufficient', async () => {
    seedInventory(sellerId, 1)

    const response = await postAs(sellerId, sellerWallet, '/market/listings', {
      materialId,
      amount: 2,
      price: 50,
    })
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toBe('INSUFFICIENT_MATERIAL')
    expect(listingRows).toHaveLength(0)
    expect(inventoryRows.find((row) => row.user_id === sellerId)?.amount).toBe(1)
  })

  it('does not reject buying when Sepolia transfer is disabled during testing', async () => {
    const listing = seedListing({ price: 100 })
    seedCurrency(buyerId, 20)

    const response = await postAs(buyerId, buyerWallet, '/market/buy-listing', { listingId: listing.id })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('sold')
    expect(listing.status).toBe('sold')
    expect(currencyRows.find((row) => row.user_id === buyerId)?.coins).toBe(20)
  })

  it('rejects cancelling another player listing', async () => {
    const listing = seedListing({ seller_id: sellerId })

    const response = await postAs(strangerId, strangerWallet, '/market/cancel-listing', { listingId: listing.id })
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe('MARKET_LISTING_NOT_OWNED')
    expect(listing.status).toBe('active')
  })

  it('lists and cancels a material while recording transactions', async () => {
    seedInventory(sellerId, 5)

    const listResponse = await postAs(sellerId, sellerWallet, '/market/listings', {
      materialId,
      amount: 3,
      price: 70,
    })
    const listed = await listResponse.json()
    const cancelResponse = await postAs(sellerId, sellerWallet, '/market/cancel-listing', { listingId: listed.id })
    const cancelled = await cancelResponse.json()

    expect(listResponse.status).toBe(201)
    expect(listed).toMatchObject({
      materialId,
      amount: 3,
      price: 70,
      status: 'active',
      sellerWallet,
    })
    expect(cancelResponse.status).toBe(200)
    expect(cancelled.status).toBe('cancelled')
    expect(inventoryRows.find((row) => row.user_id === sellerId && row.material_id === materialId)?.amount).toBe(5)
    expect(transactionRows.map((row) => row.action)).toEqual(['list', 'cancel'])
  })

  it('buys a listing without Sepolia transfer, transfers material, and records buy/sell transactions', async () => {
    const listing = seedListing({ price: 80, amount: 2 })
    seedCurrency(buyerId, 120)
    seedCurrency(sellerId, 10)

    const response = await postAs(buyerId, buyerWallet, '/market/buy-listing', { listingId: listing.id })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      id: listing.id,
      status: 'sold',
      buyerId,
      sellerWallet,
    })
    expect(currencyRows.find((row) => row.user_id === buyerId)?.coins).toBe(120)
    expect(currencyRows.find((row) => row.user_id === sellerId)?.coins).toBe(10)
    expect(inventoryRows.find((row) => row.user_id === buyerId && row.material_id === materialId)?.amount).toBe(2)
    expect(transactionRows).toEqual([
      expect.objectContaining({ user_id: buyerId, counterparty_id: sellerId, action: 'buy', coin_amount: 0 }),
      expect.objectContaining({ user_id: sellerId, counterparty_id: buyerId, action: 'sell', coin_amount: 0 }),
    ])
  })

  it('keeps buyer Sepolia balance unchanged when a buy update conflict happens', async () => {
    const listing = seedListing({ price: 80 })
    seedCurrency(buyerId, 100)
    rejectNextListingUpdate = true

    const response = await postAs(buyerId, buyerWallet, '/market/buy-listing', { listingId: listing.id })
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toBe('MARKET_LISTING_BUY_CONFLICT')
    expect(listing.status).toBe('active')
    expect(currencyRows.find((row) => row.user_id === buyerId)?.coins).toBe(100)
    expect(transactionRows).toHaveLength(0)
  })

  function seedListing(overrides: Partial<ListingRow> = {}) {
    const now = new Date().toISOString()
    const listing: ListingRow = {
      id: `30000000-0000-4000-8000-${String(nextListingNumber++).padStart(12, '0')}`,
      seller_id: sellerId,
      material_id: materialId,
      amount: 1,
      price: 50,
      status: 'active',
      buyer_id: null,
      created_at: now,
      updated_at: now,
      ...overrides,
    }
    listingRows.push(listing)
    return listing
  }

  function seedCurrency(userId: string, coins: number) {
    currencyRows.push({ user_id: userId, coins, updated_at: new Date().toISOString() })
  }

  function seedInventory(userId: string, amount: number) {
    inventoryRows.push({ user_id: userId, material_id: materialId, amount, updated_at: new Date().toISOString() })
  }

  async function postAs(userId: string, userWallet: string, path: string, body: unknown) {
    return fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt.sign({ sub: userId, wallet: userWallet }, jwtSecret)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  }
})
