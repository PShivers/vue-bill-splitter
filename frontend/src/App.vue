<template>
  <div class="app" :class="{ 'dark-mode': isDarkMode }">
    <header class="header">
      <h1>Bill Splitter</h1>
      <button
        @click="toggleDarkMode"
        class="dark-mode-toggle"
        :title="isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
      >
        <v-icon size="small">{{
          isDarkMode ? "mdi-white-balance-sunny" : "mdi-moon-waning-crescent"
        }}</v-icon>
      </button>
    </header>

    <main class="main">
      <div class="panels">
        <div
          class="collapsible-panel left-panel"
          :class="{ collapsed: !panelStates.bills }"
        >
          <div class="panel-header-bar" @click="togglePanel('bills')">
            <h2 :class="{ rotated: !panelStates.bills }">Bills</h2>
          </div>
          <div v-show="panelStates.bills" class="panel-content">
            <BillPanel
              :bills="bills"
              @bill-added="handleBillAdded"
              @bill-deleted="handleBillDeleted"
              @bill-clicked="handleBillClicked"
            />
          </div>
        </div>

        <div
          class="collapsible-panel center-panel"
          :class="{ collapsed: !panelStates.calendar }"
        >
          <div class="panel-header-bar" @click="togglePanel('calendar')">
            <h2 :class="{ rotated: !panelStates.calendar }">Calendar</h2>
          </div>
          <div v-show="panelStates.calendar" class="panel-content">
            <CalendarPanel :bills="bills" @bill-clicked="handleBillClicked" />
          </div>
        </div>

        <div
          class="collapsible-panel right-panel"
          :class="{ collapsed: !panelStates.roommates }"
        >
          <div class="panel-header-bar" @click="togglePanel('roommates')">
            <h2 :class="{ rotated: !panelStates.roommates }">Roommates</h2>
          </div>
          <div v-show="panelStates.roommates" class="panel-content">
            <RoommatePanel
              :roommates="roommates"
              :totals="roommateTotals"
              @roommate-added="handleRoommateAdded"
              @roommate-added-success="handleRoommateAddedSuccess"
              @roommate-added-error="handleRoommateAddedError"
              @roommate-deleted="handleRoommateDeleted"
            />
          </div>
        </div>
      </div>
    </main>

    <!-- Edit Bill Modal -->
    <EditBillModal
      :show="showEditBillModal"
      :bill="selectedBill"
      @close="closeEditModal"
      @bill-updated="handleBillUpdated"
      @bill-deleted="handleBillDeletedFromModal"
    />
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import axios from "axios";
import BillPanel from "./components/BillPanel.vue";
import RoommatePanel from "./components/RoommatePanel.vue";
import CalendarPanel from "./components/CalendarPanel.vue";
import EditBillModal from "./components/EditBillModal.vue";

const API_URL = "http://localhost:3001/api";

export default {
  name: "App",
  components: {
    BillPanel,
    RoommatePanel,
    CalendarPanel,
    EditBillModal,
  },
  setup() {
    const bills = ref([]);
    const roommates = ref([]);
    const roommateTotals = ref([]);
    const panelStates = ref({
      bills: true,
      calendar: true,
      roommates: true,
    });

    // Dark mode state - load from localStorage
    const isDarkMode = ref(localStorage.getItem("darkMode") === "true");

    // Edit bill modal state
    const showEditBillModal = ref(false);
    const selectedBill = ref(null);

    const togglePanel = (panelName) => {
      panelStates.value[panelName] = !panelStates.value[panelName];
    };

    const toggleDarkMode = () => {
      isDarkMode.value = !isDarkMode.value;
      localStorage.setItem("darkMode", isDarkMode.value.toString());
    };

    const fetchBills = async () => {
      try {
        const response = await axios.get(`${API_URL}/bills`);
        bills.value = response.data;
      } catch (error) {
        console.error("Error fetching bills:", error);
      }
    };

    const fetchRoommates = async () => {
      try {
        const response = await axios.get(`${API_URL}/roommates`);
        roommates.value = response.data;
      } catch (error) {
        console.error("Error fetching roommates:", error);
      }
    };

    const fetchTotals = async () => {
      try {
        const response = await axios.get(`${API_URL}/roommates/totals`);
        roommateTotals.value = response.data;
      } catch (error) {
        console.error("Error fetching totals:", error);
      }
    };

    const refreshTotals = () => {
      fetchTotals();
    };

    const handleBillAdded = () => {
      fetchBills();
    };

    const handleBillDeleted = () => {
      fetchBills();
      refreshTotals();
    };

    const handleRoommateAdded = (roommateData) => {
      // Optimistic update: add roommate immediately with temporary ID
      const tempId = `temp-${Date.now()}`;
      const optimisticRoommate = {
        id: tempId,
        name: roommateData.name,
        is_active: 1,
        _isOptimistic: true,
      };

      roommates.value.push(optimisticRoommate);

      // Add to totals with $0.00
      roommateTotals.value.push({
        id: tempId,
        name: roommateData.name,
        total: 0,
        _isOptimistic: true,
      });
    };

    const handleRoommateAddedSuccess = (serverData) => {
      // Replace optimistic entry with real data from server
      const optimisticIndex = roommates.value.findIndex(
        (r) => r._isOptimistic && r.name === serverData.name
      );
      if (optimisticIndex !== -1) {
        roommates.value[optimisticIndex] = serverData;
      }

      const optimisticTotalIndex = roommateTotals.value.findIndex(
        (r) => r._isOptimistic && r.name === serverData.name
      );
      if (optimisticTotalIndex !== -1) {
        roommateTotals.value[optimisticTotalIndex] = {
          id: serverData.id,
          name: serverData.name,
          total: 0,
        };
      }
    };

    const handleRoommateAddedError = (roommateData) => {
      // Rollback: remove optimistic entries on error
      roommates.value = roommates.value.filter(
        (r) => !(r._isOptimistic && r.name === roommateData.name)
      );
      roommateTotals.value = roommateTotals.value.filter(
        (r) => !(r._isOptimistic && r.name === roommateData.name)
      );
    };

    const handleRoommateDeleted = () => {
      fetchRoommates();
      refreshTotals();
    };

    const handleBillClicked = (bill) => {
      selectedBill.value = bill;
      showEditBillModal.value = true;
    };

    const handleBillUpdated = () => {
      fetchBills();
      refreshTotals();
    };

    const handleBillDeletedFromModal = () => {
      fetchBills();
      refreshTotals();
    };

    const closeEditModal = () => {
      showEditBillModal.value = false;
      selectedBill.value = null;
    };

    onMounted(() => {
      fetchBills();
      fetchRoommates();
      fetchTotals();
    });

    return {
      bills,
      roommates,
      roommateTotals,
      panelStates,
      isDarkMode,
      showEditBillModal,
      selectedBill,
      togglePanel,
      toggleDarkMode,
      handleBillAdded,
      handleBillDeleted,
      handleRoommateAdded,
      handleRoommateAddedSuccess,
      handleRoommateAddedError,
      handleRoommateDeleted,
      refreshTotals,
      handleBillClicked,
      handleBillUpdated,
      handleBillDeletedFromModal,
      closeEditModal,
    };
  },
};
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  transition: background-color 0.3s ease;
}

.app.dark-mode {
  background: #1a1a1a;
}

.header {
  background: #2c3e50;
  color: white;
  text-align: center;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.dark-mode .header {
  background: #1e1e1e;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.header h1 {
  margin: 0;
  font-size: 2rem;
}

.dark-mode-toggle {
  position: absolute;
  right: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 1.5rem;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.dark-mode-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.main {
  flex: 1;
  padding: 1rem;
}

.panels {
  display: flex;
  gap: 1rem;
  height: calc(100vh - 120px);
}

.collapsible-panel {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  transition: flex 0.3s ease, background-color 0.3s ease, box-shadow 0.3s ease;
}

.dark-mode .collapsible-panel {
  background: #2a2a2a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.collapsible-panel.left-panel,
.collapsible-panel.right-panel {
  flex: 0 0 25%;
}

.collapsible-panel.center-panel {
  flex: 1;
}

.collapsible-panel.collapsed {
  flex: 0 0 50px !important;
  min-width: 50px;
}

.panel-header-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 2px solid #e9ecef;
  cursor: pointer;
  user-select: none;
  min-height: 60px;
  flex: 0 0 auto;
  transition: background-color 0.3s ease;
}

.dark-mode .panel-header-bar {
  background: #333;
  border-bottom: 2px solid #444;
}

.collapsible-panel.collapsed .panel-header-bar {
  flex: 1;
  border-bottom: none;
}

.panel-header-bar:hover {
  background: #e9ecef;
}

.dark-mode .panel-header-bar:hover {
  background: #3a3a3a;
}

.panel-header-bar h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #2c3e50;
  white-space: nowrap;
  transition: color 0.3s ease;
}

.dark-mode .panel-header-bar h2 {
  color: #e0e0e0;
}

.panel-header-bar h2.rotated {
  transform: rotate(-90deg);
  transform-origin: center;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

@media (max-width: 1024px) {
  .panels {
    flex-direction: column;
    height: auto;
  }

  .collapsible-panel.left-panel,
  .collapsible-panel.right-panel,
  .collapsible-panel.center-panel {
    flex: 1 1 auto !important;
  }

  .collapsible-panel.collapsed {
    flex: 0 0 60px !important;
  }

  .center-panel {
    order: 3;
  }
}
</style>
