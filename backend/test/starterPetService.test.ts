import { describe, expect, it } from 'vitest'
import { Wallet } from 'ethers'
import { ExpeditionStore } from '../src/expeditionStore.js'
import { StarterPetService, type StarterPetChainService } from '../src/starterPetService.js'

describe('StarterPetService', () => {
  it('grants the four starter pets once for a new wallet', async () => {
    const wallet = Wallet.createRandom().address
    const store = new ExpeditionStore(':memory:')
    const chain = new FakeStarterChain([])
    const ivs = [0, 25, 75, 100]
    const service = new StarterPetService(
      store,
      chain,
      () => new Date('2026-01-01T00:00:00.000Z'),
      () => ivs.shift() ?? 0
    )

    await service.getWalletPets(wallet)

    expect(chain.petCalls).toEqual([
      { name: 'sakiko', wallet, iv: 0, confirmations: 1 },
      { name: 'MAX', wallet, iv: 25, confirmations: 1 },
      { name: 'SONORATO', wallet, iv: 75, confirmations: 1 },
      { name: 'CANESAN', wallet, iv: 100, confirmations: 1 }
    ])

    const grant = store.getStarterPetGrant(wallet)

    expect(grant?.petNames).toEqual(['sakiko', 'MAX', 'SONORATO', 'CANESAN'])
    expect(grant?.ivs).toEqual([0, 25, 75, 100])
    expect(grant?.txHashes).toEqual(['0xpet1', '0xpet2', '0xpet3', '0xpet4'])
    expect(grant?.grantedAt).toBe('2026-01-01T00:00:00.000Z')

    store.close()
  })

  it('does not grant again when the wallet already has a grant record', async () => {
    const wallet = Wallet.createRandom().address
    const store = new ExpeditionStore(':memory:')
    const chain = new FakeStarterChain([])
    const service = new StarterPetService(store, chain)

    store.createStarterPetGrant({
      wallet,
      petNames: ['sakiko', 'MAX', 'SONORATO', 'CANESAN'],
      ivs: [1, 2, 3, 4],
      txHashes: ['0xexisting'],
      grantedAt: '2026-01-01T00:00:00.000Z'
    })

    await service.getWalletPets(wallet)

    expect(chain.petCalls).toEqual([])

    store.close()
  })

  it('does not grant when the wallet already owns pets on-chain', async () => {
    const wallet = Wallet.createRandom().address
    const store = new ExpeditionStore(':memory:')
    const chain = new FakeStarterChain([{ tokenId: '1' }])
    const service = new StarterPetService(store, chain)

    await service.getWalletPets(wallet)

    expect(chain.petCalls).toEqual([])
    expect(store.getStarterPetGrant(wallet)).toBeNull()

    store.close()
  })

  it('does not fail the pet lookup when the configured admin is not the contract owner', async () => {
    const wallet = Wallet.createRandom().address
    const store = new ExpeditionStore(':memory:')
    const chain = new FakeStarterChain([], {
      adminAddress: Wallet.createRandom().address,
      ownerAddress: Wallet.createRandom().address
    })
    const service = new StarterPetService(store, chain)

    await expect(service.getWalletPets(wallet)).resolves.toEqual([])

    expect(chain.petCalls).toEqual([])
    expect(store.getStarterPetGrant(wallet)).toBeNull()

    store.close()
  })
})

class FakeStarterChain implements StarterPetChainService {
  petCalls: Array<{
    name: string
    wallet: string
    iv: number
    confirmations: number | undefined
  }> = []

  constructor(
    private pets: unknown[],
    private options: {
      adminAddress?: string | null
      ownerAddress?: string
    } = {}
  ) {}

  async getWalletPets() {
    return this.pets
  }

  getPetAdminAddress() {
    return this.options.adminAddress ?? this.options.ownerAddress ?? '0x86d892de0CF9256401df49Aa08d51d0bC75A106d'
  }

  async getPetContractOwner() {
    return this.options.ownerAddress ?? this.getPetAdminAddress() ?? '0x86d892de0CF9256401df49Aa08d51d0bC75A106d'
  }

  async sendPetAdminTxAndWait(functionName: string, args: unknown[], confirmations?: number) {
    expect(functionName).toBe('addPet')
    const [name, wallet, iv] = args
    this.petCalls.push({
      name: String(name),
      wallet: String(wallet),
      iv: Number(iv),
      confirmations
    })

    const tokenId = String(this.petCalls.length)
    this.pets.push({ tokenId })

    return {
      hash: `0xpet${tokenId}`
    }
  }
}
