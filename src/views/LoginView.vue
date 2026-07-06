<script setup>
import { useAuthStore } from '@/stores/auth'
import { getErrorMessage } from '@/utils/forms'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useRouter } from 'vue-router'
import * as yup from 'yup'

const router = useRouter()
const authStore = useAuthStore()
const error = ref('')

const loginSchema = yup.object({
  email: yup
    .string()
    .required('El email es obligatorio')
    .email('Introduce un email válido'),
  password: yup
    .string()
    .required('La contraseña es obligatoria'),
})

const login = async (values) => {
  error.value = ''

  try {
    await authStore.login(values)
    router.push('/dashboard')
  } catch (requestError) {
    error.value = getErrorMessage(requestError, 'No se pudo iniciar sesión.')
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-panel">
      <h1>Iniciar sesión</h1>

      <Form :validation-schema="loginSchema" @submit="login">
        <div class="form-field">
          <label for="email">Email</label>
          <Field id="email" name="email" type="email" autocomplete="email" />
          <ErrorMessage class="field-error" name="email" />
        </div>

        <div class="form-field">
          <label for="password">Contraseña</label>
          <Field id="password" name="password" type="password" autocomplete="current-password" />
          <ErrorMessage class="field-error" name="password" />
        </div>

        <button type="submit">Entrar</button>
        <RouterLink class="small" to="/forgot-password">He olvidado mi contraseña</RouterLink>
        <p v-if="error" class="form-error">{{ error }}</p>
      </Form>
    </section>
  </main>
</template>
