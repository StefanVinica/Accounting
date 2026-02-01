import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authApi from '../api/auth'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const profile = ref(null)
  const session = ref(null)
  const loading = ref(true)
  const error = ref(null)

  // Getters
  const isAuthenticated = computed(() => !!user.value)
  const isAccountant = computed(() => profile.value?.role === 'accountant')
  const isClient = computed(() => profile.value?.role === 'client')
  const userId = computed(() => user.value?.id)
  const userEmail = computed(() => user.value?.email)
  const userName = computed(() => profile.value?.full_name || user.value?.email?.split('@')[0])

  // Actions
  async function initialize() {
    try {
      loading.value = true
      error.value = null

      const currentSession = await authApi.getSession()
      if (currentSession) {
        session.value = currentSession
        user.value = currentSession.user
        await fetchProfile()
      }
    } catch (err) {
      console.error('Auth initialization error:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  async function fetchProfile() {
    if (!user.value) return

    try {
      profile.value = await authApi.getProfile(user.value.id)
    } catch (err) {
      console.error('Failed to fetch profile:', err)
      // Profile might not exist yet (trigger hasn't run)
      profile.value = null
    }
  }

  async function signUp(email, password, metadata = {}) {
    try {
      loading.value = true
      error.value = null

      const data = await authApi.signUp(email, password, metadata)

      if (data.session) {
        session.value = data.session
        user.value = data.user
        await fetchProfile()
      }

      return data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function signIn(email, password) {
    try {
      loading.value = true
      error.value = null

      const data = await authApi.signIn(email, password)
      session.value = data.session
      user.value = data.user
      await fetchProfile()

      return data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    try {
      loading.value = true
      error.value = null

      await authApi.signOut()
      user.value = null
      profile.value = null
      session.value = null
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateProfile(updates) {
    if (!user.value) throw new Error('Not authenticated')

    try {
      loading.value = true
      error.value = null

      profile.value = await authApi.updateProfile(user.value.id, updates)
      return profile.value
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  // Listen for auth changes
  function setupAuthListener() {
    authApi.onAuthStateChange(async (event, newSession) => {
      session.value = newSession
      user.value = newSession?.user || null

      if (newSession?.user) {
        await fetchProfile()
      } else {
        profile.value = null
      }
    })
  }

  return {
    // State
    user,
    profile,
    session,
    loading,
    error,

    // Getters
    isAuthenticated,
    isAccountant,
    isClient,
    userId,
    userEmail,
    userName,

    // Actions
    initialize,
    fetchProfile,
    signUp,
    signIn,
    signOut,
    updateProfile,
    setupAuthListener
  }
})
