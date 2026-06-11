export type PetElement = 'citrus' | 'ember' | 'frost' | 'bloom'

export interface LocalizedText {
  zh: string
  en: string
}

export interface PetStatsDefinition {
  iv: number
  hp: number
  maxHp: number
  atk: number
  def: number
}

export interface PetSkillDefinition {
  id: string
  name: LocalizedText
  description: LocalizedText
  tags?: string[]
}

export interface StarterCapybaraDefinition {
  id: string
  slug: string
  name: string
  asset: {
    image: string
    alt: LocalizedText
  }
  element: PetElement
  stage: number
  tokenURI: string
  stats: PetStatsDefinition
  profile: LocalizedText
  leaderSkill: PetSkillDefinition
  skills: PetSkillDefinition[]
}

export const petElementMeta: Record<PetElement, { mark: string; label: LocalizedText; className: string }> = {
  citrus: {
    mark: 'C',
    label: { zh: '柑橘', en: 'Citrus' },
    className: 'is-citrus',
  },
  ember: {
    mark: 'E',
    label: { zh: '火花', en: 'Ember' },
    className: 'is-ember',
  },
  frost: {
    mark: 'F',
    label: { zh: '冰霜', en: 'Frost' },
    className: 'is-frost',
  },
  bloom: {
    mark: 'B',
    label: { zh: '花園', en: 'Bloom' },
    className: 'is-bloom',
  },
}

export const statusRules = [
  {
    id: 'poison',
    name: { zh: '中毒', en: 'Poison' },
    description: {
      zh: '每次事件後受到 20 真實傷害。目前作為劇本標記與前端顯示，不執行實際扣血。',
      en: 'Takes 20 true damage after each event. Currently used as a script tag and frontend display only.',
    },
  },
] satisfies PetSkillDefinition[]

export const starterCapybaras: StarterCapybaraDefinition[] = [
  {
    id: 'TEST-PET-001',
    slug: 'sakikojin',
    name: 'sakiko',
    asset: {
      image: 'assets/capybaras/sakikojin.svg',
      alt: { zh: 'sakiko 水豚肖像', en: 'sakiko capybara portrait' },
    },
    element: 'citrus',
    stage: 1,
    tokenURI: 'test-local://pets/sakiko',
    stats: { iv: 84, hp: 100, maxHp: 100, atk: 75, def: 60 },
    profile: {
      zh: '一隻柑橘水豚，它會彈電子琴，雖然最近似乎破產了所以在打工賺取金錢，但它還是為生活努力的。',
      en: 'A citrus capybara who plays electronic keyboard. It seems to have gone broke recently and now works to earn money, but it still keeps trying hard at life.',
    },
    leaderSkill: {
      id: 'sakiko-proud-leader',
      name: { zh: '高傲的領導者', en: 'Proud Leader' },
      description: { zh: '隊伍全體的恢復能力上升 25%。', en: 'Increases the whole party\'s recovery ability by 25%.' },
      tags: ['recovery', 'script-display'],
    },
    skills: [
      {
        id: 'sakiko-music-performance',
        name: { zh: '樂曲演奏', en: 'Music Performance' },
        description: { zh: '我方全體小幅回血。', en: 'Lightly heals all allies.' },
        tags: ['heal', 'future-combat'],
      },
      {
        id: 'sakiko-disdainful-gaze',
        name: { zh: '鄙夷的眼神', en: 'Disdainful Gaze' },
        description: { zh: '造成全體小幅傷害。', en: 'Deals light damage to all enemies.' },
        tags: ['damage', 'future-combat'],
      },
    ],
  },
  {
    id: 'TEST-PET-002',
    slug: 'max',
    name: 'MAX',
    asset: {
      image: 'assets/capybaras/max.svg',
      alt: { zh: 'MAX 水豚肖像', en: 'MAX capybara portrait' },
    },
    element: 'ember',
    stage: 1,
    tokenURI: 'test-local://pets/max',
    stats: { iv: 91, hp: 95, maxHp: 95, atk: 85, def: 40 },
    profile: {
      zh: 'MAX 一隻火花水豚，會火球術，目標是成為大賢者。',
      en: 'MAX is an ember capybara who can cast fireballs and aims to become a great sage.',
    },
    leaderSkill: {
      id: 'max-magic-apprentice',
      name: { zh: '魔法學徒', en: 'Magic Apprentice' },
      description: { zh: '隊伍全體的攻擊力小幅上升 10%。', en: 'Slightly increases the whole party\'s attack by 10%.' },
      tags: ['attack', 'script-display'],
    },
    skills: [
      {
        id: 'max-magic-amplification',
        name: { zh: '魔力增幅', en: 'Magic Amplification' },
        description: { zh: '下一次的傷害會上升 30%。', en: 'Increases the next damage instance by 30%.' },
        tags: ['buff', 'future-combat'],
      },
      {
        id: 'max-fireball',
        name: { zh: '火球術', en: 'Fireball' },
        description: { zh: '造成單體大幅傷害。', en: 'Deals heavy damage to one target.' },
        tags: ['damage', 'future-combat'],
      },
    ],
  },
  {
    id: 'TEST-PET-003',
    slug: 'sonorato',
    name: 'SONORATO',
    asset: {
      image: 'assets/capybaras/SONORATO-1.svg',
      alt: { zh: 'SONORATO 水豚肖像', en: 'SONORATO capybara portrait' },
    },
    element: 'frost',
    stage: 1,
    tokenURI: 'test-local://pets/sonorato',
    stats: { iv: 76, hp: 90, maxHp: 90, atk: 55, def: 70 },
    profile: {
      zh: 'SONORATO 一隻冰霜水豚，由雪塊組成的冰雪之軀，非常堅固，餓了可以吃，不用擔心它會自己長出來。',
      en: 'SONORATO is a frost capybara with a sturdy body made of snow blocks. If hungry, you can eat it, and it will grow back on its own.',
    },
    leaderSkill: {
      id: 'sonorato-snow-body',
      name: { zh: '雪之軀', en: 'Snow Body' },
      description: { zh: '隊伍全體的防禦上升 15%。', en: 'Increases the whole party\'s defense by 15%.' },
      tags: ['defense', 'script-display'],
    },
    skills: [
      {
        id: 'sonorato-self-repair',
        name: { zh: '自我復原', en: 'Self Repair' },
        description: {
          zh: '被動每秒回復 2% 已損失血量；主動立刻回復 5% 最大生命。',
          en: 'Passively recovers 2% of missing HP each second; actively restores 5% of max HP immediately.',
        },
        tags: ['heal', 'future-combat'],
      },
      {
        id: 'sonorato-snow-flower',
        name: { zh: '雪之華', en: 'Snow Flower' },
        description: { zh: '回復一個單位 25% 血量，但自損 10%。', en: 'Restores 25% HP to one unit, but loses 10% HP itself.' },
        tags: ['heal', 'future-combat'],
      },
    ],
  },
  {
    id: 'TEST-PET-004',
    slug: 'worrior',
    name: 'CANESAN',
    asset: {
      image: 'assets/capybaras/warrior-1.svg',
      alt: { zh: 'CANESAN 水豚肖像', en: 'CANESAN capybara portrait' },
    },
    element: 'bloom',
    stage: 1,
    tokenURI: 'test-local://pets/canesan',
    stats: { iv: 88, hp: 120, maxHp: 120, atk: 90, def: 85 },
    profile: {
      zh: 'CANESAN 一隻花園水豚，身懷武士之魂的流浪水豚，會保護它所愛的一切事物。',
      en: 'CANESAN is a bloom capybara, a wanderer with a samurai soul who protects everything it loves.',
    },
    leaderSkill: {
      id: 'canesan-samurai-heart',
      name: { zh: '武士之心', en: 'Samurai Heart' },
      description: { zh: '全體血量上升 15%。', en: 'Increases the whole party\'s HP by 15%.' },
      tags: ['hp', 'script-display'],
    },
    skills: [
      {
        id: 'canesan-self-repair',
        name: { zh: '自我復原', en: 'Self Repair' },
        description: {
          zh: '被動每秒回復 2% 已損失血量；主動立刻回復 5% 最大生命。',
          en: 'Passively recovers 2% of missing HP each second; actively restores 5% of max HP immediately.',
        },
        tags: ['heal', 'future-combat'],
      },
      {
        id: 'canesan-cross-cleave',
        name: { zh: '橫劈', en: 'Cross Cleave' },
        description: { zh: '造成全體低傷害，附帶流血效果。', en: 'Deals low damage to all enemies and applies bleeding.' },
        tags: ['damage', 'future-combat'],
      },
      {
        id: 'canesan-single-slash',
        name: { zh: '一字斬', en: 'Single Slash' },
        description: { zh: '造成單體傷害，有 5% 機率必殺。', en: 'Deals single-target damage with a 5% instant-kill chance.' },
        tags: ['damage', 'future-combat'],
      },
    ],
  },
]

export const starterCapybaraById = Object.fromEntries(starterCapybaras.map((pet) => [pet.id, pet])) as Record<
  string,
  StarterCapybaraDefinition
>

export const starterCapybaraByName = Object.fromEntries(starterCapybaras.map((pet) => [pet.name, pet])) as Record<
  string,
  StarterCapybaraDefinition
>
