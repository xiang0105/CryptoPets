const apiErrorMessages: Record<string, string> = {
  ADD_FRIEND_FAILED: 'Friend request failed. Please check the wallet address and try again.',
  API_ERROR: 'The server could not complete the request. Please try again.',
  AUTH_REQUIRED: 'Please sign in with your wallet before continuing.',
  CANNOT_BUY_OWN_LISTING: 'You cannot buy your own market listing.',
  DUPLICATE_PET_IDS: 'Choose each expedition pet only once.',
  EXPEDITION_ALREADY_ACTIVE: 'An expedition is already active. Finish it before starting another one.',
  EXPEDITION_ALREADY_CLAIMED: 'This expedition reward has already been claimed. Refresh your adventure status.',
  EXPEDITION_CLAIM_CONFLICT: 'The reward could not be claimed because the expedition changed. Refresh and try again.',
  EXPEDITION_CREATE_FAILED: 'The expedition could not be started. Please try again.',
  EXPEDITION_LOOKUP_FAILED: 'Expedition status could not be loaded. Please try again.',
  EXPEDITION_NOT_FOUND: 'That expedition could not be found. Refresh your adventure status.',
  EXPEDITION_NOT_FINISHED: 'The expedition is still in progress. Check back when the timer finishes.',
  FRIEND_ALREADY_EXISTS: 'This wallet is already on your friend list.',
  INSUFFICIENT_COINS: 'You do not have enough coins for this action.',
  INSUFFICIENT_MATERIAL: 'You do not have enough of that material.',
  INTERNAL_SERVER_ERROR: 'Something went wrong on the server. Please try again.',
  INVALID_REQUEST: 'Some request details were invalid. Please check your selection and try again.',
  INVALID_TOKEN: 'Your session expired. Please sign in again.',
  PET_NOT_OWNED: 'One or more selected pets are not available in your wallet session. Refresh your pets and try again.',
  PETS_LOOKUP_FAILED: 'Pet data could not be checked. Please try again.',
  LISTING_NOT_ACTIVE: 'This listing is no longer active. Refresh the marketplace.',
  MARKET_LISTING_NOT_FOUND: 'This listing no longer exists. Refresh the marketplace.',
  PLAYER_NOT_FOUND: 'Player data could not be found. Please sign in again.',
  VALIDATION_ERROR: 'Some request details were invalid. Please check your selection and try again.',
}

export function translateApiError(error: unknown, fallback: string) {
  const code = error instanceof Error ? error.message : ''

  if (code && apiErrorMessages[code]) {
    return apiErrorMessages[code]
  }

  return code || fallback
}
