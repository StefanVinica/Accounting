<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/ui'
import Header from '../components/layout/Header.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'
import EmptyState from '../components/common/EmptyState.vue'
import { listRecords, getRecordStats, exportToCSV } from '../api/records'
import { listFiles, getFile } from '../api/files'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const uiStore = useUIStore()

// Tab state: 'analytical' or 'balance_sheet'
const activeTab = ref('analytical')

const records = ref([])
const stats = ref(null)
const files = ref([])
const selectedFile = ref(null)
const loading = ref(true)
const search = ref('')
const sortBy = ref('data')
const sortDesc = ref(true)
const page = ref(1)
const totalPages = ref(1)
const totalRecords = ref(0)

// Filter files by current tab's document type
const filteredFiles = computed(() => {
  if (activeTab.value === 'analytical') {
    return files.value.filter(f =>
      f.document_type === 'analytical_card_simple' ||
      f.document_type === 'analytical_card_detailed'
    )
  } else {
    return files.value.filter(f => f.document_type === 'balance_sheet')
  }
})

// Get document types for current tab
const currentDocumentTypes = computed(() => {
  if (activeTab.value === 'analytical') {
    return ['analytical_card_simple', 'analytical_card_detailed']
  }
  return ['balance_sheet']
})

const pageTitle = computed(() => {
  if (selectedFile.value) {
    return `${t('records.fromFile')}: ${selectedFile.value.file_name}`
  }
  return t('records.allRecords')
})

onMounted(async () => {
  await loadFiles()

  // Check if fileId is in route
  if (route.params.fileId) {
    const file = await getFile(route.params.fileId)
    selectedFile.value = file
    // Set tab based on file type
    if (file?.document_type === 'balance_sheet') {
      activeTab.value = 'balance_sheet'
    } else {
      activeTab.value = 'analytical'
    }
  }

  await loadRecords()
})

watch(() => route.params.fileId, async (newFileId) => {
  if (newFileId) {
    const file = await getFile(newFileId)
    selectedFile.value = file
    if (file?.document_type === 'balance_sheet') {
      activeTab.value = 'balance_sheet'
    }
  } else {
    selectedFile.value = null
  }
  page.value = 1
  await loadRecords()
})

// Watch tab changes to reload records
watch(activeTab, async () => {
  selectedFile.value = null
  page.value = 1
  search.value = ''
  sortBy.value = activeTab.value === 'balance_sheet' ? 'nalog' : 'data'
  await loadRecords()
})

async function loadFiles() {
  try {
    files.value = await listFiles(authStore.userId, { status: 'processed' })
  } catch (err) {
    console.error('Failed to load files:', err)
  }
}

async function loadRecords() {
  try {
    loading.value = true

    // Build document type filter
    const documentTypes = currentDocumentTypes.value

    const result = await listRecords(authStore.userId, {
      fileId: selectedFile.value?.id,
      documentType: selectedFile.value ? null : documentTypes[0], // If specific file, don't filter by type
      search: search.value,
      page: page.value,
      limit: 50,
      sortBy: sortBy.value,
      sortDesc: sortDesc.value
    })

    records.value = result.records
    totalPages.value = result.totalPages
    totalRecords.value = result.total

    // Load stats
    stats.value = await getRecordStats(
      authStore.userId,
      selectedFile.value?.id,
      selectedFile.value ? null : documentTypes[0]
    )
  } catch (err) {
    console.error('Failed to load records:', err)
    uiStore.showError(t('errors.generic'))
  } finally {
    loading.value = false
  }
}

function handleSort(column) {
  if (sortBy.value === column) {
    sortDesc.value = !sortDesc.value
  } else {
    sortBy.value = column
    sortDesc.value = true
  }
  page.value = 1
  loadRecords()
}

function handleSearch() {
  page.value = 1
  loadRecords()
}

function handleFileChange(fileId) {
  if (fileId) {
    router.push(`/records/${fileId}`)
  } else {
    router.push('/records')
  }
}

function handleTabChange(tab) {
  activeTab.value = tab
  // Clear file selection when changing tabs
  if (selectedFile.value) {
    router.push('/records')
  }
}

function handleExport() {
  const csv = exportToCSV(records.value)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `records_${activeTab.value}_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function formatNumber(num) {
  if (!num && num !== 0) return '-'
  return new Intl.NumberFormat(uiStore.locale === 'mk' ? 'mk-MK' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num)
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString(uiStore.locale === 'mk' ? 'mk-MK' : 'en-US')
}

// Extract saldo from zabeleska (for balance sheets)
function extractSaldo(record) {
  if (record.zabeleska && record.zabeleska.startsWith('Салдо:')) {
    const match = record.zabeleska.match(/Салдо:\s*([\d,.-]+)/)
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''))
    }
  }
  // Calculate from dolguja - pobaruva
  const dolguja = parseFloat(record.dolguja) || 0
  const pobaruva = parseFloat(record.pobaruva) || 0
  return dolguja - pobaruva
}
</script>

<template>
  <div>
    <Header :title="t('records.title')">
      <template #actions>
        <button
          v-if="records.length > 0"
          @click="handleExport"
          class="btn btn-secondary"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {{ t('records.export') }}
        </button>
      </template>
    </Header>

    <div class="p-6">
      <!-- Tabs -->
      <div class="mb-6">
        <div class="border-b border-gray-200 dark:border-gray-700">
          <nav class="-mb-px flex gap-6">
            <button
              @click="handleTabChange('analytical')"
              :class="[
                'py-3 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === 'analytical'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              ]"
            >
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {{ t('records.tabs.analyticalCards') }}
              </div>
            </button>
            <button
              @click="handleTabChange('balance_sheet')"
              :class="[
                'py-3 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === 'balance_sheet'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              ]"
            >
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {{ t('records.tabs.balanceSheets') }}
              </div>
            </button>
          </nav>
        </div>
      </div>

      <!-- Stats Cards -->
      <div v-if="stats" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="card p-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('records.summary.totalRecords') }}</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.totalRecords.toLocaleString() }}</p>
        </div>
        <div class="card p-4 border-l-4 border-red-500">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('records.summary.totalDolguja') }}</p>
          <p class="text-2xl font-bold text-red-600">{{ formatNumber(stats.totalDolguja) }}</p>
        </div>
        <div class="card p-4 border-l-4 border-green-500">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('records.summary.totalPobaruva') }}</p>
          <p class="text-2xl font-bold text-green-600">{{ formatNumber(stats.totalPobaruva) }}</p>
        </div>
        <div class="card p-4 border-l-4 border-blue-500">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('records.summary.balance') }}</p>
          <p :class="['text-2xl font-bold', stats.balance >= 0 ? 'text-green-600' : 'text-red-600']">
            {{ formatNumber(stats.balance) }}
          </p>
        </div>
      </div>

      <!-- Filters -->
      <div class="card p-4 mb-6">
        <div class="flex flex-wrap gap-4">
          <!-- Search -->
          <div class="flex-1 min-w-[200px]">
            <input
              v-model="search"
              type="text"
              class="input"
              :placeholder="activeTab === 'balance_sheet' ? t('records.columns.accountName') + '...' : t('records.search')"
              @keyup.enter="handleSearch"
            />
          </div>

          <!-- File filter -->
          <div class="w-64">
            <select
              :value="selectedFile?.id || ''"
              @change="handleFileChange($event.target.value)"
              class="input"
            >
              <option value="">{{ t('records.allRecords') }}</option>
              <option v-for="file in filteredFiles" :key="file.id" :value="file.id">
                {{ file.file_name }}
              </option>
            </select>
          </div>

          <!-- Search button -->
          <button @click="handleSearch" class="btn btn-primary">
            {{ t('common.search') }}
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" :text="t('common.loading')" />
      </div>

      <!-- Empty State -->
      <EmptyState
        v-else-if="records.length === 0"
        :title="t('records.noRecords')"
        icon="document"
      />

      <!-- Analytical Cards Table -->
      <div v-else-if="activeTab === 'analytical'" class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th
                  @click="handleSort('nalog')"
                  class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div class="flex items-center gap-1">
                    {{ t('records.columns.nalog') }}
                    <span v-if="sortBy === 'nalog'" class="text-blue-600">
                      {{ sortDesc ? '↓' : '↑' }}
                    </span>
                  </div>
                </th>
                <th
                  @click="handleSort('data')"
                  class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div class="flex items-center gap-1">
                    {{ t('records.columns.data') }}
                    <span v-if="sortBy === 'data'" class="text-blue-600">
                      {{ sortDesc ? '↓' : '↑' }}
                    </span>
                  </div>
                </th>
                <th>{{ t('records.columns.m_ddv') }}</th>
                <th>{{ t('records.columns.opis') }}</th>
                <th>{{ t('records.columns.zatvoranje') }}</th>
                <th>{{ t('records.columns.invoiceNumber') }}</th>
                <th class="text-right">{{ t('records.columns.dolguja') }}</th>
                <th class="text-right">{{ t('records.columns.pobaruva') }}</th>
                <th>{{ t('records.columns.source') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in records" :key="record.id" class="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td class="font-mono">{{ record.nalog || '-' }}</td>
                <td>{{ formatDate(record.data) }}</td>
                <td>{{ record.m_ddv || '-' }}</td>
                <td class="max-w-xs truncate" :title="record.opis">{{ record.opis || '-' }}</td>
                <td>{{ record.zatvoranje || '-' }}</td>
                <td class="font-mono text-sm text-blue-600 dark:text-blue-400">{{ record.invoice_number || '-' }}</td>
                <td class="text-right font-mono text-red-600">
                  {{ record.dolguja ? formatNumber(record.dolguja) : '-' }}
                </td>
                <td class="text-right font-mono text-green-600">
                  {{ record.pobaruva ? formatNumber(record.pobaruva) : '-' }}
                </td>
                <td class="text-sm text-gray-500 dark:text-gray-400">{{ record.files?.file_name || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <div class="text-sm text-gray-500 dark:text-gray-400">
            Showing {{ ((page - 1) * 50) + 1 }} to {{ Math.min(page * 50, totalRecords) }} of {{ totalRecords }}
          </div>
          <div class="flex gap-2">
            <button
              @click="page--; loadRecords()"
              :disabled="page <= 1"
              class="btn btn-secondary text-sm"
            >
              Previous
            </button>
            <button
              @click="page++; loadRecords()"
              :disabled="page >= totalPages"
              class="btn btn-secondary text-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <!-- Balance Sheet Table -->
      <div v-else-if="activeTab === 'balance_sheet'" class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th
                  @click="handleSort('nalog')"
                  class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div class="flex items-center gap-1">
                    {{ t('records.columns.konto') }}
                    <span v-if="sortBy === 'nalog'" class="text-blue-600">
                      {{ sortDesc ? '↓' : '↑' }}
                    </span>
                  </div>
                </th>
                <th
                  @click="handleSort('opis')"
                  class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div class="flex items-center gap-1">
                    {{ t('records.columns.accountName') }}
                    <span v-if="sortBy === 'opis'" class="text-blue-600">
                      {{ sortDesc ? '↓' : '↑' }}
                    </span>
                  </div>
                </th>
                <th
                  @click="handleSort('dolguja')"
                  class="text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div class="flex items-center justify-end gap-1">
                    {{ t('records.columns.dolguja') }}
                    <span v-if="sortBy === 'dolguja'" class="text-blue-600">
                      {{ sortDesc ? '↓' : '↑' }}
                    </span>
                  </div>
                </th>
                <th
                  @click="handleSort('pobaruva')"
                  class="text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div class="flex items-center justify-end gap-1">
                    {{ t('records.columns.pobaruva') }}
                    <span v-if="sortBy === 'pobaruva'" class="text-blue-600">
                      {{ sortDesc ? '↓' : '↑' }}
                    </span>
                  </div>
                </th>
                <th class="text-right">{{ t('records.columns.saldo') }}</th>
                <th>{{ t('records.columns.source') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in records" :key="record.id" class="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td class="font-mono font-medium text-gray-900 dark:text-white">{{ record.nalog || '-' }}</td>
                <td class="max-w-md" :title="record.opis">{{ record.opis || '-' }}</td>
                <td class="text-right font-mono text-red-600">
                  {{ record.dolguja ? formatNumber(record.dolguja) : '-' }}
                </td>
                <td class="text-right font-mono text-green-600">
                  {{ record.pobaruva ? formatNumber(record.pobaruva) : '-' }}
                </td>
                <td class="text-right font-mono" :class="extractSaldo(record) >= 0 ? 'text-blue-600' : 'text-orange-600'">
                  {{ formatNumber(extractSaldo(record)) }}
                </td>
                <td class="text-sm text-gray-500 dark:text-gray-400">{{ record.files?.file_name || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <div class="text-sm text-gray-500 dark:text-gray-400">
            Showing {{ ((page - 1) * 50) + 1 }} to {{ Math.min(page * 50, totalRecords) }} of {{ totalRecords }}
          </div>
          <div class="flex gap-2">
            <button
              @click="page--; loadRecords()"
              :disabled="page <= 1"
              class="btn btn-secondary text-sm"
            >
              Previous
            </button>
            <button
              @click="page++; loadRecords()"
              :disabled="page >= totalPages"
              class="btn btn-secondary text-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
