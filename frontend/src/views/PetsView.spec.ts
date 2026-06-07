import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'
import type { PlayerProfile } from '@cryptopets/shared'
import PetsView from './PetsView.vue'
import { replacePets, type Pet } from '@/data/pets'
import { expeditionTeamIds, setExpeditionTeam } from '@/state/expeditionTeam'
import { locale } from '@/i18n'

const mockPlayerProfile = ref<PlayerProfile | null>(null)
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
const mockOperationError = reactive({
  startExpedition: '',
  claimReward: '',
  addFriend: '',
  listMarketMaterial: '',
  cancelListing: '',
  buyListing: '',
})

const loadPlayerProfile = vi.fn()
const loadFriends = vi.fn()

vi.mock('@/composables/useGameApi', () => ({
  useGameApi: () => ({
    operationError: mockOperationError,
    playerProfile: mockPlayerProfile,
    queryError: mockQueryError,
    queryLoading: mockQueryLoading,
    loadFriends,
    loadPlayerProfile,
  }),
}))

const testPets: Pet[] = [
  {
    id: 'pet-1',
    name: 'Capy-san',
    element: 'ember',
    stage: 1,
    level: 1,
    tokenURI: '',
    stats: { iv: 80, hp: 100, maxHp: 100, atk: 75, def: 60 },
    profile: { zh: 'Capy-san profile', en: 'Capy-san profile' },
    leaderSkill: {
      id: 'leader-citrus',
      name: { zh: 'Citrus Lead', en: 'Citrus Lead' },
      description: { zh: 'Lead the party.', en: 'Lead the party.' },
    },
    skills: [
      {
        id: 'nap-attack',
        name: { zh: 'Nap Attack', en: 'Nap Attack' },
        description: { zh: 'Sleepy strike.', en: 'Sleepy strike.' },
      },
    ],
    exp: { current: 0, next: 100 },
    owner: '0x0000000000000000000000000000000000000000',
    birthTime: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'pet-2',
    name: 'Bobo',
    element: 'frost',
    stage: 2,
    level: 4,
    tokenURI: '',
    stats: { iv: 72, hp: 110, maxHp: 120, atk: 55, def: 86 },
    exp: { current: 40, next: 100 },
    owner: '0x0000000000000000000000000000000000000000',
    birthTime: '2026-01-02T00:00:00.000Z',
  },
]

function setPlayerProfile(chainEnabled = true) {
  mockPlayerProfile.value = {
    id: 'player-1',
    wallet: '0x1111111111111111111111111111111111111111',
    username: null,
    chain: {
      enabled: chainEnabled,
      chainId: 1,
      nftContractAddress: '0x0000000000000000000000000000000000000000',
    },
    pets: [],
    activeExpedition: null,
  }
}

function mountPets() {
  return mount(PetsView)
}

beforeEach(() => {
  locale.value = 'en'
  replacePets(testPets)
  setExpeditionTeam([])
  mockPlayerProfile.value = null
  Object.keys(mockQueryError).forEach((key) => {
    mockQueryError[key as keyof typeof mockQueryError] = ''
  })
  Object.keys(mockQueryLoading).forEach((key) => {
    mockQueryLoading[key as keyof typeof mockQueryLoading] = false
  })
  Object.keys(mockOperationError).forEach((key) => {
    mockOperationError[key as keyof typeof mockOperationError] = ''
  })
  loadPlayerProfile.mockReset().mockResolvedValue(undefined)
  loadFriends.mockReset().mockResolvedValue(undefined)
})

describe('PetsView', () => {
  it('shows loading state while backend pets are loading', () => {
    mockQueryLoading.player = true

    const wrapper = mountPets()

    expect(wrapper.text()).toContain('Loading pets')
  })

  it('shows a retryable backend error state', async () => {
    mockQueryError.player = 'Please sign in with your wallet before continuing.'
    const wrapper = mountPets()

    expect(wrapper.text()).toContain('Pet load failed')
    expect(wrapper.text()).toContain('Please sign in with your wallet')

    await wrapper.get('.pet-api-state button').trigger('click')

    expect(loadPlayerProfile).toHaveBeenCalledWith({ force: true })
  })

  it('shows empty state when no backend pets are available', () => {
    replacePets([])

    const wrapper = mountPets()

    expect(wrapper.text()).toContain('No backend pets are available yet.')
    expect(wrapper.text()).toContain('No pet selected')
  })

  it('shows chain disabled notice from player profile', () => {
    setPlayerProfile(false)

    const wrapper = mountPets()

    expect(wrapper.text()).toContain('on-chain pet ownership is not enabled yet')
  })

  it('assigns a pet to the selected expedition team slot', async () => {
    const wrapper = mountPets()
    await flushPromises()

    const emptyTeamSlot = wrapper.findAll('button.team-slot').find((button) => button.text().includes('+'))
    const boboTile = wrapper.findAll('button.pet-tile').find((button) => button.text().includes('Bobo'))

    expect(emptyTeamSlot).toBeTruthy()
    expect(boboTile).toBeTruthy()

    await emptyTeamSlot!.trigger('click')
    await boboTile!.trigger('click')

    expect(expeditionTeamIds.value).toEqual(['pet-2'])
    expect(wrapper.text()).toContain('1 / 4')
  })

  it('keeps local pet data unchanged when upgrade actions are unavailable', async () => {
    const readyPet = {
      ...testPets[0]!,
      level: 14,
      exp: { current: 100, next: 100 },
    }
    replacePets([readyPet])
    const originalStage = readyPet.stage
    const originalExp = readyPet.exp.current
    const wrapper = mountPets()
    await flushPromises()

    await wrapper.find('button.breakthrough-button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Advancement is waiting for a backend API')
    expect(readyPet.stage).toBe(originalStage)
    expect(readyPet.exp.current).toBe(originalExp)
  })
})
