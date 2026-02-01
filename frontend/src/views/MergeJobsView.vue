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

function toggleFile(fileId) {
  const index = selectedFileIds.value.indexOf(fileId)
  if (index > -1) {
    selectedFileIds.value.splice(index, 1)
  } else {
    selectedFileIds.value.push(fileId)
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
              <h3 class="font-medium text-gray-900">{{ job.name || 'Untitled Merge' }}</h3>
              <p class="text-sm text-gray-500">{{ formatDate(job.created_at) }}</p>
            </div>
            <StatusBadge :status="job.status">
              {{ t(`merge.status.${job.status}`) }}
            </StatusBadge>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="text-center p-3 bg-gray-50 rounded-lg">
              <p class="text-2xl font-bold text-gray-900">{{ getFileCount(job) }}</p>
              <p class="text-xs text-gray-500">Files</p>
            </div>
            <div class="text-center p-3 bg-gray-50 rounded-lg">
              <p class="text-2xl font-bold text-gray-900">{{ getRecordCount(job).toLocaleString() }}</p>
              <p class="text-xs text-gray-500">Records</p>
            </div>
          </div>

          <!-- File list -->
          <div class="space-y-1 mb-4">
            <div
              v-for="mjf in job.merge_job_files?.slice(0, 3)"
              :key="mjf.file_id"
              class="text-sm text-gray-600 truncate"
            >
              • {{ mjf.files?.file_name }}
            </div>
            <p
              v-if="job.merge_job_files?.length > 3"
              class="text-sm text-gray-400"
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
              class="btn btn-secondary text-sm text-red-600 hover:bg-red-50"
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
        <div class="modal-content animate-slide-up p-6 max-w-lg">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ t('merge.createTitle') }}</h3>

          <form @submit.prevent="handleCreate">
            <!-- Job name (only show if files available) -->
            <div v-if="processedFiles.length > 0" class="mb-4">
              <label class="label">{{ t('merge.jobName') }}</label>
              <input
                v-model="jobName"
                type="text"
                class="input"
                :placeholder="t('merge.jobName')"
              />
            </div>

            <!-- File selection -->
            <div class="mb-4">
              <label class="label">{{ t('merge.selectFiles') }}</label>

              <!-- No files message -->
              <div v-if="processedFiles.length === 0" class="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
                <svg class="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p class="text-gray-600 font-medium">No processed files available</p>
                <p class="text-sm text-gray-500 mt-1">Upload and process at least 2 files first</p>
                <button
                  type="button"
                  @click="showCreateModal = false; router.push('/files')"
                  class="btn btn-primary mt-4"
                >
                  Go to Files
                </button>
              </div>

              <!-- File list -->
              <template v-else>
                <p class="text-sm text-gray-500 mb-2">
                  {{ t('merge.selectedCount', { count: selectedFileIds.length }) }}
                  <span v-if="selectedFileIds.length < 2" class="text-red-500">
                    ({{ t('merge.minFiles') }})
                  </span>
                </p>
                <div class="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                  <div
                    v-for="file in processedFiles"
                    :key="file.id"
                    @click="toggleFile(file.id)"
                    :class="[
                      'flex items-center gap-3 p-3 cursor-pointer transition-colors',
                      selectedFileIds.includes(file.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                    ]"
                  >
                    <input
                      type="checkbox"
                      :checked="selectedFileIds.includes(file.id)"
                      class="w-4 h-4 text-blue-600 rounded"
                      @click.stop
                      @change="toggleFile(file.id)"
                    />
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-gray-900 truncate">{{ file.file_name }}</p>
                      <p class="text-sm text-gray-500">{{ file.record_count }} records</p>
                    </div>
                  </div>
                </div>
              </template>
            </div>

            <div v-if="processedFiles.length > 0" class="flex justify-end gap-3">
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
                  Creating...
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
