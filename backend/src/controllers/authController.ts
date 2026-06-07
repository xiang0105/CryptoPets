import { z } from 'zod'
import type { Request, Response } from 'express'
import { createLoginNonce, loginWithSignature } from '../services/authService.js'

const nonceSchema = z.object({
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
}).strict()

export async function createNonceController(request: Request, response: Response) {
  const { wallet } = nonceSchema.parse(request.body)
  response.json(await createLoginNonce(wallet))
}

export async function loginController(request: Request, response: Response) {
  response.json(await loginWithSignature(request.body))
}
