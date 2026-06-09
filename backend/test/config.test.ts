import { describe, expect, it } from 'vitest'
import { ConfigError, loadConfig } from '../src/config.js'

describe('loadConfig', () => {
  it('reports invalid contract addresses without exposing private keys', () => {
    expect(() => loadConfig({
      CRYPTO_PETS_ADDRESS: 'not-an-address',
      DEPLOYER_PRIVATE_KEY: '0x1234567890privatevalue'
    })).toThrow(ConfigError)

    try {
      loadConfig({
        CRYPTO_PETS_ADDRESS: 'not-an-address',
        DEPLOYER_PRIVATE_KEY: '0x1234567890privatevalue'
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError)
      expect((error as Error).message).toContain('CRYPTO_PETS_ADDRESS')
      expect((error as Error).message).not.toContain('privatevalue')
    }
  })
})
