import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import './style.css'

const app = createApp(App)

// Setup Pinia store
const pinia = createPinia()
app.use(pinia)

// Setup Router
app.use(router)

// Setup i18n
app.use(i18n)

// Mount app
app.mount('#app')
