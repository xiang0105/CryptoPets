<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { goodies } from '@/data/goodies'
import { pets, type Pet } from '@/data/pets'
import { useGameApi } from '@/composables/useGameApi'
import { expeditionTeamIds, isPetInExpeditionTeam, maxTeamSlots, setExpeditionTeamSlot } from '@/state/expeditionTeam'
import { currentMessages, isZh } from '@/i18n'
import { getPetImage } from '@/content/gameAssets'
import { petElementMeta, statusRules } from '@cryptopets/game-content'

const maxPetSlots = 20
const localPets = ref<Pet[]>([])
const selectedPetId = ref('')
const activeTeamSlotIndex = ref<number | null>(null)
const petFilterMode = ref<'all' | 'team' | 'available' | 'level'>('all')
const skillLevels = ref([1, 1, 1])
const nurtureMessage = ref('')
const availableSkillPoints = computed(() => 0)

const { operationError, playerProfile, queryError, queryLoading, loadFriends, loadPlayerProfile } = useGameApi()

const breakthroughMaterials = [
  { id: 'MAT-2C', count: 3 },
  { id: 'MAT-4B', count: 1 },
]

const text = computed(() => currentMessages.value.pets)
const selectedPet = computed(() => localPets.value.find((pet) => pet.id === selectedPetId.value) ?? localPets.value[0])
const leaderSkill = computed(() => selectedPet.value?.leaderSkill)
const poisonRule = computed(() => statusRules.find((rule) => rule.id === 'poison'))

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

const breakthroughRequiredLevel = computed(() => {
  const pet = selectedPet.value
  return pet ? pet.stage * 10 + 4 : 0
})

const canStageBreakthrough = computed(() => {
  const pet = selectedPet.value
  return Boolean(pet && pet.stage < 3 && petLevel(pet) >= breakthroughRequiredLevel.value && pet.exp.current >= pet.exp.next)
})

const selectedIntro = computed(() => {
  const pet = selectedPet.value

  if (!pet) {
    return ''
  }

  if (pet.profile) {
    return isZh.value ? pet.profile.zh : pet.profile.en
  }

  const elementName = displayElement(pet.element)
  return isZh.value
    ? `${pet.name} 是一隻${elementName}水豚，適合遠征劇本與隊伍支援。`
    : `${pet.name} is a ${elementName.toLowerCase()} capybara built for script expeditions and team support.`
})

const skillRows = computed(() =>
  (selectedPet.value?.skills ?? []).map((skill, index) => ({
    id: skill.id,
    name: isZh.value ? skill.name.zh : skill.name.en,
    value: isZh.value ? skill.description.zh : skill.description.en,
    points: skillLevels.value[index] ?? 0,
    max: 5,
  })),
)

const slotHint = computed(() => {
  if (activeTeamSlotIndex.value === null) {
    return isZh.value ? '尚未選擇欄位' : 'No slot'
  }

  return isZh.value ? `隊伍欄位 ${activeTeamSlotIndex.value + 1}` : `Slot ${activeTeamSlotIndex.value + 1}`
})

const filterLabel = computed(() => {
  if (petFilterMode.value === 'team') {
    return isZh.value ? '隊伍中' : 'Team only'
  }

  if (petFilterMode.value === 'available') {
    return isZh.value ? '可加入' : 'Available'
  }

  if (petFilterMode.value === 'level') {
    return isZh.value ? '等級排序' : 'Level high'
  }

  return text.value.filterSort
})

const isPetProfileLoading = computed(() => queryLoading.player)
const petProfileError = computed(() => queryError.player)
const chainStatusNotice = computed(() => {
  if (!playerProfile.value || playerProfile.value.chain.enabled) {
    return ''
  }

  return isZh.value
    ? '後端回報鏈上寵物持有權尚未啟用，目前顯示後端可用角色資料。'
    : 'Backend reports on-chain pet ownership is not enabled yet; showing backend-available pet data.'
})

function displayElement(element: Pet['element']) {
  return isZh.value ? petElementMeta[element].label.zh : petElementMeta[element].label.en
}

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
  void skillIndex
  nurtureMessage.value = isZh.value
    ? '技能升級尚未開放後端接口，前端不會本地修改資料。'
    : 'Skill upgrades are waiting for a backend API; frontend data was not changed.'
}

function confirmBreakthrough() {
  nurtureMessage.value = isZh.value
    ? '突破尚未開放後端接口，前端不會本地修改資料。'
    : 'Advancement is waiting for a backend API; frontend data was not changed.'
}

function syncLocalPetsFromApi() {
  localPets.value = pets.map((pet) => ({
    ...pet,
    stats: { ...pet.stats },
    exp: { ...pet.exp },
    profile: pet.profile ? { ...pet.profile } : undefined,
    leaderSkill: pet.leaderSkill ? { ...pet.leaderSkill } : undefined,
    skills: pet.skills?.map((skill) => ({ ...skill })),
  }))
  selectedPetId.value = localPets.value[0]?.id ?? ''
}

async function retryPlayerProfile() {
  try {
    await loadPlayerProfile({ force: true })
  } catch {
    // Error text is rendered from queryError.player.
  } finally {
    syncLocalPetsFromApi()
  }
}

onMounted(() => {
  syncLocalPetsFromApi()
  void loadPlayerProfile().catch(() => undefined).finally(syncLocalPetsFromApi)
  void loadFriends()
})
</script>

<template>
  <section class="pet-page">
    <section class="team-panel">
      <header class="wood-title">
        <h1>{{ isZh ? `${text.teamTitle}（${maxTeamSlots} 欄位）` : `${text.teamTitle} (${maxTeamSlots} slots)` }}</h1>
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
              <img :src="getPetImage(pet)" :alt="pet.name" draggable="false" />
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
        <strong v-if="isPetProfileLoading">{{ isZh ? '讀取角色中...' : 'Loading pets...' }}</strong>
        <template v-else-if="petProfileError">
          <strong>{{ isZh ? '角色讀取失敗' : 'Pet load failed' }}</strong>
          <span>{{ petProfileError }}</span>
          <button type="button" @click="retryPlayerProfile">{{ isZh ? '重試' : 'Retry' }}</button>
        </template>
        <template v-else>
          <strong>{{ text.emptyPet }}</strong>
          <span>{{ isZh ? '尚無後端角色資料。' : 'No backend pets are available yet.' }}</span>
          <button type="button" @click="retryPlayerProfile">{{ isZh ? '重新整理' : 'Refresh' }}</button>
        </template>
      </div>
      <p v-if="chainStatusNotice" class="pet-api-state pet-chain-state" aria-live="polite">
        <span>{{ chainStatusNotice }}</span>
      </p>

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
            <span class="element-badge">{{ petElementMeta[pet.element].mark }}</span>
            <img :src="getPetImage(pet)" :alt="pet.name" draggable="false" />
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
        {{ isZh ? '尚未選擇角色' : 'No pet selected' }}
      </div>

      <template v-if="selectedPet">
        <article class="pet-detail">
          <div class="detail-portrait">
            <img :src="getPetImage(selectedPet)" :alt="selectedPet.name" draggable="false" />
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

        <div class="nurture-grid">
          <section class="nurture-card preview-card">
            <h3>{{ text.intro }}</h3>
            <p>{{ selectedIntro }}</p>
            <dl>
              <div>
                <dt>{{ text.token }}</dt>
                <dd>{{ selectedPet.id }}</dd>
              </div>
              <div>
                <dt>{{ text.element }}</dt>
                <dd>{{ displayElement(selectedPet.element) }}</dd>
              </div>
              <div>
                <dt>ATK</dt>
                <dd>{{ selectedPet.stats.atk }}</dd>
              </div>
              <div>
                <dt>DEF</dt>
                <dd>{{ selectedPet.stats.def }}</dd>
              </div>
            </dl>
            <div class="intro-animation">
              <img :src="getPetImage(selectedPet)" :alt="selectedPet.name" draggable="false" />
            </div>
          </section>

          <section class="nurture-card team-skill-card">
            <h3>{{ isZh ? '隊長技能' : 'Leader Skill' }}</h3>
            <div class="team-skill-body">
            <div class="upgrade-section leader-skill">
              <strong>{{ leaderSkill ? (isZh ? leaderSkill.name.zh : leaderSkill.name.en) : '-' }}</strong>
              <p>
                {{
                  leaderSkill
                    ? (isZh ? leaderSkill.description.zh : leaderSkill.description.en)
                    : (isZh ? '尚無隊長技能資料。' : 'No leader skill data.')
                }}
              </p>
            </div>
            <div v-if="poisonRule" class="status-rule">
              <strong>{{ isZh ? poisonRule.name.zh : poisonRule.name.en }}</strong>
              <span>{{ isZh ? poisonRule.description.zh : poisonRule.description.en }}</span>
            </div>
            </div>
          </section>

          <section class="nurture-card upgrade-card">
            <h3>{{ text.skillDesign }}</h3>
            <div class="upgrade-section skill-upgrade">
              <h4>{{ text.skillUpgrade }} <span>{{ text.skillPoints }}: {{ availableSkillPoints }}</span></h4>
              <article v-for="(skill, index) in skillRows" :key="skill.id" class="skill-point-row">
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
                {{ isZh ? '突破' : 'Advance' }}
                <span :class="{ ready: canStageBreakthrough }">
                  {{ canStageBreakthrough ? text.breakthroughReady : text.breakthroughLocked }}
                </span>
              </h4>
              <div class="material-list advance-list">
                <p class="breakthrough-requirement">
                  {{ isZh ? `需要 ${text.level}${breakthroughRequiredLevel} 且 EXP 滿` : `Requires ${text.level} ${breakthroughRequiredLevel} and full EXP` }}
                </p>
                <article v-for="row in breakthroughRows" :key="row.id">
                  <div class="material-image" aria-hidden="true"></div>
                  <span>{{ row.goodie ? (isZh ? row.goodie.name.zh : row.goodie.name.en) : row.id }}</span>
                  <strong>x{{ row.count }}</strong>
                </article>
              </div>
              <button class="breakthrough-button" type="button" :disabled="!canStageBreakthrough" @click="confirmBreakthrough">
                {{ isZh ? '確認突破' : 'Confirm Advance' }}
              </button>
            </div>
          </section>
        </div>
      </template>
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
  box-shadow: inset 0 0 0 3px rgba(255, 218, 152, 0.24), 0 3px 0 rgba(72, 41, 24, 0.22);
}

.wood-title {
  min-height: 42px;
  padding: 6px 14px;
  text-align: center;
  background: linear-gradient(#c08856, #9e633a);
  border-bottom: 4px solid #6a351f;
}

.wood-title h1,
.wood-title h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 1000;
}

.team-card,
.pet-api-state,
.pet-detail {
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

.team-slots,
.pet-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.team-slots {
  margin-top: 10px;
}

.team-slot,
.pet-tile {
  position: relative;
  display: grid;
  place-items: center;
  cursor: pointer;
  border-radius: 8px;
}

.team-slot {
  aspect-ratio: 1;
  color: #9a5d34;
  background: #f7dfae;
  border: 3px dashed #b58b5c;
}

.team-slot.filled {
  background: #e2a061;
  border: 4px solid #804423;
}

.team-slot.active {
  outline: 4px solid #f8d35f;
}

.team-slot img {
  width: 84%;
  height: 84%;
  object-fit: contain;
}

.team-pet-name,
.team-leader-badge {
  position: absolute;
  right: 8px;
  left: 8px;
  color: #fff3ca;
  font-weight: 1000;
  text-align: center;
  background: rgba(116, 65, 34, 0.88);
  border-radius: 6px;
}

.team-pet-name {
  top: 6px;
  padding: 3px 6px;
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.team-leader-badge {
  bottom: 5px;
  padding: 2px 4px;
  font-size: 12px;
  background: #c75f4c;
}

.filter-row {
  padding: 0 10px 10px;
}

.slot-hint,
.skill-level-badge {
  padding: 5px 10px;
  color: #fff3ca;
  font-weight: 1000;
  background: #744122;
  border-radius: 999px;
}

button {
  min-height: 34px;
  padding: 4px 12px;
  color: #4b241d;
  font: inherit;
  font-weight: 1000;
  cursor: pointer;
  background: linear-gradient(#fff1b7, #f5bd52);
  border: 3px solid #8a4a25;
  border-radius: 7px;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.pet-grid {
  max-height: calc(100% - 300px);
  padding: 0 14px 12px 10px;
  overflow-y: auto;
  scrollbar-color: #9a5a2c rgba(255, 255, 255, 0.28);
  scrollbar-width: thin;
}

.pet-tile {
  grid-template-rows: 1fr auto auto;
  min-height: 112px;
  padding: 6px;
  background: #ffe7b2;
  border: 4px solid #7a421f;
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
  border-style: dashed;
}

.element-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  color: #fff3ca;
  font-size: 12px;
  font-weight: 1000;
  background: #d28b39;
  border-radius: 999px;
}

.pet-tile img {
  width: 80%;
  height: 62px;
  object-fit: contain;
}

.pet-tile strong,
.pet-tile small {
  min-width: 0;
  overflow: hidden;
  font-weight: 1000;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nurture-panel {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
}

.pet-api-state {
  display: grid;
  justify-items: center;
  gap: 8px;
  text-align: center;
}

.pet-detail {
  display: grid;
  grid-template-columns: 134px 1fr;
  gap: 12px;
}

.detail-portrait,
.intro-animation {
  display: grid;
  place-items: center;
  background: #e3a061;
  border: 3px solid #7a421f;
  border-radius: 7px;
}

.detail-portrait img,
.intro-animation img {
  width: 92%;
  height: 92%;
  object-fit: contain;
}

.detail-heading h3 {
  margin: 0;
  font-size: 24px;
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

.nurture-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(400px, 1.05fr);
  grid-template-areas:
    'preview team-skill'
    'preview upgrade';
  grid-template-rows: 176px minmax(340px, 1fr);
  gap: 10px;
  min-height: 0;
  padding: 0 10px 10px;
}

.nurture-card {
  position: relative;
  min-height: 0;
  padding: 46px 10px 10px;
  overflow: hidden;
  background: #f7cf8e;
  border: 4px solid #7a421f;
  border-radius: 8px;
}

.nurture-card h3 {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  min-height: 34px;
  margin: 0;
  padding: 6px 10px;
  text-align: center;
  background: linear-gradient(#efbd74, #d8934e);
  border-bottom: 3px solid #7a421f;
}

.preview-card {
  grid-area: preview;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.team-skill-card {
  grid-area: team-skill;
  display: block;
  gap: 8px;
}

.team-skill-body {
  height: 100%;
  max-height: 100%;
  min-height: 0;
  overflow-y: auto;
  padding-right: 14px;
  scrollbar-color: #9a5a2c rgba(255, 255, 255, 0.28);
  scrollbar-width: thin;
}

.upgrade-card {
  grid-area: upgrade;
  display: grid;
  align-content: space-between;
  gap: 8px;
}

.preview-card p,
.leader-skill p,
.status-rule span,
.skill-point-row span,
.nurture-message {
  margin: 0;
  font-weight: 900;
  line-height: 1.35;
}

.preview-card p,
.skill-upgrade {
  min-height: 0;
  overflow-y: auto;
  scrollbar-color: #9a5a2c rgba(255, 255, 255, 0.28);
  scrollbar-width: thin;
}

.preview-card p {
  max-height: 86px;
  padding-right: 4px;
}

.skill-upgrade {
  max-height: 244px;
  padding-right: 8px;
}

.preview-card p::-webkit-scrollbar,
.team-skill-body::-webkit-scrollbar,
.pet-grid::-webkit-scrollbar,
.skill-upgrade::-webkit-scrollbar {
  width: 10px;
}

.preview-card p::-webkit-scrollbar-track,
.team-skill-body::-webkit-scrollbar-track,
.pet-grid::-webkit-scrollbar-track,
.skill-upgrade::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.28);
  border-radius: 999px;
}

.preview-card p::-webkit-scrollbar-thumb,
.team-skill-body::-webkit-scrollbar-thumb,
.pet-grid::-webkit-scrollbar-thumb,
.skill-upgrade::-webkit-scrollbar-thumb {
  background: #9a5a2c;
  border: 2px solid #f7cf8e;
  border-radius: 999px;
}

.preview-card dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  margin: 0;
}

.preview-card dl div,
.skill-point-row,
.material-list article,
.status-rule {
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 6px;
}
.material-list article{
  text-align: center;
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

.intro-animation {
  flex: 1;
  min-height: 220px;
}

.upgrade-section {
  display: grid;
  gap: 6px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.22);
  border: 2px solid rgba(122, 66, 31, 0.52);
  border-radius: 7px;
}

.team-skill-card .upgrade-section + .status-rule {
  margin-top: 8px;
}

.skill-point-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 6px;
}

.skill-point-row button {
  min-height: 28px;
}

.upgrade-breakthrough h4,
.skill-upgrade h4 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0;
}

.upgrade-breakthrough h4 span {
  padding: 2px 7px;
  color: #fff3ca;
  font-size: 12px;
  background: #9a5a2c;
  border-radius: 999px;
}

.upgrade-breakthrough h4 span.ready {
  color: #26582b;
  background: #c8e89e;
}

.material-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
}

.breakthrough-requirement {
  display: grid;
  place-items: center;
  margin: 0;
  font-weight: 1000;
  text-align: center;
}

.material-image,
.empty-pet-slot {
  justify-self: center;
  width: 36px;
  aspect-ratio: 1;
  background: #767676;
  border: 2px solid #fff0c4;
  border-radius: 6px;
}

.breakthrough-button {
  width: 100%;
}

.no-selected-pet {
  display: grid;
  place-items: center;
  height: 100%;
  color: #fff3ca;
  font-size: 24px;
  font-weight: 1000;
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
}

@media (max-width: 720px) {
  .pet-page,
  .pet-detail,
  .skill-point-row {
    grid-template-columns: 1fr;
  }

  .team-slots,
  .pet-grid,
  .nurture-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .nurture-grid {
    grid-template-areas:
      'preview preview'
      'team-skill team-skill'
      'upgrade upgrade';
    grid-template-rows: auto;
  }
}
</style>
