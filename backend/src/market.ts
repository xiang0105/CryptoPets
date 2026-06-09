export interface PetMarketListing {
  tokenId: string
  seller: string
  priceWei: string
}

export interface MaterialMarketListing {
  listingId: string
  seller: string
  materialId: string
  amount: string
  priceWei: string
}

export type PetMarketEvent =
  | {
      type: 'listed'
      tokenId: string
      seller: string
      priceWei: string
      blockNumber: number
      logIndex: number
    }
  | {
      type: 'canceled' | 'bought'
      tokenId: string
      blockNumber: number
      logIndex: number
    }

export type MaterialMarketEvent =
  | {
      type: 'listed'
      listingId: string
      seller: string
      materialId: string
      amount: string
      priceWei: string
      blockNumber: number
      logIndex: number
    }
  | {
      type: 'canceled' | 'bought'
      listingId: string
      blockNumber: number
      logIndex: number
    }

export function reducePetMarketEvents(events: PetMarketEvent[]) {
  const listings = new Map<string, PetMarketListing>()

  for (const event of sortEvents(events)) {
    if (event.type === 'listed') {
      listings.set(event.tokenId, {
        tokenId: event.tokenId,
        seller: event.seller,
        priceWei: event.priceWei
      })
      continue
    }

    listings.delete(event.tokenId)
  }

  return Array.from(listings.values()).sort((a, b) => compareDecimalStrings(a.tokenId, b.tokenId))
}

export function reduceMaterialMarketEvents(events: MaterialMarketEvent[]) {
  const listings = new Map<string, MaterialMarketListing>()

  for (const event of sortEvents(events)) {
    if (event.type === 'listed') {
      listings.set(event.listingId, {
        listingId: event.listingId,
        seller: event.seller,
        materialId: event.materialId,
        amount: event.amount,
        priceWei: event.priceWei
      })
      continue
    }

    listings.delete(event.listingId)
  }

  return Array.from(listings.values()).sort((a, b) => compareDecimalStrings(a.listingId, b.listingId))
}

function sortEvents<T extends { blockNumber: number; logIndex: number }>(events: T[]) {
  return [...events].sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) {
      return a.blockNumber - b.blockNumber
    }

    return a.logIndex - b.logIndex
  })
}

function compareDecimalStrings(a: string, b: string) {
  const left = BigInt(a)
  const right = BigInt(b)

  if (left === right) {
    return 0
  }

  return left < right ? -1 : 1
}
