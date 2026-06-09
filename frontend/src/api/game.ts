import type {
  ExpeditionLogEntry,
  ClaimRewardRequest,
  ExpeditionSummary,
  ExpeditionType,
  ListingIdRequest,
  ListMarketMaterialRequest,
  MaterialBackpack,
  MarketListing,
  PlayerResources,
  PlayerProfile,
  PlayerTransaction,
  StartExpeditionRequest,
} from '@cryptopets/shared'
import { materialDefinitions, starterCapybaraByName } from '@cryptopets/game-content'
import { apiRequest } from './client'

interface ContractsResponse {
  chainId: number
  pets: {
    address: string
  }
  materials: {
    address: string
  }
}

interface WalletPetsResponse {
  wallet: string
  pets: ChainPet[]
}

interface ChainPet {
  tokenId: string
  owner: string
  name: string
  iv: number
  level: string
  skin: number
}

interface WalletMaterialsResponse {
  wallet: string
  balances: Array<{
    materialId: string
    amount: string
  }>
}

interface MaterialMarketResponse {
  listings: Array<{
    listingId: string
    seller: string
    materialId: string
    amount: string
    priceWei: string
  }>
}

interface TransactionRequestDto {
  to: string
  data: string
  value: string
  chainId: number
}

const fallbackChainId = Number(import.meta.env.VITE_CHAIN_ID || 11155111)

export async function getPlayer(wallet: string) {
  const [contracts, petsResponse, activeExpedition] = await Promise.all([
    apiRequest<ContractsResponse>('/contracts'),
    apiRequest<WalletPetsResponse>(`/wallets/${wallet}/pets`),
    apiRequest<ExpeditionSummary | null>(`/wallets/${wallet}/expedition`),
  ])

  return {
    id: wallet,
    wallet: wallet as PlayerProfile['wallet'],
    username: null,
    chain: {
      enabled: true,
      chainId: contracts.chainId,
      nftContractAddress: contracts.pets.address as PlayerProfile['chain']['nftContractAddress'],
    },
    pets: petsResponse.pets.map((pet) => mapChainPet(pet, contracts)),
    activeExpedition,
  } satisfies PlayerProfile
}

export async function getResources(wallet: string) {
  const backpack = await getMaterialBackpack(wallet)

  return {
    sepoliaBalance: backpack.sepoliaBalance,
    inventory: backpack.inventory,
  } satisfies PlayerResources
}

export async function getMaterialBackpack(wallet: string) {
  const contracts = await apiRequest<ContractsResponse>('/contracts')
  const materialIds = getConfiguredMaterialIds()
  const balancesResponse = materialIds.length
    ? await apiRequest<WalletMaterialsResponse>(`/wallets/${wallet}/materials?ids=${materialIds.join(',')}`)
    : { wallet, balances: [] }

  return {
    sepoliaBalance: '0',
    inventory: balancesResponse.balances.map((balance) => ({
      materialId: balance.materialId,
      amount: Number(balance.amount),
      updatedAt: new Date().toISOString(),
    })),
    source: 'chain-db',
    syncedAt: new Date().toISOString(),
    chain: {
      enabled: true,
      chainId: contracts.chainId,
      materialContractAddress: contracts.materials.address as MaterialBackpack['chain']['materialContractAddress'],
    },
  } satisfies MaterialBackpack
}

export function startSignedExpedition(payload: StartExpeditionRequest & {
  wallet: string
  expeditionType: ExpeditionType
  nonce: string
  message: string
  signature: string
}) {
  return apiRequest<ExpeditionSummary>('/start-expedition', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function claimSignedReward(payload: ClaimRewardRequest & {
  wallet: string
  nonce: string
  message: string
  signature: string
}) {
  return apiRequest<ExpeditionSummary>('/claim-reward', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getExpeditionLogs(wallet: string) {
  return apiRequest<ExpeditionLogEntry[]>(`/wallets/${wallet}/expedition/logs`)
}

export async function getMarketListings() {
  const response = await apiRequest<MaterialMarketResponse>('/market/materials')

  return response.listings.map((listing) => ({
    id: listing.listingId,
    sellerId: listing.seller,
    sellerWallet: listing.seller as MarketListing['sellerWallet'],
    materialId: chainMaterialIdToContentId(listing.materialId),
    amount: Number(listing.amount),
    price: Number(listing.priceWei) / 1e18,
    status: 'active',
    buyerId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })) satisfies MarketListing[]
}

export async function listMarketMaterial(materialId: string, amount: number, price: number) {
  const payload: ListMarketMaterialRequest = { materialId, amount, price }
  const transaction = await apiRequest<TransactionRequestDto>('/tx/materials/list', {
    method: 'POST',
    body: JSON.stringify({
      materialId: contentMaterialIdToChainId(payload.materialId),
      amount: String(payload.amount),
      priceWei: decimalEthToWei(payload.price),
    }),
  })

  await sendWalletTransaction(transaction)

  return {
    id: `pending-${Date.now()}`,
    sellerId: '',
    sellerWallet: null,
    materialId: payload.materialId,
    amount: payload.amount,
    price: payload.price,
    status: 'active',
    buyerId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } satisfies MarketListing
}

export async function cancelMarketListing(listingId: string) {
  const payload: ListingIdRequest = { listingId }
  const transaction = await apiRequest<TransactionRequestDto>('/tx/materials/cancel-listing', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  await sendWalletTransaction(transaction)

  return {
    id: payload.listingId,
    sellerId: '',
    sellerWallet: null,
    materialId: '',
    amount: 0,
    price: 0,
    status: 'cancelled',
    buyerId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } satisfies MarketListing
}

export async function buyMarketListing(listingId: string) {
  const payload: ListingIdRequest = { listingId }
  const transaction = await apiRequest<TransactionRequestDto>('/tx/materials/buy', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  await sendWalletTransaction(transaction)

  return {
    id: payload.listingId,
    sellerId: '',
    sellerWallet: null,
    materialId: '',
    amount: 0,
    price: 0,
    status: 'sold',
    buyerId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } satisfies MarketListing
}

export function getTransactions() {
  return Promise.resolve([] satisfies PlayerTransaction[])
}

function getConfiguredMaterialIds() {
  return materialDefinitions.map((material) => contentMaterialIdToChainId(material.id))
}

function contentMaterialIdToChainId(materialId: string) {
  const match = /^MAT-(\d+)/.exec(materialId)

  if (!match) {
    return materialId
  }

  return match[1]
}

function chainMaterialIdToContentId(materialId: string) {
  return materialDefinitions.find((material) => contentMaterialIdToChainId(material.id) === materialId)?.id ?? materialId
}

function decimalEthToWei(value: number) {
  const [whole, fractional = ''] = String(value).split('.')
  const wei = `${whole || '0'}${fractional.padEnd(18, '0').slice(0, 18)}`.replace(/^0+(?=\d)/, '')
  return wei || '0'
}

async function sendWalletTransaction(transaction: TransactionRequestDto) {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed. Please install or enable MetaMask to continue.')
  }

  const hash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{
      to: transaction.to,
      data: transaction.data,
      value: toHexQuantity(transaction.value),
      chainId: toHexQuantity(transaction.chainId),
    }],
  })

  if (typeof hash !== 'string') {
    throw new Error('Wallet transaction failed')
  }

  return hash
}

function toHexQuantity(value: string | number) {
  return `0x${BigInt(value).toString(16)}`
}

function mapChainPet(pet: ChainPet, contracts: ContractsResponse): PlayerProfile['pets'][number] {
  const content = starterCapybaraByName[pet.name] ?? starterCapybaraByName[pet.name.toUpperCase()]
  const level = Number(pet.level)
  const safeLevel = Number.isFinite(level) ? level : 1
  const stats = content?.stats ?? {
    iv: pet.iv,
    hp: 100,
    maxHp: 100,
    atk: 50,
    def: 50,
  }

  return {
    id: pet.tokenId,
    tokenId: pet.tokenId,
    contractAddress: contracts.pets.address as PlayerProfile['pets'][number]['contractAddress'],
    chainId: contracts.chainId || fallbackChainId,
    basePetId: content?.id ?? `CHAIN-PET-${pet.tokenId}`,
    level: safeLevel,
    skinId: pet.skin,
    name: pet.name,
    element: content?.element ?? 'citrus',
    stage: content?.stage ?? 1,
    tokenUri: content?.tokenURI ?? '',
    stats: {
      ...stats,
      iv: pet.iv,
    },
    exp: {
      current: 0,
      next: 100,
    },
    birthTime: '',
  }
}
