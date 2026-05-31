<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { goodies } from '@/data/goodies'
import { pets, type Pet } from '@/data/pets'
import { useGameApi } from '@/composables/useGameApi'
import { expeditionTeamIds, isPetInExpeditionTeam, maxTeamSlots, setExpeditionTeamSlot } from '@/state/expeditionTeam'
import { availableSkillPoints, spendSkillPoint } from '@/state/testProgress'
import { currentMessages, isZh } from '@/i18n'
import { petImages } from '@/content/gameAssets'

const maxPetSlots = 20
const localPets = ref<Pet[]>(pets.map((pet) => ({
  ...pet,
  stats: { ...pet.stats },
  exp: { ...pet.exp },
})))
const {
  friends,
  operationError,
  operationLoading,
  queryError,
  queryLoading,
  loadFriends,
  loadPlayerProfile,
  requestAddFriend,
} = useGameApi()
const selectedPetId = ref(localPets.value[0]?.id ?? '')
const activeTeamSlotIndex = ref<number | null>(null)
const petFilterMode = ref<'all' | 'team' | 'available' | 'level'>('all')
const skillLevels = ref([1, 1])
const nurtureMessage = ref('')
const friendWallet = ref('')

const elementLabel: Record<Pet['element'], { zh: string; en: string; mark: string }> = {
  citrus: { zh: '柑橘', en: 'Citrus', mark: 'C' },
  ember: { zh: '火花', en: 'Ember', mark: 'E' },
  frost: { zh: '冰霜', en: 'Frost', mark: 'F' },
  bloom: { zh: '花園', en: 'Bloom', mark: 'B' },
}

const breakthroughMaterials = [
  { id: 'MAT-2C', count: 3 },
  { id: 'MAT-4B', count: 1 },
]

const text = computed(() => ({
  ...currentMessages.value.pets,
  teamTitle: isZh.value
    ? `${currentMessages.value.pets.teamTitle}（${maxTeamSlots} 格）`
    : `${currentMessages.value.pets.teamTitle} (${maxTeamSlots} slots)`,
}))

const selectedPet = computed(() => localPets.value.find((pet) => pet.id === selectedPetId.value) ?? localPets.value[0])
const visiblePets = computed(() => {
  const sortedPets = [...localPets.value]

  if (petFilterMode.value === 'team') {
    return sortedPets.filter((pet) => isPetInExpeditionTeam(pet.id))
  }

  if (petFilterMode.value === 'available') {
    return sortedPets.filter((pet) => !isPetInExpeditionTeam(pet.id))
  }

  if (petFilterMode.value === 'level') {
    return sortedPets.sort((petA, petB) => petLevel(petB) - petLevel(petA))
  }

  return sortedPets
})
const teamSlots = computed<(Pet | null)[]>(() => {
  const teamPets = expeditionTeamIds.value.map((id) => localPets.value.find((pet) => pet.id === id) ?? null)

  return [...teamPets, ...Array.from({ length: Math.max(0, maxTeamSlots - teamPets.length) }, () => null)]
})
const petSlots = computed<(Pet | null)[]>(() => [
  ...visiblePets.value,
  ...Array.from({ length: Math.max(0, maxPetSlots - visiblePets.value.length) }, () => null),
])
const breakthroughRows = computed(() =>
  breakthroughMaterials.map((requirement) => ({
    ...requirement,
    goodie: goodies.find((goodie) => goodie.id === requirement.id),
  })),
)
const canStageBreakthrough = computed(() => {
  const pet = selectedPet.value

  return Boolean(pet && pet.stage < 3 && petLevel(pet) >= breakthroughRequiredLevel.value && pet.exp.current >= pet.exp.next)
})
const breakthroughRequiredLevel = computed(() => {
  const pet = selectedPet.value

  return pet ? pet.stage * 10 + 4 : 0
})
const selectedIntro = computed(() => {
  const pet = selectedPet.value

  if (!pet) {
    return ''
  }

  const elementName = isZh.value ? elementLabel[pet.element].zh : elementLabel[pet.element].en

  return isZh.value
    ? `${pet.name} 是一隻 ${elementName} 水豚，適合穩定遠征、收集素材與支援隊伍。`
    : `${pet.name} is a ${elementName.toLowerCase()} capybara built for steady adventures, material gathering, and team support.`
})
const skillRows = computed(() => [
  { name: text.value.napAttack, value: isZh.value ? '降低疲勞，提升續航。' : 'Reduces fatigue and improves sustain.', points: skillLevels.value[0] ?? 0, max: 5 },
  { name: text.value.bash, value: isZh.value ? '造成穩定衝撞傷害。' : 'Deals steady bash damage.', points: skillLevels.value[1] ?? 0, max: 5 },
])

const slotHint = computed(() => {
  if (activeTeamSlotIndex.value === null) {
    return isZh.value ? '未選格位' : 'No slot'
  }

  return isZh.value ? `第 ${activeTeamSlotIndex.value + 1} 格` : `Slot ${activeTeamSlotIndex.value + 1}`
})
const filterLabel = computed(() => {
  if (petFilterMode.value === 'team') {
    return isZh.value ? '只看隊伍' : 'Team only'
  }

  if (petFilterMode.value === 'available') {
    return isZh.value ? '只看可派遣' : 'Available'
  }

  if (petFilterMode.value === 'level') {
    return isZh.value ? '等級排序' : 'Level high'
  }

  return text.value.filterSort
})
const isPetProfileLoading = computed(() => queryLoading.player)
const petProfileError = computed(() => queryError.player)
const isFriendsLoading = computed(() => queryLoading.friends)
const friendsError = computed(() => queryError.friends || operationError.addFriend)

function petLevel(pet: Pet) {
  return pet.level
}

function selectPet(pet: Pet) {
  selectedPetId.value = pet.id
}

function selectTeamSlot(index: number, pet?: Pet | null) {
  activeTeamSlotIndex.value = activeTeamSlotIndex.value === index ? null : index

  if (pet) {
    selectedPetId.value = pet.id
  }
}

function assignPetToActiveSlot(pet: Pet) {
  if (activeTeamSlotIndex.value === null) {
    selectPet(pet)
    return
  }

  setExpeditionTeamSlot(activeTeamSlotIndex.value, pet.id)
  selectedPetId.value = pet.id
  activeTeamSlotIndex.value = null
}

function cyclePetFilter() {
  const modes: Array<typeof petFilterMode.value> = ['all', 'team', 'available', 'level']
  const nextIndex = (modes.indexOf(petFilterMode.value) + 1) % modes.length
  petFilterMode.value = modes[nextIndex] ?? 'all'
}

function addSkillPoint(skillIndex: number) {
  const currentLevel = skillLevels.value[skillIndex] ?? 0

  if (availableSkillPoints.value <= 0 || currentLevel >= 5) {
    nurtureMessage.value = isZh.value ? '沒有可用技能點。' : 'No skill points available.'
    return
  }

  if (!spendSkillPoint()) {
    nurtureMessage.value = isZh.value ? '沒有可用技能點。' : 'No skill points available.'
    return
  }

  skillLevels.value = skillLevels.value.map((level, index) => (index === skillIndex ? level + 1 : level))
  nurtureMessage.value = isZh.value ? '技能已升級。' : 'Skill upgraded.'
}

function confirmBreakthrough() {
  const pet = selectedPet.value

  if (!pet || !canStageBreakthrough.value) {
    nurtureMessage.value = isZh.value ? '尚未達成進階條件。' : 'Advance requirements are not met.'
    return
  }

  pet.stage += 1
  pet.exp.current = 0
  pet.exp.next += 300
  pet.stats.maxHp += 12
  pet.stats.hp = pet.stats.maxHp
  pet.stats.atk += 6
  pet.stats.def += 5
  nurtureMessage.value = isZh.value ? '進階完成。' : 'Advance complete.'
}
function syncLocalPetsFromApi() {
  localPets.value = pets.map((pet) => ({
    ...pet,
    stats: { ...pet.stats },
    exp: { ...pet.exp },
  }))
  selectedPetId.value = localPets.value[0]?.id ?? ''
}

async function retryPlayerProfile() {
  try {
    await loadPlayerProfile()
  } catch {
    // Error text is rendered from queryError.player.
  } finally {
    syncLocalPetsFromApi()
  }
}

async function submitFriendRequest() {
  const wallet = friendWallet.value.trim()

  if (!wallet) {
    return
  }

  try {
    await requestAddFriend(wallet)
    friendWallet.value = ''
  } catch {
    // Error text is rendered from operationError.addFriend.
  }
}

onMounted(() => {
  void retryPlayerProfile()
  void loadFriends()
})
</script>

<template>
  <section class="pet-page">
    <section class="team-panel">
      <header class="wood-title">
        <h1>{{ text.teamTitle }}</h1>
      </header>

      <div class="team-card">
        <div class="team-heading">
          <strong>{{ text.expeditionTeam }}</strong>
          <span>{{ expeditionTeamIds.length }} / {{ maxTeamSlots }}</span>
        </div>

        <div class="team-slots">
          <button
            v-for="(pet, index) in teamSlots"
            :key="pet?.id ?? `empty-${index}`"
            class="team-slot"
            :class="{ filled: pet, active: index === activeTeamSlotIndex }"
            type="button"
            @click="selectTeamSlot(index, pet)"
          >
            <template v-if="pet">
              <img :src="petImages[pet.id]" :alt="pet.name" draggable="false" />
              <span class="team-pet-name">{{ pet.name }}</span>
              <span v-if="index === 0" class="team-leader-badge">{{ text.leader }}</span>
            </template>
            <i v-else aria-hidden="true">+</i>
          </button>
        </div>
      </div>

      <div class="filter-row">
        <button type="button" @click="cyclePetFilter">{{ filterLabel }}</button>
        <span class="slot-hint">{{ slotHint }}</span>
      </div>

      <div v-if="isPetProfileLoading || petProfileError || localPets.length === 0" class="pet-api-state" aria-live="polite">
        <strong v-if="isPetProfileLoading">{{ isZh ? '載入寵物中...' : 'Loading pets...' }}</strong>
        <template v-else-if="petProfileError">
          <strong>{{ isZh ? '寵物載入失敗' : 'Pet load failed' }}</strong>
          <span>{{ petProfileError }}</span>
          <button type="button" @click="retryPlayerProfile">{{ isZh ? '重試' : 'Retry' }}</button>
        </template>
        <template v-else>
          <strong>{{ text.emptyPet }}</strong>
          <span>{{ isZh ? '目前沒有後端寵物資料。' : 'No backend pets are available yet.' }}</span>
          <button type="button" @click="retryPlayerProfile">{{ isZh ? '重新整理' : 'Refresh' }}</button>
        </template>
      </div>

      <div class="pet-grid">
        <button
          v-for="(pet, index) in petSlots"
          :key="pet?.id ?? `pet-empty-${index}`"
          class="pet-tile"
          :class="{ selected: pet?.id === selectedPet?.id, teamed: pet && isPetInExpeditionTeam(pet.id), empty: !pet }"
          type="button"
          :disabled="!pet"
          @click="pet && assignPetToActiveSlot(pet)"
        >
          <template v-if="pet">
            <span class="element-badge">{{ elementLabel[pet.element].mark }}</span>
            <img :src="petImages[pet.id]" :alt="pet.name" draggable="false" />
            <strong>{{ pet.name }}</strong>
            <small>{{ text.level }} {{ petLevel(pet) }}</small>
          </template>
          <template v-else>
            <span class="empty-pet-slot" aria-hidden="true"></span>
            <strong>{{ text.emptyPet }}</strong>
          </template>
        </button>
      </div>
    </section>

    <section class="nurture-panel">
      <header class="wood-title">
        <h2>{{ text.stationTitle }}</h2>
      </header>

      <div v-if="!selectedPet" class="no-selected-pet">
        {{ isZh ? '尚未選擇任一寵物' : 'No pet selected' }}
      </div>

      <article v-if="selectedPet" class="pet-detail">
        <div class="detail-portrait">
          <img :src="petImages[selectedPet.id]" :alt="selectedPet.name" draggable="false" />
        </div>

        <div class="detail-main">
          <div class="detail-heading">
            <h3>{{ selectedPet.name }}</h3>
            <strong>{{ text.level }} {{ petLevel(selectedPet) }}</strong>
          </div>

          <div class="stat-meter hp">
            <span>HP:</span>
            <div><i :style="{ width: `${(selectedPet.stats.hp / selectedPet.stats.maxHp) * 100}%` }"></i></div>
            <b>{{ selectedPet.stats.hp }}/{{ selectedPet.stats.maxHp }}</b>
          </div>
          <div class="stat-meter exp">
            <span>EXP:</span>
            <div><i :style="{ width: `${(selectedPet.exp.current / selectedPet.exp.next) * 100}%` }"></i></div>
            <b>{{ selectedPet.exp.current }}/{{ selectedPet.exp.next }}</b>
          </div>
        </div>
      </article>

      <div v-if="selectedPet" class="nurture-grid">
        <section v-if="selectedPet" class="nurture-card preview-card">
          <h3>{{ text.intro }}</h3>
          <div class="info-content">
            <div class="info-copy">
              <p>{{ selectedIntro }}</p>
              <dl>
                <div>
                  <dt>{{ text.token }}</dt>
                  <dd>{{ selectedPet.id }}</dd>
                </div>
                <div>
                  <dt>{{ text.element }}</dt>
                  <dd>{{ isZh ? elementLabel[selectedPet.element].zh : elementLabel[selectedPet.element].en }}</dd>
                </div>
                <div>
                  <dt>{{ text.stage }}</dt>
                  <dd>{{ selectedPet.stage }}</dd>
                </div>
              </dl>
            </div>
          </div>
          <div class="intro-animation">{{ text.animation }}</div>
        </section>

        <section class="nurture-card team-skill-card">
          <h3>{{ isZh ? '隊長技' : 'Team Skill' }}</h3>

          <div class="upgrade-section leader-skill">
            <strong>{{ isZh ? '柚子療癒' : 'Yuzu Recovery' }}</strong>
            <p>{{ isZh ? '隊伍全體 HP 恢復效果提升 10%。' : 'Increases party HP recovery effects by 10%.' }}</p>
          </div>

        </section>

        <section class="nurture-card upgrade-card">
          <h3>{{ text.upgrade }}</h3>

          <div class="upgrade-section skill-upgrade">
            <h4>{{ text.skillUpgrade }} <span>{{ text.skillPoints }}: {{ availableSkillPoints }}</span></h4>
            <article v-for="(skill, index) in skillRows" :key="skill.name" class="skill-point-row">
              <div>
                <strong>{{ skill.name }}</strong>
                <span>{{ skill.value }}</span>
              </div>
              <strong class="skill-level-badge">{{ skill.points }} / {{ skill.max }}</strong>
              <button type="button" :disabled="availableSkillPoints <= 0 || skill.points >= skill.max" @click="addSkillPoint(index)">
                {{ text.addPoint }}
              </button>
            </article>
            <p v-if="nurtureMessage" class="nurture-message">{{ nurtureMessage }}</p>
          </div>

          <div class="upgrade-section upgrade-breakthrough">
            <h4>
              {{ isZh ? '進階' : 'Advance' }}
              <span :class="{ ready: canStageBreakthrough }">
                {{ canStageBreakthrough ? text.breakthroughReady : text.breakthroughLocked }}
              </span>
            </h4>
            <div class="material-list advance-list">
              <p v-if="selectedPet" class="breakthrough-requirement">
                {{ isZh ? `需要 ${text.level}${breakthroughRequiredLevel} 且經驗值滿` : `Requires ${text.level} ${breakthroughRequiredLevel} and full EXP` }}
              </p>
              <article v-for="row in breakthroughRows" :key="row.id">
                <div class="material-image" aria-hidden="true"></div>
                <span>{{ row.goodie ? (isZh ? row.goodie.name.zh : row.goodie.name.en) : row.id }}</span>
                <strong>x{{ row.count }}</strong>
              </article>
            </div>
            <button class="breakthrough-button" type="button" :disabled="!canStageBreakthrough" @click="confirmBreakthrough">
              {{ isZh ? '確認進階' : 'Confirm Advance' }}
            </button>
          </div>
        </section>

      </div>
    </section>
  </section>
</template>

<style scoped>
.pet-page {
  display: grid;
  grid-template-columns: minmax(390px, 0.9fr) minmax(540px, 1.35fr);
  gap: 16px;
  width: min(1500px, 100%);
  height: 100%;
  margin: 0 auto;
  color: #4b241d;
  font-family: 'Trebuchet MS', Verdana, 'Microsoft JhengHei', sans-serif;
}

.team-panel,
.nurture-panel {
  min-height: 0;
  overflow: hidden;
  background: #a76438;
  border: 5px solid #6a351f;
  border-radius: 8px;
  box-shadow:
    inset 0 0 0 3px rgba(255, 218, 152, 0.24),
    0 3px 0 rgba(72, 41, 24, 0.22);
}

.wood-title {
  min-height: 42px;
  padding: 6px 14px;
  text-align: center;
  background:
    linear-gradient(90deg, rgba(255, 218, 152, 0.16) 0 2px, transparent 2px 26px),
    linear-gradient(#c08856, #9e633a);
  border-bottom: 4px solid #6a351f;
}

.wood-title h1,
.wood-title h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 1000;
  line-height: 1.2;
}

.team-card {
  margin: 10px;
  padding: 10px;
  background: #fff3ca;
  border: 4px solid #6a351f;
  border-radius: 7px;
}

.team-heading,
.filter-row,
.detail-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.team-heading strong,
.team-heading span {
  font-size: 16px;
  font-weight: 1000;
}

.team-slots {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.team-slot {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  color: #9a5d34;
  cursor: pointer;
  background: #f7dfae;
  border: 3px dashed #b58b5c;
  border-radius: 999px;
}

.team-slot.filled {
  background: #e2a061;
  border: 4px solid #804423;
  border-radius: 9px;
}

.team-slot.active {
  outline: 4px solid #f8d35f;
}

.team-slot img {
  width: 84%;
  height: 84%;
  object-fit: contain;
  filter: drop-shadow(0 3px 0 rgba(68, 39, 23, 0.18));
}

.team-slot i {
  font-size: 44px;
  font-style: normal;
  font-weight: 1000;
}

.team-pet-name {
  position: absolute;
  top: -25%;
  right: 10px;
  left: 10px;
  z-index: 1;
  min-width: 0;
  padding: 4px 8px;
  overflow: hidden;
  color: #fff3ca;
  font-size: 13px;
  font-weight: 1000;
  line-height: 1.1;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: rgba(116, 65, 34, 0.86);
  border: 2px solid rgba(255, 238, 185, 0.68);
  border-radius: 8px / 16px;
  transform: translateY(50%);
}

.team-leader-badge {
  position: absolute;
  right: 8px;
  bottom: 5px;
  left: 8px;
  padding: 2px 4px;
  color: #fff3ca;
  font-size: 12px;
  font-weight: 1000;
  background: #c75f4c;
  border-radius: 5px;
}

.filter-row {
  padding: 0 10px 10px;
}

.slot-hint {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  min-width: 72px;
  padding: 4px 12px;
  color: #fff3ca;
  font-size: 15px;
  font-weight: 1000;
  background: #744122;
  border: 3px solid #8a4a25;
  border-radius: 7px;
}

.filter-row button,
.nurture-card button {
  min-height: 34px;
  padding: 4px 14px;
  color: #4b241d;
  font-size: 15px;
  font-weight: 1000;
  cursor: pointer;
  background: linear-gradient(#fff1b7, #f5bd52);
  border: 3px solid #8a4a25;
  border-radius: 7px;
}

.filter-row .add-button,
.nurture-card button {
  color: #26582b;
  background: linear-gradient(#c8e89e, #7fc165);
}

.pet-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  max-height: calc(100% - 214px);
  padding: 0 14px 12px 10px;
  overflow-y: auto;
  scrollbar-gutter: stable;
  scrollbar-color: #f5bd52 #744122;
  scrollbar-width: auto;
}

.pet-grid::-webkit-scrollbar {
  width: 18px;
}

.pet-grid::-webkit-scrollbar-track {
  background:
    linear-gradient(90deg, transparent 0 5px, rgba(255, 225, 166, 0.36) 5px 13px, transparent 13px),
    #744122;
  border: 3px solid #5a2f1d;
  border-radius: 999px;
}

.pet-grid::-webkit-scrollbar-thumb {
  background: linear-gradient(#ffe28a, #d88b35);
  border: 4px solid #6a351f;
  border-radius: 999px;
}

.pet-grid::-webkit-scrollbar-button {
  display: block;
  height: 16px;
  background: #6a351f;
  border-radius: 999px;
}

.pet-tile {
  position: relative;
  display: grid;
  grid-template-rows: 1fr auto auto;
  min-height: 112px;
  padding: 6px;
  cursor: pointer;
  background: #ffe7b2;
  border: 4px solid #7a421f;
  border-radius: 8px;
}

.pet-tile.selected {
  box-shadow: 0 0 0 4px #e8d650;
}

.pet-tile.teamed::after {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 15px;
  height: 15px;
  content: '';
  background: #6fba5f;
  border: 2px solid #fff3ca;
  border-radius: 999px;
}

.pet-tile.empty {
  cursor: default;
  opacity: 0.62;
  background: rgba(255, 231, 178, 0.45);
  border-style: dashed;
}

.pet-tile.empty strong {
  align-self: end;
  color: rgba(75, 36, 29, 0.55);
  font-size: 11px;
  text-align: center;
}

.element-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  color: #fff3ca;
  font-size: 11px;
  font-weight: 1000;
  background: #d28b39;
  border-radius: 999px;
}

.pet-tile img {
  align-self: center;
  justify-self: center;
  width: 80%;
  height: 62px;
  object-fit: contain;
}

.pet-tile strong,
.pet-tile small {
  min-width: 0;
  overflow: hidden;
  font-weight: 1000;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-tile small {
  justify-self: end;
}

.empty-pet-slot {
  align-self: center;
  justify-self: center;
  width: 54px;
  aspect-ratio: 1;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.12), transparent 42%),
    #767676;
  border: 2px dashed #f4e6c1;
  border-radius: 6px;
}

.nurture-panel {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
}

.pet-api-state,
.friends-card {
  display: grid;
  gap: 8px;
  margin: 0 10px 10px;
  padding: 9px;
  color: #4b241d;
  background: #fff3ca;
  border: 4px solid #6a351f;
  border-radius: 7px;
}

.pet-api-state {
  justify-items: center;
  text-align: center;
}

.pet-api-state span,
.friends-card p {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 13px;
  font-weight: 900;
}

.pet-api-state button,
.friends-card button {
  min-height: 30px;
  padding: 2px 10px;
  color: #26582b;
  font-weight: 1000;
  cursor: pointer;
  background: linear-gradient(#c8e89e, #7fc165);
  border: 3px solid #6a351f;
  border-radius: 7px;
}

.friends-card header,
.friend-form,
.friends-card li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.friends-card header strong {
  font-size: 16px;
  font-weight: 1000;
}

.friend-form input {
  min-width: 0;
  flex: 1;
  min-height: 34px;
  padding: 4px 8px;
  color: #4b241d;
  font: inherit;
  font-weight: 900;
  background: #fff;
  border: 3px solid #7a421f;
  border-radius: 7px;
}

.friends-card ul {
  display: grid;
  gap: 5px;
  max-height: 84px;
  padding: 0;
  margin: 0;
  overflow: auto;
  list-style: none;
}

.friends-card li {
  min-height: 28px;
  padding: 4px 7px;
  background: rgba(255, 255, 255, 0.45);
  border-radius: 6px;
}

.friends-card li strong,
.friends-card li span {
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  font-weight: 1000;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-selected-pet {
  display: grid;
  place-items: center;
  min-height: 0;
  height: 100%;
  color: #fff3ca;
  font-size: clamp(20px, 2.4vw, 34px);
  font-weight: 1000;
  text-align: center;
}

.pet-detail {
  display: grid;
  grid-template-columns: 134px 1fr;
  gap: 12px;
  margin: 10px;
  padding: 9px;
  background: #fff3ca;
  border: 4px solid #6a351f;
  border-radius: 7px;
}

.detail-portrait {
  display: grid;
  place-items: center;
  min-height: 118px;
  background: #e3a061;
  border: 3px solid #7a421f;
  border-radius: 7px;
}

.detail-portrait img {
  width: 92%;
  height: 92%;
  object-fit: contain;
}

.detail-heading h3 {
  margin: 0;
  font-size: 24px;
  font-weight: 1000;
}

.detail-heading strong {
  font-size: 18px;
  font-weight: 1000;
}

.stat-meter {
  display: grid;
  grid-template-columns: 44px 1fr 72px;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-weight: 1000;
}

.stat-meter div {
  height: 18px;
  overflow: hidden;
  background: #4d4841;
  border: 2px solid #7a421f;
  border-radius: 999px;
}

.stat-meter i {
  display: block;
  height: 100%;
  background: linear-gradient(#ef7773, #bb3430);
}

.stat-meter.exp i {
  background: linear-gradient(#65c9ff, #2585c7);
}

.stat-meter b {
  font-size: 12px;
  font-weight: 1000;
}

.nurture-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(400px, 1.05fr);
  grid-template-areas:
    'preview team-skill'
    'preview upgrade';
  grid-template-rows: 148px minmax(360px, 1fr);
  gap: 10px;
  min-height: 0;
  padding: 0 10px 10px;
}

.nurture-card {
  position: relative;
  min-height: 0;
  padding: 44px 10px 10px;
  overflow: hidden;
  background: #f7cf8e;
  border: 4px solid #7a421f;
  border-radius: 8px;
  box-shadow:
    inset 0 0 0 2px rgba(255, 246, 212, 0.36),
    0 2px 0 rgba(75, 36, 29, 0.18);
}

.preview-card,
.team-skill-card,
.upgrade-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.nurture-card h3 {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  min-height: 34px;
  margin: 0;
  padding: 6px 10px;
  color: #4b241d;
  font-size: 17px;
  font-weight: 1000;
  text-align: center;
  background: linear-gradient(#efbd74, #d8934e);
  border-bottom: 3px solid #7a421f;
}

.preview-card {
  grid-area: preview;
  padding-top: 54px;
}

.upgrade-card {
  display: grid;
  grid-area: upgrade;
  grid-template-rows: auto auto;
  align-content: space-between;
  justify-content: stretch;
  justify-items: stretch;
  gap: 8px;
  overflow: hidden;
}

.team-skill-card {
  grid-area: team-skill;
  gap: 10px;
  justify-content: stretch;
  min-height: 148px;
}

.preview-card p,
.skill-point-row,
.upgrade-card small {
  margin: 0;
  color: #4b241d;
  font-weight: 900;
  line-height: 1.35;
}

.upgrade-card h4,
.upgrade-breakthrough h4 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0;
  font-size: 14px;
  font-weight: 1000;
}

.advance-button,
.breakthrough-button {
  width: 100%;
  margin-top: 2px;
}

.breakthrough-button:disabled {
  color: #7c6b58;
  cursor: not-allowed;
  background:
    linear-gradient(135deg, transparent 0 42%, rgba(96, 69, 48, 0.26) 42% 58%, transparent 58%),
    linear-gradient(#d8c3a2, #b9a181);
  border-color: #7b5b3a;
  filter: grayscale(0.45);
}

.upgrade-breakthrough {
  display: grid;
  gap: 6px;
  margin-top: 0;
}

.upgrade-block {
  display: grid;
  gap: 8px;
  padding: 8px;
  background: rgba(255, 244, 210, 0.32);
  border: 2px solid rgba(122, 66, 31, 0.62);
  border-radius: 7px;
}

.skill-training-block {
  align-content: start;
}

.advance-training-block {
  margin-top: 0;
}

.leader-skill {
  align-content: center;
  min-height: 86px;
}

.leader-skill h4 {
  display: none;
}

.section-kicker {
  font-size: 13px;
  font-weight: 1000;
}

.leader-skill > strong {
  font-size: 18px;
  font-weight: 1000;
}

.leader-skill > p {
  margin: 3px 0 0;
  font-weight: 900;
  line-height: 1.35;
}

.upgrade-breakthrough h4 span {
  padding: 2px 7px;
  color: #fff3ca;
  font-size: 12px;
  font-weight: 1000;
  background: #9a5a2c;
  border: 2px solid #744122;
  border-radius: 999px;
}

.upgrade-breakthrough h4 span.ready {
  color: #26582b;
  background: #c8e89e;
  border-color: #6ca765;
}

.breakthrough-requirement {
  display: grid;
  place-items: center;
  min-height: 34px;
  margin: 0;
  padding: 6px 8px;
  color: #744122;
  font-size: 13px;
  font-weight: 1000;
  text-align: center;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 6px;
}

.skill-upgrade {
  min-height: 0;
  overflow: hidden;
}

.skill-point-row,
.preview-card dl div,
.material-list article {
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 6px;
}

.skill-point-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 6px;
}

.skill-point-row strong,
.upgrade-card strong {
  font-weight: 1000;
}

.skill-point-row span {
  display: block;
  font-size: 12px;
}

.skill-point-row button {
  min-height: 26px;
  padding: 2px 9px;
  font-size: 12px;
}

.skill-point-row button:disabled {
  color: #7c6b58;
  cursor: not-allowed;
  background: linear-gradient(#d8c3a2, #b9a181);
  border-color: #7b5b3a;
}

.nurture-message {
  min-height: 22px;
  margin: 0;
  color: #26582b;
  font-size: 12px;
  font-weight: 1000;
  text-align: center;
}

.skill-point-meter {
  display: flex;
  gap: 3px;
}

.skill-point-meter i {
  width: 11px;
  height: 11px;
  background: #7b5b3a;
  border: 1px solid #4b241d;
  border-radius: 999px;
}

.skill-point-meter i.filled {
  background: #6bcf72;
}

.skill-points {
  margin: 0;
  font-weight: 1000;
}

.level-up-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}

.level-up-summary div {
  display: grid;
  gap: 2px;
  padding: 7px 8px;
  text-align: center;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 6px;
}

.level-up-summary span,
.level-up-summary strong {
  font-weight: 1000;
}

.material-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
  margin-bottom: 6px;
}

.breakthrough-list {
  grid-template-columns: repeat(2, 1fr);
  margin-bottom: 0;
}

.compact-material-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.advance-list {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 0;
}

.material-list article {
  display: grid;
  grid-template-rows: auto auto auto;
  gap: 3px;
  min-height: 74px;
  font-size: 12px;
  font-weight: 1000;
  text-align: center;
}

.material-image {
  justify-self: center;
  width: 36px;
  aspect-ratio: 1;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.12), transparent 42%),
    #767676;
  border: 2px solid #fff0c4;
  border-radius: 6px;
  box-shadow: inset 0 0 0 2px rgba(75, 75, 75, 0.22);
}

.exp-preview {
  display: grid;
  gap: 5px;
  margin-top: 8px;
  font-weight: 1000;
}

.exp-preview i {
  height: 12px;
  background: linear-gradient(90deg, #6bcf72 0 72%, #4d4841 72%);
  border: 2px solid #7a421f;
  border-radius: 999px;
}

.preview-card dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  margin: 10px 0 0;
}

.info-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-bottom: 10px;
  padding: 8px;
}

.intro-animation {
  display: grid;
  place-items: center;
  flex: 1 1 auto;
  min-height: 340px;
  color: #fff;
  font-size: clamp(32px, 4vw, 56px);
  font-weight: 1000;
  background: #6d6d6d;
  border: 4px solid #e9d4a7;
  border-radius: 7px;
}

.upgrade-section {
  display: grid;
  gap: 6px;
  width: 100%;
  padding: 8px;
  background: rgba(255, 255, 255, 0.22);
  border: 2px solid rgba(122, 66, 31, 0.52);
  border-radius: 7px;
}

.upgrade-section + .upgrade-section {
  margin-top: 0;
}

.upgrade-section h4 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0;
  font-size: 14px;
  font-weight: 1000;
}

.upgrade-section h4 span {
  padding: 2px 7px;
  color: #26582b;
  font-size: 12px;
  font-weight: 1000;
  background: #c8e89e;
  border: 2px solid #6ca765;
  border-radius: 999px;
}

.skill-level-badge {
  min-width: 50px;
  padding: 5px 8px;
  color: #fff3ca;
  text-align: center;
  background: #744122;
  border: 2px solid #4b241d;
  border-radius: 999px;
}

.preview-card dl div {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 8px;
}

.preview-card dt,
.preview-card dd {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-weight: 1000;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1120px) {
  .pet-page {
    grid-template-columns: 1fr;
    height: auto;
  }

  .team-panel,
  .nurture-panel {
    overflow: visible;
  }

  .pet-grid {
    max-height: none;
  }

  .nurture-panel {
    display: block;
  }
}

@media (max-width: 720px) {
  .pet-page {
    gap: 12px;
    width: 100%;
    padding-bottom: 72px;
  }

  .wood-title h1,
  .wood-title h2 {
    font-size: 17px;
  }

  .team-slots,
  .pet-grid,
  .nurture-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .nurture-grid {
    grid-template-areas:
      'preview preview'
      'upgrade upgrade';
    grid-template-rows: auto;
  }

  .team-slot {
    border-radius: 10px;
  }

  .filter-row,
  .pet-detail {
    display: grid;
    grid-template-columns: 1fr;
  }

  .info-content,
  .skill-point-row {
    grid-template-columns: 1fr;
  }

  .detail-heading {
    align-items: flex-start;
  }

  .material-list,
  .level-up-summary {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
