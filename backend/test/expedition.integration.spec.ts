import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import jwt from 'jsonwebtoken'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type PetRow = {
  id: string
  user_id: string
  stats: Record<string, number>
  stage: number
  exp_current: number
}

type ExpeditionRow = {
  id: string
  user_id: string
  pet_ids: string[]
  expedition_type: 'orange' | 'apple' | 'snow-peach'
  started_at: string
  ends_at: string
  status: 'started' | 'claimed' | 'cancelled'
  reward: unknown | null
  claimed_at?: string
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
  action: string
  listing_id: string | null
  coin_amount: number
  metadata: unknown
}

type ExpeditionLogRow = {
  id: string
  user_id: string
  expedition_id: string
  occurred_at: string
  message_zh: string
  message_en: string
  variant: 'notice' | null
}

const jwtSecret = 'integration-test-secret'
const userId = '00000000-0000-4000-8000-000000000001'
const otherUserId = '00000000-0000-4000-8000-000000000002'
const wallet = '0x1111111111111111111111111111111111111111'
const petOneId = '10000000-0000-4000-8000-000000000001'
const petTwoId = '10000000-0000-4000-8000-000000000002'
const otherPetId = '10000000-0000-4000-8000-000000000003'
const expeditionRows: ExpeditionRow[] = []
const petRows: PetRow[] = []
const currencyRows: CurrencyRow[] = []
const inventoryRows: InventoryRow[] = []
const transactionRows: TransactionRow[] = []
const expeditionLogRows: ExpeditionLogRow[] = []
let nextExpeditionNumber = 1
let nextExpeditionLogNumber = 1

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
      if (table === 'expeditions') {
        return createExpeditionBuilder()
      }

      if (table === 'pets') {
        return createPetBuilder()
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

      if (table === 'expedition_logs') {
        return createExpeditionLogBuilder()
      }

      throw new Error(`Unexpected table: ${table}`)
    },
  },
}))

function createExpeditionBuilder() {
  const state: {
    filters: Record<string, unknown>
    inserted?: Partial<ExpeditionRow>
    patch?: Partial<ExpeditionRow>
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
    insert(row: Partial<ExpeditionRow>) {
      const expedition = {
        id: `20000000-0000-4000-8000-${String(nextExpeditionNumber++).padStart(12, '0')}`,
        user_id: row.user_id!,
        pet_ids: row.pet_ids!,
        expedition_type: row.expedition_type!,
        started_at: row.started_at!,
        ends_at: row.ends_at!,
        status: row.status!,
        reward: row.reward ?? null,
      }
      expeditionRows.push(expedition)
      state.inserted = expedition
      return this
    },
    update(patch: Partial<ExpeditionRow>) {
      state.patch = patch
      return this
    },
    async maybeSingle() {
      return { data: expeditionRows.find((row) => matches(row, state.filters)) ?? null, error: null }
    },
    async single() {
      if (state.inserted) {
        return { data: state.inserted, error: null }
      }

      const updated = applyExpeditionPatch(state.filters, state.patch)
      if (state.patch) {
        return updated ? { data: updated, error: null } : { data: null, error: new Error('No row updated') }
      }

      const row = expeditionRows.find((item) => matches(item, state.filters))
      return row ? { data: row, error: null } : { data: null, error: new Error('No row found') }
    },
  }
}

function createPetBuilder() {
  const state: {
    filters: Record<string, unknown>
    inValues?: string[]
    patch?: Partial<PetRow>
  } = { filters: {} }

  return {
    select() {
      return this
    },
    eq(column: string, value: unknown) {
      state.filters[column] = value
      return this
    },
    in(column: string, values: string[]) {
      if (column === 'id') {
        state.inValues = values
      }
      return this
    },
    update(patch: Partial<PetRow>) {
      state.patch = patch
      return this
    },
    then(resolve: (value: { data: PetRow[]; error: null }) => void) {
      applyPetPatch(state.filters, state.patch)
      resolve({ data: filterPets(state), error: null })
    },
    async maybeSingle() {
      return { data: petRows.find((row) => matches(row, state.filters)) ?? null, error: null }
    },
    async single() {
      const row = petRows.find((item) => matches(item, state.filters))
      return row ? { data: row, error: null } : { data: null, error: new Error('No row found') }
    },
    async [Symbol.asyncIterator]() {
      return undefined
    },
    async valueOf() {
      return { data: filterPets(state), error: null }
    },
  }
}

function createCurrencyBuilder() {
  const state: { filters: Record<string, unknown>; row?: CurrencyRow } = { filters: {} }

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
      state.row = row
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

function createExpeditionLogBuilder() {
  const state: {
    filters: Record<string, unknown>
    lteFilters: Record<string, string>
    maxRows?: number
  } = { filters: {}, lteFilters: {} }

  return {
    select() {
      return this
    },
    eq(column: string, value: unknown) {
      state.filters[column] = value
      return this
    },
    lte(column: string, value: string) {
      state.lteFilters[column] = value
      return this
    },
    order() {
      return this
    },
    limit(count: number) {
      state.maxRows = count
      return this
    },
    async insert(input: Omit<ExpeditionLogRow, 'id'> | Array<Omit<ExpeditionLogRow, 'id'>>) {
      const rows = Array.isArray(input) ? input : [input]
      expeditionLogRows.push(
        ...rows.map((row) => ({
          id: `50000000-0000-4000-8000-${String(nextExpeditionLogNumber++).padStart(12, '0')}`,
          variant: null,
          ...row,
        })),
      )
      return { error: null }
    },
    then(resolve: (value: { data: ExpeditionLogRow[]; error: null }) => void) {
      const logs = expeditionLogRows
        .filter((row) => matches(row, state.filters))
        .filter((row) =>
          Object.entries(state.lteFilters).every(([key, value]) => Date.parse(String(row[key as keyof ExpeditionLogRow])) <= Date.parse(value)),
        )
        .sort((logA, logB) => Date.parse(logB.occurred_at) - Date.parse(logA.occurred_at))
        .slice(0, state.maxRows)

      resolve({ data: logs, error: null })
    },
  }
}

function applyExpeditionPatch(filters: Record<string, unknown>, patch: Partial<ExpeditionRow> | undefined) {
  if (!patch) {
    return null
  }

  const row = expeditionRows.find((item) => matches(item, filters))
  if (row) {
    Object.assign(row, patch)
  }
  return row ?? null
}

function applyPetPatch(filters: Record<string, unknown>, patch: Partial<PetRow> | undefined) {
  if (!patch) {
    return null
  }

  const row = petRows.find((item) => matches(item, filters))
  if (row) {
    Object.assign(row, patch)
  }
  return row ?? null
}

function filterPets(state: { filters: Record<string, unknown>; inValues?: string[] }) {
  return petRows.filter((row) => matches(row, state.filters) && (!state.inValues || state.inValues.includes(row.id)))
}

function matches<T extends Record<string, unknown>>(row: T, filters: Record<string, unknown>) {
  return Object.entries(filters).every(([key, value]) => row[key] === value)
}

describe('expedition integration', () => {
  let server: Server
  let baseUrl: string
  let token: string

  beforeEach(async () => {
    expeditionRows.length = 0
    petRows.length = 0
    currencyRows.length = 0
    inventoryRows.length = 0
    transactionRows.length = 0
    expeditionLogRows.length = 0
    nextExpeditionNumber = 1
    nextExpeditionLogNumber = 1
    seedPets()
    token = jwt.sign({ sub: userId, wallet }, jwtSecret)

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

  it('starts an expedition for owned pets', async () => {
    const response = await post('/start-expedition', {
      petIds: [petOneId, petTwoId],
      expeditionType: 'apple',
    })
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body).toMatchObject({
      petIds: [petOneId, petTwoId],
      expeditionType: 'apple',
      status: 'started',
      reward: null,
    })
    expect(Date.parse(body.endsAt)).toBeGreaterThan(Date.parse(body.startedAt))
    expect(expeditionRows).toHaveLength(1)
    expect(expeditionLogRows.length).toBeGreaterThan(1)
    expect(expeditionLogRows[0]).toMatchObject({
      user_id: userId,
      expedition_id: body.id,
      variant: null,
    })
  })

  it('returns expedition logs for the authenticated player', async () => {
    const startResponse = await post('/start-expedition', {
      petIds: [petOneId],
      expeditionType: 'orange',
    })
    const expedition = await startResponse.json()

    expeditionLogRows.push({
      id: '50000000-0000-4000-8000-000000000999',
      user_id: otherUserId,
      expedition_id: expedition.id,
      occurred_at: new Date().toISOString(),
      message_zh: '其他玩家紀錄',
      message_en: 'Other player log',
      variant: null,
    })

    const response = await fetch(`${baseUrl}/expedition/logs`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.length).toBeGreaterThan(0)
    expect(body[0]).toMatchObject({
      expeditionId: expedition.id,
      message: {
        zh: expect.any(String),
        en: expect.any(String),
      },
    })
    expect(body).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: '50000000-0000-4000-8000-000000000999' })]))
  })

  it('rejects starting a second active expedition', async () => {
    await post('/start-expedition', { petIds: [petOneId], expeditionType: 'orange' })

    const response = await post('/start-expedition', { petIds: [petTwoId], expeditionType: 'apple' })
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toBe('EXPEDITION_ALREADY_ACTIVE')
    expect(expeditionRows).toHaveLength(1)
  })

  it('rejects pets that do not belong to the player', async () => {
    const response = await post('/start-expedition', { petIds: [otherPetId], expeditionType: 'orange' })
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe('PET_NOT_OWNED')
    expect(expeditionRows).toHaveLength(0)
  })

  it('rejects claiming an unfinished expedition', async () => {
    const expedition = seedExpedition({
      user_id: userId,
      pet_ids: [petOneId],
      ends_at: new Date(Date.now() + 60_000).toISOString(),
      status: 'started',
    })

    const response = await post('/claim-reward', { expeditionId: expedition.id })
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toBe('EXPEDITION_NOT_FINISHED')
    expect(expeditionRows[0]?.status).toBe('started')
    expect(transactionRows).toHaveLength(0)
  })

  it('rejects claiming the same expedition twice', async () => {
    const expedition = seedFinishedExpedition([petOneId])

    const firstResponse = await post('/claim-reward', { expeditionId: expedition.id })
    const secondResponse = await post('/claim-reward', { expeditionId: expedition.id })
    const secondBody = await secondResponse.json()

    expect(firstResponse.status).toBe(200)
    expect(secondResponse.status).toBe(409)
    expect(secondBody.error).toBe('EXPEDITION_ALREADY_CLAIMED')
    expect(transactionRows).toHaveLength(1)
  })

  it('claims rewards into Sepolia notice, inventory, pet exp, and transactions without transfers', async () => {
    currencyRows.push({ user_id: userId, coins: 10, updated_at: new Date().toISOString() })
    const expedition = seedFinishedExpedition([petOneId, petTwoId])

    const response = await post('/claim-reward', { expeditionId: expedition.id })
    const body = await response.json()
    const reward = body.reward

    expect(response.status).toBe(200)
    expect(body.status).toBe('claimed')
    expect(reward.sepoliaAmount).toBe('0.00000000001')
    expect(currencyRows.find((row) => row.user_id === userId)?.coins).toBe(10)
    expect(inventoryRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          user_id: userId,
          material_id: reward.materials[0].id,
          amount: reward.materials[0].count,
        }),
      ]),
    )
    expect(petRows.find((pet) => pet.id === petOneId)?.exp_current).toBe(Math.floor(reward.exp / 2))
    expect(petRows.find((pet) => pet.id === petTwoId)?.exp_current).toBe(Math.floor(reward.exp / 2))
    expect(transactionRows).toEqual([
      expect.objectContaining({
        user_id: userId,
        action: 'reward',
        coin_amount: 0,
        metadata: {
          expeditionId: expedition.id,
          exp: reward.exp,
          sepoliaAmount: reward.sepoliaAmount,
          materials: reward.materials,
        },
      }),
    ])
    expect(expeditionLogRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          user_id: userId,
          expedition_id: expedition.id,
          variant: 'notice',
          message_en: expect.stringContaining('0.00000000001 Sepolia'),
        }),
      ]),
    )
  })

  function seedPets() {
    petRows.push(
      {
        id: petOneId,
        user_id: userId,
        stats: { iv: 80, hp: 100, maxHp: 100, atk: 70, def: 60 },
        stage: 1,
        exp_current: 0,
      },
      {
        id: petTwoId,
        user_id: userId,
        stats: { iv: 82, hp: 105, maxHp: 105, atk: 68, def: 64 },
        stage: 1,
        exp_current: 0,
      },
      {
        id: otherPetId,
        user_id: otherUserId,
        stats: { iv: 90, hp: 120, maxHp: 120, atk: 80, def: 70 },
        stage: 1,
        exp_current: 0,
      },
    )
  }

  function seedFinishedExpedition(petIds: string[]) {
    return seedExpedition({
      user_id: userId,
      pet_ids: petIds,
      ends_at: new Date(Date.now() - 1000).toISOString(),
      status: 'started',
    })
  }

  function seedExpedition(overrides: Partial<ExpeditionRow>) {
    const startedAt = new Date(Date.now() - 120_000).toISOString()
    const expedition: ExpeditionRow = {
      id: `20000000-0000-4000-8000-${String(nextExpeditionNumber++).padStart(12, '0')}`,
      user_id: userId,
      pet_ids: [petOneId],
      expedition_type: 'orange',
      started_at: startedAt,
      ends_at: new Date(Date.now() - 60_000).toISOString(),
      status: 'started',
      reward: null,
      ...overrides,
    }
    expeditionRows.push(expedition)
    return expedition
  }

  async function post(path: string, body: unknown) {
    return fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  }
})
