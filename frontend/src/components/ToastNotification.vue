<template>
  <div class="toast-container" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast-item"
        :class="toast.type"
        @click="dismiss(toast.id)"
      >
        <v-icon size="small" class="toast-icon">
          {{ toast.type === 'success' ? 'mdi-check-circle' : toast.type === 'error' ? 'mdi-alert-circle' : 'mdi-information' }}
        </v-icon>
        <span class="toast-message">{{ toast.message }}</span>
        <button class="toast-close" @click.stop="dismiss(toast.id)">&times;</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script>
export default {
  name: 'ToastNotification',
  props: {
    toasts: {
      type: Array,
      default: () => []
    }
  },
  emits: ['dismiss'],
  setup(props, { emit }) {
    const dismiss = (id) => {
      emit('dismiss', id);
    };
    return { dismiss };
  }
};
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
  max-width: 380px;
  width: calc(100% - 3rem);
}

.toast-item {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: white;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  font-size: 0.9rem;
  cursor: pointer;
  border-left: 4px solid #3498db;
  transition: all 0.25s ease;
}

.toast-item.success {
  border-left-color: #10b981;
  color: #065f46;
  background: #ecfdf5;
}

.toast-item.error {
  border-left-color: #ef4444;
  color: #991b1b;
  background: #fef2f2;
}

.toast-item.info {
  border-left-color: #3b82f6;
  color: #1e40af;
  background: #eff6ff;
}

.toast-icon {
  flex-shrink: 0;
}

.toast-message {
  flex: 1;
  font-weight: 500;
  line-height: 1.3;
}

.toast-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  line-height: 1;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  padding: 0;
}

.toast-close:hover {
  opacity: 1;
}

/* Animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(50px) scale(0.95);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.9);
}
</style>