import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { starterCapybaras } from '@cryptopets/game-content'

describe('game content assets', () => {
  it('points starter capybaras at existing image files', () => {
    for (const pet of starterCapybaras) {
      const assetPath = fileURLToPath(new URL(`../../game-content/${pet.asset.image}`, import.meta.url))

      expect(existsSync(assetPath), `${pet.name} asset is missing: ${pet.asset.image}`).toBe(true)
    }
  })
})
