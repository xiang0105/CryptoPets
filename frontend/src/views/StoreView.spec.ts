import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, reactive, ref } from 'vue'
import type { PlayerProfile, PlayerTransaction } from '@cryptopets/shared'
import type { GoodieSft } from '@/data/goodies'
import { locale } from '@/i18n'
import StoreView from './StoreView.vue'

const mockPlayerProfile = ref<PlayerProfile | null>(null)
const mockPurchasableMarketGoodies = ref<GoodieSft[]>([])
const mockOwnedMarketGoodies = ref<GoodieSft[]>([])
const mockMaterialBackpackGoodies = ref<GoodieSft[]>([])
const mockTransactions = ref<PlayerTransaction[]>([])
const mockQueryError = reactive({
  player: '',
  resources: '',
  backpack: '',
  marketListings: '',
  transactions: '',
})
const mockQueryLoading = reactive({
  player: false,
  resources: false,
  backpack: false,
  marketListings: false,
  transactions: false,
})
const mockOperationError = reactive({
  startExpedition: '',
  claimReward: '',
  listMarketMaterial: '',
  cancelListing: '',
  buyListing: '',
})
const mockOperationLoading = reactive({
  startExpedition: false,
  claimReward: false,
  listMarketMaterial: false,
  cancelListing: false,
  buyListing: false,
})

const loadMarketListings = vi.fn()
const loadMaterialBackpack = vi.fn()
const loadPlayerProfile = vi.fn()
const loadTransactions = vi.fn()
const requestBuyListing = vi.fn()
const requestCancelListing = vi.fn()
const requestListMarketMaterial = vi.fn()

vi.mock('@/composables/useGameApi', () => ({
  useGameApi: () => ({
    materialBackpackGoodies: computed(() => mockMaterialBackpackGoodies.value),
    ownedMarketGoodies: computed(() => mockOwnedMarketGoodies.value),
    operationError: mockOperationError,
    operationLoading: mockOperationLoading,
    playerProfile: mockPlayerProfile,
    purchasableMarketGoodies: computed(() => mockPurchasableMarketGoodies.value),
    queryError: mockQueryError,
    queryLoading: mockQueryLoading,
    transactions: computed(() => mockTransactions.value),
    loadMarketListings,
    loadMaterialBackpack,
    loadPlayerProfile,
    loadTransactions,
    requestBuyListing,
    requestCancelListing,
    requestListMarketMaterial,
  }),
}))

function goodie(overrides: Partial<GoodieSft> = {}): GoodieSft {
  return {
    id: 'listing-1',
    name: { zh: '柚子碎片', en: 'Yuzu Bite' },
    element: 2,
    grade: 'C',
    amount: 2,
    description: 'A market material.',
    price: 70,
    status: 'active',
    ...overrides,
  }
}

function mountStore() {
  return mount(StoreView, {
    global: {
      stubs: {
        FontAwesomeIcon: true,
      },
    },
  })
}

beforeEach(() => {
  locale.value = 'en'
  mockPlayerProfile.value = {
    id: 'player-1',
    wallet: '0x1111111111111111111111111111111111111111',
    username: null,
    chain: {
      enabled: false,
      chainId: 1,
      nftContractAddress: null,
    },
    pets: [],
    activeExpedition: null,
  }
  mockPurchasableMarketGoodies.value = [goodie()]
  mockOwnedMarketGoodies.value = [goodie({ id: 'owned-listing', price: 45 })]
  mockMaterialBackpackGoodies.value = [goodie({ id: 'MAT-2C', amount: 5, price: 35 })]
  mockTransactions.value = [
    {
      id: 'tx-1',
      action: 'buy',
      materialId: 'MAT-2C',
      materialAmount: 1,
      sepoliaAmount: '0',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ]
  Object.keys(mockQueryError).forEach((key) => {
    mockQueryError[key as keyof typeof mockQueryError] = ''
  })
  Object.keys(mockQueryLoading).forEach((key) => {
    mockQueryLoading[key as keyof typeof mockQueryLoading] = false
  })
  Object.keys(mockOperationError).forEach((key) => {
    mockOperationError[key as keyof typeof mockOperationError] = ''
  })
  Object.keys(mockOperationLoading).forEach((key) => {
    mockOperationLoading[key as keyof typeof mockOperationLoading] = false
  })
  loadMarketListings.mockReset().mockResolvedValue(undefined)
  loadMaterialBackpack.mockReset().mockResolvedValue(undefined)
  loadPlayerProfile.mockReset().mockResolvedValue(undefined)
  loadTransactions.mockReset().mockResolvedValue(undefined)
  requestBuyListing.mockReset().mockResolvedValue(undefined)
  requestCancelListing.mockReset().mockResolvedValue(undefined)
  requestListMarketMaterial.mockReset().mockResolvedValue(undefined)
})

describe('StoreView', () => {
  it('renders purchasable listings, owned listings, and backend transactions', () => {
    const wrapper = mountStore()

    expect(wrapper.text()).toContain('Yuzu Bite')
    expect(wrapper.text()).toContain('70')
    expect(wrapper.text()).toContain('45')
    expect(wrapper.text()).toContain('buy: Yuzu Bite')
  })

  it('buys a listing through the backend market API', async () => {
    const wrapper = mountStore()
    const buyButton = wrapper.findAll('.goodie-card button').find((button) => button.text().includes('Buy'))

    expect(buyButton).toBeTruthy()

    await buyButton!.trigger('click')
    await flushPromises()

    expect(requestBuyListing).toHaveBeenCalledWith('listing-1')
    expect(wrapper.text()).toContain('Bought Yuzu Bite')
  })

  it('lists a backpack material through the backend market API', async () => {
    const wrapper = mountStore()

    await wrapper.get('.sell-banner').trigger('click')
    await flushPromises()

    expect(loadMaterialBackpack).toHaveBeenCalledWith({ force: true })
    expect(wrapper.text()).toContain('素材背包')

    const inputs = wrapper.findAll('.inventory-detail input')
    await inputs[0]!.setValue('3')
    await inputs[1]!.setValue('88')
    await wrapper.get('.inventory-detail button').trigger('click')
    await flushPromises()

    expect(requestListMarketMaterial).toHaveBeenCalledWith('MAT-2C', 3, 88)
    expect(wrapper.text()).toContain('Listed Yuzu Bite')
  })

  it('cancels an owned listing through the backend market API', async () => {
    const wrapper = mountStore()
    const cancelButton = wrapper.findAll('.mini-listing button').find((button) => button.text().includes('取消上架'))

    expect(cancelButton).toBeTruthy()

    await cancelButton!.trigger('click')
    await flushPromises()
    await wrapper.get('.remove-modal-actions .danger').trigger('click')
    await flushPromises()

    expect(requestCancelListing).toHaveBeenCalledWith('owned-listing')
    expect(wrapper.text()).toContain('Remove Yuzu Bite')
  })

  it('shows empty market state when no listings are available', () => {
    mockPurchasableMarketGoodies.value = []
    mockOwnedMarketGoodies.value = []
    mockTransactions.value = []

    const wrapper = mountStore()

    expect(wrapper.text()).toContain('No active listings yet')
    expect(wrapper.text()).toContain('There are no market listings available to buy.')
    expect(wrapper.text()).toContain('No transactions yet')
  })

  it('shows a retryable market error state', async () => {
    mockQueryError.marketListings = 'This listing no longer exists. Refresh the marketplace.'

    const wrapper = mountStore()

    expect(wrapper.text()).toContain('Market load failed')
    expect(wrapper.text()).toContain('This listing no longer exists')

    await wrapper.get('.market-state button').trigger('click')

    expect(loadPlayerProfile).toHaveBeenCalledWith({ force: true })
    expect(loadMarketListings).toHaveBeenCalledWith({ force: true })
    expect(loadTransactions).toHaveBeenCalledWith({ force: true })
  })
})
