<script setup>
import { useAuthStore } from '@/stores/auth'
import { getErrorMessage } from '@/utils/forms'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import * as yup from 'yup'

const authStore = useAuthStore()
const route = useRoute()
const error = ref('')
const message = ref('')

const initialValues = computed(() => ({
  token: route.query.token ?? '',
  email: route.query.email ?? '',
  password: '',
  password_confirmation: '',
}))

const resetPasswordSchema = yup.object({
  token: yup
    .string()
    .required('El token de recuperación es obligatorio'),
  email: yup
    .string()
    .required('El email es obligatorio')
    .email('Introduce un email válido'),
  password: yup
    .string()
    .required('La nueva contraseña es obligatoria')
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
  password_confirmation: yup
    .string()
    .required('Confirma la contraseña')
    .oneOf([yup.ref('password')], 'Las contraseñas no coinciden'),
})

const resetPassword = async (values) => {
  error.value = ''
  message.value = ''

  try {
    const response = await authStore.resetPassword(values)
    message.value = response.message
  } catch (requestError) {
    error.value = getErrorMessage(requestError, 'No se pudo actualizar la contraseña.')
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-panel">
      <h1>Nueva contraseña</h1>

      <Form :initial-values="initialValues" :validation-schema="resetPasswordSchema" @submit="resetPassword">
        <Field name="token" type="hidden" />

        <div class="form-field">
          <label for="email">Email</label>
          <Field id="email" name="email" type="email" autocomplete="email" />
          <ErrorMessage class="field-error" name="email" />
        </div>

        <div class="form-field">
          <label for="password">Nueva contraseña</label>
          <Field id="password" name="password" type="password" autocomplete="new-password" />
          <ErrorMessage class="field-error" name="password" />
        </div>

        <div class="form-field">
          <label for="password_confirmation">Confirmar contraseña</label>
          <Field id="password_confirmation" name="password_confirmation" type="password" autocomplete="new-password" />
          <ErrorMessage class="field-error" name="password_confirmation" />
        </div>

        <button type="submit">Guardar contraseña</button>
        <RouterLink class="small" to="/login">Volver al login</RouterLink>
        <p v-if="message" class="alert alert-success mb-0">{{ message }}</p>
        <p v-if="error" class="form-error mb-0">{{ error }}</p>
      </Form>
    </section>
  </main>
</template>
