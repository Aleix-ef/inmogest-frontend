<script setup>
import { useDataStore } from '@/stores/data'
import { getErrorMessage, nullableNumber, optionalNumber, requiredNumber } from '@/utils/forms'
import { storeToRefs } from 'pinia'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { computed, onMounted, ref } from 'vue'
import * as yup from 'yup'

const dataStore = useDataStore()
const { properties } = storeToRefs(dataStore)
const loading = ref(true)
const error = ref('')
const createError = ref('')
const editId = ref(null)
const formKey = ref(0)
const search = ref('')
const statusFilter = ref('')

const emptyForm = () => ({
  title: '',
  address: '',
  price: '',
  size: '',
  rooms: '',
  bathrooms: '',
  status: 'available',
  description: '',
})

const form = ref(emptyForm())

const propertySchema = yup.object({
  title: yup
    .string()
    .required('El título es obligatorio')
    .max(255, 'El título no puede superar 255 caracteres'),

  address: yup
    .string()
    .required('La dirección es obligatoria')
    .max(255, 'La dirección no puede superar 255 caracteres'),

  price: requiredNumber('El precio es obligatorio', 'El precio debe ser un número', 'El precio debe ser mayor o igual que 0'),

  size: nullableNumber('El tamaño debe ser mayor o igual que 0'),

  rooms: nullableNumber('Las habitaciones deben ser un número entero mayor o igual que 0')
    .integer('Las habitaciones deben ser un número entero'),

  bathrooms: nullableNumber('Los baños deben ser un número entero mayor o igual que 0')
    .integer('Los baños deben ser un número entero'),

  status: yup
    .string()
    .required('El estado es obligatorio')
    .oneOf(['available', 'rented', 'maintenance'], 'El estado no es válido'),

  description: yup
    .string()
    .nullable(),
})

const currentFormKey = computed(() => editId.value ? `edit-${editId.value}` : `create-${formKey.value}`)

const filteredProperties = computed(() =>
  properties.value.filter((property) => {
    const searchText = `${property.title} ${property.address}`.toLowerCase()
    const matchesSearch = searchText.includes(search.value.toLowerCase())
    const matchesStatus = !statusFilter.value || property.status === statusFilter.value

    return matchesSearch && matchesStatus
  }),
)

const scrollToForm = () => window.scrollTo({ top: 0, behavior: 'smooth' })

const editProperty = (property) => {
  form.value = {
    title: property.title ?? '',
    address: property.address ?? '',
    price: property.price ?? '',
    size: property.size ?? '',
    rooms: property.rooms ?? '',
    bathrooms: property.bathrooms ?? '',
    status: property.status ?? 'available',
    description: property.description ?? '',
  }
  editId.value = property.id
  createError.value = ''
  scrollToForm()
}

const cancelEdit = () => {
  form.value = emptyForm()
  editId.value = null
  formKey.value += 1
  createError.value = ''
}

const saveProperty = async (values) => {
  createError.value = ''

  const payload = {
    title: values.title,
    address: values.address,
    price: Number(values.price),
    size: optionalNumber(values.size),
    rooms: optionalNumber(values.rooms),
    bathrooms: optionalNumber(values.bathrooms),
    status: values.status,
    description: values.description,
  }

  try {
    if (editId.value) {
      await dataStore.updateProperty(editId.value, payload)
      editId.value = null
    } else {
      await dataStore.createProperty(payload)
    }

    form.value = emptyForm()
    formKey.value += 1
    createError.value = ''
  } catch (error) {
    createError.value = getErrorMessage(
      error,
      editId.value ? 'No se pudo editar la propiedad.' : 'No se pudo crear la propiedad.',
    )
  }
}

const deleteProperty = async (id) => {
  createError.value = ''

  const confirmed = await dataStore.confirm({
    title: 'Borrar propiedad',
    message: '¿Seguro que quieres borrar esta propiedad?',
    confirmText: 'Borrar',
  })

  if (!confirmed) {
    return
  }

  try {
    await dataStore.deleteProperty(id)

    if (editId.value === id) {
      cancelEdit()
    }
  } catch (error) {
    createError.value = getErrorMessage(error, 'No se pudo borrar la propiedad.')
  }
}

onMounted(async () => {
  try {
    await dataStore.fetchProperties()
  } catch {
    error.value = 'No se pudieron cargar las propiedades.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main>
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
      <div>
        <h1 class="mb-1">Propiedades</h1>
        <p class="text-secondary mb-0">Gestiona inmuebles, estado, precio y características principales.</p>
      </div>
      <span class="badge text-bg-success fs-6">{{ properties.length }} propiedades</span>
    </div>

    <Form
      class="card-form"
      :key="currentFormKey"
      :initial-values="form"
      :validation-schema="propertySchema"
      @submit="saveProperty"
    >
      <h2>{{ editId ? 'Editar propiedad' : 'Crear propiedad' }}</h2>

      <div class="form-field">
        <label for="title">Título</label>
        <Field id="title" name="title" type="text" />
        <ErrorMessage class="field-error" name="title" />
      </div>

      <div class="form-field">
        <label for="address">Dirección</label>
        <Field id="address" name="address" type="text" />
        <ErrorMessage class="field-error" name="address" />
      </div>

      <div class="form-field">
        <label for="price">Precio</label>
        <Field id="price" name="price" type="number" step="0.01" />
        <ErrorMessage class="field-error" name="price" />
      </div>

      <div class="form-field">
        <label for="size">Metros cuadrados</label>
        <Field id="size" name="size" type="number" />
        <ErrorMessage class="field-error" name="size" />
      </div>

      <div class="form-field">
        <label for="rooms">Habitaciones</label>
        <Field id="rooms" name="rooms" type="number" />
        <ErrorMessage class="field-error" name="rooms" />
      </div>

      <div class="form-field">
        <label for="bathrooms">Baños</label>
        <Field id="bathrooms" name="bathrooms" type="number" />
        <ErrorMessage class="field-error" name="bathrooms" />
      </div>

      <div class="form-field">
        <label for="status">Estado</label>
        <Field id="status" name="status" as="select">
          <option value="available">Disponible</option>
          <option value="rented">Alquilada</option>
          <option value="maintenance">Mantenimiento</option>
        </Field>
        <ErrorMessage class="field-error" name="status" />
      </div>

      <div class="form-field">
        <label for="description">Descripción</label>
        <Field id="description" name="description" as="textarea" />
        <ErrorMessage class="field-error" name="description" />
      </div>

      <div class="form-actions">
        <button class="btn btn-success" type="submit">{{ editId ? 'Guardar cambios' : 'Crear' }}</button>
        <button v-if="editId" class="btn btn-outline-secondary" type="button" @click="cancelEdit">Cancelar edición</button>
      </div>
      <p v-if="createError" class="form-error mb-0">{{ createError }}</p>
    </Form>

    <p v-if="loading" class="alert alert-info mb-0">Cargando propiedades...</p>
    <p v-else-if="error" class="alert alert-danger mb-0">{{ error }}</p>
    <p v-else-if="properties.length === 0" class="alert alert-secondary mb-0">No hay propiedades.</p>

    <template v-else>
      <section class="filter-bar">
        <input v-model="search" class="form-control" type="search" placeholder="Buscar por título o dirección" />
        <select v-model="statusFilter" class="form-select">
          <option value="">Todos los estados</option>
          <option value="available">Disponible</option>
          <option value="rented">Alquilada</option>
          <option value="maintenance">Mantenimiento</option>
        </select>
      </section>

      <p v-if="filteredProperties.length === 0" class="alert alert-secondary mb-0">No hay propiedades con esos filtros.</p>

      <div v-else class="row g-3">
        <div v-for="property in filteredProperties" :key="property.id" class="col-md-6 col-xl-4">
          <article class="card h-100 border-0 shadow-sm">
            <div class="card-body">
              <div class="d-flex justify-content-between gap-2">
                <h2 class="h5 card-title mb-1">{{ property.title }}</h2>
                <span class="badge status-badge" :class="`status-${property.status}`">{{ property.status }}</span>
              </div>
              <p class="text-secondary mb-3">{{ property.address }}</p>
              <p class="h4 mb-3">{{ Number(property.price).toFixed(2) }} €</p>
              <dl class="row small text-secondary mb-3">
                <dt class="col-5">Metros</dt>
                <dd class="col-7">{{ property.size ?? 'Sin datos' }}</dd>
                <dt class="col-5">Habitaciones</dt>
                <dd class="col-7">{{ property.rooms ?? 'Sin datos' }}</dd>
                <dt class="col-5">Baños</dt>
                <dd class="col-7">{{ property.bathrooms ?? 'Sin datos' }}</dd>
              </dl>
              <div class="d-flex gap-2">
                <button class="btn btn-outline-success btn-sm" type="button" @click="editProperty(property)">Editar</button>
                <button class="btn btn-outline-danger btn-sm" type="button" @click="deleteProperty(property.id)">Borrar</button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </template>
  </main>
</template>

<style scoped>
.status-badge {
  height: fit-content;
  text-transform: capitalize;
}

.status-available {
  color: #0f5132;
  background: #d1e7dd;
}

.status-rented {
  color: #084298;
  background: #cfe2ff;
}

.status-maintenance {
  color: #664d03;
  background: #fff3cd;
}
</style>
