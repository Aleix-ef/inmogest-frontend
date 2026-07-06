<script setup>
import { useDataStore } from '@/stores/data'
import { getErrorMessage } from '@/utils/forms'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

const dataStore = useDataStore()
const { paymentAlerts } = storeToRefs(dataStore)
const loading = ref(true)
const error = ref('')
const statusFilter = ref('')
const search = ref('')

const statusLabels = {
  paid: 'Pagado',
  pending: 'Pendiente',
  overdue: 'Atrasado',
}

const statusBadges = {
  paid: 'text-bg-success',
  pending: 'text-bg-warning',
  overdue: 'text-bg-danger',
}

const alerts = computed(() => paymentAlerts.value ?? {
  summary: {
    paid: 0,
    pending: 0,
    overdue: 0,
    expected_amount: 0,
    paid_amount: 0,
    pending_amount: 0,
    expiring_contracts: 0,
  },
  items: [],
  expiring_contracts: [],
})

const filteredItems = computed(() =>
  alerts.value.items.filter((item) => {
    const tenantNames = item.tenants?.map((tenant) => tenant.name).join(' ') ?? ''
    const searchText = [
      item.property?.title,
      tenantNames,
      statusLabels[item.status],
      item.due_date,
    ].join(' ').toLowerCase()
    const matchesSearch = searchText.includes(search.value.toLowerCase())
    const matchesStatus = !statusFilter.value || item.status === statusFilter.value

    return matchesSearch && matchesStatus
  }),
)

const tenantLabel = (tenants = []) => tenants.map((tenant) => tenant.name).join(', ') || 'Sin inquilinos'

const formatMoney = (amount) => `${Number(amount).toFixed(2)} €`

onMounted(async () => {
  try {
    await dataStore.fetchPaymentAlerts()
  } catch (requestError) {
    error.value = getErrorMessage(requestError, 'No se pudo cargar el control de cobros.')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="collections-page">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
      <div>
        <h1 class="mb-1">Cobros</h1>
        <p class="text-secondary mb-0">Control mensual de alquileres esperados, pagos pendientes y contratos próximos a vencer.</p>
      </div>
      <RouterLink class="btn btn-success" to="/payments">Registrar pago</RouterLink>
    </div>

    <p v-if="loading" class="alert alert-info mb-0">Cargando cobros...</p>
    <p v-else-if="error" class="alert alert-danger mb-0">{{ error }}</p>

    <template v-else>
      <section class="row g-3">
        <div class="col-sm-6 col-xl-3">
          <article class="summary-card">
            <span class="badge text-bg-success mb-3">Pagados</span>
            <strong>{{ alerts.summary.paid }}</strong>
            <small>{{ formatMoney(alerts.summary.paid_amount) }} cobrados</small>
          </article>
        </div>
        <div class="col-sm-6 col-xl-3">
          <article class="summary-card">
            <span class="badge text-bg-warning mb-3">Pendientes</span>
            <strong>{{ alerts.summary.pending }}</strong>
            <small>todavía dentro de plazo</small>
          </article>
        </div>
        <div class="col-sm-6 col-xl-3">
          <article class="summary-card">
            <span class="badge text-bg-danger mb-3">Atrasados</span>
            <strong>{{ alerts.summary.overdue }}</strong>
            <small>{{ formatMoney(alerts.summary.pending_amount) }} por cobrar</small>
          </article>
        </div>
        <div class="col-sm-6 col-xl-3">
          <article class="summary-card">
            <span class="badge text-bg-info mb-3">Vencimientos</span>
            <strong>{{ alerts.summary.expiring_contracts }}</strong>
            <small>contratos en próximos 60 días</small>
          </article>
        </div>
      </section>

      <section class="filter-bar">
        <input v-model="search" class="form-control" type="search" placeholder="Buscar por propiedad, inquilino o fecha" />
        <select v-model="statusFilter" class="form-select">
          <option value="">Todos los estados</option>
          <option value="paid">Pagados</option>
          <option value="pending">Pendientes</option>
          <option value="overdue">Atrasados</option>
        </select>
      </section>

      <section class="row g-3">
        <div class="col-xl-8">
          <article class="dashboard-panel h-100">
            <div class="d-flex justify-content-between gap-3 mb-3">
              <div>
                <h2 class="h5 mb-1">Cobros del mes</h2>
                <p class="text-secondary mb-0">Mes {{ alerts.month }} · {{ formatMoney(alerts.summary.expected_amount) }} esperados</p>
              </div>
              <span class="badge text-bg-secondary align-self-start">{{ filteredItems.length }} contratos</span>
            </div>

            <div class="table-responsive">
              <table class="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Propiedad</th>
                    <th>Inquilinos</th>
                    <th>Vence</th>
                    <th>Estado</th>
                    <th class="text-end">Pagado</th>
                    <th class="text-end">Pendiente</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in filteredItems" :key="item.contract_id">
                    <td>{{ item.property?.title ?? 'Propiedad sin título' }}</td>
                    <td>{{ tenantLabel(item.tenants) }}</td>
                    <td>{{ item.due_date }}</td>
                    <td><span class="badge" :class="statusBadges[item.status]">{{ statusLabels[item.status] }}</span></td>
                    <td class="text-end">{{ formatMoney(item.paid_amount) }}</td>
                    <td class="text-end fw-semibold">{{ formatMoney(item.pending_amount) }}</td>
                  </tr>
                  <tr v-if="filteredItems.length === 0">
                    <td colspan="6" class="text-secondary">No hay cobros con esos filtros.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <div class="col-xl-4">
          <article class="dashboard-panel h-100">
            <h2 class="h5 mb-3">Contratos próximos a vencer</h2>
            <ul class="alert-list">
              <li v-for="contract in alerts.expiring_contracts" :key="contract.contract_id">
                <span>
                  <strong>{{ contract.property?.title ?? 'Propiedad sin título' }}</strong>
                  <small>{{ tenantLabel(contract.tenants) }} · vence {{ contract.end_date }}</small>
                </span>
                <strong>{{ formatMoney(contract.rent_price) }}</strong>
              </li>
              <li v-if="alerts.expiring_contracts.length === 0" class="text-secondary">No hay vencimientos cercanos.</li>
            </ul>
          </article>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.collections-page {
  gap: 20px;
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

.summary-card small,
.alert-list small {
  color: var(--color-muted);
  font-weight: 700;
}

.alert-list {
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.alert-list li {
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--color-surface-muted);
  border-radius: 8px;
}

.alert-list span {
  display: grid;
}

@media (max-width: 760px) {
  .alert-list li {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
