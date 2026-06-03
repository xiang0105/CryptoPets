import { Router } from 'express'
import { createNonceController, loginController } from '../controllers/authController.js'
import { validateEmptyQuery } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const authRoutes = Router()

authRoutes.post('/nonce', validateEmptyQuery, asyncHandler(createNonceController))
authRoutes.post('/login', validateEmptyQuery, asyncHandler(loginController))
