<template>
  <div v-if="show && roommate" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <div class="roommate-header-info">
          <div class="roommate-avatar">{{ getInitials(roommate.name) }}</div>
          <div>
            <h3>{{ roommate.name }}</h3>
            <p v-if="roommate.email" class="roommate-email">{{ roommate.email }}</p>
          </div>
        </div>
        <button @click="$emit('close')" class="close-btn" aria-label="Close">&times;</button>
      </div>

      <!-- Balance Summary Bar -->
      <div class="balance-bar">
        <div class="balance-card owed">
          <span class="balance-label">Outstanding Owed</span>
          <span class="balance-value">${{ currentTotals.owed.toFixed(2) }}</span>
        </div>
        <div class="balance-card paid">
          <span class="balance-label">Total Settled</span>
          <span class="balance-value">${{ currentTotals.paid.toFixed(2) }}</span>
        </div>
      </div>

      <div class="modal-body">
        <div class="section-header">
          <h4>Assigned Bills & Shares</h4>
          <button
            v-if="hasUnpaidShares"
            @click="settleAllShares"
            class="btn btn-outline-success btn-sm"
            :disabled="loading"
          >
            <v-icon size="small">mdi-check-all</v-icon> Settle All Unpaid
          </button>
        </div>

        <div v-if="loading" class="loading-state">
          <v-icon class="spinner">mdi-loading</v-icon>
          <span>Loading bill breakdown...</span>
        </div>

        <div v-else-if="breakdown.length === 0" class="empty-state">
          <v-icon size="large" color="grey">mdi-receipt-text-outline</v-icon>
          <p>No bills are currently assigned to {{ roommate.name }}.</p>
        </div>

        <div v-else class="breakdown-list">
          <div
            v-for="item in breakdown"
            :key="item.bill_id"
            class="breakdown-item"
            :class="{ 'item-paid': item.is_paid }"
          >
            <div class="item-left">
              <div class="category-icon-wrapper" :class="item.category || 'other'">
                <v-icon size="small">{{ getCategoryIcon(item.category) }}</v-icon>
              </div>
              <div class="item-details">
                <div class="item-title-row">
                  <span class="item-name">{{ item.bill_name }}</span>
                  <span class="badge" :class="item.is_paid ? 'badge-paid' : 'badge-unpaid'">
                    {{ item.is_paid ? 'Paid' : 'Unpaid' }}
                  </span>
                </div>
                <div class="item-meta">
                  <span v-if="item.due_date" class="meta-date">
                    Due: {{ formatDate(item.due_date) }}
                  </span>
                  <span class="meta-split">
                    Split {{ item.split_count }}-way (Total: ${{ item.total_amount.toFixed(2) }})
                  </span>
                </div>
              </div>
            </div>

            <div class="item-right">
              <div class="share-amount">
                ${{ item.share_amount.toFixed(2) }}
              </div>
              <button
                @click="toggleSharePaid(item)"
                class="btn btn-sm"
                :class="item.is_paid ? 'btn-outline-secondary' : 'btn-success'"
                :title="item.is_paid ? 'Mark share as unpaid' : 'Mark share as paid'"
              >
                <v-icon size="small">
                  {{ item.is_paid ? 'mdi-undo' : 'mdi-check' }}
                </v-icon>
                <span>{{ item.is_paid ? 'Unsettle' : 'Mark Paid' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="$emit('close')" class="btn btn-secondary">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export default {
  name: 'RoommateDetailModal',
  props: {
    show: {
      type: Boolean,
      required: true
    },
    roommate: {
      type: Object,
      default: null
    }
  },
  emits: ['close', 'share-updated', 'notify'],
  setup(props, { emit }) {
    const loading = ref(false);
    const breakdown = ref([]);

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

    const getCategoryIcon = (category) => {
      return categoryIcons[category] || categoryIcons.other;
    };

    const getInitials = (name) => {
      if (!name) return '?';
      return name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    };

    const loadBreakdown = async () => {
      if (!props.roommate || !props.roommate.id) return;
      loading.value = true;
      try {
        const response = await axios.get(`${API_URL}/roommates/${props.roommate.id}/breakdown`);
        breakdown.value = response.data;
      } catch (error) {
        console.error('Error loading roommate breakdown:', error);
        emit('notify', { type: 'error', message: 'Failed to load roommate bills' });
      } finally {
        loading.value = false;
      }
    };

    watch(
      () => [props.show, props.roommate?.id],
      ([show, id]) => {
        if (show && id) {
          loadBreakdown();
        }
      },
      { immediate: true }
    );

    const currentTotals = computed(() => {
      let owed = 0;
      let paid = 0;
      for (const item of breakdown.value) {
        if (item.is_paid) {
          paid += item.share_amount;
        } else {
          owed += item.share_amount;
        }
      }
      return { owed, paid };
    });

    const hasUnpaidShares = computed(() => {
      return breakdown.value.some(item => !item.is_paid);
    });

    const toggleSharePaid = async (item) => {
      try {
        await axios.post(
          `${API_URL}/bills/${item.bill_id}/assignments/${props.roommate.id}/toggle-paid`
        );
        const action = item.is_paid ? 'marked unpaid' : 'settled';
        emit('notify', {
          type: 'success',
          message: `${item.bill_name} share ($${item.share_amount.toFixed(2)}) ${action}`
        });
        await loadBreakdown();
        emit('share-updated');
      } catch (error) {
        console.error('Error toggling share payment:', error);
        emit('notify', { type: 'error', message: 'Failed to update share status' });
      }
    };

    const settleAllShares = async () => {
      const unpaid = breakdown.value.filter(item => !item.is_paid);
      if (unpaid.length === 0) return;

      loading.value = true;
      try {
        for (const item of unpaid) {
          await axios.post(
            `${API_URL}/bills/${item.bill_id}/assignments/${props.roommate.id}/toggle-paid`
          );
        }
        emit('notify', {
          type: 'success',
          message: `All shares for ${props.roommate.name} settled successfully!`
        });
        await loadBreakdown();
        emit('share-updated');
      } catch (error) {
        console.error('Error settling all shares:', error);
        emit('notify', { type: 'error', message: 'Failed to settle all shares' });
      } finally {
        loading.value = false;
      }
    };

    const formatDate = (dateString) => {
      if (!dateString) return '';
      const parts = dateString.split('-');
      if (parts.length === 3) {
        return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric'
        });
      }
      return new Date(dateString).toLocaleDateString();
    };

    return {
      loading,
      breakdown,
      currentTotals,
      hasUnpaidShares,
      getCategoryIcon,
      getInitials,
      toggleSharePaid,
      settleAllShares,
      formatDate
    };
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(3px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  width: 92%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.25s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.roommate-header-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.roommate-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.3rem;
  color: #111827;
}

.roommate-email {
  margin: 0;
  font-size: 0.85rem;
  color: #6b7280;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.75rem;
  color: #9ca3af;
  cursor: pointer;
  line-height: 1;
}

.close-btn:hover {
  color: #374151;
}

.balance-bar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.balance-card {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.balance-card.owed {
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.balance-card.owed .balance-value {
  color: #dc2626;
}

.balance-card.paid {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
}

.balance-card.paid .balance-value {
  color: #059669;
}

.balance-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  color: #6b7280;
}

.balance-value {
  font-size: 1.3rem;
  font-weight: 700;
}

.modal-body {
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h4 {
  margin: 0;
  font-size: 1rem;
  color: #374151;
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.85rem 1rem;
  border-radius: 8px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.breakdown-item:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.breakdown-item.item-paid {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.item-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.category-icon-wrapper {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e0f2fe;
  color: #0284c7;
}

.category-icon-wrapper.rent { background: #fee2e2; color: #dc2626; }
.category-icon-wrapper.utilities { background: #fef3c7; color: #d97706; }
.category-icon-wrapper.electricity { background: #fef08a; color: #ca8a04; }
.category-icon-wrapper.water { background: #e0f2fe; color: #0284c7; }
.category-icon-wrapper.internet { background: #ede9fe; color: #7c3aed; }
.category-icon-wrapper.groceries { background: #dcfce7; color: #16a34a; }
.category-icon-wrapper.entertainment { background: #fce7f3; color: #db2777; }

.item-details {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.item-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.item-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.95rem;
}

.badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-paid {
  background: #dcfce7;
  color: #15803d;
}

.badge-unpaid {
  background: #fee2e2;
  color: #b91c1c;
}

.item-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.78rem;
  color: #6b7280;
}

.item-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.share-amount {
  font-size: 1.15rem;
  font-weight: 700;
  color: #111827;
  text-align: right;
  min-width: 60px;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 2.5rem 1rem;
  color: #6b7280;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.spinner {
  animation: spin 1s linear infinite;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.2s ease;
}

.btn-sm {
  padding: 0.35rem 0.7rem;
  font-size: 0.8rem;
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;
}

.btn-secondary:hover {
  background: #d1d5db;
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover {
  background: #059669;
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
  color: #374151;
}

/* Dark Mode Overrides */
:global(.dark-mode) .modal-content {
  background: #1f2937;
  color: #f3f4f6;
}

:global(.dark-mode) .modal-header,
:global(.dark-mode) .balance-bar,
:global(.dark-mode) .modal-footer {
  border-color: #374151;
  background: #111827;
}

:global(.dark-mode) .modal-header h3 {
  color: #f9fafb;
}

:global(.dark-mode) .section-header h4 {
  color: #e5e7eb;
}

:global(.dark-mode) .balance-card.owed {
  background: #451a1a;
  border-color: #7f1d1d;
}

:global(.dark-mode) .balance-card.owed .balance-value {
  color: #f87171;
}

:global(.dark-mode) .balance-card.paid {
  background: #064e3b;
  border-color: #047857;
}

:global(.dark-mode) .balance-card.paid .balance-value {
  color: #34d399;
}

:global(.dark-mode) .breakdown-item {
  background: #111827;
  border-color: #374151;
}

:global(.dark-mode) .breakdown-item:hover {
  background: #1e293b;
}

:global(.dark-mode) .breakdown-item.item-paid {
  background: #064e3b;
  border-color: #047857;
}

:global(.dark-mode) .item-name {
  color: #f9fafb;
}

:global(.dark-mode) .share-amount {
  color: #f9fafb;
}

:global(.dark-mode) .btn-secondary {
  background: #374151;
  color: #e5e7eb;
}

:global(.dark-mode) .btn-secondary:hover {
  background: #4b5563;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>