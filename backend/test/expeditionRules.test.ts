import { describe, expect, it } from 'vitest'
import type { ExpeditionForest } from '../src/expeditionContent.js'
import {
  calculateExpeditionOutcome,
  materialAmountPerSuccessfulEvent,
  materialIdForForest,
  rollForEvent,
  successChance
} from '../src/expeditionRules.js'

const text = {
  zh: '測試',
  en: 'Test'
}

describe('expedition rules', () => {
  it('clamps LV success chance to 10-95', () => {
    expect(successChance(0, 10)).toBe(10)
    expect(successChance(100, 1)).toBe(95)
  })

  it('uses IV to scale successful event material amount', () => {
    expect(materialAmountPerSuccessfulEvent(0)).toBe(1)
    expect(materialAmountPerSuccessfulEvent(199)).toBe(1)
    expect(materialAmountPerSuccessfulEvent(200)).toBe(2)
    expect(materialAmountPerSuccessfulEvent(450)).toBe(3)
  })

  it('maps expedition type to material id', () => {
    expect(materialIdForForest('orange')).toBe('1')
    expect(materialIdForForest('apple')).toBe('1')
    expect(materialIdForForest('snow-peach')).toBe('2')
  })

  it('temporary level penalty affects later event rolls only', () => {
    const forest = makeForest({
      difficulty: 1,
      events: [
        {
          id: 'penalty-event',
          failTags: ['poison']
        },
        {
          id: 'next-event',
          failTags: []
        }
      ]
    })
    const expeditionId = findExpeditionId((id) => rollForEvent(id, 'penalty-event', 0) >= successChance(2, 1))
    const outcome = calculateExpeditionOutcome({
      expeditionId,
      forest,
      totalLevel: 2,
      sumIv: 0
    })

    expect(outcome.events[0].success).toBe(false)
    expect(outcome.events[0].effectiveTotalLevel).toBe(2)
    expect(outcome.events[0].levelPenaltyApplied).toBe(1)
    expect(outcome.events[1].effectiveTotalLevel).toBe(1)
    expect(outcome.events[1].chance).toBe(successChance(1, 1))
  })

  it('successful events give mapped material amount', () => {
    const forest = makeForest({
      difficulty: 1,
      events: [
        {
          id: 'success-event',
          failTags: []
        }
      ]
    })
    const expeditionId = findExpeditionId((id) => rollForEvent(id, 'success-event', 0) < successChance(100, 1))
    const outcome = calculateExpeditionOutcome({
      expeditionId,
      forest,
      totalLevel: 100,
      sumIv: 450
    })

    expect(outcome.events[0].success).toBe(true)
    expect(outcome.events[0].materialId).toBe('1')
    expect(outcome.events[0].materialAmount).toBe(3)
    expect(outcome.reward.materials).toEqual([{ id: '1', count: 3 }])
  })

  it('failed events give no material', () => {
    const forest = makeForest({
      difficulty: 3,
      events: [
        {
          id: 'failed-event',
          failTags: ['stun']
        }
      ]
    })
    const expeditionId = findExpeditionId((id) => rollForEvent(id, 'failed-event', 0) >= successChance(0, 3))
    const outcome = calculateExpeditionOutcome({
      expeditionId,
      forest,
      totalLevel: 0,
      sumIv: 999
    })

    expect(outcome.events[0].success).toBe(false)
    expect(outcome.events[0].materialId).toBeNull()
    expect(outcome.events[0].materialAmount).toBe(0)
    expect(outcome.reward.materials).toEqual([])
  })
})

function makeForest(input: {
  difficulty: number
  events: Array<{
    id: string
    failTags: string[]
  }>
}): ExpeditionForest {
  return {
    id: 'orange',
    difficulty: input.difficulty,
    durationSeconds: 1,
    reward: 'Test',
    name: text,
    summary: text,
    scriptEvents: input.events.map((event) => ({
      id: event.id,
      setup: text,
      outcomes: [
        {
          id: `${event.id}-success`,
          text,
          rewardMultiplier: 1
        },
        {
          id: `${event.id}-fail`,
          text,
          rewardMultiplier: 0.5,
          tags: event.failTags
        }
      ]
    }))
  }
}

function findExpeditionId(match: (id: string) => boolean) {
  for (let index = 0; index < 10000; index++) {
    const id = `expedition-${index}`

    if (match(id)) {
      return id
    }
  }

  throw new Error('No matching expedition id found')
}
