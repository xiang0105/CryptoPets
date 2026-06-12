import type { NextFunction, Request, Response } from 'express'
import { isCallException } from 'ethers'

export class HttpError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
  }
}

export function invalidRequest(message: string) {
  return new HttpError(400, 'INVALID_REQUEST', message)
}

export function notFound(code: string, message: string) {
  return new HttpError(404, code, message)
}

export function conflict(code: string, message: string) {
  return new HttpError(409, code, message)
}

export function asyncRoute(handler: (request: Request, response: Response) => Promise<void>) {
  return (request: Request, response: Response, next: NextFunction) => {
    handler(request, response).catch(next)
  }
}

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  console.error('Backend API Error:', error)
  if (error instanceof HttpError) {
    response.status(error.status).json({ error: error.code, message: error.message })
    return
  }

  if (error instanceof SyntaxError) {
    response.status(400).json({ error: 'INVALID_JSON', message: 'Request body must be valid JSON' })
    return
  }

  if (isCallException(error)) {
    response.status(400).json({ error: 'CHAIN_CALL_FAILED', message: error.shortMessage || 'Chain call failed' })
    return
  }

  response.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' })
}
