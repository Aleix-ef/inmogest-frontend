<script setup>
import { useAuthStore } from '@/stores/auth'
import { getErrorMessage } from '@/utils/forms'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import * as yup from 'yup'

const authStore = useAuthStore()
const error = ref('')
const message = ref('')

const forgotPasswordSchema = yup.object({
  email: yup
    .string()
    .required('El email es obligatorio')
    .email('Introduce un email válido'),
})

const sendResetLink = async (values) => {
  error.value = ''
  message.value = ''

  try {
    const response = await authStore.forgotPassword(values)
    message.value = response.message
  } catch (requestError) {
    error.value = getErrorMessage(requestError, 'No se pudo enviar el correo de recuperación.')
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-panel">
      <h1>Recuperar contraseña</h1>
      <p class="text-secondary mb-0">Introduce tu email y te enviaremos un enlace para crear una contraseña nueva.</p>

      <Form :validation-schema="forgotPasswordSchema" @submit="sendResetLink">
        <div class="form-field">
          <label for="email">Email</label>
          <Field id="email" name="email" type="email" autocomplete="email" />
          <ErrorMessage class="field-error" name="email" />
        </div>

        <button type="submit">Enviar enlace</button>
        <RouterLink class="small" to="/login">Volver al login</RouterLink>
        <p v-if="message" class="alert alert-success mb-0">{{ message }}</p>
        <p v-if="error" class="form-error mb-0">{{ error }}</p>
      </Form>
    </section>
  </main>
</template>
