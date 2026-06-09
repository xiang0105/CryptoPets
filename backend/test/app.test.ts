import { AddressInfo } from 'node:net'
import { describe, expect, it } from 'vitest'
import { Interface } from 'ethers'
import { createApp } from '../src/app.js'
import { cryptoPetsAbi } from '../src/abi.js'
import { ChainServices } from '../src/chain.js'
import type { AppConfig } from '../src/config.js'

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
  marketCacheMs: 15000
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
})

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
