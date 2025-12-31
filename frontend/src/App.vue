<template>
  <div class="app">
    <header class="header">
      <h1>Bill Splitter</h1>
    </header>
    
    <main class="main">
      <div class="panels">
        <div class="collapsible-panel left-panel" :class="{ collapsed: !panelStates.bills }">
          <div class="panel-header-bar" @click="togglePanel('bills')">
            <h2 :class="{ rotated: !panelStates.bills }">Bills</h2>
          </div>
          <div v-show="panelStates.bills" class="panel-content">
            <BillPanel
              :bills="bills"
              @bill-added="handleBillAdded"
              @bill-deleted="handleBillDeleted"
            />
          </div>
        </div>

        <div class="collapsible-panel center-panel" :class="{ collapsed: !panelStates.assignments }">
          <div class="panel-header-bar" @click="togglePanel('assignments')">
            <h2 :class="{ rotated: !panelStates.assignments }">Assignments</h2>
          </div>
          <div v-show="panelStates.assignments" class="panel-content">
            <AssignmentPanel
              :bills="bills"
              :roommates="roommates"
              @assignment-changed="refreshTotals"
            />
          </div>
        </div>

        <div class="collapsible-panel right-panel" :class="{ collapsed: !panelStates.roommates }">
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
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import BillPanel from './components/BillPanel.vue'
import RoommatePanel from './components/RoommatePanel.vue'
import AssignmentPanel from './components/AssignmentPanel.vue'

const API_URL = 'http://localhost:3001/api'

export default {
  name: 'App',
  components: {
    BillPanel,
    RoommatePanel,
    AssignmentPanel
  },
  setup() {
    const bills = ref([])
    const roommates = ref([])
    const roommateTotals = ref([])
    const panelStates = ref({
      bills: true,
      assignments: true,
      roommates: true
    })

    const togglePanel = (panelName) => {
      panelStates.value[panelName] = !panelStates.value[panelName]
    }

    const fetchBills = async () => {
      try {
        const response = await axios.get(`${API_URL}/bills`)
        bills.value = response.data
      } catch (error) {
        console.error('Error fetching bills:', error)
      }
    }

    const fetchRoommates = async () => {
      try {
        const response = await axios.get(`${API_URL}/roommates`)
        roommates.value = response.data
      } catch (error) {
        console.error('Error fetching roommates:', error)
      }
    }

    const fetchTotals = async () => {
      try {
        const response = await axios.get(`${API_URL}/roommates/totals`)
        roommateTotals.value = response.data
      } catch (error) {
        console.error('Error fetching totals:', error)
      }
    }

    const refreshTotals = () => {
      fetchTotals()
    }

    const handleBillAdded = () => {
      fetchBills()
    }

    const handleBillDeleted = () => {
      fetchBills()
      refreshTotals()
    }

    const handleRoommateAdded = (roommateData) => {
      // Optimistic update: add roommate immediately with temporary ID
      const tempId = `temp-${Date.now()}`
      const optimisticRoommate = {
        id: tempId,
        name: roommateData.name,
        is_active: 1,
        _isOptimistic: true
      }

      roommates.value.push(optimisticRoommate)

      // Add to totals with $0.00
      roommateTotals.value.push({
        id: tempId,
        name: roommateData.name,
        total: 0,
        _isOptimistic: true
      })
    }

    const handleRoommateAddedSuccess = (serverData) => {
      // Replace optimistic entry with real data from server
      const optimisticIndex = roommates.value.findIndex(r => r._isOptimistic && r.name === serverData.name)
      if (optimisticIndex !== -1) {
        roommates.value[optimisticIndex] = serverData
      }

      const optimisticTotalIndex = roommateTotals.value.findIndex(r => r._isOptimistic && r.name === serverData.name)
      if (optimisticTotalIndex !== -1) {
        roommateTotals.value[optimisticTotalIndex] = {
          id: serverData.id,
          name: serverData.name,
          total: 0
        }
      }
    }

    const handleRoommateAddedError = (roommateData) => {
      // Rollback: remove optimistic entries on error
      roommates.value = roommates.value.filter(r => !(r._isOptimistic && r.name === roommateData.name))
      roommateTotals.value = roommateTotals.value.filter(r => !(r._isOptimistic && r.name === roommateData.name))
    }

    const handleRoommateDeleted = () => {
      fetchRoommates()
      refreshTotals()
    }

    onMounted(() => {
      fetchBills()
      fetchRoommates()
      fetchTotals()
    })

    return {
      bills,
      roommates,
      roommateTotals,
      panelStates,
      togglePanel,
      handleBillAdded,
      handleBillDeleted,
      handleRoommateAdded,
      handleRoommateAddedSuccess,
      handleRoommateAddedError,
      handleRoommateDeleted,
      refreshTotals
    }
  }
}
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: #2c3e50;
  color: white;
  text-align: center;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header h1 {
  margin: 0;
  font-size: 2rem;
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
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s ease;
  flex: 1;
}

.collapsible-panel.left-panel,
.collapsible-panel.right-panel {
  flex: 0 0 25%;
}

.collapsible-panel.center-panel {
  flex: 0 0 50%;
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
}

.panel-header-bar:hover {
  background: #e9ecef;
}

.panel-header-bar h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #2c3e50;
  transition: transform 0.3s ease;
  white-space: nowrap;
}

.panel-header-bar h2.rotated {
  transform: rotate(90deg);
  writing-mode: vertical-rl;
  text-orientation: mixed;
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