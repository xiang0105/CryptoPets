import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import jwt from 'jsonwebtoken'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Wallet } from 'ethers'

type AuthNonceRow = {
  nonce: string
  wallet: string
  message: string
  expires_at: string
  used_at: string | null
}

type UserRow = {
  id: string
  wallet: string
  username: string | null
}

const jwtSecret = 'integration-test-secret'
const userId = '00000000-0000-4000-8000-000000000001'
const nonceRows: AuthNonceRow[] = []
const userRows: UserRow[] = []
const initializePlayerIfNeeded = vi.fn()
const getPlayerProfile = vi.fn(async (id: string) => ({
  id,
  wallet: userRows.find((user) => user.id === id)?.wallet ?? '0x0000000000000000000000000000000000000000',
  username: null,
  coins: 100,
  pets: [],
  inventory: [],
  activeExpedition: null,
  chain: {
    enabled: false,
    chainId: null,
    nftContractAddress: null,
    materialContractAddress: null,
  },
}))

vi.mock('../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 0,
    SUPABASE_URL: 'http://localhost',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key',
    JWT_SECRET: jwtSecret,
    CORS_ORIGIN: 'http://localhost:5173',
    CHAIN_RPC_URL: undefined,
    CHAIN_ID: undefined,
    PET_NFT_CONTRACT_ADDRESS: undefined,
    MATERIAL_CONTRACT_ADDRESS: undefined,
  },
}))

vi.mock('../src/services/playerService.js', () => ({
  initializePlayerIfNeeded,
  getPlayerProfile,
}))

vi.mock('../src/config/supabase.js', () => ({
  supabase: {
    from(table: string) {
      if (table === 'auth_nonces') {
        return createAuthNonceBuilder()
      }

      if (table === 'users') {
        return createUserBuilder()
      }

      throw new Error(`Unexpected table: ${table}`)
    },
  },
}))

function createAuthNonceBuilder() {
  const state: {
    patch?: Partial<AuthNonceRow>
    nonce?: string
    usedAtShouldBeNull?: boolean
  } = {}

  return {
    async insert(row: Omit<AuthNonceRow, 'used_at'>) {
      nonceRows.push({ ...row, used_at: null })
      return { error: null }
    },
    select() {
      return this
    },
    update(patch: Partial<AuthNonceRow>) {
      state.patch = patch
      return this
    },
    eq(column: string, value: string) {
      if (column === 'nonce') {
        state.nonce = value
      }
      return this
    },
    is(column: string, value: null) {
      if (column === 'used_at' && value === null) {
        state.usedAtShouldBeNull = true
      }

      const row = nonceRows.find((item) => item.nonce === state.nonce)
      if (row && (!state.usedAtShouldBeNull || row.used_at === null) && state.patch) {
        Object.assign(row, state.patch)
      }

      return { error: null }
    },
    async maybeSingle() {
      return {
        data: nonceRows.find((row) => row.nonce === state.nonce) ?? null,
        error: null,
      }
    },
  }
}

function createUserBuilder() {
  const state: { wallet?: string } = {}

  return {
    upsert(row: { wallet: string }) {
      state.wallet = row.wallet
      return this
    },
    select() {
      return this
    },
    async single() {
      let user = userRows.find((row) => row.wallet === state.wallet)
      if (!user) {
        user = { id: userId, wallet: state.wallet!, username: null }
        userRows.push(user)
      }

      return { data: user, error: null }
    },
  }
}

describe('auth integration', () => {
  let server: Server
  let baseUrl: string

  beforeEach(async () => {
    nonceRows.length = 0
    userRows.length = 0
    initializePlayerIfNeeded.mockClear()
    getPlayerProfile.mockClear()

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

  it('creates a wallet login nonce', async () => {
    const wallet = Wallet.createRandom()

    const response = await post('/auth/nonce', { wallet: wallet.address })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.nonce).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    expect(body.message).toContain(wallet.address.toLowerCase())
    expect(Date.parse(body.expiresAt)).toBeGreaterThan(Date.now())
    expect(nonceRows).toHaveLength(1)
    expect(nonceRows[0]).toMatchObject({
      nonce: body.nonce,
      wallet: wallet.address.toLowerCase(),
      message: body.message,
      used_at: null,
    })
  })

  it('logs in with a valid signature and accepts the JWT on protected routes', async () => {
    const wallet = Wallet.createRandom()
    const challenge = await createChallenge(wallet)
    const signature = await wallet.signMessage(challenge.message)

    const loginResponse = await post('/auth/login', {
      wallet: wallet.address,
      nonce: challenge.nonce,
      message: challenge.message,
      signature,
    })
    const loginBody = await loginResponse.json()

    expect(loginResponse.status).toBe(200)
    expect(loginBody.token).toEqual(expect.any(String))
    expect(loginBody.player.wallet).toBe(wallet.address.toLowerCase())
    expect(initializePlayerIfNeeded).toHaveBeenCalledWith(userId)
    expect(getPlayerProfile).toHaveBeenCalledWith(userId)
    expect(nonceRows[0]?.used_at).toEqual(expect.any(String))

    const tokenPayload = jwt.verify(loginBody.token, jwtSecret, {
      issuer: 'cryptopets-api',
      audience: 'cryptopets-frontend',
    })
    expect(tokenPayload).toMatchObject({
      sub: userId,
      wallet: wallet.address.toLowerCase(),
    })

    const playerResponse = await fetch(`${baseUrl}/player`, {
      headers: { Authorization: `Bearer ${loginBody.token}` },
    })
    const playerBody = await playerResponse.json()

    expect(playerResponse.status).toBe(200)
    expect(playerBody.wallet).toBe(wallet.address.toLowerCase())
  })

  it('rejects a signature from a different wallet', async () => {
    const wallet = Wallet.createRandom()
    const impostor = Wallet.createRandom()
    const challenge = await createChallenge(wallet)
    const signature = await impostor.signMessage(challenge.message)

    const response = await post('/auth/login', {
      wallet: wallet.address,
      nonce: challenge.nonce,
      message: challenge.message,
      signature,
    })
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('INVALID_SIGNATURE')
    expect(nonceRows[0]?.used_at).toBeNull()
  })

  it('rejects an expired nonce', async () => {
    const wallet = Wallet.createRandom()
    const challenge = await createChallenge(wallet)
    nonceRows[0]!.expires_at = new Date(Date.now() - 1000).toISOString()
    const signature = await wallet.signMessage(challenge.message)

    const response = await post('/auth/login', {
      wallet: wallet.address,
      nonce: challenge.nonce,
      message: challenge.message,
      signature,
    })
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('LOGIN_CHALLENGE_EXPIRED')
    expect(nonceRows[0]?.used_at).toBeNull()
  })

  it('rejects nonce reuse', async () => {
    const wallet = Wallet.createRandom()
    const challenge = await createChallenge(wallet)
    const signature = await wallet.signMessage(challenge.message)
    const payload = {
      wallet: wallet.address,
      nonce: challenge.nonce,
      message: challenge.message,
      signature,
    }

    const firstResponse = await post('/auth/login', payload)
    const secondResponse = await post('/auth/login', payload)
    const body = await secondResponse.json()

    expect(firstResponse.status).toBe(200)
    expect(secondResponse.status).toBe(401)
    expect(body.error).toBe('INVALID_LOGIN_CHALLENGE')
  })

  it('returns stable auth errors for protected routes', async () => {
    const missingTokenResponse = await fetch(`${baseUrl}/player`)
    const invalidTokenResponse = await fetch(`${baseUrl}/player`, {
      headers: { Authorization: 'Bearer invalid-token' },
    })

    expect(missingTokenResponse.status).toBe(401)
    expect(await missingTokenResponse.json()).toMatchObject({ error: 'AUTH_REQUIRED' })
    expect(invalidTokenResponse.status).toBe(401)
    expect(await invalidTokenResponse.json()).toMatchObject({ error: 'INVALID_AUTH_TOKEN' })
  })

  it('rejects unknown request body fields', async () => {
    const wallet = Wallet.createRandom()

    const response = await post('/auth/nonce', { wallet: wallet.address, unexpected: true })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('VALIDATION_ERROR')
    expect(nonceRows).toHaveLength(0)
  })

  it('rejects unknown query parameters', async () => {
    const response = await fetch(`${baseUrl}/health?unexpected=true`)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('VALIDATION_ERROR')
  })

  async function createChallenge(wallet: Wallet) {
    const response = await post('/auth/nonce', { wallet: wallet.address })
    expect(response.status).toBe(200)
    return (await response.json()) as {
      nonce: string
      message: string
      expiresAt: string
    }
  }

  async function post(path: string, body: unknown) {
    return fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }
})
