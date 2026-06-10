import { computed, ref } from 'vue'
import { pets } from '@/data/pets'

const maxTeamSlots = 4
const expeditionTeamIds = ref<string[]>([])

const expeditionTeamPets = computed(() =>
  expeditionTeamIds.value
    .map((petId) => pets.find((pet) => pet.id === petId) ?? null)
    .filter((pet): pet is (typeof pets)[number] => Boolean(pet)),
)

function isPetInExpeditionTeam(petId: string) {
  return expeditionTeamIds.value.includes(petId)
}

function toggleExpeditionPet(petId: string) {
  if (isPetInExpeditionTeam(petId)) {
    expeditionTeamIds.value = expeditionTeamIds.value.filter((id) => id !== petId)
    return
  }

  if (expeditionTeamIds.value.length >= maxTeamSlots) {
    return
  }

  expeditionTeamIds.value = [...expeditionTeamIds.value, petId]
}

function setExpeditionTeamSlot(slotIndex: number, petId: string) {
  if (slotIndex < 0 || slotIndex >= maxTeamSlots) {
    return
  }

  const nextTeamIds = [...expeditionTeamIds.value]
  const existingIndex = nextTeamIds.indexOf(petId)
  const currentPetId = nextTeamIds[slotIndex]

  if (existingIndex >= 0 && existingIndex !== slotIndex && currentPetId) {
    nextTeamIds[existingIndex] = currentPetId
  }

  nextTeamIds[slotIndex] = petId
  expeditionTeamIds.value = nextTeamIds.slice(0, maxTeamSlots)
}

function setExpeditionTeam(petIds: string[]) {
  expeditionTeamIds.value = petIds.slice(0, maxTeamSlots)
}

export {
  expeditionTeamIds,
  expeditionTeamPets,
  isPetInExpeditionTeam,
  maxTeamSlots,
  setExpeditionTeam,
  setExpeditionTeamSlot,
  toggleExpeditionPet,
}
