<script setup>
import { useI18n } from 'vue-i18n'

defineProps({
  show: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    default: ''
  },
  confirmText: {
    type: String,
    default: ''
  },
  cancelText: {
    type: String,
    default: ''
  },
  danger: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['confirm', 'cancel'])
const { t } = useI18n()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="modal-backdrop animate-fade-in"
      @click.self="emit('cancel')"
    >
      <div class="modal-content animate-slide-up p-6 max-w-md mx-4">
        <!-- Header -->
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">{{ title }}</h3>

        <!-- Message -->
        <p v-if="message" class="text-sm text-gray-600 dark:text-gray-400 mb-6">{{ message }}</p>

        <!-- Slot for custom content -->
        <slot></slot>

        <!-- Actions -->
        <div class="flex justify-end gap-3 mt-6">
          <button
            type="button"
            @click="emit('cancel')"
            :disabled="loading"
            class="btn btn-secondary"
          >
            {{ cancelText || t('common.cancel') }}
          </button>
          <button
            type="button"
            @click="emit('confirm')"
            :disabled="loading"
            :class="[
              'btn',
              danger ? 'btn-danger' : 'btn-primary'
            ]"
          >
            <span v-if="loading" class="flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ t('common.loading') }}
            </span>
            <span v-else>{{ confirmText || t('common.confirm') }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
