import { createApp } from './app.js'
import { AuthService } from './authService.js'
import { ChainServices } from './chain.js'
import { ConfigError, loadConfig, loadEnvFiles } from './config.js'
import { ExpeditionService } from './expeditionService.js'
import { ExpeditionStore } from './expeditionStore.js'
import { StarterPetService } from './starterPetService.js'

loadEnvFiles()

try {
  const config = loadConfig()
  const services = new ChainServices(config)
  const expeditionStore = new ExpeditionStore(config.expeditionDbPath)
  const authService = new AuthService(config, expeditionStore)
  const expeditionService = new ExpeditionService(expeditionStore, authService, services)
  const starterPetService = new StarterPetService(expeditionStore, services)
  const app = createApp(config, services, expeditionService, starterPetService, expeditionStore)

  app.listen(config.port, () => {
    console.log(`CryptoPets backend listening on port ${config.port}`)
  })

  process.on('SIGINT', () => {
    expeditionStore.close()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    expeditionStore.close()
    process.exit(0)
  })
} catch (error) {
  if (error instanceof ConfigError) {
    console.error(error.message)
    process.exit(1)
  }

  throw error
}
