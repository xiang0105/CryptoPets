<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import MarkdownIt from 'markdown-it'
import { currentMessages, locale, toggleLocale } from './i18n'
import { useGameApi } from '@/composables/useGameApi'
import { useWallet } from '@/composables/useWallet'
import { pets } from '@/data/pets'
import { setExpeditionTeam } from '@/state/expeditionTeam'
import { getPetImage } from '@/content/gameAssets'
import logoUrl from '@game-content/assets/branding/logo.png'
import backgroundMusicUrl from '@game-content/assets/audio/capybara-meadow.mp3'
import projectReadmeSource from '../../README.md?raw'

const menuItems = computed(() => [
  { label: currentMessages.value.app.nav.home, to: '/' },
  { label: currentMessages.value.app.nav.pet, to: '/pet' },
  { label: currentMessages.value.app.nav.store, to: '/store' },
  { label: currentMessages.value.app.nav.inventory, to: '/inventory' },
])

const actionItems = computed(() => [
  { label: currentMessages.value.app.actions.music, icon: 'music' },
  { label: currentMessages.value.app.actions.help, icon: 'circle-question' },
  { label: currentMessages.value.app.actions.readme, icon: 'book-open' },
  { label: currentMessages.value.app.actions.wallet, icon: 'wallet' },
  { label: currentMessages.value.app.actions.monoMode, icon: 'circle-half-stroke' },
])

const starterGiftPets = computed(() => pets.map((pet) => ({
  name: pet.name,
  image: getPetImage(pet),
})))

const isMonoMode = ref(false)
const isHelpPanelOpen = ref(false)
const isReadmePanelOpen = ref(false)
const isMusicEnabled = ref(false)
const isMusicPlaying = ref(false)
const isLoginConfirmed = ref(false)
const isStarterGiftOpen = ref(false)
const loginNotice = ref('')
const backgroundMusic = ref<HTMLAudioElement | null>(null)
const {
  walletAddress,
  walletError,
  walletNotice,
  player,
  isAuthenticating,
  isSessionAuthenticated,
  isSupportedChain,
  shortWalletAddress,
  walletSessionVersion,
  walletResetReason,
  connectWallet,
  restoreSession,
  syncChainId,
  registerWalletEvents,
  unregisterWalletEvents,
} = useWallet()
const { loadAllApiData } = useGameApi()
const route = useRoute()
const router = useRouter()
const slideDirection = ref<'left' | 'right'>('left')
const pageOrder = ['/', '/pet', '/store', '/inventory']

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})
const renderedHelp = computed(() => markdown.render(currentMessages.value.app.help.markdown))
const renderedProjectReadme = computed(() =>
  markdown.render(locale.value === 'zh-TW' ? currentMessages.value.app.readme.markdown : projectReadmeSource),
)

const musicButtonIcon = computed(() => (isMusicPlaying.value ? 'music' : 'volume-xmark'))

const visibleActionItems = computed(() => actionItems.value)
const canConfirmLogin = computed(() => isSessionAuthenticated.value && isSupportedChain.value && !isAuthenticating.value)
const walletInputPlaceholder = computed(() => walletError.value || currentMessages.value.app.login.walletPlaceholder)

const currentPageIndex = computed(() => {
  const index = pageOrder.indexOf(route.path)
  return index === -1 ? 0 : index
})

function goRelativePage(direction: -1 | 1) {
  const nextIndex = (currentPageIndex.value + direction + pageOrder.length) % pageOrder.length
  const nextPath = pageOrder[nextIndex] ?? '/'
  slideDirection.value = direction > 0 ? 'left' : 'right'
  router.push(nextPath)
}

function toggleMonoMode() {
  isMonoMode.value = !isMonoMode.value
}

async function playBackgroundMusic() {
  if (!backgroundMusic.value || !isMusicEnabled.value) {
    return
  }

  try {
    await backgroundMusic.value.play()
    isMusicPlaying.value = true
  } catch {
    window.addEventListener('pointerdown', playBackgroundMusicOnInteraction, { once: true })
  }
}

function playBackgroundMusicOnInteraction() {
  void playBackgroundMusic()
}

function toggleBackgroundMusic() {
  if (isMusicEnabled.value && !isMusicPlaying.value) {
    void playBackgroundMusic()
    return
  }

  isMusicEnabled.value = !isMusicEnabled.value

  if (!backgroundMusic.value) {
    return
  }

  if (isMusicEnabled.value) {
    void playBackgroundMusic()
  } else {
    backgroundMusic.value.pause()
    isMusicPlaying.value = false
  }
}

function handleAction(icon: string) {
  if (icon === 'circle-half-stroke') {
    toggleMonoMode()
  }

  if (icon === 'wallet') {
    void connectWallet().catch(() => {
      window.alert(walletError.value || currentMessages.value.app.login.walletFailed)
    })
  }

  if (icon === 'circle-question') {
    isHelpPanelOpen.value = true
  }

  if (icon === 'book-open') {
    isReadmePanelOpen.value = true
  }

  if (icon === 'music') {
    toggleBackgroundMusic()
  }

}

async function startLoginFlow() {
  if (isSessionAuthenticated.value) {
    loginNotice.value = currentMessages.value.app.login.walletDetected
    return
  }

  loginNotice.value = currentMessages.value.app.login.openingWallet

  try {
    await connectWallet()
    loginNotice.value = currentMessages.value.app.login.walletConnected
  } catch {
    loginNotice.value = walletError.value || currentMessages.value.app.login.walletFailed
  }
}

async function confirmLogin() {
  if (!canConfirmLogin.value) {
    return
  }

  isLoginConfirmed.value = true
  await loadAllApiData({ force: true })
  setExpeditionTeam(pets.map((pet) => pet.id))
  isStarterGiftOpen.value = pets.length > 0

  void playBackgroundMusic()
}

function closeStarterGift() {
  isStarterGiftOpen.value = false
}

watch(walletSessionVersion, () => {
  isLoginConfirmed.value = false
  isStarterGiftOpen.value = false
  loginNotice.value = walletNotice.value || walletError.value || currentMessages.value.app.login.walletFailed

  if (
    walletResetReason.value === 'accountChanged' ||
    (walletResetReason.value === 'chainChanged' && isSupportedChain.value)
  ) {
    void startLoginFlow()
  }
})

onMounted(async () => {
  registerWalletEvents()
  await syncChainId().catch(() => undefined)
  await restoreSession()
  if (!player.value) {
    void startLoginFlow()
  } else {
    loginNotice.value = currentMessages.value.app.login.walletDetected
  }
  void playBackgroundMusic()
})

onBeforeUnmount(() => {
  unregisterWalletEvents()
  window.removeEventListener('pointerdown', playBackgroundMusicOnInteraction)
})
</script>

<template>
  <audio ref="backgroundMusic" :src="backgroundMusicUrl" loop preload="auto"></audio>

  <section v-if="!isLoginConfirmed" class="login-gate" :aria-label="locale === 'zh-TW' ? '錢包登入' : 'MetaMask login'">
    <div class="login-box">
      <input
        class="wallet-address-input"
        type="text"
        :value="walletAddress"
        :placeholder="walletInputPlaceholder"
        readonly
        :aria-label="locale === 'zh-TW' ? '錢包地址' : 'Wallet address'"
      />
      <button
        class="confirm-login-button"
        type="button"
        :disabled="!canConfirmLogin"
        @click="confirmLogin"
      >
        {{ currentMessages.app.login.confirm }}
      </button>
      <p class="login-notice" aria-live="polite">{{ loginNotice }}</p>
    </div>
  </section>

  <template v-else>
  <header class="game-header" :class="{ 'is-mono-mode': isMonoMode }">
    <div class="nav-shell">
      <nav class="main-nav" aria-label="Primary navigation">
        <RouterLink
          v-for="item in menuItems"
          :key="item.label"
          class="nav-tab"
          :to="item.to"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <RouterLink class="brand-log" to="/" aria-label="Capy's Big Adventure Log">
        <img :src="logoUrl" alt="Capy's Big Adventure Log" />
      </RouterLink>

      <div class="quick-actions" aria-label="Quick actions">
        <button
          v-for="item in visibleActionItems"
          :key="item.label"
          class="action-button"
          :class="{
            active:
              (item.icon === 'circle-half-stroke' && isMonoMode) ||
              (item.icon === 'book-open' && isReadmePanelOpen) ||
              (item.icon === 'wallet' && walletAddress) ||
              (item.icon === 'music' && isMusicPlaying),
          }"
          type="button"
          :aria-label="
            item.icon === 'wallet' && walletAddress
              ? shortWalletAddress
              : item.icon === 'music'
                ? isMusicPlaying
                  ? currentMessages.app.actions.musicOn
                  : currentMessages.app.actions.musicOff
                : item.label
          "
          :title="
            item.icon === 'wallet' && walletAddress
              ? shortWalletAddress
              : item.icon === 'music'
                ? isMusicPlaying
                  ? currentMessages.app.actions.musicOn
                  : currentMessages.app.actions.musicOff
                : walletError || item.label
          "
          @click="handleAction(item.icon)"
        >
          <FontAwesomeIcon :icon="item.icon === 'music' ? musicButtonIcon : item.icon" aria-hidden="true" />
        </button>
        <button
          class="action-button locale-button"
          type="button"
          :aria-label="currentMessages.app.actions.switchLanguage"
          @click="toggleLocale"
        >
          {{ locale === 'zh-TW' ? 'EN' : '中' }}
        </button>
      </div>
    </div>
  </header>

  <main class="page-content" :class="{ 'is-mono-mode': isMonoMode }">
    <button
      class="page-arrow page-arrow-left"
      type="button"
      :aria-label="currentMessages.app.paging.previous"
      @click="goRelativePage(-1)"
    >
      <FontAwesomeIcon icon="chevron-left" aria-hidden="true" />
    </button>

    <RouterView v-slot="{ Component, route: routedPage }">
      <Transition :name="slideDirection === 'left' ? 'slide-left' : 'slide-right'" mode="out-in">
        <component :is="Component" :key="routedPage.path" />
      </Transition>
    </RouterView>

    <button
      class="page-arrow page-arrow-right"
      type="button"
      :aria-label="currentMessages.app.paging.next"
      @click="goRelativePage(1)"
    >
      <FontAwesomeIcon icon="chevron-right" aria-hidden="true" />
    </button>
  </main>

  <div
    v-if="isHelpPanelOpen"
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="help-panel-title"
    @click.self="isHelpPanelOpen = false"
  >
    <section class="help-panel">
      <header>
        <h2 id="help-panel-title">{{ currentMessages.app.help.title }}</h2>
        <button type="button" :aria-label="currentMessages.store.close" @click="isHelpPanelOpen = false">
          <FontAwesomeIcon icon="xmark" aria-hidden="true" />
        </button>
      </header>
      <div class="markdown-body" v-html="renderedHelp"></div>
    </section>
  </div>

  <div
    v-if="isReadmePanelOpen"
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="readme-panel-title"
    @click.self="isReadmePanelOpen = false"
  >
    <section class="help-panel">
      <header>
        <h2 id="readme-panel-title">{{ currentMessages.app.readme.title }}</h2>
        <button type="button" :aria-label="currentMessages.store.close" @click="isReadmePanelOpen = false">
          <FontAwesomeIcon icon="xmark" aria-hidden="true" />
        </button>
      </header>
      <div class="markdown-body" v-html="renderedProjectReadme"></div>
    </section>
  </div>

  <div
    v-if="isStarterGiftOpen"
    class="modal-overlay starter-gift-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="starter-gift-title"
    @click.self="closeStarterGift"
  >
    <section class="starter-gift-panel">
      <h2 id="starter-gift-title">{{ currentMessages.app.starterGift.title }}</h2>
      <p>{{ currentMessages.app.starterGift.body }}</p>
      <div class="starter-gift-list" :aria-label="currentMessages.app.starterGift.listLabel">
        <article v-for="pet in starterGiftPets" :key="pet.name" class="starter-gift-card">
          <img :src="pet.image" :alt="pet.name" draggable="false" />
          <span>{{ pet.name }}</span>
        </article>
      </div>
      <button type="button" @click="closeStarterGift">{{ currentMessages.app.starterGift.accept }}</button>
    </section>
  </div>
  </template>
</template>

<style scoped>
.login-gate {
  display: grid;
  place-items: center;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  padding: 24px;
  background: #fff7df;
}

.login-box {
  display: grid;
  grid-template-columns: minmax(0, 420px) 128px;
  gap: 12px;
  align-items: center;
  width: min(620px, 100%);
}

.wallet-address-input {
  min-width: 0;
  height: 48px;
  padding: 0 14px;
  color: #2f7180;
  font-family: 'Trebuchet MS', Verdana, 'Microsoft JhengHei', sans-serif;
  font-size: 15px;
  font-weight: 900;
  background: #ffffff;
  border: 4px solid #3b7b89;
  border-radius: 8px;
  outline: none;
}

.wallet-address-input::placeholder {
  color: rgba(47, 113, 128, 0.55);
}

.confirm-login-button {
  height: 48px;
  color: #fff7df;
  font-family: 'Trebuchet MS', Verdana, 'Microsoft JhengHei', sans-serif;
  font-size: 16px;
  font-weight: 900;
  cursor: pointer;
  background: #2f7180;
  border: 4px solid #3b7b89;
  border-radius: 8px;
}

.confirm-login-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  filter: grayscale(0.5);
}

.login-notice {
  grid-column: 1 / -1;
  min-height: 20px;
  margin: 0;
  color: #6f4228;
  font-family: 'Trebuchet MS', Verdana, 'Microsoft JhengHei', sans-serif;
  font-size: 13px;
  font-weight: 900;
  text-align: center;
}

.game-header {
  position: sticky;
  top: 0;
  z-index: 10;
  width: 100%;
  height: 75px;
  border-bottom: 6px solid #3f777e;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.3) 0 3px, transparent 3px 135px),
    linear-gradient(#8de0db, #66c2c2);
  box-shadow:
    inset 0 -3px 0 #caefe5,
    0 3px 0 rgba(41, 96, 106, 0.25);
}

.nav-shell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 12px;
}

.main-nav,
.quick-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 100%;
}

.main-nav {
  flex: 0 1 clamp(330px, 29vw, 430px);
  align-items: center;
  gap: 2px;
}

.quick-actions {
  flex: 0 1 clamp(330px, 29vw, 430px);
  justify-content: flex-end;
  gap: 8px;
}

.nav-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 92px;
  height: 49px;
  padding: 0 12px;
  color: #2f7180;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0;
  text-decoration: none;
  text-shadow: none;
  background: transparent;
  border: 4px solid transparent;
  border-bottom: 0;
  border-radius: 18px 18px 0 0;
  transition:
    transform 0.15s ease,
    filter 0.15s ease,
    background-color 0.15s ease;
}

.nav-tab:hover {
  color: #194f5f;
  background: rgba(255, 255, 255, 0.2);
}

.nav-tab.router-link-exact-active {
  z-index: 2;
  min-width: 124px;
  height: 62px;
  margin-bottom: -18px;
  color: #d9792f;
  background: #fff7df;
  border-color: #3f777e;
  border-bottom: 0;
  border-radius: 20px 20px 0 0;
  box-shadow: none;
  text-shadow: none;
}

.nav-tab.router-link-exact-active::after {
  position: absolute;
  right: 0;
  bottom: -6px;
  left: 0;
  height: 8px;
  content: '';
  background: #fff7df;
}

.brand-log {
  position: absolute;
  bottom: -50%;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(660px, 52vw);
  height: 108px;
  padding: 0;
  text-decoration: none;
  transform: translateX(-50%);
}

.brand-log:hover {
  background: transparent;
}

.brand-log img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 120px;
  object-fit: contain;
  filter: drop-shadow(0 3px 0 rgba(76, 88, 77, 0.35));
}

.action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  padding: 0;
  color: #2f7180;
  font-family: 'Trebuchet MS', Verdana, 'Microsoft JhengHei', sans-serif;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  cursor: pointer;
  background: #fff7df;
  border: 5px solid #3b7b89;
  border-radius: 12px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.75),
    0 2px 0 rgba(39, 94, 107, 0.35);
}

.action-button svg {
  filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.45));
}

.action-button.active {
  color: #fff7df;
  background: #2f7180;
  box-shadow:
    inset 0 0 0 999px #2f7180,
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    0 2px 0 rgba(39, 94, 107, 0.35);
}

.locale-button {
  width: 56px;
  font-size: 17px;
}

.is-mono-mode {
  filter: grayscale(1) invert(1);
}

.page-content {
  position: relative;
  height: calc(100vh - 75px);
  height: calc(100dvh - 75px);
  overflow: hidden;
  padding: 28px 18px 18px;
  background:
    radial-gradient(circle at 11% 19%, rgba(242, 166, 76, 0.24) 0 18px, transparent 19px),
    radial-gradient(circle at 89% 18%, rgba(242, 166, 76, 0.24) 0 18px, transparent 19px),
    radial-gradient(circle at 8% 68%, rgba(126, 201, 226, 0.22) 0 20px, transparent 21px),
    radial-gradient(circle at 92% 70%, rgba(241, 167, 188, 0.22) 0 21px, transparent 22px),
    linear-gradient(135deg, rgba(216, 172, 91, 0.16) 0 10px, transparent 10px 42px),
    linear-gradient(45deg, rgba(142, 212, 207, 0.14) 0 8px, transparent 8px 36px),
    linear-gradient(90deg, transparent 0 24px, rgba(214, 179, 106, 0.4) 24px 26px, transparent 26px),
    linear-gradient(270deg, transparent 0 24px, rgba(214, 179, 106, 0.4) 24px 26px, transparent 26px),
    #fff7df;
  border-right: 8px solid #8ed4cf;
  border-left: 8px solid #8ed4cf;
}

.page-arrow {
  position: absolute;
  top: 50%;
  z-index: 8;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 72px;
  color: #fff7df;
  cursor: pointer;
  background: rgba(63, 119, 126, 0.88);
  border: 4px solid #fff7df;
  border-radius: 18px;
  box-shadow: 0 4px 0 rgba(45, 79, 81, 0.28);
  transform: translateY(-50%);
}

.page-arrow:hover {
  background: #d9792f;
}

.page-arrow-left {
  left: 52px;
}

.page-arrow-right {
  right: 52px;
}

.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition:
    transform 0.34s ease,
    opacity 0.34s ease;
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(42px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-42px);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-42px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(42px);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 35;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(29, 61, 65, 0.55);
  backdrop-filter: blur(4px);
}

.help-panel {
  width: min(820px, 92vw);
  max-height: min(720px, 86vh);
  overflow: hidden;
  color: #513924;
  background: #fff7df;
  border: 6px solid #3b7b89;
  border-radius: 16px;
  box-shadow: 0 18px 0 rgba(45, 79, 81, 0.28);
}

.help-panel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  background: #72c5b4;
  border-bottom: 4px solid #3b7b89;
}

.help-panel h2 {
  margin: 0;
  color: #fff7df;
  font-size: 24px;
  font-weight: 900;
}

.help-panel header button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  color: #fff7df;
  cursor: pointer;
  background: #d95c4e;
  border: 4px solid #3b7b89;
  border-radius: 11px;
}

.starter-gift-overlay {
  z-index: 48;
}

.starter-gift-panel {
  display: grid;
  gap: 14px;
  width: min(520px, 92vw);
  padding: 22px;
  color: #4b241d;
  font-family: 'Trebuchet MS', Verdana, 'Microsoft JhengHei', sans-serif;
  background: #fff3ca;
  border: 5px solid #6a351f;
  border-radius: 10px;
  box-shadow:
    inset 0 0 0 3px rgba(255, 218, 152, 0.56),
    0 12px 0 rgba(72, 41, 24, 0.24);
}

.starter-gift-panel h2,
.starter-gift-panel p {
  margin: 0;
}

.starter-gift-panel h2 {
  font-size: 25px;
  font-weight: 1000;
  text-align: center;
}

.starter-gift-panel p {
  font-size: 15px;
  font-weight: 900;
  line-height: 1.45;
}

.starter-gift-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.starter-gift-card {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  min-height: 82px;
  padding: 8px 10px;
  background: #a76438;
  border: 3px solid #6a351f;
  border-radius: 8px;
}

.starter-gift-card img {
  width: 64px;
  height: 58px;
  object-fit: contain;
  filter: drop-shadow(0 2px 0 rgba(72, 41, 24, 0.22));
  user-select: none;
}

.starter-gift-card span {
  display: grid;
  place-items: center;
  min-width: 0;
  color: #fff3ca;
  font-size: 16px;
  font-weight: 1000;
  text-align: center;
}

.starter-gift-panel button {
  justify-self: center;
  min-width: 128px;
  min-height: 42px;
  color: #26582b;
  font-size: 17px;
  font-weight: 1000;
  cursor: pointer;
  background: linear-gradient(#c8e89e, #7fc165);
  border: 4px solid #6a351f;
  border-radius: 9px;
}

.markdown-body {
  max-height: calc(min(720px, 86vh) - 70px);
  padding: 18px 22px 24px;
  margin: 0;
  overflow: auto;
  font-family: 'Microsoft JhengHei', 'Trebuchet MS', sans-serif;
  font-size: 14px;
  line-height: 1.55;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  color: #6f4228;
  font-weight: 900;
  line-height: 1.2;
}

.markdown-body :deep(h1) {
  margin: 0 0 16px;
  font-size: 28px;
}

.markdown-body :deep(h2) {
  margin: 22px 0 10px;
  font-size: 22px;
}

.markdown-body :deep(h3) {
  margin: 18px 0 8px;
  font-size: 18px;
}

.markdown-body :deep(p),
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 0 0 12px;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 22px;
}

.markdown-body :deep(hr) {
  height: 3px;
  margin: 20px 0;
  background: #d2a46d;
  border: 0;
  border-radius: 999px;
}

.markdown-body :deep(code) {
  padding: 2px 5px;
  background: #f8e8bd;
  border: 1px solid #d2a46d;
  border-radius: 5px;
}

.markdown-body :deep(pre) {
  padding: 12px;
  overflow: auto;
  background: #f8e8bd;
  border: 2px solid #d2a46d;
  border-radius: 8px;
}

.markdown-body :deep(pre code) {
  padding: 0;
  background: transparent;
  border: 0;
}

@media (min-width: 901px) and (max-width: 1199px) {
  .page-content {
    height: calc(100dvh - 75px);
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
  }
}

@media (max-width: 900px) {
  .game-header {
    height: auto;
    min-height: 132px;
  }

  .nav-shell {
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 0;
    padding-top: 70px;
  }

  .brand-log {
    top: 2px;
    bottom: auto;
    width: min(520px, 82vw);
    height: 86px;
  }

  .main-nav {
    order: 2;
    width: calc(100% - 246px);
  }

  .nav-tab,
  .nav-tab.router-link-exact-active {
    min-width: auto;
    height: 51px;
    margin-bottom: 0;
    padding: 0 12px;
    font-size: 21px;
  }

  .nav-tab.router-link-exact-active::after {
    display: none;
  }

  .quick-actions {
    order: 3;
    margin-left: auto;
  }

  .page-content {
    height: calc(100dvh - 132px);
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
  }

  .page-arrow {
    top: auto;
    bottom: 18px;
    transform: none;
  }
}

@media (max-width: 620px) {
  .game-header {
    height: 118px;
    min-height: 118px;
  }

  .nav-shell {
    display: grid;
    grid-template-rows: 62px 48px;
    grid-template-columns: 1fr;
    align-content: start;
    padding: 4px 8px 0;
  }

  .brand-log {
    top: 2px;
    width: min(310px, 72vw);
    height: 60px;
  }

  .main-nav {
    order: 2;
    grid-row: 2;
    align-self: end;
    width: min(56vw, 230px);
    height: 48px;
    flex-wrap: nowrap;
    gap: 2px;
  }

  .quick-actions {
    grid-row: 2;
    justify-self: end;
    align-self: center;
    margin-left: 0;
    padding-bottom: 0;
    gap: 4px;
    height: 40px;
  }

  .nav-tab,
  .nav-tab.router-link-exact-active {
    min-width: 58px;
    height: 38px;
    padding: 0 7px;
    font-size: 16px;
    border-width: 3px;
    border-radius: 13px 13px 0 0;
  }

  .nav-tab.router-link-exact-active {
    min-width: 68px;
    height: 45px;
  }

  .action-button {
    width: 34px;
    height: 34px;
    border-width: 4px;
    border-radius: 10px;
    font-size: 15px;
  }

  .locale-button {
    width: 38px;
    font-size: 13px;
  }

  .page-content {
    height: calc(100dvh - 118px);
    overflow-y: hidden;
    padding: 14px 10px 18px;
    -webkit-overflow-scrolling: touch;
  }

  .page-arrow {
    top: auto;
    bottom: 16px;
    width: 38px;
    height: 48px;
    border-width: 3px;
    border-radius: 14px;
    transform: none;
  }

  .page-arrow-left {
    left: 22px;
  }

  .page-arrow-right {
    right: 22px;
  }
}
</style>
