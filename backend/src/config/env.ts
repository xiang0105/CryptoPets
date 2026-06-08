import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3400),
  CORS_ORIGIN: z.string().url(),
  JWT_SECRET: z.string().min(32),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  WEB3_LOGIN_DOMAIN: z.string().min(1),
  WEB3_LOGIN_STATEMENT: z.string().default('Sign in to CryptoPets'),
  RPC_URL: z.string().url().optional(),
  NFT_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  NFT_OWNER_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  MATERIAL_BACKPACK_SOURCE: z.enum(['local-db', 'chain-db']).default('local-db'),
  MATERIAL_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  CHAIN_ID: z.coerce.number().int().positive().default(1),
})

export const env = envSchema.parse(process.env)
