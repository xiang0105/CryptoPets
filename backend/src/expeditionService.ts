import { randomUUID } from 'node:crypto'
import { expeditionForestById, type ExpeditionForest } from './expeditionContent.js'
import { buildRewardFromEvents, calculateExpeditionOutcome } from './expeditionRules.js'
import type { ExpeditionStore } from './expeditionStore.js'
import type {
  ChainExpeditionPet,
  ExpeditionDetails,
  ExpeditionEventResult,
  ExpeditionLogEntry,
  ExpeditionPetSnapshot,
  ExpeditionRecord,
  ExpeditionReward,
  ExpeditionType
} from './expeditionTypes.js'
import { HttpError, invalidRequest, notFound } from './errors.js'
import type { AuthService } from './authService.js'
import { readAddress, readBody, readString, readUint } from './validation.js'

export interface ExpeditionChainService {
  getPet(tokenId: bigint): Promise<ChainExpeditionPet>
  sendPetAdminTxAndWait(functionName: string, args: unknown[], confirmations?: number): Promise<{ hash: string }>
  sendMaterialAdminTxAndWait(functionName: string, args: unknown[], confirmations?: number): Promise<{ hash: string }>
}

const expPerLevel = 100

export class ExpeditionService {
  constructor(
    private store: ExpeditionStore,
    private auth: AuthService,
    private chain: ExpeditionChainService,
    private now: () => Date = () => new Date(),
    private createId: () => string = randomUUID
  ) {}

  createAuthNonce(body: unknown) {
    return this.auth.createNonce(body)
  }

  async startExpedition(body: unknown): Promise<ExpeditionDetails> {
    const input = readStartBody(body)
    const wallet = this.auth.verify({
      wallet: input.wallet,
      action: 'start-expedition',
      payload: {
        petIds: input.petIds,
        expeditionType: input.expeditionType
      },
      nonce: input.nonce,
      message: input.message,
      signature: input.signature,
      now: this.now()
    })

    assertUniquePetIds(input.petIds)

    const forest = expeditionForestById.get(input.expeditionType)

    if (!forest) {
      throw invalidRequest('expeditionType is unknown')
    }

    if (this.store.getActiveExpedition(wallet)) {
      throw new HttpError(409, 'ACTIVE_EXPEDITION_EXISTS', 'Wallet already has an active expedition')
    }

    const petSnapshot = await this.readPetSnapshot(wallet, input.petIds)
    const totalLevel = petSnapshot.reduce((sum, pet) => sum + pet.level, 0)
    const sumIv = petSnapshot.reduce((sum, pet) => sum + pet.iv, 0)
    const startedAt = this.now()
    const endsAt = new Date(startedAt.getTime() + forest.durationSeconds * 1000)
    const expeditionId = this.createId()
    const outcome = calculateExpeditionOutcome({
      expeditionId,
      forest,
      totalLevel,
      sumIv
    })
    const logs = buildStartLogs({
      expeditionId,
      forest,
      startedAt,
      endsAt,
      events: outcome.events
    })
    const record: ExpeditionRecord = {
      id: expeditionId,
      wallet,
      petIds: input.petIds,
      expeditionType: input.expeditionType,
      startedAt: startedAt.toISOString(),
      endsAt: endsAt.toISOString(),
      claimedAt: null,
      status: 'started',
      totalLevel,
      sumIv,
      petSnapshot,
      events: outcome.events,
      reward: null,
      materialMintTxHash: null
    }

    this.store.createExpedition(record, logs)

    const details = this.store.getExpedition(expeditionId)

    if (!details) {
      throw new Error('Created expedition could not be loaded')
    }

    return this.withVisibleLogs(details)
  }

  async claimReward(body: unknown): Promise<ExpeditionDetails> {
    const input = readClaimBody(body)
    const wallet = this.auth.verify({
      wallet: input.wallet,
      action: 'claim-reward',
      payload: {
        expeditionId: input.expeditionId
      },
      nonce: input.nonce,
      message: input.message,
      signature: input.signature,
      now: this.now()
    })
    const expedition = this.store.getExpedition(input.expeditionId)

    if (!expedition) {
      throw notFound('EXPEDITION_NOT_FOUND', 'Expedition was not found')
    }

    if (expedition.wallet !== wallet) {
      throw new HttpError(403, 'EXPEDITION_WALLET_MISMATCH', 'Expedition does not belong to wallet')
    }

    if (expedition.status !== 'started') {
      throw new HttpError(409, 'EXPEDITION_ALREADY_CLAIMED', 'Expedition is not claimable')
    }

    if (Date.parse(expedition.endsAt) > this.now().getTime()) {
      throw new HttpError(409, 'EXPEDITION_NOT_READY', 'Expedition has not ended')
    }

    const reward = buildRewardFromEvents(expedition.events)
    await this.levelRewardPets(expedition.petSnapshot, reward)
    const materialMintTxHash = await this.mintRewardMaterials(wallet, reward)
    const claimedAt = this.now().toISOString()

    this.store.markClaimed({
      expeditionId: expedition.id,
      claimedAt,
      reward,
      materialMintTxHash
    })
    this.store.addLog(wallet, buildClaimLog(expedition.id, claimedAt, reward, materialMintTxHash))

    const claimed = this.store.getExpedition(expedition.id)

    if (!claimed) {
      throw new Error('Claimed expedition could not be loaded')
    }

    return {
      ...this.withVisibleLogs(claimed),
      reward,
      materialMintTxHash
    }
  }

  getActiveExpedition(walletInput: unknown) {
    const wallet = readAddress(walletInput, 'wallet')
    const expedition = this.store.getActiveExpedition(wallet)
    return expedition ? this.withVisibleLogs(expedition) : null
  }

  getExpeditionLogs(walletInput: unknown) {
    const wallet = readAddress(walletInput, 'wallet')
    return this.visibleLogs(this.store.listLogs(wallet))
  }

  private async readPetSnapshot(wallet: string, petIds: string[]): Promise<ExpeditionPetSnapshot[]> {
    const pets: ExpeditionPetSnapshot[] = []

    for (const tokenId of petIds) {
      const pet = await this.chain.getPet(BigInt(tokenId))

      if (readAddress(pet.owner, 'pet.owner') !== wallet) {
        throw new HttpError(403, 'PET_NOT_OWNED', `Pet ${tokenId} does not belong to wallet`)
      }

      pets.push({
        tokenId,
        owner: wallet,
        name: pet.name,
        level: readSafeNumber(pet.level, `pet ${tokenId} level`),
        iv: readSafeNumber(pet.iv, `pet ${tokenId} iv`)
      })
    }

    return pets
  }

  private async mintRewardMaterials(wallet: string, reward: ExpeditionReward) {
    if (reward.materials.length === 0) {
      return null
    }

    let lastTxHash: string | null = null

    for (const material of reward.materials) {
      const transaction = await this.chain.sendMaterialAdminTxAndWait(
        'increaseMaterial',
        [wallet, BigInt(material.id), BigInt(material.count)],
        1
      )
      lastTxHash = transaction.hash
    }

    return lastTxHash
  }

  private async levelRewardPets(pets: ExpeditionPetSnapshot[], reward: ExpeditionReward) {
    const levelGain = Math.floor(reward.exp / expPerLevel)

    if (levelGain <= 0) {
      return
    }

    for (const pet of pets) {
      await this.chain.sendPetAdminTxAndWait(
        'setPetLevel',
        [BigInt(pet.tokenId), BigInt(pet.level + levelGain)],
        1
      )
    }
  }

  private withVisibleLogs(details: ExpeditionDetails): ExpeditionDetails {
    return {
      ...details,
      logs: this.visibleLogs(details.logs)
    }
  }

  private visibleLogs(logs: ExpeditionLogEntry[]) {
    const now = this.now().getTime()
    return logs.filter((log) => Date.parse(log.at) <= now)
  }
}

function readStartBody(body: unknown) {
  const data = readBody(body)

  return {
    wallet: readAddress(data.wallet, 'wallet'),
    petIds: readPetIds(data.petIds),
    expeditionType: readExpeditionType(data.expeditionType),
    nonce: readString(data, 'nonce'),
    message: readString(data, 'message'),
    signature: readString(data, 'signature')
  }
}

function readClaimBody(body: unknown) {
  const data = readBody(body)

  return {
    wallet: readAddress(data.wallet, 'wallet'),
    expeditionId: readString(data, 'expeditionId'),
    nonce: readString(data, 'nonce'),
    message: readString(data, 'message'),
    signature: readString(data, 'signature')
  }
}

function readPetIds(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    throw invalidRequest('petIds must be a non-empty array')
  }

  return value.map((item, index) => readUint(item, `petIds[${index}]`, { positive: true }).toString())
}

function readExpeditionType(value: unknown): ExpeditionType {
  if (value === 'orange' || value === 'apple' || value === 'snow-peach') {
    return value
  }

  throw invalidRequest('expeditionType is unknown')
}

function assertUniquePetIds(petIds: string[]) {
  const seen = new Set<string>()

  for (const petId of petIds) {
    if (seen.has(petId)) {
      throw invalidRequest('petIds must not contain duplicates')
    }

    seen.add(petId)
  }
}

function readSafeNumber(value: unknown, name: string) {
  const parsed = readUint(value, name)

  if (parsed > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw invalidRequest(`${name} is too large`)
  }

  return Number(parsed)
}

function buildStartLogs(input: {
  expeditionId: string
  forest: ExpeditionForest
  startedAt: Date
  endsAt: Date
  events: ExpeditionEventResult[]
}) {
  const logs: ExpeditionLogEntry[] = [
    {
      id: randomUUID(),
      expeditionId: input.expeditionId,
      at: input.startedAt.toISOString(),
      message: {
        zh: `開始${input.forest.name.zh}遠征。`,
        en: `Started ${input.forest.name.en}.`
      },
      variant: 'notice'
    }
  ]
  const startedMs = input.startedAt.getTime()
  const durationMs = input.endsAt.getTime() - startedMs

  for (const event of input.events) {
    const eventAt = new Date(startedMs + Math.floor((durationMs * (event.index + 1)) / (input.events.length + 1)))

    logs.push({
      id: randomUUID(),
      expeditionId: input.expeditionId,
      at: eventAt.toISOString(),
      message: event.message,
      variant: null
    })
  }

  logs.push({
    id: randomUUID(),
    expeditionId: input.expeditionId,
    at: input.endsAt.toISOString(),
    message: {
      zh: '遠征已完成，等待領取結算。',
      en: 'The expedition is complete and waiting to be claimed.'
    },
    variant: 'notice'
  })

  return logs
}

function buildClaimLog(expeditionId: string, claimedAt: string, reward: ExpeditionReward, txHash: string | null): ExpeditionLogEntry {
  const materialCount = reward.materials.reduce((sum, material) => sum + material.count, 0)

  if (materialCount === 0) {
    return {
      id: randomUUID(),
      expeditionId,
      at: claimedAt,
      message: {
        zh: '遠征結算完成，這次沒有帶回素材。',
        en: 'Expedition claimed. No materials were found this time.'
      },
      variant: 'notice'
    }
  }

  return {
    id: randomUUID(),
    expeditionId,
    at: claimedAt,
    message: {
      zh: `遠征結算完成，已發放 ${materialCount} 份素材到鏈上。`,
      en: `Expedition claimed. ${materialCount} materials were minted on-chain.`
    },
    variant: txHash ? 'notice' : null
  }
}
