<template>
  <div id="app">
    <header>
      <h1>Fun Food Friday Manager</h1>
      <nav>
        <button @click="showComponent('orderList')" :class="{ active: currentComponent === 'orderList' }">Home</button>
        <button @click="showComponent('settings')" :class="{ active: currentComponent === 'settings' }">Settings</button>
        <button @click="showComponent('addSale')" :class="{ active: currentComponent === 'addSale' }">Add Manual Sale</button>
        <button @click="showComponent('extraOrders')" :class="{ active: currentComponent === 'extraOrders' }">Extra Orders</button>
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
            <button 
              @click="toggleFilterPanel" 
              class="filter-toggle-btn"
              :class="{ 'active': !showAllOrders }"
            >
              <span>Filters</span>
              <span class="filter-badge" v-if="activeFilterCount > 0">{{ activeFilterCount }}</span>
              <span class="toggle-icon">{{ isFilterPanelOpen ? '▲' : '▼' }}</span>
            </button>
          </div>
          
          <transition name="slide-fade">
            <div class="filter-panel" v-show="isFilterPanelOpen">
              <div class="filter-options">
                <label class="filter-option" :class="{ 'active': showAllOrders }">
                  <input type="checkbox" v-model="showAllOrders" @change="handleShowAllChange">
                  <span>All Orders</span>
                </label>
                <label class="filter-option" :class="{ 'active': activeFilters.pickedUp }">
                  <input type="checkbox" v-model="activeFilters.pickedUp">
                  <span>Picked Up</span>
                </label>
                <label class="filter-option" :class="{ 'active': activeFilters.notPickedUp }">
                  <input type="checkbox" v-model="activeFilters.notPickedUp">
                  <span>Not Picked Up</span>
                </label>
                <label class="filter-option" :class="{ 'active': activeFilters.prepaid }">
                  <input type="checkbox" v-model="activeFilters.prepaid">
                  <span>Prepaid</span>
                </label>
                <label class="filter-option" :class="{ 'active': activeFilters.venmo }">
                  <input type="checkbox" v-model="activeFilters.venmo">
                  <span>Venmo</span>
                </label>
                <label class="filter-option" :class="{ 'active': activeFilters.poly }">
                  <input type="checkbox" v-model="activeFilters.poly">
                  <span>Poly</span>
                </label>
                <label class="filter-option" :class="{ 'active': activeFilters.absent }">
                  <input type="checkbox" v-model="activeFilters.absent">
                  <span>Absent</span>
                </label>
              </div>
              <div class="filter-actions">
                <button class="clear-filters-btn" @click="clearFilters" v-if="!showAllOrders">Clear Filters</button>
                <span class="filter-count">{{ filteredOrders.length }} orders</span>
              </div>
            </div>
          </transition>
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
    <ExtraOrders v-if="currentComponent === 'extraOrders'" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
// @ts-ignore
import store from './store'
// @ts-ignore
import emitter from './eventBus'
import OrderDetail from './components/OrderDetail.vue'
import Settings from './components/Settings.vue'
import AddManualSale from './components/AddManualSale.vue'
import ExtraOrders from './components/ExtraOrders.vue'

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
  isPoly: boolean
  prepaid: boolean
  venmo: boolean
  isAbsent: boolean
}

export default defineComponent({
  name: 'App',
  components: {
    OrderDetail,
    Settings,
    AddManualSale,
    ExtraOrders
  },
  data() {
    return {
      currentComponent: 'orderList',
      selectedOrder: null as Order | null,
      search: '',
      activeFilters: {
        pickedUp: false,
        notPickedUp: false,
        prepaid: false,
        venmo: false,
        poly: false,
        absent: false
      },
      showAllOrders: true,
      isFilterPanelOpen: false,
      lastInputTime: 0,
      barcodeBuffer: '',
      barcodeTimeout: null as NodeJS.Timeout | null,
    }
  },
  computed: {
    orders(): Order[] {
      return store.orders
    },
    activeFilterCount(): number {
      return Object.values(this.activeFilters).filter(value => value).length;
    },
    filteredOrders(): Order[] {
      let filtered = this.orders;

      // If any filter is active, apply filters
      if (!this.showAllOrders) {
        filtered = filtered.filter(order => {
          // If no filters are selected, show all orders
          if (Object.values(this.activeFilters).every(value => !value)) {
            return true;
          }
          
          // Apply each active filter
          if (this.activeFilters.pickedUp && order.checkedIn) {
            return true;
          }
          if (this.activeFilters.notPickedUp && !order.checkedIn) {
            return true;
          }
          if (this.activeFilters.prepaid && order.prepaid) {
            return true;
          }
          if (this.activeFilters.venmo && order.venmo) {
            return true;
          }
          if (this.activeFilters.poly && order.isPoly) {
            return true;
          }
          if (this.activeFilters.absent && order.isAbsent) {
            return true;
          }
          
          // If none of the active filters match, exclude the order
          return false;
        });
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

      // Sort by last name
      return filtered.sort((a, b) => {
        const lastNameA = a.lastName.toLowerCase();
        const lastNameB = b.lastName.toLowerCase();
        return lastNameA.localeCompare(lastNameB);
      });
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
            (!this.selectedOrder || !newOrders.find((o: Order) => o.id === this.selectedOrder?.id))) {
          this.selectOrder(newOrders[0])
        }
      },
      immediate: true
    },
    activeFilters: {
      handler(newFilters) {
        // If any filter is active, uncheck "All Orders"
        if (Object.values(newFilters).some(value => value)) {
          this.showAllOrders = false;
        } else {
          // If no filters are active, check "All Orders"
          this.showAllOrders = true;
        }
      },
      deep: true
    },
    activeFilterCount: {
      handler(newCount) {
        // If filters are active but panel is closed, show the dropdown
        if (newCount > 0 && !this.isFilterPanelOpen) {
          // You could automatically open the panel here if desired
          // this.isFilterPanelOpen = true;
        }
      },
      immediate: true
    }
  },
  async created() {
    await store.loadData()
  },
  mounted() {
    emitter.on('addOrder', (order: Order) => {
      try {
        this.addOrder(order)
      } catch (error) {
        console.error("Error processing addOrder event:", error)
      }
    })

    // Listen for order updates from the socket
    emitter.on('orderPropertyToggled', (data: { orderId: number, property: string, value: boolean }) => {
      // If this is the currently selected order, update it
      if (this.selectedOrder && this.selectedOrder.id === data.orderId) {
        console.log(`Updating selected order property ${data.property} to ${data.value}`)
        // Create a new object to ensure reactivity
        const updatedOrder = { ...this.selectedOrder }
        // Use type assertion to handle dynamic property access
        ;(updatedOrder as any)[data.property] = data.value
        this.selectedOrder = updatedOrder
      }
    })

    window.addEventListener('keydown', this.handleBarcodeInput)
    
    // Add click outside listener for filter dropdown
    document.addEventListener('click', this.handleClickOutside);
  },
  beforeUnmount() {
    if (this.barcodeTimeout) {
      clearTimeout(this.barcodeTimeout)
    }
    emitter.off('addOrder')
    emitter.off('orderPropertyToggled')
    window.removeEventListener('keydown', this.handleBarcodeInput)
    
    // Remove click outside listener
    document.removeEventListener('click', this.handleClickOutside);
  },
  methods: {
    showComponent(component: string) {
      this.currentComponent = component
    },
    selectOrder(order: Order) {
      // Create a fresh copy from the store to ensure we have the latest data
      const storeOrder = store.orders.find((o: Order) => o.id === order.id)
      if (storeOrder) {
        // Create a deep copy to avoid reference issues
        this.selectedOrder = JSON.parse(JSON.stringify(storeOrder))
      } else {
        // Fallback to the provided order if not found in store
        this.selectedOrder = JSON.parse(JSON.stringify(order))
      }
      console.log('Selected order:', this.selectedOrder)
    },
    handleOrderUpdate(updatedOrder: Order) {
      store.updateOrder(updatedOrder)
      
      // If this is the currently selected order, update the selected order as well
      if (this.selectedOrder && this.selectedOrder.id === updatedOrder.id) {
        // Create a fresh copy from the store to ensure all properties are in sync
        const updatedOrderFromStore = store.orders.find((o: Order) => o.id === updatedOrder.id)
        if (updatedOrderFromStore) {
          this.selectedOrder = JSON.parse(JSON.stringify(updatedOrderFromStore))
        }
      }
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
    },
    handleShowAllChange() {
      // If "All Orders" is checked, uncheck all other filters
      if (this.showAllOrders) {
        Object.keys(this.activeFilters).forEach(key => {
          (this.activeFilters as any)[key] = false;
        });
      }
    },
    clearFilters() {
      // Reset all filters and set "All Orders" to true
      Object.keys(this.activeFilters).forEach(key => {
        (this.activeFilters as any)[key] = false;
      });
      this.showAllOrders = true;
    },
    toggleFilterPanel() {
      this.isFilterPanelOpen = !this.isFilterPanelOpen;
    },
    toggleFilter(filterName: string) {
      (this.activeFilters as any)[filterName] = !(this.activeFilters as any)[filterName];
    },
    handleClickOutside(event: MouseEvent) {
      const filterBtn = document.querySelector('.filter-toggle-btn');
      const filterPanel = document.querySelector('.filter-panel');
      
      // Check if click is outside both the filter button and filter panel
      if (filterBtn && filterPanel && 
          !filterBtn.contains(event.target as Node) && 
          !filterPanel.contains(event.target as Node)) {
        this.isFilterPanelOpen = false;
      }
    },
  }
})
</script>

<style src="./styles.css"></style>

<style>
/* Filter panel styles */
.search-controls {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  align-items: stretch; /* Align items to stretch to match heights */
}

.search-input {
  flex: 1;
  height: auto; /* Let the height be determined by padding */
  padding: 0.5rem 0.75rem; /* Match padding with the button */
  font-size: 0.9rem; /* Match font size with the button */
  border: 1px solid #D1D5DB;
  border-radius: 4px;
  box-sizing: border-box; /* Include padding in height calculation */
}

.filter-toggle-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  background-color: #F3F4F6;
  border: 1px solid #D1D5DB;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap; /* Prevent text wrapping */
  position: relative; /* Needed for badge positioning */
  height: auto; /* Let height be determined by content and padding */
  box-sizing: border-box; /* Include padding in height calculation */
}

.filter-toggle-btn:hover {
  background-color: #E5E7EB;
}

.filter-toggle-btn.active {
  background-color: #DBEAFE;
  border-color: #3B82F6;
  color: #1E40AF;
}

.toggle-icon {
  font-size: 0.7rem;
  margin-left: 0.25rem;
}

.filter-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #3B82F6;
  color: white;
  border-radius: 50%;
  min-width: 1.25rem;
  height: 1.25rem;
  font-size: 0.7rem;
  font-weight: bold;
  padding: 0 0.25rem;
  box-sizing: border-box;
}

.filter-panel {
  background-color: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 4px;
  padding: 0.75rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background-color: #F3F4F6;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.filter-option:hover {
  background-color: #E5E7EB;
}

.filter-option.active {
  background-color: #DBEAFE;
  border-color: #3B82F6;
  color: #1E40AF;
}

.filter-option input[type="checkbox"] {
  margin: 0;
}

.filter-option span {
  font-size: 0.9rem;
}

.filter-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.clear-filters-btn {
  background-color: #F3F4F6;
  border: 1px solid #D1D5DB;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-filters-btn:hover {
  background-color: #E5E7EB;
}

.filter-count {
  font-size: 0.8rem;
  color: #6B7280;
}

/* Transition effects */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
  max-height: 300px;
  overflow: hidden;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  max-height: 0;
  opacity: 0;
  margin-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
  border-width: 0;
}
</style>