<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true
  },
  size: {
    type: String,
    default: 'md',
    validator: (val) => ['sm', 'md'].includes(val)
  }
})

const badgeClass = computed(() => {
  const statusClasses = {
    // File statuses
    uploaded: 'badge-uploaded',
    processing: 'badge-processing',
    processed: 'badge-processed',
    error: 'badge-error',
    // Relationship statuses
    pending: 'badge-pending',
    active: 'badge-active',
    inactive: 'badge-inactive',
    expired: 'badge-expired',
    // Merge job statuses
    completed: 'badge-processed'
  }
  return statusClasses[props.status] || 'badge-uploaded'
})

const sizeClass = computed(() => {
  return props.size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'
})
</script>

<template>
  <span :class="['badge', badgeClass, sizeClass]">
    <slot>{{ status }}</slot>
  </span>
</template>
