import { AddressInfo } from 'node:net'
import { describe, expect, it } from 'vitest'
import { Interface } from 'ethers'
import { createApp, type BackendServices } from '../src/app.js'
import { cryptoPetsAbi } from '../src/abi.js'
import { ChainServices } from '../src/chain.js'
import type { AppConfig } from '../src/config.js'
import { ExpeditionStore } from '../src/expeditionStore.js'

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

describe('backend app', () => {
  it('rejects admin API when ADMIN_API_KEY is missing', async () => {
    const app = createApp(baseConfig, new ChainServices(baseConfig))
    const response = await request(app, 'POST', '/admin/materials/increase', {
      to: '0x86d892de0CF9256401df49Aa08d51d0bC75A106d',
      materialId: '1',
      amount: '1'
    })

    expect(response.status).toBe(503)
    expect(response.body.error).toBe('ADMIN_API_KEY_NOT_CONFIGURED')
  })

  it('rejects admin API when x-admin-api-key is wrong', async () => {
    const config = { ...baseConfig, adminApiKey: 'secret' }
    const app = createApp(config, new ChainServices(config))
    const response = await request(app, 'POST', '/admin/materials/increase', {
      to: '0x86d892de0CF9256401df49Aa08d51d0bC75A106d',
      materialId: '1',
      amount: '1'
    })

    expect(response.status).toBe(401)
    expect(response.body.error).toBe('ADMIN_API_KEY_INVALID')
  })

  it('returns a clear error when admin signer is missing', async () => {
    const config = { ...baseConfig, adminApiKey: 'secret' }
    const app = createApp(config, new ChainServices(config))
    const response = await request(app, 'POST', '/admin/materials/increase', {
      to: '0x86d892de0CF9256401df49Aa08d51d0bC75A106d',
      materialId: '1',
      amount: '1'
    }, { 'x-admin-api-key': 'secret' })

    expect(response.status).toBe(503)
    expect(response.body.error).toBe('DEPLOYER_PRIVATE_KEY_NOT_CONFIGURED')
  })

  it('builds pet listing transaction parameters', async () => {
    const app = createApp(baseConfig, new ChainServices(baseConfig))
    const response = await request(app, 'POST', '/tx/pets/list', {
      tokenId: '1',
      priceWei: '100'
    })
    const contractInterface = new Interface(cryptoPetsAbi)
    const decoded = contractInterface.decodeFunctionData('listPet', response.body.data)

    expect(response.status).toBe(200)
    expect(response.body.to).toBe(baseConfig.cryptoPetsAddress)
    expect(response.body.value).toBe('0')
    expect(response.body.chainId).toBe(11155111)
    expect(decoded[0]).toBe(1n)
    expect(decoded[1]).toBe(100n)
  })

  it('rejects non-uint material ids', async () => {
    const app = createApp(baseConfig, new ChainServices(baseConfig))
    const response = await request(app, 'POST', '/tx/materials/list', {
      materialId: 'MAT-2C',
      amount: '1',
      priceWei: '100'
    })

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('INVALID_REQUEST')
  })

  it('creates database material listings and completes purchases with material transfer transactions', async () => {
    const store = new ExpeditionStore(':memory:')
    const sellerWallet = '0x86d892de0CF9256401df49Aa08d51d0bC75A106d'
    const buyerWallet = '0xD8b6b7d402DDC69788f51eD613c3c3e9dDDCAB7e'
    const materialAdminCalls: Array<{ functionName: string; args: unknown[]; confirmations?: number }> = []
    const app = createApp(baseConfig, createMaterialBalanceServices({ '2': '10' }, materialAdminCalls, {
      hash: '0xbuy',
      from: buyerWallet,
      to: sellerWallet,
      value: '250000000000000000'
    }), undefined, undefined, store)

    try {
      const createResponse = await request(app, 'POST', '/market/materials', {
        sellerWallet,
        materialId: 'MAT-2C',
        amount: 2,
        price: 0.25
      })

      expect(createResponse.status).toBe(200)
      expect(createResponse.body.listing.status).toBe('active')
      expect(createResponse.body.listing.materialId).toBe('MAT-2C')
      expect(store.getReservedMaterialAmounts(sellerWallet)).toEqual({ 'MAT-2C': 2 })

      const sellerTransactions = await request(app, 'GET', `/wallets/${sellerWallet}/transactions`)
      expect(sellerTransactions.body.transactions).toEqual([
        expect.objectContaining({
          action: 'list',
          materialId: 'MAT-2C',
          materialAmount: 2,
          sepoliaAmount: '0'
        })
      ])

      const listingId = createResponse.body.listing.id as string
      const buyResponse = await request(app, 'POST', `/market/materials/${listingId}/buy`, {
        buyerWallet,
        paymentTxHash: '0xbuy'
      })

      expect(buyResponse.status).toBe(200)
      expect(buyResponse.body.listing.status).toBe('sold')
      expect(buyResponse.body.listing.buyerId).toBe(buyerWallet)
      expect(store.getReservedMaterialAmounts(sellerWallet)).toEqual({})
      expect(materialAdminCalls).toEqual([
        { functionName: 'decreaseMaterial', args: [sellerWallet, 2n, 2n], confirmations: 1 },
        { functionName: 'increaseMaterial', args: [buyerWallet, 2n, 2n], confirmations: 1 }
      ])

      const marketResponse = await request(app, 'GET', '/market/materials')
      expect(marketResponse.body.listings).toEqual([])

      const buyerTransactions = await request(app, 'GET', `/wallets/${buyerWallet}/transactions`)
      expect(buyerTransactions.body.transactions).toEqual([
        expect.objectContaining({
          action: 'buy',
          materialId: 'MAT-2C',
          materialAmount: 2,
          sepoliaAmount: '-0.25'
        })
      ])

      const sellerSaleTransactions = await request(app, 'GET', `/wallets/${sellerWallet}/transactions`)
      expect(sellerSaleTransactions.body.transactions).toEqual([
        expect.objectContaining({
          action: 'sell',
          materialId: 'MAT-2C',
          materialAmount: 2,
          sepoliaAmount: '0.25'
        }),
        expect.objectContaining({
          action: 'list',
          materialId: 'MAT-2C',
          materialAmount: 2,
          sepoliaAmount: '0'
        })
      ])
    } finally {
      store.close()
    }
  })

  it('rejects buying your own database material listing with a clear conflict error', async () => {
    const store = new ExpeditionStore(':memory:')
    const sellerWallet = '0x86d892de0CF9256401df49Aa08d51d0bC75A106d'
    const app = createApp(baseConfig, createMaterialBalanceServices({ '2': '10' }), undefined, undefined, store)

    try {
      const createResponse = await request(app, 'POST', '/market/materials', {
        sellerWallet,
        materialId: 'MAT-2C',
        amount: 1,
        price: 0.01
      })
      const buyResponse = await request(app, 'POST', `/market/materials/${createResponse.body.listing.id}/buy`, {
        buyerWallet: sellerWallet,
        paymentTxHash: '0xbuy'
      })

      expect(createResponse.status).toBe(200)
      expect(buyResponse.status).toBe(409)
      expect(buyResponse.body.error).toBe('CANNOT_BUY_OWN_LISTING')
    } finally {
      store.close()
    }
  })

  it('does not write cancellation records into recent transactions', async () => {
    const store = new ExpeditionStore(':memory:')
    const sellerWallet = '0x86d892de0CF9256401df49Aa08d51d0bC75A106d'
    const app = createApp(baseConfig, createMaterialBalanceServices({ '2': '10' }), undefined, undefined, store)

    try {
      const createResponse = await request(app, 'POST', '/market/materials', {
        sellerWallet,
        materialId: 'MAT-2C',
        amount: 1,
        price: 0.01
      })
      const cancelResponse = await request(app, 'POST', `/market/materials/${createResponse.body.listing.id}/cancel`, {
        sellerWallet
      })
      const transactionsResponse = await request(app, 'GET', `/wallets/${sellerWallet}/transactions`)

      expect(createResponse.status).toBe(200)
      expect(cancelResponse.status).toBe(200)
      expect(transactionsResponse.body.transactions.map((item: { action: string }) => item.action)).toEqual(['list'])
    } finally {
      store.close()
    }
  })

  it('normalizes chain material ids when creating database listings', async () => {
    const store = new ExpeditionStore(':memory:')
    const sellerWallet = '0x86d892de0CF9256401df49Aa08d51d0bC75A106d'
    const app = createApp(baseConfig, createMaterialBalanceServices({ '2': '10' }), undefined, undefined, store)

    try {
      const response = await request(app, 'POST', '/market/materials', {
        sellerWallet,
        materialId: '2',
        amount: 1,
        price: 0.01
      })

      expect(response.status).toBe(200)
      expect(response.body.listing.materialId).toBe('MAT-2C')
    } finally {
      store.close()
    }
  })

  it('subtracts database market reservations from wallet material balances', async () => {
    const store = new ExpeditionStore(':memory:')
    const sellerWallet = '0x86d892de0CF9256401df49Aa08d51d0bC75A106d'
    const app = createApp(baseConfig, createMaterialBalanceServices({ '2': '2', '4': '1' }), undefined, undefined, store)

    try {
      const createResponse = await request(app, 'POST', '/market/materials', {
        sellerWallet,
        materialId: 'MAT-2C',
        amount: 1,
        price: 0.01
      })

      expect(createResponse.status).toBe(200)

      const walletResponse = await request(app, 'GET', `/wallets/${sellerWallet}/materials?ids=2,4`)

      expect(walletResponse.status).toBe(200)
      expect(walletResponse.body.balances).toEqual([
        { materialId: '2', amount: '1' },
        { materialId: '4', amount: '1' }
      ])
    } finally {
      store.close()
    }
  })

  it('rejects database material listings that exceed the available unreserved balance', async () => {
    const store = new ExpeditionStore(':memory:')
    const sellerWallet = '0x86d892de0CF9256401df49Aa08d51d0bC75A106d'
    const app = createApp(baseConfig, createMaterialBalanceServices({ '2': '2' }), undefined, undefined, store)

    try {
      const firstResponse = await request(app, 'POST', '/market/materials', {
        sellerWallet,
        materialId: 'MAT-2C',
        amount: 2,
        price: 0.01
      })
      const secondResponse = await request(app, 'POST', '/market/materials', {
        sellerWallet,
        materialId: 'MAT-2C',
        amount: 1,
        price: 0.01
      })

      expect(firstResponse.status).toBe(200)
      expect(secondResponse.status).toBe(400)
      expect(secondResponse.body.message).toBe('amount exceeds available material balance')
    } finally {
      store.close()
    }
  })
})

function createMaterialBalanceServices(
  amountsByMaterialId: Record<string, string>,
  materialAdminCalls: Array<{ functionName: string; args: unknown[]; confirmations?: number }> = [],
  confirmedNativeTransaction: { hash: string; from: string; to: string; value: string } | null = null
): BackendServices {
  return {
    getContracts: () => ({
      chainId: baseConfig.chainId,
      cryptoPetsAddress: baseConfig.cryptoPetsAddress,
      cryptoMaterialsAddress: baseConfig.cryptoMaterialsAddress
    }),
    getTotalPets: async () => '0',
    getPetOwner: async () => '',
    getPet: async () => null,
    getWalletPets: async () => [],
    getPetListing: async () => null,
    getPetMarketListings: async () => [],
    getMaterialBalance: async (_wallet, materialId) => ({
      materialId: materialId.toString(),
      amount: amountsByMaterialId[materialId.toString()] ?? '0'
    }),
    getWalletMaterialBalances: async (_wallet, materialIds) => materialIds.map((materialId) => ({
      materialId: materialId.toString(),
      amount: amountsByMaterialId[materialId.toString()] ?? '0'
    })),
    getMaterialListing: async () => null,
    getMaterialMarketListings: async () => [],
    buildPetTx: () => ({ to: '', data: '0x', value: '0', chainId: baseConfig.chainId }),
    buildMaterialTx: () => ({ to: '', data: '0x', value: '0', chainId: baseConfig.chainId }),
    sendPetAdminTx: async () => ({ hash: '' }),
    sendMaterialAdminTx: async () => ({ hash: '' }),
    sendMaterialAdminTxAndWait: async (functionName, args, confirmations) => {
      materialAdminCalls.push({ functionName, args, confirmations })
      return { hash: '' }
    },
    getConfirmedNativeTransaction: async (hash) => {
      if (!confirmedNativeTransaction || hash !== confirmedNativeTransaction.hash) {
        return null
      }

      return {
        hash: confirmedNativeTransaction.hash,
        from: confirmedNativeTransaction.from,
        to: confirmedNativeTransaction.to,
        value: confirmedNativeTransaction.value,
        chainId: baseConfig.chainId,
        nonce: 0,
        blockNumber: 1,
        status: 1
      }
    }
  }
}

async function request(
  app: ReturnType<typeof createApp>,
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const server = app.listen(0)
  const address = server.address() as AddressInfo

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
    const responseBody = await response.json()

    return {
      status: response.status,
      body: responseBody
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}
