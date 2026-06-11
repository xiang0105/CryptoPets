import { starterCapybaras } from '@cryptopets/game-content'
import worriorImage from '@game-content/assets/capybaras/warrior-1.svg'
import sakikojinImage from '@game-content/assets/capybaras/sakikojin.svg'
import sonoratoImage from '@game-content/assets/capybaras/SONORATO-1.svg'
import maxImage from '@game-content/assets/capybaras/max.svg'
import yuzuBiteOne from '@game-content/assets/goodies/yuzu-bite-1.png'
import yuzuBiteTwo from '@game-content/assets/goodies/yuzu-bite-2.png'
import yuzuBiteThree from '@game-content/assets/goodies/yuzu-bite-3.png'
import yuzuBiteFour from '@game-content/assets/goodies/yuzu-bite-4.png'
import bathSaltIcon from '@game-content/assets/goodies/bath-salt.svg'
import foldingFanIcon from '@game-content/assets/goodies/folding-fan.svg'
import helmetIcon from '@game-content/assets/goodies/helmet.svg'
import iceCrystalIcon from '@game-content/assets/goodies/ice-crystal.svg'
import persimmonJamIcon from '@game-content/assets/goodies/persimmon-jam.svg'
import sakuraIcon from '@game-content/assets/goodies/sakura.svg'
import scrollIcon from '@game-content/assets/goodies/scroll.svg'
import vanillaIcon from '@game-content/assets/goodies/vanilla.svg'
import yuzuFruitIcon from '@game-content/assets/goodies/yuzu-fruit.svg'

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

const materialImageById: Record<string, string> = {
  'MAT-2C': yuzuBiteOne,
  'MAT-3C': persimmonJamIcon,
  'MAT-4B': iceCrystalIcon,
}

const materialImageBySlug: Record<string, string> = {
  'bath-salt': bathSaltIcon,
  'folding-fan': foldingFanIcon,
  helmet: helmetIcon,
  'ice-crystal': iceCrystalIcon,
  'persimmon-jam': persimmonJamIcon,
  sakura: sakuraIcon,
  scroll: scrollIcon,
  vanilla: vanillaIcon,
  'yuzu-bite': yuzuBiteOne,
  'yuzu-fruit': yuzuFruitIcon,
}

const materialFallbackByElement: Record<number, string> = {
  1: yuzuFruitIcon,
  2: yuzuBiteOne,
  3: persimmonJamIcon,
  4: iceCrystalIcon,
}

export function getMaterialImage(material: { id?: string; materialId?: string; element?: number; slug?: string }) {
  const materialId = material.id ?? material.materialId

  return (
    (materialId ? materialImageById[materialId] : undefined) ??
    (material.slug ? materialImageBySlug[material.slug] : undefined) ??
    (material.element ? materialFallbackByElement[material.element] : undefined) ??
    yuzuFruitIcon
  )
}

export const marketCapybaraSprites = [
  { id: 'sakikojin-a', src: sakikojinImage, name: 'sakikojin', motion: 'walk-right' },
  { id: 'sonorato-a', src: sonoratoImage, name: 'sonorato', motion: 'walk-left' },
  { id: 'worrior-a', src: worriorImage, name: 'worrior', motion: 'linger' },
  { id: 'max-a', src: maxImage, name: 'Yuzu Boy', motion: 'walk-right' },
  { id: 'sonorato-b', src: sonoratoImage, name: 'sonorato', motion: 'linger' },
  { id: 'sakikojin-b', src: sakikojinImage, name: 'sakikojin', motion: 'walk-left' },
  { id: 'worrior-b', src: worriorImage, name: 'worrior', motion: 'walk-right' },
] as const
