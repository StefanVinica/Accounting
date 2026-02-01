<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { useUIStore } from '../../stores/ui'
import { getInvitation, acceptInvitation } from '../../api/clients'
import LoadingSpinner from '../../components/common/LoadingSpinner.vue'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const authStore = useAuthStore()
const uiStore = useUIStore()

const invitation = ref(null)
const loadingInvitation = ref(true)
const invitationError = ref('')

// Signup form (for new users)
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const fullName = ref('')
const companyName = ref('')
const loading = ref(false)
const error = ref('')

onMounted(async () => {
  await loadInvitation()
})

async function loadInvitation() {
  try {
    loadingInvitation.value = true
    invitationError.value = ''

    const token = route.params.token
    invitation.value = await getInvitation(token)

    // If user is already logged in, they can accept directly
    // Pre-fill email from invitation if we have it
  } catch (err) {
    invitationError.value = err.message || 'Invalid or expired invitation'
  } finally {
    loadingInvitation.value = false
  }
}

async function handleAccept() {
  // If already authenticated, just accept the invitation
  if (authStore.isAuthenticated) {
    try {
      loading.value = true
      await acceptInvitation(route.params.token, authStore.userId)
      uiStore.showSuccess('Invitation accepted!')
      router.push('/')
    } catch (err) {
      error.value = err.message || t('errors.generic')
    } finally {
      loading.value = false
    }
    return
  }

  // Otherwise, create account and accept
  if (!email.value || !password.value || !confirmPassword.value) {
    error.value = t('errors.validation')
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  try {
    loading.value = true
    error.value = ''

    // Sign up as client
    await authStore.signUp(email.value, password.value, {
      role: 'client',
      full_name: fullName.value,
      company_name: companyName.value
    })

    // Accept the invitation
    await acceptInvitation(route.params.token, authStore.userId)

    uiStore.showSuccess('Account created and invitation accepted!')
    router.push('/')
  } catch (err) {
    error.value = err.message || t('errors.generic')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-8">
    <div class="w-full max-w-md">
      <!-- Loading state -->
      <div v-if="loadingInvitation" class="card p-8">
        <LoadingSpinner size="lg" :text="t('common.loading')" />
      </div>

      <!-- Error state -->
      <div v-else-if="invitationError" class="card p-8 text-center">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">Invalid Invitation</h2>
        <p class="text-gray-600 mb-6">{{ invitationError }}</p>
        <router-link to="/login" class="btn btn-primary">
          Go to Login
        </router-link>
      </div>

      <!-- Invitation found -->
      <div v-else class="card p-8">
        <!-- Header -->
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900">You've Been Invited!</h1>
          <p class="text-gray-600 mt-2">
            <strong>{{ invitation.accountant?.full_name || invitation.accountant?.email }}</strong>
            has invited you to join as a client.
          </p>
          <p v-if="invitation.accountant?.company_name" class="text-sm text-gray-500 mt-1">
            {{ invitation.accountant.company_name }}
          </p>
        </div>

        <!-- If already logged in -->
        <div v-if="authStore.isAuthenticated" class="text-center">
          <p class="text-gray-600 mb-4">
            You're logged in as <strong>{{ authStore.userEmail }}</strong>
          </p>
          <button
            @click="handleAccept"
            :disabled="loading"
            class="btn btn-primary w-full py-3"
          >
            <span v-if="loading">Accepting...</span>
            <span v-else>Accept Invitation</span>
          </button>
        </div>

        <!-- Signup form for new users -->
        <div v-else>
          <div v-if="error" class="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {{ error }}
          </div>

          <form @submit.prevent="handleAccept" class="space-y-4">
            <div>
              <label class="label">{{ t('auth.email') }}</label>
              <input
                v-model="email"
                type="email"
                class="input"
                :placeholder="t('auth.email')"
                required
              />
            </div>

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

            <div>
              <label class="label">{{ t('auth.password') }}</label>
              <input
                v-model="password"
                type="password"
                class="input"
                :placeholder="t('auth.password')"
                required
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
                Creating Account...
              </span>
              <span v-else>Create Account & Accept</span>
            </button>
          </form>

          <p class="text-center text-sm text-gray-500 mt-6">
            Already have an account?
            <router-link to="/login" class="text-blue-600 hover:text-blue-700 font-medium">
              Sign in
            </router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
