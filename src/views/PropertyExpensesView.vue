<script setup>
import { useDataStore } from '@/stores/data'
import { getErrorMessage, requiredNumber } from '@/utils/forms'
import { storeToRefs } from 'pinia'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { computed, onMounted, ref } from 'vue'
import * as yup from 'yup'

const dataStore = useDataStore()
const { properties, propertyExpenses } = storeToRefs(dataStore)
const loading = ref(true)
const error = ref('')
const formError = ref('')
const editId = ref(null)
const formKey = ref(0)
const search = ref('')
const categoryFilter = ref('')

const categoryLabels = {
  community: 'Comunidad',
  ibi: 'IBI',
  insurance: 'Seguro',
  repair: 'Reparación',
  maintenance: 'Mantenimiento',
  utilities: 'Suministros',
  cleaning: 'Limpieza',
  management: 'Gestoría',
  other: 'Otros',
}

const emptyForm = () => ({
  property_id: '',
  name: '',
  category: 'other',
  amount: '',
  expense_date: '',
  is_recurring: false,
  recurrence_frequency: 'monthly',
  notes: '',
})

const form = ref(emptyForm())

const expenseSchema = yup.object({
  property_id: yup
    .string()
    .required('Selecciona una propiedad'),
  name: yup
    .string()
    .required('El nombre es obligatorio')
    .max(255, 'El nombre no puede superar 255 caracteres'),
  category: yup
    .string()
    .required('La categoría es obligatoria')
    .oneOf(Object.keys(categoryLabels), 'La categoría no es válida'),
  amount: requiredNumber(
    'El importe es obligatorio',
    'El importe debe ser un número',
    'El importe debe ser mayor o igual que 0',
  ),
  expense_date: yup
    .string()
    .required('La fecha del gasto es obligatoria'),
  is_recurring: yup
    .boolean(),
  recurrence_frequency: yup
    .string()
    .nullable()
    .oneOf(['monthly', 'yearly'], 'La periodicidad no es válida'),
  notes: yup
    .string()
    .nullable(),
})

const currentFormKey = computed(() => editId.value ? `edit-${editId.value}` : `create-${formKey.value}`)

const propertyLabel = (property) => property?.title ?? `Propiedad ${property?.id ?? ''}`

const filteredExpenses = computed(() =>
  propertyExpenses.value.filter((expense) => {
    const searchText = [
      expense.name,
      expense.property?.title,
      expense.expense_date,
      expense.notes,
      categoryLabels[expense.category] ?? expense.category,
    ].join(' ').toLowerCase()
    const matchesSearch = searchText.includes(search.value.toLowerCase())
    const matchesCategory = !categoryFilter.value || expense.category === categoryFilter.value

    return matchesSearch && matchesCategory
  }),
)

const totalExpenses = computed(() =>
  filteredExpenses.value.reduce((total, expense) => total + Number(expense.amount), 0),
)

const scrollToForm = () => window.scrollTo({ top: 0, behavior: 'smooth' })

const editExpense = (expense) => {
  form.value = {
    property_id: expense.property_id ?? '',
    name: expense.name ?? '',
    category: expense.category ?? 'other',
    amount: expense.amount ?? '',
    expense_date: expense.expense_date ?? '',
    is_recurring: Boolean(expense.is_recurring),
    recurrence_frequency: expense.recurrence_frequency ?? 'monthly',
    notes: expense.notes ?? '',
  }
  editId.value = expense.id
  formError.value = ''
  scrollToForm()
}

const cancelEdit = () => {
  form.value = emptyForm()
  editId.value = null
  formKey.value += 1
  formError.value = ''
}

const saveExpense = async (values) => {
  formError.value = ''

  const payload = {
    ...values,
    property_id: Number(values.property_id),
    amount: Number(values.amount),
    is_recurring: Boolean(values.is_recurring),
    recurrence_frequency: values.is_recurring ? values.recurrence_frequency : null,
  }

  try {
    if (editId.value) {
      await dataStore.updatePropertyExpense(editId.value, payload)
      editId.value = null
    } else {
      await dataStore.createPropertyExpense(payload)
    }

    form.value = emptyForm()
    formKey.value += 1
    formError.value = ''
  } catch (requestError) {
    formError.value = getErrorMessage(
      requestError,
      editId.value ? 'No se pudo editar el gasto.' : 'No se pudo crear el gasto.',
    )
  }
}

const deleteExpense = async (id) => {
  formError.value = ''

  const confirmed = await dataStore.confirm({
    title: 'Borrar gasto',
    message: '¿Seguro que quieres borrar este gasto?',
    confirmText: 'Borrar',
  })

  if (!confirmed) {
    return
  }

  try {
    await dataStore.deletePropertyExpense(id)

    if (editId.value === id) {
      cancelEdit()
    }
  } catch (requestError) {
    formError.value = getErrorMessage(requestError, 'No se pudo borrar el gasto.')
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      dataStore.fetchProperties(),
      dataStore.fetchPropertyExpenses(),
    ])
  } catch (requestError) {
    error.value = getErrorMessage(requestError, 'No se pudieron cargar los gastos.')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main>
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
      <div>
        <h1 class="mb-1">Gastos</h1>
        <p class="text-secondary mb-0">Controla costes asociados a cada propiedad y calcula beneficio real.</p>
      </div>
      <span class="badge text-bg-danger fs-6">{{ propertyExpenses.length }} gastos</span>
    </div>

    <Form
      class="card-form"
      :key="currentFormKey"
      :initial-values="form"
      :validation-schema="expenseSchema"
      @submit="saveExpense"
    >
      <h2>{{ editId ? 'Editar gasto' : 'Crear gasto' }}</h2>

      <div class="form-field">
        <label for="property">Propiedad</label>
        <Field id="property" name="property_id" as="select">
          <option value="">Selecciona una propiedad</option>
          <option v-for="property in properties" :key="property.id" :value="property.id">
            {{ propertyLabel(property) }}
          </option>
        </Field>
        <ErrorMessage class="field-error" name="property_id" />
      </div>

      <div class="form-field">
        <label for="name">Nombre</label>
        <Field id="name" name="name" type="text" />
        <ErrorMessage class="field-error" name="name" />
      </div>

      <div class="form-field">
        <label for="category">Categoría</label>
        <Field id="category" name="category" as="select">
          <option v-for="(label, value) in categoryLabels" :key="value" :value="value">
            {{ label }}
          </option>
        </Field>
        <ErrorMessage class="field-error" name="category" />
      </div>

      <div class="form-field">
        <label for="amount">Importe</label>
        <Field id="amount" name="amount" type="number" step="0.01" />
        <ErrorMessage class="field-error" name="amount" />
      </div>

      <div class="form-field">
        <label for="expense_date">Fecha</label>
        <Field id="expense_date" name="expense_date" type="date" />
        <ErrorMessage class="field-error" name="expense_date" />
      </div>

      <label class="form-check d-flex align-items-center gap-2">
        <Field name="is_recurring" type="checkbox" :value="true" :unchecked-value="false" class="form-check-input" />
        <span class="form-check-label">Gasto recurrente</span>
      </label>

      <div class="form-field">
        <label for="recurrence_frequency">Periodicidad</label>
        <Field id="recurrence_frequency" name="recurrence_frequency" as="select">
          <option value="monthly">Mensual</option>
          <option value="yearly">Anual</option>
        </Field>
        <small class="text-secondary">Solo se usa si marcas el gasto como recurrente.</small>
        <ErrorMessage class="field-error" name="recurrence_frequency" />
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

    <p v-if="loading" class="alert alert-info mb-0">Cargando gastos...</p>
    <p v-else-if="error" class="alert alert-danger mb-0">{{ error }}</p>
    <p v-else-if="propertyExpenses.length === 0" class="alert alert-secondary mb-0">No hay gastos.</p>

    <template v-else>
      <section class="filter-bar">
        <input v-model="search" class="form-control" type="search" placeholder="Buscar por propiedad, nombre o notas" />
        <select v-model="categoryFilter" class="form-select">
          <option value="">Todas las categorías</option>
          <option v-for="(label, value) in categoryLabels" :key="value" :value="value">
            {{ label }}
          </option>
        </select>
      </section>

      <div class="alert alert-light border d-flex justify-content-between align-items-center">
        <span>Total filtrado</span>
        <strong>{{ totalExpenses.toFixed(2) }} €</strong>
      </div>

      <p v-if="filteredExpenses.length === 0" class="alert alert-secondary mb-0">No hay gastos con esos filtros.</p>

      <div v-else class="card border-0 shadow-sm">
        <div class="table-responsive">
          <table class="table align-middle mb-0">
            <thead>
              <tr>
                <th>Gasto</th>
                <th>Propiedad</th>
                <th>Categoría</th>
                <th>Fecha</th>
                <th class="text-end">Importe</th>
                <th class="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="expense in filteredExpenses" :key="expense.id">
                <td>
                  <strong>{{ expense.name }}</strong>
                  <p class="text-secondary small mb-0">{{ expense.notes || 'Sin notas' }}</p>
                </td>
                <td>{{ expense.property?.title ?? 'Sin propiedad' }}</td>
                <td>
                  <span class="badge text-bg-light">{{ categoryLabels[expense.category] ?? expense.category }}</span>
                  <span v-if="expense.is_recurring" class="badge text-bg-info ms-1">
                    {{ expense.recurrence_frequency === 'yearly' ? 'Anual' : 'Mensual' }}
                  </span>
                </td>
                <td>{{ expense.expense_date }}</td>
                <td class="text-end fw-bold">{{ Number(expense.amount).toFixed(2) }} €</td>
                <td class="text-end">
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-success" type="button" @click="editExpense(expense)">Editar</button>
                    <button class="btn btn-outline-danger" type="button" @click="deleteExpense(expense.id)">Borrar</button>
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
