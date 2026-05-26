<script setup>
import { useDataStore } from '@/stores/data'
import { storeToRefs } from 'pinia'

const dataStore = useDataStore()
const { confirmation } = storeToRefs(dataStore)
</script>

<template>
  <div v-if="confirmation.visible" class="modal-backdrop-custom">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content shadow">
        <div class="modal-header">
          <h2 class="modal-title fs-5">{{ confirmation.title }}</h2>
          <button type="button" class="btn-close" aria-label="Cerrar" @click="dataStore.cancelConfirmation"></button>
        </div>
        <div class="modal-body">
          <p class="mb-0">{{ confirmation.message }}</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary" @click="dataStore.cancelConfirmation">
            Cancelar
          </button>
          <button type="button" class="btn btn-danger" @click="dataStore.acceptConfirmation">
            {{ confirmation.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  z-index: 1080;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.45);
}

.modal-dialog {
  width: min(440px, 100%);
  margin: 0;
}
</style>
