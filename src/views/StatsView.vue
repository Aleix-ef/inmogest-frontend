<script setup>
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'
import { getErrorMessage } from '@/utils/forms'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

const dataStore = useDataStore()
const authStore = useAuthStore()
const { properties, tenants, owners, contracts, payments, paymentAlerts, propertyExpenses, documents } = storeToRefs(dataStore)
const loading = ref(true)
const error = ref('')
const isManager = computed(() => authStore.role === 'manager')

const totalIncome = computed(() =>
  payments.value.reduce((total, payment) => total + Number(payment.amount), 0),
)

const totalExpenses = computed(() =>
  propertyExpenses.value.reduce((total, expense) => total + Number(expense.amount), 0),
)

const netProfit = computed(() => totalIncome.value - totalExpenses.value)

const collectionSummary = computed(() => paymentAlerts.value?.summary ?? {
  paid: 0,
  pending: 0,
  overdue: 0,
  expected_amount: 0,
  paid_amount: 0,
  pending_amount: 0,
  expiring_contracts: 0,
})

const activeContracts = computed(() =>
  contracts.value.filter((contract) => contract.status === 'active'),
)

const availableProperties = computed(() =>
  properties.value.filter((property) => property.status === 'available').length,
)

const rentedProperties = computed(() =>
  properties.value.filter((property) => property.status === 'rented').length,
)

const maintenanceProperties = computed(() =>
  properties.value.filter((property) => property.status === 'maintenance').length,
)

const occupancyRate = computed(() => {
  if (properties.value.length === 0) {
    return 0
  }

  return Math.round((rentedProperties.value / properties.value.length) * 100)
})

const latestPayments = computed(() =>
  [...payments.value]
    .sort((first, second) => new Date(second.payment_date) - new Date(first.payment_date))
    .slice(0, 5),
)

const latestExpenses = computed(() =>
  [...propertyExpenses.value]
    .sort((first, second) => new Date(second.expense_date) - new Date(first.expense_date))
    .slice(0, 5),
)

const latestContracts = computed(() =>
  [...contracts.value]
    .sort((first, second) => new Date(second.start_date) - new Date(first.start_date))
    .slice(0, 4),
)

const summaryCards = computed(() => [
  {
    label: 'Ingresos registrados',
    value: `${totalIncome.value.toFixed(2)} €`,
    detail: `${payments.value.length} pagos`,
    tone: 'success',
  },
  {
    label: 'Gastos registrados',
    value: `${totalExpenses.value.toFixed(2)} €`,
    detail: `${propertyExpenses.value.length} gastos`,
    tone: 'danger',
  },
  {
    label: 'Beneficio neto',
    value: `${netProfit.value.toFixed(2)} €`,
    detail: 'ingresos menos gastos',
    tone: netProfit.value >= 0 ? 'primary' : 'warning',
  },
  {
    label: 'Ocupación',
    value: `${occupancyRate.value}%`,
    detail: `${rentedProperties.value} de ${properties.value.length} propiedades`,
    tone: 'info',
  },
])

const quickLinks = computed(() => [
  { label: 'Nueva propiedad', to: '/properties' },
  { label: 'Nuevo inquilino', to: '/tenants' },
  { label: 'Nuevo contrato', to: '/contracts' },
  { label: 'Registrar pago', to: '/payments' },
  { label: 'Control de cobros', to: '/collections' },
  { label: 'Agenda', to: '/agenda' },
  { label: 'Registrar gasto', to: '/expenses' },
  { label: 'Subir documento', to: '/documents' },
  ...(isManager.value ? [{ label: 'Propietarios', to: '/owners' }] : []),
  ...(isManager.value ? [{ label: 'Usuarios', to: '/users' }] : []),
])

const propertyStatusRows = computed(() => [
  { label: 'Disponibles', value: availableProperties.value, className: 'bg-success' },
  { label: 'Alquiladas', value: rentedProperties.value, className: 'bg-primary' },
  { label: 'Mantenimiento', value: maintenanceProperties.value, className: 'bg-warning' },
])

const contractLabel = (contract) => {
  const property = contract.property?.title ?? `Contrato ${contract.id}`
  const tenantsLabel = contract.tenants?.map((tenant) => tenant.name).join(', ') || 'Sin inquilinos'

  return `${property} - ${tenantsLabel}`
}

const statusLabels = {
  active: 'Activo',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
}

const expenseCategoryLabels = {
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

onMounted(async () => {
  try {
    await Promise.all([
      dataStore.fetchProperties(),
      dataStore.fetchTenants(),
      dataStore.fetchContracts(),
      dataStore.fetchPayments(),
      dataStore.fetchPaymentAlerts(),
      dataStore.fetchPropertyExpenses(),
      dataStore.fetchDocuments(),
      isManager.value ? dataStore.fetchOwners() : Promise.resolve(),
    ])
  } catch (requestError) {
    error.value = getErrorMessage(requestError, 'No se pudo cargar el panel principal.')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="dashboard-page">
    <section class="dashboard-hero">
      <div>
        <span class="badge text-bg-success mb-3">Panel principal</span>
        <h1 class="mb-2">Resumen de InmoGest</h1>
        <p class="text-secondary mb-0">
          Revisa de un vistazo ingresos, gastos, beneficio, ocupación y accesos rápidos.
        </p>
      </div>
      <div class="hero-number">
        <span>Propiedades</span>
        <strong>{{ properties.length }}</strong>
      </div>
    </section>

    <p v-if="loading" class="alert alert-info mb-0">Cargando panel...</p>
    <p v-else-if="error" class="alert alert-danger mb-0">{{ error }}</p>

    <template v-else>
      <section class="row g-3">
        <div v-for="card in summaryCards" :key="card.label" class="col-sm-6 col-xl-3">
          <article class="summary-card">
            <span class="badge mb-3" :class="`text-bg-${card.tone}`">{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
            <small>{{ card.detail }}</small>
          </article>
        </div>
        <div v-if="isManager" class="col-sm-6 col-xl-3">
          <article class="summary-card">
            <span class="badge text-bg-dark mb-3">Propietarios</span>
            <strong>{{ owners.length }}</strong>
            <small>contactos administrados</small>
          </article>
        </div>
      </section>

      <section class="row g-3">
        <div class="col-md-4">
          <RouterLink class="alert-card alert-card-warning" to="/collections">
            <span>Pendientes este mes</span>
            <strong>{{ collectionSummary.pending }}</strong>
            <small>{{ Number(collectionSummary.pending_amount).toFixed(2) }} € por revisar</small>
          </RouterLink>
        </div>
        <div class="col-md-4">
          <RouterLink class="alert-card alert-card-danger" to="/collections">
            <span>Pagos atrasados</span>
            <strong>{{ collectionSummary.overdue }}</strong>
            <small>contratos fuera de plazo</small>
          </RouterLink>
        </div>
        <div class="col-md-4">
          <RouterLink class="alert-card alert-card-info" to="/collections">
            <span>Vencen pronto</span>
            <strong>{{ collectionSummary.expiring_contracts }}</strong>
            <small>contratos en 60 días</small>
          </RouterLink>
        </div>
      </section>

      <section class="row g-3">
        <div class="col-lg-7">
          <article class="dashboard-panel">
            <div class="d-flex justify-content-between gap-3 mb-3">
              <div>
                <h2 class="h5 mb-1">Estado de propiedades</h2>
                <p class="text-secondary mb-0">Distribución actual de la cartera.</p>
              </div>
              <strong class="occupancy-value">{{ occupancyRate }}%</strong>
            </div>

            <div class="progress-stacked property-progress mb-3">
              <div class="progress" role="progressbar" aria-label="Disponibles" :style="{ width: `${properties.length ? (availableProperties / properties.length) * 100 : 0}%` }">
                <div class="progress-bar bg-success"></div>
              </div>
              <div class="progress" role="progressbar" aria-label="Alquiladas" :style="{ width: `${properties.length ? (rentedProperties / properties.length) * 100 : 0}%` }">
                <div class="progress-bar bg-primary"></div>
              </div>
              <div class="progress" role="progressbar" aria-label="Mantenimiento" :style="{ width: `${properties.length ? (maintenanceProperties / properties.length) * 100 : 0}%` }">
                <div class="progress-bar bg-warning"></div>
              </div>
            </div>

            <div class="status-grid">
              <div v-for="row in propertyStatusRows" :key="row.label" class="status-item">
                <span class="status-dot" :class="row.className"></span>
                <span>{{ row.label }}</span>
                <strong>{{ row.value }}</strong>
              </div>
            </div>
          </article>
        </div>

        <div class="col-lg-5">
          <article class="dashboard-panel">
            <h2 class="h5 mb-3">Accesos rápidos</h2>
            <div class="quick-links">
              <RouterLink v-for="link in quickLinks" :key="link.to" class="btn btn-outline-success" :to="link.to">
                {{ link.label }}
              </RouterLink>
            </div>
          </article>
        </div>
      </section>

      <section class="row g-3">
        <div class="col-xl-4">
          <article class="dashboard-panel h-100">
            <div class="d-flex justify-content-between gap-3 mb-3">
              <h2 class="h5 mb-0">Últimos pagos</h2>
              <RouterLink class="small" to="/payments">Ver pagos</RouterLink>
            </div>
            <ul class="activity-list">
              <li v-for="payment in latestPayments" :key="payment.id">
                <span>
                  <strong>{{ payment.contract?.property?.title ?? 'Contrato sin propiedad' }}</strong>
                  <small>{{ payment.payment_date }} · {{ payment.notes || 'Sin notas' }}</small>
                </span>
                <strong>{{ Number(payment.amount).toFixed(2) }} €</strong>
              </li>
              <li v-if="latestPayments.length === 0" class="text-secondary">No hay pagos registrados.</li>
            </ul>
          </article>
        </div>

        <div class="col-xl-4">
          <article class="dashboard-panel h-100">
            <div class="d-flex justify-content-between gap-3 mb-3">
              <h2 class="h5 mb-0">Últimos gastos</h2>
              <RouterLink class="small" to="/expenses">Ver gastos</RouterLink>
            </div>
            <ul class="activity-list">
              <li v-for="expense in latestExpenses" :key="expense.id">
                <span>
                  <strong>{{ expense.property?.title ?? 'Propiedad sin título' }}</strong>
                  <small>{{ expense.expense_date }} · {{ expenseCategoryLabels[expense.category] ?? expense.category }}</small>
                </span>
                <strong>{{ Number(expense.amount).toFixed(2) }} €</strong>
              </li>
              <li v-if="latestExpenses.length === 0" class="text-secondary">No hay gastos registrados.</li>
            </ul>
          </article>
        </div>

        <div class="col-xl-4">
          <article class="dashboard-panel h-100">
            <div class="d-flex justify-content-between gap-3 mb-3">
              <h2 class="h5 mb-0">Contratos recientes</h2>
              <RouterLink class="small" to="/contracts">Ver contratos</RouterLink>
            </div>
            <ul class="activity-list">
              <li v-for="contract in latestContracts" :key="contract.id">
                <span>
                  <strong>{{ contractLabel(contract) }}</strong>
                  <small>{{ contract.start_date }} · {{ statusLabels[contract.status] ?? contract.status }}</small>
                </span>
                <strong>{{ Number(contract.rent_price).toFixed(2) }} €</strong>
              </li>
              <li v-if="latestContracts.length === 0" class="text-secondary">No hay contratos registrados.</li>
            </ul>
          </article>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.dashboard-page {
  gap: 20px;
}

.dashboard-hero {
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
  padding: 22px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 18%, transparent), transparent 58%),
    var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.hero-number {
  display: grid;
  min-width: 145px;
  padding: 16px;
  text-align: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.hero-number span,
.summary-card small,
.activity-list small {
  color: var(--color-muted);
  font-weight: 700;
}

.hero-number strong {
  font-size: 2.4rem;
  line-height: 1;
}

.summary-card,
.dashboard-panel {
  height: 100%;
  padding: 18px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: var(--shadow-panel);
}

.summary-card {
  display: grid;
  gap: 4px;
}

.summary-card strong {
  font-size: 1.8rem;
  line-height: 1.1;
}

.alert-card {
  display: grid;
  gap: 4px;
  height: 100%;
  padding: 16px;
  color: inherit;
  text-decoration: none;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-left: 5px solid var(--color-primary);
  border-radius: 8px;
  box-shadow: var(--shadow-panel);
}

.alert-card:hover {
  transform: translateY(-1px);
}

.alert-card span,
.alert-card small {
  color: var(--color-muted);
  font-weight: 700;
}

.alert-card strong {
  font-size: 1.7rem;
  line-height: 1.1;
}

.alert-card-warning {
  border-left-color: var(--bs-warning);
}

.alert-card-danger {
  border-left-color: var(--bs-danger);
}

.alert-card-info {
  border-left-color: var(--bs-info);
}

.property-progress {
  height: 18px;
  overflow: hidden;
  border-radius: 999px;
}

.occupancy-value {
  color: var(--color-primary-dark);
  font-size: 2rem;
  line-height: 1;
}

.status-grid {
  display: grid;
  gap: 10px;
}

.status-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 10px;
  background: var(--color-surface-muted);
  border-radius: 8px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.quick-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.activity-list {
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.activity-list li {
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--color-surface-muted);
  border-radius: 8px;
}

.activity-list span {
  display: grid;
}

@media (max-width: 760px) {
  .dashboard-hero {
    align-items: stretch;
    flex-direction: column;
  }

  .hero-number {
    text-align: left;
  }

  .activity-list li {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
