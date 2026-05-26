<script setup>
import { useDataStore } from '@/stores/data'
import { storeToRefs } from 'pinia'

const dataStore = useDataStore()
const { messages } = storeToRefs(dataStore)
</script>

<template>
  <div class="toast-container position-fixed top-0 end-0 p-3">
    <div
      v-for="message in messages"
      :key="message.id"
      class="toast show border-0 shadow"
      :class="`text-bg-${message.type}`"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div class="d-flex">
        <div class="toast-body">{{ message.text }}</div>
        <button
          type="button"
          class="btn-close btn-close-white me-2 m-auto"
          aria-label="Cerrar"
          @click="dataStore.removeMessage(message.id)"
        ></button>
      </div>
    </div>
  </div>
</template>
