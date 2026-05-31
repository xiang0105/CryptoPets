import type { GoodieSft } from '@/data/goodies'
import type { Pet } from '@/data/pets'

export interface ChainDataProvider {
  getWalletPets(wallet: string): Promise<Pet[]>
  getWalletGoodies(wallet: string): Promise<GoodieSft[]>
}

export const chainDataUnavailableProvider: ChainDataProvider = {
  async getWalletPets() {
    return []
  },
  async getWalletGoodies() {
    return []
  },
}

export const chainDataProvider = chainDataUnavailableProvider
