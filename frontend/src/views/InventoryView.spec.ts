import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'
import type { MaterialBackpack, PlayerResources } from '@cryptopets/shared'
import InventoryView from './InventoryView.vue'
import { locale } from '@/i18n'

const mockBackpack = ref<MaterialBackpack | null>(null)
const mockResources = ref<PlayerResources | null>(null)
const mockQueryError = reactive({
  player: '',
  resources: '',
  backpack: '',
  marketListings: '',
  transactions: '',
  expeditionLogs: '',
})
const mockQueryLoading = reactive({
  player: false,
  resources: false,
  backpack: false,
  marketListings: false,
  transactions: false,
  expeditionLogs: false,
})
const mockOperationError = reactive({
  startExpedition: '',
  claimReward: '',
  listMarketMaterial: '',
  cancelListing: '',
  buyListing: '',
  discardMaterial: '',
})
const mockOperationLoading = reactive({
  startExpedition: false,
  claimReward: false,
  listMarketMaterial: false,
  cancelListing: false,
  buyListing: false,
  discardMaterial: false,
})

const loadMarketListings = vi.fn()
const loadMaterialBackpack = vi.fn()
const loadResources = vi.fn()
const requestDiscardMaterial = vi.fn()
const requestListMarketMaterial = vi.fn()

vi.mock('@/composables/useGameApi', () => ({
  useGameApi: () => ({
    materialBackpack: mockBackpack,
    operationError: mockOperationError,
    operationLoading: mockOperationLoading,
    queryError: mockQueryError,
    queryLoading: mockQueryLoading,
    resources: mockResources,
    loadMarketListings,
    loadMaterialBackpack,
    loadResources,
    requestDiscardMaterial,
    requestListMarketMaterial,
  }),
}))

function makeBackpack(overrides: Partial<MaterialBackpack> = {}): MaterialBackpack {
  return {
    sepoliaBalance: '0',
    inventory: [
      {
        materialId: 'MAT-2C',
        amount: 3,
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    source: 'local-db',
    syncedAt: '2026-01-01T00:00:00.000Z',
    chain: {
      enabled: false,
      chainId: 1,
      materialContractAddress: null,
    },
    ...overrides,
  }
}

function mountInventory() {
  return mount(InventoryView, {
    global: {
      stubs: {
        FontAwesomeIcon: true,
      },
    },
  })
}

beforeEach(() => {
  locale.value = 'en'
  mockBackpack.value = makeBackpack()
  mockResources.value = { sepoliaBalance: '0', inventory: mockBackpack.value.inventory }
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
  loadResources.mockReset().mockResolvedValue(undefined)
  requestDiscardMaterial.mockReset().mockResolvedValue(undefined)
  requestListMarketMaterial.mockReset().mockResolvedValue(undefined)
})

describe('InventoryView', () => {
  it('renders backend material inventory and item details', () => {
    const wrapper = mountInventory()

    expect(wrapper.text()).toContain('Yuzu Bite')
    expect(wrapper.text()).toContain('x3')
    expect(wrapper.text()).toContain('3 / 99')
  })

  it('shows empty state when backend inventory is empty', () => {
    mockBackpack.value = makeBackpack({ inventory: [] })
    mockResources.value = { sepoliaBalance: '0', inventory: [] }

    const wrapper = mountInventory()

    expect(wrapper.text()).toContain('Empty Slot')
    expect(wrapper.text()).toContain('Materials will appear here')
  })

  it('shows a retryable backpack error state', async () => {
    mockQueryError.backpack = 'Please sign in with your wallet before continuing.'
    const wrapper = mountInventory()

    expect(wrapper.text()).toContain('Backpack load failed')
    expect(wrapper.text()).toContain('Please sign in with your wallet')

    await wrapper.get('.inventory-state button').trigger('click')

    expect(loadMaterialBackpack).toHaveBeenCalledWith({ force: true })
  })

  it('shows loading state while the backpack query is running', () => {
    mockQueryLoading.backpack = true

    const wrapper = mountInventory()

    expect(wrapper.text()).toContain('Loading materials')
  })

  it('shows local-db source when chain material sync is disabled', () => {
    mockBackpack.value = makeBackpack({
      chain: {
        enabled: false,
        chainId: 1,
        materialContractAddress: null,
      },
    })

    const wrapper = mountInventory()

    expect(wrapper.text()).toContain('local-db')
  })

  it('uses, discards, and lists selected materials from the backpack', async () => {
    const wrapper = mountInventory()
    const quantityInput = wrapper.get('input[type="number"]')
    const actionButtons = wrapper.findAll('footer button')

    expect(quantityInput.attributes('disabled')).toBeUndefined()
    expect(actionButtons).toHaveLength(3)

    await actionButtons[1]!.trigger('click')
    expect(wrapper.text()).toContain('使用功能暫時尚未開放')

    await actionButtons[0]!.trigger('click')
    expect(requestDiscardMaterial).toHaveBeenCalledWith('MAT-2C', 1)

    await actionButtons[2]!.trigger('click')
    expect(requestListMarketMaterial).toHaveBeenCalledWith('MAT-2C', 1, 0.00000000001)
    expect(loadMarketListings).toHaveBeenCalledWith({ force: true })
  })
})
