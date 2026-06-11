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
    name: { zh: '柚子果', en: 'Yuzu Bite' },
    element: 2,
    grade: 'C',
    description: '帶著清爽香氣的柚子素材，常見於橘子森林。可作為交易、料理或後續強化系統的基礎材料。',
  },
  {
    id: 'MAT-4B',
    slug: 'ice-crystal',
    asset: {
      imageFrames: [],
      iconKey: 'material-4',
    },
    name: { zh: '冰晶', en: 'Ice Crystal' },
    element: 4,
    grade: 'B',
    description: '水蜜桃雪森深處凝結出的透明冰晶，帶有穩定寒氣，可作為高階強化或冰霜料理素材。',
  },
  {
    id: 'MAT-3C',
    slug: 'persimmon-jam',
    asset: {
      imageFrames: [],
      iconKey: 'material-3',
    },
    name: { zh: '柿子果醬', en: 'Persimmon Jam' },
    element: 3,
    grade: 'C',
    description: '蘋果森林商隊留下的甜柿果醬，適合作為料理、交易與後續支援型強化素材。',
  },
]

export const materialDefinitionById = Object.fromEntries(
  materialDefinitions.map((material) => [material.id, material]),
) as Record<string, MaterialDefinition>

export const materialIds = materialDefinitions.map((material) => material.id)

export function isKnownMaterialId(materialId: string) {
  return materialId in materialDefinitionById
}
