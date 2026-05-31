import { computed, ref } from 'vue'
import type { PlayerProfile } from '@cryptopets/shared'
import { loginWithSignature, requestLoginNonce } from '@/api/auth'
import { clearAuthToken, getAuthToken } from '@/api/client'
import { getPlayer } from '@/api/game'

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
    }
  }
}

const walletAddress = ref('')
const walletError = ref('')
const player = ref<PlayerProfile | null>(null)
const isAuthenticating = ref(false)

const shortWalletAddress = computed(() => {
  if (!walletAddress.value) {
    return ''
  }

  return `${walletAddress.value.slice(0, 6)}...${walletAddress.value.slice(-4)}`
})

async function connectWallet() {
  walletError.value = ''

  if (!window.ethereum) {
    walletError.value = 'MetaMask is not installed'
    throw new Error(walletError.value)
  }

  isAuthenticating.value = true

  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })

    if (!Array.isArray(accounts) || typeof accounts[0] !== 'string') {
      throw new Error('No wallet account returned')
    }

    const wallet = accounts[0]
    walletAddress.value = wallet

    const challenge = await requestLoginNonce(wallet)
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [challenge.message, wallet],
    })

    if (typeof signature !== 'string') {
      throw new Error('Wallet signature failed')
    }

    const session = await loginWithSignature({
      wallet,
      nonce: challenge.nonce,
      message: challenge.message,
      signature,
    })

    walletAddress.value = session.player.wallet
    player.value = session.player
  } catch (error) {
    clearAuthToken()
    player.value = null
    walletError.value = error instanceof Error ? error.message : 'Wallet login failed'
    throw error
  } finally {
    isAuthenticating.value = false
  }
}

async function restoreSession() {
  if (!getAuthToken()) {
    return
  }

  try {
    player.value = await getPlayer()
    walletAddress.value = player.value.wallet
  } catch {
    clearAuthToken()
    player.value = null
    walletAddress.value = ''
  }
}

export function useWallet() {
  return {
    walletAddress,
    walletError,
    player,
    isAuthenticating,
    shortWalletAddress,
    connectWallet,
    restoreSession,
  }
}
