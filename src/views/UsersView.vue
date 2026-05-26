<script setup>
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'
import { getErrorMessage } from '@/utils/forms'
import { storeToRefs } from 'pinia'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { computed, onMounted, ref } from 'vue'
import * as yup from 'yup'

const dataStore = useDataStore()
const authStore = useAuthStore()
const { users } = storeToRefs(dataStore)
const loading = ref(true)
const error = ref('')
const formError = ref('')
const editId = ref(null)
const formKey = ref(0)
const search = ref('')
const roleFilter = ref('')

const emptyForm = () => ({
  name: '',
  email: '',
  password: '',
  role: 'owner',
})

const form = ref(emptyForm())

const userSchema = computed(() =>
  yup.object({
    name: yup
      .string()
      .required('El nombre es obligatorio')
      .max(255, 'El nombre no puede superar 255 caracteres'),
    email: yup
      .string()
      .required('El email es obligatorio')
      .email('El email no es válido')
      .max(255, 'El email no puede superar 255 caracteres'),
    password: editId.value
      ? yup
        .string()
        .transform((value) => value === '' ? null : value)
        .nullable()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
      : yup.string().required('La contraseña es obligatoria').min(8, 'La contraseña debe tener al menos 8 caracteres'),
    role: yup
      .string()
      .required('Selecciona un rol')
      .oneOf(['manager', 'owner'], 'El rol no es válido'),
  }),
)

const currentFormKey = computed(() => editId.value ? `edit-${editId.value}` : `create-${formKey.value}`)

const roleLabels = {
  manager: 'Manager',
  owner: 'Propietario',
}

const filteredUsers = computed(() =>
  users.value.filter((user) => {
    const searchText = `${user.name} ${user.email} ${roleLabels[user.role] ?? user.role}`.toLowerCase()
    const matchesSearch = searchText.includes(search.value.toLowerCase())
    const matchesRole = !roleFilter.value || user.role === roleFilter.value

    return matchesSearch && matchesRole
  }),
)

const scrollToForm = () => window.scrollTo({ top: 0, behavior: 'smooth' })

const editUser = (user) => {
  form.value = {
    name: user.name ?? '',
    email: user.email ?? '',
    password: '',
    role: user.role ?? 'owner',
  }
  editId.value = user.id
  formError.value = ''
  scrollToForm()
}

const cancelEdit = () => {
  form.value = emptyForm()
  editId.value = null
  formKey.value += 1
  formError.value = ''
}

const saveUser = async (values) => {
  formError.value = ''

  const payload = {
    name: values.name,
    email: values.email,
    role: values.role,
  }

  if (values.password) {
    payload.password = values.password
  }

  try {
    if (editId.value) {
      await dataStore.updateUser(editId.value, payload)
      editId.value = null
    } else {
      await dataStore.createUser(payload)
    }

    form.value = emptyForm()
    formKey.value += 1
    formError.value = ''
  } catch (requestError) {
    formError.value = getErrorMessage(
      requestError,
      editId.value ? 'No se pudo editar el usuario.' : 'No se pudo crear el usuario.',
    )
  }
}

const deleteUser = async (user) => {
  formError.value = ''

  const confirmed = await dataStore.confirm({
    title: 'Borrar usuario',
    message: `¿Seguro que quieres borrar a ${user.name}?`,
    confirmText: 'Borrar',
  })

  if (!confirmed) {
    return
  }

  try {
    await dataStore.deleteUser(user.id)

    if (editId.value === user.id) {
      cancelEdit()
    }
  } catch (requestError) {
    formError.value = getErrorMessage(requestError, 'No se pudo borrar el usuario.')
  }
}

onMounted(async () => {
  try {
    await dataStore.fetchUsers()
  } catch (requestError) {
    error.value = getErrorMessage(requestError, 'No se pudieron cargar los usuarios.')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main>
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
      <div>
        <h1 class="mb-1">Usuarios</h1>
        <p class="text-secondary mb-0">Crea managers y propietarios con acceso a la aplicación.</p>
      </div>
      <span class="badge text-bg-dark fs-6">{{ users.length }} usuarios</span>
    </div>

    <Form
      class="card-form"
      :key="currentFormKey"
      :initial-values="form"
      :validation-schema="userSchema"
      @submit="saveUser"
    >
      <h2>{{ editId ? 'Editar usuario' : 'Crear usuario' }}</h2>

      <div class="form-field">
        <label for="name">Nombre</label>
        <Field id="name" name="name" type="text" />
        <ErrorMessage class="field-error" name="name" />
      </div>

      <div class="form-field">
        <label for="email">Email</label>
        <Field id="email" name="email" type="email" />
        <ErrorMessage class="field-error" name="email" />
      </div>

      <div class="form-field">
        <label for="password">Contraseña</label>
        <Field id="password" name="password" type="password" />
        <small v-if="editId" class="text-secondary">Déjala vacía para mantener la contraseña actual.</small>
        <ErrorMessage class="field-error" name="password" />
      </div>

      <div class="form-field">
        <label for="role">Rol</label>
        <Field id="role" name="role" as="select">
          <option value="owner">Propietario</option>
          <option value="manager">Manager</option>
        </Field>
        <ErrorMessage class="field-error" name="role" />
      </div>

      <div class="form-actions">
        <button class="btn btn-success" type="submit">{{ editId ? 'Guardar cambios' : 'Crear' }}</button>
        <button v-if="editId" class="btn btn-outline-secondary" type="button" @click="cancelEdit">Cancelar edición</button>
      </div>
      <p v-if="formError" class="form-error mb-0">{{ formError }}</p>
    </Form>

    <p v-if="loading" class="alert alert-info mb-0">Cargando usuarios...</p>
    <p v-else-if="error" class="alert alert-danger mb-0">{{ error }}</p>
    <p v-else-if="users.length === 0" class="alert alert-secondary mb-0">No hay usuarios.</p>

    <template v-else>
      <section class="filter-bar">
        <input v-model="search" class="form-control" type="search" placeholder="Buscar por nombre, email o rol" />
        <select v-model="roleFilter" class="form-select">
          <option value="">Todos los roles</option>
          <option value="owner">Propietario</option>
          <option value="manager">Manager</option>
        </select>
      </section>

      <p v-if="filteredUsers.length === 0" class="alert alert-secondary mb-0">No hay usuarios con esos filtros.</p>

      <div v-else class="card border-0 shadow-sm">
        <div class="table-responsive">
          <table class="table align-middle mb-0">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Creado</th>
                <th class="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in filteredUsers" :key="user.id">
                <td>
                  <strong>{{ user.name }}</strong>
                  <p class="text-secondary small mb-0">{{ user.email }}</p>
                </td>
                <td><span class="badge text-bg-light">{{ roleLabels[user.role] ?? user.role }}</span></td>
                <td>{{ user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Sin fecha' }}</td>
                <td class="text-end">
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-success" type="button" @click="editUser(user)">Editar</button>
                    <button
                      class="btn btn-outline-danger"
                      type="button"
                      :disabled="authStore.user?.id === user.id"
                      @click="deleteUser(user)"
                    >
                      Borrar
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </main>
</template>
