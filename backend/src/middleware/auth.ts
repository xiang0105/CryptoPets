import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { env } from '../config/env.js'
import { HttpError } from '../utils/httpError.js'

const authPayloadSchema = z.object({
  sub: z.string().uuid(),
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
})

export interface AuthContext {
  userId: string
  wallet: string
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext
    }
  }
}

export function requireAuth(request: Request, _response: Response, next: NextFunction) {
  const header = request.header('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null

  if (!token) {
    next(new HttpError(401, 'AUTH_REQUIRED'))
    return
  }

  try {
    const payload = authPayloadSchema.parse(jwt.verify(token, env.JWT_SECRET))
    request.auth = {
      userId: payload.sub,
      wallet: payload.wallet.toLowerCase(),
    }
    next()
  } catch {
    next(new HttpError(401, 'INVALID_AUTH_TOKEN'))
  }
}
