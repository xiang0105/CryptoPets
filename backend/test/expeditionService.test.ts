import { describe, expect, it } from 'vitest'
import { Wallet } from 'ethers'
import { AuthService } from '../src/authService.js'
import type { AppConfig } from '../src/config.js'
import { expeditionForestById } from '../src/expeditionContent.js'
import { buildRewardForExpedition, calculateExpeditionOutcome } from '../src/expeditionRules.js'
import { ExpeditionService, type ExpeditionChainService } from '../src/expeditionService.js'
import { ExpeditionStore } from '../src/expeditionStore.js'
import type { ChainExpeditionPet, ExpeditionType } from '../src/expeditionTypes.js'
import type { HttpError } from '../src/errors.js'

const baseConfig: AppConfig = {
  port: 3400,
  corsOrigin: 'http://localhost:5400',
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
  chainId: 11155111,
  cryptoPetsAddress: '0x8F71AddC5b56D148727d129F54e31d24f632CeD0',
  cryptoMaterialsAddress: '0xA6E9ec01E2fb1e82db2602719c13D2cC15446E56',
  petsFromBlock: 11009607,
  materialsFromBlock: 11009614,
  deployerPrivateKey: '',
  adminApiKey: '',
  marketCacheMs: 15000,
  expeditionDbPath: ':memory:',
  authNonceTtlMs: 300000
}

describe('ExpeditionService', () => {
  it('starts expedition and only exposes logs that have happened', async () => {
    const wallet = Wallet.createRandom()
    const context = createServiceContext({
      expeditionId: 'expedition-start',
      pets: [
        pet('1', wallet.address, 'Orange', '3', 120),
        pet('2', wallet.address, 'Apple', '4', 180)
      ]
    })

    const expedition = await signedStart(context.service, wallet, ['1', '2'], 'orange')

    expect(expedition.id).toBe('expedition-start')
    expect(expedition.status).toBe('started')
    expect(expedition.totalLevel).toBe(7)
    expect(expedition.sumIv).toBe(300)
    expect(expedition.petIds).toEqual(['1', '2'])
    expect(expedition.logs).toHaveLength(1)
    expect(expedition.logs[0].message.en).toBe('Started Orange Forest.')
    expect(context.store.getActiveExpedition(wallet.address)?.id).toBe('expedition-start')

    context.now = new Date(Date.parse(expedition.endsAt) - 1)
    const progressLogs = context.service.getExpeditionLogs(wallet.address)
    expect(progressLogs.length).toBeGreaterThan(1)
    expect(progressLogs.at(-1)?.message.en).not.toBe('The expedition is complete and waiting to be claimed.')

    context.now = new Date(Date.parse(expedition.endsAt))
    expect(context.service.getExpeditionLogs(wallet.address).at(-1)?.message.en).toBe(
      'The expedition is complete and waiting to be claimed.'
    )

    context.store.close()
  })

  it('rejects duplicate token ids', async () => {
    const wallet = Wallet.createRandom()
    const context = createServiceContext({
      expeditionId: 'expedition-duplicate',
      pets: [
        pet('1', wallet.address, 'Orange', '3', 120)
      ]
    })

    await expectHttpErrorAsync(
      () => signedStart(context.service, wallet, ['1', '1'], 'orange'),
      'INVALID_REQUEST'
    )

    context.store.close()
  })

  it('rejects non-owner token ids', async () => {
    const wallet = Wallet.createRandom()
    const otherWallet = Wallet.createRandom()
    const context = createServiceContext({
      expeditionId: 'expedition-owner',
      pets: [
        pet('1', otherWallet.address, 'Orange', '3', 120)
      ]
    })

    await expectHttpErrorAsync(
      () => signedStart(context.service, wallet, ['1'], 'orange'),
      'PET_NOT_OWNED'
    )

    context.store.close()
  })

  it('rejects active expedition conflict', async () => {
    const wallet = Wallet.createRandom()
    const context = createServiceContext({
      expeditionId: 'expedition-active',
      pets: [
        pet('1', wallet.address, 'Orange', '3', 120)
      ]
    })

    await signedStart(context.service, wallet, ['1'], 'orange')
    await expectHttpErrorAsync(
      () => signedStart(context.service, wallet, ['1'], 'orange'),
      'ACTIVE_EXPEDITION_EXISTS'
    )

    context.store.close()
  })

  it('rejects claim before expedition ends', async () => {
    const wallet = Wallet.createRandom()
    const context = createServiceContext({
      expeditionId: 'expedition-early-claim',
      pets: [
        pet('1', wallet.address, 'Orange', '3', 120)
      ]
    })
    const expedition = await signedStart(context.service, wallet, ['1'], 'orange')

    await expectHttpErrorAsync(
      () => signedClaim(context.service, wallet, expedition.id),
      'EXPEDITION_NOT_READY'
    )

    context.store.close()
  })

  it('waits for material mint before marking claimed', async () => {
    const wallet = Wallet.createRandom()
    const expeditionId = findExpeditionId('orange', 100, 450, (rewardCount) => rewardCount > 0)
    const context = createServiceContext({
      expeditionId,
      pets: [
        pet('1', wallet.address, 'Orange', '100', 450)
      ]
    })
    const expedition = await signedStart(context.service, wallet, ['1'], 'orange')
    const expectedCount = buildRewardForExpedition({
      id: expedition.id,
      expeditionType: expedition.expeditionType,
      events: expedition.events
    }).materials.reduce((sum, material) => sum + material.count, 0)

    context.now = new Date(Date.parse(expedition.endsAt) + 1000)
    context.chain.onMint = () => {
      expect(context.store.getExpedition(expedition.id)?.status).toBe('started')
    }

    const claimed = await signedClaim(context.service, wallet, expedition.id)

    expect(context.chain.materialCalls.length).toBe(1)
    expect(context.chain.materialCalls[0].functionName).toBe('increaseMaterial')
    expect(context.chain.materialCalls[0].confirmations).toBe(1)
    expect(String(context.chain.materialCalls[0].args[1])).toBe('2')
    expect(String(context.chain.materialCalls[0].args[2])).toBe(String(expectedCount))
    expect(claimed.status).toBe('claimed')
    expect(claimed.materialMintTxHash).toBe('0xmaterial')
    expect(context.store.getActiveExpedition(wallet.address)).toBeNull()

    context.store.close()
  })

  it('claims the stored expedition result instead of recalculating from changed team stats', async () => {
    const wallet = Wallet.createRandom()
    const expeditionId = findExpeditionId('orange', 1, 0, (rewardCount) => rewardCount > 0)
    const context = createServiceContext({
      expeditionId,
      pets: [
        pet('1', wallet.address, 'Orange', '1', 0)
      ]
    })
    const expedition = await signedStart(context.service, wallet, ['1'], 'orange')
    const expectedRewardCount = buildRewardForExpedition({
      id: expedition.id,
      expeditionType: expedition.expeditionType,
      events: expedition.events
    }).materials.reduce((sum, material) => sum + material.count, 0)

    context.chain.setPet(pet('1', wallet.address, 'Orange', '100', 450))
    context.now = new Date(Date.parse(expedition.endsAt) + 1000)

    const claimed = await signedClaim(context.service, wallet, expedition.id)

    expect(claimed.reward?.materials.reduce((sum, material) => sum + material.count, 0)).toBe(expectedRewardCount)
    expect(String(context.chain.materialCalls[0]?.args[2])).toBe(String(expectedRewardCount))

    context.store.close()
  })

  it('adds capped experience to expedition pets when claiming earned experience', async () => {
    const wallet = Wallet.createRandom()
    const expeditionId = findExpeditionId('orange', 5, 450, (rewardCount, exp) => rewardCount > 0 && exp > 0)
    const context = createServiceContext({
      expeditionId,
      pets: [
        pet('1', wallet.address, 'Orange', '2', 225),
        pet('2', wallet.address, 'Apple', '3', 225)
      ]
    })
    const expedition = await signedStart(context.service, wallet, ['1', '2'], 'orange')

    context.now = new Date(Date.parse(expedition.endsAt) + 1000)

    const claimed = await signedClaim(context.service, wallet, expedition.id)
    const expectedExp = Math.min(99, claimed.reward?.exp ?? 0)

    expect(claimed.reward?.exp).toBeGreaterThan(0)
    expect(context.chain.petCalls).toEqual([])
    expect(context.store.getWalletPetExperience(wallet.address)).toEqual({
      '1': { current: expectedExp, next: 100 },
      '2': { current: expectedExp, next: 100 }
    })

    context.store.close()
  })

  it('does not mint material when all events fail', async () => {
    const wallet = Wallet.createRandom()
    const expeditionId = findExpeditionId('snow-peach', 0, 0, (rewardCount) => rewardCount === 0)
    const context = createServiceContext({
      expeditionId,
      pets: [
        pet('1', wallet.address, 'Snow', '0', 0)
      ]
    })
    const expedition = await signedStart(context.service, wallet, ['1'], 'snow-peach')

    context.now = new Date(Date.parse(expedition.endsAt) + 1000)

    const claimed = await signedClaim(context.service, wallet, expedition.id)

    expect(context.chain.materialCalls.length).toBe(0)
    expect(claimed.status).toBe('claimed')
    expect(claimed.reward?.materials).toEqual([])
    expect(claimed.materialMintTxHash).toBeNull()

    context.store.close()
  })
})

class FakeChain implements ExpeditionChainService {
  petCalls: Array<{
    functionName: string
    args: unknown[]
    confirmations: number | undefined
  }> = []
  materialCalls: Array<{
    functionName: string
    args: unknown[]
    confirmations: number | undefined
  }> = []
  onMint: (() => void) | null = null
  private pets = new Map<string, ChainExpeditionPet>()

  constructor(pets: ChainExpeditionPet[]) {
    for (const pet of pets) {
      this.pets.set(pet.tokenId, pet)
    }
  }

  async getPet(tokenId: bigint) {
    const pet = this.pets.get(tokenId.toString())

    if (!pet) {
      throw new Error(`Missing fake pet ${tokenId.toString()}`)
    }

    return pet
  }

  async sendMaterialAdminTxAndWait(functionName: string, args: unknown[], confirmations?: number) {
    this.materialCalls.push({ functionName, args, confirmations })
    this.onMint?.()

    return {
      hash: '0xmaterial'
    }
  }

  setPet(pet: ChainExpeditionPet) {
    this.pets.set(pet.tokenId, pet)
  }

  async sendPetAdminTxAndWait(functionName: string, args: unknown[], confirmations?: number) {
    this.petCalls.push({ functionName, args, confirmations })

    return {
      hash: '0xpet'
    }
  }
}

function createServiceContext(input: {
  expeditionId: string
  pets: ChainExpeditionPet[]
}) {
  const store = new ExpeditionStore(':memory:')
  const auth = new AuthService(baseConfig, store)
  const chain = new FakeChain(input.pets)
  const context = {
    now: new Date('2026-01-01T00:00:00.000Z'),
    store,
    chain,
    service: undefined as unknown as ExpeditionService
  }

  context.service = new ExpeditionService(
    store,
    auth,
    chain,
    () => context.now,
    () => input.expeditionId
  )

  return context
}

async function signedStart(
  service: ExpeditionService,
  wallet: Wallet,
  petIds: string[],
  expeditionType: ExpeditionType
) {
  const challenge = service.createAuthNonce({
    wallet: wallet.address,
    action: 'start-expedition',
    petIds,
    expeditionType
  })
  const signature = await wallet.signMessage(challenge.message)

  return service.startExpedition({
    wallet: wallet.address,
    petIds,
    expeditionType,
    nonce: challenge.nonce,
    message: challenge.message,
    signature
  })
}

async function signedClaim(service: ExpeditionService, wallet: Wallet, expeditionId: string) {
  const challenge = service.createAuthNonce({
    wallet: wallet.address,
    action: 'claim-reward',
    expeditionId
  })
  const signature = await wallet.signMessage(challenge.message)

  return service.claimReward({
    wallet: wallet.address,
    expeditionId,
    nonce: challenge.nonce,
    message: challenge.message,
    signature
  })
}

function pet(tokenId: string, owner: string, name: string, level: string, iv: number): ChainExpeditionPet {
  return {
    tokenId,
    owner,
    name,
    level,
    iv
  }
}

function findExpeditionId(
  expeditionType: ExpeditionType,
  totalLevel: number,
  sumIv: number,
  match: (rewardCount: number, exp: number) => boolean
) {
  const forest = expeditionForestById.get(expeditionType)

  if (!forest) {
    throw new Error(`Unknown expedition type ${expeditionType}`)
  }

  for (let index = 0; index < 10000; index++) {
    const expeditionId = `expedition-${expeditionType}-${index}`
    const outcome = calculateExpeditionOutcome({
      expeditionId,
      forest,
      totalLevel,
      sumIv
    })
    const reward = buildRewardForExpedition({
      id: expeditionId,
      expeditionType,
      events: outcome.events
    })
    const rewardCount = reward.materials.reduce((sum, material) => sum + material.count, 0)

    if (match(rewardCount, outcome.reward.exp)) {
      return expeditionId
    }
  }

  throw new Error('No matching expedition id found')
}

async function expectHttpErrorAsync(action: () => Promise<unknown>, code: string) {
  try {
    await action()
    throw new Error('Expected action to throw')
  } catch (error) {
    expect((error as HttpError).code).toBe(code)
  }
}
