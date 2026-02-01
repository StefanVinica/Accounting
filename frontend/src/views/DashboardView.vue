<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/ui'
import Header from '../components/layout/Header.vue'
import StatusBadge from '../components/common/StatusBadge.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'
import { listFiles } from '../api/files'
import { getRecordStats } from '../api/records'
import { listClients } from '../api/clients'
import { listMergeJobs } from '../api/merge'

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const uiStore = useUIStore()

const loading = ref(true)
const stats = ref({
  files: 0,
  records: 0,
  clients: 0,
  mergeJobs: 0
})
const recentFiles = ref([])
const pendingClients = ref([])

const welcomeMessage = computed(() => {
  const name = authStore.userName || authStore.userEmail?.split('@')[0]
  return `${t('dashboard.welcome')}, ${name}!`
})

onMounted(async () => {
  await loadDashboardData()
})

async function loadDashboardData() {
  try {
    loading.value = true
    const userId = authStore.userId

    // Load files
    const files = await listFiles(userId)
    stats.value.files = files.length
    recentFiles.value = files.slice(0, 5)

    // Load record stats
    const recordStats = await getRecordStats(userId)
    stats.value.records = recordStats.totalRecords

    // Load accountant-specific data
    if (authStore.isAccountant) {
      const clients = await listClients(userId)
      stats.value.clients = clients.length
      pendingClients.value = clients.filter(c => c.status === 'pending')

      const mergeJobs = await listMergeJobs(userId)
      stats.value.mergeJobs = mergeJobs.length
    }
  } catch (err) {
    console.error('Dashboard load error:', err)
    uiStore.showError(t('errors.generic'))
  } finally {
    loading.value = false
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(uiStore.locale === 'mk' ? 'mk-MK' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <div>
    <Header :title="welcomeMessage" />

    <div class="p-6">
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" :text="t('common.loading')" />
      </div>

      <template v-else>
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <!-- Files -->
          <div class="card p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">{{ t('dashboard.stats.files') }}</p>
                <p class="text-3xl font-bold text-gray-900 mt-1">{{ stats.files }}</p>
              </div>
              <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <!-- Records -->
          <div class="card p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">{{ t('dashboard.stats.records') }}</p>
                <p class="text-3xl font-bold text-gray-900 mt-1">{{ stats.records.toLocaleString() }}</p>
              </div>
              <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <!-- Clients (Accountant only) -->
          <div v-if="authStore.isAccountant" class="card p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">{{ t('dashboard.stats.clients') }}</p>
                <p class="text-3xl font-bold text-gray-900 mt-1">{{ stats.clients }}</p>
              </div>
              <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>

          <!-- Merge Jobs (Accountant only) -->
          <div v-if="authStore.isAccountant" class="card p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">{{ t('dashboard.stats.mergeJobs') }}</p>
                <p class="text-3xl font-bold text-gray-900 mt-1">{{ stats.mergeJobs }}</p>
              </div>
              <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Quick Actions -->
          <div class="card p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ t('dashboard.quickActions') }}</h3>
            <div class="grid grid-cols-2 gap-3">
              <button
                @click="router.push('/files')"
                :class="[
                  'flex items-center gap-3 p-4 rounded-lg transition-colors',
                  uiStore.darkMode ? 'bg-blue-900/30 hover:bg-blue-900/50' : 'bg-blue-50 hover:bg-blue-100'
                ]"
              >
                <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span :class="['font-medium', uiStore.darkMode ? 'text-blue-300' : 'text-blue-900']">{{ t('dashboard.uploadFile') }}</span>
              </button>

              <button
                v-if="authStore.isAccountant"
                @click="router.push('/merge')"
                :class="[
                  'flex items-center gap-3 p-4 rounded-lg transition-colors',
                  uiStore.darkMode ? 'bg-orange-900/30 hover:bg-orange-900/50' : 'bg-orange-50 hover:bg-orange-100'
                ]"
              >
                <svg class="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span :class="['font-medium', uiStore.darkMode ? 'text-orange-300' : 'text-orange-900']">{{ t('dashboard.createMerge') }}</span>
              </button>

              <button
                v-if="authStore.isAccountant"
                @click="router.push('/clients')"
                :class="[
                  'flex items-center gap-3 p-4 rounded-lg transition-colors',
                  uiStore.darkMode ? 'bg-purple-900/30 hover:bg-purple-900/50' : 'bg-purple-50 hover:bg-purple-100'
                ]"
              >
                <svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span :class="['font-medium', uiStore.darkMode ? 'text-purple-300' : 'text-purple-900']">{{ t('dashboard.inviteClient') }}</span>
              </button>

              <button
                @click="router.push('/records')"
                :class="[
                  'flex items-center gap-3 p-4 rounded-lg transition-colors',
                  uiStore.darkMode ? 'bg-green-900/30 hover:bg-green-900/50' : 'bg-green-50 hover:bg-green-100'
                ]"
              >
                <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span :class="['font-medium', uiStore.darkMode ? 'text-green-300' : 'text-green-900']">{{ t('nav.records') }}</span>
              </button>
            </div>
          </div>

          <!-- Recent Files -->
          <div class="card p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900">{{ t('dashboard.recentFiles') }}</h3>
              <router-link to="/files" class="text-sm text-blue-600 hover:text-blue-700">
                View all
              </router-link>
            </div>

            <div v-if="recentFiles.length === 0" class="text-center py-8 text-gray-500">
              {{ t('files.noFiles') }}
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="file in recentFiles"
                :key="file.id"
                @click="router.push(`/records/${file.id}`)"
                :class="[
                  'flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors',
                  uiStore.darkMode ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-gray-50 hover:bg-gray-100'
                ]"
              >
                <div class="flex items-center gap-3">
                  <div :class="[
                    'w-10 h-10 rounded-lg flex items-center justify-center border',
                    uiStore.darkMode ? 'bg-slate-600 border-slate-500' : 'bg-white border-gray-200'
                  ]">
                    <span class="text-xs font-medium text-gray-500 uppercase">{{ file.file_type }}</span>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900 text-sm">{{ file.file_name }}</p>
                    <p class="text-xs text-gray-500">{{ formatDate(file.created_at) }}</p>
                  </div>
                </div>
                <StatusBadge :status="file.status" size="sm">
                  {{ t(`files.status.${file.status}`) }}
                </StatusBadge>
              </div>
            </div>
          </div>
        </div>

        <!-- Pending Invites (Accountant only) -->
        <div v-if="authStore.isAccountant && pendingClients.length > 0" class="card p-6 mt-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ t('dashboard.pendingInvites') }}</h3>
          <div class="space-y-3">
            <div
              v-for="client in pendingClients"
              :key="client.id"
              :class="[
                'flex items-center justify-between p-3 rounded-lg',
                uiStore.darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'
              ]"
            >
              <div>
                <p class="font-medium text-gray-900">{{ client.client?.email || 'Pending' }}</p>
                <p class="text-sm text-gray-500">Invited {{ formatDate(client.invited_at) }}</p>
              </div>
              <StatusBadge status="pending">
                {{ t('clients.status.pending') }}
              </StatusBadge>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
