<template>
  <div class="roommate-panel">
    <!-- Add Roommate Form -->
    <div class="add-form">
      <div class="form-group">
        <label>Roommate Name:</label>
        <input 
          type="text" 
          v-model="newRoommateName" 
          placeholder="Enter roommate name"
          maxlength="50"
          @keyup.enter="addRoommate"
        />
      </div>
      <button @click="addRoommate" class="btn btn-primary">Add Roommate</button>
    </div>
    
    <!-- Totals Section -->
    <div class="totals-section">
      <h3>Totals Owed</h3>
      <div v-if="totals.length === 0" class="empty-state">
        No roommates added yet.
      </div>
      
      <div v-for="roommate in totals" :key="roommate.id" class="roommate-total">
        <div class="roommate-info">
          <h4>{{ roommate.name }}</h4>
          <p class="total-amount">${{ roommate.total.toFixed(2) }}</p>
        </div>
        <button @click="deleteRoommate(roommate.id)" class="btn btn-danger btn-sm">Delete</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import axios from 'axios'

const API_URL = 'http://localhost:3001/api'

export default {
  name: 'RoommatePanel',
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
  emits: ['roommate-added', 'roommate-added-success', 'roommate-added-error', 'roommate-deleted'],
  setup(props, { emit }) {
    const newRoommateName = ref('')

    const addRoommate = async () => {
      if (!newRoommateName.value.trim()) {
        alert('Please enter a roommate name')
        return
      }

      const roommateData = {
        name: newRoommateName.value.trim()
      }

      // Clear input immediately for better UX
      newRoommateName.value = ''

      // Emit optimistic update immediately
      emit('roommate-added', roommateData)

      try {
        const response = await axios.post(`${API_URL}/roommates`, roommateData)
        // Emit success with actual server data
        emit('roommate-added-success', response.data)
      } catch (error) {
        console.error('Error adding roommate:', error)
        alert('Error adding roommate')
        // Emit failure to trigger rollback
        emit('roommate-added-error', roommateData)
      }
    }

    const deleteRoommate = async (roommateId) => {
      if (confirm('Are you sure you want to delete this roommate? This will remove all their bill assignments.')) {
        try {
          await axios.delete(`${API_URL}/roommates/${roommateId}`)
          emit('roommate-deleted')
        } catch (error) {
          console.error('Error deleting roommate:', error)
          alert('Error deleting roommate')
        }
      }
    }

    return {
      newRoommateName,
      addRoommate,
      deleteRoommate
    }
  }
}
</script>

<style scoped>
.roommate-panel {
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

.add-form {
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

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.totals-section {
  flex: 1;
  overflow-y: auto;
}

.totals-section h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1.2rem;
}

.empty-state {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 2rem;
}

.roommate-total {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem;
  border: 1px solid #eee;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  background: #fafafa;
}

.roommate-info {
  flex: 1;
}

.roommate-info h4 {
  margin: 0 0 0.25rem 0;
  color: #2c3e50;
}

.total-amount {
  margin: 0;
  font-size: 1.1rem;
  font-weight: bold;
  color: #27ae60;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-primary {
  background: #3498db;
  color: white;
  width: 100%;
}

.btn-primary:hover {
  background: #2980b9;
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