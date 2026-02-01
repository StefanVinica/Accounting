<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/ui'
import Header from '../components/layout/Header.vue'
import StatusBadge from '../components/common/StatusBadge.vue'
import EmptyState from '../components/common/EmptyState.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'
import ConfirmModal from '../components/common/ConfirmModal.vue'
import { listMergeJobs, createMergeJob, deleteMergeJob } from '../api/merge'
import { listFiles } from '../api/files'

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const uiStore = useUIStore()

const mergeJobs = ref([])
const files = ref([])
const loading = ref(true)
const showCreateModal = ref(false)
const jobName = ref('')
const selectedFileIds = ref([])
const creating = ref(false)
const showDeleteModal = ref(false)
const jobToDelete = ref(null)
const deleting = ref(false)

const processedFiles = computed(() => files.value.filter(f => f.status === 'processed'))
const canCreate = computed(() => selectedFileIds.value.length >= 2)

// Group files by document type
const filesByDocType = computed(() => {
  const groups = {}
  for (const file of processedFiles.value) {
    const docType = file.document_type || 'unknown'
    if (!groups[docType]) {
      groups[docType] = []
    }
    groups[docType].push(file)
  }
  return groups
})

// Get document type of first selected file (to enforce same-type selection)
const selectedDocType = computed(() => {
  if (selectedFileIds.value.length === 0) return null
  const firstSelectedFile = processedFiles.value.find(f => f.id === selectedFileIds.value[0])
  return firstSelectedFile?.document_type || 'unknown'
})

// Check if a file can be selected (must match selected doc type)
function canSelectFile(file) {
  if (selectedFileIds.value.length === 0) return true
  return (file.document_type || 'unknown') === selectedDocType.value
}

// Get document type label
function getDocTypeLabel(docType) {
  const labels = {
    'analytical_card_simple': t('files.documentTypes.analytical_card_simple'),
    'analytical_card_detailed': t('files.documentTypes.analytical_card_detailed'),
    'balance_sheet': t('files.documentTypes.balance_sheet'),
    'unknown': t('files.documentTypes.unknown')
  }
  return labels[docType] || docType
}

onMounted(async () => {
  await Promise.all([loadMergeJobs(), loadFiles()])
})

async function loadMergeJobs() {
  try {
    loading.value = true
    mergeJobs.value = await listMergeJobs(authStore.userId)
  } catch (err) {
    uiStore.showError(t('errors.generic'))
  } finally {
    loading.value = false
  }
}

async function loadFiles() {
  try {
    files.value = await listFiles(authStore.userId)
  } catch (err) {
    console.error('Failed to load files:', err)
  }
}

function toggleFile(file) {
  const fileId = file.id
  const index = selectedFileIds.value.indexOf(fileId)
  if (index > -1) {
    selectedFileIds.value.splice(index, 1)
  } else {
    // Only allow selecting if same document type
    if (canSelectFile(file)) {
      selectedFileIds.value.push(fileId)
    }
  }
}

async function handleCreate() {
  if (!canCreate.value) {
    uiStore.showError(t('merge.minFiles'))
    return
  }

  try {
    creating.value = true
    const job = await createMergeJob(
      authStore.userId,
      jobName.value || undefined,
      selectedFileIds.value
    )
    mergeJobs.value.unshift(job)
    showCreateModal.value = false
    jobName.value = ''
    selectedFileIds.value = []
    uiStore.showSuccess('Merge job created!')

    // Navigate to result
    router.push(`/merge/${job.id}`)
  } catch (err) {
    uiStore.showError(err.message || t('errors.generic'))
  } finally {
    creating.value = false
  }
}

function viewResult(job) {
  router.push(`/merge/${job.id}`)
}

function confirmDelete(job) {
  jobToDelete.value = job
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!jobToDelete.value) return

  try {
    deleting.value = true
    await deleteMergeJob(jobToDelete.value.id)
    mergeJobs.value = mergeJobs.value.filter(j => j.id !== jobToDelete.value.id)
    showDeleteModal.value = false
    uiStore.showSuccess('Merge job deleted')
  } catch (err) {
    uiStore.showError(t('errors.generic'))
  } finally {
    deleting.value = false
    jobToDelete.value = null
  }
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(uiStore.locale === 'mk' ? 'mk-MK' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getFileCount(job) {
  return job.merge_job_files?.length || 0
}

function getRecordCount(job) {
  return job.merge_job_files?.reduce((sum, mjf) => sum + (mjf.files?.record_count || 0), 0) || 0
}
</script>

<template>
  <div>
    <Header :title="t('merge.title')">
      <template #actions>
        <button
          @click="showCreateModal = true"
          class="btn btn-primary"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          {{ t('merge.create') }}
        </button>
      </template>
    </Header>

    <div class="p-6">
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" :text="t('common.loading')" />
      </div>

      <!-- Empty State -->
      <EmptyState
        v-else-if="mergeJobs.length === 0"
        :title="t('merge.noJobs')"
        :description="t('merge.createFirst')"
        icon="merge"
      >
        <template #action>
          <button
            @click="showCreateModal = true"
            class="btn btn-primary"
          >
            {{ t('merge.create') }}
          </button>
        </template>
      </EmptyState>

      <!-- Merge Jobs Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="job in mergeJobs"
          :key="job.id"
          class="card p-6 cursor-pointer hover:shadow-md transition-shadow"
          @click="viewResult(job)"
        >
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="font-medium text-gray-900 dark:text-white">{{ job.name || 'Untitled Merge' }}</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ formatDate(job.created_at) }}</p>
            </div>
            <StatusBadge :status="job.status">
              {{ t(`merge.status.${job.status}`) }}
            </StatusBadge>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ getFileCount(job) }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">Files</p>
            </div>
            <div class="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ getRecordCount(job).toLocaleString() }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">Records</p>
            </div>
          </div>

          <!-- File list -->
          <div class="space-y-1 mb-4">
            <div
              v-for="mjf in job.merge_job_files?.slice(0, 3)"
              :key="mjf.file_id"
              class="text-sm text-gray-600 dark:text-gray-400 truncate"
            >
              • {{ mjf.files?.file_name }}
            </div>
            <p
              v-if="job.merge_job_files?.length > 3"
              class="text-sm text-gray-400 dark:text-gray-500"
            >
              +{{ job.merge_job_files.length - 3 }} more
            </p>
          </div>

          <div class="flex gap-2" @click.stop>
            <button
              @click="viewResult(job)"
              class="btn btn-primary text-sm flex-1"
            >
              View Result
            </button>
            <button
              @click="confirmDelete(job)"
              class="btn btn-secondary text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Merge Modal -->
    <Teleport to="body">
      <div
        v-if="showCreateModal"
        class="modal-backdrop animate-fade-in"
        @click.self="showCreateModal = false"
      >
        <div class="modal-content animate-slide-up p-8 max-w-6xl w-full mx-4">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white">{{ t('merge.createTitle') }}</h3>
            <button
              @click="showCreateModal = false"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="handleCreate">
            <!-- Job name (only show if files available) -->
            <div v-if="processedFiles.length > 0" class="mb-6">
              <label class="label">{{ t('merge.jobName') }}</label>
              <input
                v-model="jobName"
                type="text"
                class="input"
                :placeholder="t('merge.jobName')"
              />
            </div>

            <!-- File selection -->
            <div class="mb-6">
              <!-- Selection summary bar -->
              <div class="flex items-center justify-between mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div class="flex items-center gap-4">
                  <label class="text-lg font-medium text-gray-900 dark:text-white">{{ t('merge.selectFiles') }}</label>
                  <div class="flex items-center gap-2">
                    <span :class="[
                      'inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold',
                      selectedFileIds.length >= 2
                        ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400'
                        : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400'
                    ]">
                      {{ selectedFileIds.length }} {{ t('merge.selected') }}
                    </span>
                    <span v-if="selectedFileIds.length < 2" class="text-sm text-red-500">
                      {{ t('merge.minFiles') }}
                    </span>
                  </div>
                </div>
                <button
                  v-if="selectedFileIds.length > 0"
                  type="button"
                  @click="selectedFileIds = []"
                  class="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                >
                  {{ t('common.clearAll') }}
                </button>
              </div>

              <!-- Document type restriction notice - always reserve space to prevent layout shift -->
              <div class="mb-4 p-4 rounded-lg border transition-all duration-200"
                :class="selectedDocType
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'"
              >
                <p class="text-sm flex items-center gap-2"
                  :class="selectedDocType
                    ? 'text-blue-700 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'"
                >
                  <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span v-if="selectedDocType">{{ t('merge.sameTypeOnly') }}: <strong class="text-blue-800 dark:text-blue-300">{{ getDocTypeLabel(selectedDocType) }}</strong></span>
                  <span v-else>{{ t('merge.selectToStart') }}</span>
                </p>
              </div>

              <!-- No files message -->
              <div v-if="processedFiles.length === 0" class="text-center py-12 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p class="text-gray-600 dark:text-gray-300 font-medium text-lg">{{ t('merge.noProcessedFiles') }}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">{{ t('merge.uploadFirst') }}</p>
                <button
                  type="button"
                  @click="showCreateModal = false; router.push('/files')"
                  class="btn btn-primary mt-6"
                >
                  {{ t('files.title') }}
                </button>
              </div>

              <!-- Files grouped by document type -->
              <div v-else class="space-y-6 max-h-[500px] overflow-y-auto">
                <div
                  v-for="(groupFiles, docType) in filesByDocType"
                  :key="docType"
                  class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  <!-- Document type header -->
                  <div class="bg-gray-100 dark:bg-gray-800 px-5 py-4 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                        <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <span class="font-semibold text-gray-800 dark:text-gray-200 text-lg">
                          {{ getDocTypeLabel(docType) }}
                        </span>
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                          {{ groupFiles.length }} {{ groupFiles.length === 1 ? 'file' : 'files' }} available
                        </p>
                      </div>
                    </div>
                    <span
                      v-if="selectedDocType && selectedDocType !== docType"
                      class="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full"
                    >
                      {{ t('merge.differentType') }}
                    </span>
                  </div>

                  <!-- Table header -->
                  <div class="grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                    <div class="col-span-1"></div>
                    <div class="col-span-5">{{ t('files.columns.name') }}</div>
                    <div class="col-span-2">{{ t('files.columns.records') }}</div>
                    <div class="col-span-2">Konto</div>
                    <div class="col-span-2">{{ t('files.columns.uploaded') }}</div>
                  </div>

                  <!-- Files in this group -->
                  <div class="divide-y divide-gray-100 dark:divide-gray-700">
                    <div
                      v-for="file in groupFiles"
                      :key="file.id"
                      @click="toggleFile(file)"
                      :class="[
                        'grid grid-cols-12 gap-4 px-5 py-4 items-center transition-colors',
                        selectedFileIds.includes(file.id)
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500'
                          : canSelectFile(file)
                            ? 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-l-4 border-l-transparent'
                            : 'opacity-40 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50 border-l-4 border-l-transparent'
                      ]"
                    >
                      <!-- Checkbox -->
                      <div class="col-span-1">
                        <input
                          type="checkbox"
                          :checked="selectedFileIds.includes(file.id)"
                          :disabled="!canSelectFile(file)"
                          class="w-5 h-5 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                          @click.stop
                          @change="toggleFile(file)"
                        />
                      </div>

                      <!-- File name -->
                      <div class="col-span-5 min-w-0">
                        <p class="font-medium text-gray-900 dark:text-white truncate" :title="file.file_name">
                          {{ file.file_name }}
                        </p>
                      </div>

                      <!-- Records count -->
                      <div class="col-span-2">
                        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {{ file.record_count?.toLocaleString() || 0 }}
                        </span>
                      </div>

                      <!-- Konto info -->
                      <div class="col-span-2 min-w-0">
                        <span v-if="file.konto_number" class="text-sm text-gray-600 dark:text-gray-400 truncate block" :title="file.konto_name">
                          {{ file.konto_number }}
                        </span>
                        <span v-else class="text-sm text-gray-400 dark:text-gray-500">-</span>
                      </div>

                      <!-- Upload date -->
                      <div class="col-span-2">
                        <span class="text-sm text-gray-500 dark:text-gray-400">
                          {{ new Date(file.created_at).toLocaleDateString() }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="processedFiles.length > 0" class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                @click="showCreateModal = false"
                class="btn btn-secondary"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                type="submit"
                :disabled="creating || !canCreate"
                class="btn btn-primary"
              >
                <span v-if="creating" class="flex items-center gap-2">
                  <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ t('common.creating') }}
                </span>
                <span v-else>{{ t('merge.startMerge') }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      :show="showDeleteModal"
      title="Delete Merge Job"
      message="Are you sure you want to delete this merge job? This action cannot be undone."
      :loading="deleting"
      danger
      @confirm="handleDelete"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>
