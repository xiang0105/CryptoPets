import crypto from 'node:crypto'
import { ethers } from 'ethers'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import type { AuthLoginResponse, AuthNonceResponse } from '@cryptopets/shared'
import { env } from '../config/env.js'
import { supabase } from '../config/supabase.js'
import { HttpError } from '../utils/httpError.js'
import { getPlayerProfile, initializePlayerIfNeeded } from './playerService.js'

const loginSchema = z.object({
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  nonce: z.string().uuid(),
  message: z.string().min(1).max(1000),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
}).strict()

const NONCE_TTL_MS = 5 * 60 * 1000

export async function createLoginNonce(wallet: string): Promise<AuthNonceResponse> {
  const normalizedWallet = wallet.toLowerCase()
  const nonce = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS).toISOString()
  const message = buildLoginMessage(normalizedWallet, nonce, expiresAt)

  const { error } = await supabase.from('auth_nonces').insert({
    nonce,
    wallet: normalizedWallet,
    message,
    expires_at: expiresAt,
  })

  if (error) {
    throw new HttpError(500, 'NONCE_CREATE_FAILED')
  }

  return { nonce, message, expiresAt }
}

export async function loginWithSignature(input: unknown): Promise<AuthLoginResponse> {
  const body = loginSchema.parse(input)
  const normalizedWallet = body.wallet.toLowerCase()

  const { data: nonceRow, error: nonceError } = await supabase
    .from('auth_nonces')
    .select('nonce,wallet,message,expires_at,used_at')
    .eq('nonce', body.nonce)
    .maybeSingle()

  if (nonceError) {
    throw new HttpError(500, 'NONCE_LOOKUP_FAILED')
  }

  if (!nonceRow || nonceRow.wallet !== normalizedWallet || nonceRow.message !== body.message || nonceRow.used_at) {
    throw new HttpError(401, 'INVALID_LOGIN_CHALLENGE')
  }

  if (new Date(nonceRow.expires_at).getTime() <= Date.now()) {
    throw new HttpError(401, 'LOGIN_CHALLENGE_EXPIRED')
  }

  const recoveredWallet = ethers.verifyMessage(body.message, body.signature).toLowerCase()

  if (recoveredWallet !== normalizedWallet) {
    throw new HttpError(401, 'INVALID_SIGNATURE')
  }

  const { error: markUsedError } = await supabase
    .from('auth_nonces')
    .update({ used_at: new Date().toISOString() })
    .eq('nonce', body.nonce)
    .is('used_at', null)

  if (markUsedError) {
    throw new HttpError(500, 'NONCE_UPDATE_FAILED')
  }

  const { data: user, error: upsertError } = await supabase
    .from('users')
    .upsert({ wallet: normalizedWallet }, { onConflict: 'wallet' })
    .select('id,wallet,username')
    .single()

  if (upsertError || !user) {
    throw new HttpError(500, 'USER_UPSERT_FAILED')
  }

  const token = jwt.sign({ sub: user.id, wallet: normalizedWallet }, env.JWT_SECRET, {
    expiresIn: '7d',
    issuer: 'cryptopets-api',
    audience: 'cryptopets-frontend',
  })

  await initializePlayerIfNeeded(user.id, normalizedWallet as `0x${string}`)

  return {
    token,
    player: await getPlayerProfile(user.id),
  }
}

function buildLoginMessage(wallet: string, nonce: string, expiresAt: string) {
  return [
    env.WEB3_LOGIN_STATEMENT,
    '',
    `Domain: ${env.WEB3_LOGIN_DOMAIN}`,
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
    `Expires At: ${expiresAt}`,
  ].join('\n')
}
