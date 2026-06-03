import type { Request, Response } from 'express'
import { claimReward, getExpeditionLogs, startExpedition } from '../services/expeditionService.js'

export async function startExpeditionController(request: Request, response: Response) {
  response.status(201).json(await startExpedition(request.auth!.userId, request.body))
}

export async function claimRewardController(request: Request, response: Response) {
  response.json(await claimReward(request.auth!.userId, request.body))
}

export async function getExpeditionLogsController(request: Request, response: Response) {
  response.json(await getExpeditionLogs(request.auth!.userId))
}
