<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { materialDefinitions } from '@cryptopets/game-content'
import { useGameApi } from '@/composables/useGameApi'
import { currentMessages, isZh } from '@/i18n'
import { getMaterialImage } from '@/content/gameAssets'

const text = computed(() => currentMessages.value.inventory)
const detailCopy: Record<string, any> = {
  title: '物品詳情',
  materialInfo: '素材資訊',
  emptyName: '空素材格',
  emptyDescription: '後端沒有回傳可用素材時，背包會保持空格；若鏈上素材尚未啟用，請以同步狀態為準。',
  stackLimit: '堆疊上限：',
  tradeHint: '交易：',
  origin: '來源：',
  syncedAt: '同步時間：',
  chainReserved: '預留給鏈上素材資料',
  noMaterialValue: '素材沒有固定價值，市場價格由上架者自行決定。',
  notSynced: '尚未同步',
  discard: '丟棄',
  use: '使用',
  sellAll: '出售',
  quantity: '數量',
  selectMaterialFirst: '請先選擇素材。',
  actionReserved: '素材操作需等待後端 API 開放，前端不會本地修改資料。',
}
Object.assign(detailCopy, {
  title: '物品詳情',
  materialInfo: '素材資訊',
  emptyName: '空素材格',
  emptyDescription: '目前沒有可用素材。完成遠征或重新同步後，素材會顯示在這裡。',
  stackLimit: '堆疊上限',
  tradeHint: '交易',
  origin: '來源',
  syncedAt: '同步時間',
  chainReserved: '鏈上素材資料',
  noMaterialValue: '素材沒有固定價值，市場價格由上架者自行決定。',
  notSynced: '尚未同步',
  discard: '丟棄',
  use: '使用',
  sellAll: '出售',
  quantity: '數量',
  selectMaterialFirst: '請先選擇素材。',
  useUnavailable: '使用功能暫時尚未開放。',
  discardSuccess: '已送出鏈上丟棄交易。',
  sellSuccess: '已放入市場 DB，請到商店頁查看掛單。',
  defaultSellPrice: 0.00000000001,
})
const shelfPageSize = 20
const selectedSlot = ref(0)
const shelfPage = ref(0)
const shelfDirection = ref<'prev' | 'next'>('next')
const shelfSwitching = ref(false)
const detailNotice = ref('')
const actionAmount = ref(1)
const {
  materialBackpack: backpack,
  operationError,
  operationLoading,
  queryError,
  queryLoading,
  resources,
  loadMarketListings,
  loadMaterialBackpack,
  loadResources,
  requestDiscardMaterial,
  requestListMarketMaterial,
} = useGameApi()
const materialDefinitionById = new Map(materialDefinitions.map((material) => [material.id, material]))
const isLoadingBackpack = computed(() => queryLoading.backpack)
const backpackError = computed(() => queryError.backpack)
const isLoadingResources = computed(() => queryLoading.resources)
const resourcesError = computed(() => queryError.resources)

const materialSlots = computed(() => {
  const inventory = backpack.value?.inventory ?? []
  return inventory
    .filter((item) => item.amount > 0)
    .map((item) => {
      const definition = materialDefinitionById.get(item.materialId)

      return {
        ...item,
        name: definition?.name ?? { zh: item.materialId, en: item.materialId },
        element: definition?.element ?? 1,
        grade: definition?.grade ?? 'D',
        description: definition?.description ?? item.materialId,
        imageUrl: getMaterialImage({
          id: item.materialId,
          element: definition?.element,
          slug: definition?.slug,
        }),
        price: 0,
      }
    })
})
const shelfTotalPages = computed(() => Math.max(1, Math.ceil(materialSlots.value.length / shelfPageSize)))
const hasPreviousShelfPage = computed(() => shelfPage.value > 0)
const hasNextShelfPage = computed(() => shelfPage.value < shelfTotalPages.value - 1)
const shelfSlots = computed(() => {
  const start = shelfPage.value * shelfPageSize
  const visibleSlots = materialSlots.value.slice(start, start + shelfPageSize)
  const emptySlotCount = Math.max(0, shelfPageSize - visibleSlots.length)

  return [...visibleSlots, ...Array.from({ length: emptySlotCount }, () => null)]
})
const selectedMaterial = computed(() => materialSlots.value[selectedSlot.value] ?? null)
const hasMaterials = computed(() => materialSlots.value.some((slot) => slot !== null))
const materialActionsEnabled = computed(() => true)
const canUseSelectedMaterial = computed(() => Boolean(selectedMaterial.value))
const maxActionAmount = computed(() => Math.max(1, selectedMaterial.value?.amount ?? 1))
const reservedActionNotice = computed(() => '')
const backpackSource = computed(() => {
  if (!backpack.value) {
    return detailCopy.chainReserved
  }

  return backpack.value.chain.enabled ? `Chain ${backpack.value.chain.chainId}` : backpack.value.source
})
const syncedAt = computed(() => {
  if (!backpack.value?.syncedAt) {
    return detailCopy.notSynced
  }

  return new Intl.DateTimeFormat(isZh.value ? 'zh-TW' : 'en', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(backpack.value.syncedAt))
})
let shelfSwitchTimer: number | undefined

function selectSlot(index: number) {
  if (!materialSlots.value[index]) {
    return
  }

  selectedSlot.value = index
  actionAmount.value = 1
  detailNotice.value = ''
}

function goShelfPage(direction: -1 | 1) {
  const nextPage = shelfPage.value + direction

  if (nextPage < 0 || nextPage >= shelfTotalPages.value) {
    return
  }

  shelfDirection.value = direction > 0 ? 'next' : 'prev'
  shelfSwitching.value = false
  shelfPage.value = nextPage

  window.clearTimeout(shelfSwitchTimer)
  window.requestAnimationFrame(() => {
    shelfSwitching.value = true
    shelfSwitchTimer = window.setTimeout(() => {
      shelfSwitching.value = false
    }, 360)
  })
}

async function loadBackpack() {
  try {
    await loadMaterialBackpack({ force: true })
    selectedSlot.value = materialSlots.value.length > 0 ? 0 : 0
    actionAmount.value = 1
    shelfPage.value = 0
  } catch {
    selectedSlot.value = 0
    actionAmount.value = 1
    shelfPage.value = 0
  }
}

function materialName(material: NonNullable<(typeof materialSlots.value)[number]>) {
  return isZh.value ? material.name.zh : material.name.en
}

function handleDetailAction(action: string) {
  if (!materialActionsEnabled.value) {
    detailNotice.value = detailCopy.actionReserved
    return
  }

  if (!selectedMaterial.value) {
    detailNotice.value = detailCopy.selectMaterialFirst
    return
  }

  const amount = Math.min(maxActionAmount.value, Math.max(1, Math.round(actionAmount.value)))
  actionAmount.value = amount
  detailNotice.value = `${action} x${amount}：${detailCopy.actionReserved}`
}

async function handleInventoryAction(action: 'discard' | 'use' | 'sell') {
  if (!selectedMaterial.value) {
    detailNotice.value = detailCopy.selectMaterialFirst
    return
  }

  const amount = Math.min(maxActionAmount.value, Math.max(1, Math.round(actionAmount.value)))
  actionAmount.value = amount

  if (action === 'use') {
    detailNotice.value = detailCopy.useUnavailable
    return
  }

  try {
    if (action === 'discard') {
      await requestDiscardMaterial(selectedMaterial.value.materialId, amount)
      detailNotice.value = detailCopy.discardSuccess
      return
    }

    await requestListMarketMaterial(selectedMaterial.value.materialId, amount, detailCopy.defaultSellPrice)
    await loadMarketListings({ force: true }).catch(() => undefined)
    detailNotice.value = detailCopy.sellSuccess
  } catch {
    detailNotice.value = action === 'discard' ? operationError.discardMaterial : operationError.listMarketMaterial
  }
}

watch(selectedMaterial, () => {
  actionAmount.value = 1
  detailNotice.value = ''
})

onMounted(() => {
  void loadMaterialBackpack().catch(() => undefined)
  void loadResources().catch(() => undefined)
})

onBeforeUnmount(() => {
  window.clearTimeout(shelfSwitchTimer)
})
</script>

<template>
  <section class="inventory-view-root" aria-labelledby="inventory-title">
    <div class="inventory-page">
      <section
        class="inventory-shelf"
        :class="[`switch-${shelfDirection}`, { 'is-switching': shelfSwitching }]"
        :data-page="shelfPage"
        :aria-label="text.gridLabel"
      >
        <div v-if="isLoadingBackpack || backpackError || !hasMaterials" class="inventory-state" aria-live="polite">
          <strong v-if="isLoadingBackpack">{{ text.loading }}</strong>
          <template v-else-if="backpackError">
            <strong>{{ text.loadFailed }}</strong>
            <span>{{ backpackError }}</span>
            <button type="button" @click="loadBackpack">{{ text.retry }}</button>
          </template>
          <template v-else>
            <strong>{{ text.emptyName }}</strong>
            <span>{{ text.emptyDescription }}</span>
          </template>
        </div>

        <button
          v-if="hasPreviousShelfPage"
          class="shelf-nav shelf-nav-prev"
          type="button"
          aria-label="Previous material page"
          @click="goShelfPage(-1)"
        >
          <FontAwesomeIcon icon="chevron-left" aria-hidden="true" />
        </button>

        <button
          v-for="(material, index) in shelfSlots"
          :key="material ? material.materialId : `empty-${shelfPage}-${index}`"
          class="material-slot"
          :class="{ selected: selectedSlot === shelfPage * shelfPageSize + index, filled: material }"
          type="button"
          :disabled="!material"
          :aria-label="material ? materialName(material) : `${text.emptySlot} ${shelfPage * shelfPageSize + index + 1}`"
          @click="selectSlot(shelfPage * shelfPageSize + index)"
        >
          <template v-if="material">
            <span class="grade-corner" :class="`grade-${material.grade.toLowerCase()}`">{{ material.grade }}</span>
            <img class="material-image" :src="material.imageUrl" :alt="materialName(material)" draggable="false" />
            <strong>{{ materialName(material) }}</strong>
            <small>x{{ material.amount }}</small>
          </template>
          <span v-else class="slot-placeholder" aria-hidden="true"></span>
        </button>

        <button
          v-if="hasNextShelfPage"
          class="shelf-nav shelf-nav-next"
          type="button"
          aria-label="Next material page"
          @click="goShelfPage(1)"
        >
          <FontAwesomeIcon icon="chevron-right" aria-hidden="true" />
        </button>

        <div class="shelf-page-indicator" aria-live="polite">{{ shelfPage + 1 }} / {{ shelfTotalPages }}</div>
      </section>

      <aside class="inventory-detail" aria-labelledby="inventory-detail-title">
        <header>
          <h2 id="inventory-detail-title">{{ detailCopy.title }}</h2>
        </header>

        <section class="detail-body">
          <h3>{{ detailCopy.materialInfo }}</h3>
          <div class="detail-empty-slot" :class="{ filled: selectedMaterial }" aria-hidden="true">
            <img v-if="selectedMaterial" class="material-image large" :src="selectedMaterial.imageUrl" :alt="materialName(selectedMaterial)" draggable="false" />
            <span v-else></span>
          </div>
          <strong>{{ selectedMaterial ? materialName(selectedMaterial) : detailCopy.emptyName }}</strong>
          <p>{{ selectedMaterial?.description ?? detailCopy.emptyDescription }}</p>

          <dl>
            <div>
              <dt>{{ detailCopy.stackLimit }}</dt>
              <dd>{{ selectedMaterial?.amount ?? 0 }} / 99</dd>
            </div>
            <div>
              <dt>{{ detailCopy.tradeHint }}</dt>
              <dd>{{ detailCopy.noMaterialValue }}</dd>
            </div>
            <div>
              <dt>{{ detailCopy.origin }}</dt>
              <dd>{{ backpackSource }}</dd>
            </div>
            <div>
              <dt>{{ detailCopy.syncedAt }}</dt>
              <dd>{{ syncedAt }}</dd>
            </div>
          </dl>
          <label class="detail-quantity">
            <span>{{ detailCopy.quantity }}</span>
            <input
              v-model.number="actionAmount"
              type="number"
              min="1"
              :max="maxActionAmount"
              step="1"
              :disabled="!canUseSelectedMaterial"
            />
            <small>/ {{ maxActionAmount }}</small>
          </label>
        </section>

        <p v-if="detailNotice || reservedActionNotice" class="detail-notice" aria-live="polite">
          {{ detailNotice || reservedActionNotice }}
        </p>

        <footer>
          <button
            type="button"
            :disabled="!canUseSelectedMaterial || operationLoading.discardMaterial"
            @click="handleInventoryAction('discard')"
          >
            {{ detailCopy.discard }}
          </button>
          <button type="button" :disabled="!canUseSelectedMaterial" @click="handleInventoryAction('use')">
            {{ detailCopy.use }}
          </button>
          <button
            type="button"
            :disabled="!canUseSelectedMaterial || operationLoading.listMarketMaterial"
            @click="handleInventoryAction('sell')"
          >
            {{ detailCopy.sellAll }}
          </button>
        </footer>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.inventory-view-root {
  width: 100%;
  height: 100%;
  min-width: 0;
}

.inventory-page {
  position: relative;
  display: grid;
  grid-template-columns: minmax(620px, 860px) minmax(300px, 360px);
  gap: 12px 16px;
  width: min(1250px, calc(100% - 112px));
  height: 100%;
  min-height: 0;
  margin: 0 auto;
  color: #4d241d;
  font-family: 'Trebuchet MS', Verdana, 'Microsoft JhengHei', sans-serif;
}

.inventory-header {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  min-height: 54px;
  padding: 0 4px;
}

.inventory-header h1 {
  margin: 0;
  min-width: 0;
  color: #6a321c;
  font-size: 30px;
  font-weight: 1000;
  line-height: 1.05;
  text-shadow:
    1.4px 0 #fff7df,
    -1.4px 0 #fff7df,
    0 1px #fff7df,
    0 -1px #fff7df;
}

.inventory-shelf {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(5, minmax(0, 1fr));
  align-items: stretch;
  gap: 10px;
  align-self: stretch;
  min-height: 0;
  padding: 22px 34px 13px;
  overflow: visible;
  background:
    linear-gradient(90deg, #6f3f22 0 8px, transparent 8px calc(100% - 8px), #6f3f22 calc(100% - 8px)),
    linear-gradient(90deg, transparent 0 calc(25% - 3px), rgba(83, 45, 24, 0.72) calc(25% - 3px) calc(25% + 3px), transparent calc(25% + 3px)),
    linear-gradient(90deg, transparent 0 calc(50% - 3px), rgba(83, 45, 24, 0.72) calc(50% - 3px) calc(50% + 3px), transparent calc(50% + 3px)),
    linear-gradient(90deg, transparent 0 calc(75% - 3px), rgba(83, 45, 24, 0.72) calc(75% - 3px) calc(75% + 3px), transparent calc(75% + 3px)),
    linear-gradient(180deg, transparent 0 calc(25% - 3px), rgba(83, 45, 24, 0.76) calc(25% - 3px) calc(25% + 3px), transparent calc(25% + 3px)),
    linear-gradient(180deg, transparent 0 calc(50% - 3px), rgba(83, 45, 24, 0.76) calc(50% - 3px) calc(50% + 3px), transparent calc(50% + 3px)),
    linear-gradient(180deg, transparent 0 calc(75% - 3px), rgba(83, 45, 24, 0.76) calc(75% - 3px) calc(75% + 3px), transparent calc(75% + 3px)),
    repeating-linear-gradient(90deg, rgba(255, 224, 150, 0.08) 0 2px, transparent 2px 26px),
    linear-gradient(#a1663a, #7f4727);
  border: 5px solid #5b311a;
  border-radius: 8px;
  box-shadow:
    inset 0 0 0 3px #bd8654,
    inset 0 0 18px rgba(61, 31, 16, 0.5),
    0 3px 0 rgba(79, 45, 23, 0.24);
}

.shelf-nav {
  position: absolute;
  top: 26%;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 82px;
  color: #fff7df;
  cursor: pointer;
  background: linear-gradient(#b97843, #8f552e);
  border: 5px solid #6e3d23;
  border-radius: 14px;
  box-shadow:
    inset 0 0 0 3px rgba(255, 225, 166, 0.45),
    0 4px 0 rgba(55, 33, 23, 0.24);
  transform: translateY(-50%);
}

.shelf-nav svg {
  font-size: 35px;
  filter: drop-shadow(0 2px 0 rgba(74, 43, 25, 0.55));
}

.shelf-nav-prev {
  left: -33px;
}

.shelf-nav-next {
  right: -33px;
}

.material-slot {
  position: relative;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
  padding: 6px 8px 7px;
  overflow: hidden;
  cursor: pointer;
  background: rgba(255, 216, 137, 0.42);
  border: 4px solid #6e3d23;
  border-radius: 10px;
  box-shadow:
    inset 0 0 0 2px #fff8de,
    0 3px 0 rgba(55, 33, 23, 0.22);
}

.material-slot:disabled {
  cursor: default;
}

.material-slot.filled {
  grid-template-rows: 1fr auto auto;
  gap: 4px;
  background: linear-gradient(#fff1c8, #ffd889);
}

.material-slot strong,
.material-slot small {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  color: #4d2d1d;
  font-weight: 1000;
  line-height: 1.05;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.material-slot strong {
  font-size: 15px;
}

.material-slot small {
  color: #fff7df;
  font-size: 13px;
  text-shadow: 1px 1px 0 #4d2d1d;
}

.inventory-shelf.is-switching .material-slot {
  animation: shelf-card-next 320ms ease both;
}

.inventory-shelf.is-switching.switch-prev .material-slot {
  animation-name: shelf-card-prev;
}

.material-slot.selected {
  outline: 4px solid rgba(248, 211, 95, 0.86);
  outline-offset: -2px;
}

.slot-placeholder {
  display: block;
  width: min(58px, 58%);
  aspect-ratio: 1;
  opacity: 0.66;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.1), transparent 44%),
    rgba(111, 83, 58, 0.72);
  border: 3px dashed rgba(255, 239, 192, 0.75);
  border-radius: 8px;
}

.inventory-state {
  position: absolute;
  inset: 20px 32px 12px;
  z-index: 2;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 9px;
  padding: 18px;
  color: #fff7df;
  text-align: center;
  pointer-events: none;
  background: rgba(85, 48, 26, 0.82);
  border: 4px solid rgba(255, 239, 192, 0.7);
  border-radius: 8px;
}

.inventory-state strong {
  font-size: 22px;
  font-weight: 1000;
}

.inventory-state span {
  max-width: 430px;
  font-size: 14px;
  font-weight: 900;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.inventory-state button {
  min-width: 104px;
  min-height: 36px;
  color: #6a321c;
  font-size: 15px;
  font-weight: 1000;
  cursor: pointer;
  pointer-events: auto;
  background: linear-gradient(#ffe794, #f7b746);
  border: 3px solid #b8702b;
  border-radius: 8px;
}

.shelf-page-indicator {
  position: absolute;
  right: 18px;
  bottom: 12px;
  z-index: 4;
  min-width: 58px;
  padding: 4px 10px 5px;
  color: #fff7df;
  font-size: 15px;
  font-weight: 1000;
  line-height: 1;
  text-align: center;
  background: #5b311a;
  border: 3px solid #bd8654;
  border-radius: 999px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 2px 0 rgba(55, 33, 23, 0.25);
}

.inventory-detail {
  display: grid;
  grid-template-rows: .1fr 10fr .1fr;
  min-height: 0;
  overflow: hidden;
  color: #4d241d;
  background: #a76438;
  border: 5px solid #6a351f;
  border-radius: 8px;
  box-shadow:
    inset 0 0 0 3px rgba(255, 218, 152, 0.24),
    0 3px 0 rgba(72, 41, 24, 0.22);
}

.inventory-detail header {
  display: grid;
  place-items: center;
  min-height: 42px;
  padding: 6px 14px;
  text-align: center;
  background:
    linear-gradient(90deg, rgba(255, 218, 152, 0.16) 0 2px, transparent 2px 26px),
    linear-gradient(#c08856, #9e633a);
  border-bottom: 4px solid #6a351f;
}

.inventory-detail h2,
.detail-body h3,
.detail-body strong,
.detail-body p,
.detail-body dl {
  margin: 0;
}

.inventory-detail h2 {
  color: #4b241d;
  font-size: 20px;
  font-weight: 1000;
  line-height: 1.2;
  text-shadow: none;
}

.detail-body {
  display: grid;
  grid-template-columns: 94px minmax(0, 1fr);
  grid-template-areas:
    'title title'
    'icon name'
    'icon copy'
    'meta meta'
    'quantity quantity';
  align-content: start;
  gap: 9px 12px;
  min-height: 0;
  margin: 10px 10px 0;
  padding: 10px;
  overflow-y: auto;
  scrollbar-color: #9e633a #fff3ca;
  scrollbar-width: thin;
  text-align: left;
  background: #fff3ca;
  border: 4px solid #6a351f;
  border-radius: 7px;
}

.detail-body::-webkit-scrollbar {
  width: 10px;
}

.detail-body::-webkit-scrollbar-track {
  background: #fff3ca;
  border-radius: 999px;
}

.detail-body::-webkit-scrollbar-thumb {
  background: #9e633a;
  border: 2px solid #fff3ca;
  border-radius: 999px;
}

.detail-body h3 {
  grid-area: title;
  width: 100%;
  min-height: 34px;
  padding: 6px 10px;
  color: #4b241d;
  font-size: 17px;
  font-weight: 1000;
  text-align: center;
  background: linear-gradient(#efbd74, #d8934e);
  border: 3px solid #7a421f;
  border-radius: 7px;
}

.detail-empty-slot {
  grid-area: icon;
  display: grid;
  place-items: center;
  width: 92px;
  aspect-ratio: 1;
  background: #e3a061;
  border: 3px solid #7a421f;
  border-radius: 7px;
}

.detail-empty-slot span {
  width: 54px;
  aspect-ratio: 1;
  opacity: 0.66;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.1), transparent 44%),
    rgba(111, 83, 58, 0.72);
  border: 3px dashed rgba(255, 239, 192, 0.75);
  border-radius: 8px;
}

.detail-empty-slot.filled {
  background: #fff1c8;
}

.grade-corner {
  position: absolute;
  top: -2px;
  right: -2px;
  display: grid;
  width: 31px;
  height: 31px;
  padding: 5px 0 0 10px;
  color: #fff7df;
  font-size: 10px;
  font-weight: 1000;
  line-height: 1;
  background: #8a4a25;
  border: 2px solid #6e3d23;
  border-radius: 0 6px 0 18px;
  place-items: start end;
}

.grade-a {
  background: #c75f4c;
}

.grade-b {
  background: #2f7180;
}

.grade-c {
  background: #6f8b41;
}

.grade-d {
  background: #7b5b3a;
}

.material-icon,
.material-image {
  display: block;
  justify-self: center;
  width: min(54px, 58%);
  aspect-ratio: 1;
  object-fit: contain;
  background: #e7a23f;
  border: 3px solid rgba(255, 247, 223, 0.78);
  border-radius: 8px;
  box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.24);
}

.material-icon.large,
.material-image.large {
  width: 66px;
  height: 66px;
}

.material-1 {
  background: linear-gradient(135deg, #f7c75b, #e78433);
  border-radius: 50% 46% 52% 48%;
}

.material-2 {
  background: linear-gradient(135deg, #9dd36a, #3f9850);
  border-radius: 12px 26px 12px 26px;
}

.material-3 {
  background: linear-gradient(135deg, #b7e4ef, #559fb8);
}

.material-4 {
  background: linear-gradient(135deg, #efb3d8, #b86aa2);
  border-radius: 50%;
}

.detail-body strong {
  grid-area: name;
  align-self: end;
  color: #241a18;
  font-size: 23px;
  font-weight: 1000;
  line-height: 1.05;
}

.detail-body p {
  grid-area: copy;
  max-width: none;
  min-height: 68px;
  padding: 6px 8px;
  color: #4b241d;
  font-size: 14px;
  font-weight: 900;
  line-height: 1.35;
  overflow-wrap: anywhere;
  background: rgba(200, 232, 158, 0.62);
  border-radius: 6px;
}

.detail-body dl {
  grid-area: meta;
  display: grid;
  /* grid-template-columns: repeat(2, minmax(0, 1fr)); */
  gap: 7px;
  width: 100%;
  padding-top: 4px;
  text-align: left;
  border-top: 0;
}

.detail-notice {
  align-self: end;
  min-height: 44px;
  margin: 10px 14px 0;
  padding: 9px 10px;
  color: #26582b;
  font-size: 13px;
  font-weight: 1000;
  line-height: 1.35;
  text-align: center;
  overflow-wrap: anywhere;
  background: rgba(200, 232, 158, 0.62);
  border: 2px solid rgba(111, 139, 65, 0.42);
  border-radius: 6px;
}

.detail-quantity {
  grid-area: quantity;
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-height: 38px;
  padding: 6px 8px;
  color: #4b241d;
  font-size: 13px;
  font-weight: 1000;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 6px;
}

.detail-quantity input {
  min-width: 0;
  width: 100%;
  height: 28px;
  padding: 2px 8px;
  color: #4b241d;
  font: inherit;
  background: #fff8de;
  border: 2px solid #b8702b;
  border-radius: 6px;
}

.detail-quantity input:disabled {
  color: rgba(75, 36, 29, 0.52);
  background: rgba(255, 255, 255, 0.42);
  border-color: rgba(106, 53, 31, 0.35);
}

.detail-quantity small {
  white-space: nowrap;
}

.detail-body dl div {
  display: grid;
  grid-template-columns: 82px 1fr;
  gap: 8px;
  align-items: baseline;
  min-height: 36px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 6px;
}

.detail-body dt,
.detail-body dd {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-size: 13px;
  font-weight: 1000;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-body dd {
  overflow-wrap: anywhere;
  white-space: normal;
}

.inventory-detail footer {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 10px;
  padding: 8px;
  background: #fff3ca;
  border: 4px solid #6a351f;
  border-radius: 7px;
}

.inventory-detail footer button {
  min-width: 0;
  min-height: 42px;
  color: #6a321c;
  font-size: 15px;
  font-weight: 1000;
  cursor: pointer;
  background: linear-gradient(#ffe794, #f7b746);
  border: 3px solid #b8702b;
  border-radius: 8px;
  opacity: 1;
}

.inventory-detail footer button:hover {
  filter: brightness(1.04);
  transform: translateY(-1px);
}

.inventory-detail footer button:disabled {
  cursor: not-allowed;
  filter: grayscale(0.35);
  opacity: 0.55;
  transform: none;
}

.inventory-detail footer button:disabled:hover {
  filter: grayscale(0.35);
  transform: none;
}

.inventory-detail footer button:first-child {
  color: #fff7df;
  background: linear-gradient(#d46d52, #b54a38);
  border-color: #7a3f2a;
}

.inventory-detail footer button:nth-child(2) {
  color: #26582b;
  background: linear-gradient(#c8e89e, #7fc165);
  border-color: #6f8b41;
}

@keyframes shelf-card-next {
  from {
    opacity: 0;
    transform: translateX(28px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@keyframes shelf-card-prev {
  from {
    opacity: 0;
    transform: translateX(-28px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@media (min-width: 1200px) {
  .inventory-shelf {
    min-height: 620px;
  }
}

@media (min-width: 768px) and (max-width: 1199px) {
  .inventory-page {
    grid-template-columns: 1fr;
    width: min(760px, calc(100% - 72px));
    overflow: hidden;
  }

  .inventory-shelf {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-template-rows: repeat(5, minmax(104px, 1fr));
    min-height: 0;
    padding: 22px 34px 18px;
  }

  .inventory-detail {
    display: none;
  }
}

@media (max-width: 767px) {
  .inventory-page {
    width: 100%;
    gap: 10px;
    padding-bottom: 76px;
    overflow: hidden;
  }

  .inventory-header {
    min-height: 48px;
    padding: 0 4px;
  }

  .inventory-header h1 {
    font-size: 22px;
  }

  .inventory-shelf {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-template-rows: repeat(5, minmax(70px, 1fr));
    gap: 8px;
    min-height: auto;
    padding: 16px 18px 42px;
    border-width: 3px;
  }

  .material-slot {
    min-height: 70px;
    padding: 4px;
    border-width: 3px;
  }

  .material-slot strong {
    font-size: 10px;
  }

  .material-slot small {
    font-size: 10px;
  }

  .slot-placeholder {
    width: min(50px, 64%);
    border-width: 2px;
  }

  .inventory-state {
    inset: 16px 18px 42px;
  }

  .inventory-detail {
    display: none;
  }

  .shelf-page-indicator {
    right: 50%;
    bottom: 10px;
    min-width: 52px;
    font-size: 13px;
    transform: translateX(50%);
  }

  .shelf-nav {
    width: 42px;
    height: 58px;
    border-width: 4px;
  }

  .shelf-nav-prev {
    left: -18px;
  }

  .shelf-nav-next {
    right: -18px;
  }
}
</style>
