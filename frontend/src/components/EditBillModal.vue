<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Edit Bill</h3>
        <button @click="$emit('close')" class="close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Bill Name:</label>
          <input
            type="text"
            v-model="editedBill.name"
            placeholder="Enter bill name"
            maxlength="50"
            @keyup.enter="saveBill"
          />
        </div>
        <div class="form-group">
          <label>Amount:</label>
          <input
            type="number"
            v-model="editedBill.amount"
            placeholder="0.00"
            min="0.01"
            step="0.01"
            @keyup.enter="saveBill"
          />
        </div>
        <div class="form-group">
          <label>Due Date:</label>
          <input
            type="date"
            v-model="editedBill.due_date"
            @keyup.enter="saveBill"
          />
        </div>
        <div class="form-group">
          <label>Assign to Roommates:</label>
          <div class="roommate-list">
            <div
              v-for="roommate in roommates"
              :key="roommate.id"
              class="roommate-item"
              @click="toggleRoommate(roommate.id)"
            >
              <input
                type="checkbox"
                :checked="assignedRoommates.includes(roommate.id)"
                @click.stop="toggleRoommate(roommate.id)"
              />
              <span>{{ roommate.name }}</span>
            </div>
            <div v-if="roommates.length === 0" class="no-roommates">
              No roommates available. Add roommates first.
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button @click="confirmDelete" class="btn btn-danger">
          <v-icon size="small">mdi-delete</v-icon>
          Delete
        </button>
        <div class="spacer"></div>
        <button @click="$emit('close')" class="btn btn-secondary">Cancel</button>
        <button @click="saveBill" class="btn btn-success">Save Changes</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue'
import axios from 'axios'

const API_URL = 'http://localhost:3001/api'

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
  emits: ['close', 'bill-updated', 'bill-deleted'],
  setup(props, { emit }) {
    const editedBill = ref({
      name: '',
      amount: '',
      due_date: ''
    })
    const assignedRoommates = ref([])

    const loadAssignments = async (billId) => {
      try {
        const response = await axios.get(`${API_URL}/bills/${billId}/assignments`)
        assignedRoommates.value = response.data.map(a => a.roommate_id)
      } catch (error) {
        console.error('Error loading assignments:', error)
        assignedRoommates.value = []
      }
    }

    watch(() => props.bill, (newBill) => {
      if (newBill) {
        editedBill.value = {
          name: newBill.name,
          amount: newBill.amount,
          due_date: newBill.due_date || ''
        }
        loadAssignments(newBill.id)
      }
    }, { immediate: true })

    const toggleRoommate = (roommateId) => {
      const index = assignedRoommates.value.indexOf(roommateId)
      if (index > -1) {
        assignedRoommates.value.splice(index, 1)
      } else {
        assignedRoommates.value.push(roommateId)
      }
    }

    const saveBill = async () => {
      if (!editedBill.value.name.trim() || !editedBill.value.amount || parseFloat(editedBill.value.amount) <= 0) {
        alert('Please enter a valid bill name and amount')
        return
      }

      try {
        // Update bill details
        await axios.put(`${API_URL}/bills/${props.bill.id}`, {
          name: editedBill.value.name.trim(),
          amount: parseFloat(editedBill.value.amount),
          due_date: editedBill.value.due_date || null
        })

        // Update assignments
        const currentAssignments = await axios.get(`${API_URL}/bills/${props.bill.id}/assignments`)
        const currentIds = currentAssignments.data.map(a => a.roommate_id)

        // Remove unassigned roommates
        for (const roommateId of currentIds) {
          if (!assignedRoommates.value.includes(roommateId)) {
            await axios.delete(`${API_URL}/bills/${props.bill.id}/assign/${roommateId}`)
          }
        }

        // Add newly assigned roommates
        for (const roommateId of assignedRoommates.value) {
          if (!currentIds.includes(roommateId)) {
            await axios.post(`${API_URL}/bills/${props.bill.id}/assign/${roommateId}`)
          }
        }

        emit('bill-updated')
        emit('close')
      } catch (error) {
        console.error('Error updating bill:', error)
        alert('Error updating bill')
      }
    }

    const confirmDelete = async () => {
      if (confirm(`Are you sure you want to delete "${props.bill.name}"?`)) {
        try {
          await axios.delete(`${API_URL}/bills/${props.bill.id}`)
          emit('bill-deleted')
          emit('close')
        } catch (error) {
          console.error('Error deleting bill:', error)
          alert('Error deleting bill')
        }
      }
    }

    return {
      editedBill,
      assignedRoommates,
      toggleRoommate,
      saveBill,
      confirmDelete
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dark-mode .modal-content {
  background: #2a2a2a;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 2px solid #eee;
}

.dark-mode .modal-header {
  border-bottom-color: #444;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
}

.dark-mode .modal-header h3 {
  color: #e0e0e0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: #999;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 30px;
  height: 30px;
}

.close-btn:hover {
  color: #333;
}

.dark-mode .close-btn:hover {
  color: #ccc;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 2px solid #eee;
  background: #f8f9fa;
}

.dark-mode .modal-footer {
  border-top-color: #444;
  background: #1a1a1a;
}

.spacer {
  flex: 1;
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

.dark-mode .form-group label {
  color: #bbb;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  color: #2c3e50;
}

.dark-mode .form-group input {
  background: #1a1a1a;
  border-color: #444;
  color: #e0e0e0;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.btn-success {
  background: #27ae60;
  color: white;
}

.btn-success:hover {
  background: #219a52;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover {
  background: #7f8c8d;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background: #c0392b;
}

.roommate-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.dark-mode .roommate-list {
  background: #1a1a1a;
}

.roommate-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: white;
  border: 2px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.roommate-item:hover {
  border-color: #3498db;
  background: #f0f8ff;
}

.dark-mode .roommate-item {
  background: #2a2a2a;
  border-color: #444;
}

.dark-mode .roommate-item:hover {
  border-color: #3498db;
  background: #1e3a5f;
}

.roommate-item input[type="checkbox"] {
  width: auto;
  cursor: pointer;
}

.roommate-item span {
  flex: 1;
  color: #2c3e50;
}

.dark-mode .roommate-item span {
  color: #e0e0e0;
}

.no-roommates {
  text-align: center;
  color: #999;
  font-style: italic;
  padding: 1rem;
}
</style>
