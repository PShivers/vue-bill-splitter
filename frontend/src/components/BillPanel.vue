<template>
  <div class="bill-panel">
    <!-- Panel Header & Action -->
    <div class="panel-header">
      <button @click="openAddModal" class="btn btn-primary add-bill-btn">
        <v-icon size="small">mdi-plus</v-icon> Add Bill
      </button>
    </div>

    <!-- Search & Filters -->
    <div class="filters-bar">
      <div class="search-box">
        <v-icon size="small" class="search-icon">mdi-magnify</v-icon>
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search bills..."
          aria-label="Search bills"
        />
        <button v-if="searchQuery" @click="searchQuery = ''" class="clear-search">&times;</button>
      </div>

      <div class="filter-chips">
        <button
          class="chip"
          :class="{ active: statusFilter === 'all' }"
          @click="statusFilter = 'all'"
        >
          All ({{ bills.length }})
        </button>
        <button
          class="chip"
          :class="{ active: statusFilter === 'pending' }"
          @click="statusFilter = 'pending'"
        >
          Pending ({{ pendingCount }})
        </button>
        <button
          class="chip"
          :class="{ active: statusFilter === 'settled' }"
          @click="statusFilter = 'settled'"
        >
          Settled ({{ settledCount }})
        </button>

        <select v-model="categoryFilter" class="category-select">
          <option value="all">All Categories</option>
          <option v-for="(label, key) in categoryLabels" :key="key" :value="key">
            {{ label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Bills List -->
    <div class="bills-list">
      <div v-if="filteredBills.length === 0" class="empty-state">
        <v-icon size="large" color="grey">mdi-receipt-text-outline</v-icon>
        <p v-if="bills.length === 0">No bills added yet.</p>
        <p v-else>No bills match your search or filter.</p>
        <button v-if="bills.length === 0" @click="openAddModal" class="btn btn-outline-primary btn-sm mt-2">
          Add Your First Bill
        </button>
      </div>

      <div
        v-for="bill in filteredBills"
        :key="bill.id"
        class="bill-card"
        :class="{ 'bill-settled': bill.is_settled }"
        @click="$emit('bill-clicked', bill)"
      >
        <div class="bill-card-top">
          <div class="category-icon" :class="bill.category || 'other'">
            <v-icon size="small">{{ getCategoryIcon(bill.category) }}</v-icon>
          </div>
          <div class="bill-title-area">
            <h4 class="bill-name">{{ bill.name }}</h4>
            <div class="bill-meta-row">
              <span class="category-tag">{{ getCategoryLabel(bill.category) }}</span>
              <span v-if="bill.due_date" class="due-tag" :class="getDueClass(bill)">
                {{ formatDueTag(bill) }}
              </span>
              <span v-if="bill.is_settled" class="settled-tag">
                <v-icon size="x-small">mdi-check</v-icon> Settled
              </span>
            </div>
          </div>
          <div class="bill-amount-area">
            <span class="bill-amount">${{ bill.amount.toFixed(2) }}</span>
            <span class="split-share" v-if="bill.assignments && bill.assignments.length > 0">
              ${{ (bill.amount / bill.assignments.length).toFixed(2) }} each
            </span>
          </div>
        </div>

        <p v-if="bill.notes" class="bill-notes">{{ bill.notes }}</p>

        <div class="bill-card-bottom">
          <div class="assigned-roommates">
            <span class="assigned-label">Split with:</span>
            <div class="avatar-group" v-if="bill.assignments && bill.assignments.length > 0">
              <div
                v-for="a in bill.assignments"
                :key="a.roommate_id"
                class="mini-avatar"
                :class="{ 'avatar-paid': a.is_paid }"
                :title="`${a.name} (${a.is_paid ? 'Paid' : 'Unpaid'})`"
              >
                {{ getInitials(a.name) }}
              </div>
            </div>
            <span v-else class="no-assigned">No roommates assigned</span>
          </div>
          <v-icon size="small" class="chevron-icon">mdi-chevron-right</v-icon>
        </div>
      </div>
    </div>

    <!-- Add Bill Modal -->
    <div v-if="showAddForm" class="modal-overlay" @click="cancelAdd">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Add New Bill</h3>
          <button @click="cancelAdd" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Bill Name *</label>
            <input
              type="text"
              v-model="newBill.name"
              placeholder="e.g. Electric Bill, Fiber Internet"
              maxlength="100"
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
                v-model="newBill.amount"
                placeholder="0.00"
                required
              />
            </div>
            <div class="form-group flex-1">
              <label>Due Date</label>
              <input type="date" v-model="newBill.due_date" />
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
                :class="{ active: newBill.category === key }"
                @click="newBill.category = key"
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
              v-model="newBill.notes"
              placeholder="e.g. Account #12345 or confirmation note"
            />
          </div>

          <div class="form-group">
            <div class="roommate-header-row">
              <label>Assign to Roommates:</label>
              <div class="selection-shortcuts" v-if="roommates.length > 0">
                <button type="button" @click="selectAllRoommates" class="link-btn">Select All</button>
                <span>·</span>
                <button type="button" @click="assignedRoommates = []" class="link-btn">Clear</button>
              </div>
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
                <span class="split-preview" v-if="previewSplit > 0 && assignedRoommates.includes(roommate.id)">
                  ${{ previewSplit.toFixed(2) }}
                </span>
              </div>
              <div v-if="roommates.length === 0" class="no-roommates">
                No roommates available. Add roommates in the right panel first.
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="cancelAdd" class="btn btn-secondary">Cancel</button>
          <button
            @click="addBill"
            class="btn btn-success"
            :disabled="!newBill.name.trim() || !newBill.amount || Number(newBill.amount) <= 0"
          >
            Create Bill
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed } from 'vue';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export default {
  name: 'BillPanel',
  props: {
    bills: {
      type: Array,
      required: true
    },
    roommates: {
      type: Array,
      required: true
    },
    initialDueDate: {
      type: String,
      default: ''
    }
  },
  emits: ['bill-added', 'bill-deleted', 'bill-clicked', 'notify'],
  setup(props, { emit }) {
    const showAddForm = ref(false);
    const searchQuery = ref('');
    const statusFilter = ref('all');
    const categoryFilter = ref('all');

    const newBill = reactive({
      name: '',
      amount: '',
      due_date: '',
      category: 'utilities',
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
    const getCategoryLabel = (key) => categoryLabels[key] || 'Other';

    const getInitials = (name) => {
      if (!name) return '?';
      return name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    };

    const pendingCount = computed(() => props.bills.filter(b => !b.is_settled).length);
    const settledCount = computed(() => props.bills.filter(b => b.is_settled).length);

    const filteredBills = computed(() => {
      return props.bills.filter(bill => {
        // Status filter
        if (statusFilter.value === 'pending' && bill.is_settled) return false;
        if (statusFilter.value === 'settled' && !bill.is_settled) return false;

        // Category filter
        if (categoryFilter.value !== 'all' && (bill.category || 'other') !== categoryFilter.value) {
          return false;
        }

        // Search query
        if (searchQuery.value.trim()) {
          const q = searchQuery.value.toLowerCase();
          const matchName = bill.name.toLowerCase().includes(q);
          const matchNotes = bill.notes && bill.notes.toLowerCase().includes(q);
          if (!matchName && !matchNotes) return false;
        }

        return true;
      });
    });

    const previewSplit = computed(() => {
      const amt = parseFloat(newBill.amount);
      const count = assignedRoommates.value.length;
      if (amt > 0 && count > 0) {
        return amt / count;
      }
      return 0;
    });

    const selectAllRoommates = () => {
      assignedRoommates.value = props.roommates.map(r => r.id);
    };

    const toggleRoommate = (roommateId) => {
      const index = assignedRoommates.value.indexOf(roommateId);
      if (index > -1) {
        assignedRoommates.value.splice(index, 1);
      } else {
        assignedRoommates.value.push(roommateId);
      }
    };

    const openAddModal = (defaultDate = '') => {
      newBill.name = '';
      newBill.amount = '';
      newBill.due_date = typeof defaultDate === 'string' && defaultDate ? defaultDate : '';
      newBill.category = 'utilities';
      newBill.notes = '';
      // Default: select all active roommates
      assignedRoommates.value = props.roommates.map(r => r.id);
      showAddForm.value = true;
    };

    const cancelAdd = () => {
      showAddForm.value = false;
    };

    const addBill = async () => {
      if (!newBill.name.trim() || !newBill.amount || parseFloat(newBill.amount) <= 0) {
        return;
      }

      try {
        await axios.post(`${API_URL}/bills`, {
          name: newBill.name.trim(),
          amount: parseFloat(newBill.amount),
          due_date: newBill.due_date || null,
          category: newBill.category || 'other',
          notes: newBill.notes ? newBill.notes.trim() : null,
          roommate_ids: assignedRoommates.value
        });

        showAddForm.value = false;
        emit('bill-added');
        emit('notify', {
          type: 'success',
          message: `Bill "${newBill.name.trim()}" created successfully!`
        });
      } catch (error) {
        console.error('Error adding bill:', error);
        emit('notify', { type: 'error', message: 'Failed to create bill' });
      }
    };

    const getDueClass = (bill) => {
      if (!bill.due_date || bill.is_settled) return '';
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const parts = bill.due_date.split('-');
      const due = new Date(parts[0], parts[1] - 1, parts[2]);
      due.setHours(0, 0, 0, 0);

      const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return 'overdue';
      if (diffDays <= 3) return 'due-soon';
      return '';
    };

    const formatDueTag = (bill) => {
      if (!bill.due_date) return '';
      const parts = bill.due_date.split('-');
      const due = new Date(parts[0], parts[1] - 1, parts[2]);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      due.setHours(0, 0, 0, 0);

      const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return `Overdue (${Math.abs(diffDays)}d)`;
      if (diffDays === 0) return 'Due Today';
      if (diffDays === 1) return 'Due Tomorrow';
      if (diffDays <= 7) return `Due in ${diffDays}d`;
      return due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    return {
      showAddForm,
      searchQuery,
      statusFilter,
      categoryFilter,
      newBill,
      assignedRoommates,
      categoryLabels,
      pendingCount,
      settledCount,
      filteredBills,
      previewSplit,
      getCategoryIcon,
      getCategoryLabel,
      getInitials,
      selectAllRoommates,
      toggleRoommate,
      openAddModal,
      cancelAdd,
      addBill,
      getDueClass,
      formatDueTag
    };
  }
};
</script>

<style scoped>
.bill-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  margin-bottom: 0.75rem;
}

.add-bill-btn {
  width: 100%;
  justify-content: center;
}

/* Filters */
.filters-bar {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.65rem;
  color: #9ca3af;
  pointer-events: none;
}

.search-box input {
  width: 100%;
  padding: 0.5rem 2rem 0.5rem 2rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.85rem;
  background: white;
  color: #111827;
}

.search-box input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

.clear-search {
  position: absolute;
  right: 0.6rem;
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 1.1rem;
  cursor: pointer;
}

.filter-chips {
  display: flex;
  gap: 0.35rem;
  overflow-x: auto;
  align-items: center;
}

.chip {
  padding: 0.3rem 0.65rem;
  border-radius: 9999px;
  border: 1px solid #e5e7eb;
  background: white;
  font-size: 0.75rem;
  color: #4b5563;
  cursor: pointer;
  white-space: nowrap;
  font-weight: 500;
  transition: all 0.15s ease;
}

.chip:hover {
  background: #f3f4f6;
}

.chip.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.category-select {
  padding: 0.28rem 0.5rem;
  border-radius: 9999px;
  border: 1px solid #e5e7eb;
  background: white;
  font-size: 0.75rem;
  color: #4b5563;
  margin-left: auto;
}

/* Bills list */
.bills-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.bill-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.bill-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.12);
  transform: translateY(-1px);
}

.bill-card.bill-settled {
  background: #fcfdfd;
  opacity: 0.85;
}

.bill-card-top {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
}

.category-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #e0f2fe;
  color: #0284c7;
}

.category-icon.rent { background: #fee2e2; color: #dc2626; }
.category-icon.utilities { background: #fef3c7; color: #d97706; }
.category-icon.electricity { background: #fef08a; color: #ca8a04; }
.category-icon.water { background: #e0f2fe; color: #0284c7; }
.category-icon.internet { background: #ede9fe; color: #7c3aed; }
.category-icon.groceries { background: #dcfce7; color: #16a34a; }
.category-icon.entertainment { background: #fce7f3; color: #db2777; }

.bill-title-area {
  flex: 1;
  overflow: hidden;
}

.bill-name {
  margin: 0 0 0.25rem 0;
  font-size: 0.95rem;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bill-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
}

.category-tag {
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  background: #f3f4f6;
  color: #4b5563;
  font-weight: 500;
}

.due-tag {
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  background: #eff6ff;
  color: #2563eb;
  font-weight: 500;
}

.due-tag.due-soon {
  background: #fef3c7;
  color: #b45309;
  font-weight: 600;
}

.due-tag.overdue {
  background: #fee2e2;
  color: #b91c1c;
  font-weight: 600;
}

.settled-tag {
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  background: #dcfce7;
  color: #15803d;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.1rem;
}

.bill-amount-area {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.bill-amount {
  font-size: 1.1rem;
  font-weight: 700;
  color: #111827;
}

.split-share {
  font-size: 0.72rem;
  color: #6b7280;
}

.bill-notes {
  margin: 0.4rem 0 0 0;
  font-size: 0.8rem;
  color: #6b7280;
  background: #f9fafb;
  padding: 0.35rem 0.5rem;
  border-radius: 4px;
}

.bill-card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.65rem;
  padding-top: 0.5rem;
  border-top: 1px dashed #f3f4f6;
}

.assigned-roommates {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.assigned-label {
  font-size: 0.72rem;
  color: #9ca3af;
}

.avatar-group {
  display: flex;
  margin-left: 0.2rem;
}

.mini-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
  border: 1.5px solid white;
  margin-left: -5px;
}

.mini-avatar:first-child {
  margin-left: 0;
}

.mini-avatar.avatar-paid {
  background: #10b981;
}

.no-assigned {
  font-size: 0.72rem;
  color: #9ca3af;
  font-style: italic;
}

.chevron-icon {
  color: #9ca3af;
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

.modal-header h3 {
  margin: 0;
  color: #111827;
  font-size: 1.25rem;
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

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  background: white;
  color: #111827;
}

.form-group input:focus,
.form-group select:focus {
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

.selection-shortcuts {
  display: flex;
  gap: 0.35rem;
  font-size: 0.75rem;
}

.link-btn {
  background: none;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  padding: 0;
  font-size: 0.75rem;
}

.link-btn:hover {
  text-decoration: underline;
}

.roommate-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 170px;
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

.split-preview {
  font-weight: 600;
  color: #059669;
  font-size: 0.8rem;
}

.no-roommates {
  text-align: center;
  padding: 1rem;
  color: #9ca3af;
  font-size: 0.85rem;
  font-style: italic;
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

.btn-sm {
  padding: 0.35rem 0.65rem;
  font-size: 0.8rem;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-outline-primary {
  background: white;
  border-color: #3b82f6;
  color: #3b82f6;
}

.btn-outline-primary:hover {
  background: #eff6ff;
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

.mt-2 {
  margin-top: 0.5rem;
}

/* Dark Mode */
:global(.dark-mode) .bill-card {
  background: #1f2937;
  border-color: #374151;
}

:global(.dark-mode) .bill-card.bill-settled {
  background: #17202e;
}

:global(.dark-mode) .bill-name {
  color: #f9fafb;
}

:global(.dark-mode) .bill-amount {
  color: #f9fafb;
}

:global(.dark-mode) .search-box input,
:global(.dark-mode) .chip,
:global(.dark-mode) .category-select {
  background: #1f2937;
  border-color: #374151;
  color: #f9fafb;
}

:global(.dark-mode) .chip.active {
  background: #3b82f6;
  color: white;
}

:global(.dark-mode) .category-tag {
  background: #374151;
  color: #e5e7eb;
}

:global(.dark-mode) .bill-notes {
  background: #111827;
  color: #9ca3af;
}

:global(.dark-mode) .bill-card-bottom {
  border-top-color: #374151;
}

:global(.dark-mode) .mini-avatar {
  border-color: #1f2937;
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

:global(.dark-mode) .form-group input,
:global(.dark-mode) .form-group select {
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

:global(.dark-mode) .btn-secondary {
  background: #374151;
  color: #e5e7eb;
}
</style>