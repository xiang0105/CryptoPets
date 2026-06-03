import type { LocalizedText } from './capybaras.js'

export type GoodieElement = 1 | 2 | 3 | 4
export type GoodieGrade = 'A' | 'B' | 'C' | 'D'
export type ListingStatus = 'active' | 'sold' | 'draft'

export interface MaterialDefinition {
  id: string
  slug: string
  asset: {
    imageFrames: string[]
    iconKey: string
  }
  name: LocalizedText
  element: GoodieElement
  grade: GoodieGrade
  description: string
}

export const materialDefinitions: MaterialDefinition[] = [
  {
    id: 'MAT-2C',
    slug: 'yuzu-bite',
    asset: {
      imageFrames: [
        'assets/goodies/yuzu-bite-1.png',
        'assets/goodies/yuzu-bite-2.png',
        'assets/goodies/yuzu-bite-3.png',
        'assets/goodies/yuzu-bite-4.png',
      ],
      iconKey: 'material-2',
    },
    name: { zh: '柚子碎片', en: 'Yuzu Bite' },
    element: 2,
    grade: 'C',
    description: '帶有柑橘香氣的基礎素材，可用於水豚進階。',
  },
  {
    id: 'MAT-4B',
    slug: 'snow-peach',
    asset: {
      imageFrames: [],
      iconKey: 'material-4',
    },
    name: { zh: '雪蜜桃', en: 'Snow Peach' },
    element: 4,
    grade: 'B',
    description: '寒霧森林中取得的稀有素材，可用於高階培育。',
  },
]

export const materialDefinitionById = Object.fromEntries(
  materialDefinitions.map((material) => [material.id, material]),
) as Record<string, MaterialDefinition>

export const materialIds = materialDefinitions.map((material) => material.id)

export function isKnownMaterialId(materialId: string) {
  return materialId in materialDefinitionById
}
