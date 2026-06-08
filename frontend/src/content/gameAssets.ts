import { starterCapybaras } from '@cryptopets/game-content'
import boboImage from '@game-content/assets/capybaras/bobo.png'
import capySanImage from '@game-content/assets/capybaras/capy-san.png'
import kokoImage from '@game-content/assets/capybaras/koko.png'
import yuzuBoyImage from '@game-content/assets/capybaras/yuzu-boy.png'
import yuzuBiteOne from '@game-content/assets/goodies/yuzu-bite-1.png'
import yuzuBiteTwo from '@game-content/assets/goodies/yuzu-bite-2.png'
import yuzuBiteThree from '@game-content/assets/goodies/yuzu-bite-3.png'
import yuzuBiteFour from '@game-content/assets/goodies/yuzu-bite-4.png'

export const capybaraImageBySlug: Record<string, string> = {
  'capy-san': capySanImage,
  'yuzu-boy': yuzuBoyImage,
  koko: kokoImage,
  bobo: boboImage,
}

export const petImages: Record<string, string> = Object.fromEntries(
  starterCapybaras.flatMap((pet, index) => {
    const image = capybaraImageBySlug[pet.slug]
    return [
      [pet.id, image],
      [`PET-${String(index + 1).padStart(3, '0')}`, image],
    ]
  }),
) as Record<string, string>

export const capybaraImageByName: Record<string, string> = Object.fromEntries(
  starterCapybaras.map((pet) => [pet.name, capybaraImageBySlug[pet.slug]]),
) as Record<string, string>

export function getPetImage(pet: { id: string; name: string; basePetId?: string }) {
  return petImages[pet.id] ?? (pet.basePetId ? petImages[pet.basePetId] : undefined) ?? capybaraImageByName[pet.name] ?? capybaraImageBySlug['capy-san']
}

export const yuzuBiteFrames = [yuzuBiteOne, yuzuBiteTwo, yuzuBiteThree, yuzuBiteFour]

export const marketCapybaraSprites = [
  { id: 'capy-san-a', src: capySanImage, name: 'Capy-San', motion: 'walk-right' },
  { id: 'koko-a', src: kokoImage, name: 'Koko', motion: 'walk-left' },
  { id: 'bobo-a', src: boboImage, name: 'Bobo', motion: 'linger' },
  { id: 'yuzu-boy-a', src: yuzuBoyImage, name: 'Yuzu Boy', motion: 'walk-right' },
  { id: 'koko-b', src: kokoImage, name: 'Koko', motion: 'linger' },
  { id: 'capy-san-b', src: capySanImage, name: 'Capy-San', motion: 'walk-left' },
  { id: 'bobo-b', src: boboImage, name: 'Bobo', motion: 'walk-right' },
] as const
