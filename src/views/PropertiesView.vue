<script setup>
import { useDataStore } from '@/stores/data'
import { getErrorMessage, nullableNumber, optionalNumber, requiredNumber } from '@/utils/forms'
import { storeToRefs } from 'pinia'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import * as yup from 'yup'

const dataStore = useDataStore()
const { properties } = storeToRefs(dataStore)
const loading = ref(true)
const error = ref('')
const createError = ref('')
const editId = ref(null)
const showPropertyForm = ref(false)
const formKey = ref(0)
const search = ref('')
const statusFilter = ref('')
const photoFile = ref(null)

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

const openCreateForm = () => {
  form.value = emptyForm()
  editId.value = null
  photoFile.value = null
  createError.value = ''
  formKey.value += 1
  showPropertyForm.value = true
}

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
  photoFile.value = null
  showPropertyForm.value = true
  createError.value = ''
}

const closePropertyForm = () => {
  cancelEdit()
}

const cancelEdit = () => {
  form.value = emptyForm()
  editId.value = null
  showPropertyForm.value = false
  photoFile.value = null
  formKey.value += 1
  createError.value = ''
}

const onPhotoChange = (event) => {
  photoFile.value = event.target.files?.[0] ?? null
}

const buildPropertyPayload = (values) => {
  const payload = new FormData()

  payload.append('title', values.title)
  payload.append('address', values.address)
  payload.append('price', Number(values.price))
  payload.append('status', values.status)
  payload.append('description', values.description ?? '')

  if (values.size !== '' && values.size !== null && values.size !== undefined) {
    payload.append('size', optionalNumber(values.size))
  }

  if (values.rooms !== '' && values.rooms !== null && values.rooms !== undefined) {
    payload.append('rooms', optionalNumber(values.rooms))
  }

  if (values.bathrooms !== '' && values.bathrooms !== null && values.bathrooms !== undefined) {
    payload.append('bathrooms', optionalNumber(values.bathrooms))
  }

  if (photoFile.value) {
    payload.append('photo', photoFile.value)
  }

  return payload
}

const saveProperty = async (values) => {
  createError.value = ''

  const payload = buildPropertyPayload(values)

  try {
    if (editId.value) {
      await dataStore.updateProperty(editId.value, payload)
      editId.value = null
    } else {
      await dataStore.createProperty(payload)
    }

    form.value = emptyForm()
    formKey.value += 1
    photoFile.value = null
    showPropertyForm.value = false
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
      <div class="d-flex flex-wrap align-items-center gap-2">
        <span class="badge text-bg-success fs-6">{{ properties.length }} propiedades</span>
        <button class="btn btn-success" type="button" @click="openCreateForm">
          Añadir propiedad
        </button>
      </div>
    </div>

    <div v-if="showPropertyForm" class="property-modal-backdrop" @click.self="closePropertyForm">
      <Form
        class="property-modal"
        :key="currentFormKey"
        :initial-values="form"
        :validation-schema="propertySchema"
        @submit="saveProperty"
      >
        <header class="property-modal-header">
          <div>
            <span class="text-secondary small text-uppercase fw-bold">Propiedad</span>
            <h2 class="h4 mb-0">{{ editId ? 'Editar propiedad' : 'Añadir propiedad' }}</h2>
          </div>
          <button class="btn btn-outline-secondary btn-sm" type="button" @click="closePropertyForm">Cerrar</button>
        </header>

        <div class="property-modal-body">
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

          <div class="property-form-grid">
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

          <div class="form-field">
            <label for="photo">Foto de la propiedad</label>
            <input id="photo" class="form-control" type="file" accept="image/*" @change="onPhotoChange" />
            <small class="text-secondary">
              {{ photoFile ? photoFile.name : 'Si no añades foto, se mostrará un dibujo por defecto.' }}
            </small>
          </div>

          <p v-if="createError" class="form-error mb-0">{{ createError }}</p>
        </div>

        <footer class="property-modal-footer">
          <button class="btn btn-outline-secondary" type="button" @click="closePropertyForm">Cancelar</button>
          <button class="btn btn-success" type="submit">{{ editId ? 'Guardar cambios' : 'Crear propiedad' }}</button>
        </footer>
      </Form>
    </div>

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
            <div class="property-photo">
              <img v-if="property.photo_url" :src="property.photo_url" :alt="property.title" />
              <div v-else class="property-placeholder" aria-hidden="true">
                <span class="placeholder-sun"></span>
                <span class="placeholder-roof"></span>
                <span class="placeholder-house">
                  <span></span>
                  <span></span>
                </span>
              </div>
            </div>
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
                <RouterLink class="btn btn-outline-primary btn-sm" :to="`/properties/${property.id}`">Info</RouterLink>
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
.property-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1050;
  display: grid;
  place-items: center;
  padding: 22px;
  background: rgb(15 23 42 / 0.58);
}

.property-modal {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: min(760px, 100%);
  max-height: min(92vh, 860px);
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 28px 70px rgb(15 23 42 / 0.32);
}

.property-modal-header,
.property-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
}

.property-modal-header {
  border-bottom: 1px solid var(--color-border);
}

.property-modal-footer {
  border-top: 1px solid var(--color-border);
}

.property-modal-body {
  display: grid;
  gap: 14px;
  padding: 20px;
  overflow: auto;
}

.property-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.card {
  overflow: hidden;
}

.property-photo {
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #172033;
}

.property-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.property-placeholder {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgb(13 110 253 / 0.16), transparent 42%),
    linear-gradient(180deg, #1f2f4a 0%, #172033 58%, #101827 100%);
}

.placeholder-sun {
  position: absolute;
  top: 22px;
  right: 28px;
  width: 34px;
  height: 34px;
  background: #f4b740;
  border-radius: 999px;
  box-shadow: 0 0 32px rgb(244 183 64 / 0.42);
}

.placeholder-roof {
  position: absolute;
  left: 50%;
  bottom: 74px;
  width: 126px;
  height: 126px;
  background: #4f8df7;
  transform: translateX(-50%) rotate(45deg);
  border-radius: 6px;
}

.placeholder-house {
  position: absolute;
  left: 50%;
  bottom: 34px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  width: 150px;
  height: 86px;
  padding: 18px;
  background: #f8fafc;
  border-radius: 8px 8px 4px 4px;
  transform: translateX(-50%);
  box-shadow: 0 18px 36px rgb(15 23 42 / 0.28);
}

.placeholder-house span {
  align-self: start;
  height: 28px;
  background: #dbeafe;
  border: 2px solid #93c5fd;
  border-radius: 4px;
}

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

@media (max-width: 680px) {
  .property-modal-backdrop {
    padding: 12px;
  }

  .property-modal-header,
  .property-modal-footer,
  .property-form-grid {
    grid-template-columns: 1fr;
  }

  .property-modal-header,
  .property-modal-footer {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
