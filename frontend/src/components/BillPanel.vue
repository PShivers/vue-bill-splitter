<template>
  <div class="bill-panel">
    <div class="panel-header">
      <h2>Bills</h2>
      <button @click="showAddForm = true" class="btn btn-primary">Add Bill</button>
    </div>
    
    <!-- Add Bill Form -->
    <div v-if="showAddForm" class="add-form">
      <h3>Add New Bill</h3>
      <div class="form-group">
        <label>Bill Name:</label>
        <input 
          type="text" 
          v-model="newBill.name" 
          placeholder="Enter bill name"
          maxlength="50"
        />
      </div>
      <div class="form-group">
        <label>Amount:</label>
        <input 
          type="number" 
          v-model="newBill.amount" 
          placeholder="0.00"
          min="0.01"
          step="0.01"
        />
      </div>
      <div class="form-group">
        <label>Due Date:</label>
        <input 
          type="date" 
          v-model="newBill.due_date"
        />
      </div>
      <div class="form-actions">
        <button @click="addBill" class="btn btn-success">Add</button>
        <button @click="cancelAdd" class="btn btn-secondary">Cancel</button>
      </div>
    </div>
    
    <!-- Bills List -->
    <div class="bills-list">
      <div v-if="bills.length === 0" class="empty-state">
        No bills added yet. Click "Add Bill" to get started.
      </div>
      
      <div v-for="bill in bills" :key="bill.id" class="bill-item">
        <div class="bill-info">
          <h4>{{ bill.name }}</h4>
          <p class="bill-amount">${{ bill.amount.toFixed(2) }}</p>
          <p v-if="bill.due_date" class="bill-due-date">Due: {{ formatDate(bill.due_date) }}</p>
        </div>
        <button @click="deleteBill(bill.id)" class="btn btn-danger btn-sm">Delete</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'
import axios from 'axios'

const API_URL = 'http://localhost:3001/api'

export default {
  name: 'BillPanel',
  props: {
    bills: {
      type: Array,
      required: true
    }
  },
  emits: ['bill-added', 'bill-deleted'],
  setup(props, { emit }) {
    const showAddForm = ref(false)
    const newBill = reactive({
      name: '',
      amount: '',
      due_date: ''
    })

    const addBill = async () => {
      if (!newBill.name.trim() || !newBill.amount || parseFloat(newBill.amount) <= 0) {
        alert('Please enter a valid bill name and amount')
        return
      }

      try {
        await axios.post(`${API_URL}/bills`, {
          name: newBill.name.trim(),
          amount: parseFloat(newBill.amount),
          due_date: newBill.due_date || null
        })
        
        newBill.name = ''
        newBill.amount = ''
        newBill.due_date = ''
        showAddForm.value = false
        emit('bill-added')
      } catch (error) {
        console.error('Error adding bill:', error)
        alert('Error adding bill')
      }
    }

    const deleteBill = async (billId) => {
      if (confirm('Are you sure you want to delete this bill?')) {
        try {
          await axios.delete(`${API_URL}/bills/${billId}`)
          emit('bill-deleted')
        } catch (error) {
          console.error('Error deleting bill:', error)
          alert('Error deleting bill')
        }
      }
    }

    const cancelAdd = () => {
      newBill.name = ''
      newBill.amount = ''
      newBill.due_date = ''
      showAddForm.value = false
    }

    const formatDate = (dateString) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleDateString()
    }

    return {
      showAddForm,
      newBill,
      addBill,
      deleteBill,
      cancelAdd,
      formatDate
    }
  }
}
</script>

<style scoped>
.bill-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: between;
  align-items: center;
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

.add-form h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
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

.form-actions {
  display: flex;
  gap: 0.5rem;
}

.bills-list {
  flex: 1;
  overflow-y: auto;
}

.empty-state {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 2rem;
}

.bill-item {
  display: flex;
  justify-content: between;
  align-items: flex-start;
  padding: 1rem;
  border: 1px solid #eee;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  background: #fafafa;
}

.bill-info {
  flex: 1;
}

.bill-info h4 {
  margin: 0 0 0.25rem 0;
  color: #2c3e50;
}

.bill-amount {
  margin: 0.25rem 0;
  font-size: 1.1rem;
  font-weight: bold;
  color: #e74c3c;
}

.bill-due-date {
  margin: 0.25rem 0 0 0;
  font-size: 0.9rem;
  color: #666;
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
}

.btn-primary:hover {
  background: #2980b9;
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

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 12px;
}
</style>