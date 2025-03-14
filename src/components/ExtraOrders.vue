<template>
  <div class="extra-orders">
    <h2>Extra Orders Summary</h2>
    
    <div class="summary-section">
      <h3>Total Items Not Picked Up</h3>
      <div class="summary-grid">
        <div v-for="(count, itemName) in totalItemCounts" :key="itemName" class="summary-item">
          <span class="item-name">{{ itemName }}</span>
          <span class="item-count">{{ count }}</span>
        </div>
      </div>
    </div>
    
    <div class="filters">
      <button 
        @click="currentFilter = 'all'" 
        :class="{ active: currentFilter === 'all' }"
        class="filter-button"
      >
        All Not Picked Up
      </button>
      <button 
        @click="currentFilter = 'absent'" 
        :class="{ active: currentFilter === 'absent' }"
        class="filter-button"
      >
        Absent Students
      </button>
      <button 
        @click="currentFilter = 'regular'" 
        :class="{ active: currentFilter === 'regular' }"
        class="filter-button"
      >
        Regular Not Picked Up
      </button>
    </div>
    
    <div class="orders-list">
      <div v-for="order in filteredOrders" :key="order.id" class="order-card" :class="{ 'absent': order.isAbsent }">
        <div class="order-header">
          <h4>{{ order.firstName }} {{ order.lastName }}</h4>
          <span class="order-status">{{ order.isAbsent ? 'Absent' : 'Not Picked Up' }}</span>
        </div>
        <div class="order-items">
          <div v-for="item in order.items" :key="item.name" class="item-row">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-quantity">x{{ item.quantity }}</span>
          </div>
        </div>
        <div class="order-footer">
          <span class="order-grade">Grade: {{ order.grade }}</span>
          <span class="order-total">Total: ${{ calculateTotal(order).toFixed(2) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from 'vue'
// @ts-ignore
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
  isAbsent: boolean
}

export default defineComponent({
  name: 'ExtraOrders',
  setup() {
    const currentFilter = ref('all')
    
    // Get all orders that haven't been picked up
    const notPickedUpOrders = computed(() => {
      return store.orders.filter((order: Order) => !order.checkedIn)
    })
    
    // Filter orders based on the selected filter
    const filteredOrders = computed(() => {
      let filtered;
      if (currentFilter.value === 'all') {
        filtered = notPickedUpOrders.value;
      } else if (currentFilter.value === 'absent') {
        filtered = notPickedUpOrders.value.filter((order: Order) => order.isAbsent);
      } else if (currentFilter.value === 'regular') {
        filtered = notPickedUpOrders.value.filter((order: Order) => !order.isAbsent);
      } else {
        filtered = notPickedUpOrders.value;
      }

      // Sort by last name
      return filtered.sort((a: Order, b: Order) => {
        const lastNameA = a.lastName.toLowerCase();
        const lastNameB = b.lastName.toLowerCase();
        return lastNameA.localeCompare(lastNameB);
      });
    })
    
    // Calculate total counts for each item across all not picked up orders
    const totalItemCounts = computed(() => {
      const counts: Record<string, number> = {}
      
      notPickedUpOrders.value.forEach((order: Order) => {
        order.items.forEach(item => {
          if (!counts[item.name]) {
            counts[item.name] = 0
          }
          counts[item.name] += item.quantity
        })
      })
      
      return counts
    })
    
    // Calculate total for an order
    const calculateTotal = (order: Order) => {
      return order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    }
    
    return {
      currentFilter,
      filteredOrders,
      totalItemCounts,
      calculateTotal
    }
  }
})
</script>

<style scoped>
.extra-orders {
  padding: 1rem;
  max-width: 100%;
}

h2 {
  margin-bottom: 1.5rem;
  color: #1F2937;
}

.summary-section {
  background-color: #F9FAFB;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden; /* Prevent overflow */
}

.summary-section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #374151;
  font-size: 1.1rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  max-width: 100%;
  gap: 0.75rem;
}

@media (min-width: 640px) {
  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 768px) {
  .summary-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .summary-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.summary-item {
  display: flex;
  justify-content: space-between;
  background-color: white;
  padding: 0.75rem;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.item-name {
  font-weight: 500;
}

.item-count {
  font-weight: 600;
  color: #4B5563;
}

.filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.filter-button {
  padding: 0.5rem 1rem;
  background-color: #F3F4F6;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.filter-button:hover {
  background-color: #E5E7EB;
}

.filter-button.active {
  background-color: #3B82F6;
  color: white;
  border-color: #2563EB;
}

.orders-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

@media (min-width: 640px) {
  .orders-list {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .orders-list {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1280px) {
  .orders-list {
    grid-template-columns: repeat(4, 1fr);
  }
}

.order-card {
  background-color: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #10B981; /* Green for regular not picked up */
}

.order-card.absent {
  border-left: 4px solid #EF4444; /* Red for absent */
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #E5E7EB;
}

.order-header h4 {
  margin: 0;
  font-size: 1rem;
}

.order-status {
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  background-color: #F3F4F6;
}

.order-card.absent .order-status {
  background-color: #FEE2E2;
  color: #B91C1C;
}

.order-items {
  margin-bottom: 0.75rem;
}

.item-row {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 0.75rem;
  border-top: 1px solid #E5E7EB;
  font-size: 0.9rem;
  color: #4B5563;
}
</style> 