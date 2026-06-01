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
  friends: '',
  marketListings: '',
  transactions: '',
})
const mockQueryLoading = reactive({
  player: false,
  resources: false,
  backpack: false,
  friends: false,
  marketListings: false,
  transactions: false,
})

const loadMaterialBackpack = vi.fn()
const loadResources = vi.fn()

vi.mock('@/composables/useGameApi', () => ({
  useGameApi: () => ({
    materialBackpack: mockBackpack,
    queryError: mockQueryError,
    queryLoading: mockQueryLoading,
    resources: mockResources,
    loadMaterialBackpack,
    loadResources,
  }),
}))

function makeBackpack(overrides: Partial<MaterialBackpack> = {}): MaterialBackpack {
  return {
    coins: 120,
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
  mockResources.value = { coins: 120, inventory: mockBackpack.value.inventory }
  Object.keys(mockQueryError).forEach((key) => {
    mockQueryError[key as keyof typeof mockQueryError] = ''
  })
  Object.keys(mockQueryLoading).forEach((key) => {
    mockQueryLoading[key as keyof typeof mockQueryLoading] = false
  })
  loadMaterialBackpack.mockReset().mockResolvedValue(undefined)
  loadResources.mockReset().mockResolvedValue(undefined)
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
    mockResources.value = { coins: 120, inventory: [] }

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

  it('keeps material actions reserved until backend APIs exist', async () => {
    const wrapper = mountInventory()
    const quantityInput = wrapper.get('input[type="number"]')

    await quantityInput.setValue('2')
    await wrapper.findAll('footer button')[1]!.trigger('click')

    expect(wrapper.text()).toContain('x2')
  })
})
