import { z } from 'zod'
import type { AddFriendRequest, FriendSummary } from '@cryptopets/shared'
import { supabase } from '../config/supabase.js'
import { HttpError } from '../utils/httpError.js'

const addFriendSchema: z.ZodType<AddFriendRequest> = z.object({
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
}).strict()

export async function addFriend(userId: string, input: unknown) {
  const body = addFriendSchema.parse(input)
  const targetWallet = body.wallet.toLowerCase()

  const { data: requester } = await supabase.from('users').select('id,wallet').eq('id', userId).single()

  if (!requester) {
    throw new HttpError(404, 'PLAYER_NOT_FOUND')
  }

  if (requester.wallet === targetWallet) {
    throw new HttpError(400, 'CANNOT_ADD_SELF')
  }

  const { data: recipient, error: recipientError } = await supabase
    .from('users')
    .select('id,wallet')
    .eq('wallet', targetWallet)
    .maybeSingle()

  if (recipientError) {
    throw new HttpError(500, 'FRIEND_LOOKUP_FAILED')
  }

  if (!recipient) {
    throw new HttpError(404, 'FRIEND_WALLET_NOT_FOUND')
  }

  const { data: reciprocal } = await supabase
    .from('friend_requests')
    .select('id')
    .eq('requester_id', recipient.id)
    .eq('recipient_id', userId)
    .eq('status', 'pending')
    .maybeSingle()

  if (reciprocal) {
    await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', reciprocal.id)
    await createFriendship(userId, recipient.id)
    return { status: 'accepted' }
  }

  const { error } = await supabase.from('friend_requests').upsert(
    {
      requester_id: userId,
      recipient_id: recipient.id,
      status: 'pending',
    },
    { onConflict: 'requester_id,recipient_id' },
  )

  if (error) {
    throw new HttpError(500, 'FRIEND_REQUEST_FAILED')
  }

  return { status: 'pending' }
}

export async function getFriends(userId: string): Promise<FriendSummary[]> {
  const { data, error } = await supabase
    .from('friends')
    .select('created_at,friend:friend_id(id,wallet,username)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new HttpError(500, 'FRIENDS_LOOKUP_FAILED')
  }

  return (data ?? []).flatMap((row) => {
    const friend = Array.isArray(row.friend) ? row.friend[0] : row.friend

    if (!friend) {
      return []
    }

    return {
      id: friend.id,
      wallet: friend.wallet,
      username: friend.username,
      since: row.created_at,
    }
  })
}

async function createFriendship(userA: string, userB: string) {
  const rows = [
    { user_id: userA, friend_id: userB },
    { user_id: userB, friend_id: userA },
  ]

  const { error } = await supabase.from('friends').upsert(rows, { onConflict: 'user_id,friend_id' })

  if (error) {
    throw new HttpError(500, 'FRIEND_CREATE_FAILED')
  }
}
