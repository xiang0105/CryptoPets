import crypto from 'node:crypto'
import { z } from 'zod'
import type {
  ClaimRewardRequest,
  ExpeditionLogEntry,
  ExpeditionReward,
  ExpeditionSummary,
  StartExpeditionRequest,
} from '@cryptopets/shared'
import {
  expeditionForests,
  materialDefinitions,
  materialIds,
  type ForestId,
  type PetElement,
  type StoryBeat,
  type StoryCheckOperator,
  type StoryCondition,
} from '@cryptopets/game-content'
import { supabase } from '../config/supabase.js'
import { HttpError } from '../utils/httpError.js'
import { materialBalanceProvider } from './materialBalanceProvider.js'

const startExpeditionSchema: z.ZodType<StartExpeditionRequest> = z.object({
  petIds: z.array(z.string().uuid()).min(1).max(4),
  expeditionType: z.enum(expeditionForests.map((forest) => forest.id) as ['orange', 'apple', 'snow-peach']).default('orange'),
}).strict()

const claimRewardSchema: z.ZodType<ClaimRewardRequest> = z.object({
  expeditionId: z.string().uuid(),
}).strict()

const expeditionForestById = new Map(expeditionForests.map((forest) => [forest.id, forest]))
const materialDefinitionById = new Map(materialDefinitions.map((material) => [material.id, material]))

type ExpeditionPetForLog = {
  id: string
  name: string
  element: PetElement
  stats: Record<string, number>
  stage: number
}

type ExpeditionLogInsert = {
  user_id: string
  expedition_id: string
  occurred_at: string
  message_zh: string
  message_en: string
  variant?: 'notice' | null
}

export async function startExpedition(userId: string, input: unknown): Promise<ExpeditionSummary> {
  const body = startExpeditionSchema.parse(input)
  const uniquePetIds = [...new Set(body.petIds)]

  if (uniquePetIds.length !== body.petIds.length) {
    throw new HttpError(400, 'DUPLICATE_PET_IDS')
  }

  const { data: activeExpedition, error: activeError } = await supabase
    .from('expeditions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'started')
    .maybeSingle()

  if (activeError) {
    throw new HttpError(500, 'EXPEDITION_LOOKUP_FAILED')
  }

  if (activeExpedition) {
    throw new HttpError(409, 'EXPEDITION_ALREADY_ACTIVE')
  }

  const { data: pets, error: petsError } = await supabase
    .from('pets')
    .select('id,name,element,stats,stage')
    .eq('user_id', userId)
    .in('id', uniquePetIds)

  if (petsError) {
    throw new HttpError(500, 'PETS_LOOKUP_FAILED')
  }

  if ((pets ?? []).length !== uniquePetIds.length) {
    throw new HttpError(403, 'PET_NOT_OWNED')
  }

  const now = new Date()
  const forest = expeditionForestById.get(body.expeditionType as ForestId)
  const endsAt = new Date(now.getTime() + (forest?.durationSeconds ?? 60) * 1000)

  const { data: expedition, error } = await supabase
    .from('expeditions')
    .insert({
      user_id: userId,
      pet_ids: uniquePetIds,
      expedition_type: body.expeditionType,
      started_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
      status: 'started',
      reward: null,
    })
    .select('id,pet_ids,expedition_type,started_at,ends_at,status,reward')
    .single()

  if (error || !expedition) {
    throw new HttpError(500, 'EXPEDITION_CREATE_FAILED')
  }

  await createExpeditionLogs(userId, expedition.id, expedition, pets ?? [])

  return {
    id: expedition.id,
    petIds: expedition.pet_ids,
    expeditionType: expedition.expedition_type,
    startedAt: expedition.started_at,
    endsAt: expedition.ends_at,
    status: expedition.status,
    reward: expedition.reward,
  }
}

export async function claimReward(userId: string, input: unknown): Promise<ExpeditionSummary> {
  const body = claimRewardSchema.parse(input)

  const { data: expedition, error: lookupError } = await supabase
    .from('expeditions')
    .select('id,user_id,pet_ids,expedition_type,started_at,ends_at,status,reward')
    .eq('id', body.expeditionId)
    .eq('user_id', userId)
    .single()

  if (lookupError || !expedition) {
    throw new HttpError(404, 'EXPEDITION_NOT_FOUND')
  }

  if (expedition.status !== 'started') {
    throw new HttpError(409, 'EXPEDITION_ALREADY_CLAIMED')
  }

  const now = new Date()

  if (new Date(expedition.ends_at).getTime() > now.getTime()) {
    throw new HttpError(409, 'EXPEDITION_NOT_FINISHED')
  }

  const reward = calculateReward(expedition.id, expedition.pet_ids, expedition.started_at, expedition.ends_at)

  const { data: updated, error: updateError } = await supabase
    .from('expeditions')
    .update({
      status: 'claimed',
      reward,
      claimed_at: now.toISOString(),
    })
    .eq('id', expedition.id)
    .eq('status', 'started')
    .select('id,pet_ids,expedition_type,started_at,ends_at,status,reward')
    .single()

  if (updateError || !updated) {
    throw new HttpError(409, 'EXPEDITION_CLAIM_CONFLICT')
  }

  await applyPetExp(userId, expedition.pet_ids, reward.exp)
  await applyPlayerReward(userId, updated.id, reward)
  await createRewardLog(userId, updated.id, reward)

  return {
    id: updated.id,
    petIds: updated.pet_ids,
    expeditionType: updated.expedition_type,
    startedAt: updated.started_at,
    endsAt: updated.ends_at,
    status: updated.status,
    reward: updated.reward,
  }
}

export async function getExpeditionLogs(userId: string): Promise<ExpeditionLogEntry[]> {
  const { data, error } = await supabase
    .from('expedition_logs')
    .select('id,expedition_id,occurred_at,message_zh,message_en,variant')
    .eq('user_id', userId)
    .lte('occurred_at', new Date().toISOString())
    .order('occurred_at', { ascending: false })
    .limit(50)

  if (error) {
    throw new HttpError(500, 'EXPEDITION_LOGS_LOOKUP_FAILED')
  }

  return (data ?? [])
    .map((log) => ({
      id: log.id,
      expeditionId: log.expedition_id,
      at: log.occurred_at,
      message: {
        zh: log.message_zh,
        en: log.message_en,
      },
      variant: log.variant,
    }))
    .sort((logA, logB) => Date.parse(logA.at) - Date.parse(logB.at))
}

function calculateReward(
  expeditionId: string,
  petIds: string[],
  startedAt: string,
  endsAt: string,
): ExpeditionReward {
  const seed = crypto
    .createHash('sha256')
    .update(`${expeditionId}:${petIds.join(',')}:${startedAt}:${endsAt}`)
    .digest()

  const variance = seed[0] % 31
  return {
    exp: 80 + petIds.length * 20 + variance,
    sepoliaAmount: '0.00000000001',
    materials: [{ id: materialIds[seed[2] % materialIds.length] ?? 'MAT-2C', count: 1 + (seed[3] % 2) }],
  }
}

async function applyPlayerReward(userId: string, expeditionId: string, reward: ExpeditionReward) {
  await Promise.all(
    reward.materials.map((material) => materialBalanceProvider.increase(userId, material.id, material.count)),
  )

  const { error } = await supabase.from('transactions').insert({
    user_id: userId,
    action: 'reward',
    listing_id: null,
    coin_amount: 0,
    metadata: {
      expeditionId,
      exp: reward.exp,
      sepoliaAmount: reward.sepoliaAmount,
      materials: reward.materials,
    },
  })

  if (error) {
    throw new HttpError(500, 'REWARD_TRANSACTION_CREATE_FAILED')
  }
}

async function createExpeditionLogs(
  userId: string,
  expeditionId: string,
  expedition: {
    expedition_type: ForestId
    started_at: string
    ends_at: string
  },
  pets: ExpeditionPetForLog[],
) {
  const forest = expeditionForestById.get(expedition.expedition_type)

  if (!forest) {
    return
  }

  const startedAt = new Date(expedition.started_at).getTime()
  const finishAt = new Date(expedition.ends_at).getTime()
  const durationSeconds = Math.max(1, (finishAt - startedAt) / 1000)
  const eventGap = durationSeconds / (forest.scriptEvents.length + 1)
  const teamPower = calculateTeamPower(pets)
  const teamNamesZh = pets.map((pet) => pet.name).join('、') || '水豚隊'
  const teamNamesEn = pets.map((pet) => pet.name).join(', ') || 'Capybara Team'
  const firstLog: ExpeditionLogInsert = {
    user_id: userId,
    expedition_id: expeditionId,
    occurred_at: expedition.started_at,
    message_zh: `${teamNamesZh} 選擇${forest.name.zh}劇本。隊伍評分 ${teamPower}，難度 ${forest.difficulty}。${abilityNoteZh(teamPower, forest.difficulty)}`,
    message_en: `${teamNamesEn} chose the ${forest.name.en} script. Team score ${teamPower}, difficulty ${forest.difficulty}. ${abilityNoteEn(teamPower, forest.difficulty)}`,
    variant: null,
  }
  const storyLogs = forest.scriptEvents.map((event, index) => {
    const message = storyBeatMessage(event, pets, `${expeditionId}:${index}`)

    return {
      user_id: userId,
      expedition_id: expeditionId,
      occurred_at: new Date(startedAt + Math.round(eventGap * (index + 1) * 1000)).toISOString(),
      message_zh: message.zh,
      message_en: message.en,
      variant: null,
    } satisfies ExpeditionLogInsert
  })
  const finishLog: ExpeditionLogInsert = {
    user_id: userId,
    expedition_id: expeditionId,
    occurred_at: expedition.ends_at,
    message_zh: `${forest.name.zh}劇本完成，遠征隊帶回 ${forest.reward}。`,
    message_en: `${forest.name.en} script completed. The party returned with ${forest.reward}.`,
    variant: null,
  }

  const { error } = await supabase.from('expedition_logs').insert([firstLog, ...storyLogs, finishLog])

  if (error) {
    throw new HttpError(500, 'EXPEDITION_LOG_CREATE_FAILED')
  }
}

async function createRewardLog(userId: string, expeditionId: string, reward: ExpeditionReward) {
  const materialsZh = reward.materials.map((material) => `${materialLabel(material.id, 'zh')} x${material.count}`)
  const materialsEn = reward.materials.map((material) => `${materialLabel(material.id, 'en')} x${material.count}`)
  const rewardsZh = [`${reward.sepoliaAmount} Sepolia`, `${reward.exp} EXP`, ...materialsZh]
  const rewardsEn = [`${reward.sepoliaAmount} Sepolia`, `${reward.exp} EXP`, ...materialsEn]

  const { error } = await supabase.from('expedition_logs').insert({
    user_id: userId,
    expedition_id: expeditionId,
    occurred_at: new Date().toISOString(),
    message_zh: `後端已確認遠征獎勵：${rewardsZh.join('、')}。`,
    message_en: `Backend reward confirmed: ${rewardsEn.join(', ')}.`,
    variant: 'notice',
  })

  if (error) {
    throw new HttpError(500, 'EXPEDITION_LOG_CREATE_FAILED')
  }
}

function calculateTeamPower(pets: ExpeditionPetForLog[]) {
  const total = pets.reduce(
    (sum, pet) => sum + numberStat(pet, 'hp') + numberStat(pet, 'atk') * 1.4 + numberStat(pet, 'def') * 1.2 + pet.stage * 12,
    0,
  )

  return Math.round(total / Math.max(1, pets.length))
}

function numberStat(pet: ExpeditionPetForLog, key: string) {
  const value = pet.stats[key]
  return typeof value === 'number' ? value : 0
}

function abilityNoteZh(power: number, difficulty: number) {
  const requiredPower = 185 + difficulty * 35

  if (power >= requiredPower) {
    return '隊伍能力高於路線需求，劇本結算偏穩定。'
  }

  if (power >= requiredPower - 30) {
    return '隊伍能力接近路線需求，需要留意突發事件。'
  }

  return '隊伍能力低於路線需求，遠征風險偏高。'
}

function abilityNoteEn(power: number, difficulty: number) {
  const requiredPower = 185 + difficulty * 35

  if (power >= requiredPower) {
    return 'The party is stronger than this route requires, so the script should resolve steadily.'
  }

  if (power >= requiredPower - 30) {
    return 'The party is close to the route requirement and should watch for surprises.'
  }

  return 'The party is below the route requirement, so this expedition is risky.'
}

function storyBeatMessage(event: StoryBeat, pets: ExpeditionPetForLog[], seed: string) {
  const outcome = event.outcomes.find((entry, index) => storyConditionMatches(entry.condition, pets, `${seed}:${index}`)) ?? event.outcomes[0]

  return {
    zh: outcome ? `${event.setup.zh} ${outcome.text.zh}` : event.setup.zh,
    en: outcome ? `${event.setup.en} ${outcome.text.en}` : event.setup.en,
  }
}

function storyConditionMatches(condition: StoryCondition | undefined, pets: ExpeditionPetForLog[], seed: string) {
  if (!condition) {
    return true
  }

  const leader = pets[0]

  if (condition.leaderElement && leader?.element !== condition.leaderElement) {
    return false
  }

  if (condition.teamPetName && !pets.some((pet) => pet.name === condition.teamPetName)) {
    return false
  }

  if (typeof condition.chancePercent === 'number' && chanceValue(seed) >= condition.chancePercent) {
    return false
  }

  if (condition.metric && condition.operator && typeof condition.value === 'number') {
    return compareStoryValue(teamMetricValue(pets, condition.metric), condition.operator, condition.value)
  }

  return true
}

function chanceValue(seed: string) {
  return crypto.createHash('sha256').update(seed).digest()[0] % 100
}

function teamMetricValue(pets: ExpeditionPetForLog[], metric: NonNullable<StoryCondition['metric']>) {
  if (metric === 'teamPower') {
    return Math.round(
      pets.reduce((sum, pet) => sum + numberStat(pet, 'hp') + numberStat(pet, 'atk') * 1.4 + numberStat(pet, 'def') * 1.2 + pet.stage * 12, 0),
    )
  }

  if (metric === 'teamHp') {
    return pets.reduce((sum, pet) => sum + numberStat(pet, 'hp'), 0)
  }

  if (metric === 'teamAtk') {
    return pets.reduce((sum, pet) => sum + numberStat(pet, 'atk'), 0)
  }

  return pets.reduce((sum, pet) => sum + numberStat(pet, 'def'), 0)
}

function compareStoryValue(actual: number, operator: StoryCheckOperator, expected: number) {
  if (operator === 'gt') {
    return actual > expected
  }

  if (operator === 'lte') {
    return actual <= expected
  }

  if (operator === 'lt') {
    return actual < expected
  }

  return actual >= expected
}

function materialLabel(materialId: string, locale: 'zh' | 'en') {
  const material = materialDefinitionById.get(materialId)
  return material ? material.name[locale] : materialId
}

async function applyPetExp(userId: string, petIds: string[], exp: number) {
  const perPetExp = Math.floor(exp / petIds.length)

  const { data: pets, error: lookupError } = await supabase
    .from('pets')
    .select('id,exp_current')
    .eq('user_id', userId)
    .in('id', petIds)

  if (lookupError) {
    throw new HttpError(500, 'PETS_LOOKUP_FAILED')
  }

  await Promise.all(
    (pets ?? []).map((pet) =>
      supabase
        .from('pets')
        .update({ exp_current: pet.exp_current + perPetExp })
        .eq('id', pet.id)
        .eq('user_id', userId),
    ),
  )
}
