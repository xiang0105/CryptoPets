import { BrowserProvider } from 'ethers'
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
  exp?: {
    current: number
    next: number
  }
}

interface WalletMaterialsResponse {
  wallet: string
  balances: Array<{
    materialId: string
    amount: string
  }>
}

interface MaterialMarketResponse {
  listings: MarketListing[]
}

interface MaterialListingResponse {
  listing: MarketListing
}

interface TransactionsResponse {
  wallet: string
  transactions: PlayerTransaction[]
}

interface TransactionRequestDto {
  to: string
  data: string
  value: string
  chainId: number
}

const fallbackChainId = Number(import.meta.env.VITE_CHAIN_ID || 11155111)
const discardAddress = '0x000000000000000000000000000000000000dEaD'

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
    inventory: mergeMaterialBalances(balancesResponse.balances),
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

  return response.listings
}

export async function listMarketMaterial(wallet: string, materialId: string, amount: number, price: number) {
  const payload: ListMarketMaterialRequest = { materialId, amount, price }
  const response = await apiRequest<MaterialListingResponse>('/market/materials', {
    method: 'POST',
    body: JSON.stringify({
      sellerWallet: wallet,
      materialId: payload.materialId,
      amount: payload.amount,
      price: payload.price,
    }),
  })

  return response.listing
}

export async function discardMaterial(wallet: string, materialId: string, amount: number) {
  const transaction = await apiRequest<TransactionRequestDto>('/tx/materials/transfer', {
    method: 'POST',
    body: JSON.stringify({
      from: wallet,
      to: discardAddress,
      materialId: contentMaterialIdToChainId(materialId),
      amount: String(amount),
      data: '0x',
    }),
  })

  await sendWalletTransaction(transaction)
}

export async function cancelMarketListing(wallet: string, listingId: string) {
  const payload: ListingIdRequest = { listingId }
  const response = await apiRequest<MaterialListingResponse>(`/market/materials/${payload.listingId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({
      sellerWallet: wallet,
    }),
  })

  return response.listing
}

export async function buyMarketListing(wallet: string, listingId: string) {
  const payload: ListingIdRequest = { listingId }
  const [contracts, listingResponse] = await Promise.all([
    apiRequest<ContractsResponse>('/contracts'),
    apiRequest<MaterialListingResponse>(`/market/materials/${payload.listingId}`),
  ])
  const listing = listingResponse.listing

  if (!listing.sellerWallet) {
    throw new Error('MARKET_LISTING_NOT_FOUND')
  }

  const paymentTxHash = await sendWalletTransaction({
    to: listing.sellerWallet,
    data: '0x',
    value: decimalEthToWei(listing.price),
    chainId: contracts.chainId || fallbackChainId,
  })
  const response = await apiRequest<MaterialListingResponse>(`/market/materials/${payload.listingId}/buy`, {
    method: 'POST',
    body: JSON.stringify({
      buyerWallet: wallet,
      paymentTxHash,
    }),
  })

  return response.listing
}

export async function getTransactions(wallet: string) {
  const response = await apiRequest<TransactionsResponse>(`/wallets/${wallet}/transactions`)

  return response.transactions
}

function getConfiguredMaterialIds() {
  return uniqueValues([
    ...materialDefinitions.map((material) => contentMaterialIdToChainId(material.id)),
    '1',
  ])
}

function contentMaterialIdToChainId(materialId: string) {
  const match = /^MAT-(\d+)/.exec(materialId)

  if (!match) {
    return materialId
  }

  return match[1] ?? materialId
}

function chainMaterialIdToContentId(materialId: string) {
  if (materialId === '1') {
    return 'MAT-2C'
  }

  return materialDefinitions.find((material) => contentMaterialIdToChainId(material.id) === materialId)?.id ?? materialId
}

function mergeMaterialBalances(balances: WalletMaterialsResponse['balances']) {
  const amountByMaterialId = new Map<string, number>()
  const updatedAt = new Date().toISOString()

  for (const balance of balances) {
    const materialId = chainMaterialIdToContentId(balance.materialId)
    amountByMaterialId.set(materialId, (amountByMaterialId.get(materialId) ?? 0) + Number(balance.amount))
  }

  return [...amountByMaterialId].map(([materialId, amount]) => ({
    materialId,
    amount,
    updatedAt,
  }))
}

function uniqueValues(values: string[]) {
  return [...new Set(values)]
}

function decimalEthToWei(value: number) {
  const decimal = Number.isFinite(value) ? value.toFixed(18) : String(value)
  const [whole, fractional = ''] = decimal.split('.')
  const wei = `${whole || '0'}${fractional.padEnd(18, '0').slice(0, 18)}`.replace(/^0+(?=\d)/, '')
  return wei || '0'
}

async function sendWalletTransaction(transaction: TransactionRequestDto) {
  if (!window.ethereum) {
    throw new Error('WALLET_PROVIDER_MISSING')
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
    throw new Error('WALLET_TRANSACTION_FAILED')
  }

  const provider = new BrowserProvider(window.ethereum)
  const receipt = await provider.waitForTransaction(hash, 1)

  if (!receipt || receipt.status !== 1) {
    throw new Error('WALLET_TRANSACTION_FAILED')
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
      current: Math.min(Math.max(0, pet.exp?.current ?? 0), pet.exp?.next ? pet.exp.next - 1 : 99),
      next: pet.exp?.next ?? 100,
    },
    birthTime: '',
  }
}
