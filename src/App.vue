<script setup>
import AppMessages from '@/components/AppMessages.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { onMounted, ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useRouter } from 'vue-router'

const router = useRouter()
const authStore = useAuthStore()
const isDarkMode = ref(false)

const applyTheme = () => {
  const theme = isDarkMode.value ? 'dark' : 'light'

  document.documentElement.dataset.theme = theme
  document.documentElement.dataset.bsTheme = theme
  localStorage.setItem('inmogest-theme', theme)
}

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  applyTheme()
}

const logout = async () => {
  await authStore.logout()
  router.push('/')
}

onMounted(() => {
  isDarkMode.value = localStorage.getItem('inmogest-theme') === 'dark'
  applyTheme()
})
</script>

<template>
  <div class="container py-4">
    <nav class="navbar navbar-expand-lg app-navbar border rounded-3 shadow-sm mb-4 px-3">
      <RouterLink class="navbar-brand fw-bold" to="/">InmoGest</RouterLink>

      <div class="navbar-nav flex-row flex-wrap gap-2 ms-lg-auto">
        <template v-if="authStore.isLoggedIn">
          <RouterLink class="nav-link px-2" to="/dashboard">Panel</RouterLink>
          <RouterLink class="nav-link px-2" to="/properties">Propiedades</RouterLink>
          <RouterLink class="nav-link px-2" to="/tenants">Inquilinos</RouterLink>
          <RouterLink v-if="authStore.role === 'manager'" class="nav-link px-2" to="/owners">Propietarios</RouterLink>
          <RouterLink v-if="authStore.role === 'manager'" class="nav-link px-2" to="/users">Usuarios</RouterLink>
          <RouterLink class="nav-link px-2" to="/contracts">Contratos</RouterLink>
          <RouterLink class="nav-link px-2" to="/payments">Pagos</RouterLink>
          <RouterLink class="nav-link px-2" to="/documents">Documentos</RouterLink>
          <button class="btn btn-outline-secondary btn-sm" type="button" @click="toggleTheme">
            {{ isDarkMode ? 'Modo claro' : 'Modo oscuro' }}
          </button>
          <button class="btn btn-outline-secondary btn-sm" type="button" @click="logout">Salir</button>
        </template>

        <template v-else>
          <RouterLink class="nav-link px-2" to="/login">Login</RouterLink>
          <RouterLink class="nav-link px-2" to="/register">Registro</RouterLink>
          <button class="btn btn-outline-secondary btn-sm" type="button" @click="toggleTheme">
            {{ isDarkMode ? 'Modo claro' : 'Modo oscuro' }}
          </button>
        </template>
      </div>
    </nav>

    <RouterView />
    <AppMessages />
    <ConfirmDialog />
  </div>
</template>
