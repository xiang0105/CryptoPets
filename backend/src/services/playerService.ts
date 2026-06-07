import type { PlayerProfile } from '@cryptopets/shared'
import { starterCapybaras } from '@cryptopets/game-content'
import { env } from '../config/env.js'
import { supabase } from '../config/supabase.js'
import { HttpError } from '../utils/httpError.js'

export async function initializePlayerIfNeeded(userId: string) {
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

  await supabase.from('currencies').upsert({
    user_id: userId,
    coins: 0,
    updated_at: now,
  })
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

  const { data: pets, error: petsError } = await supabase
    .from('pets')
    .select('id,token_id,contract_address,chain_id,name,element,stage,token_uri,stats,exp_current,exp_next,birth_time')
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

function isConfiguredContract(address: string | undefined) {
  return Boolean(address && !/^0x0{40}$/i.test(address))
}
