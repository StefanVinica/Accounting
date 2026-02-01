import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useUIStore = defineStore('ui', () => {
  // Sidebar state
  const sidebarCollapsed = ref(false)

  // Dark mode
  const darkMode = ref(false)

  // Language
  const locale = ref(localStorage.getItem('locale') || 'mk')

  // Toast notifications
  const toasts = ref([])

  // Loading overlay
  const globalLoading = ref(false)
  const loadingMessage = ref('')

  // Modal states
  const modals = ref({
    confirmDelete: { show: false, data: null },
    inviteClient: { show: false, data: null },
    createMerge: { show: false, data: null }
  })

  // Actions
  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed.value)
  }

  function setLocale(newLocale) {
    locale.value = newLocale
    localStorage.setItem('locale', newLocale)
  }

  function toggleDarkMode() {
    darkMode.value = !darkMode.value
    applyDarkMode()
    localStorage.setItem('darkMode', darkMode.value)
  }

  function setDarkMode(value) {
    darkMode.value = value
    applyDarkMode()
    localStorage.setItem('darkMode', darkMode.value)
  }

  function applyDarkMode() {
    if (darkMode.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  function showToast(message, type = 'info', duration = 3000) {
    const id = Date.now()
    toasts.value.push({ id, message, type })

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }

  function removeToast(id) {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  function showSuccess(message) {
    return showToast(message, 'success')
  }

  function showError(message) {
    return showToast(message, 'error', 5000)
  }

  function showWarning(message) {
    return showToast(message, 'warning', 4000)
  }

  function setGlobalLoading(loading, message = '') {
    globalLoading.value = loading
    loadingMessage.value = message
  }

  function openModal(name, data = null) {
    if (modals.value[name]) {
      modals.value[name].show = true
      modals.value[name].data = data
    }
  }

  function closeModal(name) {
    if (modals.value[name]) {
      modals.value[name].show = false
      modals.value[name].data = null
    }
  }

  // Initialize from localStorage
  function initialize() {
    const savedCollapsed = localStorage.getItem('sidebarCollapsed')
    if (savedCollapsed !== null) {
      sidebarCollapsed.value = savedCollapsed === 'true'
    }

    // Initialize dark mode from localStorage or system preference
    const savedDarkMode = localStorage.getItem('darkMode')
    if (savedDarkMode !== null) {
      darkMode.value = savedDarkMode === 'true'
    } else {
      // Use system preference
      darkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    applyDarkMode()
  }

  return {
    // State
    sidebarCollapsed,
    darkMode,
    locale,
    toasts,
    globalLoading,
    loadingMessage,
    modals,

    // Actions
    toggleSidebar,
    toggleDarkMode,
    setDarkMode,
    setLocale,
    showToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    setGlobalLoading,
    openModal,
    closeModal,
    initialize
  }
})
