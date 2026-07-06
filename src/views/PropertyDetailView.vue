<script setup>
import { useDataStore } from '@/stores/data'
import { getErrorMessage } from '@/utils/forms'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()
const dataStore = useDataStore()
const { properties, tenants, contracts, payments, propertyExpenses, documents } = storeToRefs(dataStore)
const loading = ref(true)
const error = ref('')
const activeTab = ref('summary')
const quickAction = ref('')
const quickError = ref('')
const quickLoading = ref(false)
const documentFile = ref(null)

const propertyId = computed(() => Number(route.params.id))
const property = computed(() => properties.value.find((currentProperty) => currentProperty.id === propertyId.value))

const propertyContracts = computed(() =>
  contracts.value.filter((contract) => contract.property_id === propertyId.value),
)

const propertyContractIds = computed(() => propertyContracts.value.map((contract) => contract.id))

const propertyPayments = computed(() =>
  payments.value.filter((payment) => propertyContractIds.value.includes(payment.contract_id)),
)

const propertyExpenseRows = computed(() =>
  propertyExpenses.value.filter((expense) => expense.property_id === propertyId.value),
)

const propertyDocuments = computed(() =>
  documents.value.filter((document) =>
    document.property_id === propertyId.value
    || propertyContractIds.value.includes(document.contract_id),
  ),
)

const propertyTenants = computed(() =>
  tenants.value.filter((tenant) =>
    tenant.properties?.some((tenantProperty) => tenantProperty.id === propertyId.value)
    || propertyContracts.value.some((contract) =>
      contract.tenants?.some((contractTenant) => contractTenant.id === tenant.id),
    ),
  ),
)

const activeContract = computed(() =>
  propertyContracts.value.find((contract) => contract.status === 'active'),
)

const currentDate = () => new Date().toISOString().slice(0, 10)

const emptyPaymentForm = () => ({
  contract_id: activeContract.value?.id ?? propertyContracts.value[0]?.id ?? '',
  amount: activeContract.value?.rent_price ?? property.value?.price ?? '',
  payment_date: currentDate(),
  method: 'transfer',
  notes: '',
})

const emptyExpenseForm = () => ({
  name: '',
  category: 'other',
  amount: '',
  expense_date: currentDate(),
  is_recurring: false,
  recurrence_frequency: 'monthly',
  notes: '',
})

const emptyDocumentForm = () => ({
  name: '',
  type: 'other',
  contract_id: '',
})

const quickPaymentForm = ref(emptyPaymentForm())
const quickExpenseForm = ref(emptyExpenseForm())
const quickDocumentForm = ref(emptyDocumentForm())

const totalIncome = computed(() =>
  propertyPayments.value.reduce((total, payment) => total + Number(payment.amount), 0),
)

const totalExpenses = computed(() =>
  propertyExpenseRows.value.reduce((total, expense) => total + Number(expense.amount), 0),
)

const netProfit = computed(() => totalIncome.value - totalExpenses.value)

const latestActivity = computed(() => [
  ...propertyPayments.value.map((payment) => ({
    id: `payment-${payment.id}`,
    date: payment.payment_date,
    label: 'Pago',
    title: `${Number(payment.amount).toFixed(2)} €`,
    detail: payment.notes || 'Sin notas',
    tone: 'success',
  })),
  ...propertyExpenseRows.value.map((expense) => ({
    id: `expense-${expense.id}`,
    date: expense.expense_date,
    label: 'Gasto',
    title: `${Number(expense.amount).toFixed(2)} €`,
    detail: expense.name,
    tone: 'danger',
  })),
]
  .sort((first, second) => new Date(second.date) - new Date(first.date))
  .slice(0, 6))

const statusLabels = {
  available: 'Disponible',
  rented: 'Alquilada',
  maintenance: 'Mantenimiento',
}

const contractStatusLabels = {
  active: 'Activo',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
}

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

const documentTypes = {
  contract: 'Contrato',
  invoice: 'Factura',
  dni: 'DNI',
  other: 'Otro',
}

const methodLabels = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  bizum: 'Bizum',
}

const tabs = [
  { id: 'summary', label: 'Resumen' },
  { id: 'tenants', label: 'Inquilinos' },
  { id: 'contracts', label: 'Contratos' },
  { id: 'payments', label: 'Cobros' },
  { id: 'expenses', label: 'Gastos' },
  { id: 'documents', label: 'Documentos' },
]

const openQuickAction = (action) => {
  quickAction.value = action
  quickError.value = ''
  documentFile.value = null
  quickPaymentForm.value = emptyPaymentForm()
  quickExpenseForm.value = emptyExpenseForm()
  quickDocumentForm.value = emptyDocumentForm()
}

const closeQuickAction = () => {
  quickAction.value = ''
  quickError.value = ''
  documentFile.value = null
}

const saveQuickPayment = async () => {
  quickError.value = ''

  if (!quickPaymentForm.value.contract_id) {
    quickError.value = 'Esta propiedad no tiene contratos. Crea o vincula un contrato antes de registrar cobros.'
    return
  }

  if (!quickPaymentForm.value.amount || Number(quickPaymentForm.value.amount) < 0) {
    quickError.value = 'El importe del cobro es obligatorio.'
    return
  }

  quickLoading.value = true

  try {
    await dataStore.createPayment({
      ...quickPaymentForm.value,
      contract_id: Number(quickPaymentForm.value.contract_id),
      amount: Number(quickPaymentForm.value.amount),
    })
    activeTab.value = 'payments'
    closeQuickAction()
  } catch (requestError) {
    quickError.value = getErrorMessage(requestError, 'No se pudo crear el cobro.')
  } finally {
    quickLoading.value = false
  }
}

const saveQuickExpense = async () => {
  quickError.value = ''

  if (!quickExpenseForm.value.name.trim()) {
    quickError.value = 'El nombre del gasto es obligatorio.'
    return
  }

  if (!quickExpenseForm.value.amount || Number(quickExpenseForm.value.amount) < 0) {
    quickError.value = 'El importe del gasto es obligatorio.'
    return
  }

  quickLoading.value = true

  try {
    await dataStore.createPropertyExpense({
      ...quickExpenseForm.value,
      property_id: propertyId.value,
      amount: Number(quickExpenseForm.value.amount),
      is_recurring: Boolean(quickExpenseForm.value.is_recurring),
      recurrence_frequency: quickExpenseForm.value.is_recurring ? quickExpenseForm.value.recurrence_frequency : null,
    })
    activeTab.value = 'expenses'
    closeQuickAction()
  } catch (requestError) {
    quickError.value = getErrorMessage(requestError, 'No se pudo crear el gasto.')
  } finally {
    quickLoading.value = false
  }
}

const saveQuickDocument = async () => {
  quickError.value = ''

  if (!documentFile.value) {
    quickError.value = 'Selecciona un archivo.'
    return
  }

  quickLoading.value = true

  const payload = new FormData()

  payload.append('property_id', propertyId.value)
  payload.append('type', quickDocumentForm.value.type || 'other')
  payload.append('file', documentFile.value)

  if (quickDocumentForm.value.name) {
    payload.append('name', quickDocumentForm.value.name)
  }

  if (quickDocumentForm.value.contract_id) {
    payload.append('contract_id', quickDocumentForm.value.contract_id)
  }

  try {
    await dataStore.createDocument(payload)
    activeTab.value = 'documents'
    closeQuickAction()
  } catch (requestError) {
    quickError.value = getErrorMessage(requestError, 'No se pudo subir el documento.')
  } finally {
    quickLoading.value = false
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      dataStore.fetchProperties(),
      dataStore.fetchTenants(),
      dataStore.fetchContracts(),
      dataStore.fetchPayments(),
      dataStore.fetchPropertyExpenses(),
      dataStore.fetchDocuments(),
    ])
  } catch (requestError) {
    error.value = getErrorMessage(requestError, 'No se pudo cargar la propiedad.')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main>
    <RouterLink class="btn btn-outline-secondary btn-sm align-self-start" to="/properties">Volver a propiedades</RouterLink>

    <p v-if="loading" class="alert alert-info mb-0">Cargando propiedad...</p>
    <p v-else-if="error" class="alert alert-danger mb-0">{{ error }}</p>
    <p v-else-if="!property" class="alert alert-warning mb-0">No se ha encontrado la propiedad.</p>

    <template v-else>
      <section class="detail-hero">
        <div class="detail-photo">
          <img v-if="property.photo_url" :src="property.photo_url" :alt="property.title" />
          <div v-else class="detail-photo-placeholder" aria-hidden="true"></div>
        </div>
        <div class="detail-hero-content">
          <div>
            <span class="badge status-badge mb-3" :class="`status-${property.status}`">
              {{ statusLabels[property.status] ?? property.status }}
            </span>
            <h1 class="mb-2">{{ property.title }}</h1>
            <p class="text-secondary mb-0">{{ property.address }}</p>
          </div>
          <div class="hero-price">
            <span>Alquiler</span>
            <strong>{{ Number(property.price).toFixed(2) }} €</strong>
          </div>
        </div>
      </section>

      <section class="row g-3">
        <div class="col-sm-6 col-xl-3">
          <article class="metric-card">
            <span>Ingresos registrados</span>
            <strong>{{ totalIncome.toFixed(2) }} €</strong>
            <small>{{ propertyPayments.length }} pagos</small>
          </article>
        </div>
        <div class="col-sm-6 col-xl-3">
          <article class="metric-card">
            <span>Gastos registrados</span>
            <strong>{{ totalExpenses.toFixed(2) }} €</strong>
            <small>{{ propertyExpenseRows.length }} gastos</small>
          </article>
        </div>
        <div class="col-sm-6 col-xl-3">
          <article class="metric-card">
            <span>Beneficio neto</span>
            <strong>{{ netProfit.toFixed(2) }} €</strong>
            <small>Ingresos menos gastos</small>
          </article>
        </div>
        <div class="col-sm-6 col-xl-3">
          <article class="metric-card">
            <span>Documentos</span>
            <strong>{{ propertyDocuments.length }}</strong>
            <small>vinculados</small>
          </article>
        </div>
      </section>

      <section class="detail-tabs" aria-label="Secciones de la propiedad">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="detail-tab"
          :class="{ active: activeTab === tab.id }"
          type="button"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </section>

      <section v-if="activeTab === 'summary'" class="row g-3">
        <div class="col-lg-5">
          <article class="detail-panel h-100">
            <h2 class="h5 mb-3">Datos generales</h2>
            <dl class="row text-secondary mb-0">
              <dt class="col-5">Metros</dt>
              <dd class="col-7">{{ property.size ?? 'Sin datos' }}</dd>
              <dt class="col-5">Habitaciones</dt>
              <dd class="col-7">{{ property.rooms ?? 'Sin datos' }}</dd>
              <dt class="col-5">Baños</dt>
              <dd class="col-7">{{ property.bathrooms ?? 'Sin datos' }}</dd>
              <dt class="col-5">Descripción</dt>
              <dd class="col-7">{{ property.description || 'Sin descripción' }}</dd>
            </dl>
          </article>
        </div>

        <div class="col-lg-7">
          <article class="detail-panel h-100">
            <div class="d-flex justify-content-between align-items-center gap-2 mb-3">
              <h2 class="h5 mb-0">Actividad reciente</h2>
              <button class="btn btn-outline-primary btn-sm" type="button" @click="activeTab = 'payments'">Ver cobros</button>
            </div>
            <ul class="detail-list">
              <li v-for="activity in latestActivity" :key="activity.id">
                <span>
                  <span class="badge me-2" :class="`text-bg-${activity.tone}`">{{ activity.label }}</span>
                  <strong>{{ activity.title }}</strong>
                  <small>{{ activity.date }} · {{ activity.detail }}</small>
                </span>
              </li>
              <li v-if="latestActivity.length === 0" class="text-secondary">No hay actividad financiera reciente.</li>
            </ul>
          </article>
        </div>
      </section>

      <section v-if="activeTab === 'tenants'" class="detail-panel">
        <div class="d-flex justify-content-between align-items-center gap-2 mb-3">
          <h2 class="h5 mb-0">Inquilinos vinculados</h2>
          <RouterLink class="btn btn-outline-secondary btn-sm" to="/tenants">Gestionar inquilinos</RouterLink>
        </div>
        <ul class="detail-list">
          <li v-for="tenant in propertyTenants" :key="tenant.id">
            <span>
              <strong>{{ tenant.name }}</strong>
              <small>{{ tenant.email }} · {{ tenant.phone || 'Sin teléfono' }}</small>
            </span>
          </li>
          <li v-if="propertyTenants.length === 0" class="text-secondary">No hay inquilinos vinculados.</li>
        </ul>
      </section>

      <section v-if="activeTab === 'contracts'" class="detail-panel">
        <div class="d-flex justify-content-between align-items-center gap-2 mb-3">
          <h2 class="h5 mb-0">Contratos</h2>
          <RouterLink class="btn btn-outline-secondary btn-sm" to="/contracts">Gestionar contratos</RouterLink>
        </div>
        <ul class="detail-list">
          <li v-for="contract in propertyContracts" :key="contract.id">
            <span>
              <strong>{{ Number(contract.rent_price).toFixed(2) }} €</strong>
              <small>
                {{ contract.start_date }} - {{ contract.end_date || 'Sin fin' }}
                · {{ contractStatusLabels[contract.status] ?? contract.status }}
              </small>
            </span>
            <span class="text-secondary">{{ contract.tenants?.map((tenant) => tenant.name).join(', ') || 'Sin inquilinos' }}</span>
          </li>
          <li v-if="propertyContracts.length === 0" class="text-secondary">No hay contratos vinculados.</li>
        </ul>
      </section>

      <section v-if="activeTab === 'payments'" class="detail-panel">
        <div class="d-flex justify-content-between align-items-center gap-2 mb-3">
          <h2 class="h5 mb-0">Cobros registrados</h2>
          <div class="d-flex flex-wrap gap-2">
            <button class="btn btn-success btn-sm" type="button" @click="openQuickAction('payment')">Añadir cobro</button>
            <RouterLink class="btn btn-outline-secondary btn-sm" to="/payments">Gestionar pagos</RouterLink>
          </div>
        </div>
        <ul class="detail-list">
          <li v-for="payment in propertyPayments" :key="payment.id">
            <span>
              <strong>{{ Number(payment.amount).toFixed(2) }} €</strong>
              <small>{{ payment.payment_date }} · {{ payment.method || 'Sin método' }}</small>
            </span>
            <span class="text-secondary">{{ payment.notes || 'Sin notas' }}</span>
          </li>
          <li v-if="propertyPayments.length === 0" class="text-secondary">No hay cobros registrados.</li>
        </ul>
      </section>

      <section v-if="activeTab === 'expenses'" class="detail-panel">
        <div class="d-flex justify-content-between align-items-center gap-2 mb-3">
          <h2 class="h5 mb-0">Gastos</h2>
          <div class="d-flex flex-wrap gap-2">
            <button class="btn btn-success btn-sm" type="button" @click="openQuickAction('expense')">Añadir gasto</button>
            <RouterLink class="btn btn-outline-secondary btn-sm" to="/expenses">Gestionar gastos</RouterLink>
          </div>
        </div>
        <ul class="detail-list">
          <li v-for="expense in propertyExpenseRows" :key="expense.id">
            <span>
              <strong>{{ expense.name }}</strong>
              <small>{{ categoryLabels[expense.category] ?? expense.category }} · {{ expense.expense_date }}</small>
            </span>
            <strong>{{ Number(expense.amount).toFixed(2) }} €</strong>
          </li>
          <li v-if="propertyExpenseRows.length === 0" class="text-secondary">No hay gastos registrados.</li>
        </ul>
      </section>

      <section v-if="activeTab === 'documents'" class="detail-panel">
        <div class="d-flex justify-content-between align-items-center gap-2 mb-3">
          <h2 class="h5 mb-0">Documentos</h2>
          <div class="d-flex flex-wrap gap-2">
            <button class="btn btn-success btn-sm" type="button" @click="openQuickAction('document')">Subir documento</button>
            <RouterLink class="btn btn-outline-secondary btn-sm" to="/documents">Gestionar documentos</RouterLink>
          </div>
        </div>
        <ul class="detail-list">
          <li v-for="document in propertyDocuments" :key="document.id">
            <span>
              <strong>{{ document.name }}</strong>
              <small>{{ document.type || 'Sin tipo' }} · {{ document.file_path ? 'Con archivo' : 'Sin archivo' }}</small>
            </span>
          </li>
          <li v-if="propertyDocuments.length === 0" class="text-secondary">No hay documentos vinculados.</li>
        </ul>
      </section>

      <div v-if="quickAction" class="quick-modal-backdrop" @click.self="closeQuickAction">
        <section class="quick-modal" role="dialog" aria-modal="true">
          <header class="quick-modal-header">
            <div>
              <span class="text-secondary small text-uppercase fw-bold">{{ property.title }}</span>
              <h2 v-if="quickAction === 'payment'" class="h4 mb-0">Añadir cobro</h2>
              <h2 v-if="quickAction === 'expense'" class="h4 mb-0">Añadir gasto</h2>
              <h2 v-if="quickAction === 'document'" class="h4 mb-0">Subir documento</h2>
            </div>
            <button class="btn btn-outline-secondary btn-sm" type="button" @click="closeQuickAction">Cerrar</button>
          </header>

          <p v-if="quickError" class="alert alert-danger mb-0">{{ quickError }}</p>

          <form v-if="quickAction === 'payment'" class="quick-form" @submit.prevent="saveQuickPayment">
            <div class="form-field">
              <label for="quick-contract">Contrato</label>
              <select id="quick-contract" v-model="quickPaymentForm.contract_id">
                <option value="">Selecciona un contrato</option>
                <option v-for="contract in propertyContracts" :key="contract.id" :value="contract.id">
                  {{ contract.start_date }} - {{ contract.end_date || 'Sin fin' }}
                </option>
              </select>
            </div>
            <div class="quick-grid">
              <div class="form-field">
                <label for="quick-payment-amount">Importe</label>
                <input id="quick-payment-amount" v-model="quickPaymentForm.amount" type="number" step="0.01" />
              </div>
              <div class="form-field">
                <label for="quick-payment-date">Fecha</label>
                <input id="quick-payment-date" v-model="quickPaymentForm.payment_date" type="date" />
              </div>
            </div>
            <div class="form-field">
              <label for="quick-payment-method">Método</label>
              <select id="quick-payment-method" v-model="quickPaymentForm.method">
                <option v-for="(label, value) in methodLabels" :key="value" :value="value">{{ label }}</option>
              </select>
            </div>
            <div class="form-field">
              <label for="quick-payment-notes">Notas</label>
              <textarea id="quick-payment-notes" v-model="quickPaymentForm.notes"></textarea>
            </div>
            <footer class="quick-modal-footer">
              <button class="btn btn-outline-secondary" type="button" @click="closeQuickAction">Cancelar</button>
              <button class="btn btn-success" type="submit" :disabled="quickLoading">
                {{ quickLoading ? 'Guardando...' : 'Guardar cobro' }}
              </button>
            </footer>
          </form>

          <form v-if="quickAction === 'expense'" class="quick-form" @submit.prevent="saveQuickExpense">
            <div class="form-field">
              <label for="quick-expense-name">Nombre</label>
              <input id="quick-expense-name" v-model="quickExpenseForm.name" type="text" />
            </div>
            <div class="quick-grid">
              <div class="form-field">
                <label for="quick-expense-category">Categoría</label>
                <select id="quick-expense-category" v-model="quickExpenseForm.category">
                  <option v-for="(label, value) in categoryLabels" :key="value" :value="value">{{ label }}</option>
                </select>
              </div>
              <div class="form-field">
                <label for="quick-expense-amount">Importe</label>
                <input id="quick-expense-amount" v-model="quickExpenseForm.amount" type="number" step="0.01" />
              </div>
            </div>
            <div class="form-field">
              <label for="quick-expense-date">Fecha</label>
              <input id="quick-expense-date" v-model="quickExpenseForm.expense_date" type="date" />
            </div>
            <label class="form-check d-flex align-items-center gap-2">
              <input v-model="quickExpenseForm.is_recurring" class="form-check-input" type="checkbox" />
              <span class="form-check-label">Gasto recurrente</span>
            </label>
            <div v-if="quickExpenseForm.is_recurring" class="form-field">
              <label for="quick-expense-frequency">Periodicidad</label>
              <select id="quick-expense-frequency" v-model="quickExpenseForm.recurrence_frequency">
                <option value="monthly">Mensual</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
            <div class="form-field">
              <label for="quick-expense-notes">Notas</label>
              <textarea id="quick-expense-notes" v-model="quickExpenseForm.notes"></textarea>
            </div>
            <footer class="quick-modal-footer">
              <button class="btn btn-outline-secondary" type="button" @click="closeQuickAction">Cancelar</button>
              <button class="btn btn-success" type="submit" :disabled="quickLoading">
                {{ quickLoading ? 'Guardando...' : 'Guardar gasto' }}
              </button>
            </footer>
          </form>

          <form v-if="quickAction === 'document'" class="quick-form" @submit.prevent="saveQuickDocument">
            <div class="form-field">
              <label for="quick-document-name">Nombre</label>
              <input id="quick-document-name" v-model="quickDocumentForm.name" type="text" placeholder="Si lo dejas vacío se usará el nombre del archivo" />
            </div>
            <div class="quick-grid">
              <div class="form-field">
                <label for="quick-document-type">Tipo</label>
                <select id="quick-document-type" v-model="quickDocumentForm.type">
                  <option v-for="(label, value) in documentTypes" :key="value" :value="value">{{ label }}</option>
                </select>
              </div>
              <div class="form-field">
                <label for="quick-document-contract">Contrato</label>
                <select id="quick-document-contract" v-model="quickDocumentForm.contract_id">
                  <option value="">Sin contrato concreto</option>
                  <option v-for="contract in propertyContracts" :key="contract.id" :value="contract.id">
                    {{ contract.start_date }} - {{ contract.end_date || 'Sin fin' }}
                  </option>
                </select>
              </div>
            </div>
            <div class="form-field">
              <label for="quick-document-file">Archivo</label>
              <input id="quick-document-file" type="file" @change="documentFile = $event.target.files?.[0] ?? null" />
            </div>
            <footer class="quick-modal-footer">
              <button class="btn btn-outline-secondary" type="button" @click="closeQuickAction">Cancelar</button>
              <button class="btn btn-success" type="submit" :disabled="quickLoading">
                {{ quickLoading ? 'Subiendo...' : 'Subir documento' }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </template>
  </main>
</template>

<style scoped>
.detail-hero {
  display: grid;
  grid-template-columns: minmax(220px, 340px) minmax(0, 1fr);
  gap: 18px;
  padding: 22px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.detail-photo {
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: #172033;
  border-radius: 8px;
}

.detail-photo img,
.detail-photo-placeholder {
  width: 100%;
  height: 100%;
}

.detail-photo img {
  object-fit: cover;
}

.detail-photo-placeholder {
  background:
    linear-gradient(135deg, rgb(13 110 253 / 0.2), transparent 42%),
    linear-gradient(180deg, #1f2f4a 0%, #172033 60%, #101827 100%);
}

.detail-hero-content {
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
}

.hero-price,
.metric-card,
.detail-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: var(--shadow-panel);
}

.hero-price {
  display: grid;
  min-width: 155px;
  padding: 16px;
  text-align: center;
}

.hero-price span,
.metric-card span,
.metric-card small,
.detail-list small {
  color: var(--color-muted);
  font-weight: 700;
}

.hero-price strong,
.metric-card strong {
  font-size: 1.7rem;
  line-height: 1.1;
}

.metric-card,
.detail-panel {
  padding: 18px;
}

.metric-card {
  display: grid;
  gap: 5px;
}

.detail-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: var(--shadow-panel);
}

.detail-tab {
  padding: 8px 12px;
  color: var(--color-muted);
  background: transparent;
  border: 0;
  border-radius: 6px;
  font-weight: 800;
}

.detail-tab:hover,
.detail-tab.active {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary), var(--color-surface) 88%);
}

.quick-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1050;
  display: grid;
  place-items: center;
  padding: 22px;
  background: rgb(15 23 42 / 0.58);
}

.quick-modal {
  display: grid;
  gap: 16px;
  width: min(720px, 100%);
  max-height: min(92vh, 860px);
  padding: 20px;
  overflow: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 28px 70px rgb(15 23 42 / 0.32);
}

.quick-modal-header,
.quick-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.quick-form {
  display: grid;
  gap: 14px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.detail-list {
  display: grid;
  gap: 12px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.detail-list li {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.detail-list li:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.detail-list span {
  display: grid;
  gap: 2px;
}

.status-badge {
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

@media (max-width: 700px) {
  .detail-hero {
    grid-template-columns: 1fr;
  }

  .detail-hero-content {
    align-items: stretch;
    flex-direction: column;
  }

  .hero-price {
    text-align: left;
  }

  .quick-modal-header,
  .quick-modal-footer,
  .quick-grid {
    grid-template-columns: 1fr;
  }

  .quick-modal-header,
  .quick-modal-footer {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
