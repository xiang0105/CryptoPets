import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import helmet from 'helmet'
import type { AppConfig } from './config.js'
import { asyncRoute, errorHandler, HttpError, invalidRequest, notFound } from './errors.js'
import type { ChainServices, SentTransactionDto, TransactionRequestDto } from './chain.js'
import type { ExpeditionDetails, ExpeditionLogEntry } from './expeditionTypes.js'
import {
  readAddress,
  readBody,
  readBoolean,
  readHexData,
  readString,
  readUintArray,
  readUintFromBody,
  readUintListFromQuery,
  readUintParam
} from './validation.js'

export interface BackendServices {
  getContracts(): ReturnType<ChainServices['getContracts']>
  getTotalPets(): Promise<string>
  getPetOwner(tokenId: bigint): Promise<string>
  getPet(tokenId: bigint): Promise<unknown>
  getWalletPets(wallet: string): Promise<unknown>
  getPetListing(tokenId: bigint): Promise<unknown>
  getPetMarketListings(): Promise<unknown>
  getMaterialBalance(wallet: string, materialId: bigint): Promise<unknown>
  getWalletMaterialBalances(wallet: string, materialIds: bigint[]): Promise<unknown>
  getMaterialListing(listingId: bigint): Promise<unknown>
  getMaterialMarketListings(): Promise<unknown>
  buildPetTx(functionName: string, args: unknown[], value?: bigint): TransactionRequestDto
  buildMaterialTx(functionName: string, args: unknown[], value?: bigint): TransactionRequestDto
  sendPetAdminTx(functionName: string, args: unknown[]): Promise<SentTransactionDto>
  sendMaterialAdminTx(functionName: string, args: unknown[]): Promise<SentTransactionDto>
}

export interface ExpeditionApiServices {
  createAuthNonce(body: unknown): unknown
  startExpedition(body: unknown): Promise<ExpeditionDetails>
  claimReward(body: unknown): Promise<ExpeditionDetails>
  getActiveExpedition(wallet: unknown): ExpeditionDetails | null
  getExpeditionLogs(wallet: unknown): ExpeditionLogEntry[]
}

export function createApp(config: AppConfig, services: BackendServices, expeditionServices?: ExpeditionApiServices) {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: config.corsOrigin }))
  app.use(express.json())

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' })
  })

  app.get('/contracts', (_request, response) => {
    response.json(services.getContracts())
  })

  app.post('/auth/nonce', asyncRoute(async (request, response) => {
    response.json(requireExpeditionService(expeditionServices).createAuthNonce(request.body))
  }))

  app.post('/start-expedition', asyncRoute(async (request, response) => {
    response.json(await requireExpeditionService(expeditionServices).startExpedition(request.body))
  }))

  app.post('/claim-reward', asyncRoute(async (request, response) => {
    response.json(await requireExpeditionService(expeditionServices).claimReward(request.body))
  }))

  app.get('/wallets/:wallet/expedition', asyncRoute(async (request, response) => {
    response.json(requireExpeditionService(expeditionServices).getActiveExpedition(request.params.wallet))
  }))

  app.get('/wallets/:wallet/expedition/logs', asyncRoute(async (request, response) => {
    response.json(requireExpeditionService(expeditionServices).getExpeditionLogs(request.params.wallet))
  }))

  app.get('/pets/total', asyncRoute(async (_request, response) => {
    response.json({ total: await services.getTotalPets() })
  }))

  app.get('/pets/:tokenId', asyncRoute(async (request, response) => {
    const tokenId = readUintParam(request.params.tokenId, 'tokenId', { positive: true })
    response.json({ pet: await services.getPet(tokenId) })
  }))

  app.get('/wallets/:wallet/pets', asyncRoute(async (request, response) => {
    const wallet = readAddress(request.params.wallet, 'wallet')
    response.json({ wallet, pets: await services.getWalletPets(wallet) })
  }))

  app.get('/market/pets', asyncRoute(async (_request, response) => {
    response.json({ listings: await services.getPetMarketListings() })
  }))

  app.get('/market/pets/:tokenId', asyncRoute(async (request, response) => {
    const tokenId = readUintParam(request.params.tokenId, 'tokenId', { positive: true })
    const listing = await services.getPetListing(tokenId)

    if (!listing) {
      throw notFound('PET_LISTING_NOT_FOUND', 'Pet listing was not found')
    }

    response.json({ listing })
  }))

  app.get('/materials/:materialId/balances/:wallet', asyncRoute(async (request, response) => {
    const wallet = readAddress(request.params.wallet, 'wallet')
    const materialId = readUintParam(request.params.materialId, 'materialId')

    response.json({ wallet, balance: await services.getMaterialBalance(wallet, materialId) })
  }))

  app.get('/wallets/:wallet/materials', asyncRoute(async (request, response) => {
    const wallet = readAddress(request.params.wallet, 'wallet')
    const materialIds = readUintListFromQuery(request.query.ids, 'ids')

    response.json({
      wallet,
      balances: await services.getWalletMaterialBalances(wallet, materialIds)
    })
  }))

  app.get('/market/materials', asyncRoute(async (_request, response) => {
    response.json({ listings: await services.getMaterialMarketListings() })
  }))

  app.get('/market/materials/:listingId', asyncRoute(async (request, response) => {
    const listingId = readUintParam(request.params.listingId, 'listingId', { positive: true })
    const listing = await services.getMaterialListing(listingId)

    if (!listing) {
      throw notFound('MATERIAL_LISTING_NOT_FOUND', 'Material listing was not found')
    }

    response.json({ listing })
  }))

  app.post('/tx/pets/approve', (request, response) => {
    const body = readBody(request.body)
    const to = readAddress(body.approved ?? body.to, 'approved')
    const tokenId = readUintFromBody(body, 'tokenId', { positive: true })

    response.json(services.buildPetTx('approve', [to, tokenId]))
  })

  app.post('/tx/pets/set-approval-for-all', (request, response) => {
    const body = readBody(request.body)
    const operator = readAddress(body.operator, 'operator')
    const approved = readBoolean(body, 'approved')

    response.json(services.buildPetTx('setApprovalForAll', [operator, approved]))
  })

  app.post('/tx/pets/transfer', (request, response) => {
    const body = readBody(request.body)
    const from = readAddress(body.from, 'from')
    const to = readAddress(body.to, 'to')
    const tokenId = readUintFromBody(body, 'tokenId', { positive: true })

    response.json(services.buildPetTx('transferFrom', [from, to, tokenId]))
  })

  app.post('/tx/pets/safe-transfer', (request, response) => {
    const body = readBody(request.body)
    const from = readAddress(body.from, 'from')
    const to = readAddress(body.to, 'to')
    const tokenId = readUintFromBody(body, 'tokenId', { positive: true })
    const data = readHexData(body, 'data')

    response.json(services.buildPetTx('safeTransferFrom(address,address,uint256,bytes)', [from, to, tokenId, data]))
  })

  app.post('/tx/pets/sell-cloth', (request, response) => {
    const body = readBody(request.body)
    const clothId = readUintFromBody(body, 'clothId', { max: 7n })
    const from = readAddress(body.from, 'from')
    const to = readAddress(body.to, 'to')
    const fromPetId = readUintFromBody(body, 'fromPetId', { positive: true })
    const toPetId = readUintFromBody(body, 'toPetId', { positive: true })

    response.json(services.buildPetTx('sellCloth', [clothId, from, to, fromPetId, toPetId]))
  })

  app.post('/tx/pets/list', (request, response) => {
    const body = readBody(request.body)
    const tokenId = readUintFromBody(body, 'tokenId', { positive: true })
    const priceWei = readUintFromBody(body, 'priceWei', { positive: true })

    response.json(services.buildPetTx('listPet', [tokenId, priceWei]))
  })

  app.post('/tx/pets/cancel-listing', (request, response) => {
    const body = readBody(request.body)
    const tokenId = readUintFromBody(body, 'tokenId', { positive: true })

    response.json(services.buildPetTx('cancelPetListing', [tokenId]))
  })

  app.post('/tx/pets/buy', asyncRoute(async (request, response) => {
    const body = readBody(request.body)
    const tokenId = readUintFromBody(body, 'tokenId', { positive: true })
    const listing = await services.getPetListing(tokenId) as { priceWei: string } | null

    if (!listing) {
      throw notFound('PET_LISTING_NOT_FOUND', 'Pet listing was not found')
    }

    response.json(services.buildPetTx('buyPet', [tokenId], BigInt(listing.priceWei)))
  }))

  app.post('/tx/materials/set-approval-for-all', (request, response) => {
    const body = readBody(request.body)
    const operator = readAddress(body.operator, 'operator')
    const approved = readBoolean(body, 'approved')

    response.json(services.buildMaterialTx('setApprovalForAll', [operator, approved]))
  })

  app.post('/tx/materials/transfer', (request, response) => {
    const body = readBody(request.body)
    const from = readAddress(body.from, 'from')
    const to = readAddress(body.to, 'to')
    const materialId = readUintFromBody(body, 'materialId')
    const amount = readUintFromBody(body, 'amount', { positive: true })
    const data = readHexData(body, 'data')

    response.json(services.buildMaterialTx('safeTransferFrom', [from, to, materialId, amount, data]))
  })

  app.post('/tx/materials/batch-transfer', (request, response) => {
    const body = readBody(request.body)
    const from = readAddress(body.from, 'from')
    const to = readAddress(body.to, 'to')
    const materialIds = readUintArray(body, 'materialIds')
    const amounts = readUintArray(body, 'amounts')
    const data = readHexData(body, 'data')

    if (materialIds.length !== amounts.length) {
      throw invalidRequest('materialIds and amounts length mismatch')
    }

    for (const amount of amounts) {
      if (amount === 0n) {
        throw invalidRequest('amounts must be greater than zero')
      }
    }

    response.json(services.buildMaterialTx('safeBatchTransferFrom', [from, to, materialIds, amounts, data]))
  })

  app.post('/tx/materials/list', (request, response) => {
    const body = readBody(request.body)
    const materialId = readUintFromBody(body, 'materialId')
    const amount = readUintFromBody(body, 'amount', { positive: true })
    const priceWei = readUintFromBody(body, 'priceWei', { positive: true })

    response.json(services.buildMaterialTx('listMaterial', [materialId, amount, priceWei]))
  })

  app.post('/tx/materials/cancel-listing', (request, response) => {
    const body = readBody(request.body)
    const listingId = readUintFromBody(body, 'listingId', { positive: true })

    response.json(services.buildMaterialTx('cancelMaterialListing', [listingId]))
  })

  app.post('/tx/materials/buy', asyncRoute(async (request, response) => {
    const body = readBody(request.body)
    const listingId = readUintFromBody(body, 'listingId', { positive: true })
    const listing = await services.getMaterialListing(listingId) as { priceWei: string } | null

    if (!listing) {
      throw notFound('MATERIAL_LISTING_NOT_FOUND', 'Material listing was not found')
    }

    response.json(services.buildMaterialTx('buyMaterial', [listingId], BigInt(listing.priceWei)))
  }))

  app.post('/admin/pets', requireAdmin(config), asyncRoute(async (request, response) => {
    const body = readBody(request.body)
    const name = readString(body, 'name')
    const to = readAddress(body.to, 'to')
    const iv = readUintFromBody(body, 'iv', { max: 255n })

    response.json({ transaction: await services.sendPetAdminTx('addPet', [name, to, iv]) })
  }))

  app.post('/admin/pets/:tokenId/level', requireAdmin(config), asyncRoute(async (request, response) => {
    const tokenId = readUintParam(request.params.tokenId, 'tokenId', { positive: true })
    const body = readBody(request.body)
    const level = readUintFromBody(body, 'level', { positive: true })

    response.json({ transaction: await services.sendPetAdminTx('setPetLevel', [tokenId, level]) })
  }))

  app.post('/admin/pets/:tokenId/cloth', requireAdmin(config), asyncRoute(async (request, response) => {
    const tokenId = readUintParam(request.params.tokenId, 'tokenId', { positive: true })
    const body = readBody(request.body)
    const clothId = readUintFromBody(body, 'clothId', { max: 7n })
    const petOwner = await services.getPetOwner(tokenId)

    response.json({ transaction: await services.sendPetAdminTx('addCloth', [clothId, petOwner, tokenId]) })
  }))

  app.post('/admin/materials/increase', requireAdmin(config), asyncRoute(async (request, response) => {
    const body = readBody(request.body)
    const to = readAddress(body.to, 'to')
    const materialId = readUintFromBody(body, 'materialId')
    const amount = readUintFromBody(body, 'amount', { positive: true })

    response.json({ transaction: await services.sendMaterialAdminTx('increaseMaterial', [to, materialId, amount]) })
  }))

  app.post('/admin/materials/decrease', requireAdmin(config), asyncRoute(async (request, response) => {
    const body = readBody(request.body)
    const from = readAddress(body.from, 'from')
    const materialId = readUintFromBody(body, 'materialId')
    const amount = readUintFromBody(body, 'amount', { positive: true })

    response.json({ transaction: await services.sendMaterialAdminTx('decreaseMaterial', [from, materialId, amount]) })
  }))

  app.use((_request, _response, next) => {
    next(notFound('NOT_FOUND', 'Route was not found'))
  })

  app.use(errorHandler)

  return app
}

function requireExpeditionService(expeditionServices: ExpeditionApiServices | undefined) {
  if (!expeditionServices) {
    throw new HttpError(503, 'EXPEDITION_SERVICE_NOT_CONFIGURED', 'Expedition service is not configured')
  }

  return expeditionServices
}

function requireAdmin(config: AppConfig) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!config.adminApiKey) {
      next(new HttpError(503, 'ADMIN_API_KEY_NOT_CONFIGURED', 'Admin API key is not configured'))
      return
    }

    if (request.header('x-admin-api-key') !== config.adminApiKey) {
      next(new HttpError(401, 'ADMIN_API_KEY_INVALID', 'Admin API key is invalid'))
      return
    }

    next()
  }
}
