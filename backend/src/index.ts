import { createApp } from './app.js'
import { ChainServices } from './chain.js'
import { ConfigError, loadConfig, loadEnvFiles } from './config.js'

loadEnvFiles()

try {
  const config = loadConfig()
  const services = new ChainServices(config)
  const app = createApp(config, services)

  app.listen(config.port, () => {
    console.log(`CryptoPets backend listening on port ${config.port}`)
  })
} catch (error) {
  if (error instanceof ConfigError) {
    console.error(error.message)
    process.exit(1)
  }

  throw error
}
