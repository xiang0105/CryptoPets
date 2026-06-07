import type { PlayerProfile } from '@cryptopets/shared'
import type { PetStatsDefinition, StarterCapybaraDefinition } from '@cryptopets/game-content'
import { starterCapybaraById, starterCapybaras } from '@cryptopets/game-content'
import { env } from '../config/env.js'
import { supabase } from '../config/supabase.js'
import { HttpError } from '../utils/httpError.js'
import { createChainPetProvider, isChainPetSyncEnabled } from './chainPetProvider.js'

const DEFAULT_BASE_PET_ID = 'TEST-PET-001'

export async function initializePlayerIfNeeded(userId: string, wallet?: PlayerProfile['wallet']) {
  if (isChainPetSyncEnabled()) {
    const userWallet = wallet ?? (await getUserWallet(userId))
    await syncOnChainPets(userId, userWallet)
    await ensureCurrency(userId)
    return
  }

  const { count, error: countError } = await supabase
    .from('pets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (countError) {
    throw new HttpError(500, 'PETS_LOOKUP_FAILED')
  }

  if ((count ?? 0) > 0) {
    return
  }

  const now = new Date().toISOString()
  const contractAddress = (env.NFT_CONTRACT_ADDRESS ?? '0x0000000000000000000000000000000000000000').toLowerCase()
  const pets = starterCapybaras.map((pet) => ({
    user_id: userId,
    token_id: `${userId}:${pet.id}`,
    contract_address: contractAddress,
    chain_id: env.CHAIN_ID,
    base_pet_id: pet.id,
    iv: pet.stats.iv,
    skin_id: 0,
    name: pet.name,
    element: pet.element,
    stage: pet.stage,
    token_uri: pet.tokenURI,
    stats: pet.stats,
    exp_current: 0,
    exp_next: 1000,
    birth_time: now,
  }))

  const { error: insertError } = await supabase.from('pets').insert(pets)

  if (insertError) {
    throw new HttpError(500, 'STARTER_PETS_CREATE_FAILED')
  }

  await ensureCurrency(userId, now)
}

export async function getPlayerProfile(userId: string): Promise<PlayerProfile> {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id,wallet,username')
    .eq('id', userId)
    .single()

  if (userError || !user) {
    throw new HttpError(404, 'PLAYER_NOT_FOUND')
  }

  if (isChainPetSyncEnabled()) {
    await syncOnChainPets(userId, user.wallet)
  }

  const { data: pets, error: petsError } = await supabase
    .from('pets')
    .select('id,token_id,contract_address,chain_id,base_pet_id,iv,skin_id,name,element,stage,token_uri,stats,exp_current,exp_next,birth_time')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (petsError) {
    throw new HttpError(500, 'PETS_LOOKUP_FAILED')
  }

  const { data: expedition, error: expeditionError } = await supabase
    .from('expeditions')
    .select('id,pet_ids,expedition_type,started_at,ends_at,status,reward')
    .eq('user_id', userId)
    .eq('status', 'started')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (expeditionError) {
    throw new HttpError(500, 'EXPEDITION_LOOKUP_FAILED')
  }

  return {
    id: user.id,
    wallet: user.wallet,
    username: user.username,
    chain: {
      enabled: isConfiguredContract(env.NFT_CONTRACT_ADDRESS) && Boolean(env.RPC_URL),
      chainId: env.CHAIN_ID,
      nftContractAddress: isConfiguredContract(env.NFT_CONTRACT_ADDRESS)
        ? (env.NFT_CONTRACT_ADDRESS as PlayerProfile['chain']['nftContractAddress'])
        : null,
    },
    pets: (pets ?? []).map((pet) => ({
      id: pet.id,
      tokenId: pet.token_id,
      contractAddress: pet.contract_address,
      chainId: pet.chain_id,
      basePetId: pet.base_pet_id,
      skinId: pet.skin_id,
      name: pet.name,
      element: pet.element,
      stage: pet.stage,
      tokenUri: pet.token_uri,
      stats: pet.stats,
      exp: {
        current: pet.exp_current,
        next: pet.exp_next,
      },
      birthTime: pet.birth_time,
    })),
    activeExpedition: expedition
      ? {
          id: expedition.id,
          petIds: expedition.pet_ids,
          expeditionType: expedition.expedition_type,
          startedAt: expedition.started_at,
          endsAt: expedition.ends_at,
          status: expedition.status,
          reward: expedition.reward,
        }
      : null,
  }
}

export function deriveStatsFromIv(baseStats: PetStatsDefinition, iv: number): PetStatsDefinition {
  return {
    iv,
    hp: scaleStat(baseStats.hp, iv),
    maxHp: scaleStat(baseStats.maxHp, iv),
    atk: scaleStat(baseStats.atk, iv),
    def: scaleStat(baseStats.def, iv),
  }
}

async function syncOnChainPets(userId: string, wallet: PlayerProfile['wallet']) {
  const chainPets = await createChainPetProvider().getWalletPets(wallet)
  const contractAddress = (env.NFT_CONTRACT_ADDRESS as string).toLowerCase()

  if (chainPets.length === 0) {
    return
  }

  const basePet = getDefaultBasePet()
  const rows = chainPets.map((pet) => ({
    user_id: userId,
    token_id: pet.tokenId,
    contract_address: contractAddress,
    chain_id: env.CHAIN_ID,
    base_pet_id: basePet.id,
    iv: pet.iv,
    skin_id: pet.skinId,
    name: basePet.name,
    element: basePet.element,
    stage: basePet.stage,
    token_uri: basePet.tokenURI,
    stats: deriveStatsFromIv(basePet.stats, pet.iv),
  }))

  const { error } = await supabase.from('pets').upsert(rows, {
    onConflict: 'chain_id,contract_address,token_id',
  })

  if (error) {
    throw new HttpError(500, 'CHAIN_PETS_SYNC_FAILED')
  }
}

async function getUserWallet(userId: string): Promise<PlayerProfile['wallet']> {
  const { data: user, error } = await supabase.from('users').select('wallet').eq('id', userId).single()

  if (error || !user) {
    throw new HttpError(404, 'PLAYER_NOT_FOUND')
  }

  return user.wallet
}

async function ensureCurrency(userId: string, now = new Date().toISOString()) {
  await supabase.from('currencies').upsert({
    user_id: userId,
    coins: 0,
    updated_at: now,
  })
}

function getDefaultBasePet(): StarterCapybaraDefinition {
  const pet = starterCapybaraById[DEFAULT_BASE_PET_ID]

  if (!pet) {
    throw new HttpError(500, 'DEFAULT_BASE_PET_NOT_FOUND')
  }

  return pet
}

function scaleStat(baseStat: number, iv: number) {
  return Math.round(baseStat * (1 + iv / 100))
}

function isConfiguredContract(address: string | undefined) {
  return Boolean(address && !/^0x0{40}$/i.test(address))
}
