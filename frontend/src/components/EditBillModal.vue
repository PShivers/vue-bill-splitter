<template>
  <div v-if="show && bill" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <div class="modal-title-row">
          <h3>Edit Bill</h3>
          <span class="badge" :class="bill.is_settled ? 'badge-settled' : 'badge-pending'">
            {{ bill.is_settled ? 'Settled' : 'Pending' }}
          </span>
        </div>
        <button @click="$emit('close')" class="close-btn">&times;</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label>Bill Name *</label>
          <input
            type="text"
            v-model="editedBill.name"
            placeholder="Bill name"
            required
          />
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>Amount ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              v-model="editedBill.amount"
              placeholder="0.00"
              required
            />
          </div>
          <div class="form-group flex-1">
            <label>Due Date</label>
            <input type="date" v-model="editedBill.due_date" />
          </div>
        </div>

        <div class="form-group">
          <label>Category</label>
          <div class="category-grid">
            <button
              type="button"
              v-for="(label, key) in categoryLabels"
              :key="key"
              class="category-btn"
              :class="{ active: editedBill.category === key }"
              @click="editedBill.category = key"
            >
              <v-icon size="small">{{ getCategoryIcon(key) }}</v-icon>
              <span>{{ label }}</span>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>Notes (optional)</label>
          <input
            type="text"
            v-model="editedBill.notes"
            placeholder="Notes or account info"
          />
        </div>

        <div class="form-group">
          <div class="roommate-header-row">
            <label>Assigned Roommates ({{ assignedRoommates.length }}):</label>
            <span class="split-info" v-if="previewSplit > 0">
              ${{ previewSplit.toFixed(2) }} per person
            </span>
          </div>

          <div class="roommate-list">
            <div
              v-for="roommate in roommates"
              :key="roommate.id"
              class="roommate-select-item"
              :class="{ selected: assignedRoommates.includes(roommate.id) }"
              @click="toggleRoommate(roommate.id)"
            >
              <input
                type="checkbox"
                :checked="assignedRoommates.includes(roommate.id)"
                @click.stop="toggleRoommate(roommate.id)"
              />
              <span class="roommate-select-name">{{ roommate.name }}</span>
            </div>
            <div v-if="roommates.length === 0" class="no-roommates">
              No roommates available.
            </div>
          </div>
        </div>

        <!-- Settle Toggle Action -->
        <div class="settle-box">
          <div>
            <strong>Mark Bill as {{ bill.is_settled ? 'Unsettled' : 'Settled' }}</strong>
            <p class="settle-desc">
              {{ bill.is_settled ? 'Re-open this bill and mark all shares unpaid.' : 'Mark all roommate shares as paid.' }}
            </p>
          </div>
          <button
            type="button"
            @click="toggleBillSettled"
            class="btn btn-sm"
            :class="bill.is_settled ? 'btn-outline-secondary' : 'btn-outline-success'"
          >
            <v-icon size="small">{{ bill.is_settled ? 'mdi-undo' : 'mdi-check-all' }}</v-icon>
            {{ bill.is_settled ? 'Unsettle' : 'Mark Settled' }}
          </button>
        </div>
      </div>

      <div class="modal-footer">
        <button
          v-if="!showDeleteConfirm"
          @click="showDeleteConfirm = true"
          class="btn btn-danger"
          type="button"
        >
          <v-icon size="small">mdi-delete-outline</v-icon> Delete
        </button>

        <div v-else class="delete-confirm-box">
          <span>Are you sure?</span>
          <button @click="deleteBill" class="btn btn-danger btn-sm" type="button">Yes, Delete</button>
          <button @click="showDeleteConfirm = false" class="btn btn-secondary btn-sm" type="button">Cancel</button>
        </div>

        <div class="spacer"></div>
        <button @click="$emit('close')" class="btn btn-secondary" type="button">Cancel</button>
        <button @click="saveBill" class="btn btn-success" type="button" :disabled="saving">
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, watch } from 'vue';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export default {
  name: 'EditBillModal',
  props: {
    show: {
      type: Boolean,
      required: true
    },
    bill: {
      type: Object,
      default: null
    },
    roommates: {
      type: Array,
      required: true
    }
  },
  emits: ['close', 'bill-updated', 'bill-deleted', 'notify'],
  setup(props, { emit }) {
    const saving = ref(false);
    const showDeleteConfirm = ref(false);

    const editedBill = reactive({
      name: '',
      amount: '',
      due_date: '',
      category: 'other',
      notes: ''
    });

    const assignedRoommates = ref([]);

    const categoryIcons = {
      rent: 'mdi-home-city',
      utilities: 'mdi-lightning-bolt',
      electricity: 'mdi-flash',
      water: 'mdi-water',
      internet: 'mdi-wifi',
      groceries: 'mdi-cart',
      entertainment: 'mdi-movie',
      other: 'mdi-receipt'
    };

    const categoryLabels = {
      rent: 'Rent',
      utilities: 'Utilities',
      electricity: 'Electricity',
      water: 'Water',
      internet: 'Internet',
      groceries: 'Groceries',
      entertainment: 'Entertainment',
      other: 'Other'
    };

    const getCategoryIcon = (key) => categoryIcons[key] || categoryIcons.other;

    watch(
      () => props.bill,
      (newBill) => {
        showDeleteConfirm.value = false;
        if (newBill) {
          editedBill.name = newBill.name || '';
          editedBill.amount = newBill.amount || '';
          editedBill.due_date = newBill.due_date || '';
          editedBill.category = newBill.category || 'other';
          editedBill.notes = newBill.notes || '';
          assignedRoommates.value = newBill.roommate_ids ? [...newBill.roommate_ids] : [];
        }
      },
      { immediate: true }
    );

    const previewSplit = computed(() => {
      const amt = parseFloat(editedBill.amount);
      const count = assignedRoommates.value.length;
      if (amt > 0 && count > 0) {
        return amt / count;
      }
      return 0;
    });

    const toggleRoommate = (roommateId) => {
      const index = assignedRoommates.value.indexOf(roommateId);
      if (index > -1) {
        assignedRoommates.value.splice(index, 1);
      } else {
        assignedRoommates.value.push(roommateId);
      }
    };

    const saveBill = async () => {
      if (!editedBill.name.trim() || !editedBill.amount || parseFloat(editedBill.amount) <= 0) {
        return;
      }

      saving.value = true;
      try {
        await axios.put(`${API_URL}/bills/${props.bill.id}`, {
          name: editedBill.name.trim(),
          amount: parseFloat(editedBill.amount),
          due_date: editedBill.due_date || null,
          category: editedBill.category || 'other',
          notes: editedBill.notes ? editedBill.notes.trim() : null,
          roommate_ids: assignedRoommates.value
        });

        emit('bill-updated');
        emit('close');
        emit('notify', { type: 'success', message: 'Bill updated successfully!' });
      } catch (error) {
        console.error('Error updating bill:', error);
        emit('notify', { type: 'error', message: 'Failed to update bill' });
      } finally {
        saving.value = false;
      }
    };

    const toggleBillSettled = async () => {
      try {
        const res = await axios.post(`${API_URL}/bills/${props.bill.id}/toggle-settled`);
        emit('bill-updated');
        emit('notify', {
          type: 'success',
          message: res.data.is_settled ? 'Bill marked as settled!' : 'Bill re-opened as pending.'
        });
      } catch (error) {
        console.error('Error toggling bill settled status:', error);
        emit('notify', { type: 'error', message: 'Failed to update settled status' });
      }
    };

    const deleteBill = async () => {
      try {
        await axios.delete(`${API_URL}/bills/${props.bill.id}`);
        emit('bill-deleted');
        emit('close');
        emit('notify', { type: 'info', message: 'Bill removed.' });
      } catch (error) {
        console.error('Error deleting bill:', error);
        emit('notify', { type: 'error', message: 'Failed to delete bill' });
      }
    };

    return {
      saving,
      showDeleteConfirm,
      editedBill,
      assignedRoommates,
      categoryLabels,
      previewSplit,
      getCategoryIcon,
      toggleRoommate,
      saveBill,
      toggleBillSettled,
      deleteBill
    };
  }
};
</script>

<style scoped>
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
  width: 92%;
  max-width: 520px;
  max-height: 90vh;
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

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.modal-header h3 {
  margin: 0;
  color: #111827;
  font-size: 1.25rem;
}

.badge {
  font-size: 0.72rem;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-settled {
  background: #dcfce7;
  color: #15803d;
}

.badge-pending {
  background: #fef3c7;
  color: #b45309;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.6rem;
  color: #9ca3af;
  cursor: pointer;
  line-height: 1;
}

.close-btn:hover {
  color: #374151;
}

.modal-body {
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 1rem;
}

.form-row {
  display: flex;
  gap: 0.75rem;
}

.flex-1 {
  flex: 1;
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

.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
}

.category-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 0.75rem;
  color: #4b5563;
  transition: all 0.15s ease;
}

.category-btn:hover {
  border-color: #3b82f6;
  background: #f0f7ff;
}

.category-btn.active {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #2563eb;
  font-weight: 600;
}

.roommate-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.35rem;
}

.split-info {
  font-size: 0.8rem;
  font-weight: 600;
  color: #059669;
}

.roommate-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.4rem;
  background: #f9fafb;
}

.roommate-select-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
}

.roommate-select-item.selected {
  border-color: #93c5fd;
  background: #eff6ff;
}

.roommate-select-item input[type="checkbox"] {
  width: auto;
  cursor: pointer;
}

.roommate-select-name {
  flex: 1;
  color: #1f2937;
}

.no-roommates {
  text-align: center;
  padding: 1rem;
  color: #9ca3af;
  font-size: 0.85rem;
  font-style: italic;
}

.settle-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-top: 0.5rem;
}

.settle-desc {
  margin: 0.15rem 0 0 0;
  font-size: 0.75rem;
  color: #6b7280;
}

.modal-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.spacer {
  flex: 1;
}

.delete-confirm-box {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: #ef4444;
  font-weight: 600;
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

.btn-sm {
  padding: 0.35rem 0.65rem;
  font-size: 0.8rem;
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

.btn-outline-success {
  background: white;
  border-color: #10b981;
  color: #059669;
}

.btn-outline-success:hover {
  background: #ecfdf5;
}

.btn-outline-secondary {
  background: white;
  border-color: #d1d5db;
  color: #6b7280;
}

.btn-outline-secondary:hover {
  background: #f3f4f6;
}

/* Dark Mode */
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

:global(.dark-mode) .category-btn {
  background: #111827;
  border-color: #374151;
  color: #9ca3af;
}

:global(.dark-mode) .category-btn.active {
  background: #1e3a5f;
  border-color: #3b82f6;
  color: #60a5fa;
}

:global(.dark-mode) .roommate-list {
  background: #111827;
  border-color: #374151;
}

:global(.dark-mode) .roommate-select-item {
  background: #1f2937;
  border-color: #374151;
}

:global(.dark-mode) .roommate-select-name {
  color: #f9fafb;
}

:global(.dark-mode) .settle-box {
  background: #111827;
  border-color: #374151;
}

:global(.dark-mode) .settle-desc {
  color: #9ca3af;
}

:global(.dark-mode) .btn-secondary {
  background: #374151;
  color: #e5e7eb;
}
</style>