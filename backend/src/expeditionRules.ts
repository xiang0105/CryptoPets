import crypto from 'node:crypto'
import type { ExpeditionForest, StoryBeat, StoryOutcome } from './expeditionContent.js'
import type { ExpeditionEventResult, ExpeditionReward } from './expeditionTypes.js'

const penaltyTags = new Set(['damage-display', 'poison', 'slow', 'stun'])

export function successChance(totalLevel: number, difficulty: number) {
  return clamp(30 + totalLevel * 8 - difficulty * 10, 10, 95)
}

export function materialIdForForest(forestId: string) {
  if (forestId === 'snow-peach') {
    return '2'
  }

  return '1'
}

export function materialAmountPerSuccessfulEvent(sumIv: number) {
  return 1 + Math.floor(sumIv / 200)
}

export function rollForEvent(expeditionId: string, eventId: string, index: number) {
  const hash = crypto.createHash('sha256').update(`${expeditionId}:${eventId}:${index}`).digest()
  return hash[0] % 100
}

export function calculateExpeditionOutcome(input: {
  expeditionId: string
  forest: ExpeditionForest
  totalLevel: number
  sumIv: number
}): { events: ExpeditionEventResult[]; reward: ExpeditionReward } {
  let effectiveTotalLevel = Math.max(0, input.totalLevel)
  let successfulEvents = 0
  const materialId = materialIdForForest(input.forest.id)
  const materialAmount = materialAmountPerSuccessfulEvent(input.sumIv)
  const events: ExpeditionEventResult[] = []

  for (let index = 0; index < input.forest.scriptEvents.length; index++) {
    const event = input.forest.scriptEvents[index]
    const chance = successChance(effectiveTotalLevel, input.forest.difficulty)
    const roll = rollForEvent(input.expeditionId, event.id, index)
    const success = roll < chance
    const outcome = selectOutcome(event, success)
    const tags = outcome.tags ?? []
    const levelPenaltyApplied = !success && hasPenaltyTag(tags) ? 1 : 0

    events.push({
      index,
      eventId: event.id,
      outcomeId: outcome.id,
      success,
      chance,
      roll,
      effectiveTotalLevel,
      levelPenaltyApplied,
      materialId: success ? materialId : null,
      materialAmount: success ? materialAmount : 0,
      message: {
        zh: `${event.setup.zh} ${outcome.text.zh}`,
        en: `${event.setup.en} ${outcome.text.en}`
      },
      tags
    })

    if (success) {
      successfulEvents += 1
    }

    if (levelPenaltyApplied > 0) {
      effectiveTotalLevel = Math.max(0, effectiveTotalLevel - levelPenaltyApplied)
    }
  }

  return {
    events,
    reward: {
      exp: 0,
      sepoliaAmount: '0',
      materials: successfulEvents > 0 ? [{ id: materialId, count: successfulEvents * materialAmount }] : []
    }
  }
}

function selectOutcome(event: StoryBeat, success: boolean): StoryOutcome {
  if (success) {
    return event.outcomes.find((outcome) => (outcome.rewardMultiplier ?? 0) >= 1) ?? event.outcomes[0]
  }

  return event.outcomes.find((outcome) => (outcome.rewardMultiplier ?? 1) < 1) ?? event.outcomes[event.outcomes.length - 1]
}

function hasPenaltyTag(tags: string[]) {
  return tags.some((tag) => penaltyTags.has(tag))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
