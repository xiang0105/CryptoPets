import dotenv from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { isAddress } from 'ethers'

export interface AppConfig {
  port: number
  corsOrigin: string
  rpcUrl: string
  chainId: number
  cryptoPetsAddress: string
  cryptoMaterialsAddress: string
  petsFromBlock: number
  materialsFromBlock: number
  deployerPrivateKey: string
  adminApiKey: string
  marketCacheMs: number
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

const defaults = {
  port: '3400',
  corsOrigin: 'http://localhost:5400',
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
  chainId: '11155111',
  cryptoPetsAddress: '0x8F71AddC5b56D148727d129F54e31d24f632CeD0',
  cryptoMaterialsAddress: '0xA6E9ec01E2fb1e82db2602719c13D2cC15446E56',
  petsFromBlock: '11009607',
  materialsFromBlock: '11009614',
  marketCacheMs: '15000'
}

export function loadEnvFiles() {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '..', '.env'),
    resolve(process.cwd(), '..', '..', '.env')
  ]
  const seen = new Set<string>()

  for (const filePath of candidates) {
    if (!seen.has(filePath) && existsSync(filePath)) {
      dotenv.config({ path: filePath, override: false })
      seen.add(filePath)
    }
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = readNumber(env.PORT, defaults.port, 'PORT')
  const chainId = readNumber(env.CHAIN_ID, defaults.chainId, 'CHAIN_ID')
  const petsFromBlock = readNumber(env.PETS_FROM_BLOCK, defaults.petsFromBlock, 'PETS_FROM_BLOCK')
  const materialsFromBlock = readNumber(env.MATERIALS_FROM_BLOCK, defaults.materialsFromBlock, 'MATERIALS_FROM_BLOCK')
  const marketCacheMs = readNumber(env.MARKET_CACHE_MS, defaults.marketCacheMs, 'MARKET_CACHE_MS')
  const cryptoPetsAddress = env.CRYPTO_PETS_ADDRESS || defaults.cryptoPetsAddress
  const cryptoMaterialsAddress = env.CRYPTO_MATERIALS_ADDRESS || defaults.cryptoMaterialsAddress

  if (!isAddress(cryptoPetsAddress)) {
    throw new ConfigError('CRYPTO_PETS_ADDRESS is invalid')
  }

  if (!isAddress(cryptoMaterialsAddress)) {
    throw new ConfigError('CRYPTO_MATERIALS_ADDRESS is invalid')
  }

  return {
    port,
    corsOrigin: env.CORS_ORIGIN || defaults.corsOrigin,
    rpcUrl: env.RPC_URL || defaults.rpcUrl,
    chainId,
    cryptoPetsAddress,
    cryptoMaterialsAddress,
    petsFromBlock,
    materialsFromBlock,
    deployerPrivateKey: env.DEPLOYER_PRIVATE_KEY || '',
    adminApiKey: env.ADMIN_API_KEY || '',
    marketCacheMs
  }
}

function readNumber(value: string | undefined, fallback: string, name: string) {
  const rawValue = value || fallback
  const parsed = Number.parseInt(rawValue, 10)

  if (!Number.isSafeInteger(parsed) || parsed < 0 || String(parsed) !== rawValue.trim()) {
    throw new ConfigError(`${name} must be a safe non-negative integer`)
  }

  return parsed
}
