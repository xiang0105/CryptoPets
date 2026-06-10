<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { ExpeditionLogEntry as ApiExpeditionLogEntry, ExpeditionSummary } from '@cryptopets/shared'
import type { Pet } from '@/data/pets'
import { useGameApi } from '@/composables/useGameApi'
import { expeditionTeamPets } from '@/state/expeditionTeam'
import { getPetImage, yuzuBiteFrames } from '@/content/gameAssets'
import orangeMap from '@game-content/assets/maps/orange.png'
import { currentMessages, isZh } from '@/i18n'
import {
  expeditionForests,
  petElementMeta,
  type ExpeditionForest,
} from '@cryptopets/game-content'

const elementMeta = petElementMeta

const text = computed(() => ({
  ...currentMessages.value.home,
}))
const {
  operationError,
  operationLoading,
  queryError,
  queryLoading,
  activeExpedition: apiActiveExpedition,
  expeditionLogs: apiExpeditionLogs,
  loadPlayerProfile,
  loadExpeditionLogs,
  claimActiveExpedition,
  startTeamExpedition,
} = useGameApi()

const fruitFrames = yuzuBiteFrames
type ForestId = ExpeditionForest['id']
type ForestOption = ExpeditionForest

interface ExpeditionLogEntry {
  at: number
  message: string
  variant?: 'notice'
}

interface ExpeditionRecord {
  id: ForestId
  apiId?: string
  startedAt: number
  finishAt: number
}

const forestOptions: ForestOption[] = expeditionForests

const fruitFrameIndex = ref(0)
const logLinesElement = ref<HTMLElement | null>(null)
const now = ref(Date.now())
const activeExpedition = ref<ExpeditionRecord | null>(loadStoredExpedition())
const lastSelectedForest = ref<ForestOption | null>(null)
const localExpeditionError = ref('')
let fruitTimer: number | undefined
let clockTimer: number | undefined
let logRefreshTimer: number | undefined
let fruitCycleStarted = 0
const fruitCycleDuration = 12800

const fruitImage = computed(() => fruitFrames[fruitFrameIndex.value])
const selectedForest = computed(() => forestOptions.find((forest) => forest.id === activeExpedition.value?.id) ?? null)
const teamPower = computed(() => {
  const team = expeditionTeamPets.value
  const total = team.reduce((sum, pet) => sum + pet.stats.hp + pet.stats.atk * 1.4 + pet.stats.def * 1.2 + pet.stage * 12, 0)

  return Math.round(total / Math.max(1, team.length))
})
const expeditionProgress = computed(() => {
  if (!activeExpedition.value) {
    return 0
  }

  const total = activeExpedition.value.finishAt - activeExpedition.value.startedAt
  const elapsed = now.value - activeExpedition.value.startedAt

  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
})
const remainingTime = computed(() => {
  if (!activeExpedition.value) {
    return text.value.ready
  }

  const nextAt = activeExpedition.value.finishAt
  const seconds = Math.max(0, Math.ceil((nextAt - now.value) / 1000))
  const minutes = Math.floor(seconds / 60)
  const restSeconds = seconds % 60

  return `${minutes}:${String(restSeconds).padStart(2, '0')}`
})
const isExpeditionComplete = computed(() => Boolean(activeExpedition.value && now.value >= activeExpedition.value.finishAt))
const missionName = computed(() => selectedForest.value ? displayForestName(selectedForest.value) : text.value.missionName)
const missionGoal = computed(() => selectedForest.value ? selectedForest.value.reward : text.value.chooseForest)
const missionStatus = computed(() => {
  if (!activeExpedition.value) {
    return text.value.ready
  }

  return isExpeditionComplete.value ? text.value.completed : text.value.exploring
})
const currentStatusTitle = computed(() => {
  if (!selectedForest.value) {
    return text.value.currentStatus
  }

  return isZh.value
    ? `${selectedForest.value.name.zh}開始了`
    : `${selectedForest.value.name.en} started`
})
const visibleLogEntries = computed(() => {
  return apiExpeditionLogs.value.map(mapApiLog)
})

function scrollLogToLatest() {
  void nextTick(() => {
    if (logLinesElement.value) {
      logLinesElement.value.scrollTop = logLinesElement.value.scrollHeight
    }
  })
}

function syncFruitFrame() {
  const progress = ((performance.now() - fruitCycleStarted) % fruitCycleDuration) / fruitCycleDuration

  if (progress < 0.49) {
    fruitFrameIndex.value = 0
  } else if (progress < 0.58) {
    fruitFrameIndex.value = 1
  } else if (progress < 0.68) {
    fruitFrameIndex.value = 2
  } else {
    fruitFrameIndex.value = 3
  }
}

function displayForestName(forest: ForestOption) {
  return isZh.value ? forest.name.zh : forest.name.en
}

function displayForestSummary(forest: ForestOption) {
  return isZh.value ? forest.summary.zh : forest.summary.en
}

function loadStoredExpedition(): ExpeditionRecord | null {
  return null
}

function saveStoredExpedition(record: ExpeditionRecord | null) {
  void record
}

function formatLogTime(timestamp: number) {
  const date = new Date(timestamp)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${month}/${day} ${hours}:${minutes}`
}

function displayLogEntry(log: ExpeditionLogEntry) {
  return log.variant === 'notice' ? log.message : `${formatLogTime(log.at)}　${log.message}`
}

function mapApiLog(log: ApiExpeditionLogEntry): ExpeditionLogEntry {
  return {
    at: new Date(log.at).getTime(),
    message: isZh.value ? log.message.zh : log.message.en,
    variant: log.variant ?? undefined,
  }
}

function petLevel(pet: Pet) {
  return pet.level
}

function currentExpeditionTeam() {
  return expeditionTeamPets.value
}

function expeditionRecordFromSummary(summary: ExpeditionSummary): ExpeditionRecord | null {
  const forest = forestOptions.find((entry) => entry.id === summary.expeditionType)

  if (!forest) {
    return null
  }

  const startedAt = new Date(summary.startedAt).getTime()
  const finishAt = new Date(summary.endsAt).getTime()

  if (!Number.isFinite(startedAt) || !Number.isFinite(finishAt)) {
    return null
  }

  return {
    id: forest.id,
    apiId: summary.id,
    startedAt,
    finishAt,
  }
}

const expeditionStatusError = computed(() => localExpeditionError.value || queryError.player || operationError.startExpedition || operationError.claimReward)
const isExpeditionStatusLoading = computed(() => queryLoading.player || operationLoading.startExpedition || operationLoading.claimReward)

async function startExpedition(forest: ForestOption) {
  if (activeExpedition.value) {
    return
  }

  lastSelectedForest.value = forest
  const selectedTeam = currentExpeditionTeam()

  if (selectedTeam.length === 0) {
    localExpeditionError.value = isZh.value ? '請先到角色頁選擇遠征隊伍' : 'Choose an expedition team on the Pet page first.'
    return
  }

  localExpeditionError.value = ''
  const teamPetIds = selectedTeam.map((pet) => pet.tokenId)
  let apiSummary

  try {
    apiSummary = await startTeamExpedition(teamPetIds, forest.id)
  } catch {
    return
  }

  const record = expeditionRecordFromSummary(apiSummary)

  if (record) {
    activeExpedition.value = record
    saveStoredExpedition(record)
    now.value = Date.now()
    await loadExpeditionLogs({ force: true }).catch(() => undefined)
  }
}

async function retryStartExpedition() {
  if (!lastSelectedForest.value) {
    return
  }

  await startExpedition(lastSelectedForest.value)
}

async function syncActiveExpeditionFromApi() {
  try {
    await loadPlayerProfile()
  } catch {
    return
  }

  const summary = apiActiveExpedition.value

  if (!summary) {
    return
  }

  const record = expeditionRecordFromSummary(summary)

  if (!record) {
    return
  }

  activeExpedition.value = record
  saveStoredExpedition(activeExpedition.value)
  now.value = Date.now()
}

async function completeExpedition() {
  if (!activeExpedition.value || !isExpeditionComplete.value || !selectedForest.value) {
    return
  }

  if (activeExpedition.value.apiId) {
    try {
      await claimActiveExpedition(activeExpedition.value.apiId)
      await loadExpeditionLogs({ force: true }).catch(() => undefined)
    } catch {
      return
    }
  }

  activeExpedition.value = null
  saveStoredExpedition(null)
}

function syncCompletedExpedition() {
  if (activeExpedition.value && Date.now() >= activeExpedition.value.finishAt) {
    now.value = Date.now()
  }
}

onMounted(() => {
  void syncActiveExpeditionFromApi()
  void loadExpeditionLogs().catch(() => undefined)
  syncCompletedExpedition()
  scrollLogToLatest()
  fruitCycleStarted = performance.now()
  syncFruitFrame()
  fruitTimer = window.setInterval(syncFruitFrame, 120)
  clockTimer = window.setInterval(() => {
    now.value = Date.now()
    syncCompletedExpedition()
  }, 1000)
  logRefreshTimer = window.setInterval(() => {
    if (activeExpedition.value) {
      void loadExpeditionLogs({ force: true }).catch(() => undefined)
    }
  }, 5000)
})

watch(
  () => visibleLogEntries.value[visibleLogEntries.value.length - 1]?.at,
  () => {
    scrollLogToLatest()
  },
)

onUnmounted(() => {
  if (fruitTimer) {
    window.clearInterval(fruitTimer)
  }
  if (clockTimer) {
    window.clearInterval(clockTimer)
  }
  if (logRefreshTimer) {
    window.clearInterval(logRefreshTimer)
  }
})
</script>

<template>
  <section class="expedition-page">
    <div class="happy-background" aria-hidden="true">
      <FontAwesomeIcon class="bg-icon apple bg-one" icon="apple-whole" />
      <FontAwesomeIcon class="bg-icon orange bg-two" icon="lemon" />
      <FontAwesomeIcon class="bg-icon leaf bg-three" icon="leaf" />
      <FontAwesomeIcon class="bg-icon star bg-four" icon="star" />
      <FontAwesomeIcon class="bg-icon cloud bg-five" icon="cloud" />
      <FontAwesomeIcon class="bg-icon sun bg-six" icon="sun" />
      <FontAwesomeIcon class="bg-icon apple bg-seven" icon="apple-whole" />
      <FontAwesomeIcon class="bg-icon orange bg-eight" icon="lemon" />
      <FontAwesomeIcon class="bg-icon leaf bg-nine" icon="leaf" />
      <FontAwesomeIcon class="bg-icon star bg-ten" icon="star" />
    </div>

    <div class="expedition-grid">
      <section class="animation-panel" aria-label="Capybara party exploring a forest">
        <div class="forest-scene">
          <img class="scene-map-image" :src="orangeMap" alt="" draggable="false" />
          <div class="mission-header">
            <strong>{{ text.activeExpedition }}:</strong>
            <span>{{ missionName }}</span>
          </div>
          <div v-if="!activeExpedition" class="scene-forest-picker">
            <button
              v-for="forest in forestOptions"
              :key="forest.id"
              class="forest-choice"
              :class="`forest-${forest.id}`"
              type="button"
              :disabled="isExpeditionStatusLoading"
              @click="startExpedition(forest)"
            >
              <strong>{{ displayForestName(forest) }}</strong>
              <span>{{ displayForestSummary(forest) }}</span>
              <small>Lv. {{ forest.difficulty }} · {{ forest.durationSeconds }}s · {{ forest.reward }}</small>
              <b>{{ text.start }}</b>
            </button>
            <div v-if="expeditionStatusError" class="expedition-api-state" aria-live="polite">
              <strong>{{ expeditionStatusError }}</strong>
              <button type="button" :disabled="isExpeditionStatusLoading || !lastSelectedForest" @click="retryStartExpedition">
                {{ isZh ? '重試' : 'Retry' }}
              </button>
            </div>
          </div>
          <div class="sunbeam"></div>
          <div class="castle"></div>
          <div class="tree tree-left"></div>
          <div class="tree tree-right"></div>
          <div class="path"></div>
          <div class="snack-fruit" aria-hidden="true">
            <img class="fruit-frame" :src="fruitImage" alt="" draggable="false" />
          </div>
          <div class="party-row">
            <div
              v-for="(pet, index) in expeditionTeamPets"
              :key="pet.id"
              class="scene-pet"
              :style="{ '--pet-index': index }"
            >
              <img
                class="scene-pet-avatar"
                :class="pet.element"
                :src="getPetImage(pet)"
                :alt="`${pet.name} capybara`"
                draggable="false"
              />
            </div>
          </div>
          <div class="mission-footer">
            <div class="mission-stat progress-stat">
              <strong>{{ text.progress }}:</strong>
              <span>{{ activeExpedition ? `${expeditionProgress}%` : text.ready }}</span>
              <div class="quest-progress" aria-label="Expedition progress">
                <i :style="{ width: `${expeditionProgress}%` }"></i>
              </div>
            </div>
            <div class="mission-stat">
              <strong>{{ text.nextEvent }}:</strong>
              <span>{{ activeExpedition ? remainingTime : text.chooseForest }}</span>
            </div>
            <div class="mission-stat">
              <strong>{{ text.goal }}:</strong>
              <span>{{ missionGoal }}</span>
            </div>
            <button
              v-if="isExpeditionComplete"
              class="claim-reward-button"
              type="button"
              :disabled="operationLoading.claimReward"
              @click="completeExpedition"
            >
              {{ operationLoading.claimReward ? (isZh ? '回報中' : 'Claiming') : (isZh ? '回報' : 'Claim') }}
            </button>
          </div>
        </div>
      </section>

      <aside class="status-panel">
        <h2>{{ currentStatusTitle }}</h2>
        <div class="log-sheet">
          <div class="binder">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <h3>{{ text.expeditionLog }}</h3>
          <div ref="logLinesElement" class="log-lines">
            <p
              v-for="log in visibleLogEntries"
              :key="`${log.at}-${log.message}`"
              :class="{ 'is-notice': log.variant === 'notice' }"
            >
              {{ displayLogEntry(log) }}
            </p>
            <p v-if="visibleLogEntries.length === 0" class="is-notice">
              {{ isZh ? '尚無遠征紀錄' : 'No expedition logs yet' }}
            </p>
            <p v-if="operationError.claimReward" class="is-notice">
              {{ operationError.claimReward }}
            </p>
          </div>
        </div>
      </aside>
    </div>

    <section class="party-panel">
      <h2><span></span> {{ text.partyTitle }} <span></span></h2>

      <div class="pet-list">
        <p v-if="expeditionTeamPets.length === 0" class="party-empty">
          {{ isZh ? '請先到角色頁選擇遠征隊伍' : 'Choose an expedition team on the Pet page first.' }}
        </p>
        <article
          v-for="pet in expeditionTeamPets"
          :key="pet.id"
          class="pet-card"
          :class="elementMeta[pet.element].className"
        >
          <header>
            <strong><em>{{ elementMeta[pet.element].mark }}</em> {{ pet.name }}</strong>
            <small>{{ isZh ? elementMeta[pet.element].label.zh : elementMeta[pet.element].label.en }}</small>
          </header>

          <div class="pet-body">
            <div class="portrait">
              <img :src="getPetImage(pet)" :alt="`${pet.name} portrait`" draggable="false" />
            </div>

            <div class="meter-block">
              <div class="level-row">
                <span>{{ text.level }}</span>
                <strong>{{ petLevel(pet) }}</strong>
              </div>
              <div class="meter">
                <span>{{ text.hp }}:</span>
                <div><i :style="{ width: `${(pet.stats.hp / pet.stats.maxHp) * 100}%` }"></i></div>
                <b>{{ pet.stats.hp }}/{{ pet.stats.maxHp }}</b>
              </div>
              <div class="meter mana">
                <span>{{ text.exp }}:</span>
                <div><i :style="{ width: `${(pet.exp.current / pet.exp.next) * 100}%` }"></i></div>
                <b>{{ pet.exp.current }}/{{ pet.exp.next }}</b>
              </div>
            </div>
          </div>

          <dl class="stat-grid">
            <div>
              <dt>IV</dt>
              <dd>{{ pet.stats.iv }}</dd>
            </div>
            <div>
              <dt>ATK</dt>
              <dd>{{ pet.stats.atk }}</dd>
            </div>
            <div>
              <dt>DEF</dt>
              <dd>{{ pet.stats.def }}</dd>
            </div>
            <div>
              <dt>ID</dt>
              <dd>{{ pet.tokenId }}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  </section>
</template>

<style scoped>
.expedition-page {
  position: relative;
  display: grid;
  grid-template-rows: minmax(0, 1fr) minmax(190px, auto);
  gap: 14px;
  width: min(1500px, 100%);
  height: 100%;
  margin: 0 auto;
  color: #513924;
}

.expedition-page::before {
  position: absolute;
  z-index: 0;
  inset: -28px -8px 0;
  pointer-events: none;
  content: '';
  opacity: 0.9;
  background:
    radial-gradient(circle at 32px 50px, #f2a64c 0 18px, #79a95b 19px 22px, transparent 23px),
    radial-gradient(circle at 42px 188px, #7ec9e2 0 18px, #4f9caf 19px 22px, transparent 23px),
    radial-gradient(circle at 35px 330px, #f1a7bc 0 18px, #bf7892 19px 22px, transparent 23px),
    radial-gradient(circle at calc(100% - 32px) 50px, #f2a64c 0 18px, #79a95b 19px 22px, transparent 23px),
    radial-gradient(circle at calc(100% - 42px) 188px, #7ec9e2 0 18px, #4f9caf 19px 22px, transparent 23px),
    radial-gradient(circle at calc(100% - 35px) 330px, #f1a7bc 0 18px, #bf7892 19px 22px, transparent 23px),
    radial-gradient(circle at 50% calc(100% - 24px), rgba(242, 166, 76, 0.22) 0 10px, transparent 11px),
    radial-gradient(circle at 58% calc(100% - 58px), rgba(126, 201, 226, 0.2) 0 12px, transparent 13px),
    radial-gradient(circle at 42% calc(100% - 58px), rgba(241, 167, 188, 0.2) 0 12px, transparent 13px),
    linear-gradient(90deg, rgba(206, 154, 78, 0.45) 0 3px, transparent 3px calc(100% - 3px), rgba(206, 154, 78, 0.45) calc(100% - 3px));
}

.expedition-grid,
.party-panel {
  position: relative;
  z-index: 2;
}

.happy-background {
  position: absolute;
  inset: -20px 0 0;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
}

.bg-icon {
  position: absolute;
  display: block;
  opacity: 0.72;
  filter: drop-shadow(0 2px 0 rgba(107, 82, 45, 0.16));
  animation:
    icon-bob 7s ease-in-out infinite,
    icon-drift 18s linear infinite;
}

.apple {
  color: #df6b55;
}

.orange {
  color: #f2a64c;
}

.leaf {
  color: #75a85b;
}

.star {
  color: #eec95d;
}

.cloud {
  color: #a9dbe6;
}

.sun {
  color: #f0b84e;
}

.bg-one {
  top: 26px;
  left: 2.5%;
  font-size: 42px;
}

.bg-two {
  top: 128px;
  left: 5%;
  font-size: 34px;
  animation-delay: -2s, -4s;
}

.bg-three {
  top: 38px;
  right: 5%;
  font-size: 38px;
  animation-delay: -4s, -8s;
}

.bg-four {
  top: 172px;
  right: 2.5%;
  font-size: 30px;
  animation-delay: -1s, -2s;
}

.bg-five {
  right: 6%;
  bottom: 74px;
  font-size: 54px;
  animation-delay: -3s, -9s;
}

.bg-six {
  bottom: 72px;
  left: 6%;
  font-size: 46px;
  animation-delay: -5s, -12s;
}

.bg-seven {
  top: 292px;
  left: 1.5%;
  font-size: 34px;
  animation-delay: -6s, -6s;
}

.bg-eight {
  right: 1.5%;
  bottom: 200px;
  font-size: 40px;
  animation-delay: -7s, -14s;
}

.bg-nine {
  bottom: 18px;
  left: 32%;
  font-size: 30px;
  animation-delay: -2.5s, -10s;
}

.bg-ten {
  right: 32%;
  bottom: 18px;
  font-size: 28px;
  animation-delay: -4.5s, -7s;
}

@keyframes icon-bob {
  0%,
  100% {
    transform: translateY(0) rotate(-3deg);
  }

  50% {
    transform: translateY(-12px) rotate(5deg);
  }
}

@keyframes icon-drift {
  from {
    margin-left: 0;
  }

  to {
    margin-left: 18px;
  }
}

@keyframes pet-journey {
  0%,
  32% {
    transform: translateX(var(--walk-x)) translateY(2px) scale(0.96);
  }

  39%,
  75% {
    transform: translateX(var(--gather-x)) translateY(0) scale(1);
  }

  82%,
  100% {
    transform: translateX(var(--walk-x)) translateY(2px) scale(0.96);
  }
}

@keyframes pet-waddle {
  from {
    transform: translateY(0) rotate(-2.5deg);
  }

  to {
    transform: translateY(-5px) rotate(2.5deg);
  }
}

@keyframes fruit-meal {
  0%,
  36% {
    opacity: 0;
    transform: translateX(-50%) translateY(12px) scale(0.72) rotate(-8deg);
  }

  40%,
  75% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1) rotate(0deg);
  }

  82%,
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(10px) scale(0.7) rotate(8deg);
  }
}

.expedition-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 430px;
  gap: 24px;
  min-height: 0;
  height: 100%;
}

.animation-panel {
  display: block;
  min-height: 0;
  overflow: hidden;
  background: #182d29;
  border: 4px solid #fff2c8;
  border-radius: 8px;
  box-shadow: 0 0 0 3px #c58d5a;
}

.forest-scene {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #8fd1bd;
}

.scene-map-image {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(1.13) saturate(1.04);
  user-select: none;
  pointer-events: none;
}

.mission-header {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 7px 18px 9px;
  color: #fff5d1;
  font-size: clamp(20px, 2vw, 30px);
  font-weight: 900;
  line-height: 1;
  background: rgba(37, 29, 24, 0.74);
  border-bottom: 3px solid rgba(255, 230, 160, 0.45);
}

.mission-header strong {
  color: #ffd36a;
}

.scene-forest-picker {
  position: absolute;
  inset: 44px 0 0;
  z-index: 9;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: clamp(10px, 2vh, 18px);
  padding: clamp(14px, 3vw, 34px);
  background: rgba(8, 8, 8, 0.72);
  backdrop-filter: blur(2px);
}

.forest-scene::before,
.forest-scene::after {
  content: none;
}

.sunbeam {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(110deg, transparent 20%, rgba(255, 255, 255, 0.18) 50%, transparent 70%);
}

.castle {
  display: none;
}

.tree {
  display: none;
}

.tree::before {
  content: none;
}

.tree-left {
  left: 2%;
  transform: rotate(5deg);
}

.tree-right {
  right: 3%;
  transform: rotate(-5deg);
}

.path {
  display: none;
}

.party-row {
  position: absolute;
  right: 0;
  bottom: clamp(58px, 15%, 96px);
  left: 0;
  z-index: 4;
  height: clamp(90px, 24%, 142px);
}

.mission-footer {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 8;
  display: grid;
  grid-template-columns: 1fr 1.15fr 1fr;
  gap: 14px;
  padding: 12px 30px 13px;
  color: #fff5d1;
  background: rgba(28, 26, 24, 0.76);
  border-top: 3px solid rgba(255, 230, 160, 0.42);
}

.mission-stat {
  display: grid;
  align-content: center;
  gap: 4px;
  min-width: 0;
  padding-left: 16px;
  border-left: 2px solid rgba(255, 245, 209, 0.4);
}

.mission-stat:first-child {
  padding-left: 0;
  border-left: 0;
}

.mission-stat strong {
  color: #ffd36a;
  font-size: clamp(15px, 1.5vw, 22px);
  font-weight: 1000;
  line-height: 1;
}

.mission-stat span {
  overflow: hidden;
  font-size: clamp(13px, 1.3vw, 19px);
  font-weight: 900;
  line-height: 1.12;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-stat {
  grid-template-columns: auto 1fr;
  column-gap: 6px;
}

.progress-stat .quest-progress {
  grid-column: 1 / -1;
}

.quest-progress {
  height: 17px;
  overflow: hidden;
  background: #3e2c25;
  border: 3px solid #f3dfb5;
  border-radius: 999px;
}

.quest-progress i {
  display: block;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, #67e979, #42bd65);
  border-radius: inherit;
}

.scene-pet {
  --walk-x: 0px;
  --gather-x: 0px;
  position: absolute;
  bottom: 0;
  left: 50%;
  display: grid;
  place-items: end center;
  transform-origin: center bottom;
  animation: pet-journey 12.8s ease-in-out infinite;
}

.scene-pet:nth-child(1) {
  --walk-x: -230px;
  --gather-x: -210px;
}

.scene-pet:nth-child(2) {
  --walk-x: -78px;
  --gather-x: -78px;
  bottom: 4px;
}

.scene-pet:nth-child(3) {
  --walk-x: 78px;
  --gather-x: 70px;
}

.scene-pet:nth-child(4) {
  --walk-x: 220px;
  --gather-x: 198px;
  bottom: 6px;
}

.scene-pet-avatar {
  width: clamp(118px, 13vw, 172px);
  height: auto;
  object-fit: contain;
  user-select: none;
  filter: drop-shadow(0 4px 0 rgba(64, 43, 36, 0.18));
  animation: pet-waddle 720ms ease-in-out infinite alternate;
}

.scene-pet:nth-child(2) .scene-pet-avatar {
  animation-delay: -0.18s;
}

.scene-pet:nth-child(3) .scene-pet-avatar {
  animation-delay: -0.34s;
}

.scene-pet:nth-child(4) .scene-pet-avatar {
  animation-delay: -0.52s;
}

.snack-fruit {
  position: absolute;
  bottom: clamp(72px, 18%, 116px);
  left: 13%;
  z-index: 5;
  width: 94px;
  height: 125px;
  opacity: 1;
  filter: drop-shadow(0 5px 0 rgba(53, 91, 54, 0.18));
  transform: translateX(-50%);
  transform-origin: center bottom;
  animation: fruit-meal 12.8s ease-in-out infinite;
}

.fruit-frame {
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
}

.status-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
  padding: 12px;
  background: #72c5b4;
  border: 4px solid #4b8e82;
  border-radius: 9px;
  box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.38);
}

.status-panel h2 {
  margin: -4px 0 8px;
  color: #fff7df;
  font-size: 18px;
  font-weight: 900;
  text-align: center;
}

.log-sheet {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
  padding: 42px 28px 22px;
  background: linear-gradient(90deg, transparent 0 22px, #e9aaa1 22px 24px, transparent 24px), #fff7df;
  border: 3px solid #9a7045;
  border-radius: 8px 8px 20px 8px;
}

.binder {
  position: absolute;
  top: -15px;
  right: 28px;
  left: 28px;
  display: flex;
  justify-content: space-between;
}

.binder span {
  width: 10px;
  height: 28px;
  background: #dce8f0;
  border: 3px solid #6d8d9b;
  border-radius: 8px;
}

.log-sheet h3 {
  margin: 0 0 18px;
  color: #80522e;
  font-size: 18px;
  font-weight: 900;
  text-align: center;
}

.forest-choice {
  display: grid;
  grid-template-columns: 1fr;
  align-content: center;
  gap: 5px;
  width: min(300px, 30%);
  min-height: clamp(190px, 36vh, 260px);
  padding: clamp(10px, 1.8vh, 16px) clamp(14px, 2.4vw, 24px);
  color: #fff7df;
  text-align: left;
  cursor: pointer;
  background: rgba(26, 22, 19, 0.86);
  border: 3px solid rgba(255, 230, 160, 0.84);
  border-radius: 8px;
  box-shadow:
    inset 0 0 0 2px rgba(255, 247, 223, 0.18),
    0 5px 0 rgba(0, 0, 0, 0.32);
  transition:
    transform 0.14s ease,
    border-color 0.14s ease,
    background-color 0.14s ease;
}

.forest-choice:hover {
  background: rgba(69, 48, 31, 0.94);
  border-color: #ffd36a;
  transform: translateY(-2px);
}

.forest-choice:disabled {
  cursor: wait;
  filter: grayscale(0.35);
}

.expedition-api-state {
  display: grid;
  gap: 8px;
  width: min(300px, 30%);
  min-height: clamp(190px, 36vh, 260px);
  align-content: center;
  padding: 16px;
  color: #fff7df;
  text-align: center;
  background: rgba(105, 50, 38, 0.9);
  border: 3px solid rgba(255, 230, 160, 0.84);
  border-radius: 8px;
}

.expedition-api-state strong {
  overflow-wrap: anywhere;
  font-size: 14px;
}

.expedition-api-state button,
.claim-reward-button {
  min-height: 34px;
  color: #26582b;
  font-weight: 1000;
  cursor: pointer;
  background: linear-gradient(#c8e89e, #7fc165);
  border: 3px solid #fff7df;
  border-radius: 7px;
}

.claim-reward-button {
  position: absolute;
  right: 22px;
  bottom: 76px;
  z-index: 12;
  min-width: 96px;
  color: #fff7df;
  background: #4b8e82;
}

.claim-reward-button:disabled,
.expedition-api-state button:disabled {
  cursor: wait;
  opacity: 0.68;
}

.forest-choice strong {
  min-width: 0;
  font-size: clamp(17px, 2.2vw, 25px);
  font-weight: 1000;
  line-height: 1.05;
}

.forest-choice span,
.forest-choice small {
  min-width: 0;
  color: rgba(255, 247, 223, 0.88);
  font-size: clamp(11px, 1.25vw, 14px);
  font-weight: 900;
  line-height: 1.25;
}

.forest-choice b {
  justify-self: start;
  min-width: 74px;
  padding: 5px 10px;
  color: #fff7df;
  font-size: 13px;
  font-weight: 1000;
  text-align: center;
  background: #4b8e82;
  border: 2px solid rgba(255, 247, 223, 0.58);
  border-radius: 7px;
}

.forest-orange {
  border-left: 12px solid #f1a14a;
}

.forest-apple {
  border-left: 12px solid #d96b58;
}

.forest-snow-peach {
  border-left: 12px solid #f1a7bc;
}

.log-lines {
  display: block;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0 10px 18px 0;
  background:
    repeating-linear-gradient(180deg, transparent 0 33px, rgba(125, 188, 173, 0.34) 34px 35px, transparent 36px),
    linear-gradient(90deg, transparent 0 18px, #e9aaa1 18px 20px, transparent 20px);
  scrollbar-color: #7dbcad rgba(255, 247, 223, 0.45);
  scrollbar-width: thin;
}

.log-lines::-webkit-scrollbar {
  width: 10px;
}

.log-lines::-webkit-scrollbar-track {
  background: rgba(255, 247, 223, 0.45);
  border-radius: 999px;
}

.log-lines::-webkit-scrollbar-thumb {
  background: #7dbcad;
  border: 2px solid #fff7df;
  border-radius: 999px;
}

.log-lines p {
  display: block;
  position: static;
  box-sizing: border-box;
  width: 100%;
  height: auto;
  min-height: 0;
  margin: 0 0 8px;
  padding: 8px 10px 8px 30px;
  color: #4c3324;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.6;
  overflow-wrap: anywhere;
  white-space: normal;
  background: transparent;
  border-bottom: 1px solid rgba(125, 188, 173, 0.45);
}

.log-lines p.is-notice {
  min-height: 34px;
  padding: 8px 10px;
  color: #2f6f66;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
  text-align: center;
  background: rgba(114, 197, 180, 0.14);
  border-block: 1px solid rgba(75, 142, 130, 0.32);
}

.party-panel {
  min-height: 0;
  overflow: hidden;
  margin-top: 0;
  padding: 12px 16px 14px;
  background: #ffe4bc;
  border: 3px solid #b7834e;
  border-radius: 8px;
}

.party-panel h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 10px;
  color: #6f4228;
  font-size: 20px;
  font-weight: 900;
  text-align: center;
}

.party-panel h2 span {
  height: 2px;
  flex: 1;
  background: #d2a46d;
}

.pet-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  min-height: 0;
}

.party-empty {
  grid-column: 1 / -1;
  margin: 0;
  padding: 18px;
  color: #6f4228;
  font-weight: 900;
  text-align: center;
  background: rgba(255, 247, 223, 0.58);
  border: 2px dashed #b7834e;
  border-radius: 8px;
}

.pet-card {
  overflow: hidden;
  background: #f7f2c8;
  border: 3px solid #6ca765;
  border-radius: 8px;
}

.pet-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 30px;
  padding: 4px 8px;
  background: #b9de94;
}

.pet-card strong,
.pet-card small {
  font-weight: 900;
}

.pet-card strong em {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  margin-right: 3px;
  color: #fff7df;
  font-size: 11px;
  font-style: normal;
  background: #dd8c36;
  border-radius: 999px;
}

.pet-card small {
  color: rgba(81, 57, 36, 0.72);
}

.pet-body {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 9px;
  padding: 8px;
}

.portrait {
  display: grid;
  place-items: center;
  min-height: 84px;
  overflow: hidden;
  background: #f6e8bd;
  border: 3px solid #f4e6c1;
  border-radius: 4px;
}

.portrait img {
  display: block;
  width: 96%;
  height: 96%;
  object-fit: contain;
  filter: drop-shadow(0 3px 0 rgba(64, 43, 36, 0.16));
  user-select: none;
}

.level-row {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 16px;
  font-weight: 900;
}

.meter {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 5px;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 900;
}

.meter div {
  position: relative;
  height: 13px;
  overflow: hidden;
  background: #5f5f5f;
  border-radius: 8px;
}

.meter i {
  display: block;
  height: 100%;
  background: linear-gradient(#ef7773, #be3131);
}

.meter.mana i {
  background: linear-gradient(#65c9ff, #2585c7);
}

.meter b {
  grid-column: 2;
  margin-top: -20px;
  color: #fff;
  font-size: 10px;
  font-weight: 900;
  text-align: center;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px 10px;
  padding: 0 8px 8px;
  margin: 0;
}

.stat-grid div {
  display: flex;
  justify-content: space-between;
  padding: 3px 6px;
  background: rgba(255, 255, 255, 0.45);
  border-radius: 5px;
}

.stat-grid dt,
.stat-grid dd {
  margin: 0;
  font-size: 13px;
  font-weight: 900;
}

.stat-grid div:nth-child(4) {
  grid-column: 1 / -1;
}

.stat-grid div:nth-child(4) dd {
  overflow-wrap: anywhere;
  text-align: right;
}

.pet-card.is-ember {
  border-color: #da8750;
}

.pet-card.is-ember header {
  background: #ffb58d;
}

.pet-card.is-ember strong em {
  background: #d95c2a;
}

.pet-card.is-frost {
  border-color: #63a9ba;
}

.pet-card.is-frost header {
  background: #a9dbe6;
}

.pet-card.is-frost strong em {
  background: #4b9fc2;
}

.pet-card.is-bloom {
  border-color: #c37db8;
}

.pet-card.is-bloom header {
  background: #e8b4dd;
}

.pet-card.is-bloom strong em {
  background: #c66aa9;
}

@media (max-width: 980px) {
  .expedition-grid,
  .pet-list {
    grid-template-columns: 1fr;
  }

  .expedition-page::before,
  .expedition-page::after {
    display: none;
  }
}

@media (max-width: 720px) {
  .expedition-page {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    width: 100%;
    height: 100%;
    min-height: 0;
  }

  .happy-background {
    position: fixed;
    inset: 118px 0 0;
  }

  .bg-icon {
    opacity: 0.34;
  }

  .expedition-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .animation-panel {
    height: 270px;
    min-height: 270px;
    border-width: 3px;
    border-radius: 9px;
  }

  .forest-scene {
    height: 100%;
    background-position: center;
  }

  .mission-header {
    min-height: 34px;
    padding: 6px 10px;
    font-size: 16px;
  }

  .scene-forest-picker {
    inset: 34px 0 0;
    flex-direction: column;
    gap: 7px;
    padding: 10px;
  }

  .forest-choice {
    grid-template-columns: 1fr;
    width: min(360px, 94%);
    min-height: 58px;
    padding: 8px 10px;
  }

  .forest-choice strong {
    font-size: 13px;
  }

  .forest-choice small {
    display: none;
  }

  .forest-choice span {
    font-size: 10px;
  }

  .forest-choice b {
    justify-self: start;
    min-width: 58px;
    padding: 4px 7px;
    font-size: 11px;
  }

  .expedition-api-state {
    width: min(360px, 94%);
    min-height: 58px;
    padding: 8px 10px;
  }

  .claim-reward-button {
    right: 8px;
    bottom: 58px;
    min-width: 76px;
    min-height: 28px;
    font-size: 12px;
    border-width: 2px;
  }

  .mission-footer {
    grid-template-columns: 1fr 1.1fr 1fr;
    gap: 6px;
    padding: 7px 8px 8px;
  }

  .mission-stat {
    gap: 2px;
    padding-left: 6px;
  }

  .mission-stat strong {
    font-size: 11px;
  }

  .mission-stat span {
    font-size: 10px;
  }

  .quest-progress {
    height: 12px;
    border-width: 2px;
  }

  .party-row {
    bottom: 44px;
    height: 82px;
  }

  .scene-pet-avatar {
    width: 78px;
  }

  .scene-pet:nth-child(1) {
    --walk-x: -116px;
    --gather-x: -116px;
  }

  .scene-pet:nth-child(2) {
    --walk-x: -38px;
    --gather-x: -38px;
  }

  .scene-pet:nth-child(3) {
    --walk-x: 38px;
    --gather-x: 38px;
  }

  .scene-pet:nth-child(4) {
    --walk-x: 112px;
    --gather-x: 112px;
  }

  .snack-fruit {
    bottom: 58px;
    left: 12%;
    width: 62px;
    height: 84px;
  }

  .status-panel {
    min-height: 230px;
    padding: 9px;
    border-width: 3px;
  }

  .status-panel h2 {
    font-size: 15px;
  }

  .log-sheet {
    min-height: 185px;
    padding: 34px 18px 16px;
  }

  .log-sheet h3 {
    margin-bottom: 18px;
    font-size: 16px;
  }

  .party-panel {
    margin-top: 12px;
    padding: 10px;
  }

  .party-panel h2 {
    gap: 7px;
    font-size: 16px;
  }

  .pet-list {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .pet-body {
    grid-template-columns: 84px 1fr;
  }

  .portrait {
    min-height: 80px;
  }
}
</style>

