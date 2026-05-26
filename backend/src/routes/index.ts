import { Router } from 'express'
import { claimRewardController, startExpeditionController } from '../controllers/expeditionController.js'
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
import { asyncHandler } from '../utils/asyncHandler.js'
import { authRoutes } from './authRoutes.js'

export const routes = Router()

routes.get('/health', (_request, response) => response.json({ ok: true }))
routes.use('/auth', authRoutes)
routes.get('/player', requireAuth, asyncHandler(getPlayerController))
routes.get('/resources', requireAuth, asyncHandler(getResourcesController))
routes.get('/materials/backpack', requireAuth, asyncHandler(getMaterialBackpackController))
routes.post('/start-expedition', requireAuth, asyncHandler(startExpeditionController))
routes.post('/claim-reward', requireAuth, asyncHandler(claimRewardController))
routes.get('/market/listings', requireAuth, asyncHandler(getMarketListingsController))
routes.post('/market/listings', requireAuth, asyncHandler(listMaterialController))
routes.post('/market/cancel-listing', requireAuth, asyncHandler(cancelListingController))
routes.post('/market/buy-listing', requireAuth, asyncHandler(buyListingController))
routes.get('/transactions', requireAuth, asyncHandler(getTransactionsController))
routes.post('/add-friend', requireAuth, asyncHandler(addFriendController))
routes.get('/friends', requireAuth, asyncHandler(getFriendsController))
