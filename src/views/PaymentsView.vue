<script setup>
import { useDataStore } from '@/stores/data'
import { getErrorMessage, requiredNumber } from '@/utils/forms'
import { storeToRefs } from 'pinia'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { computed, onMounted, ref } from 'vue'
import * as yup from 'yup'

const dataStore = useDataStore()
const { contracts, payments } = storeToRefs(dataStore)
const loading = ref(true)
const error = ref('')
const formError = ref('')
const editId = ref(null)
const formKey = ref(0)
const search = ref('')
const methodFilter = ref('')

const emptyForm = () => ({
  contract_id: '',
  amount: '',
  payment_date: '',
  method: 'cash',
  notes: '',
})

const form = ref(emptyForm())

const paymentSchema = yup.object({
  contract_id: yup
    .string()
    .required('Selecciona un contrato'),
  amount: requiredNumber(
    'El importe es obligatorio',
    'El importe debe ser un número',
    'El importe debe ser mayor o igual que 0',
  ),
  payment_date: yup
    .string()
    .required('La fecha de pago es obligatoria'),
  method: yup
    .string()
    .required('El método es obligatorio')
    .oneOf(['cash', 'transfer', 'card', 'bizum'], 'El método no es válido'),
  notes: yup
    .string()
    .nullable(),
})

const currentFormKey = computed(() => editId.value ? `edit-${editId.value}` : `create-${formKey.value}`)

const contractLabel = (contract) => {
  const property = contract.property?.title ?? `Contrato ${contract.id}`
  return `${property} - ${contract.start_date}`
}

const methodLabels = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  bizum: 'Bizum',
}

const filteredPayments = computed(() =>
  payments.value.filter((payment) => {
    const searchText = [
      payment.contract ? contractLabel(payment.contract) : '',
      payment.payment_date,
      payment.notes,
      methodLabels[payment.method] ?? payment.method,
    ].join(' ').toLowerCase()
    const matchesSearch = searchText.includes(search.value.toLowerCase())
    const matchesMethod = !methodFilter.value || payment.method === methodFilter.value

    return matchesSearch && matchesMethod
  }),
)

const scrollToForm = () => window.scrollTo({ top: 0, behavior: 'smooth' })

const editPayment = (payment) => {
  form.value = {
    contract_id: payment.contract_id ?? '',
    amount: payment.amount ?? '',
    payment_date: payment.payment_date ?? '',
    method: payment.method ?? 'cash',
    notes: payment.notes ?? '',
  }
  editId.value = payment.id
  formError.value = ''
  scrollToForm()
}

const cancelEdit = () => {
  form.value = emptyForm()
  editId.value = null
  formKey.value += 1
  formError.value = ''
}

const savePayment = async (values) => {
  formError.value = ''

  const payload = {
    ...values,
    contract_id: Number(values.contract_id),
    amount: Number(values.amount),
  }

  try {
    if (editId.value) {
      await dataStore.updatePayment(editId.value, payload)
      editId.value = null
    } else {
      await dataStore.createPayment(payload)
    }

    form.value = emptyForm()
    formKey.value += 1
    formError.value = ''
  } catch (requestError) {
    formError.value = getErrorMessage(
      requestError,
      editId.value ? 'No se pudo editar el pago.' : 'No se pudo crear el pago.',
    )
  }
}

const deletePayment = async (id) => {
  formError.value = ''

  const confirmed = await dataStore.confirm({
    title: 'Borrar pago',
    message: '¿Seguro que quieres borrar este pago?',
    confirmText: 'Borrar',
  })

  if (!confirmed) {
    return
  }

  try {
    await dataStore.deletePayment(id)

    if (editId.value === id) {
      cancelEdit()
    }
  } catch (requestError) {
    formError.value = getErrorMessage(requestError, 'No se pudo borrar el pago.')
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      dataStore.fetchContracts(),
      dataStore.fetchPayments(),
    ])
  } catch (requestError) {
    error.value = getErrorMessage(requestError, 'No se pudieron cargar los datos.')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main>
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
      <div>
        <h1 class="mb-1">Pagos</h1>
        <p class="text-secondary mb-0">Registra cobros asociados a contratos y métodos de pago.</p>
      </div>
      <span class="badge text-bg-warning fs-6">{{ payments.length }} pagos</span>
    </div>

    <Form
      class="card-form"
      :key="currentFormKey"
      :initial-values="form"
      :validation-schema="paymentSchema"
      @submit="savePayment"
    >
      <h2>{{ editId ? 'Editar pago' : 'Crear pago' }}</h2>

      <div class="form-field">
        <label for="contract">Contrato</label>
        <Field id="contract" name="contract_id" as="select">
          <option value="">Selecciona un contrato</option>
          <option v-for="contract in contracts" :key="contract.id" :value="contract.id">
            {{ contractLabel(contract) }}
          </option>
        </Field>
        <ErrorMessage class="field-error" name="contract_id" />
      </div>

      <div class="form-field">
        <label for="amount">Importe</label>
        <Field id="amount" name="amount" type="number" step="0.01" />
        <ErrorMessage class="field-error" name="amount" />
      </div>

      <div class="form-field">
        <label for="payment_date">Fecha de pago</label>
        <Field id="payment_date" name="payment_date" type="date" />
        <ErrorMessage class="field-error" name="payment_date" />
      </div>

      <div class="form-field">
        <label for="method">Método</label>
        <Field id="method" name="method" as="select">
          <option value="cash">Efectivo</option>
          <option value="transfer">Transferencia</option>
          <option value="card">Tarjeta</option>
          <option value="bizum">Bizum</option>
        </Field>
        <ErrorMessage class="field-error" name="method" />
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

    <p v-if="loading" class="alert alert-info mb-0">Cargando pagos...</p>
    <p v-else-if="error" class="alert alert-danger mb-0">{{ error }}</p>
    <p v-else-if="payments.length === 0" class="alert alert-secondary mb-0">No hay pagos.</p>

    <template v-else>
      <section class="filter-bar">
        <input v-model="search" class="form-control" type="search" placeholder="Buscar por contrato, fecha o notas" />
        <select v-model="methodFilter" class="form-select">
          <option value="">Todos los métodos</option>
          <option value="cash">Efectivo</option>
          <option value="transfer">Transferencia</option>
          <option value="card">Tarjeta</option>
          <option value="bizum">Bizum</option>
        </select>
      </section>

      <p v-if="filteredPayments.length === 0" class="alert alert-secondary mb-0">No hay pagos con esos filtros.</p>

      <div v-else class="card border-0 shadow-sm">
        <div class="table-responsive">
          <table class="table align-middle mb-0">
            <thead>
              <tr>
                <th>Contrato</th>
                <th>Fecha</th>
                <th>Método</th>
                <th class="text-end">Importe</th>
                <th class="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="payment in filteredPayments" :key="payment.id">
                <td>
                  <strong>{{ payment.contract ? contractLabel(payment.contract) : 'Sin contrato' }}</strong>
                  <p class="text-secondary small mb-0">{{ payment.notes || 'Sin notas' }}</p>
                </td>
                <td>{{ payment.payment_date }}</td>
                <td><span class="badge text-bg-light">{{ methodLabels[payment.method] ?? payment.method }}</span></td>
                <td class="text-end fw-bold">{{ Number(payment.amount).toFixed(2) }} €</td>
                <td class="text-end">
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-success" type="button" @click="editPayment(payment)">Editar</button>
                    <button class="btn btn-outline-danger" type="button" @click="deletePayment(payment.id)">Borrar</button>
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
