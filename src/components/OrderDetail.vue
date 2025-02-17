<template>
  <div class="order-detail">
    <div class="detail-grid">
      <!-- Left side of detail view -->
      <div class="detail-left">
        <div class="header-section">
          <h2>{{ order.firstName }} {{ order.lastName }}</h2>
          <div class="order-id">Order #{{ order.orderId }}</div>
        </div>
        
        <div class="status-box">
          <label class="toggle-large">
            <input 
              type="checkbox" 
              :checked="localCheckedIn"
              @change="toggleCheckIn"
            >
            <span class="slider-large"></span>
            <span class="toggle-label-large">{{ localCheckedIn ? 'Picked Up' : 'Not Picked Up' }}</span>
          </label>
        </div>

        <div class="total-box" :class="{ 'prepaid-box': localPrepaid }">
          <div class="total-label">Total</div>
          <div class="total-amount">${{ calculateTotal }}</div>
        </div>

        <div class="detail-info">
          <div class="info-row">
            <span class="label">Grade:</span>
            <span>{{ order.grade }}</span>
            <div class="toggle-group">
              <label class="toggle-small">
                <input 
                  type="checkbox" 
                  :checked="order.isPoly"
                  @change="togglePoly"
                >
                <span class="slider-small"></span>
                <span class="toggle-label-small">Poly</span>
              </label>
              <label class="toggle-small">
                <input 
                  type="checkbox" 
                  :checked="localPrepaid"
                  @change="togglePrepaid"
                >
                <span class="slider-small"></span>
                <span class="toggle-label-small">Prepaid</span>
              </label>
              <label class="toggle-small">
                <input 
                  type="checkbox" 
                  :checked="localVenmo"
                  @change="toggleVenmo"
                >
                <span class="slider-small"></span>
                <span class="toggle-label-small">Venmo</span>
              </label>
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
import { defineComponent, PropType, ref, watch } from 'vue'
import store from '../store'

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
    const localPrepaid = ref(props.order.prepaid)
    const localCheckedIn = ref(props.order.checkedIn)
    const localVenmo = ref(props.order.venmo)

    watch(() => props.order.prepaid, (newValue) => {
      localPrepaid.value = newValue
    })

    watch(() => props.order.checkedIn, (newValue) => {
      localCheckedIn.value = newValue
    })

    watch(() => props.order.venmo, (newValue) => {
      localVenmo.value = newValue
    })

    return {
      store,
      localPrepaid,
      localCheckedIn,
      localVenmo
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
      store.toggleOrderProperty(this.order.id, 'checkedIn')
      this.localCheckedIn = !this.localCheckedIn
    },
    togglePoly() {
      store.toggleOrderProperty(this.order.id, 'isPoly')
    },
    togglePrepaid() {
      store.toggleOrderProperty(this.order.id, 'prepaid')
      this.localPrepaid = !this.localPrepaid
    },
    toggleVenmo() {
      store.toggleOrderProperty(this.order.id, 'venmo')
      this.localVenmo = !this.localVenmo
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
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e2e2;
  text-align: right;
}

.delete-button {
  background: none;
  border: none;
  color: #dc2626;
  padding: 0.5rem 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  margin-left: auto;
  border-radius: 6px;
}

.delete-button:hover {
  background: #fee2e2;
}

.delete-icon {
  font-size: 1.1rem;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.order-id {
  font-size: 1.1rem;
  color: #6B7280;
  font-weight: 500;
}
</style>