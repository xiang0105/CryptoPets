import { en } from './en.js'
import { zhTW } from './zh-TW.js'
import type { GameMessages, LocaleCode } from './types.js'

export type { AppMessages, GameMessages, HomeMessages, LocaleCode, PetsMessages, StoreMessages } from './types.js'

export const defaultLocale: LocaleCode = 'zh-TW'
export const supportedLocales: LocaleCode[] = ['zh-TW', 'en']

export const messages: Record<LocaleCode, GameMessages> = {
  'zh-TW': zhTW,
  en,
}
