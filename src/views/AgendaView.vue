<script setup>
import { useDataStore } from '@/stores/data'
import { getErrorMessage } from '@/utils/forms'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

const dataStore = useDataStore()
const { agenda, properties } = storeToRefs(dataStore)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const formError = ref('')
const typeFilter = ref('')
const search = ref('')
const showDayModal = ref(false)
const showEventForm = ref(false)
const today = new Date()
const displayedMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1))
const selectedDate = ref(toDateKey(today))

const eventForm = ref(emptyEventForm(selectedDate.value))

const eventLabels = {
  payment_overdue: 'Pago atrasado',
  payment_pending: 'Cobro pendiente',
  contract_expiring: 'Contrato vence',
  recurring_expense: 'Gasto recurrente',
  manual_event: 'Recordatorio',
}

const eventBadges = {
  payment_overdue: 'text-bg-danger',
  payment_pending: 'text-bg-warning',
  contract_expiring: 'text-bg-info',
  recurring_expense: 'text-bg-secondary',
  manual_event: 'text-bg-primary',
}

const eventChipClasses = {
  payment_overdue: 'chip-danger',
  payment_pending: 'chip-warning',
  contract_expiring: 'chip-info',
  recurring_expense: 'chip-secondary',
  manual_event: 'chip-primary',
}

const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const dayHours = Array.from({ length: 14 }, (_, index) => `${String(index + 8).padStart(2, '0')}:00`)

const agendaData = computed(() => agenda.value ?? {
  summary: {
    overdue: 0,
    today: 0,
    next_7_days: 0,
    next_30_days: 0,
  },
  events: [],
})

const filteredEvents = computed(() =>
  agendaData.value.events.filter((event) => {
    const tenants = event.tenants?.map((tenant) => tenant.name).join(' ') ?? ''
    const searchText = [
      event.title,
      event.description,
      event.property?.title,
      tenants,
      event.date,
      event.start_time,
      eventLabels[event.type],
    ].join(' ').toLowerCase()
    const matchesSearch = searchText.includes(search.value.toLowerCase())
    const matchesType = !typeFilter.value || event.type === typeFilter.value

    return matchesSearch && matchesType
  }),
)

const eventsByDate = computed(() => filteredEvents.value.reduce((dates, event) => {
  dates[event.date] ??= []
  dates[event.date].push(event)
  return dates
}, {}))

const monthLabel = computed(() => new Intl.DateTimeFormat('es-ES', {
  month: 'long',
  year: 'numeric',
}).format(displayedMonth.value))

const calendarDays = computed(() => {
  const firstDay = displayedMonth.value
  const year = firstDay.getFullYear()
  const month = firstDay.getMonth()
  const firstWeekDay = (firstDay.getDay() + 6) % 7
  const startDate = new Date(year, month, 1 - firstWeekDay)
  const days = []

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)
    const key = toDateKey(date)

    days.push({
      key,
      day: date.getDate(),
      inCurrentMonth: date.getMonth() === month,
      isToday: key === toDateKey(today),
      isSelected: key === selectedDate.value,
      events: eventsByDate.value[key] ?? [],
    })
  }

  return days
})

const selectedEvents = computed(() => (eventsByDate.value[selectedDate.value] ?? [])
  .toSorted((firstEvent, secondEvent) => {
    const firstTime = firstEvent.start_time ?? '99:99'
    const secondTime = secondEvent.start_time ?? '99:99'

    return firstTime.localeCompare(secondTime)
  }))

const allDayEvents = computed(() => selectedEvents.value.filter((event) => !event.start_time))

const selectedDateLabel = computed(() => {
  if (!selectedDate.value) {
    return ''
  }

  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseDateKey(selectedDate.value))
})

function emptyEventForm(date) {
  return {
    title: '',
    property_id: '',
    event_date: date,
    start_time: '',
    end_time: '',
    description: '',
  }
}

function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)

  return new Date(year, month - 1, day)
}

function changeMonth(offset) {
  displayedMonth.value = new Date(
    displayedMonth.value.getFullYear(),
    displayedMonth.value.getMonth() + offset,
    1,
  )
  selectedDate.value = toDateKey(displayedMonth.value)
}

function goToday() {
  displayedMonth.value = new Date(today.getFullYear(), today.getMonth(), 1)
  selectedDate.value = toDateKey(today)
  openDay(selectedDate.value)
}

function openDay(dateKey) {
  selectedDate.value = dateKey
  eventForm.value = emptyEventForm(dateKey)
  formError.value = ''
  showEventForm.value = false
  showDayModal.value = true
}

function closeDayModal() {
  showDayModal.value = false
  showEventForm.value = false
  formError.value = ''
}

function eventsForHour(hour) {
  return selectedEvents.value.filter((event) => event.start_time?.startsWith(hour.slice(0, 2)))
}

function formatTimeRange(event) {
  if (!event.start_time) {
    return 'Sin hora'
  }

  return event.end_time
    ? `${event.start_time.slice(0, 5)} - ${event.end_time.slice(0, 5)}`
    : event.start_time.slice(0, 5)
}

async function saveManualEvent() {
  formError.value = ''

  if (!eventForm.value.title.trim()) {
    formError.value = 'El título es obligatorio.'
    return
  }

  saving.value = true

  const payload = {
    ...eventForm.value,
    property_id: eventForm.value.property_id ? Number(eventForm.value.property_id) : null,
    start_time: eventForm.value.start_time || null,
    end_time: eventForm.value.end_time || null,
    description: eventForm.value.description || null,
  }

  try {
    await dataStore.createAgendaEvent(payload)
    eventForm.value = emptyEventForm(selectedDate.value)
    showEventForm.value = false
  } catch (requestError) {
    formError.value = getErrorMessage(requestError, 'No se pudo crear el recordatorio.')
  } finally {
    saving.value = false
  }
}

async function deleteManualEvent(event) {
  const confirmed = await dataStore.confirm({
    title: 'Borrar recordatorio',
    message: '¿Seguro que quieres borrar este recordatorio?',
    confirmText: 'Borrar',
  })

  if (!confirmed) {
    return
  }

  try {
    await dataStore.deleteAgendaEvent(event.id)
  } catch (requestError) {
    formError.value = getErrorMessage(requestError, 'No se pudo borrar el recordatorio.')
  }
}

const eventKey = (event) => `${event.type}-${event.id ?? event.date}-${event.property?.id ?? 'none'}-${event.title}`
const tenantLabel = (tenants = []) => tenants.map((tenant) => tenant.name).join(', ') || 'Sin inquilinos'
const formatMoney = (amount) => amount === null || amount === undefined ? '' : `${Number(amount).toFixed(2)} €`

onMounted(async () => {
  try {
    await Promise.all([
      dataStore.fetchAgenda(),
      properties.value.length ? Promise.resolve() : dataStore.fetchProperties(),
    ])
  } catch (requestError) {
    error.value = getErrorMessage(requestError, 'No se pudo cargar la agenda.')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="agenda-page">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
      <div>
        <h1 class="mb-1">Agenda</h1>
        <p class="text-secondary mb-0">Próximos cobros, pagos atrasados, vencimientos y recordatorios.</p>
      </div>
      <RouterLink class="btn btn-outline-success" to="/expenses">Nuevo gasto</RouterLink>
    </div>

    <p v-if="loading" class="alert alert-info mb-0">Cargando agenda...</p>
    <p v-else-if="error" class="alert alert-danger mb-0">{{ error }}</p>

    <template v-else>
      <section class="row g-3">
        <div class="col-sm-6 col-xl-3">
          <article class="agenda-summary summary-danger">
            <span>Atrasados</span>
            <strong>{{ agendaData.summary.overdue }}</strong>
            <small>requieren revisión</small>
          </article>
        </div>
        <div class="col-sm-6 col-xl-3">
          <article class="agenda-summary summary-primary">
            <span>Hoy</span>
            <strong>{{ agendaData.summary.today }}</strong>
            <small>eventos para hoy</small>
          </article>
        </div>
        <div class="col-sm-6 col-xl-3">
          <article class="agenda-summary summary-warning">
            <span>7 días</span>
            <strong>{{ agendaData.summary.next_7_days }}</strong>
            <small>próximos eventos</small>
          </article>
        </div>
        <div class="col-sm-6 col-xl-3">
          <article class="agenda-summary summary-info">
            <span>30 días</span>
            <strong>{{ agendaData.summary.next_30_days }}</strong>
            <small>planificación mensual</small>
          </article>
        </div>
      </section>

      <section class="filter-bar">
        <input v-model="search" class="form-control" type="search" placeholder="Buscar por propiedad, inquilino o descripción" />
        <select v-model="typeFilter" class="form-select">
          <option value="">Todos los tipos</option>
          <option value="payment_overdue">Pagos atrasados</option>
          <option value="payment_pending">Cobros pendientes</option>
          <option value="contract_expiring">Contratos que vencen</option>
          <option value="recurring_expense">Gastos recurrentes</option>
          <option value="manual_event">Recordatorios</option>
        </select>
      </section>

      <p v-if="filteredEvents.length === 0" class="alert alert-secondary mb-0">No hay eventos con esos filtros.</p>

      <section class="calendar-panel">
        <div class="calendar-toolbar">
          <div>
            <span class="calendar-eyebrow">Calendario mensual</span>
            <h2 class="h3 mb-0 text-capitalize">{{ monthLabel }}</h2>
          </div>
          <div class="calendar-actions">
            <button class="btn btn-light btn-sm" type="button" @click="changeMonth(-1)">Anterior</button>
            <button class="btn btn-primary btn-sm" type="button" @click="goToday">Hoy</button>
            <button class="btn btn-light btn-sm" type="button" @click="changeMonth(1)">Siguiente</button>
          </div>
        </div>

        <div class="calendar-scroll">
          <div class="calendar-grid">
            <div v-for="dayName in weekDays" :key="dayName" class="calendar-weekday">{{ dayName }}</div>
            <button
              v-for="day in calendarDays"
              :key="day.key"
              class="calendar-day"
              :class="{ 'is-muted': !day.inCurrentMonth, 'is-today': day.isToday, 'is-selected': day.isSelected, 'has-events': day.events.length }"
              type="button"
              @click="openDay(day.key)"
            >
              <span class="day-top">
                <span class="day-number">{{ day.day }}</span>
                <span v-if="day.events.length" class="event-count">{{ day.events.length }}</span>
              </span>
              <span class="day-events">
                <span
                  v-for="event in day.events.slice(0, 3)"
                  :key="eventKey(event)"
                  class="event-chip"
                  :class="eventChipClasses[event.type]"
                >
                  {{ event.start_time ? `${event.start_time.slice(0, 5)} ` : '' }}{{ event.title }}
                </span>
                <span v-if="day.events.length > 3" class="event-more">+{{ day.events.length - 3 }} más</span>
              </span>
            </button>
          </div>
        </div>
      </section>

      <div v-if="showDayModal" class="day-modal-backdrop" @click.self="closeDayModal">
        <section class="day-modal" role="dialog" aria-modal="true" aria-labelledby="day-modal-title">
          <header class="day-modal-header">
            <div>
              <span class="calendar-eyebrow">Detalle del día</span>
              <h2 id="day-modal-title" class="h4 mb-1 text-capitalize">{{ selectedDateLabel }}</h2>
              <p class="text-secondary mb-0">{{ selectedEvents.length }} eventos y recordatorios</p>
            </div>
            <div class="day-modal-actions">
              <button class="btn btn-primary btn-sm" type="button" @click="showEventForm = !showEventForm">
                {{ showEventForm ? 'Cerrar formulario' : 'Añadir recordatorio' }}
              </button>
              <button class="btn btn-outline-secondary btn-sm" type="button" @click="closeDayModal">Cerrar</button>
            </div>
          </header>

          <p v-if="formError" class="alert alert-danger mb-0">{{ formError }}</p>

          <form v-if="showEventForm" class="day-form" @submit.prevent="saveManualEvent">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label" for="agenda-title">Título</label>
                <input id="agenda-title" v-model="eventForm.title" class="form-control" type="text" placeholder="Ej. Llamar al inquilino" />
              </div>
              <div class="col-md-6">
                <label class="form-label" for="agenda-property">Propiedad</label>
                <select id="agenda-property" v-model="eventForm.property_id" class="form-select">
                  <option value="">Sin propiedad concreta</option>
                  <option v-for="property in properties" :key="property.id" :value="property.id">
                    {{ property.title }}
                  </option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label" for="agenda-date">Fecha</label>
                <input id="agenda-date" v-model="eventForm.event_date" class="form-control" type="date" />
              </div>
              <div class="col-md-4">
                <label class="form-label" for="agenda-start">Hora inicio</label>
                <input id="agenda-start" v-model="eventForm.start_time" class="form-control" type="time" />
              </div>
              <div class="col-md-4">
                <label class="form-label" for="agenda-end">Hora fin</label>
                <input id="agenda-end" v-model="eventForm.end_time" class="form-control" type="time" />
              </div>
              <div class="col-12">
                <label class="form-label" for="agenda-description">Notas</label>
                <textarea id="agenda-description" v-model="eventForm.description" class="form-control" rows="2" placeholder="Detalles del recordatorio"></textarea>
              </div>
            </div>
            <div class="d-flex justify-content-end gap-2">
              <button class="btn btn-outline-secondary" type="button" @click="eventForm = emptyEventForm(selectedDate)">Limpiar</button>
              <button class="btn btn-success" type="submit" :disabled="saving">
                {{ saving ? 'Guardando...' : 'Guardar recordatorio' }}
              </button>
            </div>
          </form>

          <div class="day-content">
            <aside class="day-list">
              <h3 class="h6 mb-3">Eventos del día</h3>
              <p v-if="selectedEvents.length === 0" class="empty-day mb-0">
                No hay nada programado. Puedes añadir un recordatorio desde el botón superior.
              </p>
              <article v-for="event in selectedEvents" v-else :key="eventKey(event)" class="day-event-card">
                <div>
                  <span class="badge mb-2" :class="eventBadges[event.type]">{{ eventLabels[event.type] ?? event.type }}</span>
                  <h4 class="h6 mb-1">{{ event.title }}</h4>
                  <p class="text-secondary mb-0">{{ event.description || 'Sin notas adicionales.' }}</p>
                </div>
                <div class="day-event-meta">
                  <strong>{{ formatTimeRange(event) }}</strong>
                  <span>{{ event.property?.title ?? 'Sin propiedad concreta' }}</span>
                  <small v-if="event.tenants?.length">{{ tenantLabel(event.tenants) }}</small>
                  <small v-if="formatMoney(event.amount)">{{ formatMoney(event.amount) }}</small>
                </div>
                <button
                  v-if="event.source === 'manual'"
                  class="btn btn-outline-danger btn-sm"
                  type="button"
                  @click="deleteManualEvent(event)"
                >
                  Borrar
                </button>
              </article>
            </aside>

            <div class="day-hours">
              <div v-if="allDayEvents.length" class="hour-row all-day-row">
                <span class="hour-label">Todo el día</span>
                <div class="hour-events">
                  <span v-for="event in allDayEvents" :key="eventKey(event)" class="hour-pill" :class="eventChipClasses[event.type]">
                    {{ event.title }}
                  </span>
                </div>
              </div>
              <div v-for="hour in dayHours" :key="hour" class="hour-row">
                <span class="hour-label">{{ hour }}</span>
                <div class="hour-events">
                  <span
                    v-for="event in eventsForHour(hour)"
                    :key="eventKey(event)"
                    class="hour-pill"
                    :class="eventChipClasses[event.type]"
                  >
                    {{ event.title }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>
  </main>
</template>

<style scoped>
.agenda-page {
  gap: 20px;
}

.agenda-summary,
.calendar-panel {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: var(--shadow-panel);
}

.agenda-summary {
  display: grid;
  gap: 4px;
  height: 100%;
  padding: 18px;
  overflow: hidden;
  color: #fff;
}

.agenda-summary span {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.agenda-summary strong {
  font-size: 2rem;
  line-height: 1.1;
}

.agenda-summary small {
  font-weight: 700;
  opacity: 0.86;
}

.summary-danger {
  background: linear-gradient(135deg, #b42318, #dc3545);
}

.summary-primary {
  background: linear-gradient(135deg, #0d6efd, #4f8df7);
}

.summary-warning {
  background: linear-gradient(135deg, #b7791f, #f4b740);
}

.summary-info {
  background: linear-gradient(135deg, #0f7185, #4bb3c7);
}

.calendar-panel {
  display: grid;
  gap: 16px;
  padding: 18px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--color-primary), transparent 88%), transparent 180px),
    var(--color-surface);
}

.calendar-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.calendar-eyebrow {
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 900;
  text-transform: uppercase;
}

.calendar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.calendar-scroll {
  overflow-x: auto;
  border-radius: 8px;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  min-width: 820px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.calendar-weekday {
  padding: 11px;
  background: #111827;
  border-right: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  color: #d1d5db;
  font-size: 0.78rem;
  font-weight: 900;
  text-align: center;
  text-transform: uppercase;
}

.calendar-day {
  display: grid;
  align-content: start;
  gap: 10px;
  width: 100%;
  min-height: 138px;
  padding: 11px;
  background: #172033;
  border: 0;
  border-right: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  color: #f8fafc;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.calendar-day:hover,
.calendar-day.is-selected {
  background: #1f2f4a;
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--color-primary), white 15%);
}

.calendar-day:hover {
  transform: translateY(-1px);
}

.calendar-day.has-events {
  box-shadow: inset 0 3px 0 var(--color-primary);
}

.calendar-day.has-events:hover,
.calendar-day.has-events.is-selected {
  box-shadow:
    inset 0 3px 0 var(--color-primary),
    inset 0 0 0 2px color-mix(in srgb, var(--color-primary), white 15%);
}

.calendar-day.is-muted {
  background: #111827;
  color: #94a3b8;
}

.day-top {
  display: flex;
  min-height: 30px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.day-number {
  justify-self: start;
  font-weight: 900;
  line-height: 1;
}

.calendar-day.is-today .day-number {
  display: inline-grid;
  place-items: center;
  width: 30px;
  height: 30px;
  color: #fff;
  background: var(--color-primary);
  border-radius: 999px;
}

.event-count {
  justify-self: end;
  padding: 2px 8px;
  border-radius: 999px;
  background: #e0f2fe;
  color: #075985;
  font-size: 0.75rem;
  font-weight: 900;
}

.day-events {
  display: grid;
  gap: 5px;
}

.event-chip,
.event-more,
.hour-pill {
  overflow: hidden;
  padding: 5px 7px;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 850;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-danger {
  color: #842029;
  background: #f8d7da;
}

.chip-warning {
  color: #664d03;
  background: #fff3cd;
}

.chip-info {
  color: #055160;
  background: #cff4fc;
}

.chip-primary {
  color: #073984;
  background: #dbeafe;
}

.chip-secondary,
.event-more {
  color: var(--color-text);
  background: color-mix(in srgb, var(--color-border), transparent 30%);
}

.day-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1050;
  display: grid;
  place-items: center;
  padding: 22px;
  background: rgb(15 23 42 / 0.58);
}

.day-modal {
  display: grid;
  gap: 18px;
  width: min(1120px, 100%);
  max-height: min(92vh, 920px);
  padding: 22px;
  overflow: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 28px 70px rgb(15 23 42 / 0.32);
}

.day-modal-header,
.day-modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.day-modal-actions {
  flex-wrap: wrap;
}

.day-form {
  display: grid;
  gap: 14px;
  padding: 16px;
  background: color-mix(in srgb, var(--color-primary), var(--color-surface) 94%);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.day-content {
  display: grid;
  grid-template-columns: minmax(280px, 0.85fr) minmax(0, 1.15fr);
  gap: 18px;
}

.day-list,
.day-hours {
  display: grid;
  align-content: start;
  gap: 12px;
}

.empty-day {
  padding: 18px;
  color: var(--color-muted);
  background: color-mix(in srgb, var(--color-border), transparent 70%);
  border-radius: 8px;
}

.day-event-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(150px, 220px) auto;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.day-event-meta {
  display: grid;
  gap: 2px;
  color: var(--color-muted);
  font-weight: 750;
}

.hour-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  min-height: 42px;
  border-bottom: 1px solid var(--color-border);
}

.all-day-row {
  min-height: 54px;
  background: color-mix(in srgb, var(--color-primary), var(--color-surface) 94%);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.hour-label {
  padding: 10px 8px;
  color: var(--color-muted);
  font-size: 0.8rem;
  font-weight: 800;
}

.hour-events {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  padding: 7px 0;
}

@media (max-width: 900px) {
  .calendar-toolbar,
  .day-modal-header,
  .day-content,
  .day-event-card {
    grid-template-columns: 1fr;
  }

  .calendar-toolbar,
  .day-modal-header {
    flex-direction: column;
    align-items: stretch;
  }

  .calendar-actions .btn,
  .day-modal-actions .btn {
    flex: 1;
  }
}
</style>
