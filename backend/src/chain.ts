import {
  Contract,
  Interface,
  JsonRpcProvider,
  Wallet,
  ZeroAddress,
  getAddress,
  isCallException,
  type Log
} from 'ethers'
import { cryptoMaterialsAbi, cryptoPetsAbi } from './abi.js'
import type { AppConfig } from './config.js'
import { HttpError, notFound } from './errors.js'
import {
  reduceMaterialMarketEvents,
  reducePetMarketEvents,
  type MaterialMarketEvent,
  type MaterialMarketListing,
  type PetMarketEvent,
  type PetMarketListing
} from './market.js'

export interface TransactionRequestDto {
  to: string
  data: string
  value: string
  chainId: number
}

export interface SentTransactionDto {
  hash: string
  from: string
  to: string
  chainId: number
  nonce: number
}

export interface ConfirmedTransactionDto extends SentTransactionDto {
  blockNumber: number | null
  status: number | null
}

export interface ConfirmedNativeTransactionDto extends ConfirmedTransactionDto {
  value: string
}

export interface PetDto {
  tokenId: string
  owner: string
  name: string
  iv: number
  level: string
  skin: number
  listing: PetMarketListing | null
}

export interface MaterialBalanceDto {
  materialId: string
  amount: string
}

interface MarketCache<T> {
  expiresAt: number
  value: T
}

const logChunkSize = 5000

export class ChainServices {
  private provider: JsonRpcProvider
  private pets: Contract
  private materials: Contract
  private petsInterface: Interface
  private materialsInterface: Interface
  private petMarketCache: MarketCache<PetMarketListing[]> | null = null
  private materialMarketCache: MarketCache<MaterialMarketListing[]> | null = null

  constructor(private config: AppConfig) {
    this.provider = new JsonRpcProvider(config.rpcUrl, config.chainId)
    this.petsInterface = new Interface(cryptoPetsAbi)
    this.materialsInterface = new Interface(cryptoMaterialsAbi)
    this.pets = new Contract(config.cryptoPetsAddress, cryptoPetsAbi, this.provider)
    this.materials = new Contract(config.cryptoMaterialsAddress, cryptoMaterialsAbi, this.provider)
  }

  getContracts() {
    return {
      chainId: this.config.chainId,
      pets: {
        address: this.config.cryptoPetsAddress,
        fromBlock: this.config.petsFromBlock
      },
      materials: {
        address: this.config.cryptoMaterialsAddress,
        fromBlock: this.config.materialsFromBlock
      }
    }
  }

  async getTotalPets() {
    const total = await this.pets.getTotalPet()
    return bigintToString(total)
  }

  async getPetOwner(tokenId: bigint) {
    try {
      return getAddress(await this.pets.ownerOf(tokenId))
    } catch (error) {
      if (isCallException(error)) {
        throw notFound('PET_NOT_FOUND', 'Pet was not found')
      }
      throw error
    }
  }

  async getPet(tokenId: bigint): Promise<PetDto> {
    const owner = await this.getPetOwner(tokenId)
    const attribute = await this.pets.ownerToPets(owner, tokenId)
    const listing = await this.getPetListing(tokenId)

    return {
      tokenId: bigintToString(tokenId),
      owner,
      name: stringField(attribute, 1, 'petName'),
      iv: numberField(attribute, 2, 'petIv'),
      level: bigintToString(field(attribute, 3, 'petLevel')),
      skin: numberField(attribute, 4, 'petSkin'),
      listing
    }
  }

  async getWalletPets(wallet: string) {
    const tokenIds = await this.pets.getUserPetId(wallet)
    const pets: PetDto[] = []

    for (const tokenId of tokenIds as bigint[]) {
      const attribute = await this.pets.ownerToPets(wallet, tokenId)
      const listing = await this.getPetListing(tokenId)

      pets.push({
        tokenId: bigintToString(tokenId),
        owner: wallet,
        name: stringField(attribute, 1, 'petName'),
        iv: numberField(attribute, 2, 'petIv'),
        level: bigintToString(field(attribute, 3, 'petLevel')),
        skin: numberField(attribute, 4, 'petSkin'),
        listing
      })
    }

    return pets
  }

  async getPetListing(tokenId: bigint): Promise<PetMarketListing | null> {
    const listing = await this.pets.petListings(tokenId)
    const seller = stringField(listing, 0, 'seller')
    const price = field(listing, 1, 'price')

    if (seller === ZeroAddress || price === 0n) {
      return null
    }

    return {
      tokenId: bigintToString(tokenId),
      seller: getAddress(seller),
      priceWei: bigintToString(price)
    }
  }

  async getPetMarketListings() {
    if (this.petMarketCache && this.petMarketCache.expiresAt > Date.now()) {
      return this.petMarketCache.value
    }

    const events = await this.readPetMarketEvents()
    const reduced = reducePetMarketEvents(events)
    const liveListings: PetMarketListing[] = []

    for (const listing of reduced) {
      const liveListing = await this.getPetListing(BigInt(listing.tokenId))

      if (liveListing) {
        liveListings.push(liveListing)
      }
    }

    this.petMarketCache = {
      expiresAt: Date.now() + this.config.marketCacheMs,
      value: liveListings
    }

    return liveListings
  }

  async getMaterialBalance(wallet: string, materialId: bigint): Promise<MaterialBalanceDto> {
    const amount = await this.materials.balanceOf(wallet, materialId)

    return {
      materialId: bigintToString(materialId),
      amount: bigintToString(amount)
    }
  }

  async getWalletMaterialBalances(wallet: string, materialIds: bigint[]) {
    const wallets = materialIds.map(() => wallet)
    const amounts = await this.materials.balanceOfBatch(wallets, materialIds)

    return materialIds.map((materialId, index) => ({
      materialId: bigintToString(materialId),
      amount: bigintToString((amounts as bigint[])[index])
    }))
  }

  async getMaterialListing(listingId: bigint): Promise<MaterialMarketListing | null> {
    const listing = await this.materials.materialListings(listingId)
    const seller = stringField(listing, 0, 'seller')
    const materialId = field(listing, 1, 'materialId')
    const amount = field(listing, 2, 'amount')
    const price = field(listing, 3, 'price')
    const active = booleanField(listing, 4, 'active')

    if (!active || seller === ZeroAddress) {
      return null
    }

    return {
      listingId: bigintToString(listingId),
      seller: getAddress(seller),
      materialId: bigintToString(materialId),
      amount: bigintToString(amount),
      priceWei: bigintToString(price)
    }
  }

  async getMaterialMarketListings() {
    if (this.materialMarketCache && this.materialMarketCache.expiresAt > Date.now()) {
      return this.materialMarketCache.value
    }

    const events = await this.readMaterialMarketEvents()
    const reduced = reduceMaterialMarketEvents(events)
    const liveListings: MaterialMarketListing[] = []

    for (const listing of reduced) {
      const liveListing = await this.getMaterialListing(BigInt(listing.listingId))

      if (liveListing) {
        liveListings.push(liveListing)
      }
    }

    this.materialMarketCache = {
      expiresAt: Date.now() + this.config.marketCacheMs,
      value: liveListings
    }

    return liveListings
  }

  buildPetTx(functionName: string, args: unknown[], value: bigint = 0n): TransactionRequestDto {
    return this.buildTx(this.config.cryptoPetsAddress, this.petsInterface, functionName, args, value)
  }

  buildMaterialTx(functionName: string, args: unknown[], value: bigint = 0n): TransactionRequestDto {
    return this.buildTx(this.config.cryptoMaterialsAddress, this.materialsInterface, functionName, args, value)
  }

  async sendPetAdminTx(functionName: string, args: unknown[]): Promise<SentTransactionDto> {
    return this.sendAdminTx(this.config.cryptoPetsAddress, cryptoPetsAbi, functionName, args)
  }

  getPetAdminAddress() {
    if (!this.config.deployerPrivateKey) {
      return null
    }

    try {
      return new Wallet(this.config.deployerPrivateKey).address
    } catch {
      return null
    }
  }

  async getPetContractOwner() {
    return getAddress(await this.pets.owner())
  }

  async sendPetAdminTxAndWait(
    functionName: string,
    args: unknown[],
    confirmations = 1
  ): Promise<ConfirmedTransactionDto> {
    return this.sendAdminTxAndWait(this.config.cryptoPetsAddress, cryptoPetsAbi, functionName, args, confirmations)
  }

  async sendMaterialAdminTx(functionName: string, args: unknown[]): Promise<SentTransactionDto> {
    return this.sendAdminTx(this.config.cryptoMaterialsAddress, cryptoMaterialsAbi, functionName, args)
  }

  async sendMaterialAdminTxAndWait(
    functionName: string,
    args: unknown[],
    confirmations = 1
  ): Promise<ConfirmedTransactionDto> {
    return this.sendAdminTxAndWait(this.config.cryptoMaterialsAddress, cryptoMaterialsAbi, functionName, args, confirmations)
  }

  async sendNativeTransferAndWait(
    to: string,
    value: bigint,
    confirmations = 1
  ): Promise<ConfirmedTransactionDto> {
    const signer = this.getAdminSigner()
    const tx = await signer.sendTransaction({
      to,
      value
    })
    const receipt = await tx.wait(confirmations)

    return {
      hash: tx.hash,
      from: await signer.getAddress(),
      to,
      chainId: this.config.chainId,
      nonce: tx.nonce,
      blockNumber: receipt?.blockNumber ?? null,
      status: receipt?.status ?? null
    }
  }

  async getConfirmedNativeTransaction(hash: string, confirmations = 1): Promise<ConfirmedNativeTransactionDto | null> {
    const receipt = await this.provider.waitForTransaction(hash, confirmations)

    if (!receipt) {
      return null
    }

    let tx = await this.provider.getTransaction(hash)

    for (let attempts = 0; !tx && attempts < 20; attempts += 1) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      tx = await this.provider.getTransaction(hash)
    }

    if (!tx) {
      return null
    }

    return {
      hash: tx.hash,
      from: tx.from ?? ZeroAddress,
      to: tx.to ? getAddress(tx.to) : ZeroAddress,
      value: bigintToString(tx.value),
      chainId: this.config.chainId,
      nonce: tx.nonce,
      blockNumber: receipt?.blockNumber ?? null,
      status: receipt?.status ?? null
    }
  }

  private buildTx(address: string, contractInterface: Interface, functionName: string, args: unknown[], value: bigint) {
    return {
      to: address,
      data: contractInterface.encodeFunctionData(functionName, args),
      value: bigintToString(value),
      chainId: this.config.chainId
    }
  }

  private async sendAdminTx(address: string, abi: string[], functionName: string, args: unknown[]) {
    const { signer, tx } = await this.submitAdminTx(address, abi, functionName, args)

    return {
      hash: tx.hash,
      from: await signer.getAddress(),
      to: address,
      chainId: this.config.chainId,
      nonce: tx.nonce
    }
  }

  private async sendAdminTxAndWait(
    address: string,
    abi: string[],
    functionName: string,
    args: unknown[],
    confirmations: number
  ) {
    const { signer, tx } = await this.submitAdminTx(address, abi, functionName, args)
    const receipt = await tx.wait(confirmations)

    return {
      hash: tx.hash,
      from: await signer.getAddress(),
      to: address,
      chainId: this.config.chainId,
      nonce: tx.nonce,
      blockNumber: receipt?.blockNumber ?? null,
      status: receipt?.status ?? null
    }
  }

  private async submitAdminTx(address: string, abi: string[], functionName: string, args: unknown[]) {
    const signer = this.getAdminSigner()
    const contract = new Contract(address, abi, signer)
    const method = contract.getFunction(functionName)
    const tx = await method(...args)

    return {
      signer,
      tx
    }
  }

  private getAdminSigner() {
    if (!this.config.deployerPrivateKey) {
      throw new HttpError(503, 'DEPLOYER_PRIVATE_KEY_NOT_CONFIGURED', 'Admin signer is not configured')
    }

    try {
      return new Wallet(this.config.deployerPrivateKey, this.provider)
    } catch {
      throw new HttpError(503, 'DEPLOYER_PRIVATE_KEY_INVALID', 'Admin signer is invalid')
    }
  }

  private async readPetMarketEvents() {
    const logs = await this.readLogs(
      this.config.cryptoPetsAddress,
      this.petsInterface,
      ['PetListed', 'PetListingCanceled', 'PetBought'],
      this.config.petsFromBlock
    )
    const events: PetMarketEvent[] = []

    for (const log of logs) {
      const parsed = this.petsInterface.parseLog(log)

      if (!parsed) {
        continue
      }

      if (parsed.name === 'PetListed') {
        events.push({
          type: 'listed',
          tokenId: bigintToString(parsed.args.tokenId),
          seller: getAddress(parsed.args.seller),
          priceWei: bigintToString(parsed.args.price),
          blockNumber: log.blockNumber,
          logIndex: log.index
        })
      } else if (parsed.name === 'PetListingCanceled') {
        events.push({
          type: 'canceled',
          tokenId: bigintToString(parsed.args.tokenId),
          blockNumber: log.blockNumber,
          logIndex: log.index
        })
      } else if (parsed.name === 'PetBought') {
        events.push({
          type: 'bought',
          tokenId: bigintToString(parsed.args.tokenId),
          blockNumber: log.blockNumber,
          logIndex: log.index
        })
      }
    }

    return events
  }

  private async readMaterialMarketEvents() {
    const logs = await this.readLogs(
      this.config.cryptoMaterialsAddress,
      this.materialsInterface,
      ['MaterialListed', 'MaterialListingCanceled', 'MaterialBought'],
      this.config.materialsFromBlock
    )
    const events: MaterialMarketEvent[] = []

    for (const log of logs) {
      const parsed = this.materialsInterface.parseLog(log)

      if (!parsed) {
        continue
      }

      if (parsed.name === 'MaterialListed') {
        events.push({
          type: 'listed',
          listingId: bigintToString(parsed.args.listingId),
          seller: getAddress(parsed.args.seller),
          materialId: bigintToString(parsed.args.materialId),
          amount: bigintToString(parsed.args.amount),
          priceWei: bigintToString(parsed.args.price),
          blockNumber: log.blockNumber,
          logIndex: log.index
        })
      } else if (parsed.name === 'MaterialListingCanceled') {
        events.push({
          type: 'canceled',
          listingId: bigintToString(parsed.args.listingId),
          blockNumber: log.blockNumber,
          logIndex: log.index
        })
      } else if (parsed.name === 'MaterialBought') {
        events.push({
          type: 'bought',
          listingId: bigintToString(parsed.args.listingId),
          blockNumber: log.blockNumber,
          logIndex: log.index
        })
      }
    }

    return events
  }

  private async readLogs(address: string, contractInterface: Interface, eventNames: string[], fromBlock: number) {
    const latestBlock = await this.provider.getBlockNumber()
    const topics = eventNames.map((eventName) => {
      const event = contractInterface.getEvent(eventName)

      if (!event) {
        throw new Error(`Unknown event ${eventName}`)
      }

      return event.topicHash
    })
    const logs: Log[] = []

    for (let start = fromBlock; start <= latestBlock; start += logChunkSize) {
      const end = Math.min(start + logChunkSize - 1, latestBlock)
      const chunk = await this.provider.getLogs({
        address,
        fromBlock: start,
        toBlock: end,
        topics: [topics]
      })
      logs.push(...chunk)
    }

    return logs
  }
}

function field(value: unknown, index: number, name: string) {
  const tuple = value as readonly unknown[] & Record<string, unknown>
  const rawValue = tuple[name] ?? tuple[index]

  if (typeof rawValue === 'bigint') {
    return rawValue
  }

  if (typeof rawValue === 'number' && Number.isSafeInteger(rawValue) && rawValue >= 0) {
    return BigInt(rawValue)
  }

  if (typeof rawValue === 'string' && /^[0-9]+$/.test(rawValue)) {
    return BigInt(rawValue)
  }

  throw new Error(`${name} is not a uint`)
}

function numberField(value: unknown, index: number, name: string) {
  const parsed = field(value, index, name)

  if (parsed > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`${name} is too large`)
  }

  return Number(parsed)
}

function stringField(value: unknown, index: number, name: string) {
  const tuple = value as readonly unknown[] & Record<string, unknown>
  const rawValue = tuple[name] ?? tuple[index]

  if (typeof rawValue !== 'string') {
    throw new Error(`${name} is not a string`)
  }

  return rawValue
}

function booleanField(value: unknown, index: number, name: string) {
  const tuple = value as readonly unknown[] & Record<string, unknown>
  const rawValue = tuple[name] ?? tuple[index]

  if (typeof rawValue !== 'boolean') {
    throw new Error(`${name} is not a boolean`)
  }

  return rawValue
}

function bigintToString(value: unknown) {
  if (typeof value === 'bigint') {
    return value.toString()
  }

  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    return String(value)
  }

  if (typeof value === 'string' && /^[0-9]+$/.test(value)) {
    return value
  }

  throw new Error('Value is not a uint')
}
