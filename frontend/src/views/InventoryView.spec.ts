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
})
const mockQueryLoading = reactive({
  player: false,
  resources: false,
  backpack: false,
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

  it('keeps material actions disabled until backend APIs exist', () => {
    const wrapper = mountInventory()
    const quantityInput = wrapper.get('input[type="number"]')
    const actionButtons = wrapper.findAll('footer button')

    expect(quantityInput.attributes('disabled')).toBeDefined()
    expect(actionButtons).toHaveLength(3)
    actionButtons.forEach((button) => {
      expect(button.attributes('disabled')).toBeDefined()
    })
    expect(wrapper.text()).toContain('素材操作需等待後端 API 開放')
  })
})
