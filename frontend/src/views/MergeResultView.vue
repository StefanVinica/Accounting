<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/ui'
import Header from '../components/layout/Header.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'
import StatusBadge from '../components/common/StatusBadge.vue'
import { getMergeResult, exportMergeToCSV } from '../api/merge'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const uiStore = useUIStore()

const result = ref(null)
const loading = ref(true)
const search = ref('')
const sourceFilter = ref('')
const activeTab = ref('records') // 'records' or 'invoices'
const statusFilter = ref('') // 'paid', 'partial', 'outstanding', 'overpaid', ''
const expandedInvoice = ref(null)

const filteredRecords = computed(() => {
  if (!result.value?.records) return []

  let records = result.value.records

  if (search.value) {
    const q = search.value.toLowerCase()
    records = records.filter(r =>
      r.nalog?.toLowerCase().includes(q) ||
      r.opis?.toLowerCase().includes(q)
    )
  }

  if (sourceFilter.value) {
    records = records.filter(r => r.files?.file_name === sourceFilter.value)
  }

  return records
})

const sourceFiles = computed(() => {
  if (!result.value?.records) return []
  const sources = new Set(result.value.records.map(r => r.files?.file_name).filter(Boolean))
  return Array.from(sources)
})

// Compute match groups from records with invoice numbers
const matchGroups = computed(() => {
  if (!result.value?.records) return []

  // Group records by invoice_number
  const groups = {}
  for (const record of result.value.records) {
    const invoiceNum = record.invoice_number
    if (!invoiceNum) continue

    if (!groups[invoiceNum]) {
      groups[invoiceNum] = {
        invoice_number: invoiceNum,
        records: [],
        total_credit: 0,
        total_debit: 0,
        balance: 0,
        status: 'outstanding'
      }
    }

    groups[invoiceNum].records.push(record)
    groups[invoiceNum].total_credit += parseFloat(record.pobaruva) || 0
    groups[invoiceNum].total_debit += parseFloat(record.dolguja) || 0
  }

  // Calculate balance and status for each group
  const groupList = Object.values(groups)
  for (const group of groupList) {
    group.balance = group.total_credit - group.total_debit

    if (Math.abs(group.balance) < 0.01) {
      group.status = 'paid'
    } else if (group.balance < 0) {
      group.status = 'overpaid'
    } else if (group.total_debit > 0) {
      group.status = 'partial'
    } else {
      group.status = 'outstanding'
    }
  }

  return groupList.sort((a, b) => a.invoice_number.localeCompare(b.invoice_number))
})

const filteredMatchGroups = computed(() => {
  let groups = matchGroups.value

  if (statusFilter.value) {
    groups = groups.filter(g => g.status === statusFilter.value)
  }

  if (search.value) {
    const q = search.value.toLowerCase()
    groups = groups.filter(g => g.invoice_number.toLowerCase().includes(q))
  }

  return groups
})

const matchStats = computed(() => {
  const groups = matchGroups.value
  return {
    total: groups.length,
    paid: groups.filter(g => g.status === 'paid').length,
    partial: groups.filter(g => g.status === 'partial').length,
    outstanding: groups.filter(g => g.status === 'outstanding').length,
    overpaid: groups.filter(g => g.status === 'overpaid').length
  }
})

function toggleInvoice(invoiceNum) {
  expandedInvoice.value = expandedInvoice.value === invoiceNum ? null : invoiceNum
}

// Color mapping for source files
const sourceColors = ['bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-purple-100 text-purple-800', 'bg-orange-100 text-orange-800', 'bg-pink-100 text-pink-800']

function getSourceColor(fileName) {
  const index = sourceFiles.value.indexOf(fileName)
  return sourceColors[index % sourceColors.length] || 'bg-gray-100 text-gray-800'
}

onMounted(async () => {
  await loadResult()
})

async function loadResult() {
  try {
    loading.value = true
    result.value = await getMergeResult(route.params.jobId)
  } catch (err) {
    uiStore.showError(t('errors.generic'))
    router.push('/merge')
  } finally {
    loading.value = false
  }
}

function handleExportCSV() {
  const csv = exportMergeToCSV(result.value.records)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `merge_${result.value.job.name || 'export'}_${new Date().toISOString().split('T')[0]}.csv`
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
</script>

<template>
  <div>
    <Header :title="t('merge.result.title')">
      <template #actions>
        <button @click="router.push('/merge')" class="btn btn-secondary mr-2">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
        <button v-if="result" @click="handleExportCSV" class="btn btn-primary">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {{ t('merge.result.exportCSV') }}
        </button>
      </template>
    </Header>

    <div class="p-6">
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" :text="t('common.loading')" />
      </div>

      <template v-else-if="result">
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div class="card p-4">
            <p class="text-sm text-gray-500">{{ t('records.summary.totalRecords') }}</p>
            <p class="text-2xl font-bold text-gray-900">{{ result.stats.totalRecords.toLocaleString() }}</p>
          </div>
          <div class="card p-4 border-l-4 border-red-500">
            <p class="text-sm text-gray-500">{{ t('records.summary.totalDolguja') }}</p>
            <p class="text-2xl font-bold text-red-600">{{ formatNumber(result.stats.totalDolguja) }}</p>
          </div>
          <div class="card p-4 border-l-4 border-green-500">
            <p class="text-sm text-gray-500">{{ t('records.summary.totalPobaruva') }}</p>
            <p class="text-2xl font-bold text-green-600">{{ formatNumber(result.stats.totalPobaruva) }}</p>
          </div>
          <div class="card p-4 border-l-4 border-blue-500">
            <p class="text-sm text-gray-500">{{ t('records.summary.balance') }}</p>
            <p :class="['text-2xl font-bold', result.stats.balance >= 0 ? 'text-green-600' : 'text-red-600']">
              {{ formatNumber(result.stats.balance) }}
            </p>
          </div>
          <div class="card p-4 border-l-4 border-orange-500">
            <p class="text-sm text-gray-500">{{ t('merge.result.overlapCount') }}</p>
            <p class="text-2xl font-bold text-orange-600">{{ result.stats.overlapCount }}</p>
          </div>
        </div>

        <!-- Source breakdown -->
        <div class="card p-4 mb-6">
          <h3 class="font-medium text-gray-900 mb-3">Records by Source</h3>
          <div class="flex flex-wrap gap-3">
            <div
              v-for="(data, source) in result.stats.bySource"
              :key="source"
              :class="['px-3 py-2 rounded-lg', getSourceColor(source)]"
            >
              <span class="font-medium">{{ source }}</span>
              <span class="ml-2 opacity-75">{{ data.count }} records</span>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-gray-200 mb-6">
          <button
            @click="activeTab = 'records'"
            :class="[
              'px-4 py-2 font-medium text-sm border-b-2 -mb-px transition-colors',
              activeTab === 'records'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            ]"
          >
            {{ t('records.title') }} ({{ result.stats.totalRecords }})
          </button>
          <button
            @click="activeTab = 'invoices'"
            :class="[
              'px-4 py-2 font-medium text-sm border-b-2 -mb-px transition-colors',
              activeTab === 'invoices'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            ]"
          >
            {{ t('merge.matchGroups.title') }} ({{ matchGroups.length }})
          </button>
        </div>

        <!-- Invoice Status Cards (only in invoices tab) -->
        <div v-if="activeTab === 'invoices' && matchGroups.length > 0" class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div
            @click="statusFilter = ''"
            :class="['card p-4 cursor-pointer transition-colors', statusFilter === '' ? 'ring-2 ring-blue-500' : '']"
          >
            <p class="text-sm text-gray-500">{{ t('records.allRecords') }}</p>
            <p class="text-2xl font-bold">{{ matchStats.total }}</p>
          </div>
          <div
            @click="statusFilter = 'paid'"
            :class="['card p-4 cursor-pointer border-l-4 border-green-500 transition-colors', statusFilter === 'paid' ? 'ring-2 ring-green-500' : '']"
          >
            <p class="text-sm text-gray-500">{{ t('merge.matchStatus.paid') }}</p>
            <p class="text-2xl font-bold text-green-600">{{ matchStats.paid }}</p>
          </div>
          <div
            @click="statusFilter = 'partial'"
            :class="['card p-4 cursor-pointer border-l-4 border-yellow-500 transition-colors', statusFilter === 'partial' ? 'ring-2 ring-yellow-500' : '']"
          >
            <p class="text-sm text-gray-500">{{ t('merge.matchStatus.partial') }}</p>
            <p class="text-2xl font-bold text-yellow-600">{{ matchStats.partial }}</p>
          </div>
          <div
            @click="statusFilter = 'outstanding'"
            :class="['card p-4 cursor-pointer border-l-4 border-red-500 transition-colors', statusFilter === 'outstanding' ? 'ring-2 ring-red-500' : '']"
          >
            <p class="text-sm text-gray-500">{{ t('merge.matchStatus.outstanding') }}</p>
            <p class="text-2xl font-bold text-red-600">{{ matchStats.outstanding }}</p>
          </div>
          <div
            @click="statusFilter = 'overpaid'"
            :class="['card p-4 cursor-pointer border-l-4 border-purple-500 transition-colors', statusFilter === 'overpaid' ? 'ring-2 ring-purple-500' : '']"
          >
            <p class="text-sm text-gray-500">{{ t('merge.matchStatus.overpaid') }}</p>
            <p class="text-2xl font-bold text-purple-600">{{ matchStats.overpaid }}</p>
          </div>
        </div>

        <!-- Filters -->
        <div class="card p-4 mb-6">
          <div class="flex flex-wrap gap-4">
            <div class="flex-1 min-w-[200px]">
              <input
                v-model="search"
                type="text"
                class="input"
                :placeholder="activeTab === 'records' ? t('records.search') : t('merge.matchGroups.invoiceNumber')"
              />
            </div>
            <div v-if="activeTab === 'records'" class="w-64">
              <select v-model="sourceFilter" class="input">
                <option value="">All Sources</option>
                <option v-for="source in sourceFiles" :key="source" :value="source">
                  {{ source }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- INVOICES TAB -->
        <div v-if="activeTab === 'invoices'" class="card overflow-hidden">
          <div v-if="filteredMatchGroups.length === 0" class="p-8 text-center text-gray-500">
            {{ t('merge.matchGroups.noMatches') }}
          </div>
          <div v-else class="divide-y divide-gray-200">
            <div
              v-for="group in filteredMatchGroups"
              :key="group.invoice_number"
              class="hover:bg-gray-50"
            >
              <!-- Invoice Header Row -->
              <div
                @click="toggleInvoice(group.invoice_number)"
                class="flex items-center justify-between p-4 cursor-pointer"
              >
                <div class="flex items-center gap-4">
                  <svg
                    :class="['w-5 h-5 text-gray-400 transition-transform', expandedInvoice === group.invoice_number ? 'rotate-90' : '']"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                  <span class="font-mono font-medium text-blue-600">{{ group.invoice_number }}</span>
                  <StatusBadge :status="group.status">
                    {{ t(`merge.matchStatus.${group.status}`) }}
                  </StatusBadge>
                  <span class="text-sm text-gray-500">{{ group.records.length }} {{ t('merge.matchGroups.recordCount').toLowerCase() }}</span>
                </div>
                <div class="flex items-center gap-6 text-sm">
                  <div>
                    <span class="text-gray-500">{{ t('merge.matchGroups.totalCredit') }}:</span>
                    <span class="ml-1 font-mono font-medium text-green-600">{{ formatNumber(group.total_credit) }}</span>
                  </div>
                  <div>
                    <span class="text-gray-500">{{ t('merge.matchGroups.totalDebit') }}:</span>
                    <span class="ml-1 font-mono font-medium text-red-600">{{ formatNumber(group.total_debit) }}</span>
                  </div>
                  <div>
                    <span class="text-gray-500">{{ t('merge.matchGroups.balance') }}:</span>
                    <span :class="['ml-1 font-mono font-medium', group.balance >= 0 ? 'text-green-600' : 'text-red-600']">
                      {{ formatNumber(group.balance) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Expanded Records -->
              <div v-if="expandedInvoice === group.invoice_number" class="bg-gray-50 border-t border-gray-200">
                <table class="table text-sm">
                  <thead>
                    <tr>
                      <th>{{ t('records.columns.source') }}</th>
                      <th>{{ t('records.columns.nalog') }}</th>
                      <th>{{ t('records.columns.data') }}</th>
                      <th>{{ t('records.columns.opis') }}</th>
                      <th class="text-right">{{ t('records.columns.dolguja') }}</th>
                      <th class="text-right">{{ t('records.columns.pobaruva') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="record in group.records" :key="record.id">
                      <td>
                        <span :class="['px-2 py-1 text-xs font-medium rounded', getSourceColor(record.files?.file_name)]">
                          {{ record.files?.file_name || '-' }}
                        </span>
                      </td>
                      <td class="font-mono">{{ record.nalog || '-' }}</td>
                      <td>{{ formatDate(record.data) }}</td>
                      <td class="max-w-xs truncate" :title="record.opis">{{ record.opis || '-' }}</td>
                      <td class="text-right font-mono text-red-600">
                        {{ record.dolguja ? formatNumber(record.dolguja) : '-' }}
                      </td>
                      <td class="text-right font-mono text-green-600">
                        {{ record.pobaruva ? formatNumber(record.pobaruva) : '-' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- RECORDS TAB -->
        <div v-if="activeTab === 'records'" class="card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>{{ t('records.columns.source') }}</th>
                  <th>{{ t('records.columns.nalog') }}</th>
                  <th>{{ t('records.columns.data') }}</th>
                  <th>{{ t('records.columns.m_ddv') }}</th>
                  <th>{{ t('records.columns.opis') }}</th>
                  <th class="text-right">{{ t('records.columns.dolguja') }}</th>
                  <th class="text-right">{{ t('records.columns.pobaruva') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="record in filteredRecords" :key="record.id">
                  <td>
                    <span :class="['px-2 py-1 text-xs font-medium rounded', getSourceColor(record.files?.file_name)]">
                      {{ record.files?.file_name || '-' }}
                    </span>
                  </td>
                  <td class="font-mono">
                    <span
                      :class="{ 'text-orange-600 font-bold': result.stats.overlappingNalog.includes(record.nalog) }"
                      :title="result.stats.overlappingNalog.includes(record.nalog) ? 'Appears in multiple files' : ''"
                    >
                      {{ record.nalog || '-' }}
                    </span>
                  </td>
                  <td>{{ formatDate(record.data) }}</td>
                  <td>{{ record.m_ddv || '-' }}</td>
                  <td class="max-w-xs truncate" :title="record.opis">{{ record.opis || '-' }}</td>
                  <td class="text-right font-mono text-red-600">
                    {{ record.dolguja ? formatNumber(record.dolguja) : '-' }}
                  </td>
                  <td class="text-right font-mono text-green-600">
                    {{ record.pobaruva ? formatNumber(record.pobaruva) : '-' }}
                  </td>
                </tr>
              </tbody>
              <tfoot class="bg-gray-50 font-semibold">
                <tr>
                  <td colspan="5" class="text-right">Totals:</td>
                  <td class="text-right font-mono text-red-600">{{ formatNumber(result.stats.totalDolguja) }}</td>
                  <td class="text-right font-mono text-green-600">{{ formatNumber(result.stats.totalPobaruva) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
