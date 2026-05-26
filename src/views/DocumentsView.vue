<script setup>
import api from '@/services/api'
import { useDataStore } from '@/stores/data'
import { getErrorMessage } from '@/utils/forms'
import { storeToRefs } from 'pinia'
import { Form, Field, ErrorMessage } from 'vee-validate'
import { computed, onMounted, ref } from 'vue'
import * as yup from 'yup'

const dataStore = useDataStore()
const { properties, tenants, contracts, documents } = storeToRefs(dataStore)
const loading = ref(true)
const error = ref('')
const formError = ref('')
const editId = ref(null)
const formKey = ref(0)
const selectedFile = ref(null)
const fileInput = ref(null)
const search = ref('')
const typeFilter = ref('')

const emptyForm = () => ({
  name: '',
  type: '',
  property_id: '',
  tenant_id: '',
  contract_id: '',
})

const form = ref(emptyForm())

const documentSchema = computed(() =>
  yup.object({
    name: yup
      .string()
      .nullable()
      .max(255, 'El nombre no puede superar 255 caracteres'),
    type: yup
      .string()
      .nullable(),
    property_id: yup.string().nullable(),
    tenant_id: yup.string().nullable(),
    contract_id: yup
      .string()
      .nullable()
      .test('has-relation', 'Relaciona el documento con una propiedad, inquilino o contrato', function (value) {
        return Boolean(this.parent.property_id || this.parent.tenant_id || value)
      }),
  }),
)

const currentFormKey = computed(() => editId.value ? `edit-${editId.value}` : `create-${formKey.value}`)

const documentTypes = {
  contract: 'Contrato',
  invoice: 'Factura',
  dni: 'DNI',
  other: 'Otro',
}

const fileLabel = (document) => document.file_path ? 'Archivo subido' : 'Sin archivo'

const scrollToForm = () => window.scrollTo({ top: 0, behavior: 'smooth' })

const contractLabel = (contract) => {
  const property = contract.property?.title ?? `Contrato ${contract.id}`
  return `${property} - ${contract.start_date}`
}

const documentOwner = (document) => {
  if (document.property) {
    return `Propiedad: ${document.property.title}`
  }

  if (document.tenant) {
    return `Inquilino: ${document.tenant.name}`
  }

  if (document.contract) {
    return `Contrato: ${contractLabel(document.contract)}`
  }

  return 'Sin relación'
}

const filteredDocuments = computed(() =>
  documents.value.filter((document) => {
    const searchText = [
      document.name,
      documentTypes[document.type] ?? document.type,
      documentOwner(document),
    ].join(' ').toLowerCase()
    const matchesSearch = searchText.includes(search.value.toLowerCase())
    const matchesType = !typeFilter.value || document.type === typeFilter.value

    return matchesSearch && matchesType
  }),
)

const editDocument = (document) => {
  form.value = {
    name: document.name ?? '',
    type: document.type ?? '',
    property_id: document.property_id ?? '',
    tenant_id: document.tenant_id ?? '',
    contract_id: document.contract_id ?? '',
  }
  selectedFile.value = null
  editId.value = document.id
  formError.value = ''
  scrollToForm()
}

const cancelEdit = () => {
  form.value = emptyForm()
  selectedFile.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
  editId.value = null
  formKey.value += 1
  formError.value = ''
}

const handleFileChange = (event) => {
  selectedFile.value = event.target.files[0] ?? null
}

const saveDocument = async (values) => {
  formError.value = ''

  if (!editId.value && !selectedFile.value) {
    formError.value = 'Selecciona un archivo.'
    return
  }

  const payload = new FormData()

  if (values.name) {
    payload.append('name', values.name)
  }

  if (values.type) {
    payload.append('type', values.type)
  }

  if (values.property_id) {
    payload.append('property_id', values.property_id)
  }

  if (values.tenant_id) {
    payload.append('tenant_id', values.tenant_id)
  }

  if (values.contract_id) {
    payload.append('contract_id', values.contract_id)
  }

  if (selectedFile.value) {
    payload.append('file', selectedFile.value)
  }

  try {
    if (editId.value) {
      await dataStore.updateDocument(editId.value, payload)
      editId.value = null
    } else {
      await dataStore.createDocument(payload)
    }

    form.value = emptyForm()
    selectedFile.value = null
    formKey.value += 1
    if (fileInput.value) {
      fileInput.value.value = ''
    }
    formError.value = ''
  } catch (requestError) {
    formError.value = getErrorMessage(
      requestError,
      editId.value ? 'No se pudo editar el documento.' : 'No se pudo crear el documento.',
    )
  }
}

const deleteDocument = async (id) => {
  formError.value = ''

  const confirmed = await dataStore.confirm({
    title: 'Borrar documento',
    message: '¿Seguro que quieres borrar este documento?',
    confirmText: 'Borrar',
  })

  if (!confirmed) {
    return
  }

  try {
    await dataStore.deleteDocument(id)

    if (editId.value === id) {
      cancelEdit()
    }
  } catch (requestError) {
    formError.value = getErrorMessage(requestError, 'No se pudo borrar el documento.')
  }
}

const removeDocumentFile = async (document) => {
  formError.value = ''

  const confirmed = await dataStore.confirm({
    title: 'Quitar archivo',
    message: `¿Seguro que quieres quitar el archivo de "${document.name}"? El documento seguirá existiendo.`,
    confirmText: 'Quitar',
  })

  if (!confirmed) {
    return
  }

  try {
    await dataStore.removeDocumentFile(document.id)
  } catch (requestError) {
    formError.value = getErrorMessage(requestError, 'No se pudo quitar el archivo.')
  }
}

const openDocument = async (document) => {
  formError.value = ''

  if (!document.file_path) {
    formError.value = 'Este documento no tiene archivo subido.'
    return
  }

  try {
    const response = await api.get(`/documents/${document.id}/download`, {
      responseType: 'blob',
    })
    const fileUrl = window.URL.createObjectURL(response.data)

    window.open(fileUrl, '_blank', 'noopener')
    window.setTimeout(() => window.URL.revokeObjectURL(fileUrl), 10000)
  } catch (requestError) {
    formError.value = getErrorMessage(requestError, 'No se pudo abrir el documento.')
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      dataStore.fetchProperties(),
      dataStore.fetchTenants(),
      dataStore.fetchContracts(),
      dataStore.fetchDocuments(),
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
        <h1 class="mb-1">Documentos</h1>
        <p class="text-secondary mb-0">Archiva documentos y relaciónalos con propiedades, inquilinos o contratos.</p>
      </div>
      <span class="badge text-bg-secondary fs-6">{{ documents.length }} documentos</span>
    </div>

    <Form
      class="card-form"
      :key="currentFormKey"
      :initial-values="form"
      :validation-schema="documentSchema"
      @submit="saveDocument"
    >
      <h2>{{ editId ? 'Editar documento' : 'Crear documento' }}</h2>

      <div class="form-field">
        <label for="name">Nombre</label>
        <Field id="name" name="name" type="text" />
        <ErrorMessage class="field-error" name="name" />
      </div>

      <div class="form-field">
        <label for="file">Archivo</label>
        <input id="file" ref="fileInput" type="file" @change="handleFileChange" />
        <small v-if="editId" class="text-secondary">Selecciona un archivo solo si quieres reemplazar el actual.</small>
      </div>

      <div class="form-field">
        <label for="type">Tipo</label>
        <Field id="type" name="type" as="select">
          <option value="">Sin tipo</option>
          <option value="contract">Contrato</option>
          <option value="invoice">Factura</option>
          <option value="dni">DNI</option>
          <option value="other">Otro</option>
        </Field>
        <ErrorMessage class="field-error" name="type" />
      </div>

      <div class="form-field">
        <label for="property">Propiedad</label>
        <Field id="property" name="property_id" as="select">
          <option value="">Sin propiedad</option>
          <option v-for="property in properties" :key="property.id" :value="property.id">
            {{ property.title }}
          </option>
        </Field>
        <ErrorMessage class="field-error" name="property_id" />
      </div>

      <div class="form-field">
        <label for="tenant">Inquilino</label>
        <Field id="tenant" name="tenant_id" as="select">
          <option value="">Sin inquilino</option>
          <option v-for="tenant in tenants" :key="tenant.id" :value="tenant.id">
            {{ tenant.name }}
          </option>
        </Field>
        <ErrorMessage class="field-error" name="tenant_id" />
      </div>

      <div class="form-field">
        <label for="contract">Contrato</label>
        <Field id="contract" name="contract_id" as="select">
          <option value="">Sin contrato</option>
          <option v-for="contract in contracts" :key="contract.id" :value="contract.id">
            {{ contractLabel(contract) }}
          </option>
        </Field>
        <ErrorMessage class="field-error" name="contract_id" />
      </div>

      <div class="form-actions">
        <button class="btn btn-success" type="submit">{{ editId ? 'Guardar cambios' : 'Crear' }}</button>
        <button v-if="editId" class="btn btn-outline-secondary" type="button" @click="cancelEdit">Cancelar edición</button>
      </div>
      <p v-if="formError" class="form-error mb-0">{{ formError }}</p>
    </Form>

    <p v-if="loading" class="alert alert-info mb-0">Cargando documentos...</p>
    <p v-else-if="error" class="alert alert-danger mb-0">{{ error }}</p>
    <p v-else-if="documents.length === 0" class="alert alert-secondary mb-0">No hay documentos.</p>

    <template v-else>
      <section class="filter-bar">
        <input v-model="search" class="form-control" type="search" placeholder="Buscar por nombre, tipo o relación" />
        <select v-model="typeFilter" class="form-select">
          <option value="">Todos los tipos</option>
          <option value="contract">Contrato</option>
          <option value="invoice">Factura</option>
          <option value="dni">DNI</option>
          <option value="other">Otro</option>
        </select>
      </section>

      <p v-if="filteredDocuments.length === 0" class="alert alert-secondary mb-0">No hay documentos con esos filtros.</p>

      <div v-else class="row g-3">
        <div v-for="document in filteredDocuments" :key="document.id" class="col-md-6 col-xl-4">
          <article class="card h-100 border-0 shadow-sm">
            <div class="card-body d-flex flex-column">
              <div class="d-flex justify-content-between gap-2 mb-2">
                <h2 class="h5 card-title mb-0">{{ document.name }}</h2>
                <span class="badge text-bg-light">{{ documentTypes[document.type] ?? 'Sin tipo' }}</span>
              </div>
              <p class="text-secondary small mb-3">{{ documentOwner(document) }}</p>
              <div class="document-icon mb-2" :class="{ empty: !document.file_path }">
                {{ document.file_path ? 'FILE' : 'NO' }}
              </div>
              <p class="text-secondary small mb-3">{{ fileLabel(document) }}</p>
              <div class="d-flex flex-wrap gap-2 mt-auto">
                <button class="btn btn-success btn-sm" type="button" :disabled="!document.file_path" @click="openDocument(document)">
                  Abrir
                </button>
                <button class="btn btn-outline-success btn-sm" type="button" @click="editDocument(document)">Editar</button>
                <button
                  v-if="document.file_path"
                  class="btn btn-outline-warning btn-sm"
                  type="button"
                  @click="removeDocumentFile(document)"
                >
                  Quitar archivo
                </button>
                <button class="btn btn-outline-danger btn-sm" type="button" @click="deleteDocument(document.id)">Borrar</button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </template>
  </main>
</template>

<style scoped>
.document-icon {
  display: grid;
  width: 72px;
  height: 86px;
  place-items: center;
  color: #842029;
  background: #f8d7da;
  border: 1px solid #f1aeb5;
  border-radius: 8px;
  font-weight: 800;
}

.document-icon.empty {
  color: var(--color-muted);
  background: var(--color-surface-muted);
  border-color: var(--color-border);
}
</style>
