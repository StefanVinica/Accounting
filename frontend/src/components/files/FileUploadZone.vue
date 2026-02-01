<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { useUIStore } from '../../stores/ui'
import { uploadFile, validateFile } from '../../api/files'

const emit = defineEmits(['uploaded'])
const { t } = useI18n()
const authStore = useAuthStore()
const uiStore = useUIStore()

const isDragging = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const fileInputRef = ref(null)

function handleDragOver(e) {
  e.preventDefault()
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

function handleDrop(e) {
  e.preventDefault()
  isDragging.value = false

  const files = Array.from(e.dataTransfer.files)
  processFiles(files)
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files)
  processFiles(files)
  // Reset input
  e.target.value = ''
}

async function processFiles(files) {
  for (const file of files) {
    await uploadSingleFile(file)
  }
}

async function uploadSingleFile(file) {
  // Validate first
  const validation = validateFile(file)
  if (!validation.valid) {
    uiStore.showError(validation.errors.join(', '))
    return
  }

  try {
    uploading.value = true
    uploadProgress.value = 0

    const result = await uploadFile(file, authStore.userId, (progress) => {
      uploadProgress.value = progress
    })

    uiStore.showSuccess(`${file.name} uploaded successfully`)
    emit('uploaded', result)
  } catch (err) {
    uiStore.showError(err.message || t('errors.generic'))
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

function openFileDialog() {
  fileInputRef.value?.click()
}
</script>

<template>
  <div
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    :class="[
      'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
      isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-white'
    ]"
    @click="openFileDialog"
  >
    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      accept=".xlsx,.xls,.csv,.pdf"
      multiple
      @change="handleFileSelect"
    />

    <!-- Uploading state -->
    <div v-if="uploading" class="space-y-4">
      <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
        <svg class="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <div>
        <p class="font-medium text-gray-900">Uploading...</p>
        <div class="w-full max-w-xs mx-auto mt-2 bg-gray-200 rounded-full h-2">
          <div
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${uploadProgress}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Default state -->
    <div v-else class="space-y-4">
      <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      </div>
      <div>
        <p class="font-medium text-gray-900">{{ t('files.dragDrop') }}</p>
        <p class="text-sm text-gray-500 mt-1">
          {{ t('files.or') }}
          <span class="text-blue-600 hover:text-blue-700">{{ t('files.browse') }}</span>
        </p>
      </div>
      <div class="text-xs text-gray-400 space-y-1">
        <p>{{ t('files.allowedTypes') }}</p>
        <p>{{ t('files.maxSize') }}</p>
      </div>
    </div>
  </div>
</template>
