<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { useUIStore } from '../../stores/ui'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const authStore = useAuthStore()
const uiStore = useUIStore()

const navItems = computed(() => {
  const items = [
    { name: 'dashboard', path: '/', icon: 'home', label: t('nav.dashboard') },
    { name: 'files', path: '/files', icon: 'folder', label: t('nav.files') },
    { name: 'records', path: '/records', icon: 'table', label: t('nav.records') },
  ]

  // Add accountant-only items
  if (authStore.isAccountant) {
    items.push(
      { name: 'clients', path: '/clients', icon: 'users', label: t('nav.clients') },
      { name: 'merge-jobs', path: '/merge', icon: 'merge', label: t('nav.merge') }
    )
  }

  items.push(
    { name: 'profile', path: '/profile', icon: 'user', label: t('nav.profile') }
  )

  return items
})

function navigate(path) {
  router.push(path)
}

function isActive(name) {
  return route.name === name || route.name?.startsWith(name)
}

async function handleLogout() {
  await authStore.signOut()
  router.push('/login')
}

function toggleLanguage() {
  const newLocale = uiStore.locale === 'mk' ? 'en' : 'mk'
  uiStore.setLocale(newLocale)
  location.reload() // Reload to apply language change
}
</script>

<template>
  <aside
    :class="[
      'sidebar',
      uiStore.sidebarCollapsed ? 'collapsed' : 'expanded'
    ]"
  >
    <!-- Logo/Header -->
    <div class="h-16 flex items-center justify-between px-4 border-b border-slate-700">
      <div v-if="!uiStore.sidebarCollapsed" class="flex items-center gap-2">
        <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <span class="font-semibold text-white">{{ t('app.name').split(' ')[0] }}</span>
      </div>

      <button
        @click="uiStore.toggleSidebar"
        class="p-2 rounded-lg hover:bg-slate-700 text-gray-400 hover:text-white transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            v-if="uiStore.sidebarCollapsed"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 5l7 7-7 7M5 5l7 7-7 7"
          />
          <path
            v-else
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
          />
        </svg>
      </button>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 py-4">
      <div
        v-for="item in navItems"
        :key="item.name"
        @click="navigate(item.path)"
        :class="[
          'nav-item',
          { 'active': isActive(item.name) }
        ]"
        :title="uiStore.sidebarCollapsed ? item.label : ''"
      >
        <!-- Icons -->
        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <!-- Home -->
          <path v-if="item.icon === 'home'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          <!-- Folder -->
          <path v-if="item.icon === 'folder'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          <!-- Table -->
          <path v-if="item.icon === 'table'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          <!-- Users -->
          <path v-if="item.icon === 'users'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          <!-- Merge -->
          <path v-if="item.icon === 'merge'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          <!-- User -->
          <path v-if="item.icon === 'user'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>

        <span v-if="!uiStore.sidebarCollapsed" class="truncate">
          {{ item.label }}
        </span>
      </div>
    </nav>

    <!-- Footer -->
    <div class="border-t border-slate-700 p-4">
      <!-- Dark Mode Toggle -->
      <button
        @click="uiStore.toggleDarkMode"
        class="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors mb-2"
        :title="uiStore.sidebarCollapsed ? (uiStore.darkMode ? 'Light Mode' : 'Dark Mode') : ''"
      >
        <!-- Sun icon for dark mode (click to go light) -->
        <svg v-if="uiStore.darkMode" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <!-- Moon icon for light mode (click to go dark) -->
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
        <span v-if="!uiStore.sidebarCollapsed" class="text-sm">
          {{ uiStore.darkMode ? 'Light Mode' : 'Dark Mode' }}
        </span>
      </button>

      <!-- Language Toggle -->
      <button
        @click="toggleLanguage"
        class="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors mb-2"
        :title="uiStore.sidebarCollapsed ? (uiStore.locale === 'mk' ? 'English' : 'Македонски') : ''"
      >
        <span class="text-sm font-medium">{{ uiStore.locale.toUpperCase() }}</span>
        <span v-if="!uiStore.sidebarCollapsed" class="text-sm">
          {{ uiStore.locale === 'mk' ? 'Македонски' : 'English' }}
        </span>
      </button>

      <!-- User Info & Logout -->
      <div
        v-if="!uiStore.sidebarCollapsed"
        class="flex items-center gap-3 px-3 py-2 mb-2"
      >
        <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
          {{ authStore.userName?.charAt(0).toUpperCase() }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-white truncate">{{ authStore.userName }}</p>
          <p class="text-xs text-gray-400 truncate">{{ authStore.userEmail }}</p>
        </div>
      </div>

      <button
        @click="handleLogout"
        class="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
        :title="uiStore.sidebarCollapsed ? t('nav.logout') : ''"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span v-if="!uiStore.sidebarCollapsed">{{ t('nav.logout') }}</span>
      </button>
    </div>
  </aside>
</template>
