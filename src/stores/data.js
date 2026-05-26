import { defineStore } from 'pinia'
import api from '@/services/api'

const replaceById = (items, item) => {
  const index = items.findIndex((currentItem) => currentItem.id === item.id)

  if (index !== -1) {
    items[index] = item
  }
}

export const useDataStore = defineStore('data', {
  state: () => ({
    properties: [],
    tenants: [],
    owners: [],
    contracts: [],
    payments: [],
    documents: [],
    users: [],
    loading: false,
    error: '',
    messages: [],
    confirmation: {
      visible: false,
      title: '',
      message: '',
      confirmText: 'Confirmar',
      resolve: null,
    },
  }),

  getters: {
    getPropertyById: (state) => (id) => state.properties.find((property) => property.id === id),
    getTenantById: (state) => (id) => state.tenants.find((tenant) => tenant.id === id),
    getOwnerById: (state) => (id) => state.owners.find((owner) => owner.id === id),
    getContractById: (state) => (id) => state.contracts.find((contract) => contract.id === id),
    getPaymentById: (state) => (id) => state.payments.find((payment) => payment.id === id),
    getDocumentById: (state) => (id) => state.documents.find((document) => document.id === id),
    getUserById: (state) => (id) => state.users.find((user) => user.id === id),
  },

  actions: {
    setError(message) {
      this.error = message
    },

    clearError() {
      this.error = ''
    },

    addMessage(message, type = 'success') {
      const normalizedMessage = typeof message === 'string'
        ? { text: message, type }
        : message
      const id = Date.now() + Math.random()

      this.messages.push({
        id,
        type: normalizedMessage.type ?? 'success',
        text: normalizedMessage.text,
      })

      window.setTimeout(() => {
        this.removeMessage(id)
      }, 3500)
    },

    removeMessage(id) {
      this.messages = this.messages.filter((message) => message.id !== id)
    },

    confirm({ title = 'Confirmar acción', message, confirmText = 'Confirmar' }) {
      return new Promise((resolve) => {
        this.confirmation = {
          visible: true,
          title,
          message,
          confirmText,
          resolve,
        }
      })
    },

    acceptConfirmation() {
      this.confirmation.resolve?.(true)
      this.confirmation = {
        visible: false,
        title: '',
        message: '',
        confirmText: 'Confirmar',
        resolve: null,
      }
    },

    cancelConfirmation() {
      this.confirmation.resolve?.(false)
      this.confirmation = {
        visible: false,
        title: '',
        message: '',
        confirmText: 'Confirmar',
        resolve: null,
      }
    },

    async fetchProperties() {
      const response = await api.get('/properties')
      this.properties = response.data
      return response.data
    },

    async fetchTenants() {
      const response = await api.get('/tenants')
      this.tenants = response.data
      return response.data
    },

    async fetchOwners() {
      const response = await api.get('/owners')
      this.owners = response.data
      return response.data
    },

    async fetchContracts() {
      const response = await api.get('/contracts')
      this.contracts = response.data
      return response.data
    },

    async fetchPayments() {
      const response = await api.get('/payments')
      this.payments = response.data
      return response.data
    },

    async fetchDocuments() {
      const response = await api.get('/documents')
      this.documents = response.data
      return response.data
    },

    async fetchUsers() {
      const response = await api.get('/users')
      this.users = response.data
      return response.data
    },

    async fetchAll() {
      this.loading = true
      this.clearError()

      try {
        await Promise.all([
          this.fetchProperties(),
          this.fetchTenants(),
          this.fetchOwners(),
          this.fetchContracts(),
          this.fetchPayments(),
          this.fetchDocuments(),
        ])
      } catch {
        this.setError('No se pudieron cargar los datos.')
      } finally {
        this.loading = false
      }
    },

    async createProperty(data) {
      const response = await api.post('/properties', data)
      this.properties.push(response.data)
      this.addMessage('Propiedad creada correctamente.')
      return response.data
    },

    async updateProperty(id, data) {
      const response = await api.put(`/properties/${id}`, data)
      replaceById(this.properties, response.data)
      this.addMessage('Propiedad actualizada correctamente.')
      return response.data
    },

    async deleteProperty(id) {
      await api.delete(`/properties/${id}`)
      this.properties = this.properties.filter((property) => property.id !== id)
      this.addMessage('Propiedad borrada correctamente.')
    },

    async createTenant(data) {
      const response = await api.post('/tenants', data)
      this.tenants.push(response.data)
      this.addMessage('Inquilino creado correctamente.')
      return response.data
    },

    async updateTenant(id, data) {
      const response = await api.put(`/tenants/${id}`, data)
      replaceById(this.tenants, response.data)
      this.addMessage('Inquilino actualizado correctamente.')
      return response.data
    },

    async assignPropertyToTenant(tenantId, propertyId) {
      await api.post(`/tenants/${tenantId}/assign-property`, { property_id: propertyId })
      await this.fetchTenants()
    },

    async detachPropertyFromTenant(tenantId, propertyId) {
      await api.post(`/tenants/${tenantId}/detach-property`, { property_id: propertyId })
      await this.fetchTenants()
      this.addMessage('Propiedad quitada del inquilino.')
    },

    async deleteTenant(id) {
      await api.delete(`/tenants/${id}`)
      this.tenants = this.tenants.filter((tenant) => tenant.id !== id)
      this.addMessage('Inquilino borrado correctamente.')
    },

    async createOwner(data) {
      const response = await api.post('/owners', data)
      this.owners.push(response.data)
      this.addMessage('Propietario creado correctamente.')
      return response.data
    },

    async updateOwner(id, data) {
      const response = await api.put(`/owners/${id}`, data)
      replaceById(this.owners, response.data)
      this.addMessage('Propietario actualizado correctamente.')
      return response.data
    },

    async deleteOwner(id) {
      await api.delete(`/owners/${id}`)
      this.owners = this.owners.filter((owner) => owner.id !== id)
      this.addMessage('Propietario borrado correctamente.')
    },

    async createContract(data) {
      const response = await api.post('/contracts', data)
      this.contracts.push(response.data)
      this.addMessage('Contrato creado correctamente.')
      return response.data
    },

    async updateContract(id, data) {
      const response = await api.put(`/contracts/${id}`, data)
      replaceById(this.contracts, response.data)
      this.addMessage('Contrato actualizado correctamente.')
      return response.data
    },

    async deleteContract(id) {
      await api.delete(`/contracts/${id}`)
      this.contracts = this.contracts.filter((contract) => contract.id !== id)
      this.addMessage('Contrato borrado correctamente.')
    },

    async createPayment(data) {
      const response = await api.post('/payments', data)
      this.payments.push(response.data)
      this.addMessage('Pago creado correctamente.')
      return response.data
    },

    async updatePayment(id, data) {
      const response = await api.put(`/payments/${id}`, data)
      replaceById(this.payments, response.data)
      this.addMessage('Pago actualizado correctamente.')
      return response.data
    },

    async deletePayment(id) {
      await api.delete(`/payments/${id}`)
      this.payments = this.payments.filter((payment) => payment.id !== id)
      this.addMessage('Pago borrado correctamente.')
    },

    async createDocument(formData) {
      const response = await api.post('/documents', formData)
      this.documents.push(response.data)
      this.addMessage('Documento creado correctamente.')
      return response.data
    },

    async updateDocument(id, formData) {
      if (!formData.has('_method')) {
        formData.append('_method', 'PUT')
      }

      const response = await api.post(`/documents/${id}`, formData)
      replaceById(this.documents, response.data)
      this.addMessage('Documento actualizado correctamente.')
      return response.data
    },

    async deleteDocument(id) {
      await api.delete(`/documents/${id}`)
      this.documents = this.documents.filter((document) => document.id !== id)
      this.addMessage('Documento borrado correctamente.')
    },

    async removeDocumentFile(id) {
      const response = await api.delete(`/documents/${id}/file`)
      replaceById(this.documents, response.data)
      this.addMessage('Archivo quitado del documento.')
      return response.data
    },

    async createUser(data) {
      const response = await api.post('/users', data)
      this.users.push(response.data)
      this.addMessage('Usuario creado correctamente.')
      return response.data
    },

    async updateUser(id, data) {
      const response = await api.put(`/users/${id}`, data)
      replaceById(this.users, response.data)
      this.addMessage('Usuario actualizado correctamente.')
      return response.data
    },

    async deleteUser(id) {
      await api.delete(`/users/${id}`)
      this.users = this.users.filter((user) => user.id !== id)
      this.addMessage('Usuario borrado correctamente.')
    },
  },
})
