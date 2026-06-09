import { computed, ref } from 'vue'
import type { PlayerProfile } from '@cryptopets/shared'
import { clearAuthToken } from '@/api/client'
import { getPlayer } from '@/api/game'

type WalletResetReason = 'none' | 'accountChanged' | 'chainChanged' | 'walletDisconnected'

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}

const expectedChainId = normalizeChainId(import.meta.env.VITE_CHAIN_ID)
const walletAddress = ref('')
const walletError = ref('')
const walletNotice = ref('')
const chainId = ref('')
const player = ref<PlayerProfile | null>(null)
const isAuthenticating = ref(false)
const walletSessionVersion = ref(0)
const walletResetReason = ref<WalletResetReason>('none')
let areWalletEventsRegistered = false

const shortWalletAddress = computed(() => {
  if (!walletAddress.value) {
    return ''
  }

  return `${walletAddress.value.slice(0, 6)}...${walletAddress.value.slice(-4)}`
})

const isWalletInstalled = computed(() => Boolean(window.ethereum))
const isSessionAuthenticated = computed(() => Boolean(walletAddress.value))
const isSupportedChain = computed(() => !expectedChainId || !chainId.value || chainId.value === expectedChainId)
const expectedChainLabel = computed(() => expectedChainId ? Number.parseInt(expectedChainId, 16).toString() : '')

function normalizeChainId(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `0x${value.toString(16)}`
  }

  if (typeof value !== 'string' || !value.trim()) {
    return ''
  }

  const trimmed = value.trim()
  if (trimmed.startsWith('0x')) {
    return `0x${Number.parseInt(trimmed, 16).toString(16)}`
  }

  const decimalValue = Number.parseInt(trimmed, 10)
  return Number.isFinite(decimalValue) ? `0x${decimalValue.toString(16)}` : ''
}

function getWalletErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    ((error as { code: unknown }).code === 4001 || (error as { code: unknown }).code === 'ACTION_REJECTED')
  ) {
    return 'Request rejected in MetaMask. Please approve the wallet prompt to continue.'
  }

  return error instanceof Error ? error.message : fallback
}

function clearWalletSession(reason: WalletResetReason, message: string, nextWalletAddress = '') {
  clearAuthToken()
  player.value = null
  walletAddress.value = nextWalletAddress
  walletError.value = message
  walletNotice.value = message
  walletResetReason.value = reason
  walletSessionVersion.value += 1
}

async function syncChainId() {
  if (!window.ethereum) {
    chainId.value = ''
    return
  }

  const currentChainId = await window.ethereum.request({ method: 'eth_chainId' })
  chainId.value = normalizeChainId(currentChainId)
}

function assertSupportedChain() {
  if (isSupportedChain.value) {
    return
  }

  const expected = expectedChainLabel.value || expectedChainId
  throw new Error(`Unsupported network. Please switch MetaMask to chain ${expected}.`)
}

async function connectWallet() {
  walletError.value = ''
  walletNotice.value = ''

  if (!window.ethereum) {
    walletError.value = 'MetaMask is not installed. Please install or enable MetaMask to continue.'
    throw new Error(walletError.value)
  }

  isAuthenticating.value = true

  try {
    await syncChainId()
    assertSupportedChain()

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })

    if (!Array.isArray(accounts) || typeof accounts[0] !== 'string') {
      throw new Error('No wallet account returned')
    }

    const wallet = accounts[0]
    walletAddress.value = wallet

    player.value = null
    walletNotice.value = ''
    walletResetReason.value = 'none'
  } catch (error) {
    clearWalletSession('none', getWalletErrorMessage(error, 'Wallet login failed'))
    throw error
  } finally {
    isAuthenticating.value = false
  }
}

async function restoreSession() {
  if (!window.ethereum) {
    return
  }

  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' })

    if (!Array.isArray(accounts) || typeof accounts[0] !== 'string') {
      return
    }

    walletAddress.value = accounts[0]
    player.value = await getPlayer(accounts[0])
    walletAddress.value = player.value.wallet
  } catch {
    clearWalletSession('none', '', '')
  }
}

function handleAccountsChanged(accounts: unknown) {
  const nextWallet = Array.isArray(accounts) && typeof accounts[0] === 'string' ? accounts[0] : ''

  clearWalletSession(
    nextWallet ? 'accountChanged' : 'walletDisconnected',
    nextWallet
      ? 'MetaMask account changed. Please sign in again with the selected account.'
      : 'MetaMask wallet disconnected. Please connect a wallet to continue.',
    '',
  )
}

function handleChainChanged(nextChainId: unknown) {
  chainId.value = normalizeChainId(nextChainId)

  if (isSupportedChain.value) {
    clearWalletSession('chainChanged', 'Network changed. Please sign in again.', '')
    return
  }

  clearWalletSession(
    'chainChanged',
    `Unsupported network. Please switch MetaMask to chain ${expectedChainLabel.value || expectedChainId}.`,
    '',
  )
}

function registerWalletEvents() {
  if (!window.ethereum || areWalletEventsRegistered) {
    return
  }

  window.ethereum.on?.('accountsChanged', handleAccountsChanged)
  window.ethereum.on?.('chainChanged', handleChainChanged)
  areWalletEventsRegistered = true
}

function unregisterWalletEvents() {
  if (!window.ethereum || !areWalletEventsRegistered) {
    return
  }

  window.ethereum.removeListener?.('accountsChanged', handleAccountsChanged)
  window.ethereum.removeListener?.('chainChanged', handleChainChanged)
  areWalletEventsRegistered = false
}

export function useWallet() {
  return {
    walletAddress,
    walletError,
    walletNotice,
    chainId,
    player,
    isAuthenticating,
    isWalletInstalled,
    isSessionAuthenticated,
    isSupportedChain,
    expectedChainLabel,
    walletSessionVersion,
    walletResetReason,
    shortWalletAddress,
    connectWallet,
    restoreSession,
    syncChainId,
    registerWalletEvents,
    unregisterWalletEvents,
  }
}
