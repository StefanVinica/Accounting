<script setup>
defineProps({
  size: {
    type: String,
    default: 'md',
    validator: (val) => ['sm', 'md', 'lg'].includes(val)
  },
  text: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3">
    <div
      :class="[
        'animate-spin rounded-full border-4 border-blue-600 border-t-transparent',
        {
          'h-6 w-6': size === 'sm',
          'h-10 w-10': size === 'md',
          'h-16 w-16': size === 'lg'
        }
      ]"
    ></div>
    <span v-if="text" class="text-sm text-gray-500">{{ text }}</span>
  </div>
</template>
