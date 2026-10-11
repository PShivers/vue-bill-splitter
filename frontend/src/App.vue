<template>
  <div class="app" :class="{ 'dark-mode': isDarkMode }">
    <!-- Header with Stats -->
    <header class="header">
      <div class="brand">
        <div class="brand-icon">
          <v-icon size="default">mdi-handshake-outline</v-icon>
        </div>
        <div>
          <h1>Bill Splitter</h1>
          <span class="brand-tagline">Roommate Expense & Share Manager</span>
        </div>
      </div>

      <!-- Quick KPI Chips -->
      <div class="stats-bar" v-if="stats">
        <div class="kpi-chip" title="Total active household bills">
          <span class="kpi-label">Bills</span>
          <span class="kpi-val">{{ stats.total_bills }}</span>
        </div>
        <div class="kpi-chip" title="Total sum of household bills">
          <span class="kpi-label">Total</span>
          <span class="kpi-val">${{ stats.total_amount.toFixed(0) }}</span>
        </div>
        <div class="kpi-chip kpi-owed" title="Total unpaid shares across all roommates">
          <span class="kpi-label">Unsettled</span>
          <span class="kpi-val">${{ stats.total_outstanding.toFixed(0) }}</span>
        </div>
        <div class="kpi-chip kpi-paid" title="Total settled shares across all roommates">
          <span class="kpi-label">Settled</span>
          <span class="kpi-val">${{ stats.total_settled.toFixed(0) }}</span>
        </div>
        <div class="kpi-chip kpi-urgent" v-if="stats.due_soon_count > 0" title="Bills due in the next 7 days">
          <span class="kpi-label">Due Soon</span>
          <span class="kpi-val">{{ stats.due_soon_count }}</span>
        </div>
      </div>

      <div class="header-actions">
        <button
          @click="toggleDarkMode"
          class="dark-mode-toggle"
          :title="isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
        >
          <v-icon size="small">
            {{ isDarkMode ? 'mdi-white-balance-sunny' : 'mdi-moon-waning-crescent' }}
          </v-icon>
        </button>
      </div>
    </header>

    <!-- Global Toast Container -->
    <ToastNotification :toasts="toasts" @dismiss="dismissToast" />

    <!-- Main Content Panels -->
    <main class="main">
      <div class="panels">
        <!-- Bills Panel (Left) -->
        <div
          class="collapsible-panel left-panel"
          :class="{ collapsed: !panelStates.bills }"
        >
          <div class="panel-header-bar" @click="togglePanel('bills')">
            <div class="panel-title-group" :class="{ rotated: !panelStates.bills }">
              <v-icon size="small">mdi-receipt-text-outline</v-icon>
              <h2>Bills</h2>
              <span class="count-badge" v-if="panelStates.bills">({{ bills.length }})</span>
            </div>
            <v-icon size="small" class="collapse-icon">
              {{ panelStates.bills ? 'mdi-chevron-left' : 'mdi-chevron-right' }}
            </v-icon>
          </div>
          <div v-show="panelStates.bills" class="panel-content">
            <BillPanel
              ref="billPanelRef"
              :bills="bills"
              :roommates="roommates"
              @bill-added="handleBillAdded"
              @bill-deleted="handleBillDeleted"
              @bill-clicked="handleBillClicked"
              @notify="addToast"
            />
          </div>
        </div>

        <!-- Calendar Panel (Center) -->
        <div
          class="collapsible-panel center-panel"
          :class="{ collapsed: !panelStates.calendar }"
        >
          <div class="panel-header-bar" @click="togglePanel('calendar')">
            <div class="panel-title-group" :class="{ rotated: !panelStates.calendar }">
              <v-icon size="small">mdi-calendar-month-outline</v-icon>
              <h2>Calendar</h2>
            </div>
            <v-icon size="small" class="collapse-icon">
              {{ panelStates.calendar ? 'mdi-chevron-down' : 'mdi-chevron-up' }}
            </v-icon>
          </div>
          <div v-show="panelStates.calendar" class="panel-content">
            <CalendarPanel
              :bills="bills"
              @bill-clicked="handleBillClicked"
              @date-clicked="handleDateClicked"
            />
          </div>
        </div>

        <!-- Roommates Panel (Right) -->
        <div
          class="collapsible-panel right-panel"
          :class="{ collapsed: !panelStates.roommates }"
        >
          <div class="panel-header-bar" @click="togglePanel('roommates')">
            <div class="panel-title-group" :class="{ rotated: !panelStates.roommates }">
              <v-icon size="small">mdi-account-group-outline</v-icon>
              <h2>Roommates</h2>
              <span class="count-badge" v-if="panelStates.roommates">({{ roommates.length }})</span>
            </div>
            <v-icon size="small" class="collapse-icon">
              {{ panelStates.roommates ? 'mdi-chevron-right' : 'mdi-chevron-left' }}
            </v-icon>
          </div>
          <div v-show="panelStates.roommates" class="panel-content">
            <RoommatePanel
              :roommates="roommates"
              :totals="roommateTotals"
              @roommate-added="handleRoommateAdded"
              @roommate-added-success="handleRoommateAddedSuccess"
              @roommate-added-error="handleRoommateAddedError"
              @roommate-deleted="handleRoommateDeleted"
              @refresh-totals="refreshAllData"
              @notify="addToast"
            />
          </div>
        </div>
      </div>
    </main>

    <!-- Edit Bill Modal -->
    <EditBillModal
      :show="showEditBillModal"
      :bill="selectedBill"
      :roommates="roommates"
      @close="closeEditModal"
      @bill-updated="handleBillUpdated"
      @bill-deleted="handleBillDeleted"
      @notify="addToast"
    />
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import BillPanel from './components/BillPanel.vue';
import RoommatePanel from './components/RoommatePanel.vue';
import CalendarPanel from './components/CalendarPanel.vue';
import EditBillModal from './components/EditBillModal.vue';
import ToastNotification from './components/ToastNotification.vue';

const API_URL = 'http://localhost:3001/api';

export default {
  name: 'App',
  components: {
    BillPanel,
    RoommatePanel,
    CalendarPanel,
    EditBillModal,
    ToastNotification
  },
  setup() {
    const bills = ref([]);
    const roommates = ref([]);
    const roommateTotals = ref([]);
    const stats = ref(null);

    const billPanelRef = ref(null);

    const panelStates = ref({
      bills: true,
      calendar: true,
      roommates: true
    });

    const isDarkMode = ref(localStorage.getItem('darkMode') === 'true');
    const showEditBillModal = ref(false);
    const selectedBill = ref(null);

    // Toast stack
    const toasts = ref([]);
    let toastCounter = 0;

    const addToast = ({ type = 'info', message }) => {
      const id = ++toastCounter;
      toasts.value.push({ id, type, message });
      setTimeout(() => {
        dismissToast(id);
      }, 3500);
    };

    const dismissToast = (id) => {
      toasts.value = toasts.value.filter(t => t.id !== id);
    };

    const togglePanel = (panelName) => {
      panelStates.value[panelName] = !panelStates.value[panelName];
    };

    const toggleDarkMode = () => {
      isDarkMode.value = !isDarkMode.value;
      localStorage.setItem('darkMode', isDarkMode.value.toString());
    };

    const fetchBills = async () => {
      try {
        const response = await axios.get(`${API_URL}/bills`);
        bills.value = response.data;
      } catch (error) {
        console.error('Error fetching bills:', error);
      }
    };

    const fetchRoommates = async () => {
      try {
        const response = await axios.get(`${API_URL}/roommates`);
        roommates.value = response.data;
      } catch (error) {
        console.error('Error fetching roommates:', error);
      }
    };

    const fetchTotals = async () => {
      try {
        const response = await axios.get(`${API_URL}/roommates/totals`);
        roommateTotals.value = response.data;
      } catch (error) {
        console.error('Error fetching totals:', error);
      }
    };

    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_URL}/stats`);
        stats.value = response.data;
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    const refreshAllData = () => {
      fetchBills();
      fetchRoommates();
      fetchTotals();
      fetchStats();
    };

    const handleBillAdded = () => {
      refreshAllData();
    };

    const handleBillDeleted = () => {
      refreshAllData();
    };

    const handleBillUpdated = () => {
      refreshAllData();
    };

    const handleRoommateAdded = (roommateData) => {
      const tempId = `temp-${Date.now()}`;
      roommates.value.push({
        id: tempId,
        name: roommateData.name,
        email: roommateData.email,
        is_active: 1,
        _isOptimistic: true
      });
      roommateTotals.value.push({
        id: tempId,
        name: roommateData.name,
        total_owed: 0,
        total_paid: 0,
        total: 0,
        _isOptimistic: true
      });
    };

    const handleRoommateAddedSuccess = (serverData) => {
      const idx = roommates.value.findIndex(r => r._isOptimistic && r.name === serverData.name);
      if (idx !== -1) {
        roommates.value[idx] = serverData;
      }
      refreshAllData();
    };

    const handleRoommateAddedError = (roommateData) => {
      roommates.value = roommates.value.filter(
        r => !(r._isOptimistic && r.name === roommateData.name)
      );
      roommateTotals.value = roommateTotals.value.filter(
        r => !(r._isOptimistic && r.name === roommateData.name)
      );
    };

    const handleRoommateDeleted = () => {
      refreshAllData();
    };

    const handleBillClicked = (bill) => {
      selectedBill.value = bill;
      showEditBillModal.value = true;
    };

    const handleDateClicked = (isoDate) => {
      // Open add bill modal with that date pre-filled
      if (billPanelRef.value && billPanelRef.value.openAddModal) {
        if (!panelStates.value.bills) {
          panelStates.value.bills = true;
        }
        billPanelRef.value.openAddModal(isoDate);
      }
    };

    const closeEditModal = () => {
      showEditBillModal.value = false;
      selectedBill.value = null;
    };

    onMounted(() => {
      refreshAllData();
    });

    return {
      bills,
      roommates,
      roommateTotals,
      stats,
      panelStates,
      isDarkMode,
      showEditBillModal,
      selectedBill,
      billPanelRef,
      toasts,
      addToast,
      dismissToast,
      togglePanel,
      toggleDarkMode,
      refreshAllData,
      handleBillAdded,
      handleBillDeleted,
      handleBillUpdated,
      handleRoommateAdded,
      handleRoommateAddedSuccess,
      handleRoommateAddedError,
      handleRoommateDeleted,
      handleBillClicked,
      handleDateClicked,
      closeEditModal
    };
  }
};
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f3f4f6;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #111827;
  transition: background-color 0.25s ease, color 0.25s ease;
}

.app.dark-mode {
  background: #0f172a;
  color: #f1f5f9;
}

/* Header */
.header {
  background: #1e293b;
  color: white;
  padding: 0.75rem 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 10;
}

.dark-mode .header {
  background: #090d16;
  border-bottom: 1px solid #1e293b;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-icon {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.brand h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.brand-tagline {
  font-size: 0.72rem;
  color: #94a3b8;
  display: block;
}

.stats-bar {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.kpi-chip {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 9999px;
  font-size: 0.75rem;
}

.kpi-label {
  color: #94a3b8;
  font-weight: 500;
  text-transform: uppercase;
  font-size: 0.65rem;
  letter-spacing: 0.04em;
}

.kpi-val {
  font-weight: 700;
  color: white;
}

.kpi-chip.kpi-owed .kpi-val {
  color: #f87171;
}

.kpi-chip.kpi-paid .kpi-val {
  color: #34d399;
}

.kpi-chip.kpi-urgent {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
}

.kpi-chip.kpi-urgent .kpi-val {
  color: #fca5a5;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dark-mode-toggle {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.dark-mode-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

/* Panels */
.main {
  flex: 1;
  padding: 0.75rem 1rem;
}

.panels {
  display: flex;
  gap: 0.75rem;
  height: calc(100vh - 100px);
}

.collapsible-panel {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: flex 0.25s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.25s ease;
  border: 1px solid #e5e7eb;
}

.dark-mode .collapsible-panel {
  background: #1e293b;
  border-color: #334155;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}

.collapsible-panel.left-panel {
  flex: 0 0 28%;
  min-width: 280px;
}

.collapsible-panel.center-panel {
  flex: 1;
  min-width: 340px;
}

.collapsible-panel.right-panel {
  flex: 0 0 26%;
  min-width: 260px;
}

.collapsible-panel.collapsed {
  flex: 0 0 48px !important;
  min-width: 48px !important;
}

.panel-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  cursor: pointer;
  user-select: none;
  min-height: 50px;
  flex: 0 0 auto;
  transition: background-color 0.2s ease;
}

.dark-mode .panel-header-bar {
  background: #0f172a;
  border-bottom-color: #334155;
}

.panel-header-bar:hover {
  background: #f1f5f9;
}

.dark-mode .panel-header-bar:hover {
  background: #172554;
}

.collapsible-panel.collapsed .panel-header-bar {
  flex: 1;
  border-bottom: none;
  justify-content: center;
  padding: 0.5rem;
}

.panel-title-group {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: #1e293b;
}

.dark-mode .panel-title-group {
  color: #f1f5f9;
}

.panel-title-group h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.count-badge {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 600;
}

.panel-title-group.rotated {
  transform: rotate(-90deg);
  white-space: nowrap;
}

.collapsible-panel.collapsed .collapse-icon {
  display: none;
}

.collapse-icon {
  color: #94a3b8;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 0.85rem;
}

/* Responsive */
@media (max-width: 1024px) {
  .header {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .stats-bar {
    order: 3;
    width: 100%;
    overflow-x: auto;
    padding-top: 0.25rem;
  }

  .panels {
    flex-direction: column;
    height: auto;
  }

  .collapsible-panel.left-panel,
  .collapsible-panel.right-panel,
  .collapsible-panel.center-panel {
    flex: 1 1 auto !important;
    min-width: 0 !important;
  }

  .collapsible-panel.collapsed {
    flex: 0 0 50px !important;
  }

  .center-panel {
    order: 3;
  }
}
</style>