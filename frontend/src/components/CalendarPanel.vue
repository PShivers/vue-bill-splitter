<template>
  <div class="calendar-panel">
    <div class="calendar-header">
      <button @click="previousMonth" class="nav-button">
        <v-icon>mdi-chevron-left</v-icon>
      </button>
      <h3>{{ currentMonthYear }}</h3>
      <button @click="nextMonth" class="nav-button">
        <v-icon>mdi-chevron-right</v-icon>
      </button>
    </div>

    <div class="calendar-grid">
      <div class="day-header" v-for="day in weekDays" :key="day">{{ day }}</div>

      <div
        v-for="(day, index) in calendarDays"
        :key="index"
        class="calendar-day"
        :class="{
          'other-month': day.isOtherMonth,
          'today': day.isToday,
          'has-bills': day.bills.length > 0
        }"
      >
        <div class="day-number">{{ day.date }}</div>
        <div class="day-bills">
          <div
            v-for="bill in day.bills"
            :key="bill.id"
            class="bill-item"
            :title="`${bill.name}: $${bill.amount.toFixed(2)}`"
            @click="$emit('bill-clicked', bill)"
          >
            <v-icon size="x-small">mdi-receipt</v-icon>
            <span class="bill-name">{{ bill.name }}</span>
            <span class="bill-amount">${{ bill.amount.toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'CalendarPanel',
  props: {
    bills: {
      type: Array,
      required: true
    }
  },
  emits: ['bill-clicked'],
  setup(props) {
    const currentDate = ref(new Date())
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    const currentMonthYear = computed(() => {
      const options = { month: 'long', year: 'numeric' }
      return currentDate.value.toLocaleDateString('en-US', options)
    })

    const calendarDays = computed(() => {
      const year = currentDate.value.getFullYear()
      const month = currentDate.value.getMonth()

      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      const prevLastDay = new Date(year, month, 0)

      const firstDayOfWeek = firstDay.getDay()
      const lastDateOfMonth = lastDay.getDate()
      const prevLastDate = prevLastDay.getDate()

      const days = []
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Previous month days
      for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const date = prevLastDate - i
        days.push({
          date,
          isOtherMonth: true,
          isToday: false,
          fullDate: new Date(year, month - 1, date),
          bills: []
        })
      }

      // Current month days
      for (let i = 1; i <= lastDateOfMonth; i++) {
        const fullDate = new Date(year, month, i)
        fullDate.setHours(0, 0, 0, 0)

        const isToday = fullDate.getTime() === today.getTime()

        // Filter bills for this day
        const dayBills = props.bills.filter(bill => {
          if (!bill.due_date) return false
          const billDate = new Date(bill.due_date)
          billDate.setHours(0, 0, 0, 0)
          return billDate.getTime() === fullDate.getTime()
        })

        days.push({
          date: i,
          isOtherMonth: false,
          isToday,
          fullDate,
          bills: dayBills
        })
      }

      // Next month days
      const remainingDays = 42 - days.length // 6 rows × 7 days
      for (let i = 1; i <= remainingDays; i++) {
        days.push({
          date: i,
          isOtherMonth: true,
          isToday: false,
          fullDate: new Date(year, month + 1, i),
          bills: []
        })
      }

      return days
    })

    const previousMonth = () => {
      currentDate.value = new Date(
        currentDate.value.getFullYear(),
        currentDate.value.getMonth() - 1,
        1
      )
    }

    const nextMonth = () => {
      currentDate.value = new Date(
        currentDate.value.getFullYear(),
        currentDate.value.getMonth() + 1,
        1
      )
    }

    return {
      currentMonthYear,
      weekDays,
      calendarDays,
      previousMonth,
      nextMonth
    }
  }
}
</script>

<style scoped>
.calendar-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 2px solid #e9ecef;
}

.dark-mode .calendar-header {
  border-bottom-color: #444;
}

.calendar-header h3 {
  margin: 0;
  font-size: 1.5rem;
  color: #2c3e50;
}

.dark-mode .calendar-header h3 {
  color: #e0e0e0;
}

.nav-button {
  background: #3498db;
  border: none;
  color: white;
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.nav-button:hover {
  background: #2980b9;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  flex: 1;
  gap: 1px;
  background: #e9ecef;
  padding: 1px;
}

.dark-mode .calendar-grid {
  background: #444;
}

.day-header {
  background: #f8f9fa;
  padding: 0.5rem;
  text-align: center;
  font-weight: bold;
  color: #2c3e50;
  font-size: 0.9rem;
}

.dark-mode .day-header {
  background: #333;
  color: #e0e0e0;
}

.calendar-day {
  background: white;
  padding: 0.5rem;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  transition: background 0.2s;
}

.dark-mode .calendar-day {
  background: #2a2a2a;
}

.calendar-day.other-month {
  background: #f8f9fa;
  opacity: 0.5;
}

.dark-mode .calendar-day.other-month {
  background: #1a1a1a;
}

.calendar-day.today {
  background: #e3f2fd;
  border: 2px solid #3498db;
}

.dark-mode .calendar-day.today {
  background: #1e3a5f;
  border-color: #3498db;
}

.calendar-day.has-bills .day-number {
  color: #3498db;
  font-weight: bold;
}

.day-number {
  font-size: 0.9rem;
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.dark-mode .day-number {
  color: #e0e0e0;
}

.day-bills {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow-y: auto;
}

.bill-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem;
  background: #e3f2fd;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #2c3e50;
  cursor: pointer;
  transition: background 0.2s;
}

.bill-item:hover {
  background: #bbdefb;
}

.dark-mode .bill-item {
  background: #1e3a5f;
  color: #e0e0e0;
}

.dark-mode .bill-item:hover {
  background: #2a4a7f;
}

.bill-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bill-amount {
  font-weight: bold;
  white-space: nowrap;
}
</style>
