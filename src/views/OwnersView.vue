<script setup>
import { useDataStore } from '@/stores/data'
import { getErrorMessage } from '@/utils/forms'
import { storeToRefs } from 'pinia'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { computed, onMounted, ref } from 'vue'
import * as yup from 'yup'

const dataStore = useDataStore()
const { owners } = storeToRefs(dataStore)
const loading = ref(true)
const error = ref('')
const formError = ref('')
const editId = ref(null)
const formKey = ref(0)
const search = ref('')

const emptyForm = () => ({
  name: '',
  email: '',
  phone: '',
  dni: '',
  notes: '',
})

const form = ref(emptyForm())

const ownerSchema = yup.object({
  name: yup
    .string()
    .required('El nombre es obligatorio')
    .max(255, 'El nombre no puede superar 255 caracteres'),
  email: yup
    .string()
    .nullable()
    .email('El email no es válido'),
  phone: yup
    .string()
    .nullable()
    .max(20, 'El teléfono no puede superar 20 caracteres'),
  dni: yup
    .string()
    .nullable(),
  notes: yup
    .string()
    .nullable(),
})

const currentFormKey = computed(() => editId.value ? `edit-${editId.value}` : `create-${formKey.value}`)

const filteredOwners = computed(() =>
  owners.value.filter((owner) => {
    const searchText = `${owner.name} ${owner.email ?? ''} ${owner.phone ?? ''} ${owner.dni ?? ''}`.toLowerCase()

    return searchText.includes(search.value.toLowerCase())
  }),
)

const scrollToForm = () => window.scrollTo({ top: 0, behavior: 'smooth' })

const editOwner = (owner) => {
  form.value = {
    name: owner.name ?? '',
    email: owner.email ?? '',
    phone: owner.phone ?? '',
    dni: owner.dni ?? '',
    notes: owner.notes ?? '',
  }
  editId.value = owner.id
  formError.value = ''
  scrollToForm()
}

const cancelEdit = () => {
  form.value = emptyForm()
  editId.value = null
  formKey.value += 1
  formError.value = ''
}

const saveOwner = async (values) => {
  formError.value = ''

  try {
    if (editId.value) {
      await dataStore.updateOwner(editId.value, values)
      editId.value = null
    } else {
      await dataStore.createOwner(values)
    }

    form.value = emptyForm()
    formKey.value += 1
    formError.value = ''
  } catch (requestError) {
    formError.value = getErrorMessage(
      requestError,
      editId.value ? 'No se pudo editar el propietario.' : 'No se pudo crear el propietario.',
    )
  }
}

const deleteOwner = async (id) => {
  formError.value = ''

  const confirmed = await dataStore.confirm({
    title: 'Borrar propietario',
    message: '¿Seguro que quieres borrar este propietario?',
    confirmText: 'Borrar',
  })

  if (!confirmed) {
    return
  }

  try {
    await dataStore.deleteOwner(id)

    if (editId.value === id) {
      cancelEdit()
    }
  } catch (requestError) {
    formError.value = getErrorMessage(requestError, 'No se pudo borrar el propietario.')
  }
}

onMounted(async () => {
  try {
    await dataStore.fetchOwners()
  } catch (requestError) {
    error.value = getErrorMessage(requestError, 'No se pudieron cargar los propietarios.')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main>
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
      <div>
        <h1 class="mb-1">Propietarios</h1>
        <p class="text-secondary mb-0">Administra propietarios y sus datos de contacto.</p>
      </div>
      <span class="badge text-bg-dark fs-6">{{ owners.length }} propietarios</span>
    </div>

    <Form
      class="card-form"
      :key="currentFormKey"
      :initial-values="form"
      :validation-schema="ownerSchema"
      @submit="saveOwner"
    >
      <h2>{{ editId ? 'Editar propietario' : 'Crear propietario' }}</h2>

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
        <label for="phone">Teléfono</label>
        <Field id="phone" name="phone" type="text" />
        <ErrorMessage class="field-error" name="phone" />
      </div>

      <div class="form-field">
        <label for="dni">DNI</label>
        <Field id="dni" name="dni" type="text" />
        <ErrorMessage class="field-error" name="dni" />
      </div>

      <div class="form-field">
        <label for="notes">Notas</label>
        <Field id="notes" name="notes" as="textarea" />
        <ErrorMessage class="field-error" name="notes" />
      </div>

      <div class="form-actions">
        <button class="btn btn-success" type="submit">{{ editId ? 'Guardar cambios' : 'Crear' }}</button>
        <button v-if="editId" class="btn btn-outline-secondary" type="button" @click="cancelEdit">Cancelar edición</button>
      </div>
      <p v-if="formError" class="form-error mb-0">{{ formError }}</p>
    </Form>

    <p v-if="loading" class="alert alert-info mb-0">Cargando propietarios...</p>
    <p v-else-if="error" class="alert alert-danger mb-0">{{ error }}</p>
    <p v-else-if="owners.length === 0" class="alert alert-secondary mb-0">No hay propietarios.</p>

    <template v-else>
      <section class="filter-bar">
        <input v-model="search" class="form-control" type="search" placeholder="Buscar por nombre, email, teléfono o DNI" />
      </section>

      <p v-if="filteredOwners.length === 0" class="alert alert-secondary mb-0">No hay propietarios con esos filtros.</p>

      <div v-else class="row g-3">
        <div v-for="owner in filteredOwners" :key="owner.id" class="col-md-6 col-xl-4">
        <article class="card h-100 border-0 shadow-sm">
          <div class="card-body">
            <h2 class="h5 card-title">{{ owner.name }}</h2>
            <p class="text-secondary mb-2">{{ owner.email || 'Sin email' }}</p>
            <dl class="row small text-secondary mb-3">
              <dt class="col-4">Teléfono</dt>
              <dd class="col-8">{{ owner.phone || 'Sin teléfono' }}</dd>
              <dt class="col-4">DNI</dt>
              <dd class="col-8">{{ owner.dni || 'Sin DNI' }}</dd>
              <dt class="col-4">Notas</dt>
              <dd class="col-8">{{ owner.notes || 'Sin notas' }}</dd>
            </dl>
            <div class="d-flex gap-2">
              <button class="btn btn-outline-success btn-sm" type="button" @click="editOwner(owner)">Editar</button>
              <button class="btn btn-outline-danger btn-sm" type="button" @click="deleteOwner(owner.id)">Borrar</button>
            </div>
          </div>
        </article>
      </div>
    </div>
    </template>
  </main>
</template>
