import { createHash, randomUUID } from 'node:crypto'
import { getAddress, verifyMessage } from 'ethers'
import type { AppConfig } from './config.js'
import { HttpError, invalidRequest } from './errors.js'
import type { ExpeditionStore } from './expeditionStore.js'
import type { ExpeditionAction, ExpeditionType } from './expeditionTypes.js'
import { readAddress, readString, readUint } from './validation.js'

export interface AuthNonceResponse {
  nonce: string
  message: string
  expiresAt: string
}

interface StartExpeditionPayload {
  petIds: string[]
  expeditionType: ExpeditionType
}

interface ClaimRewardPayload {
  expeditionId: string
}

export type AuthActionPayload = StartExpeditionPayload | ClaimRewardPayload

export class AuthService {
  constructor(private config: AppConfig, private store: ExpeditionStore) {}

  createNonce(body: unknown): AuthNonceResponse {
    const input = parseNonceBody(body)
    const payloadHash = createPayloadHash(input.wallet, input.action, input.payload)
    const nonce = randomUUID()
    const createdAt = new Date()
    const expiresAt = new Date(createdAt.getTime() + this.config.authNonceTtlMs)
    const message = buildAuthMessage({
      wallet: input.wallet,
      action: input.action,
      payloadHash,
      nonce,
      expiresAt: expiresAt.toISOString()
    })

    this.store.createNonce({
      nonce,
      wallet: input.wallet,
      action: input.action,
      payloadHash,
      message,
      expiresAt: expiresAt.toISOString(),
      usedAt: null,
      createdAt: createdAt.toISOString()
    })

    return {
      nonce,
      message,
      expiresAt: expiresAt.toISOString()
    }
  }

  verify(input: {
    wallet: string
    action: ExpeditionAction
    payload: AuthActionPayload
    nonce: string
    message: string
    signature: string
    now?: Date
  }) {
    const wallet = readAddress(input.wallet, 'wallet')
    const nonce = readText(input.nonce, 'nonce')
    const message = readText(input.message, 'message')
    const signature = readText(input.signature, 'signature')
    const record = this.store.getNonce(nonce)

    if (!record) {
      throw new HttpError(401, 'INVALID_AUTH_CHALLENGE', 'Auth challenge was not found')
    }

    if (record.usedAt) {
      throw new HttpError(401, 'AUTH_CHALLENGE_USED', 'Auth challenge was already used')
    }

    const now = input.now ?? new Date()

    if (Date.parse(record.expiresAt) <= now.getTime()) {
      throw new HttpError(401, 'AUTH_CHALLENGE_EXPIRED', 'Auth challenge expired')
    }

    const payloadHash = createPayloadHash(wallet, input.action, input.payload)

    if (
      record.wallet !== wallet ||
      record.action !== input.action ||
      record.payloadHash !== payloadHash ||
      record.message !== message
    ) {
      throw new HttpError(401, 'INVALID_AUTH_CHALLENGE', 'Auth challenge does not match request')
    }

    let recovered = ''

    try {
      recovered = getAddress(verifyMessage(message, signature))
    } catch {
      throw new HttpError(401, 'INVALID_SIGNATURE', 'Signature is invalid')
    }

    if (recovered !== wallet) {
      throw new HttpError(401, 'INVALID_SIGNATURE', 'Signature does not match wallet')
    }

    this.store.markNonceUsed(nonce, now.toISOString())

    return wallet
  }
}

export function createPayloadHash(wallet: string, action: ExpeditionAction, payload: AuthActionPayload) {
  const normalized = normalizePayload(wallet, action, payload)
  return `0x${createHash('sha256').update(JSON.stringify(normalized)).digest('hex')}`
}

function parseNonceBody(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw invalidRequest('Request body must be an object')
  }

  const data = body as Record<string, unknown>
  const wallet = readAddress(data.wallet, 'wallet')
  const action = readAction(data.action)
  const payload = readPayload(data, action)

  return { wallet, action, payload }
}

function readAction(value: unknown): ExpeditionAction {
  if (value === 'start-expedition' || value === 'claim-reward') {
    return value
  }

  throw invalidRequest('action must be start-expedition or claim-reward')
}

function readPayload(body: Record<string, unknown>, action: ExpeditionAction): AuthActionPayload {
  if (action === 'start-expedition') {
    return {
      petIds: readPetIds(body.petIds),
      expeditionType: readExpeditionType(body.expeditionType)
    }
  }

  return {
    expeditionId: readString(body, 'expeditionId')
  }
}

function readPetIds(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    throw invalidRequest('petIds must be a non-empty array')
  }

  return value.map((item, index) => readUint(item, `petIds[${index}]`, { positive: true }).toString())
}

function readExpeditionType(value: unknown): ExpeditionType {
  if (value === 'orange' || value === 'apple' || value === 'snow-peach') {
    return value
  }

  throw invalidRequest('expeditionType is unknown')
}

function normalizePayload(wallet: string, action: ExpeditionAction, payload: AuthActionPayload) {
  if (action === 'start-expedition') {
    const startPayload = payload as StartExpeditionPayload

    return {
      wallet,
      action,
      petIds: startPayload.petIds.map((item, index) => readUint(item, `petIds[${index}]`, { positive: true }).toString()),
      expeditionType: readExpeditionType(startPayload.expeditionType)
    }
  }

  return {
    wallet,
    action,
    expeditionId: readText((payload as ClaimRewardPayload).expeditionId, 'expeditionId')
  }
}

function buildAuthMessage(input: {
  wallet: string
  action: ExpeditionAction
  payloadHash: string
  nonce: string
  expiresAt: string
}) {
  return [
    'CryptoPets Expedition',
    `Action: ${input.action}`,
    `Wallet: ${input.wallet}`,
    `Payload Hash: ${input.payloadHash}`,
    `Nonce: ${input.nonce}`,
    `Expires At: ${input.expiresAt}`
  ].join('\n')
}

function readText(value: unknown, name: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw invalidRequest(`${name} must be a non-empty string`)
  }

  return value.trim()
}
