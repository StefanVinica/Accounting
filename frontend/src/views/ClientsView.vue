<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/ui'
import Header from '../components/layout/Header.vue'
import StatusBadge from '../components/common/StatusBadge.vue'
import EmptyState from '../components/common/EmptyState.vue'
import LoadingSpinner from '../components/common/LoadingSpinner.vue'
import ConfirmModal from '../components/common/ConfirmModal.vue'
import { listClients, inviteClient, resendInvitation, updateRelationshipStatus, removeClient } from '../api/clients'

const { t } = useI18n()
const authStore = useAuthStore()
const uiStore = useUIStore()

const clients = ref([])
const loading = ref(true)
const showInviteModal = ref(false)
const inviteEmail = ref('')
const inviting = ref(false)
const showDeleteModal = ref(false)
const clientToDelete = ref(null)
const deleting = ref(false)

onMounted(async () => {
  await loadClients()
})

async function loadClients() {
  try {
    loading.value = true
    clients.value = await listClients(authStore.userId)
  } catch (err) {
    uiStore.showError(t('errors.generic'))
  } finally {
    loading.value = false
  }
}

async function handleInvite() {
  if (!inviteEmail.value || !inviteEmail.value.includes('@')) {
    uiStore.showError('Please enter a valid email')
    return
  }

  try {
    inviting.value = true
    const result = await inviteClient(authStore.userId, inviteEmail.value)
    clients.value.unshift(result)
    showInviteModal.value = false
    inviteEmail.value = ''
    uiStore.showSuccess('Invitation sent!')
  } catch (err) {
    uiStore.showError(err.message || t('errors.generic'))
  } finally {
    inviting.value = false
  }
}

async function handleResend(client) {
  try {
    await resendInvitation(client.id)
    uiStore.showSuccess('Invitation resent!')
    await loadClients()
  } catch (err) {
    uiStore.showError(t('errors.generic'))
  }
}

async function handleStatusChange(client, newStatus) {
  try {
    await updateRelationshipStatus(client.id, newStatus)
    await loadClients()
    uiStore.showSuccess(`Client ${newStatus === 'active' ? 'activated' : 'deactivated'}`)
  } catch (err) {
    uiStore.showError(t('errors.generic'))
  }
}

function confirmDelete(client) {
  clientToDelete.value = client
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!clientToDelete.value) return

  try {
    deleting.value = true
    await removeClient(clientToDelete.value.id)
    clients.value = clients.value.filter(c => c.id !== clientToDelete.value.id)
    showDeleteModal.value = false
    uiStore.showSuccess('Client removed')
  } catch (err) {
    uiStore.showError(t('errors.generic'))
  } finally {
    deleting.value = false
    clientToDelete.value = null
  }
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(uiStore.locale === 'mk' ? 'mk-MK' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getClientName(client) {
  return client.client?.full_name || client.client?.email || 'Pending Invitation'
}

function getClientEmail(client) {
  return client.client?.email || ''
}
</script>

<template>
  <div>
    <Header :title="t('clients.title')">
      <template #actions>
        <button @click="showInviteModal = true" class="btn btn-primary">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          {{ t('clients.invite') }}
        </button>
      </template>
    </Header>

    <div class="p-6">
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" :text="t('common.loading')" />
      </div>

      <!-- Empty State -->
      <EmptyState
        v-else-if="clients.length === 0"
        :title="t('clients.noClients')"
        :description="t('clients.inviteFirst')"
        icon="users"
      >
        <template #action>
          <button @click="showInviteModal = true" class="btn btn-primary">
            {{ t('clients.invite') }}
          </button>
        </template>
      </EmptyState>

      <!-- Clients Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="client in clients"
          :key="client.id"
          class="card p-6"
        >
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <span class="text-lg font-medium text-gray-600">
                  {{ getClientName(client).charAt(0).toUpperCase() }}
                </span>
              </div>
              <div>
                <p class="font-medium text-gray-900">{{ getClientName(client) }}</p>
                <p v-if="getClientEmail(client)" class="text-sm text-gray-500">
                  {{ getClientEmail(client) }}
                </p>
              </div>
            </div>
            <StatusBadge :status="client.status">
              {{ t(`clients.status.${client.status}`) }}
            </StatusBadge>
          </div>

          <div v-if="client.client?.company_name" class="mb-4">
            <p class="text-sm text-gray-500">{{ client.client.company_name }}</p>
          </div>

          <div class="text-sm text-gray-500 mb-4">
            <p v-if="client.status === 'pending'">
              Invited {{ formatDate(client.invited_at) }}
            </p>
            <p v-else-if="client.accepted_at">
              Joined {{ formatDate(client.accepted_at) }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            <button
              v-if="client.status === 'pending'"
              @click="handleResend(client)"
              class="btn btn-secondary text-sm flex-1"
            >
              {{ t('clients.actions.resend') }}
            </button>
            <button
              v-if="client.status === 'active'"
              @click="handleStatusChange(client, 'inactive')"
              class="btn btn-secondary text-sm flex-1"
            >
              {{ t('clients.actions.deactivate') }}
            </button>
            <button
              v-if="client.status === 'inactive'"
              @click="handleStatusChange(client, 'active')"
              class="btn btn-primary text-sm flex-1"
            >
              {{ t('clients.actions.activate') }}
            </button>
            <button
              @click="confirmDelete(client)"
              class="btn btn-secondary text-sm text-red-600 hover:bg-red-50"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Invite Modal -->
    <Teleport to="body">
      <div
        v-if="showInviteModal"
        class="modal-backdrop animate-fade-in"
        @click.self="showInviteModal = false"
      >
        <div class="modal-content animate-slide-up p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ t('clients.inviteTitle') }}</h3>

          <form @submit.prevent="handleInvite">
            <div class="mb-6">
              <label class="label">{{ t('clients.clientEmail') }}</label>
              <input
                v-model="inviteEmail"
                type="email"
                class="input"
                :placeholder="t('clients.clientEmail')"
                required
              />
            </div>

            <div class="flex justify-end gap-3">
              <button
                type="button"
                @click="showInviteModal = false"
                class="btn btn-secondary"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                type="submit"
                :disabled="inviting"
                class="btn btn-primary"
              >
                <span v-if="inviting" class="flex items-center gap-2">
                  <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </span>
                <span v-else>{{ t('clients.sendInvite') }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      :show="showDeleteModal"
      :title="t('clients.actions.remove')"
      message="Are you sure you want to remove this client? This action cannot be undone."
      :loading="deleting"
      danger
      @confirm="handleDelete"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>
