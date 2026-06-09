import type { LocalizedText, PetElement } from './expeditionTypes.js'

export type ForestId = 'orange' | 'apple' | 'snow-peach'
export type StoryCheckMetric = 'teamPower' | 'teamHp' | 'teamAtk' | 'teamDef'
export type StoryCheckOperator = 'gte' | 'gt' | 'lte' | 'lt'

export interface StoryCondition {
  metric?: StoryCheckMetric
  operator?: StoryCheckOperator
  value?: number
  leaderElement?: PetElement
  teamPetName?: string
  chancePercent?: number
}

export interface StoryOutcome {
  id: string
  condition?: StoryCondition
  text: LocalizedText
  rewardMultiplier?: number
  tags?: string[]
}

export interface StoryBeat {
  id: string
  setup: LocalizedText
  outcomes: StoryOutcome[]
}

export interface ExpeditionForest {
  id: ForestId
  asset: {
    cover?: string
    iconKey: string
  }
  difficulty: number
  durationSeconds: number
  reward: string
  name: LocalizedText
  summary: LocalizedText
  scriptEvents: StoryBeat[]
}

export interface GameStoryChapter {
  id: string
  title: LocalizedText
  description: LocalizedText
  beats: StoryBeat[]
}

const canesanSlay: StoryOutcome = {
  id: 'canesan-monster-slay',
  condition: { teamPetName: 'CANESAN', chancePercent: 5 },
  text: {
    zh: 'CANESAN 的武士之魂突然爆發，抓住怪物破綻一擊制勝，隊伍獲得大量獎勵。',
    en: 'CANESAN\'s samurai spirit flared at the perfect moment, defeating the monster in one decisive strike and earning a large reward.',
  },
  rewardMultiplier: 1.5,
  tags: ['canesan', 'monster', 'script-simulation'],
}

const commonEvents: StoryBeat[] = [
  {
    id: 'common-giant-beetle',
    setup: {
      zh: '一隻巨大的金龜子正在啃食擋路的巨大橘子，對你們發出了威嚇！',
      en: 'A giant beetle was chewing on a huge orange blocking the road and threatened the party.',
    },
    outcomes: [
      canesanSlay,
      {
        id: 'beetle-high-hp',
        condition: { metric: 'teamHp', operator: 'gte', value: 200 },
        text: {
          zh: '水豚們靠著厚實的血量與金龜子硬碰硬，成功把牠撞飛，獲得經驗值與微量素材。',
          en: 'With enough HP, the capybaras stood their ground and knocked the beetle away, earning experience and a small amount of materials.',
        },
        rewardMultiplier: 1.1,
      },
      {
        id: 'beetle-low-hp',
        text: {
          zh: '水豚們體力不支被金龜子撞飛，灰頭土臉地繞路。全體受到 15 傷害，遠征時間稍微增加。',
          en: 'The party lacked stamina and was knocked aside, forcing a messy detour. Everyone takes 15 damage in the script and the expedition slows slightly.',
        },
        rewardMultiplier: 0.9,
        tags: ['damage-display'],
      },
    ],
  },
  {
    id: 'common-syrup-snake',
    setup: {
      zh: '一隻糖漿蛇從樹上飛撲下來攻擊一隻水豚。',
      en: 'A syrup snake leapt down from a tree and attacked one capybara.',
    },
    outcomes: [
      canesanSlay,
      {
        id: 'snake-high-atk',
        condition: { metric: 'teamAtk', operator: 'gte', value: 150 },
        text: {
          zh: '隊伍攻擊達標，成功擊倒糖漿蛇，獲得初級進化道具。',
          en: 'The party met the attack requirement, defeated the syrup snake, and gained a basic evolution item.',
        },
        rewardMultiplier: 1.2,
      },
      {
        id: 'snake-low-atk',
        text: {
          zh: '糖漿蛇咬了一隻水豚後飛速逃跑。該水豚在劇本中受到 80 - DEF 的傷害並中毒。',
          en: 'The syrup snake bit one capybara and fled. In the script, that capybara takes 80 minus DEF damage and becomes poisoned.',
        },
        rewardMultiplier: 0.85,
        tags: ['damage-display', 'poison'],
      },
    ],
  },
  {
    id: 'common-acid-slime',
    setup: {
      zh: '一隻充滿強酸的「特酸史萊姆」從樹上掉了下來，身體劇烈膨脹準備自爆！',
      en: 'A highly acidic slime fell from a tree, swelling violently as it prepared to explode.',
    },
    outcomes: [
      canesanSlay,
      {
        id: 'slime-high-atk',
        condition: { metric: 'teamAtk', operator: 'gte', value: 180 },
        text: {
          zh: '隊伍在牠自爆前發動猛烈攻擊將其擊潰，成功提取了純淨的酸液素材，獎勵大幅提升。',
          en: 'The party struck hard before it exploded, extracting pure acidic material and greatly improving the reward.',
        },
        rewardMultiplier: 1.35,
      },
      {
        id: 'slime-low-atk',
        text: {
          zh: '攻擊力不足以秒殺，史萊姆成功自爆！強酸四濺，腐蝕了部分剛採集到的素材，並造成真實傷害。',
          en: 'The party lacked enough attack to stop it. The slime exploded, acid splashed everywhere, some gathered materials were ruined, and the script applies true damage.',
        },
        rewardMultiplier: 0.7,
        tags: ['damage-display'],
      },
    ],
  },
  {
    id: 'common-orchard-spirit',
    setup: {
      zh: '發現一隻發著微光的果園精靈被巨大的毒蜘蛛網死死纏住了！',
      en: 'The party found a faintly glowing orchard spirit trapped in a huge poisonous spider web.',
    },
    outcomes: [
      {
        id: 'spirit-ember-leader',
        condition: { leaderElement: 'ember' },
        text: {
          zh: '火花隊長精準地噴吐火花燒毀蛛網，精靈為了報恩給予強效祝福。無傷過關，獎勵增加。',
          en: 'The ember leader burned away the web with precise sparks. The grateful spirit gave a strong blessing, increasing the reward with no harm taken.',
        },
        rewardMultiplier: 1.2,
        tags: ['leader-element'],
      },
      {
        id: 'spirit-frost-leader',
        condition: { leaderElement: 'frost' },
        text: {
          zh: '冰霜隊長將蛛網瞬間凍結後輕易敲碎，救出了精靈。無傷過關，獎勵增加。',
          en: 'The frost leader froze the web and shattered it easily, rescuing the spirit with no harm and increasing the reward.',
        },
        rewardMultiplier: 1.2,
        tags: ['leader-element'],
      },
      {
        id: 'spirit-normal',
        text: {
          zh: '水豚們只能七手八腳地強行扯破蛛網，過程中被隱藏的毒蜘蛛咬傷，全體受到中毒傷害。',
          en: 'The party had to tear the web apart by force and was bitten by hidden poisonous spiders. The whole party receives poison damage in the script.',
        },
        rewardMultiplier: 0.85,
        tags: ['poison'],
      },
    ],
  },
  {
    id: 'common-special-chest',
    setup: {
      zh: '在森林深處遇到了一個特別的寶箱，隊伍試著打開它。',
      en: 'Deep in the forest, the party found a special chest and tried to open it.',
    },
    outcomes: [
      canesanSlay,
      {
        id: 'chest-nothing',
        condition: { chancePercent: 20 },
        text: {
          zh: '寶箱裡面沒什麼有用的，隊伍什麼都沒得到。',
          en: 'There was nothing useful inside, and the party gained nothing.',
        },
      },
      {
        id: 'chest-evolution-item',
        condition: { chancePercent: 75 },
        text: {
          zh: '寶箱裡有些有趣的東西，隊伍獲得初階進化道具。',
          en: 'The chest held something interesting, and the party gained a basic evolution item.',
        },
        rewardMultiplier: 1.2,
      },
      {
        id: 'chest-acid-slime',
        text: {
          zh: '寶箱裡竟然跳出特酸橘子史萊姆！高級史萊姆自爆，全體受到 50% 最大生命值的真實傷害，但仍獲得初階進化道具。',
          en: 'A sour orange slime jumped out of the chest. The advanced slime exploded, dealing true damage equal to 50% max HP in the script, but the party still gained a basic evolution item.',
        },
        rewardMultiplier: 1.05,
        tags: ['monster', 'damage-display'],
      },
    ],
  },
]

const orangeOnlyEvents: StoryBeat[] = [
  {
    id: 'orange-thorn-flower-field',
    setup: {
      zh: '前方是一片充滿香氣的橘子花海，但裡頭佈滿了帶刺的藤蔓。',
      en: 'Ahead was a fragrant orange flower field filled with thorny vines.',
    },
    outcomes: [
      {
        id: 'orange-field-citrus-leader',
        condition: { leaderElement: 'citrus' },
        text: {
          zh: '柑橘隊長憑藉著對柑橘香氣的敏銳嗅覺，輕鬆找到安全路徑。無傷通過，並在花叢中找到初階進化道具。',
          en: 'The citrus leader used its sharp sense for citrus scents to find a safe route, passing unharmed and finding a basic evolution item among the flowers.',
        },
        rewardMultiplier: 1.2,
        tags: ['leader-element'],
      },
      {
        id: 'orange-field-normal',
        text: {
          zh: '水豚們只能強行擠過藤蔓叢，全體受到 30 傷害。',
          en: 'The capybaras had to push through the vines by force, taking 30 damage in the script.',
        },
        rewardMultiplier: 0.9,
        tags: ['damage-display'],
      },
    ],
  },
  {
    id: 'orange-rolling-giant-orange',
    setup: {
      zh: '有一顆超巨大的橘子由山坡上滾下來了，似乎沒有地方可以躲，只能硬接了。',
      en: 'A gigantic orange rolled down the hill. There seemed to be nowhere to dodge, so the party had to catch it head-on.',
    },
    outcomes: [
      {
        id: 'rolling-orange-high-def',
        condition: { metric: 'teamDef', operator: 'gte', value: 150 },
        text: {
          zh: '隊伍防禦達標，大家平穩地接下橘子，獲得額外果肉。',
          en: 'The party met the defense requirement and caught the orange steadily, gaining extra pulp.',
        },
        rewardMultiplier: 1.2,
      },
      {
        id: 'rolling-orange-low-def',
        text: {
          zh: '隊伍沒做好防備，全體在劇本中受到傷害並緩速。',
          en: 'The party was not prepared, so everyone takes damage and is slowed in the script.',
        },
        rewardMultiplier: 0.85,
        tags: ['damage-display', 'slow'],
      },
    ],
  },
  {
    id: 'orange-sticky-marsh',
    setup: {
      zh: '隊伍不小心走入了一片散發著甜香的黏稠橘子泥沼，越掙扎陷得越深！',
      en: 'The party accidentally stepped into a sticky orange marsh with a sweet aroma, sinking deeper the more they struggled.',
    },
    outcomes: [
      {
        id: 'marsh-high-power',
        condition: { metric: 'teamPower', operator: 'gte', value: 350 },
        text: {
          zh: '水豚們展現出驚人的綜合實力，硬生生拔出泥沼，還在底部撈到了前人遺留的寶物，獲得額外掉落。',
          en: 'The capybaras showed impressive overall power, pulled themselves free, and found treasure left at the bottom for extra drops.',
        },
        rewardMultiplier: 1.25,
      },
      {
        id: 'marsh-low-power',
        text: {
          zh: '隊伍在泥沼中折騰了半天才狼狽脫身，全身黏糊糊的，體力大量流失，獎勵稍微降低。',
          en: 'The party struggled for a long time before escaping, sticky and exhausted, slightly reducing the reward.',
        },
        rewardMultiplier: 0.9,
      },
    ],
  },
]

const appleOnlyEvents: StoryBeat[] = [
  {
    id: 'apple-hard-fruit-storm',
    setup: {
      zh: '隊伍經過一棵古老的巨大蘋果樹下，突然颳起一陣狂風，樹上如落石般砸下一陣密集的巨型硬蘋果！',
      en: 'As the party passed under an ancient giant apple tree, a gust of wind shook loose a storm of huge hard apples like falling stones.',
    },
    outcomes: [
      {
        id: 'apple-storm-high-hp',
        condition: { metric: 'teamHp', operator: 'gte', value: 250 },
        text: {
          zh: '水豚們靠著厚實的脂肪與充沛的體力，把掉下來的巨型蘋果當成足球頂來頂去，玩得不亦樂乎。無傷通過，並獲得大量素材。',
          en: 'With thick padding and plenty of stamina, the capybaras bounced the falling apples around like footballs, passing unharmed and gaining many materials.',
        },
        rewardMultiplier: 1.3,
      },
      {
        id: 'apple-storm-low-hp',
        text: {
          zh: '躲避不及的水豚們被砸得滿頭包，眼冒金星地逃出樹下。全體在劇本中受到 100 - DEF 的物理傷害，且暈眩導致遠征進度稍微落後。',
          en: 'The capybaras failed to dodge and fled with bumps on their heads. In the script, everyone takes 100 minus DEF physical damage and falls slightly behind due to dizziness.',
        },
        rewardMultiplier: 0.85,
        tags: ['damage-display', 'stun'],
      },
    ],
  },
]

const snowPeachOnlyEvents: StoryBeat[] = [
  {
    id: 'snow-peach-frozen-peach',
    setup: {
      zh: '前方的必經之路，被一顆宛如小山般巨大、且散發著驚人寒氣的「急凍紅蜜桃」給完全堵死了。',
      en: 'The required path ahead was completely blocked by a mountain-sized frozen red peach radiating intense cold.',
    },
    outcomes: [
      {
        id: 'frozen-peach-ember-leader',
        condition: { leaderElement: 'ember' },
        text: {
          zh: '火花隊長發揮極大的屬性優勢，吐出溫暖的火焰，直接把急凍蜜桃烤成熱呼呼的蜜桃烤泥，大家飽餐一頓。全體 HP 恢復 100%，並額外獲得高級素材。',
          en: 'The ember leader used its elemental advantage, warming the frozen peach into hot baked peach mash. Everyone feasted, restoring 100% HP in the script and gaining advanced materials.',
        },
        rewardMultiplier: 1.35,
        tags: ['leader-element', 'heal-display'],
      },
      {
        id: 'frozen-peach-frost-leader',
        condition: { leaderElement: 'frost' },
        text: {
          zh: '冰霜隊長對寒氣完全免疫，開心地在巨大的冰蜜桃上溜冰，順勢用爪子鑿出一條安全的隧道。無傷快速通過，並獲得萬年冰晶。',
          en: 'The frost leader was immune to the chill, happily skated across the giant frozen peach, and carved a safe tunnel with its claws. The party passed quickly and gained ancient ice crystals.',
        },
        rewardMultiplier: 1.3,
        tags: ['leader-element'],
      },
      {
        id: 'frozen-peach-normal',
        text: {
          zh: '水豚們只能無奈地用牙齒慢慢啃出一條路，結果集體嚴重腦袋結冰。全體受到 25 點真實傷害。',
          en: 'The capybaras had no choice but to slowly chew through a path, giving everyone a severe brain freeze. The script applies 25 true damage to the whole party.',
        },
        rewardMultiplier: 0.85,
        tags: ['damage-display'],
      },
    ],
  },
]

export const expeditionForests: ExpeditionForest[] = [
  {
    id: 'orange',
    asset: { iconKey: 'forest-orange' },
    difficulty: 1,
    durationSeconds: 45,
    reward: 'Yuzu x2',
    name: { zh: '橘子森林', en: 'Orange Forest' },
    summary: { zh: '充滿香氣、藤蔓、巨型橘子與酸味怪物的入門劇本。', en: 'A starter script filled with citrus scent, vines, giant oranges, and sour monsters.' },
    scriptEvents: [...commonEvents, ...orangeOnlyEvents],
  },
  {
    id: 'apple',
    asset: { iconKey: 'forest-apple' },
    difficulty: 2,
    durationSeconds: 90,
    reward: 'Jam x1',
    name: { zh: '蘋果森林', en: 'Apple Forest' },
    summary: { zh: '共通事件外，還有古老蘋果樹落下巨型硬蘋果的耐力考驗。', en: 'Includes the common events plus a stamina test under an ancient tree raining giant hard apples.' },
    scriptEvents: [...commonEvents, ...appleOnlyEvents],
  },
  {
    id: 'snow-peach',
    asset: { iconKey: 'forest-snow-peach' },
    difficulty: 3,
    durationSeconds: 150,
    reward: 'Snow Peach x1',
    name: { zh: '水蜜桃雪森', en: 'Snow Peach Forest' },
    summary: { zh: '共通事件外，必經之路被散發寒氣的急凍紅蜜桃封住。', en: 'Includes the common events plus a frozen red peach blocking the required path with intense cold.' },
    scriptEvents: [...commonEvents, ...snowPeachOnlyEvents],
  },
]

export const gameStoryChapters: GameStoryChapter[] = [
  {
    id: 'starter-gift',
    title: { zh: '後端起始隊伍', en: 'Backend Starter Team' },
    description: {
      zh: '後端目前會建立 sakiko、MAX、SONORATO、CANESAN 四隻可用水豚。技能與數值用於顯示與劇本判定；鏈上持有權未啟用時由後端回報狀態。',
      en: 'The backend currently creates sakiko, MAX, SONORATO, and CANESAN as available capybaras. Skills and stats are used for display and script checks; chain ownership status is reported by the backend when unavailable.',
    },
    beats: [
      {
        id: 'gift-wallet-login',
        setup: { zh: '玩家連接 MetaMask。', en: 'The player connects MetaMask.' },
        outcomes: [
          {
            id: 'gift-wallet-login-success',
            text: { zh: '玩家完成錢包簽名，前端載入後端玩家資料。', en: 'The player signs with the wallet and the frontend loads backend player data.' },
          },
        ],
      },
    ],
  },
]

export const expeditionForestById = new Map<ForestId, ExpeditionForest>(
  expeditionForests.map((forest) => [forest.id, forest])
)
