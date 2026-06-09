import type { AuthNonceResponse, ExpeditionType } from '@cryptopets/shared'
import { apiRequest } from './client'

export function requestStartExpeditionNonce(wallet: string, petIds: string[], expeditionType: ExpeditionType) {
  return apiRequest<AuthNonceResponse>('/auth/nonce', {
    method: 'POST',
    body: JSON.stringify({
      wallet,
      action: 'start-expedition',
      petIds,
      expeditionType,
    }),
  })
}

export function requestClaimRewardNonce(wallet: string, expeditionId: string) {
  return apiRequest<AuthNonceResponse>('/auth/nonce', {
    method: 'POST',
    body: JSON.stringify({
      wallet,
      action: 'claim-reward',
      expeditionId,
    }),
  })
}
