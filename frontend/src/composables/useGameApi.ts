import { computed, reactive, ref } from 'vue'
import type {
  ExpeditionSummary,
  ExpeditionLogEntry,
  ExpeditionType,
  MaterialBackpack,
  MarketListing,
  PlayerProfile,
  PlayerResources,
  PlayerTransaction,
} from '@cryptopets/shared'
import { materialDefinitions, starterCapybaraByName } from '@cryptopets/game-content'
import {
  buyMarketListing,
  cancelMarketListing,
  claimSignedReward,
  discardMaterial,
  getExpeditionLogs,
  getMarketListings,
  getMaterialBackpack,
  getPlayer,
  getResources,
  getTransactions,
  listMarketMaterial,
  startSignedExpedition,
} from '@/api/game'
import { requestClaimRewardNonce, requestStartExpeditionNonce } from '@/api/auth'
import type { GoodieSft, ListingStatus } from '@/data/goodies'
import type { Pet } from '@/data/pets'
import { replacePets } from '@/data/pets'
import { getAuthToken } from '@/api/client'
import { translateApiError } from '@/api/errors'
import { useWallet } from '@/composables/useWallet'
import { getMaterialImage } from '@/content/gameAssets'

type QueryKey = 'player' | 'resources' | 'backpack' | 'marketListings' | 'transactions' | 'expeditionLogs'
type OperationKey = 'startExpedition' | 'claimReward' | 'listMarketMaterial' | 'cancelListing' | 'buyListing' | 'discardMaterial'
type QueryOptions = {
  force?: boolean
}

const materialDefinitionById = new Map(materialDefinitions.map((material) => [material.id, material]))
const QUERY_FRESH_MS = 30_000

const playerProfile = ref<PlayerProfile | null>(null)
const resources = ref<PlayerResources | null>(null)
const materialBackpack = ref<MaterialBackpack | null>(null)
const marketListings = ref<MarketListing[]>([])
const transactions = ref<PlayerTransaction[]>([])
const activeExpedition = ref<ExpeditionSummary | null>(null)
const expeditionLogs = ref<ExpeditionLogEntry[]>([])
const { walletAddress } = useWallet()

const queryLoading = reactive<Record<QueryKey, boolean>>({
  player: false,
  resources: false,
  backpack: false,
  marketListings: false,
  transactions: false,
  expeditionLogs: false,
})

const queryError = reactive<Record<QueryKey, string>>({
  player: '',
  resources: '',
  backpack: '',
  marketListings: '',
  transactions: '',
  expeditionLogs: '',
})
const queryLoadedAt = reactive<Record<QueryKey, number>>({
  player: 0,
  resources: 0,
  backpack: 0,
  marketListings: 0,
  transactions: 0,
  expeditionLogs: 0,
})
const queryInFlight: Partial<Record<QueryKey, Promise<unknown>>> = {}

const operationLoading = reactive<Record<OperationKey, boolean>>({
  startExpedition: false,
  claimReward: false,
  listMarketMaterial: false,
  cancelListing: false,
  buyListing: false,
  discardMaterial: false,
})

const operationError = reactive<Record<OperationKey, string>>({
  startExpedition: '',
  claimReward: '',
  listMarketMaterial: '',
  cancelListing: '',
  buyListing: '',
  discardMaterial: '',
})

const activeMarketGoodies = computed(() =>
  marketListings.value
    .filter((listing) => listing.status === 'active')
    .map((listing) => marketListingToGoodie(listing)),
)
const purchasableMarketGoodies = computed(() =>
  marketListings.value
    .filter((listing) => listing.status === 'active' && !isOwnMarketListing(listing))
    .map((listing) => marketListingToGoodie(listing)),
)
const ownedMarketGoodies = computed(() =>
  marketListings.value
    .filter((listing) => listing.status === 'active' && isOwnMarketListing(listing))
    .map((listing) => marketListingToGoodie(listing)),
)
const materialBackpackGoodies = computed(() =>
  materialBackpack.value?.inventory
    .filter((item) => item.amount > 0)
    .map((item) => materialInventoryItemToGoodie(item.materialId, item.amount)) ?? [],
)

const hasLoadedAnyApi = computed(() =>
  Boolean(
    playerProfile.value ||
      resources.value ||
      materialBackpack.value ||
      marketListings.value.length ||
      transactions.value.length,
  ),
)

function isQueryFresh(key: QueryKey) {
  return Date.now() - queryLoadedAt[key] < QUERY_FRESH_MS
}

function shouldSkipQuery(key: QueryKey, options: QueryOptions, hasValue: boolean) {
  return !options.force && hasValue && isQueryFresh(key)
}

async function runQuery<T>(key: QueryKey, request: () => Promise<T>, apply: (value: T) => void, fallback: string, options: QueryOptions = {}) {
  if (!options.force && queryInFlight[key]) {
    return queryInFlight[key] as Promise<T>
  }

  queryLoading[key] = true
  queryError[key] = ''

  const queryPromise = (async () => {
    const value = await request()
    apply(value)
    queryLoadedAt[key] = Date.now()
    return value
  })()

  queryInFlight[key] = queryPromise

  try {
    return await queryPromise
  } catch (error) {
    queryError[key] = translateApiError(error, fallback)
    throw error
  } finally {
    if (queryInFlight[key] === queryPromise) {
      delete queryInFlight[key]
    }
    queryLoading[key] = Boolean(queryInFlight[key])
  }
}

async function runOperation<T>(key: OperationKey, request: () => Promise<T>, fallback: string) {
  operationLoading[key] = true
  operationError[key] = ''

  try {
    return await request()
  } catch (error) {
    operationError[key] = translateApiError(error, fallback)
    throw error
  } finally {
    operationLoading[key] = false
  }
}

function mapPlayerPet(pet: PlayerProfile['pets'][number]): Pet {
  const contentPet = starterCapybaraByName[pet.name]

  return {
    id: pet.id,
    tokenId: pet.tokenId,
    name: pet.name,
    element: pet.element,
    stage: pet.stage,
    level: pet.level,
    tokenURI: pet.tokenUri,
    basePetId: pet.basePetId,
    skinId: pet.skinId,
    stats: { ...pet.stats },
    profile: contentPet ? { ...contentPet.profile } : undefined,
    leaderSkill: contentPet ? { ...contentPet.leaderSkill } : undefined,
    skills: contentPet?.skills.map((skill) => ({ ...skill })),
    exp: { ...pet.exp },
    owner: pet.contractAddress,
    birthTime: pet.birthTime,
  }
}

function listingStatus(status: MarketListing['status']): ListingStatus {
  if (status === 'active' || status === 'sold') {
    return status
  }

  return 'draft'
}

function marketListingToGoodie(listing: MarketListing): GoodieSft {
  const definition = materialDefinitionById.get(listing.materialId)

  return {
    id: listing.id,
    name: definition?.name ?? { zh: listing.materialId, en: listing.materialId },
    element: definition?.element ?? 1,
    grade: definition?.grade ?? 'D',
    amount: listing.amount,
    description: definition?.description ?? listing.materialId,
    imageUrl: getMaterialImage({
      id: listing.materialId,
      element: definition?.element,
      slug: definition?.slug,
    }),
    price: listing.price,
    status: listingStatus(listing.status),
  }
}

function materialInventoryItemToGoodie(materialId: string, amount: number): GoodieSft {
  const definition = materialDefinitionById.get(materialId)

  return {
    id: materialId,
    name: definition?.name ?? { zh: materialId, en: materialId },
    element: definition?.element ?? 1,
    grade: definition?.grade ?? 'D',
    amount,
    description: definition?.description ?? materialId,
    imageUrl: getMaterialImage({
      id: materialId,
      element: definition?.element,
      slug: definition?.slug,
    }),
    price: 0,
    status: 'active',
  }
}

function isOwnMarketListing(listing: MarketListing) {
  const sellerWallet = normalizeAddress(listing.sellerWallet)
  const currentWallet = normalizeAddress(walletAddress.value || playerProfile.value?.wallet)

  if (sellerWallet && currentWallet) {
    return sellerWallet === currentWallet
  }

  return Boolean(playerProfile.value?.id && listing.sellerId === playerProfile.value.id)
}

function normalizeAddress(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

function shouldUseProtectedApi() {
  const { walletAddress } = useWallet()
  return Boolean(getAuthToken() || walletAddress.value)
}

function requireWalletAddress() {
  const { walletAddress } = useWallet()

  if (!walletAddress.value) {
    throw new Error('AUTH_REQUIRED')
  }

  return walletAddress.value
}

async function signAuthMessage(wallet: string, message: string) {
  if (!window.ethereum) {
    throw new Error('WALLET_PROVIDER_MISSING')
  }

  const signature = await window.ethereum.request({
    method: 'personal_sign',
    params: [message, wallet],
  })

  if (typeof signature !== 'string') {
    throw new Error('WALLET_SIGNATURE_FAILED')
  }

  return signature
}

async function loadPlayerProfile(options: QueryOptions = {}) {
  if (!shouldUseProtectedApi()) {
    queryError.player = translateApiError(new Error('AUTH_REQUIRED'), 'Player profile load failed')
    throw new Error('AUTH_REQUIRED')
  }

  if (shouldSkipQuery('player', options, Boolean(playerProfile.value))) {
    return playerProfile.value
  }

  return runQuery(
    'player',
    () => getPlayer(requireWalletAddress()),
    (profile) => {
      playerProfile.value = profile
      activeExpedition.value = profile.activeExpedition
      replacePets(profile.pets.map(mapPlayerPet))
    },
    'Player profile load failed',
    options,
  )
}

async function loadResources(options: QueryOptions = {}) {
  if (!shouldUseProtectedApi()) {
    queryError.resources = translateApiError(new Error('AUTH_REQUIRED'), 'Resources load failed')
    throw new Error('AUTH_REQUIRED')
  }

  if (shouldSkipQuery('resources', options, Boolean(resources.value))) {
    return resources.value
  }

  return runQuery('resources', () => getResources(requireWalletAddress()), (nextResources) => {
    resources.value = nextResources
  }, 'Resources load failed', options)
}

async function loadMaterialBackpack(options: QueryOptions = {}) {
  if (!shouldUseProtectedApi()) {
    queryError.backpack = translateApiError(new Error('AUTH_REQUIRED'), 'Backpack load failed')
    throw new Error('AUTH_REQUIRED')
  }

  if (shouldSkipQuery('backpack', options, Boolean(materialBackpack.value))) {
    return materialBackpack.value
  }

  return runQuery('backpack', () => getMaterialBackpack(requireWalletAddress()), (nextBackpack) => {
    materialBackpack.value = nextBackpack
    resources.value = {
      sepoliaBalance: nextBackpack.sepoliaBalance,
      inventory: nextBackpack.inventory,
    }
  }, 'Backpack load failed', options)
}

async function loadMarketListings(options: QueryOptions = {}) {
  if (!shouldUseProtectedApi()) {
    queryError.marketListings = translateApiError(new Error('AUTH_REQUIRED'), 'Market listings load failed')
    throw new Error('AUTH_REQUIRED')
  }

  if (shouldSkipQuery('marketListings', options, marketListings.value.length > 0)) {
    return marketListings.value
  }

  return runQuery('marketListings', getMarketListings, (nextListings) => {
    marketListings.value = nextListings
  }, 'Market listings load failed', options)
}

async function loadTransactions(options: QueryOptions = {}) {
  if (!shouldUseProtectedApi()) {
    queryError.transactions = translateApiError(new Error('AUTH_REQUIRED'), 'Transactions load failed')
    throw new Error('AUTH_REQUIRED')
  }

  if (shouldSkipQuery('transactions', options, transactions.value.length > 0)) {
    return transactions.value
  }

  return runQuery('transactions', () => getTransactions(requireWalletAddress()), (nextTransactions) => {
    transactions.value = nextTransactions
  }, 'Transactions load failed', options)
}

async function loadExpeditionLogs(options: QueryOptions = {}) {
  if (!shouldUseProtectedApi()) {
    queryError.expeditionLogs = translateApiError(new Error('AUTH_REQUIRED'), 'Expedition logs load failed')
    throw new Error('AUTH_REQUIRED')
  }

  if (shouldSkipQuery('expeditionLogs', options, expeditionLogs.value.length > 0)) {
    return expeditionLogs.value
  }

  return runQuery('expeditionLogs', () => getExpeditionLogs(requireWalletAddress()), (nextLogs) => {
    expeditionLogs.value = nextLogs
  }, 'Expedition logs load failed', options)
}

async function loadAllApiData(options: QueryOptions = {}) {
  await Promise.allSettled([
    loadPlayerProfile(options),
    loadResources(options),
    loadMaterialBackpack(options),
    loadMarketListings(options),
    loadTransactions(options),
    loadExpeditionLogs(options),
  ])
}

async function startTeamExpedition(petIds: string[], expeditionType: ExpeditionType) {
  if (!shouldUseProtectedApi()) {
    operationError.startExpedition = translateApiError(new Error('AUTH_REQUIRED'), 'Expedition start failed')
    throw new Error('AUTH_REQUIRED')
  }

  const summary = await runOperation(
    'startExpedition',
    async () => {
      const wallet = requireWalletAddress()
      const challenge = await requestStartExpeditionNonce(wallet, petIds, expeditionType)
      const signature = await signAuthMessage(wallet, challenge.message)

      return startSignedExpedition({
        wallet,
        petIds,
        expeditionType,
        nonce: challenge.nonce,
        message: challenge.message,
        signature,
      })
    },
    'Expedition start failed',
  )

  activeExpedition.value = summary
  await Promise.allSettled([
    loadPlayerProfile({ force: true }),
    loadExpeditionLogs({ force: true }),
  ])
  return summary
}

async function claimActiveExpedition(expeditionId: string) {
  if (!shouldUseProtectedApi()) {
    operationError.claimReward = translateApiError(new Error('AUTH_REQUIRED'), 'Reward claim failed')
    throw new Error('AUTH_REQUIRED')
  }

  const summary = await runOperation(
    'claimReward',
    async () => {
      const wallet = requireWalletAddress()
      const challenge = await requestClaimRewardNonce(wallet, expeditionId)
      const signature = await signAuthMessage(wallet, challenge.message)

      return claimSignedReward({
        wallet,
        expeditionId,
        nonce: challenge.nonce,
        message: challenge.message,
        signature,
      })
    },
    'Reward claim failed',
  )

  activeExpedition.value = summary.status === 'claimed' ? null : summary
  await Promise.allSettled([
    loadResources({ force: true }),
    loadMaterialBackpack({ force: true }),
    loadTransactions({ force: true }),
    loadPlayerProfile({ force: true }),
    loadExpeditionLogs({ force: true }),
  ])
  return summary
}

async function requestListMarketMaterial(materialId: string, amount: number, price: number) {
  const listing = await runOperation(
    'listMarketMaterial',
    () => listMarketMaterial(requireWalletAddress(), materialId, amount, price),
    'Listing creation failed',
  )
  await Promise.allSettled([
    loadMarketListings({ force: true }),
    loadTransactions({ force: true }),
    loadResources({ force: true }),
    loadMaterialBackpack({ force: true }),
  ])
  return listing
}

async function requestCancelListing(listingId: string) {
  const listing = await runOperation('cancelListing', () => cancelMarketListing(requireWalletAddress(), listingId), 'Listing cancellation failed')
  await Promise.allSettled([
    loadMarketListings({ force: true }),
    loadTransactions({ force: true }),
    loadResources({ force: true }),
    loadMaterialBackpack({ force: true }),
  ])
  return listing
}

async function requestBuyListing(listingId: string) {
  const listing = await runOperation('buyListing', () => buyMarketListing(requireWalletAddress(), listingId), 'Listing purchase failed')
  await Promise.allSettled([
    loadMarketListings({ force: true }),
    loadTransactions({ force: true }),
    loadResources({ force: true }),
    loadMaterialBackpack({ force: true }),
  ])
  return listing
}

async function requestDiscardMaterial(materialId: string, amount: number) {
  await runOperation(
    'discardMaterial',
    () => discardMaterial(requireWalletAddress(), materialId, amount),
    'Material discard failed',
  )
  await Promise.allSettled([
    loadResources({ force: true }),
    loadMaterialBackpack({ force: true }),
    loadTransactions({ force: true }),
  ])
}

export function useGameApi() {
  return {
    activeExpedition,
    activeMarketGoodies,
    expeditionLogs,
    hasLoadedAnyApi,
    marketListings,
    materialBackpackGoodies,
    materialBackpack,
    operationError,
    operationLoading,
    ownedMarketGoodies,
    playerProfile,
    purchasableMarketGoodies,
    queryError,
    queryLoading,
    resources,
    transactions,
    claimActiveExpedition,
    loadAllApiData,
    loadExpeditionLogs,
    loadMarketListings,
    loadMaterialBackpack,
    loadPlayerProfile,
    loadResources,
    loadTransactions,
    requestBuyListing,
    requestCancelListing,
    requestDiscardMaterial,
    requestListMarketMaterial,
    startTeamExpedition,
  }
}
