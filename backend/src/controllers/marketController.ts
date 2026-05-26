import type { Request, Response } from 'express'
import {
  buyListing,
  cancelListing,
  getMaterialBackpack,
  getMarketListings,
  getPlayerResources,
  getPlayerTransactions,
  listMaterial,
} from '../services/marketService.js'

export async function getResourcesController(request: Request, response: Response) {
  response.json(await getPlayerResources(request.auth!.userId))
}

export async function getMaterialBackpackController(request: Request, response: Response) {
  response.json(await getMaterialBackpack(request.auth!.userId))
}

export async function getMarketListingsController(_request: Request, response: Response) {
  response.json(await getMarketListings())
}

export async function getTransactionsController(request: Request, response: Response) {
  response.json(await getPlayerTransactions(request.auth!.userId))
}

export async function listMaterialController(request: Request, response: Response) {
  response.status(201).json(await listMaterial(request.auth!.userId, request.body))
}

export async function cancelListingController(request: Request, response: Response) {
  response.json(await cancelListing(request.auth!.userId, request.body))
}

export async function buyListingController(request: Request, response: Response) {
  response.json(await buyListing(request.auth!.userId, request.body))
}
