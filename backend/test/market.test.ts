import { describe, expect, it } from 'vitest'
import { reduceMaterialMarketEvents, reducePetMarketEvents } from '../src/market.js'

describe('market reducers', () => {
  it('keeps only active pet listings', () => {
    const listings = reducePetMarketEvents([
      {
        type: 'listed',
        tokenId: '1',
        seller: '0x0000000000000000000000000000000000000001',
        priceWei: '100',
        blockNumber: 1,
        logIndex: 1
      },
      {
        type: 'listed',
        tokenId: '2',
        seller: '0x0000000000000000000000000000000000000002',
        priceWei: '200',
        blockNumber: 2,
        logIndex: 1
      },
      {
        type: 'bought',
        tokenId: '1',
        blockNumber: 3,
        logIndex: 1
      }
    ])

    expect(listings).toEqual([
      {
        tokenId: '2',
        seller: '0x0000000000000000000000000000000000000002',
        priceWei: '200'
      }
    ])
  })

  it('keeps only active material listings', () => {
    const listings = reduceMaterialMarketEvents([
      {
        type: 'listed',
        listingId: '1',
        seller: '0x0000000000000000000000000000000000000001',
        materialId: '1',
        amount: '3',
        priceWei: '100',
        blockNumber: 1,
        logIndex: 1
      },
      {
        type: 'listed',
        listingId: '2',
        seller: '0x0000000000000000000000000000000000000002',
        materialId: '2',
        amount: '5',
        priceWei: '200',
        blockNumber: 2,
        logIndex: 1
      },
      {
        type: 'canceled',
        listingId: '2',
        blockNumber: 3,
        logIndex: 1
      }
    ])

    expect(listings).toEqual([
      {
        listingId: '1',
        seller: '0x0000000000000000000000000000000000000001',
        materialId: '1',
        amount: '3',
        priceWei: '100'
      }
    ])
  })
})
