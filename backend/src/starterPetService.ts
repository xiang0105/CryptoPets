import { randomInt } from 'node:crypto'
import type { ExpeditionStore } from './expeditionStore.js'

export interface StarterPetChainService {
  getWalletPets(wallet: string): Promise<unknown[]>
  getPetAdminAddress(): string | null
  getPetContractOwner(): Promise<string>
  sendPetAdminTxAndWait(functionName: string, args: unknown[], confirmations?: number): Promise<{ hash: string }>
}

const starterPetNames = ['sakiko', 'MAX', 'SONORATO', 'CANESAN']
const starterPetConfirmations = 1

export class StarterPetService {
  private inFlightGrants = new Map<string, Promise<void>>()

  constructor(
    private store: ExpeditionStore,
    private chain: StarterPetChainService,
    private now: () => Date = () => new Date(),
    private rollIv: () => number = () => randomInt(0, 101)
  ) {}

  async getWalletPets(wallet: string) {
    await this.ensureStarterPets(wallet)
    return this.chain.getWalletPets(wallet)
  }

  private async ensureStarterPets(wallet: string) {
    if (this.store.getStarterPetGrant(wallet)) {
      return
    }

    const currentPets = await this.chain.getWalletPets(wallet)

    if (currentPets.length > 0) {
      return
    }

    if (!await this.canGrantStarterPets()) {
      return
    }

    const pendingGrant = this.inFlightGrants.get(wallet)

    if (pendingGrant) {
      await pendingGrant
      return
    }

    const grant = this.grantStarterPets(wallet)
    this.inFlightGrants.set(wallet, grant)

    try {
      await grant
    } finally {
      this.inFlightGrants.delete(wallet)
    }
  }

  private async canGrantStarterPets() {
    const adminAddress = this.chain.getPetAdminAddress()

    if (!adminAddress) {
      return false
    }

    const contractOwner = await this.chain.getPetContractOwner()
    return contractOwner.toLowerCase() === adminAddress.toLowerCase()
  }

  private async grantStarterPets(wallet: string) {
    const ivs: number[] = []
    const txHashes: string[] = []

    for (const petName of starterPetNames) {
      const iv = this.rollIv()
      const transaction = await this.chain.sendPetAdminTxAndWait(
        'addPet',
        [petName, wallet, iv],
        starterPetConfirmations
      )

      ivs.push(iv)
      txHashes.push(transaction.hash)
    }

    this.store.createStarterPetGrant({
      wallet,
      petNames: starterPetNames,
      ivs,
      txHashes,
      grantedAt: this.now().toISOString()
    })
  }
}
