<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/ui'
import Header from '../components/layout/Header.vue'
import FileUploadZone from '../components/files/FileUploadZone.vue'
import StatusBadge from '../components/common/StatusBadge.vue'
import EmptyState from '../components/common/EmptyState.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'
import ConfirmModal from '../components/common/ConfirmModal.vue'
import { listFiles, deleteFile, getFileDownloadUrl, processFile } from '../api/files'

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const uiStore = useUIStore()

const files = ref([])
const loading = ref(true)
const showDeleteModal = ref(false)
const fileToDelete = ref(null)
const deleting = ref(false)
const processingFileId = ref(null)

onMounted(async () => {
  await loadFiles()
})

async function loadFiles() {
  try {
    loading.value = true
    files.value = await listFiles(authStore.userId)
  } catch (err) {
    uiStore.showError(t('errors.generic'))
  } finally {
    loading.value = false
  }
}

function handleFileUploaded(file) {
  files.value.unshift(file)
}

function viewRecords(file) {
  if (file.status === 'processed') {
    router.push(`/records/${file.id}`)
  }
}

async function downloadFile(file) {
  try {
    const url = await getFileDownloadUrl(file.storage_path)
    window.open(url, '_blank')
  } catch (err) {
    uiStore.showError(t('errors.generic'))
  }
}

function confirmDelete(file) {
  fileToDelete.value = file
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!fileToDelete.value) return

  try {
    deleting.value = true
    await deleteFile(fileToDelete.value.id, fileToDelete.value.storage_path)
    files.value = files.value.filter(f => f.id !== fileToDelete.value.id)
    uiStore.showSuccess('File deleted')
    showDeleteModal.value = false
  } catch (err) {
    uiStore.showError(t('errors.generic'))
  } finally {
    deleting.value = false
    fileToDelete.value = null
  }
}

async function handleProcess(file) {
  try {
    processingFileId.value = file.id
    // Update local state immediately
    const fileIndex = files.value.findIndex(f => f.id === file.id)
    if (fileIndex !== -1) {
      files.value[fileIndex].status = 'processing'
    }

    const result = await processFile(file.id)

    // Reload files to get updated status
    await loadFiles()
    uiStore.showSuccess(t('files.processSuccess', { count: result.recordCount }))
  } catch (err) {
    console.error('Processing error:', err)
    uiStore.showError(err.message || t('errors.generic'))
    // Reload to get actual status
    await loadFiles()
  } finally {
    processingFileId.value = null
  }
}

function formatFileSize(bytes) {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
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
</script>

<template>
  <div>
    <Header :title="t('files.title')" />

    <div class="p-6">
      <!-- Upload Zone -->
      <FileUploadZone @uploaded="handleFileUploaded" class="mb-6" />

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" :text="t('common.loading')" />
      </div>

      <!-- Empty State -->
      <EmptyState
        v-else-if="files.length === 0"
        :title="t('files.noFiles')"
        :description="t('files.uploadFirst')"
        icon="folder"
      />

      <!-- Files Table -->
      <div v-else class="card overflow-hidden">
        <table class="table">
          <thead>
            <tr>
              <th>{{ t('files.columns.name') }}</th>
              <th>{{ t('files.columns.type') }}</th>
              <th>{{ t('files.columns.documentType') }}</th>
              <th>{{ t('files.columns.size') }}</th>
              <th>{{ t('files.columns.records') }}</th>
              <th>{{ t('files.columns.status') }}</th>
              <th>{{ t('files.columns.uploaded') }}</th>
              <th>{{ t('files.columns.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="file in files" :key="file.id">
              <td>
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span class="text-xs font-medium text-gray-500 uppercase">{{ file.file_type }}</span>
                  </div>
                  <span class="font-medium text-gray-900">{{ file.file_name }}</span>
                </div>
              </td>
              <td>
                <span class="uppercase text-xs font-medium text-gray-500">{{ file.file_type }}</span>
              </td>
              <td>
                <span v-if="file.document_type" class="text-sm text-gray-600">
                  {{ t(`files.documentTypes.${file.document_type}`) }}
                </span>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td>{{ formatFileSize(file.file_size) }}</td>
              <td>
                <span v-if="file.record_count > 0" class="font-medium">{{ file.record_count }}</span>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td>
                <StatusBadge :status="file.status">
                  {{ t(`files.status.${file.status}`) }}
                </StatusBadge>
              </td>
              <td class="text-gray-500">{{ formatDate(file.created_at) }}</td>
              <td>
                <div class="flex items-center gap-2">
                  <!-- Process button for uploaded files -->
                  <button
                    v-if="file.status === 'uploaded' && file.file_type !== 'pdf'"
                    @click="handleProcess(file)"
                    :disabled="processingFileId === file.id"
                    class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                    :title="t('files.actions.process')"
                  >
                    <svg v-if="processingFileId === file.id" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <!-- Processing indicator -->
                  <span v-if="file.status === 'processing'" class="p-2 text-blue-600">
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                  <button
                    v-if="file.status === 'processed'"
                    @click="viewRecords(file)"
                    class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    :title="t('files.actions.view')"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    @click="downloadFile(file)"
                    class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    :title="t('files.actions.download')"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  <button
                    @click="confirmDelete(file)"
                    class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    :title="t('files.actions.delete')"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      :show="showDeleteModal"
      :title="t('files.actions.delete')"
      :message="`Are you sure you want to delete '${fileToDelete?.file_name}'? This will also delete all associated records.`"
      :loading="deleting"
      danger
      @confirm="handleDelete"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>
