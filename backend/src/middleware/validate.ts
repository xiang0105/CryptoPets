import type { NextFunction, Request, Response } from 'express'
import { z } from 'zod'

const emptyQuerySchema = z.object({}).strict()

export function validateEmptyQuery(request: Request, _response: Response, next: NextFunction) {
  emptyQuerySchema.parse(request.query)
  next()
}
