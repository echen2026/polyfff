<template>
  <div id="app">
    <header>
      <h1>Fun Food Friday Manager</h1>
      <nav>
        <button @click="showComponent('orderList')" :class="{ active: currentComponent === 'orderList' }">Home</button>
        <button @click="showComponent('settings')" :class="{ active: currentComponent === 'settings' }">Settings</button>
        <button @click="showComponent('addSale')" :class="{ active: currentComponent === 'addSale' }">Add Manual Sale</button>
      </nav>
    </header>

    <div v-if="currentComponent === 'orderList'" class="split-container">
      <div class="left-panel">
        <div class="search-section">
          <h2>Search Orders</h2>
          <div class="search-controls">
            <input 
              v-model="search" 
              placeholder="Search by name or order ID..." 
              class="search-input"
            />
            <select 
              v-model="currentFilter" 
              class="filter-select"
            >
              <option value="all">All Orders</option>
              <option value="picked-up">Picked Up</option>
              <option value="not-picked-up">Not Picked Up</option>
            </select>
          </div>
        </div>

        <div class="user-list">
          <div 
            v-for="order in filteredOrders" 
            :key="order.id"
            class="user-list-item"
            :class="{ 
              selected: selectedOrder && selectedOrder.id === order.id,
              'picked-up': order.checkedIn 
            }"
            @click="selectOrder(order)"
          >
            <span class="user-name">{{ order.firstName }} {{ order.lastName }}</span>
            <span class="pickup-status" :class="{ 'is-picked-up': order.checkedIn }">
              {{ order.checkedIn ? '✓ Picked Up' : 'Not Picked Up' }}
            </span>
          </div>
        </div>

        <div class="stats-box">
          <div class="stat-item">
            <div class="stat-label">Not Picked Up</div>
            <div class="stat-value">{{ notPickedUpCount }}</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-label">Picked Up</div>
            <div class="stat-value">{{ pickedUpCount }}</div>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <OrderDetail 
          v-if="selectedOrder"
          :order="selectedOrder"
          @update-order="handleOrderUpdate"
        />
        <div v-else class="no-selection">
          <h2>Select an order to view details</h2>
        </div>
      </div>
    </div>

    <Settings v-if="currentComponent === 'settings'"/>
    <AddManualSale v-if="currentComponent === 'addSale'" @close="showComponent('orderList')" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import store from './store'
import emitter from './eventBus'
import OrderDetail from './components/OrderDetail.vue'
import Settings from './components/Settings.vue'
import AddManualSale from './components/AddManualSale.vue'

interface Order {
  id: number
  orderId: string
  firstName: string
  lastName: string
  grade: string
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  paymentMethod: string
  checkedIn: boolean
}

export default defineComponent({
  components: {
    OrderDetail,
    Settings,
    AddManualSale,
  },
  data() {
    return {
      currentComponent: 'orderList',
      selectedOrder: null as Order | null,
      search: '',
      currentFilter: 'all',
      lastInputTime: 0,
      barcodeBuffer: '',
      barcodeTimeout: null as NodeJS.Timeout | null,
    }
  },
  computed: {
    orders(): Order[] {
      return store.orders
    },
    filteredOrders(): Order[] {
      let filtered = this.orders;

      // Apply pickup status filter
      if (this.currentFilter === 'picked-up') {
        filtered = filtered.filter(order => order.checkedIn);
      } else if (this.currentFilter === 'not-picked-up') {
        filtered = filtered.filter(order => !order.checkedIn);
      }

      // Apply search for name or order ID
      if (this.search) {
        const searchTerms = this.search.toLowerCase().split(' ');
        filtered = filtered.filter(order => {
          const fullName = `${order.firstName} ${order.lastName}`.toLowerCase();
          const orderId = order.orderId ? order.orderId.toString().toLowerCase() : '';
          return searchTerms.every(term => 
            fullName.includes(term) || orderId.includes(term)
          );
        });
      }

      return filtered;
    },
    notPickedUpCount(): number {
  return this.orders.filter(order => !order.checkedIn).length
},
pickedUpCount(): number {
  return this.orders.filter(order => order.checkedIn).length
  } 
  },
  watch: {
    filteredOrders: {
      handler(newOrders) {
        // If there are filtered orders and no order is currently selected
        // or the currently selected order is not in the filtered results
        if (newOrders.length > 0 && 
            (!this.selectedOrder || !newOrders.find(o => o.id === this.selectedOrder.id))) {
          this.selectOrder(newOrders[0])
        }
      },
      immediate: true
    }
  },
  created() {
    store.loadData()
  },
  mounted() {
    emitter.on('addOrder', (order: Order) => {
      try {
        this.addOrder(order)
      } catch (error) {
        console.error("Error processing addOrder event:", error)
      }
    })
    window.addEventListener('keydown', this.handleBarcodeInput)
  },
  beforeUnmount() {
    if (this.barcodeTimeout) {
      clearTimeout(this.barcodeTimeout)
    }
    window.removeEventListener('keydown', this.handleBarcodeInput)
  },
  methods: {
    showComponent(component: string) {
      this.currentComponent = component
    },
    selectOrder(order: Order) {
      this.selectedOrder = order
    },
    handleOrderUpdate(updatedOrder: Order) {
      store.updateOrder(updatedOrder)
    },
    addOrder(order: Order) {
      order.id = Date.now()
      store.orders.push(order)
      store.saveData()
      this.currentComponent = 'orderList'
    },
    handleBarcodeInput(event: KeyboardEvent) {
      const currentTime = Date.now()
      
      // If the time between keystrokes is > 50ms, it's likely manual typing
      if (currentTime - this.lastInputTime > 50) {
        this.barcodeBuffer = ''
      }
      
      this.lastInputTime = currentTime
      
      // Clear any existing timeout
      if (this.barcodeTimeout) {
        clearTimeout(this.barcodeTimeout)
      }
      
      // Only handle number keys
      if (/^\d$/.test(event.key)) {
        this.barcodeBuffer += event.key
        
        // If we have 7 digits (student ID length) or set a timeout to process after brief pause
        if (this.barcodeBuffer.length === 7) {
          this.processBarcodeInput()
        } else {
          // Set timeout to process input after 50ms of no new input
          this.barcodeTimeout = setTimeout(() => {
            if (this.barcodeBuffer.length > 0) {
              this.processBarcodeInput()
            }
          }, 50)
        }
      }
    },
    processBarcodeInput() {
      const order = this.orders.find(o => o.orderId === this.barcodeBuffer)
      if (order) {
        order.paymentMethod = 'Cash'
        order.checkedIn = true
        store.updateOrder(order)
        this.selectOrder(order)
        this.search = ''
      }
      this.barcodeBuffer = ''
    }
  }
})
</script>

<style src="./styles.css"></style>