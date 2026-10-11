<template>
  <div class="roommate-panel">
    <div class="panel-header">
      <button @click="showAddForm = true" class="btn btn-primary add-roommate-btn">
        <v-icon size="small">mdi-account-plus</v-icon> Add Roommate
      </button>
    </div>

    <!-- Totals Section -->
    <div class="totals-section">
      <div v-if="totals.length === 0" class="empty-state">
        <v-icon size="large" color="grey">mdi-account-group-outline</v-icon>
        <p>No roommates added yet.</p>
        <p class="empty-sub">Add your roommates to start splitting expenses.</p>
      </div>

      <div
        v-for="roommate in totals"
        :key="roommate.id"
        class="roommate-card"
        @click="openDetail(roommate)"
      >
        <div class="roommate-header">
          <div class="avatar">{{ getInitials(roommate.name) }}</div>
          <div class="roommate-meta">
            <h4 class="name">{{ roommate.name }}</h4>
            <span v-if="roommate.email" class="email">{{ roommate.email }}</span>
          </div>
          <button
            @click.stop="confirmDeleteRoommate(roommate)"
            class="delete-btn"
            title="Deactivate roommate"
          >
            <v-icon size="small">mdi-delete-outline</v-icon>
          </button>
        </div>

        <div class="roommate-amounts">
          <div class="amount-block owed">
            <span class="label">Owed</span>
            <span class="value">${{ (roommate.total_owed ?? roommate.total ?? 0).toFixed(2) }}</span>
          </div>
          <div class="amount-divider"></div>
          <div class="amount-block paid">
            <span class="label">Settled</span>
            <span class="value">${{ (roommate.total_paid ?? 0).toFixed(2) }}</span>
          </div>
        </div>

        <div class="roommate-footer">
          <span class="view-details">
            View Bills & Settle <v-icon size="x-small">mdi-chevron-right</v-icon>
          </span>
        </div>
      </div>
    </div>

    <!-- Add Roommate Modal -->
    <div v-if="showAddForm" class="modal-overlay" @click="cancelAdd">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Add New Roommate</h3>
          <button @click="cancelAdd" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Roommate Name *</label>
            <input
              type="text"
              v-model="newRoommateName"
              placeholder="e.g. Alex Smith"
              maxlength="50"
              @keyup.enter="addRoommate"
              ref="nameInput"
              autofocus
            />
          </div>
          <div class="form-group">
            <label>Email (optional)</label>
            <input
              type="email"
              v-model="newRoommateEmail"
              placeholder="e.g. alex@example.com"
              @keyup.enter="addRoommate"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button @click="cancelAdd" class="btn btn-secondary">Cancel</button>
          <button @click="addRoommate" class="btn btn-success" :disabled="!newRoommateName.trim()">
            Add Roommate
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="roommateToDelete" class="modal-overlay" @click="roommateToDelete = null">
      <div class="modal-content delete-confirm-modal" @click.stop>
        <div class="modal-header">
          <h3>Remove Roommate?</h3>
          <button @click="roommateToDelete = null" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <p>
            Are you sure you want to remove <strong>{{ roommateToDelete.name }}</strong>?
          </p>
          <p class="warning-text">
            They will be deactivated and removed from active bill calculations.
          </p>
        </div>
        <div class="modal-footer">
          <button @click="roommateToDelete = null" class="btn btn-secondary">Cancel</button>
          <button @click="executeDelete" class="btn btn-danger">Deactivate</button>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <RoommateDetailModal
      :show="showDetailModal"
      :roommate="selectedRoommate"
      @close="closeDetail"
      @share-updated="handleShareUpdated"
      @notify="$emit('notify', $event)"
    />
  </div>
</template>

<script>
import { ref } from 'vue';
import axios from 'axios';
import RoommateDetailModal from './RoommateDetailModal.vue';

const API_URL = 'http://localhost:3001/api';

export default {
  name: 'RoommatePanel',
  components: {
    RoommateDetailModal
  },
  props: {
    roommates: {
      type: Array,
      required: true
    },
    totals: {
      type: Array,
      required: true
    }
  },
  emits: [
    'roommate-added',
    'roommate-added-success',
    'roommate-added-error',
    'roommate-deleted',
    'refresh-totals',
    'notify'
  ],
  setup(props, { emit }) {
    const showAddForm = ref(false);
    const newRoommateName = ref('');
    const newRoommateEmail = ref('');
    const roommateToDelete = ref(null);

    const showDetailModal = ref(false);
    const selectedRoommate = ref(null);

    const getInitials = (name) => {
      if (!name) return '?';
      return name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    };

    const addRoommate = async () => {
      if (!newRoommateName.value.trim()) return;

      const roommateData = {
        name: newRoommateName.value.trim(),
        email: newRoommateEmail.value.trim() || null
      };

      newRoommateName.value = '';
      newRoommateEmail.value = '';
      showAddForm.value = false;

      emit('roommate-added', roommateData);

      try {
        const response = await axios.post(`${API_URL}/roommates`, roommateData);
        emit('roommate-added-success', response.data);
        emit('notify', {
          type: 'success',
          message: `Roommate "${response.data.name}" added successfully!`
        });
      } catch (error) {
        console.error('Error adding roommate:', error);
        emit('roommate-added-error', roommateData);
        emit('notify', { type: 'error', message: 'Failed to add roommate' });
      }
    };

    const cancelAdd = () => {
      newRoommateName.value = '';
      newRoommateEmail.value = '';
      showAddForm.value = false;
    };

    const confirmDeleteRoommate = (roommate) => {
      roommateToDelete.value = roommate;
    };

    const executeDelete = async () => {
      if (!roommateToDelete.value) return;
      const id = roommateToDelete.value.id;
      const name = roommateToDelete.value.name;
      roommateToDelete.value = null;

      try {
        await axios.delete(`${API_URL}/roommates/${id}`);
        emit('roommate-deleted');
        emit('notify', { type: 'info', message: `Roommate "${name}" removed.` });
      } catch (error) {
        console.error('Error deleting roommate:', error);
        emit('notify', { type: 'error', message: 'Failed to remove roommate' });
      }
    };

    const openDetail = (roommate) => {
      selectedRoommate.value = roommate;
      showDetailModal.value = true;
    };

    const closeDetail = () => {
      showDetailModal.value = false;
      selectedRoommate.value = null;
    };

    const handleShareUpdated = () => {
      emit('refresh-totals');
    };

    return {
      showAddForm,
      newRoommateName,
      newRoommateEmail,
      roommateToDelete,
      showDetailModal,
      selectedRoommate,
      getInitials,
      addRoommate,
      cancelAdd,
      confirmDeleteRoommate,
      executeDelete,
      openDetail,
      closeDetail,
      handleShareUpdated
    };
  }
};
</script>

<style scoped>
.roommate-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  margin-bottom: 1rem;
}

.add-roommate-btn {
  width: 100%;
  justify-content: center;
}

.totals-section {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.roommate-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.roommate-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.12);
  transform: translateY(-2px);
}

.roommate-header {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 0.75rem;
}

.avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.95rem;
  flex-shrink: 0;
}

.roommate-meta {
  flex: 1;
  overflow: hidden;
}

.name {
  margin: 0;
  font-size: 0.95rem;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.email {
  font-size: 0.75rem;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.delete-btn {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: color 0.15s;
}

.delete-btn:hover {
  color: #ef4444;
  background: #fee2e2;
}

.roommate-amounts {
  display: flex;
  background: #f9fafb;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
}

.amount-block {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.amount-divider {
  width: 1px;
  background: #e5e7eb;
  margin: 0 0.5rem;
}

.amount-block .label {
  font-size: 0.68rem;
  text-transform: uppercase;
  color: #6b7280;
  font-weight: 600;
}

.amount-block .value {
  font-size: 1.05rem;
  font-weight: 700;
}

.amount-block.owed .value {
  color: #dc2626;
}

.amount-block.paid .value {
  color: #059669;
}

.roommate-footer {
  display: flex;
  justify-content: flex-end;
}

.view-details {
  font-size: 0.75rem;
  color: #3b82f6;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
}

.empty-state {
  text-align: center;
  padding: 2.5rem 1rem;
  color: #6b7280;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.empty-sub {
  font-size: 0.8rem;
  color: #9ca3af;
}

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  width: 90%;
  max-width: 450px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  color: #111827;
  font-size: 1.2rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #9ca3af;
  cursor: pointer;
  line-height: 1;
}

.close-btn:hover {
  color: #374151;
}

.modal-body {
  padding: 1.25rem 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.35rem;
  font-weight: 600;
  font-size: 0.85rem;
  color: #374151;
}

.form-group input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  background: white;
  color: #111827;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.warning-text {
  font-size: 0.85rem;
  color: #ef4444;
  margin-top: 0.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.btn {
  padding: 0.55rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.15s ease;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover {
  background: #059669;
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;
}

.btn-secondary:hover {
  background: #d1d5db;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

/* Dark Mode */
:global(.dark-mode) .roommate-card {
  background: #1f2937;
  border-color: #374151;
}

:global(.dark-mode) .name {
  color: #f9fafb;
}

:global(.dark-mode) .email {
  color: #9ca3af;
}

:global(.dark-mode) .roommate-amounts {
  background: #111827;
}

:global(.dark-mode) .amount-divider {
  background: #374151;
}

:global(.dark-mode) .modal-content {
  background: #1f2937;
}

:global(.dark-mode) .modal-header,
:global(.dark-mode) .modal-footer {
  background: #111827;
  border-color: #374151;
}

:global(.dark-mode) .modal-header h3 {
  color: #f9fafb;
}

:global(.dark-mode) .form-group label {
  color: #e5e7eb;
}

:global(.dark-mode) .form-group input {
  background: #111827;
  border-color: #374151;
  color: #f9fafb;
}

:global(.dark-mode) .btn-secondary {
  background: #374151;
  color: #e5e7eb;
}
</style>