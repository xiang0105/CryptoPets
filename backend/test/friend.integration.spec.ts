import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import jwt from 'jsonwebtoken'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type UserRow = {
  id: string
  wallet: string
  username: string | null
}

type FriendRequestRow = {
  id: string
  requester_id: string
  recipient_id: string
  status: 'pending' | 'accepted' | 'declined'
}

type FriendshipRow = {
  user_id: string
  friend_id: string
  created_at: string
  friend?: UserRow | null
}

const jwtSecret = 'integration-test-secret'
const userId = '00000000-0000-4000-8000-000000000001'
const friendId = '00000000-0000-4000-8000-000000000002'
const strangerId = '00000000-0000-4000-8000-000000000003'
const wallet = '0x1111111111111111111111111111111111111111'
const friendWallet = '0x2222222222222222222222222222222222222222'
const strangerWallet = '0x3333333333333333333333333333333333333333'
const unknownWallet = '0x9999999999999999999999999999999999999999'
const userRows: UserRow[] = []
const friendRequestRows: FriendRequestRow[] = []
const friendshipRows: FriendshipRow[] = []
let nextRequestNumber = 1

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
      if (table === 'users') {
        return createUserBuilder()
      }

      if (table === 'friend_requests') {
        return createFriendRequestBuilder()
      }

      if (table === 'friends') {
        return createFriendshipBuilder()
      }

      throw new Error(`Unexpected table: ${table}`)
    },
  },
}))

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
      const user = userRows.find((row) => matches(row, state.filters))
      return user ? { data: user, error: null } : { data: null, error: new Error('No row found') }
    },
    async maybeSingle() {
      return { data: userRows.find((row) => matches(row, state.filters)) ?? null, error: null }
    },
  }
}

function createFriendRequestBuilder() {
  const state: {
    filters: Record<string, unknown>
    patch?: Partial<FriendRequestRow>
  } = { filters: {} }

  return {
    select() {
      return this
    },
    eq(column: string, value: unknown) {
      state.filters[column] = value
      if (state.patch) {
        applyFriendRequestPatch(state.filters, state.patch)
      }
      return this
    },
    upsert(row: Omit<FriendRequestRow, 'id'>) {
      const existing = friendRequestRows.find(
        (item) => item.requester_id === row.requester_id && item.recipient_id === row.recipient_id,
      )
      if (existing) {
        Object.assign(existing, row)
      } else {
        friendRequestRows.push({
          id: `40000000-0000-4000-8000-${String(nextRequestNumber++).padStart(12, '0')}`,
          ...row,
        })
      }
      return { error: null }
    },
    update(patch: Partial<FriendRequestRow>) {
      state.patch = patch
      return this
    },
    async maybeSingle() {
      return { data: friendRequestRows.find((row) => matches(row, state.filters)) ?? null, error: null }
    },
  }
}

function createFriendshipBuilder() {
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
    upsert(rows: Array<Pick<FriendshipRow, 'user_id' | 'friend_id'>>) {
      for (const row of rows) {
        const existing = friendshipRows.find(
          (item) => item.user_id === row.user_id && item.friend_id === row.friend_id,
        )
        if (!existing) {
          friendshipRows.push({ ...row, created_at: new Date().toISOString() })
        }
      }
      return { error: null }
    },
    then(resolve: (value: { data: FriendshipRow[]; error: null }) => void) {
      resolve({ data: friendshipRows.filter((row) => matches(row, state.filters)).map(withFriend), error: null })
    },
  }
}

function applyFriendRequestPatch(filters: Record<string, unknown>, patch: Partial<FriendRequestRow>) {
  const row = friendRequestRows.find((item) => matches(item, filters))
  if (row) {
    Object.assign(row, patch)
  }
}

function withFriend(row: FriendshipRow): FriendshipRow {
  return { ...row, friend: userRows.find((user) => user.id === row.friend_id) ?? null }
}

function matches<T extends Record<string, unknown>>(row: T, filters: Record<string, unknown>) {
  return Object.entries(filters).every(([key, value]) => row[key] === value)
}

describe('friend integration', () => {
  let server: Server
  let baseUrl: string

  beforeEach(async () => {
    userRows.length = 0
    friendRequestRows.length = 0
    friendshipRows.length = 0
    nextRequestNumber = 1
    userRows.push(
      { id: userId, wallet, username: 'Player One' },
      { id: friendId, wallet: friendWallet, username: 'Player Two' },
      { id: strangerId, wallet: strangerWallet, username: null },
    )

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

  it('creates a pending friend request', async () => {
    const response = await postAs(userId, wallet, '/add-friend', { wallet: friendWallet })
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body).toEqual({ status: 'pending' })
    expect(friendRequestRows).toEqual([
      expect.objectContaining({
        requester_id: userId,
        recipient_id: friendId,
        status: 'pending',
      }),
    ])
    expect(friendshipRows).toHaveLength(0)
  })

  it('accepts reciprocal pending requests and lists both friends', async () => {
    friendRequestRows.push({
      id: `40000000-0000-4000-8000-${String(nextRequestNumber++).padStart(12, '0')}`,
      requester_id: friendId,
      recipient_id: userId,
      status: 'pending',
    })

    const acceptResponse = await postAs(userId, wallet, '/add-friend', { wallet: friendWallet })
    const acceptBody = await acceptResponse.json()
    const userFriendsResponse = await getAs(userId, wallet, '/friends')
    const userFriends = await userFriendsResponse.json()
    const friendFriendsResponse = await getAs(friendId, friendWallet, '/friends')
    const friendFriends = await friendFriendsResponse.json()

    expect(acceptResponse.status).toBe(201)
    expect(acceptBody).toEqual({ status: 'accepted' })
    expect(friendRequestRows[0]?.status).toBe('accepted')
    expect(friendshipRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ user_id: userId, friend_id: friendId }),
        expect.objectContaining({ user_id: friendId, friend_id: userId }),
      ]),
    )
    expect(userFriendsResponse.status).toBe(200)
    expect(userFriends).toEqual([
      expect.objectContaining({
        id: friendId,
        wallet: friendWallet,
        username: 'Player Two',
        since: expect.any(String),
      }),
    ])
    expect(friendFriendsResponse.status).toBe(200)
    expect(friendFriends).toEqual([
      expect.objectContaining({
        id: userId,
        wallet,
        username: 'Player One',
        since: expect.any(String),
      }),
    ])
  })

  it('rejects adding yourself', async () => {
    const response = await postAs(userId, wallet, '/add-friend', { wallet })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('CANNOT_ADD_SELF')
    expect(friendRequestRows).toHaveLength(0)
  })

  it('rejects unknown wallets', async () => {
    const response = await postAs(userId, wallet, '/add-friend', { wallet: unknownWallet })
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe('FRIEND_WALLET_NOT_FOUND')
    expect(friendRequestRows).toHaveLength(0)
  })

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

  async function getAs(userId: string, userWallet: string, path: string) {
    return fetch(`${baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${jwt.sign({ sub: userId, wallet: userWallet }, jwtSecret)}`,
      },
    })
  }
})
