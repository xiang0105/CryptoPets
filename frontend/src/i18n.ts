import { computed, ref } from 'vue'
import { defaultLocale, messages, type LocaleCode } from '@cryptopets/game-content'

export type Locale = LocaleCode

export const locale = ref<Locale>(defaultLocale)

export const isZh = computed(() => locale.value === 'zh-TW')
export const currentMessages = computed(() => messages[locale.value])

export function toggleLocale() {
  locale.value = locale.value === 'zh-TW' ? 'en' : 'zh-TW'
}
