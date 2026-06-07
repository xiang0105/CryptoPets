import { Router } from 'express'
import {
  claimRewardController,
  getExpeditionLogsController,
  startExpeditionController,
} from '../controllers/expeditionController.js'
import { addFriendController, getFriendsController } from '../controllers/friendController.js'
import {
  buyListingController,
  cancelListingController,
  getMaterialBackpackController,
  getMarketListingsController,
  getResourcesController,
  getTransactionsController,
  listMaterialController,
} from '../controllers/marketController.js'
import { getPlayerController } from '../controllers/playerController.js'
import { requireAuth } from '../middleware/auth.js'
import { validateEmptyQuery } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authRoutes } from './authRoutes.js'

export const routes = Router()

routes.get('/health', validateEmptyQuery, (_request, response) => response.json({ ok: true }))
routes.use('/auth', authRoutes)
routes.get('/player', validateEmptyQuery, requireAuth, asyncHandler(getPlayerController))
routes.get('/resources', validateEmptyQuery, requireAuth, asyncHandler(getResourcesController))
routes.get('/materials/backpack', validateEmptyQuery, requireAuth, asyncHandler(getMaterialBackpackController))
routes.post('/start-expedition', validateEmptyQuery, requireAuth, asyncHandler(startExpeditionController))
routes.post('/claim-reward', validateEmptyQuery, requireAuth, asyncHandler(claimRewardController))
routes.get('/expedition/logs', validateEmptyQuery, requireAuth, asyncHandler(getExpeditionLogsController))
routes.get('/market/listings', validateEmptyQuery, requireAuth, asyncHandler(getMarketListingsController))
routes.post('/market/listings', validateEmptyQuery, requireAuth, asyncHandler(listMaterialController))
routes.post('/market/cancel-listing', validateEmptyQuery, requireAuth, asyncHandler(cancelListingController))
routes.post('/market/buy-listing', validateEmptyQuery, requireAuth, asyncHandler(buyListingController))
routes.get('/transactions', validateEmptyQuery, requireAuth, asyncHandler(getTransactionsController))
routes.post('/add-friend', validateEmptyQuery, requireAuth, asyncHandler(addFriendController))
routes.get('/friends', validateEmptyQuery, requireAuth, asyncHandler(getFriendsController))
