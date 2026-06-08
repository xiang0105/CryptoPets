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
  base_pet_id: string
  iv: number
  level: number
  skin_id: number
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
  NFT_OWNER_PRIVATE_KEY: undefined as string | undefined,
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

const mockChainPets = vi.hoisted(() => ({
  pets: [] as Array<{ tokenId: string; name: string; iv: number; level: number; skinId: number }>,
  mintedPets: [] as Array<{ wallet: string; petName: string; iv: number }>,
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

vi.mock('../src/services/chainPetProvider.js', () => ({
  isChainPetSyncEnabled() {
    return Boolean(mockEnv.RPC_URL && mockEnv.NFT_CONTRACT_ADDRESS)
  },
  createChainPetProvider() {
    return {
      async getWalletPets() {
        return mockChainPets.pets
      },
      async mintStarterPet(wallet: string, petName: string, iv: number) {
        const tokenId = String(mockChainPets.pets.length + 1)
        mockChainPets.mintedPets.push({ wallet, petName, iv })
        mockChainPets.pets.push({ tokenId, name: petName, iv, level: 1, skinId: 0 })
        return tokenId
      },
    }
  },
}))

describe('player service', () => {
  beforeEach(() => {
    rows.users.length = 0
    rows.pets.length = 0
    rows.currencies.length = 0
    rows.expeditions.length = 0
    mockChainPets.pets.length = 0
    mockChainPets.mintedPets.length = 0

    mockEnv.RPC_URL = undefined
    mockEnv.NFT_CONTRACT_ADDRESS = undefined
    mockEnv.NFT_OWNER_PRIVATE_KEY = undefined
    mockEnv.CHAIN_ID = 1
  })

  it('creates one unique local capybara and initial currency for a new player', async () => {
    const { initializePlayerIfNeeded } = await import('../src/services/playerService.js')

    await initializePlayerIfNeeded(userId, wallet)

    expect(rows.pets).toHaveLength(1)
    expect(rows.pets[0]).toEqual(
      expect.objectContaining({
        user_id: userId,
        contract_address: zeroAddress,
        chain_id: 1,
        level: 1,
        exp_current: 0,
        exp_next: 1000,
      }),
    )
    expect(rows.pets[0]?.token_id).toMatch(new RegExp(`^${userId}:UNIQUE-PET-[A-F0-9]{6}$`))
    expect(rows.pets[0]?.name).toMatch(/-[A-F0-9]{6}$/)
    expect(rows.pets[0]?.base_pet_id).toMatch(/^TEST-PET-00[1-4]$/)
    expect(rows.pets[0]?.iv).toBeGreaterThanOrEqual(60)
    expect(rows.pets[0]?.iv).toBeLessThanOrEqual(100)
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
    mockEnv.NFT_OWNER_PRIVATE_KEY = '0x1111111111111111111111111111111111111111111111111111111111111111'
    mockEnv.CHAIN_ID = 11155111
    rows.users.push({ id: userId, wallet, username: null })

    const profile = await getPlayerProfile(userId)

    expect(profile.chain).toEqual({
      enabled: true,
      chainId: 11155111,
      nftContractAddress: configuredNftAddress,
    })
  })

  it('syncs on-chain token id, iv, level, skin id, and pet name when chain is enabled', async () => {
    const { getPlayerProfile } = await import('../src/services/playerService.js')
    mockEnv.RPC_URL = 'https://rpc.test'
    mockEnv.NFT_CONTRACT_ADDRESS = configuredNftAddress
    mockEnv.CHAIN_ID = 11155111
    mockChainPets.pets.push({ tokenId: '7', name: 'MAX', iv: 20, level: 4, skinId: 3 })
    rows.users.push({ id: userId, wallet, username: 'Tester' })

    const profile = await getPlayerProfile(userId)

    expect(rows.pets).toEqual([
      expect.objectContaining({
        user_id: userId,
        token_id: '7',
        contract_address: configuredNftAddress,
        chain_id: 11155111,
        base_pet_id: 'TEST-PET-002',
        iv: 20,
        level: 4,
        skin_id: 3,
        stats: {
          iv: 20,
          hp: 114,
          maxHp: 114,
          atk: 102,
          def: 48,
        },
      }),
    ])
    expect(profile.pets).toEqual([
      expect.objectContaining({
        tokenId: '7',
        basePetId: 'TEST-PET-002',
        level: 4,
        skinId: 3,
        stats: {
          iv: 20,
          hp: 114,
          maxHp: 114,
          atk: 102,
          def: 48,
        },
      }),
    ])
  })

  it('mints and syncs a starter pet when chain is enabled and wallet has no on-chain pets', async () => {
    const { initializePlayerIfNeeded } = await import('../src/services/playerService.js')
    mockEnv.RPC_URL = 'https://rpc.test'
    mockEnv.NFT_CONTRACT_ADDRESS = configuredNftAddress
    mockEnv.NFT_OWNER_PRIVATE_KEY = '0x1111111111111111111111111111111111111111111111111111111111111111'
    mockEnv.CHAIN_ID = 11155111

    await initializePlayerIfNeeded(userId, wallet)

    expect(mockChainPets.mintedPets).toEqual([
      expect.objectContaining({
        wallet,
        petName: expect.stringMatching(/^(sakiko|MAX|SONORATO|CANESAN)$/),
        iv: expect.any(Number),
      }),
    ])
    expect(rows.pets).toEqual([
      expect.objectContaining({
        user_id: userId,
        token_id: '1',
        contract_address: configuredNftAddress,
        chain_id: 11155111,
        level: 1,
      }),
    ])
    expect(rows.currencies).toEqual([expect.objectContaining({ user_id: userId, coins: 0 })])
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
    async upsert(pets: PetRow[]) {
      const now = new Date().toISOString()
      for (const pet of pets) {
        const existing = rows.pets.find(
          (row) =>
            row.chain_id === pet.chain_id &&
            row.contract_address === pet.contract_address &&
            row.token_id === pet.token_id,
        )

        if (existing) {
          Object.assign(existing, pet)
        } else {
          rows.pets.push({
            ...pet,
            id: pet.id ?? `10000000-0000-4000-8000-${String(rows.pets.length + 1).padStart(12, '0')}`,
            exp_current: pet.exp_current ?? 0,
            exp_next: pet.exp_next ?? 1000,
            birth_time: pet.birth_time ?? now,
            created_at: pet.created_at ?? now,
          })
        }
      }

      return { error: null }
    },
    delete() {
      return this
    },
    in(column: string, values: unknown[]) {
      if (column === 'id') {
        for (let index = rows.pets.length - 1; index >= 0; index -= 1) {
          if (values.includes(rows.pets[index]!.id)) {
            rows.pets.splice(index, 1)
          }
        }
      }

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
    base_pet_id: 'TEST-PET-001',
    iv: 80,
    level: 1,
    skin_id: 0,
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
