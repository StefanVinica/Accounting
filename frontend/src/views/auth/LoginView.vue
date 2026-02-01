<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { useUIStore } from '../../stores/ui'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const authStore = useAuthStore()
const uiStore = useUIStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  if (!email.value || !password.value) {
    error.value = t('errors.validation')
    return
  }

  try {
    loading.value = true
    error.value = ''

    await authStore.signIn(email.value, password.value)

    // Redirect to intended destination or dashboard
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (err) {
    error.value = err.message || t('errors.generic')
  } finally {
    loading.value = false
  }
}

function toggleLanguage() {
  const newLocale = uiStore.locale === 'mk' ? 'en' : 'mk'
  uiStore.setLocale(newLocale)
  location.reload()
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-gray-900 px-4">
    <div class="w-full max-w-md">
      <!-- Language toggle -->
      <div class="flex justify-end mb-4">
        <button
          @click="toggleLanguage"
          class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {{ uiStore.locale === 'mk' ? 'English' : 'Македонски' }}
        </button>
      </div>

      <div class="card p-8">
        <!-- Logo -->
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('auth.welcomeBack') }}</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ t('app.tagline') }}</p>
        </div>

        <!-- Error message -->
        <div
          v-if="error"
          class="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6 text-sm"
        >
          {{ error }}
        </div>

        <!-- Login form -->
        <form @submit.prevent="handleLogin" class="space-y-5">
          <div>
            <label class="label">{{ t('auth.email') }}</label>
            <input
              v-model="email"
              type="email"
              class="input"
              :placeholder="t('auth.email')"
              required
              autocomplete="email"
            />
          </div>

          <div>
            <label class="label">{{ t('auth.password') }}</label>
            <input
              v-model="password"
              type="password"
              class="input"
              :placeholder="t('auth.password')"
              required
              autocomplete="current-password"
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="btn btn-primary w-full py-3"
          >
            <span v-if="loading" class="flex items-center justify-center gap-2">
              <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ t('common.loading') }}
            </span>
            <span v-else>{{ t('auth.loginButton') }}</span>
          </button>
        </form>

        <!-- Sign up link -->
        <p class="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          {{ t('auth.noAccount') }}
          <router-link to="/signup" class="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
            {{ t('auth.signup') }}
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>
