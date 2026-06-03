import { beforeEach, describe, expect, it, vi } from 'vitest'

type UserRow = {
  id: string
  wallet: `0x${string}`
  username: string | null
}

type PetRow = {
  id: string
  user_id: string
  token_id: string
  contract_address: `0x${string}`
  chain_id: number
  name: string
  element: 'citrus' | 'ember' | 'frost' | 'bloom'
  stage: number
  token_uri: string
  stats: {
    iv: number
    hp: number
    maxHp: number
    atk: number
    def: number
  }
  exp_current: number
  exp_next: number
  birth_time: string
  created_at: string
}

type CurrencyRow = {
  user_id: string
  coins: number
  updated_at: string
}

type ExpeditionRow = {
  id: string
  user_id: string
  pet_ids: string[]
  expedition_type: 'orange' | 'apple' | 'snow-peach'
  started_at: string
  ends_at: string
  status: 'started' | 'claimed' | 'cancelled'
  reward: { exp: number; sepoliaAmount: string; materials: Array<{ id: string; count: number }> } | null
}

const userId = '00000000-0000-4000-8000-000000000001'
const wallet = '0x1111111111111111111111111111111111111111'
const configuredNftAddress = '0x2222222222222222222222222222222222222222'
const zeroAddress = '0x0000000000000000000000000000000000000000'

const mockEnv = vi.hoisted(() => ({
  NODE_ENV: 'test',
  PORT: 0,
  SUPABASE_URL: 'http://localhost',
  SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  JWT_SECRET: 'player-service-test-secret',
  CORS_ORIGIN: 'http://localhost:5173',
  WEB3_LOGIN_DOMAIN: 'localhost:5173',
  WEB3_LOGIN_STATEMENT: 'Sign in to CryptoPets',
  RPC_URL: undefined as string | undefined,
  NFT_CONTRACT_ADDRESS: undefined as string | undefined,
  MATERIAL_BACKPACK_SOURCE: 'local-db',
  MATERIAL_CONTRACT_ADDRESS: undefined as string | undefined,
  CHAIN_ID: 1,
}))

const rows = vi.hoisted(() => ({
  users: [] as UserRow[],
  pets: [] as PetRow[],
  currencies: [] as CurrencyRow[],
  expeditions: [] as ExpeditionRow[],
}))

vi.mock('../src/config/env.js', () => ({
  env: mockEnv,
}))

vi.mock('../src/config/supabase.js', () => ({
  supabase: {
    from(table: string) {
      if (table === 'users') {
        return createUserBuilder()
      }

      if (table === 'pets') {
        return createPetBuilder()
      }

      if (table === 'currencies') {
        return createCurrencyBuilder()
      }

      if (table === 'expeditions') {
        return createExpeditionBuilder()
      }

      throw new Error(`Unexpected table: ${table}`)
    },
  },
}))

describe('player service', () => {
  beforeEach(() => {
    rows.users.length = 0
    rows.pets.length = 0
    rows.currencies.length = 0
    rows.expeditions.length = 0

    mockEnv.RPC_URL = undefined
    mockEnv.NFT_CONTRACT_ADDRESS = undefined
    mockEnv.CHAIN_ID = 1
  })

  it('creates starter pets and initial currency for a new player', async () => {
    const { initializePlayerIfNeeded } = await import('../src/services/playerService.js')

    await initializePlayerIfNeeded(userId)

    expect(rows.pets.length).toBeGreaterThan(0)
    expect(rows.pets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          user_id: userId,
          contract_address: zeroAddress,
          chain_id: 1,
          exp_current: 0,
          exp_next: 1000,
        }),
      ]),
    )
    expect(rows.pets.map((pet) => pet.token_id)).toEqual(
      expect.arrayContaining(rows.pets.map((pet) => expect.stringContaining(`${userId}:`))),
    )
    expect(rows.currencies).toEqual([
      expect.objectContaining({
        user_id: userId,
        coins: 0,
      }),
    ])
  })

  it('does not create duplicate starter pets when the player already has pets', async () => {
    const { initializePlayerIfNeeded } = await import('../src/services/playerService.js')
    seedPet({ id: '10000000-0000-4000-8000-000000000001' })

    await initializePlayerIfNeeded(userId)

    expect(rows.pets).toHaveLength(1)
    expect(rows.currencies).toHaveLength(0)
  })

  it('returns player profile with mapped pets, active expedition, and disabled chain state', async () => {
    const { getPlayerProfile } = await import('../src/services/playerService.js')
    rows.users.push({ id: userId, wallet, username: 'Tester' })
    const pet = seedPet({
      id: '10000000-0000-4000-8000-000000000001',
      exp_current: 120,
      exp_next: 1000,
    })
    rows.expeditions.push({
      id: '20000000-0000-4000-8000-000000000001',
      user_id: userId,
      pet_ids: [pet.id],
      expedition_type: 'apple',
      started_at: '2026-06-03T08:00:00.000Z',
      ends_at: '2026-06-03T08:05:00.000Z',
      status: 'started',
      reward: null,
    })

    const profile = await getPlayerProfile(userId)

    expect(profile).toMatchObject({
      id: userId,
      wallet,
      username: 'Tester',
      chain: {
        enabled: false,
        chainId: 1,
        nftContractAddress: null,
      },
      activeExpedition: {
        id: '20000000-0000-4000-8000-000000000001',
        petIds: [pet.id],
        expeditionType: 'apple',
        status: 'started',
        reward: null,
      },
    })
    expect(profile.pets).toEqual([
      expect.objectContaining({
        id: pet.id,
        tokenId: pet.token_id,
        contractAddress: pet.contract_address,
        chainId: pet.chain_id,
        tokenUri: pet.token_uri,
        exp: {
          current: 120,
          next: 1000,
        },
        birthTime: pet.birth_time,
      }),
    ])
  })

  it('returns enabled chain state only when RPC and NFT contract are configured', async () => {
    const { getPlayerProfile } = await import('../src/services/playerService.js')
    mockEnv.RPC_URL = 'https://rpc.test'
    mockEnv.NFT_CONTRACT_ADDRESS = configuredNftAddress
    mockEnv.CHAIN_ID = 11155111
    rows.users.push({ id: userId, wallet, username: null })

    const profile = await getPlayerProfile(userId)

    expect(profile.chain).toEqual({
      enabled: true,
      chainId: 11155111,
      nftContractAddress: configuredNftAddress,
    })
  })
})

function createUserBuilder() {
  const state: { filters: Record<string, unknown> } = { filters: {} }

  return {
    select() {
      return this
    },
    eq(column: string, value: unknown) {
      state.filters[column] = value
      return this
    },
    async single() {
      const user = rows.users.find((row) => matches(row, state.filters))
      return user ? { data: user, error: null } : { data: null, error: new Error('No user found') }
    },
  }
}

function createPetBuilder() {
  const state: {
    filters: Record<string, unknown>
    countOnly: boolean
  } = { filters: {}, countOnly: false }

  return {
    select(_columns?: string, options?: { count?: 'exact'; head?: boolean }) {
      state.countOnly = Boolean(options?.head)
      return this
    },
    eq(column: string, value: unknown) {
      state.filters[column] = value
      return this
    },
    order() {
      return this
    },
    async insert(pets: PetRow[]) {
      const now = new Date().toISOString()
      rows.pets.push(
        ...pets.map((pet, index) => ({
          ...pet,
          id: pet.id ?? `10000000-0000-4000-8000-${String(rows.pets.length + index + 1).padStart(12, '0')}`,
          created_at: pet.created_at ?? now,
        })),
      )
      return { error: null }
    },
    then(resolve: (value: { count?: number; data?: PetRow[]; error: null }) => void) {
      const pets = rows.pets.filter((row) => matches(row, state.filters))
      if (state.countOnly) {
        resolve({ count: pets.length, error: null })
        return
      }

      resolve({ data: pets, error: null })
    },
  }
}

function createCurrencyBuilder() {
  return {
    async upsert(row: CurrencyRow) {
      const existing = rows.currencies.find((currency) => currency.user_id === row.user_id)
      if (existing) {
        Object.assign(existing, row)
      } else {
        rows.currencies.push(row)
      }

      return { error: null }
    },
  }
}

function createExpeditionBuilder() {
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
    limit() {
      return this
    },
    async maybeSingle() {
      return { data: rows.expeditions.find((row) => matches(row, state.filters)) ?? null, error: null }
    },
  }
}

function seedPet(overrides: Partial<PetRow> = {}) {
  const pet: PetRow = {
    id: '10000000-0000-4000-8000-000000000001',
    user_id: userId,
    token_id: `${userId}:TEST-PET-001`,
    contract_address: zeroAddress,
    chain_id: 1,
    name: 'Capy',
    element: 'citrus',
    stage: 1,
    token_uri: 'ipfs://test-pet',
    stats: {
      iv: 80,
      hp: 100,
      maxHp: 100,
      atk: 70,
      def: 60,
    },
    exp_current: 0,
    exp_next: 1000,
    birth_time: '2026-06-03T08:00:00.000Z',
    created_at: '2026-06-03T08:00:00.000Z',
    ...overrides,
  }
  rows.pets.push(pet)
  return pet
}

function matches<T extends Record<string, unknown>>(row: T, filters: Record<string, unknown>) {
  return Object.entries(filters).every(([key, value]) => row[key] === value)
}
