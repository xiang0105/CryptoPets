import { computed, reactive, ref } from 'vue'
import type {
  ExpeditionSummary,
  FriendSummary,
  MaterialBackpack,
  MarketListing,
  PlayerProfile,
  PlayerResources,
  PlayerTransaction,
} from '@cryptopets/shared'
import { materialDefinitions, starterCapybaraByName } from '@cryptopets/game-content'
import {
  addFriend,
  buyMarketListing,
  cancelMarketListing,
  claimReward,
  getFriends,
  getMarketListings,
  getMaterialBackpack,
  getPlayer,
  getResources,
  getTransactions,
  listMarketMaterial,
  startExpedition,
} from '@/api/game'
import type { GoodieSft, ListingStatus } from '@/data/goodies'
import type { Pet } from '@/data/pets'
import { replacePets } from '@/data/pets'
import { getAuthToken } from '@/api/client'

type QueryKey = 'player' | 'resources' | 'backpack' | 'friends' | 'marketListings' | 'transactions'
type OperationKey = 'startExpedition' | 'claimReward' | 'addFriend' | 'listMarketMaterial' | 'cancelListing' | 'buyListing'

const materialDefinitionById = new Map(materialDefinitions.map((material) => [material.id, material]))
const FRONTEND_ONLY_AUTH = import.meta.env.VITE_FRONTEND_ONLY_AUTH !== 'false'

const playerProfile = ref<PlayerProfile | null>(null)
const resources = ref<PlayerResources | null>(null)
const materialBackpack = ref<MaterialBackpack | null>(null)
const friends = ref<FriendSummary[]>([])
const marketListings = ref<MarketListing[]>([])
const transactions = ref<PlayerTransaction[]>([])
const activeExpedition = ref<ExpeditionSummary | null>(null)

const queryLoading = reactive<Record<QueryKey, boolean>>({
  player: false,
  resources: false,
  backpack: false,
  friends: false,
  marketListings: false,
  transactions: false,
})

const queryError = reactive<Record<QueryKey, string>>({
  player: '',
  resources: '',
  backpack: '',
  friends: '',
  marketListings: '',
  transactions: '',
})

const operationLoading = reactive<Record<OperationKey, boolean>>({
  startExpedition: false,
  claimReward: false,
  addFriend: false,
  listMarketMaterial: false,
  cancelListing: false,
  buyListing: false,
})

const operationError = reactive<Record<OperationKey, string>>({
  startExpedition: '',
  claimReward: '',
  addFriend: '',
  listMarketMaterial: '',
  cancelListing: '',
  buyListing: '',
})

const activeMarketGoodies = computed(() =>
  marketListings.value
    .filter((listing) => listing.status === 'active')
    .map((listing) => marketListingToGoodie(listing)),
)
const purchasableMarketGoodies = computed(() =>
  marketListings.value
    .filter((listing) => listing.status === 'active' && listing.sellerId !== playerProfile.value?.id)
    .map((listing) => marketListingToGoodie(listing)),
)
const ownedMarketGoodies = computed(() =>
  marketListings.value
    .filter((listing) => listing.status === 'active' && listing.sellerId === playerProfile.value?.id)
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
      friends.value.length ||
      marketListings.value.length ||
      transactions.value.length,
  ),
)

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

async function runQuery<T>(key: QueryKey, request: () => Promise<T>, apply: (value: T) => void, fallback: string) {
  queryLoading[key] = true
  queryError[key] = ''

  try {
    const value = await request()
    apply(value)
    return value
  } catch (error) {
    queryError[key] = errorMessage(error, fallback)
    throw error
  } finally {
    queryLoading[key] = false
  }
}

async function runOperation<T>(key: OperationKey, request: () => Promise<T>, fallback: string) {
  operationLoading[key] = true
  operationError[key] = ''

  try {
    return await request()
  } catch (error) {
    operationError[key] = errorMessage(error, fallback)
    throw error
  } finally {
    operationLoading[key] = false
  }
}

function mapPlayerPet(pet: PlayerProfile['pets'][number]): Pet {
  const contentPet = starterCapybaraByName[pet.name]

  return {
    id: pet.id,
    name: pet.name,
    element: pet.element,
    stage: pet.stage,
    level: Math.max(0, Math.floor(pet.exp.current / Math.max(1, pet.exp.next))),
    tokenURI: pet.tokenUri,
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
    price: definition?.basePrice ?? 1,
    status: 'active',
  }
}

function shouldUseProtectedApi() {
  return Boolean(getAuthToken())
}

async function loadPlayerProfile() {
  if (!shouldUseProtectedApi()) {
    queryError.player = ''
    activeExpedition.value = null
    return playerProfile.value
  }

  return runQuery(
    'player',
    getPlayer,
    (profile) => {
      playerProfile.value = profile
      activeExpedition.value = profile.activeExpedition
      replacePets(profile.pets.map(mapPlayerPet))
    },
    'Player profile load failed',
  )
}

async function loadResources() {
  if (!shouldUseProtectedApi()) {
    queryError.resources = ''
    resources.value = resources.value ?? { coins: 0, inventory: [] }
    return resources.value
  }

  return runQuery('resources', getResources, (nextResources) => {
    resources.value = nextResources
  }, 'Resources load failed')
}

async function loadMaterialBackpack() {
  if (!shouldUseProtectedApi()) {
    queryError.backpack = ''
    materialBackpack.value = materialBackpack.value ?? {
      coins: resources.value?.coins ?? 0,
      inventory: resources.value?.inventory ?? [],
      source: 'local-db',
      syncedAt: new Date().toISOString(),
      chain: {
        enabled: false,
        chainId: Number(import.meta.env.VITE_CHAIN_ID ?? 1),
        materialContractAddress: null,
      },
    }
    return materialBackpack.value
  }

  return runQuery('backpack', getMaterialBackpack, (nextBackpack) => {
    materialBackpack.value = nextBackpack
    resources.value = {
      coins: nextBackpack.coins,
      inventory: nextBackpack.inventory,
    }
  }, 'Backpack load failed')
}

async function loadFriends() {
  if (!shouldUseProtectedApi()) {
    queryError.friends = ''
    friends.value = []
    return friends.value
  }

  return runQuery('friends', getFriends, (nextFriends) => {
    friends.value = nextFriends
  }, 'Friends load failed')
}

async function loadMarketListings() {
  if (!shouldUseProtectedApi()) {
    queryError.marketListings = ''
    marketListings.value = []
    return marketListings.value
  }

  return runQuery('marketListings', getMarketListings, (nextListings) => {
    marketListings.value = nextListings
  }, 'Market listings load failed')
}

async function loadTransactions() {
  if (!shouldUseProtectedApi()) {
    queryError.transactions = ''
    transactions.value = []
    return transactions.value
  }

  return runQuery('transactions', getTransactions, (nextTransactions) => {
    transactions.value = nextTransactions
  }, 'Transactions load failed')
}

async function loadAllApiData() {
  await Promise.allSettled([
    loadPlayerProfile(),
    loadResources(),
    loadMaterialBackpack(),
    loadFriends(),
    loadMarketListings(),
    loadTransactions(),
  ])
}

async function startTeamExpedition(petIds: string[], expeditionType: string) {
  if (!shouldUseProtectedApi() && FRONTEND_ONLY_AUTH) {
    const now = new Date()
    const summary: ExpeditionSummary = {
      id: `local-${now.getTime()}`,
      petIds,
      expeditionType: expeditionType as ExpeditionSummary['expeditionType'],
      startedAt: now.toISOString(),
      endsAt: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      status: 'started',
      reward: null,
    }

    operationError.startExpedition = ''
    activeExpedition.value = summary
    return summary
  }

  if (!shouldUseProtectedApi()) {
    operationError.startExpedition = 'AUTH_REQUIRED'
    throw new Error('AUTH_REQUIRED')
  }

  const summary = await runOperation(
    'startExpedition',
    () => startExpedition(petIds, expeditionType),
    'Expedition start failed',
  )

  activeExpedition.value = summary
  return summary
}

async function claimActiveExpedition(expeditionId: string) {
  if (!shouldUseProtectedApi() && FRONTEND_ONLY_AUTH) {
    const summary: ExpeditionSummary = {
      id: expeditionId,
      petIds: activeExpedition.value?.petIds ?? [],
      expeditionType: activeExpedition.value?.expeditionType ?? 'orange',
      startedAt: activeExpedition.value?.startedAt ?? new Date().toISOString(),
      endsAt: activeExpedition.value?.endsAt ?? new Date().toISOString(),
      status: 'claimed',
      reward: {
        exp: 120,
        coins: 60,
        materials: [],
      },
    }

    operationError.claimReward = ''
    activeExpedition.value = null
    return summary
  }

  if (!shouldUseProtectedApi()) {
    operationError.claimReward = 'AUTH_REQUIRED'
    throw new Error('AUTH_REQUIRED')
  }

  const summary = await runOperation(
    'claimReward',
    () => claimReward(expeditionId),
    'Reward claim failed',
  )

  activeExpedition.value = summary.status === 'claimed' ? null : summary
  await Promise.allSettled([loadResources(), loadMaterialBackpack(), loadTransactions(), loadPlayerProfile()])
  return summary
}

async function requestAddFriend(wallet: string) {
  const result = await runOperation('addFriend', () => addFriend(wallet), 'Friend request failed')
  await loadFriends().catch(() => undefined)
  return result
}

async function requestListMarketMaterial(materialId: string, amount: number, price: number) {
  const listing = await runOperation(
    'listMarketMaterial',
    () => listMarketMaterial(materialId, amount, price),
    'Listing creation failed',
  )
  await Promise.allSettled([loadMarketListings(), loadTransactions(), loadResources(), loadMaterialBackpack()])
  return listing
}

async function requestCancelListing(listingId: string) {
  const listing = await runOperation('cancelListing', () => cancelMarketListing(listingId), 'Listing cancellation failed')
  await Promise.allSettled([loadMarketListings(), loadTransactions(), loadResources(), loadMaterialBackpack()])
  return listing
}

async function requestBuyListing(listingId: string) {
  const listing = await runOperation('buyListing', () => buyMarketListing(listingId), 'Listing purchase failed')
  await Promise.allSettled([loadMarketListings(), loadTransactions(), loadResources(), loadMaterialBackpack()])
  return listing
}

export function useGameApi() {
  return {
    activeExpedition,
    activeMarketGoodies,
    friends,
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
    loadFriends,
    loadMarketListings,
    loadMaterialBackpack,
    loadPlayerProfile,
    loadResources,
    loadTransactions,
    requestAddFriend,
    requestBuyListing,
    requestCancelListing,
    requestListMarketMaterial,
    startTeamExpedition,
  }
}
