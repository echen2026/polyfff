<template>
  <div class="manual-sale-container">
    <div class="form-section">
      <h2>Add Manual Sale</h2>
      
      <div class="info-box">
        <h3>Customer Information</h3>
        <div class="form-group">
          <label>First Name</label>
          <input v-model="firstName" placeholder="First Name" />
        </div>
        <div class="form-group">
          <label>Last Name</label>
          <input v-model="lastName" placeholder="Last Name" />
        </div>
        <div class="form-group">
          <label>Grade</label>
          <input v-model="grade" placeholder="Grade" />
        </div>
      </div>

      <div class="status-box">
        <h3>Order Status</h3>
        <div class="toggle-group">
          <label class="toggle-label">
            <input type="checkbox" v-model="pickedUp">
            Picked Up
          </label>
          <label class="toggle-label">
            <input type="checkbox" v-model="isPoly">
            Poly
          </label>
          <label class="toggle-label">
            <input type="checkbox" v-model="prepaid">
            Prepaid
          </label>
          <label class="toggle-label">
            <input type="checkbox" v-model="venmo">
            Venmo
          </label>
        </div>
      </div>

      <div class="menu-box">
        <h3>Menu Items</h3>
        <div class="menu-items-grid">
          <div v-for="item in menuItems" :key="item.name" class="menu-item">
            <span class="item-name">{{ item.name }} - ${{ item.price }}</span>
            <div class="quantity-controls">
              <button @click="decrementQuantity(item)" class="quantity-btn">-</button>
              <span class="quantity-display">{{ getQuantity(item) }}</span>
              <button @click="incrementQuantity(item)" class="quantity-btn">+</button>
            </div>
          </div>
        </div>
      </div>

      <div class="total-box">
        <div class="total-label">Total</div>
        <div class="total-amount">${{ calculateTotal.toFixed(2) }}</div>
      </div>

      <div class="form-actions">
        <button @click="submitOrder" class="submit-button" :disabled="!isValid">Submit Order</button>
        <button @click="cancel" class="cancel-button">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import store from '../store'
import type { MenuItem, OrderItem } from '../types'

export default defineComponent({
  name: 'AddManualSale',
  setup() {
    return {
      store
    }
  },
  data() {
    return {
      firstName: '',
      lastName: '',
      grade: '',
      selectedItems: {} as Record<string, number>,
      pickedUp: false,
      isPoly: false,
      prepaid: false,
      venmo: false
    }
  },
  computed: {
    menuItems() {
      return store.menuItems || []
    },
    calculateTotal(): number {
      return Object.entries(this.selectedItems).reduce((total, [itemName, quantity]) => {
        const item = store.menuItems.find(i => i.name === itemName)
        return total + (item ? item.price * quantity : 0)
      }, 0)
    },
    isValid(): boolean {
      return (
        this.firstName.trim() !== '' &&
        this.lastName.trim() !== '' &&
        this.grade.trim() !== '' &&
        Object.values(this.selectedItems).some(quantity => quantity > 0)
      )
    }
  },
  methods: {
    getQuantity(item: MenuItem): number {
      return this.selectedItems[item.name] || 0
    },
    incrementQuantity(item: MenuItem) {
      if (!this.selectedItems[item.name]) {
        this.selectedItems[item.name] = 0
      }
      this.selectedItems[item.name]++
    },
    decrementQuantity(item: MenuItem) {
      if (this.selectedItems[item.name] && this.selectedItems[item.name] > 0) {
        this.selectedItems[item.name]--
      }
    },
    findStudentId(firstName, lastName) {
      // Remove extra spaces, punctuation and make case insensitive
      const cleanName = (name) => name.toLowerCase().replace(/[^\w\s]/g, '').trim();
      const cleanFirstName = cleanName(firstName);
      const cleanLastName = cleanName(lastName);
      
      const student = store.students.find(s => 
        cleanName(s.first_name) === cleanFirstName && 
        cleanName(s.last_name) === cleanLastName
      );
      
      return student ? student.id.toString() : null;
    },
    submitOrder() {
      if (!this.isValid) return

      const orderItems = Object.entries(this.selectedItems)
        .filter(([_, quantity]) => quantity > 0)
        .map(([itemName, quantity]) => {
          const item = store.menuItems.find(i => i.name === itemName)!
          return {
            name: itemName,
            quantity,
            price: item.price
          }
        })

      // Find student ID based on name
      const studentId = this.findStudentId(this.firstName.trim(), this.lastName.trim());

      const order = {
        id: Date.now(),
        orderId: studentId, // Set the orderId to the found student ID
        firstName: this.firstName.trim(),
        lastName: this.lastName.trim(),
        grade: this.grade.trim(),
        items: orderItems,
        checkedIn: this.pickedUp,
        isPoly: this.isPoly,
        prepaid: this.prepaid,
        venmo: this.venmo,
        paymentMethod: this.getPaymentMethod()
      }

      store.orders.push(order)
      store.saveData()
      this.goHome()
    },
    getPaymentMethod() {
      if (this.isPoly) return 'Poly'
      if (this.prepaid) return 'Prepaid'
      if (this.venmo) return 'Venmo'
      return 'Cash'
    },
    cancel() {
      this.goHome()
    },
    goHome() {
      this.$emit('close')
      if (typeof this.$parent?.showComponent === 'function') {
        this.$parent.showComponent('orderList')
      }
    }
  }
})
</script>

<style scoped>
.manual-sale-container {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.info-box, .menu-box, .total-box, .status-box {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
}

.menu-items-grid {
  display: grid;
  gap: 1rem;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.menu-item:last-child {
  border-bottom: none;
}

.quantity-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.quantity-btn {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.quantity-btn:hover {
  background: #f9fafb;
}

.quantity-display {
  min-width: 30px;
  text-align: center;
  font-weight: 500;
}

.total-box {
  text-align: center;
}

.total-label {
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.total-amount {
  font-size: 2.5rem;
  font-weight: 600;
  color: #1d1d1f;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.submit-button, .cancel-button {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-button {
  background: #0071e3;
  color: white;
  border: none;
}

.submit-button:hover {
  background: #0077ed;
}

.submit-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.cancel-button {
  background: white;
  border: 1px solid #e5e7eb;
  color: #374151;
}

.cancel-button:hover {
  background: #f9fafb;
}

.status-box {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.5rem;
}

.toggle-group {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-top: 1rem;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.toggle-label input[type="checkbox"] {
  width: 1.2rem;
  height: 1.2rem;
}
</style>
