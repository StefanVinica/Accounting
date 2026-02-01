<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { useUIStore } from '../../stores/ui'

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const uiStore = useUIStore()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const fullName = ref('')
const companyName = ref('')
const role = ref('accountant')
const loading = ref(false)
const error = ref('')

async function handleSignup() {
  // Validation
  if (!email.value || !password.value || !confirmPassword.value) {
    error.value = t('errors.validation')
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters'
    return
  }

  try {
    loading.value = true
    error.value = ''

    await authStore.signUp(email.value, password.value, {
      role: role.value,
      full_name: fullName.value,
      company_name: companyName.value
    })

    // Redirect to dashboard after signup
    router.push('/')
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
  <div class="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-8">
    <div class="w-full max-w-md">
      <!-- Language toggle -->
      <div class="flex justify-end mb-4">
        <button
          @click="toggleLanguage"
          class="text-sm text-gray-500 hover:text-gray-700"
        >
          {{ uiStore.locale === 'mk' ? 'English' : 'Македонски' }}
        </button>
      </div>

      <div class="card p-8">
        <!-- Header -->
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900">{{ t('auth.createAccount') }}</h1>
          <p class="text-sm text-gray-500 mt-1">{{ t('app.tagline') }}</p>
        </div>

        <!-- Error message -->
        <div
          v-if="error"
          class="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm"
        >
          {{ error }}
        </div>

        <!-- Signup form -->
        <form @submit.prevent="handleSignup" class="space-y-4">
          <!-- Role selection -->
          <div>
            <label class="label">{{ t('auth.role') }}</label>
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                @click="role = 'accountant'"
                :class="[
                  'py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors',
                  role === 'accountant'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                ]"
              >
                <svg class="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                {{ t('auth.accountant') }}
              </button>
              <button
                type="button"
                @click="role = 'client'"
                :class="[
                  'py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors',
                  role === 'client'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                ]"
              >
                <svg class="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {{ t('auth.client') }}
              </button>
            </div>
          </div>

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
            <label class="label">{{ t('auth.fullName') }}</label>
            <input
              v-model="fullName"
              type="text"
              class="input"
              :placeholder="t('auth.fullName')"
              autocomplete="name"
            />
          </div>

          <div>
            <label class="label">{{ t('auth.companyName') }}</label>
            <input
              v-model="companyName"
              type="text"
              class="input"
              :placeholder="t('auth.companyName')"
              autocomplete="organization"
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
              autocomplete="new-password"
            />
          </div>

          <div>
            <label class="label">{{ t('auth.confirmPassword') }}</label>
            <input
              v-model="confirmPassword"
              type="password"
              class="input"
              :placeholder="t('auth.confirmPassword')"
              required
              autocomplete="new-password"
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="btn btn-primary w-full py-3 mt-2"
          >
            <span v-if="loading" class="flex items-center justify-center gap-2">
              <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ t('common.loading') }}
            </span>
            <span v-else>{{ t('auth.signupButton') }}</span>
          </button>
        </form>

        <!-- Login link -->
        <p class="text-center text-sm text-gray-500 mt-6">
          {{ t('auth.hasAccount') }}
          <router-link to="/login" class="text-blue-600 hover:text-blue-700 font-medium">
            {{ t('auth.login') }}
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>
