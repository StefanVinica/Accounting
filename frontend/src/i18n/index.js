import { createI18n } from 'vue-i18n'
import mk from './mk.json'
import en from './en.json'

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('locale') || 'mk',
  fallbackLocale: 'en',
  messages: {
    mk,
    en
  }
})

export default i18n
