<script setup>
import { onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useUIStore } from './stores/ui'
import Sidebar from './components/layout/Sidebar.vue'
import Toast from './components/common/Toast.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const uiStore = useUIStore()

// Check if we're on an auth page (no sidebar needed)
const isAuthPage = computed(() => {
  return ['login', 'signup', 'invite-accept'].includes(route.name)
})

// Main content margin based on sidebar state
const mainMargin = computed(() => {
  if (isAuthPage.value) return 'ml-0'
  return uiStore.sidebarCollapsed ? 'ml-16' : 'ml-64'
})

onMounted(async () => {
  // Initialize stores
  uiStore.initialize()
  await authStore.initialize()
  authStore.setupAuthListener()
})
</script>

<template>
  <div :class="['min-h-screen transition-colors duration-300', uiStore.darkMode ? 'bg-slate-900' : 'bg-slate-50']">
    <!-- Sidebar (only on authenticated pages) -->
    <Sidebar v-if="!isAuthPage && authStore.isAuthenticated" />

    <!-- Main content -->
    <main
      :class="[
        'min-h-screen transition-all duration-300',
        mainMargin
      ]"
    >
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Toast notifications -->
    <div class="fixed bottom-4 right-4 z-50 space-y-2">
      <Toast
        v-for="toast in uiStore.toasts"
        :key="toast.id"
        :message="toast.message"
        :type="toast.type"
        @close="uiStore.removeToast(toast.id)"
      />
    </div>

    <!-- Global loading overlay -->
    <div
      v-if="uiStore.globalLoading"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div :class="['rounded-lg p-6 flex items-center gap-4', uiStore.darkMode ? 'bg-slate-800 text-white' : 'bg-white']">
        <div class="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
        <span v-if="uiStore.loadingMessage">{{ uiStore.loadingMessage }}</span>
      </div>
    </div>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
