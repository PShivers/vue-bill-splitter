<template>
  <div class="app">
    <header class="header">
      <h1>Bill Splitter</h1>
    </header>
    
    <main class="main">
      <div class="panels">
        <BillPanel 
          class="left-panel" 
          :bills="bills" 
          @bill-added="handleBillAdded"
          @bill-deleted="handleBillDeleted"
        />
        
        <AssignmentPanel 
          class="center-panel"
          :bills="bills"
          :roommates="roommates"
          @assignment-changed="refreshTotals"
        />
        
        <RoommatePanel 
          class="right-panel"
          :roommates="roommates"
          :totals="roommateTotals"
          @roommate-added="handleRoommateAdded"
          @roommate-deleted="handleRoommateDeleted"
        />
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

    const handleRoommateAdded = () => {
      fetchRoommates()
      refreshTotals()
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
      handleBillAdded,
      handleBillDeleted,
      handleRoommateAdded,
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
  display: grid;
  grid-template-columns: 1fr 300px 1fr;
  gap: 1rem;
  height: calc(100vh - 120px);
}

.left-panel,
.right-panel,
.center-panel {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 1rem;
  overflow-y: auto;
}

@media (max-width: 1024px) {
  .panels {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
    height: auto;
  }
  
  .center-panel {
    order: 3;
  }
}
</style>