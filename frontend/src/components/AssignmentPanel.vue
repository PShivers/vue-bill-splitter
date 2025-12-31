<template>
  <div class="assignment-panel">
    <div v-if="bills.length === 0 || roommates.length === 0" class="empty-state">
      <p v-if="bills.length === 0">Add some bills first</p>
      <p v-if="roommates.length === 0">Add some roommates first</p>
    </div>
    
    <div v-else class="assignment-controls">
      <div class="form-group">
        <label>Select Bill:</label>
        <select v-model="selectedBillId" @change="loadAssignments">
          <option value="">Choose a bill...</option>
          <option v-for="bill in bills" :key="bill.id" :value="bill.id">
            {{ bill.name }} - ${{ bill.amount.toFixed(2) }}
          </option>
        </select>
      </div>
      
      <div v-if="selectedBillId" class="form-group">
        <label>Select Roommate:</label>
        <select v-model="selectedRoommateId">
          <option value="">Choose a roommate...</option>
          <option v-for="roommate in roommates" :key="roommate.id" :value="roommate.id">
            {{ roommate.name }}
          </option>
        </select>
      </div>
      
      <button 
        v-if="selectedBillId && selectedRoommateId" 
        @click="assignBill" 
        class="btn btn-success"
      >
        Assign Bill
      </button>
    </div>
    
    <!-- Current Assignments -->
    <div v-if="selectedBillId && assignments.length > 0" class="assignments-list">
      <h3>Current Assignments</h3>
      <div class="selected-bill-info">
        <h4>{{ getSelectedBill().name }}</h4>
        <p>Total: ${{ getSelectedBill().amount.toFixed(2) }}</p>
        <p>Per person: ${{ (getSelectedBill().amount / assignments.length).toFixed(2) }}</p>
      </div>
      
      <div class="assignment-item" v-for="assignment in assignments" :key="assignment.id">
        <span class="roommate-name">{{ assignment.roommate_name }}</span>
        <button @click="removeAssignment(assignment.roommate_id)" class="btn btn-danger btn-sm">
          Remove
        </button>
      </div>
    </div>
    
    <div v-else-if="selectedBillId" class="empty-assignments">
      No roommates assigned to this bill yet.
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue'
import axios from 'axios'

const API_URL = 'http://localhost:3001/api'

export default {
  name: 'AssignmentPanel',
  props: {
    bills: {
      type: Array,
      required: true
    },
    roommates: {
      type: Array,
      required: true
    }
  },
  emits: ['assignment-changed'],
  setup(props, { emit }) {
    const selectedBillId = ref('')
    const selectedRoommateId = ref('')
    const assignments = ref([])

    const loadAssignments = async () => {
      if (!selectedBillId.value) {
        assignments.value = []
        return
      }

      try {
        const response = await axios.get(`${API_URL}/bills/${selectedBillId.value}/assignments`)
        assignments.value = response.data
      } catch (error) {
        console.error('Error loading assignments:', error)
        assignments.value = []
      }
    }

    const assignBill = async () => {
      if (!selectedBillId.value || !selectedRoommateId.value) return

      // Check if already assigned
      const alreadyAssigned = assignments.value.some(
        assignment => assignment.roommate_id == selectedRoommateId.value
      )

      if (alreadyAssigned) {
        alert('This roommate is already assigned to this bill')
        return
      }

      try {
        await axios.post(`${API_URL}/bills/${selectedBillId.value}/assign/${selectedRoommateId.value}`)
        selectedRoommateId.value = ''
        await loadAssignments()
        emit('assignment-changed')
      } catch (error) {
        console.error('Error assigning bill:', error)
        alert('Error assigning bill')
      }
    }

    const removeAssignment = async (roommateId) => {
      try {
        await axios.delete(`${API_URL}/bills/${selectedBillId.value}/assign/${roommateId}`)
        await loadAssignments()
        emit('assignment-changed')
      } catch (error) {
        console.error('Error removing assignment:', error)
        alert('Error removing assignment')
      }
    }

    const getSelectedBill = () => {
      return props.bills.find(bill => bill.id == selectedBillId.value) || {}
    }

    // Watch for bill changes and reload assignments
    watch(() => props.bills, () => {
      if (selectedBillId.value) {
        loadAssignments()
      }
    })

    return {
      selectedBillId,
      selectedRoommateId,
      assignments,
      loadAssignments,
      assignBill,
      removeAssignment,
      getSelectedBill
    }
  }
}
</script>

<style scoped>
.assignment-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #eee;
}

.panel-header h2 {
  margin: 0;
  color: #2c3e50;
}

.empty-state {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 2rem;
}

.assignment-controls {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: bold;
  color: #555;
}

.form-group select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
}

.assignments-list {
  flex: 1;
  overflow-y: auto;
}

.assignments-list h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1.2rem;
}

.selected-bill-info {
  background: #e8f5e8;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.selected-bill-info h4 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
}

.selected-bill-info p {
  margin: 0.25rem 0;
  color: #555;
}

.assignment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid #eee;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  background: #fafafa;
}

.roommate-name {
  font-weight: 500;
  color: #2c3e50;
}

.empty-assignments {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 1rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-success {
  background: #27ae60;
  color: white;
  width: 100%;
}

.btn-success:hover {
  background: #219a52;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background: #c0392b;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 12px;
}
</style>