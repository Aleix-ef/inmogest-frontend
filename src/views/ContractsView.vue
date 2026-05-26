<script setup>
import { useDataStore } from '@/stores/data'
import { getErrorMessage, nullableNumber, requiredNumber } from '@/utils/forms'
import { storeToRefs } from 'pinia'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { computed, onMounted, ref } from 'vue'
import * as yup from 'yup'

const dataStore = useDataStore()
const { properties, tenants, contracts } = storeToRefs(dataStore)
const loading = ref(true)
const error = ref('')
const formError = ref('')
const editId = ref(null)
const formKey = ref(0)
const search = ref('')
const statusFilter = ref('')

const emptyForm = () => ({
  property_id: '',
  tenant_ids: [],
  start_date: '',
  end_date: '',
  rent_price: '',
  deposit: '',
  status: 'active',
})

const form = ref(emptyForm())

const contractSchema = yup.object({
  property_id: yup
    .string()
    .required('Selecciona una propiedad'),

  tenant_ids: yup
    .array()
    .min(1, 'Selecciona al menos un tenant'),

  start_date: yup
    .string()
    .required('La fecha de inicio es obligatoria'),

  end_date: yup
    .string()
    .nullable()
    .test('end-after-start', 'La fecha de fin debe ser posterior o igual a la fecha de inicio', function (value) {
      if (!value || !this.parent.start_date) {
        return true
      }

      return value >= this.parent.start_date
    }),

  rent_price: requiredNumber('La renta es obligatoria', 'La renta debe ser un número', 'La renta debe ser mayor o igual que 0'),

  deposit: nullableNumber('La fianza debe ser mayor o igual que 0'),

  status: yup
    .string()
    .required('El estado es obligatorio')
    .oneOf(['active', 'finished', 'cancelled'], 'El estado no es válido'),
})

const currentFormKey = computed(() => editId.value ? `edit-${editId.value}` : `create-${formKey.value}`)

const statusLabels = {
  active: 'Activo',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
}

const filteredContracts = computed(() =>
  contracts.value.filter((contract) => {
    const searchText = [
      contract.property?.title,
      contract.tenants?.map((tenant) => tenant.name).join(' '),
      contract.start_date,
      contract.end_date,
    ].join(' ').toLowerCase()
    const matchesSearch = searchText.includes(search.value.toLowerCase())
    const matchesStatus = !statusFilter.value || contract.status === statusFilter.value

    return matchesSearch && matchesStatus
  }),
)

const scrollToForm = () => window.scrollTo({ top: 0, behavior: 'smooth' })

const editContract = (contract) => {
  form.value = {
    property_id: contract.property_id ?? '',
    tenant_ids: contract.tenants?.map((tenant) => tenant.id) ?? [],
    start_date: contract.start_date ?? '',
    end_date: contract.end_date ?? '',
    rent_price: contract.rent_price ?? '',
    deposit: contract.deposit ?? '',
    status: contract.status ?? 'active',
  }
  editId.value = contract.id
  formError.value = ''
  scrollToForm()
}

const cancelEdit = () => {
  form.value = emptyForm()
  editId.value = null
  formKey.value += 1
  formError.value = ''
}

const saveContract = async (values) => {
  formError.value = ''

  const payload = {
    property_id: Number(values.property_id),
    tenant_ids: values.tenant_ids.map(Number),
    start_date: values.start_date,
    end_date: values.end_date || null,
    rent_price: Number(values.rent_price),
    deposit: values.deposit ? Number(values.deposit) : null,
    status: values.status,
  }

  try {
    if (editId.value) {
      await dataStore.updateContract(editId.value, payload)
      editId.value = null
    } else {
      await dataStore.createContract(payload)
    }

    form.value = emptyForm()
    formKey.value += 1
    formError.value = ''
  } catch (error) {
    formError.value = getErrorMessage(
      error,
      editId.value ? 'No se pudo editar el contrato.' : 'No se pudo crear el contrato.',
    )
  }
}

const deleteContract = async (id) => {
  formError.value = ''

  const confirmed = await dataStore.confirm({
    title: 'Borrar contrato',
    message: '¿Seguro que quieres borrar este contrato?',
    confirmText: 'Borrar',
  })

  if (!confirmed) {
    return
  }

  try {
    await dataStore.deleteContract(id)

    if (editId.value === id) {
      cancelEdit()
    }
  } catch (error) {
    formError.value = getErrorMessage(error, 'No se pudo borrar el contrato.')
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      dataStore.fetchProperties(),
      dataStore.fetchTenants(),
      dataStore.fetchContracts(),
    ])
  } catch {
    error.value = 'No se pudieron cargar los datos.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main>
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
      <div>
        <h1 class="mb-1">Contratos</h1>
        <p class="text-secondary mb-0">Relaciona propiedades, inquilinos, fechas y condiciones económicas.</p>
      </div>
      <span class="badge text-bg-info fs-6">{{ contracts.length }} contratos</span>
    </div>

    <Form
      class="card-form"
      :key="currentFormKey"
      :initial-values="form"
      :validation-schema="contractSchema"
      @submit="saveContract"
    >
      <h2>{{ editId ? 'Editar contrato' : 'Crear contrato' }}</h2>

      <div class="form-field">
        <label for="property">Propiedad</label>
        <Field id="property" name="property_id" as="select">
          <option value="">Selecciona una propiedad</option>
          <option v-for="property in properties" :key="property.id" :value="property.id">
            {{ property.title }}
          </option>
        </Field>
        <ErrorMessage class="field-error" name="property_id" />
      </div>

      <div class="form-field">
        <label for="tenants">Inquilinos</label>
        <div id="tenants" class="checkbox-scroll">
          <label v-for="tenant in tenants" :key="tenant.id" class="check-option">
            <Field name="tenant_ids" type="checkbox" :value="tenant.id" />
            <span>
              <strong>{{ tenant.name }}</strong>
              <small>{{ tenant.email }}</small>
            </span>
          </label>
          <p v-if="tenants.length === 0" class="text-secondary small mb-0">No hay inquilinos disponibles.</p>
        </div>
        <ErrorMessage class="field-error" name="tenant_ids" />
      </div>

      <div class="form-field">
        <label for="start_date">Fecha de inicio</label>
        <Field id="start_date" name="start_date" type="date" />
        <ErrorMessage class="field-error" name="start_date" />
      </div>

      <div class="form-field">
        <label for="end_date">Fecha de fin</label>
        <Field id="end_date" name="end_date" type="date" />
        <ErrorMessage class="field-error" name="end_date" />
      </div>

      <div class="form-field">
        <label for="rent_price">Renta mensual</label>
        <Field id="rent_price" name="rent_price" type="number" step="0.01" />
        <ErrorMessage class="field-error" name="rent_price" />
      </div>

      <div class="form-field">
        <label for="deposit">Fianza</label>
        <Field id="deposit" name="deposit" type="number" step="0.01" />
        <ErrorMessage class="field-error" name="deposit" />
      </div>

      <div class="form-field">
        <label for="status">Estado</label>
        <Field id="status" name="status" as="select">
          <option value="active">Activo</option>
          <option value="finished">Finalizado</option>
          <option value="cancelled">Cancelado</option>
        </Field>
        <ErrorMessage class="field-error" name="status" />
      </div>

      <div class="form-actions">
        <button class="btn btn-success" type="submit">{{ editId ? 'Guardar cambios' : 'Crear' }}</button>
        <button v-if="editId" class="btn btn-outline-secondary" type="button" @click="cancelEdit">Cancelar edición</button>
      </div>
      <p v-if="formError" class="form-error mb-0">{{ formError }}</p>
    </Form>

    <p v-if="loading" class="alert alert-info mb-0">Cargando contratos...</p>
    <p v-else-if="error" class="alert alert-danger mb-0">{{ error }}</p>
    <p v-else-if="contracts.length === 0" class="alert alert-secondary mb-0">No hay contratos.</p>

    <template v-else>
      <section class="filter-bar">
        <input v-model="search" class="form-control" type="search" placeholder="Buscar por propiedad, inquilino o fecha" />
        <select v-model="statusFilter" class="form-select">
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="finished">Finalizado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </section>

      <p v-if="filteredContracts.length === 0" class="alert alert-secondary mb-0">No hay contratos con esos filtros.</p>

      <div v-else class="row g-3">
        <div v-for="contract in filteredContracts" :key="contract.id" class="col-lg-6">
        <article class="card h-100 border-0 shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between gap-2">
              <h2 class="h5 card-title mb-1">{{ contract.property?.title ?? 'Sin propiedad' }}</h2>
              <span class="badge" :class="`contract-${contract.status}`">{{ statusLabels[contract.status] ?? contract.status }}</span>
            </div>
            <p class="text-secondary mb-3">
              {{ contract.tenants?.map((tenant) => tenant.name).join(', ') || 'Sin inquilinos' }}
            </p>
            <div class="row g-2 mb-3">
              <div class="col-sm-6">
                <div class="metric-box">
                  <span>Inicio</span>
                  <strong>{{ contract.start_date }}</strong>
                </div>
              </div>
              <div class="col-sm-6">
                <div class="metric-box">
                  <span>Fin</span>
                  <strong>{{ contract.end_date || 'Indefinido' }}</strong>
                </div>
              </div>
              <div class="col-sm-6">
                <div class="metric-box">
                  <span>Renta mensual</span>
                  <strong>{{ Number(contract.rent_price).toFixed(2) }} €</strong>
                </div>
              </div>
              <div class="col-sm-6">
                <div class="metric-box">
                  <span>Fianza</span>
                  <strong>{{ contract.deposit ? `${Number(contract.deposit).toFixed(2)} €` : 'Sin fianza' }}</strong>
                </div>
              </div>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-outline-success btn-sm" type="button" @click="editContract(contract)">Editar</button>
              <button class="btn btn-outline-danger btn-sm" type="button" @click="deleteContract(contract.id)">Borrar</button>
            </div>
          </div>
        </article>
      </div>
    </div>
    </template>
  </main>
</template>

<style scoped>
.metric-box {
  height: 100%;
  padding: 12px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.metric-box span {
  display: block;
  color: var(--color-muted);
  font-size: 0.82rem;
  font-weight: 700;
}

.metric-box strong {
  display: block;
  margin-top: 4px;
}

.contract-active {
  color: #0f5132;
  background: #d1e7dd;
}

.contract-finished {
  color: #084298;
  background: #cfe2ff;
}

.contract-cancelled {
  color: #842029;
  background: #f8d7da;
}
</style>
