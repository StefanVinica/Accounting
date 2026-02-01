<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/ui'
import Header from '../components/layout/Header.vue'

const { t } = useI18n()
const authStore = useAuthStore()
const uiStore = useUIStore()

const fullName = ref('')
const companyName = ref('')
const loading = ref(false)
const passwordLoading = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

onMounted(() => {
  fullName.value = authStore.profile?.full_name || ''
  companyName.value = authStore.profile?.company_name || ''
})

async function saveProfile() {
  try {
    loading.value = true
    await authStore.updateProfile({
      full_name: fullName.value,
      company_name: companyName.value
    })
    uiStore.showSuccess(t('common.success'))
  } catch (err) {
    uiStore.showError(err.message || t('errors.generic'))
  } finally {
    loading.value = false
  }
}

async function changePassword() {
  if (newPassword.value !== confirmPassword.value) {
    uiStore.showError('Passwords do not match')
    return
  }

  if (newPassword.value.length < 6) {
    uiStore.showError('Password must be at least 6 characters')
    return
  }

  try {
    passwordLoading.value = true
    // Note: Supabase updateUser doesn't require current password
    const { updatePassword } = await import('../api/auth')
    await updatePassword(newPassword.value)
    uiStore.showSuccess('Password updated successfully')
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err) {
    uiStore.showError(err.message || t('errors.generic'))
  } finally {
    passwordLoading.value = false
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString(uiStore.locale === 'mk' ? 'mk-MK' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<template>
  <div>
    <Header :title="t('profile.title')" />

    <div class="p-6 max-w-2xl">
      <!-- Account Info -->
      <div class="card p-6 mb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ t('profile.accountInfo') }}</h3>
        <div class="space-y-3">
          <div class="flex justify-between py-2 border-b border-gray-100">
            <span class="text-gray-500">{{ t('auth.email') }}</span>
            <span class="font-medium text-gray-900">{{ authStore.userEmail }}</span>
          </div>
          <div class="flex justify-between py-2 border-b border-gray-100">
            <span class="text-gray-500">{{ t('auth.role') }}</span>
            <span class="font-medium text-gray-900 capitalize">
              {{ authStore.profile?.role === 'accountant' ? t('auth.accountant') : t('auth.client') }}
            </span>
          </div>
          <div class="flex justify-between py-2">
            <span class="text-gray-500">{{ t('profile.memberSince') }}</span>
            <span class="font-medium text-gray-900">{{ formatDate(authStore.profile?.created_at) }}</span>
          </div>
        </div>
      </div>

      <!-- Personal Info -->
      <div class="card p-6 mb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ t('profile.personalInfo') }}</h3>
        <form @submit.prevent="saveProfile" class="space-y-4">
          <div>
            <label class="label">{{ t('auth.fullName') }}</label>
            <input
              v-model="fullName"
              type="text"
              class="input"
              :placeholder="t('auth.fullName')"
            />
          </div>
          <div>
            <label class="label">{{ t('auth.companyName') }}</label>
            <input
              v-model="companyName"
              type="text"
              class="input"
              :placeholder="t('auth.companyName')"
            />
          </div>
          <button
            type="submit"
            :disabled="loading"
            class="btn btn-primary"
          >
            <span v-if="loading" class="flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ t('common.loading') }}
            </span>
            <span v-else>{{ t('profile.save') }}</span>
          </button>
        </form>
      </div>

      <!-- Change Password -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ t('profile.changePassword') }}</h3>
        <form @submit.prevent="changePassword" class="space-y-4">
          <div>
            <label class="label">{{ t('profile.newPassword') }}</label>
            <input
              v-model="newPassword"
              type="password"
              class="input"
              :placeholder="t('profile.newPassword')"
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
              autocomplete="new-password"
            />
          </div>
          <button
            type="submit"
            :disabled="passwordLoading || !newPassword"
            class="btn btn-primary"
          >
            <span v-if="passwordLoading" class="flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ t('common.loading') }}
            </span>
            <span v-else>{{ t('profile.changePassword') }}</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
