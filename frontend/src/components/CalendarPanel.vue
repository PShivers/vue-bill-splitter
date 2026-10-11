<template>
  <div class="calendar-panel">
    <!-- Calendar Header -->
    <div class="calendar-header">
      <div class="month-nav">
        <button @click="previousMonth" class="nav-button" title="Previous Month">
          <v-icon size="small">mdi-chevron-left</v-icon>
        </button>
        <h3>{{ currentMonthYear }}</h3>
        <button @click="nextMonth" class="nav-button" title="Next Month">
          <v-icon size="small">mdi-chevron-right</v-icon>
        </button>
        <button @click="goToToday" class="today-btn">Today</button>
      </div>

      <div class="month-summary">
        <span class="month-total-label">Total for {{ currentMonthName }}:</span>
        <span class="month-total-amount">${{ currentMonthTotal.toFixed(2) }}</span>
      </div>
    </div>

    <!-- Calendar Grid -->
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
        @click="handleDayClick(day)"
      >
        <div class="day-top">
          <span class="day-number">{{ day.date }}</span>
          <span class="day-total" v-if="day.bills.length > 0">
            ${{ getDayTotal(day.bills).toFixed(0) }}
          </span>
          <span class="add-hint" title="Add bill on this date">+</span>
        </div>

        <div class="day-bills">
          <div
            v-for="bill in day.bills"
            :key="bill.id"
            class="bill-pill"
            :class="[
              bill.category || 'other',
              { 'pill-settled': bill.is_settled }
            ]"
            :title="`${bill.name}: $${bill.amount.toFixed(2)} (${bill.is_settled ? 'Settled' : 'Pending'})`"
            @click.stop="$emit('bill-clicked', bill)"
          >
            <v-icon size="x-small" class="pill-icon">
              {{ bill.is_settled ? 'mdi-check-circle' : getCategoryIcon(bill.category) }}
            </v-icon>
            <span class="pill-name">{{ bill.name }}</span>
            <span class="pill-amount">${{ bill.amount.toFixed(0) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';

export default {
  name: 'CalendarPanel',
  props: {
    bills: {
      type: Array,
      required: true
    }
  },
  emits: ['bill-clicked', 'date-clicked'],
  setup(props, { emit }) {
    const currentDate = ref(new Date());
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const categoryIcons = {
      rent: 'mdi-home-city',
      utilities: 'mdi-lightning-bolt',
      electricity: 'mdi-flash',
      water: 'mdi-water',
      internet: 'mdi-wifi',
      groceries: 'mdi-cart',
      entertainment: 'mdi-movie',
      other: 'mdi-receipt'
    };

    const getCategoryIcon = (key) => categoryIcons[key] || categoryIcons.other;

    const currentMonthYear = computed(() => {
      const options = { month: 'long', year: 'numeric' };
      return currentDate.value.toLocaleDateString('en-US', options);
    });

    const currentMonthName = computed(() => {
      return currentDate.value.toLocaleDateString('en-US', { month: 'short' });
    });

    // Helper: Parse YYYY-MM-DD into a local Date without UTC offset issues
    const parseLocalDate = (dateStr) => {
      if (!dateStr) return null;
      const parts = dateStr.split('-');
      if (parts.length !== 3) return new Date(dateStr);
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    };

    const currentMonthTotal = computed(() => {
      const year = currentDate.value.getFullYear();
      const month = currentDate.value.getMonth();

      let sum = 0;
      for (const bill of props.bills) {
        if (!bill.due_date) continue;
        const bDate = parseLocalDate(bill.due_date);
        if (bDate && bDate.getFullYear() === year && bDate.getMonth() === month) {
          sum += bill.amount;
        }
      }
      return sum;
    });

    const calendarDays = computed(() => {
      const year = currentDate.value.getFullYear();
      const month = currentDate.value.getMonth();

      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const prevLastDay = new Date(year, month, 0);

      const firstDayOfWeek = firstDay.getDay();
      const lastDateOfMonth = lastDay.getDate();
      const prevLastDate = prevLastDay.getDate();

      const days = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Previous month days
      for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const date = prevLastDate - i;
        const fullDate = new Date(year, month - 1, date);
        fullDate.setHours(0, 0, 0, 0);

        const iso = `${fullDate.getFullYear()}-${String(fullDate.getMonth() + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
        days.push({
          date,
          iso,
          isOtherMonth: true,
          isToday: false,
          fullDate,
          bills: []
        });
      }

      // Current month days
      for (let i = 1; i <= lastDateOfMonth; i++) {
        const fullDate = new Date(year, month, i);
        fullDate.setHours(0, 0, 0, 0);

        const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const isToday = fullDate.getTime() === today.getTime();

        // Filter bills matching this local date
        const dayBills = props.bills.filter(bill => {
          if (!bill.due_date) return false;
          const billDate = parseLocalDate(bill.due_date);
          if (!billDate) return false;
          billDate.setHours(0, 0, 0, 0);
          return billDate.getTime() === fullDate.getTime();
        });

        days.push({
          date: i,
          iso,
          isOtherMonth: false,
          isToday,
          fullDate,
          bills: dayBills
        });
      }

      // Next month days
      const remainingDays = 42 - days.length; // 6 rows
      for (let i = 1; i <= remainingDays; i++) {
        const fullDate = new Date(year, month + 1, i);
        fullDate.setHours(0, 0, 0, 0);
        const iso = `${fullDate.getFullYear()}-${String(fullDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

        days.push({
          date: i,
          iso,
          isOtherMonth: true,
          isToday: false,
          fullDate,
          bills: []
        });
      }

      return days;
    });

    const getDayTotal = (bills) => {
      return bills.reduce((acc, b) => acc + b.amount, 0);
    };

    const previousMonth = () => {
      currentDate.value = new Date(
        currentDate.value.getFullYear(),
        currentDate.value.getMonth() - 1,
        1
      );
    };

    const nextMonth = () => {
      currentDate.value = new Date(
        currentDate.value.getFullYear(),
        currentDate.value.getMonth() + 1,
        1
      );
    };

    const goToToday = () => {
      currentDate.value = new Date();
    };

    const handleDayClick = (day) => {
      if (day.iso) {
        emit('date-clicked', day.iso);
      }
    };

    return {
      currentMonthYear,
      currentMonthName,
      currentMonthTotal,
      weekDays,
      calendarDays,
      getCategoryIcon,
      getDayTotal,
      previousMonth,
      nextMonth,
      goToToday,
      handleDayClick
    };
  }
};
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
  padding: 0.75rem 1rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
}

.month-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.month-nav h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #111827;
  min-width: 140px;
}

.nav-button {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  color: #374151;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.nav-button:hover {
  background: #e5e7eb;
}

.today-btn {
  background: white;
  border: 1px solid #e5e7eb;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #3b82f6;
  cursor: pointer;
}

.today-btn:hover {
  background: #eff6ff;
}

.month-summary {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}

.month-total-label {
  font-size: 0.78rem;
  color: #6b7280;
}

.month-total-amount {
  font-size: 1.05rem;
  font-weight: 700;
  color: #111827;
}

/* Calendar Grid */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: 1fr;
  flex: 1;
  gap: 1px;
  background: #e5e7eb;
  overflow: hidden;
}

.day-header {
  background: #f9fafb;
  padding: 0.4rem;
  text-align: center;
  font-weight: 600;
  color: #4b5563;
  font-size: 0.75rem;
  text-transform: uppercase;
}

.calendar-day {
  background: white;
  padding: 0.35rem;
  display: flex;
  flex-direction: column;
  position: relative;
  cursor: pointer;
  transition: background 0.15s;
  min-height: 70px;
}

.calendar-day:hover {
  background: #f9fafb;
}

.calendar-day:hover .add-hint {
  opacity: 1;
}

.calendar-day.other-month {
  background: #fafafa;
  opacity: 0.45;
}

.calendar-day.today {
  background: #f0f7ff;
}

.calendar-day.today .day-number {
  background: #3b82f6;
  color: white;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.day-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.day-number {
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
}

.day-total {
  font-size: 0.68rem;
  font-weight: 700;
  color: #059669;
}

.add-hint {
  font-size: 0.9rem;
  color: #3b82f6;
  opacity: 0;
  transition: opacity 0.15s;
  line-height: 1;
  font-weight: bold;
}

.day-bills {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  overflow-y: auto;
  max-height: calc(100% - 24px);
}

.bill-pill {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.18rem 0.35rem;
  border-radius: 4px;
  font-size: 0.7rem;
  cursor: pointer;
  background: #eff6ff;
  color: #1e40af;
  border-left: 2.5px solid #3b82f6;
  transition: all 0.15s;
}

.bill-pill:hover {
  transform: translateX(1px);
  filter: brightness(0.95);
}

.bill-pill.pill-settled {
  background: #f0fdf4;
  color: #166534;
  border-left-color: #10b981;
}

.bill-pill.rent { border-left-color: #ef4444; }
.bill-pill.utilities { border-left-color: #f59e0b; }
.bill-pill.electricity { border-left-color: #eab308; }
.bill-pill.water { border-left-color: #0ea5e9; }
.bill-pill.internet { border-left-color: #8b5cf6; }
.bill-pill.groceries { border-left-color: #22c55e; }
.bill-pill.entertainment { border-left-color: #ec4899; }

.pill-icon {
  flex-shrink: 0;
}

.pill-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.pill-amount {
  font-weight: 700;
  flex-shrink: 0;
}

/* Dark Mode */
:global(.dark-mode) .calendar-header {
  background: #111827;
  border-bottom-color: #374151;
}

:global(.dark-mode) .month-nav h3,
:global(.dark-mode) .month-total-amount {
  color: #f9fafb;
}

:global(.dark-mode) .nav-button,
:global(.dark-mode) .today-btn {
  background: #1f2937;
  border-color: #374151;
  color: #e5e7eb;
}

:global(.dark-mode) .calendar-grid {
  background: #374151;
}

:global(.dark-mode) .day-header {
  background: #111827;
  color: #9ca3af;
}

:global(.dark-mode) .calendar-day {
  background: #1f2937;
}

:global(.dark-mode) .calendar-day:hover {
  background: #253347;
}

:global(.dark-mode) .calendar-day.other-month {
  background: #111827;
}

:global(.dark-mode) .calendar-day.today {
  background: #1e3a5f;
}

:global(.dark-mode) .day-number {
  color: #e5e7eb;
}

:global(.dark-mode) .bill-pill {
  background: #1e293b;
  color: #e2e8f0;
}

:global(.dark-mode) .bill-pill.pill-settled {
  background: #064e3b;
  color: #a7f3d0;
}
</style>