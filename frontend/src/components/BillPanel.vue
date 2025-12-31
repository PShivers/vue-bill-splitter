<template>
  <div class="bill-panel">
    <div class="panel-header">
      <button @click="showAddForm = true" class="btn btn-primary">Add Bill</button>
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
            <label>Bill Name:</label>
            <input
              type="text"
              v-model="newBill.name"
              placeholder="Enter bill name"
              maxlength="50"
              @keyup.enter="addBill"
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
              @keyup.enter="addBill"
            />
          </div>
          <div class="form-group">
            <label>Due Date:</label>
            <input
              type="date"
              v-model="newBill.due_date"
              @keyup.enter="addBill"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button @click="cancelAdd" class="btn btn-secondary">Cancel</button>
          <button @click="addBill" class="btn btn-success">Add Bill</button>
        </div>
      </div>
    </div>

    <!-- Bills List -->
    <div class="bills-list">
      <div v-if="bills.length === 0" class="empty-state">
        No bills added yet. Click "Add Bill" to get started.
      </div>
      
      <div v-for="bill in bills" :key="bill.id" class="bill-item" @click="$emit('bill-clicked', bill)">
        <div class="bill-info">
          <h4>{{ bill.name }}</h4>
          <p class="bill-amount">${{ bill.amount.toFixed(2) }}</p>
          <p v-if="bill.due_date" class="bill-due-date">Due: {{ formatDate(bill.due_date) }}</p>
        </div>
        <v-icon>mdi-chevron-right</v-icon>
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
  emits: ['bill-added', 'bill-deleted', 'bill-clicked'],
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

/* Modal Styles */
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

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 2px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
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
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #eee;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.2s;
}

.bill-item:hover {
  background: #f0f0f0;
  border-color: #3498db;
  transform: translateX(4px);
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