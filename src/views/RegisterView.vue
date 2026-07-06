<script setup>
import { useAuthStore } from '@/stores/auth'
import { getErrorMessage } from '@/utils/forms'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import * as yup from 'yup'

const router = useRouter()
const authStore = useAuthStore()
const error = ref('')

const registerSchema = yup.object({
  name: yup
    .string()
    .required('El nombre es obligatorio')
    .max(255, 'El nombre no puede superar 255 caracteres'),
  email: yup
    .string()
    .required('El email es obligatorio')
    .email('Introduce un email válido'),
  password: yup
    .string()
    .required('La contraseña es obligatoria')
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
  wants_newsletter: yup
    .boolean(),
})

const register = async (values) => {
  error.value = ''

  try {
    await authStore.register(values)
    router.push('/dashboard')
  } catch (requestError) {
    error.value = getErrorMessage(requestError, 'No se pudo registrar el usuario.')
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-panel">
    <h1>Registro</h1>

    <Form :validation-schema="registerSchema" @submit="register">
      <div class="form-field">
        <label for="name">Nombre</label>
        <Field id="name" name="name" type="text" autocomplete="name" />
        <ErrorMessage class="field-error" name="name" />
      </div>

      <div class="form-field">
        <label for="email">Email</label>
        <Field id="email" name="email" type="email" autocomplete="email" />
        <ErrorMessage class="field-error" name="email" />
      </div>

      <div class="form-field">
        <label for="password">Contraseña</label>
        <Field id="password" name="password" type="password" autocomplete="new-password" />
        <ErrorMessage class="field-error" name="password" />
      </div>

      <label class="form-check d-flex align-items-start gap-2">
        <Field name="wants_newsletter" type="checkbox" :value="true" :unchecked-value="false" class="form-check-input mt-1" />
        <span class="form-check-label">
          Quiero recibir novedades, consejos e información sobre InmoGest por email.
        </span>
      </label>

      <button type="submit">Registrarse</button>
      <p v-if="error" class="form-error">{{ error }}</p>
    </Form>
    </section>
  </main>
</template>
