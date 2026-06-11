import { starterCapybaras } from '@cryptopets/game-content'
import worriorImage from '@game-content/assets/capybaras/worrior-1.svg'
import sakikojinImage from '@game-content/assets/capybaras/sakikojin.svg'
import sonoratoImage from '@game-content/assets/capybaras/sonorato.svg'
import maxImage from '@game-content/assets/capybaras/max.svg'
import yuzuBiteOne from '@game-content/assets/goodies/yuzu-bite-1.png'
import yuzuBiteTwo from '@game-content/assets/goodies/yuzu-bite-2.png'
import yuzuBiteThree from '@game-content/assets/goodies/yuzu-bite-3.png'
import yuzuBiteFour from '@game-content/assets/goodies/yuzu-bite-4.png'

export const capybaraImageBySlug: Record<string, string> = {
  'sakikojin': sakikojinImage,
  'max': maxImage,
  sonorato: sonoratoImage,
  worrior: worriorImage,
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
  return petImages[pet.id] ?? (pet.basePetId ? petImages[pet.basePetId] : undefined) ?? capybaraImageByName[pet.name] ?? capybaraImageBySlug['sakikojin']
}

export const yuzuBiteFrames = [yuzuBiteOne, yuzuBiteTwo, yuzuBiteThree, yuzuBiteFour]

export const marketCapybaraSprites = [
  { id: 'sakikojin-a', src: sakikojinImage, name: 'sakikojin', motion: 'walk-right' },
  { id: 'sonorato-a', src: sonoratoImage, name: 'sonorato', motion: 'walk-left' },
  { id: 'worrior-a', src: worriorImage, name: 'worrior', motion: 'linger' },
  { id: 'max-a', src: maxImage, name: 'Yuzu Boy', motion: 'walk-right' },
  { id: 'sonorato-b', src: sonoratoImage, name: 'sonorato', motion: 'linger' },
  { id: 'sakikojin-b', src: sakikojinImage, name: 'sakikojin', motion: 'walk-left' },
  { id: 'worrior-b', src: worriorImage, name: 'worrior', motion: 'walk-right' },
] as const
