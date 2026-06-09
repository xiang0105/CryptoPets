import { describe, expect, it } from 'vitest'
import { Wallet } from 'ethers'
import { AuthService } from '../src/authService.js'
import type { AppConfig } from '../src/config.js'
import { ExpeditionStore } from '../src/expeditionStore.js'
import type { HttpError } from '../src/errors.js'

const baseConfig: AppConfig = {
  port: 3400,
  corsOrigin: 'http://localhost:5400',
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
  chainId: 11155111,
  cryptoPetsAddress: '0x8F71AddC5b56D148727d129F54e31d24f632CeD0',
  cryptoMaterialsAddress: '0xA6E9ec01E2fb1e82db2602719c13D2cC15446E56',
  petsFromBlock: 11009607,
  materialsFromBlock: 11009614,
  deployerPrivateKey: '',
  adminApiKey: '',
  marketCacheMs: 15000,
  expeditionDbPath: ':memory:',
  authNonceTtlMs: 300000
}

describe('AuthService', () => {
  it('rejects replayed nonce', async () => {
    const store = new ExpeditionStore(':memory:')
    const auth = new AuthService(baseConfig, store)
    const wallet = Wallet.createRandom()
    const challenge = auth.createNonce({
      wallet: wallet.address,
      action: 'start-expedition',
      petIds: ['1'],
      expeditionType: 'orange'
    })
    const signature = await wallet.signMessage(challenge.message)
    const input = {
      wallet: wallet.address,
      action: 'start-expedition' as const,
      payload: {
        petIds: ['1'],
        expeditionType: 'orange' as const
      },
      nonce: challenge.nonce,
      message: challenge.message,
      signature
    }

    expect(auth.verify(input)).toBe(wallet.address)
    expectHttpError(() => auth.verify(input), 'AUTH_CHALLENGE_USED')

    store.close()
  })

  it('rejects expired nonce', async () => {
    const store = new ExpeditionStore(':memory:')
    const auth = new AuthService({ ...baseConfig, authNonceTtlMs: 1 }, store)
    const wallet = Wallet.createRandom()
    const challenge = auth.createNonce({
      wallet: wallet.address,
      action: 'claim-reward',
      expeditionId: 'expedition-1'
    })
    const signature = await wallet.signMessage(challenge.message)

    expectHttpError(() => auth.verify({
      wallet: wallet.address,
      action: 'claim-reward',
      payload: {
        expeditionId: 'expedition-1'
      },
      nonce: challenge.nonce,
      message: challenge.message,
      signature,
      now: new Date(Date.parse(challenge.expiresAt) + 1)
    }), 'AUTH_CHALLENGE_EXPIRED')

    store.close()
  })

  it('rejects wrong payload', async () => {
    const store = new ExpeditionStore(':memory:')
    const auth = new AuthService(baseConfig, store)
    const wallet = Wallet.createRandom()
    const challenge = auth.createNonce({
      wallet: wallet.address,
      action: 'start-expedition',
      petIds: ['1'],
      expeditionType: 'orange'
    })
    const signature = await wallet.signMessage(challenge.message)

    expectHttpError(() => auth.verify({
      wallet: wallet.address,
      action: 'start-expedition',
      payload: {
        petIds: ['2'],
        expeditionType: 'orange'
      },
      nonce: challenge.nonce,
      message: challenge.message,
      signature
    }), 'INVALID_AUTH_CHALLENGE')

    store.close()
  })

  it('rejects signature from another wallet', async () => {
    const store = new ExpeditionStore(':memory:')
    const auth = new AuthService(baseConfig, store)
    const wallet = Wallet.createRandom()
    const otherWallet = Wallet.createRandom()
    const challenge = auth.createNonce({
      wallet: wallet.address,
      action: 'claim-reward',
      expeditionId: 'expedition-1'
    })
    const signature = await otherWallet.signMessage(challenge.message)

    expectHttpError(() => auth.verify({
      wallet: wallet.address,
      action: 'claim-reward',
      payload: {
        expeditionId: 'expedition-1'
      },
      nonce: challenge.nonce,
      message: challenge.message,
      signature
    }), 'INVALID_SIGNATURE')

    store.close()
  })
})

function expectHttpError(action: () => unknown, code: string) {
  try {
    action()
    throw new Error('Expected action to throw')
  } catch (error) {
    expect((error as HttpError).code).toBe(code)
  }
}
