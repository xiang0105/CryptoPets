import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'
import type { ExpeditionLogEntry, ExpeditionSummary } from '@cryptopets/shared'
import HomeView from './HomeView.vue'
import { locale } from '@/i18n'
import { replacePets, type Pet } from '@/data/pets'
import { setExpeditionTeam } from '@/state/expeditionTeam'

const mockApiActiveExpedition = ref<ExpeditionSummary | null>(null)
const mockExpeditionLogs = ref<ExpeditionLogEntry[]>([])
const mockOperationError = reactive({
  startExpedition: '',
  claimReward: '',
  addFriend: '',
  listMarketMaterial: '',
  cancelListing: '',
  buyListing: '',
})
const mockOperationLoading = reactive({
  startExpedition: false,
  claimReward: false,
  addFriend: false,
  listMarketMaterial: false,
  cancelListing: false,
  buyListing: false,
})
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

const loadPlayerProfile = vi.fn()
const loadExpeditionLogs = vi.fn()
const startTeamExpedition = vi.fn()
const claimActiveExpedition = vi.fn()

vi.mock('@/composables/useGameApi', () => ({
  useGameApi: () => ({
    activeExpedition: mockApiActiveExpedition,
    expeditionLogs: mockExpeditionLogs,
    operationError: mockOperationError,
    operationLoading: mockOperationLoading,
    queryError: mockQueryError,
    queryLoading: mockQueryLoading,
    loadExpeditionLogs,
    loadPlayerProfile,
    startTeamExpedition,
    claimActiveExpedition,
  }),
}))

const testPets: Pet[] = [
  {
    id: 'pet-1',
    tokenId: '7',
    name: 'Capy-san',
    element: 'ember',
    stage: 1,
    level: 1,
    tokenURI: '',
    basePetId: 'TEST-PET-001',
    skinId: 0,
    stats: { iv: 80, hp: 100, maxHp: 100, atk: 75, def: 60 },
    exp: { current: 0, next: 100 },
    owner: '0x0000000000000000000000000000000000000000',
    birthTime: '2026-01-01T00:00:00.000Z',
  },
]

function makeExpeditionSummary(overrides: Partial<ExpeditionSummary> = {}): ExpeditionSummary {
  const now = Date.now()

  return {
    id: 'expedition-1',
    petIds: ['pet-1'],
    expeditionType: 'orange',
    startedAt: new Date(now - 5_000).toISOString(),
    endsAt: new Date(now + 55_000).toISOString(),
    status: 'started',
    reward: null,
    ...overrides,
  }
}

function mountHome() {
  return mount(HomeView, {
    global: {
      stubs: {
        FontAwesomeIcon: true,
      },
    },
  })
}

beforeEach(() => {
  vi.useRealTimers()
  locale.value = 'en'
  replacePets(testPets)
  setExpeditionTeam(['pet-1'])
  mockApiActiveExpedition.value = null
  mockExpeditionLogs.value = []
  Object.keys(mockOperationError).forEach((key) => {
    mockOperationError[key as keyof typeof mockOperationError] = ''
  })
  Object.keys(mockQueryError).forEach((key) => {
    mockQueryError[key as keyof typeof mockQueryError] = ''
  })
  Object.keys(mockOperationLoading).forEach((key) => {
    mockOperationLoading[key as keyof typeof mockOperationLoading] = false
  })
  Object.keys(mockQueryLoading).forEach((key) => {
    mockQueryLoading[key as keyof typeof mockQueryLoading] = false
  })
  loadPlayerProfile.mockReset().mockResolvedValue(undefined)
  loadExpeditionLogs.mockReset().mockResolvedValue(undefined)
  startTeamExpedition.mockReset().mockResolvedValue(makeExpeditionSummary())
  claimActiveExpedition.mockReset().mockResolvedValue(
    makeExpeditionSummary({
      status: 'claimed',
      endsAt: new Date(Date.now() - 1_000).toISOString(),
      reward: {
        sepoliaAmount: '0.00000000001',
        exp: 40,
        materials: [{ id: 'MAT-2C', count: 1 }],
      },
    }),
  )
})

describe('HomeView expedition smoke', () => {
  it('starts an expedition with the selected team and forest', async () => {
    const wrapper = mountHome()
    const orangeStart = wrapper.findAll('button.forest-choice').find((button) => button.text().includes('Orange'))

    expect(orangeStart).toBeTruthy()
    await orangeStart!.trigger('click')
    await flushPromises()

    expect(startTeamExpedition).toHaveBeenCalledWith(['pet-1'], 'orange')
    expect(loadExpeditionLogs).toHaveBeenCalledWith({ force: true })
    expect(wrapper.text()).toContain('Orange Forest')
  })

  it('renders backend-time progress from the active expedition', async () => {
    mockApiActiveExpedition.value = makeExpeditionSummary({
      startedAt: new Date(Date.now() - 30_000).toISOString(),
      endsAt: new Date(Date.now() + 30_000).toISOString(),
    })

    const wrapper = mountHome()
    await flushPromises()

    expect(wrapper.text()).toContain('Orange Forest')
    expect(wrapper.text()).toContain('50%')
  })

  it('claims a finished expedition before clearing it', async () => {
    startTeamExpedition.mockResolvedValue(
      makeExpeditionSummary({
        startedAt: new Date(Date.now() - 60_000).toISOString(),
        endsAt: new Date(Date.now() - 1_000).toISOString(),
      }),
    )
    const wrapper = mountHome()
    const orangeStart = wrapper.findAll('button.forest-choice').find((button) => button.text().includes('Orange'))

    await orangeStart!.trigger('click')
    await flushPromises()

    claimActiveExpedition.mockImplementation(async () => {
      mockExpeditionLogs.value = [
        {
          id: 'log-1',
          expeditionId: 'expedition-1',
          at: new Date().toISOString(),
          message: {
            zh: '後端已確認遠征獎勵：0.00000000001 Sepolia、40 EXP、柚子碎片 x1。',
            en: 'Backend reward confirmed: 0.00000000001 Sepolia, 40 EXP, Yuzu Bite x1.',
          },
          variant: 'notice',
        },
      ]
      return makeExpeditionSummary({
        status: 'claimed',
        endsAt: new Date(Date.now() - 1_000).toISOString(),
        reward: {
          sepoliaAmount: '0.00000000001',
          exp: 40,
          materials: [{ id: 'MAT-2C', count: 1 }],
        },
      })
    })

    await wrapper.get('button.claim-reward-button').trigger('click')
    await flushPromises()

    expect(claimActiveExpedition).toHaveBeenCalledWith('expedition-1')
    expect(wrapper.text()).toContain('Backend reward confirmed')
  })

  it('renders expedition logs loaded from backend', () => {
    mockExpeditionLogs.value = [
      {
        id: 'log-1',
        expeditionId: 'expedition-1',
        at: '2026-06-03T08:00:00.000Z',
        message: {
          zh: '水豚隊從後端讀取遠征紀錄。',
          en: 'The party loaded expedition logs from the backend.',
        },
        variant: null,
      },
    ]

    const wrapper = mountHome()

    expect(wrapper.text()).toContain('The party loaded expedition logs from the backend.')
  })

  it('shows expedition errors with retry affordance', async () => {
    mockOperationError.startExpedition =
      'One or more selected pets are not available in your wallet session. Refresh your pets and try again.'
    const wrapper = mountHome()

    expect(wrapper.text()).toContain('One or more selected pets are not available')
    expect(wrapper.text()).toContain('Retry')
  })
})
