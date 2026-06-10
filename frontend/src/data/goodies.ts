import type { GoodieElement, GoodieGrade, ListingStatus } from '@cryptopets/game-content'

export type { GoodieElement, GoodieGrade, ListingStatus }

export interface GoodieSft {
  id: string
  name: {
    zh: string
    en: string
  }
  element: GoodieElement
  grade: GoodieGrade
  amount: number
  description: string
  imageUrl?: string
  price: number
  status: ListingStatus
}

// Backend API is the source of truth. This cache is only a view model store.
export const goodies: GoodieSft[] = []

export function replaceGoodies(nextGoodies: GoodieSft[]) {
  goodies.splice(0, goodies.length, ...nextGoodies)
}
