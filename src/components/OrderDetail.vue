<template>
  <div class="order-detail">
    <div class="detail-grid">
      <!-- Left side of detail view -->
      <div class="detail-left">
        <div class="header-section">
          <h2>{{ order.firstName }} {{ order.lastName }}</h2>
          <div class="order-id">Order #{{ order.orderId }}</div>
        </div>
        
        <div class="combined-box" :class="{ 'absent': localIsAbsent }">
          <div class="toggle-section">
            <label class="toggle-large">
              <input 
                type="checkbox" 
                v-model="localCheckedIn"
                @change="toggleCheckIn"
              >
              <span class="slider-large"></span>
              <span class="toggle-label-large">
                {{ localIsAbsent ? 'Absent' : (localCheckedIn ? 'Picked Up' : 'Not Picked Up') }}
              </span>
            </label>
          </div>
          <div class="total-section" :class="{ 'prepaid-box': localPrepaid }">
            <div class="total-label">Total</div>
            <div class="total-amount">${{ calculateTotal }}</div>
          </div>
        </div>

        <div class="detail-info">
          <div class="info-row">
            <div class="grade-label">
              <span class="label">Grade: {{ order.grade }}</span>
            </div>
            <div class="toggle-container">
              <div class="toggle-group">
                <label class="toggle-small">
                  <input 
                    type="checkbox" 
                    v-model="localIsPoly"
                    @change="togglePoly"
                  >
                  <span class="slider-small"></span>
                  <span class="toggle-label-small">Poly</span>
                </label>
                <label class="toggle-small">
                  <input 
                    type="checkbox" 
                    v-model="localPrepaid"
                    @change="togglePrepaid"
                  >
                  <span class="slider-small"></span>
                  <span class="toggle-label-small">Prepaid</span>
                </label>
                <label class="toggle-small">
                  <input 
                    type="checkbox" 
                    v-model="localVenmo"
                    @change="toggleVenmo"
                  >
                  <span class="slider-small"></span>
                  <span class="toggle-label-small">Venmo</span>
                </label>
                <label class="toggle-small">
                  <input 
                    type="checkbox" 
                    v-model="localIsAbsent"
                    @change="toggleAbsent"
                  >
                  <span class="slider-small"></span>
                  <span class="toggle-label-small absent-label">Absent</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right side of detail view -->
      <div class="detail-right">
        <div class="order-items">
          <h3>Order Items</h3>
          <div v-for="item in order.items" :key="item.name" class="item-row">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-quantity">x{{ item.quantity }}</span>
            <span class="item-price">${{ item.price * item.quantity }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="delete-section">
      <button @click="confirmDelete" class="delete-button">
        <span class="delete-icon">🗑️</span>
        Delete Order
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, watch, onMounted, onBeforeUnmount } from 'vue'
// @ts-ignore
import store from '../store'
// @ts-ignore
import emitter from '../eventBus'

interface OrderItem {
  name: string
  quantity: number
  price: number
}

interface Order {
  id: number
  orderId: string
  firstName: string
  lastName: string
  grade: string
  items: OrderItem[]
  paymentMethod: string
  checkedIn: boolean
  isPoly: boolean
  prepaid: boolean
  venmo: boolean
  isAbsent: boolean
}

export default defineComponent({
  name: 'OrderDetail',
  props: {
    order: {
      type: Object as PropType<Order>,
      required: true
    }
  },
  setup(props) {
    const localPrepaid = ref(props.order.prepaid || false)
    const localCheckedIn = ref(props.order.checkedIn || false)
    const localVenmo = ref(props.order.venmo || false)
    const localIsPoly = ref(props.order.isPoly || false)
    const localIsAbsent = ref(props.order.isAbsent || false)

    // Reset all local state when the order changes
    const resetLocalState = (newOrder: Order) => {
      localPrepaid.value = newOrder.prepaid || false
      localCheckedIn.value = newOrder.checkedIn || false
      localVenmo.value = newOrder.venmo || false
      localIsPoly.value = newOrder.isPoly || false
      localIsAbsent.value = newOrder.isAbsent || false
    }

    // Watch for changes to the order prop itself (when switching between orders)
    watch(() => props.order.id, () => {
      console.log('Order changed, resetting local state')
      resetLocalState(props.order)
    }, { immediate: true })

    // Watch for changes to individual properties
    watch(() => props.order.prepaid, (newValue) => {
      localPrepaid.value = newValue || false
    })

    watch(() => props.order.checkedIn, (newValue) => {
      localCheckedIn.value = newValue || false
    })

    watch(() => props.order.venmo, (newValue) => {
      localVenmo.value = newValue || false
    })

    watch(() => props.order.isPoly, (newValue) => {
      localIsPoly.value = newValue || false
    })
    
    watch(() => props.order.isAbsent, (newValue) => {
      localIsAbsent.value = newValue || false
    })

    // Listen for property toggle events
    const handlePropertyToggle = (data: { orderId: number, property: string, value: boolean }) => {
      if (data.orderId === props.order.id) {
        // Update the corresponding local state
        if (data.property === 'prepaid') {
          localPrepaid.value = data.value
        } else if (data.property === 'checkedIn') {
          localCheckedIn.value = data.value
        } else if (data.property === 'venmo') {
          localVenmo.value = data.value
        } else if (data.property === 'isPoly') {
          localIsPoly.value = data.value
        } else if (data.property === 'isAbsent') {
          localIsAbsent.value = data.value
        }
      }
    }

    onMounted(() => {
      emitter.on('orderPropertyToggled', handlePropertyToggle)
    })

    onBeforeUnmount(() => {
      emitter.off('orderPropertyToggled', handlePropertyToggle)
    })

    return {
      store,
      localPrepaid,
      localCheckedIn,
      localVenmo,
      localIsPoly,
      localIsAbsent
    }
  },
  computed: {
    calculateTotal(): number {
      return this.order.items.reduce((sum, item) => {
        return sum + (item.price * item.quantity)
      }, 0)
    }
  },
  methods: {
    toggleCheckIn() {
      // Update the store first
      store.toggleOrderProperty(this.order.id, 'checkedIn')
      // Local state is updated via v-model and watch
    },
    togglePoly() {
      store.toggleOrderProperty(this.order.id, 'isPoly')
      // Local state is updated via v-model and watch
    },
    togglePrepaid() {
      store.toggleOrderProperty(this.order.id, 'prepaid')
      // Local state is updated via v-model and watch
    },
    toggleVenmo() {
      store.toggleOrderProperty(this.order.id, 'venmo')
      // Local state is updated via v-model and watch
    },
    toggleAbsent() {
      store.toggleOrderProperty(this.order.id, 'isAbsent')
      // Local state is updated via v-model and watch
    },
    confirmDelete() {
      if (confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
        store.deleteOrder(this.order.id)
      }
    }
  }
})
</script>

<style scoped>
.delete-section {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e2e2e2;
  text-align: right;
}

.delete-button {
  background: none;
  border: none;
  color: #dc2626;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  margin-left: auto;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.delete-button:hover {
  background: #fee2e2;
  transform: translateY(-1px);
}

.delete-icon {
  font-size: 1.1rem;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
  padding: 0.5rem;
  background-color: #F9FAFB;
  border-radius: 8px;
  border-left: 4px solid #3B82F6;
}

.header-section h2 {
  font-size: 1.5rem;
  margin: 0;
  font-weight: 600;
  color: #1F2937;
}

.order-id {
  font-size: 1.1rem;
  color: #6B7280;
  font-weight: 500;
  background-color: #E5E7EB;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
}

.absent-label {
  color: #DC2626;
  font-weight: 600;
}

.order-detail {
  height: 100%;
  padding: 0.6rem;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.detail-left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.combined-box {
  display: flex;
  background-color: #F3F4F6;
  border-radius: 8px;
  transition: all 0.3s ease;
  padding: 0.75rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.combined-box.absent {
  background-color: #FEE2E2;
  border-left: 4px solid #EF4444;
}

.toggle-section {
  flex: 1;
  display: flex;
  align-items: center;
}

.total-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-end;
  padding-left: 0.75rem;
  border-left: 1px solid rgba(0, 0, 0, 0.1);
}

.total-section.prepaid-box {
  background-color: rgba(254, 242, 242, 0.5);
  border-radius: 0 8px 8px 0;
}

.total-label {
  font-size: 1rem;
  color: #6B7280;
  font-weight: 500;
  margin-bottom: 0.1rem;
}

.total-amount {
  font-size: 1.5rem;
  font-weight: 600;
  color: #047857;
}

.detail-info {
  padding: 0.75rem;
  background-color: #F3F4F6;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.grade-label {
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 0.1rem;
  color: #4B5563;
  background-color: #E5E7EB;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  display: inline-block;
}

.toggle-container {
  width: 100%;
  margin-top: 0.25rem;
}

.toggle-group {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem 0.75rem;
  width: 100%;
}

.toggle-small {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.5rem;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.toggle-small:hover {
  background-color: rgba(0, 0, 0, 0.03);
}

.toggle-small input[type="checkbox"] {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.toggle-small .slider-small {
  position: relative;
  display: inline-block;
  width: 34px;
  height: 18px;
  background-color: #ccc;
  border-radius: 20px;
  transition: 0.4s;
  flex-shrink: 0;
}

.toggle-small input:checked + .slider-small {
  background-color: #3B82F6;
}

.toggle-small input:focus + .slider-small {
  box-shadow: 0 0 1px #3B82F6;
}

.toggle-small input:checked + .slider-small:before {
  transform: translateX(16px);
}

.toggle-small .slider-small:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  border-radius: 50%;
  transition: 0.4s;
}

.toggle-label-small {
  font-size: 0.9rem;
  color: #4B5563;
  font-weight: 500;
  white-space: nowrap;
}

/* Large toggle styles */
.toggle-large {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.toggle-large input[type="checkbox"] {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.slider-large {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 26px;
  background-color: #ccc;
  border-radius: 26px;
  transition: 0.4s;
  flex-shrink: 0;
}

.toggle-large input:checked + .slider-large {
  background-color: #10B981;
}

.toggle-large input:focus + .slider-large {
  box-shadow: 0 0 1px #10B981;
}

.toggle-large input:checked + .slider-large:before {
  transform: translateX(26px);
}

.slider-large:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: 0.4s;
}

.toggle-label-large {
  font-size: 1.1rem;
  font-weight: 500;
  white-space: nowrap;
}

.detail-right {
  background-color: #F9FAFB;
  border-radius: 8px;
  padding: 0.75rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.order-items h3 {
  font-size: 1.2rem;
  margin-top: 0;
  margin-bottom: 0.75rem;
  color: #1F2937;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #E5E7EB;
}

.item-row {
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0;
  font-size: 0.95rem;
  border-bottom: 1px dashed #E5E7EB;
}

.item-row:last-child {
  border-bottom: none;
}

.item-name {
  font-weight: 500;
  color: #1F2937;
}

.item-quantity {
  color: #6B7280;
}

.item-price {
  font-weight: 600;
  color: #047857;
}
</style>