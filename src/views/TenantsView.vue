<script setup>
import { useDataStore } from '@/stores/data'
import { getErrorMessage } from '@/utils/forms'
import { storeToRefs } from 'pinia'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { computed, onMounted, ref } from 'vue'
import * as yup from 'yup'

const dataStore = useDataStore()
const { tenants, properties } = storeToRefs(dataStore)
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
  property_ids: [],
})

const form = ref(emptyForm())

const baseTenantSchema = {
  name: yup
    .string()
    .required('El nombre es obligatorio')
    .max(255, 'El nombre no puede superar 255 caracteres'),

  email: yup
    .string()
    .required('El email es obligatorio')
    .email('El email no es válido'),

  phone: yup
    .string()
    .max(20, 'El teléfono no puede superar 20 caracteres')
    .nullable(),

  dni: yup
    .string()
    .nullable(),

  notes: yup
    .string()
    .nullable(),
}

const createTenantSchema = yup.object({
  ...baseTenantSchema,
  property_ids: yup
    .array()
    .nullable(),
})

const editTenantSchema = yup.object({
  ...baseTenantSchema,
  property_ids: yup
    .array()
    .nullable(),
})

const currentFormKey = computed(() => editId.value ? `edit-${editId.value}` : `create-${formKey.value}`)

const tenantProperties = (tenant) =>
  tenant.properties?.length
    ? tenant.properties.map((property) => property.title).join(', ')
    : 'Sin propiedades asociadas'

const filteredTenants = computed(() =>
  tenants.value.filter((tenant) =>
    `${tenant.name} ${tenant.email} ${tenant.dni ?? ''}`.toLowerCase().includes(search.value.toLowerCase()),
  ),
)

const scrollToForm = () => window.scrollTo({ top: 0, behavior: 'smooth' })

const editTenant = (tenant) => {
  form.value = {
    name: tenant.name ?? '',
    email: tenant.email ?? '',
    phone: tenant.phone ?? '',
    dni: tenant.dni ?? '',
    notes: tenant.notes ?? '',
    property_ids: tenant.properties?.map((property) => property.id) ?? [],
  }
  editId.value = tenant.id
  formError.value = ''
  scrollToForm()
}

const cancelEdit = () => {
  form.value = emptyForm()
  editId.value = null
  formKey.value += 1
  formError.value = ''
}

const saveTenant = async (values) => {
  formError.value = ''

  try {
    if (editId.value) {
      const payload = {
        ...values,
        property_ids: values.property_ids?.map(Number) ?? [],
      }
      await dataStore.updateTenant(editId.value, payload)
      editId.value = null
    } else {
      const payload = {
        ...values,
        property_ids: values.property_ids?.map(Number) ?? [],
      }
      await dataStore.createTenant(payload)
    }

    form.value = emptyForm()
    formKey.value += 1
    formError.value = ''
  } catch (error) {
    formError.value = getErrorMessage(
      error,
      editId.value ? 'No se pudo editar el tenant.' : 'No se pudo crear el tenant.',
    )
  }
}

const deleteTenant = async (id) => {
  formError.value = ''

  const confirmed = await dataStore.confirm({
    title: 'Borrar inquilino',
    message: '¿Seguro que quieres borrar este inquilino?',
    confirmText: 'Borrar',
  })

  if (!confirmed) {
    return
  }

  try {
    await dataStore.deleteTenant(id)

    if (editId.value === id) {
      cancelEdit()
    }
  } catch (error) {
    formError.value = getErrorMessage(error, 'No se pudo borrar el tenant.')
  }
}

const detachProperty = async (tenantId, propertyId) => {
  formError.value = ''

  const confirmed = await dataStore.confirm({
    title: 'Quitar propiedad',
    message: '¿Seguro que quieres quitar esta propiedad del inquilino?',
    confirmText: 'Quitar',
  })

  if (!confirmed) {
    return
  }

  try {
    await dataStore.detachPropertyFromTenant(tenantId, propertyId)
  } catch (error) {
    formError.value = getErrorMessage(error, 'No se pudo quitar la propiedad del tenant.')
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      dataStore.fetchTenants(),
      dataStore.fetchProperties(),
    ])
  } catch {
    error.value = 'No se pudieron cargar los tenants.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main>
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
      <div>
        <h1 class="mb-1">Inquilinos</h1>
        <p class="text-secondary mb-0">Gestiona personas inquilinas y sus propiedades asociadas.</p>
      </div>
      <span class="badge text-bg-primary fs-6">{{ tenants.length }} inquilinos</span>
    </div>

    <Form
      class="card-form"
      :key="currentFormKey"
      :initial-values="form"
      :validation-schema="editId ? editTenantSchema : createTenantSchema"
      @submit="saveTenant"
    >
      <h2>{{ editId ? 'Editar inquilino' : 'Crear inquilino' }}</h2>

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

      <div class="form-field">
        <label for="properties">Propiedades</label>
        <div id="properties" class="checkbox-scroll">
          <label v-for="property in properties" :key="property.id" class="check-option">
            <Field name="property_ids" type="checkbox" :value="property.id" />
            <span>
              <strong>{{ property.title }}</strong>
              <small>{{ property.address }}</small>
            </span>
          </label>
          <p v-if="properties.length === 0" class="text-secondary small mb-0">No hay propiedades disponibles.</p>
        </div>
        <ErrorMessage class="field-error" name="property_ids" />
      </div>

      <div class="form-actions">
        <button class="btn btn-success" type="submit">{{ editId ? 'Guardar cambios' : 'Crear' }}</button>
        <button v-if="editId" class="btn btn-outline-secondary" type="button" @click="cancelEdit">Cancelar edición</button>
      </div>
      <p v-if="formError" class="form-error mb-0">{{ formError }}</p>
    </Form>

    <p v-if="loading" class="alert alert-info mb-0">Cargando inquilinos...</p>
    <p v-else-if="error" class="alert alert-danger mb-0">{{ error }}</p>
    <p v-else-if="tenants.length === 0" class="alert alert-secondary mb-0">No hay inquilinos.</p>

    <template v-else>
      <section class="filter-bar">
        <input v-model="search" class="form-control" type="search" placeholder="Buscar por nombre, email o DNI" />
      </section>

      <p v-if="filteredTenants.length === 0" class="alert alert-secondary mb-0">No hay inquilinos con ese filtro.</p>

      <div v-else class="card border-0 shadow-sm">
      <div class="table-responsive">
        <table class="table align-middle mb-0">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Contacto</th>
              <th>DNI</th>
              <th>Propiedades</th>
              <th class="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tenant in filteredTenants" :key="tenant.id">
              <td>
                <strong>{{ tenant.name }}</strong>
                <p class="text-secondary small mb-0">{{ tenant.notes || 'Sin notas' }}</p>
              </td>
              <td>
                {{ tenant.email }}
                <br />
                <span class="text-secondary small">{{ tenant.phone || 'Sin teléfono' }}</span>
              </td>
              <td>{{ tenant.dni || 'Sin DNI' }}</td>
              <td>
                <span class="text-secondary small">{{ tenantProperties(tenant) }}</span>
                <div v-if="tenant.properties?.length" class="d-flex flex-wrap gap-1 mt-2">
                  <button
                    v-for="property in tenant.properties"
                    :key="property.id"
                    class="btn btn-outline-secondary btn-sm"
                    type="button"
                    @click="detachProperty(tenant.id, property.id)"
                  >
                    Quitar {{ property.title }}
                  </button>
                </div>
              </td>
              <td class="text-end">
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-success" type="button" @click="editTenant(tenant)">Editar</button>
                  <button class="btn btn-outline-danger" type="button" @click="deleteTenant(tenant.id)">Borrar</button>
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
