<template>
  <div class="manual-sale-container">
    <div class="form-section">
      <h2>Add Manual Sale</h2>
      
      <div class="info-box">
        <div class="customer-info-row">
          <div class="autocomplete">
            <input 
              v-model="firstName" 
              @input="handleNameInput"
              placeholder="First Name" 
              class="compact-input name-input"
            />
            <div v-if="suggestions.length" class="suggestions-box">
              <div 
                v-for="student in suggestions" 
                :key="student.id"
                @click="selectStudent(student)"
                class="suggestion-item"
              >
                {{ student.first_name }} {{ student.last_name }} ({{ student.grade }})
              </div>
            </div>
          </div>
          <div class="autocomplete">
            <input 
              v-model="lastName" 
              @input="handleNameInput"
              placeholder="Last Name" 
              class="compact-input name-input"
            />
          </div>
          <input v-model="grade" placeholder="Grade" class="compact-input grade-input" />
        </div>
      </div>

      <div class="status-box">
        <div class="toggle-group">
          <label class="pickup-toggle" :class="{ 'is-picked-up': pickedUp }">
            <input type="checkbox" v-model="pickedUp">
            <span class="pickup-label">
              <span class="pickup-icon">{{ pickedUp ? '✓' : '✕' }}</span>
              {{ pickedUp ? 'Picked Up' : 'Not Picked Up' }}
            </span>
          </label>
          <div class="payment-toggles">
            <label class="payment-toggle">
              <input type="checkbox" v-model="isPoly">
              <span>Poly</span>
            </label>
            <label class="payment-toggle">
              <input type="checkbox" v-model="prepaid">
              <span>Prepaid</span>
            </label>
            <label class="payment-toggle">
              <input type="checkbox" v-model="venmo">
              <span>Venmo</span>
            </label>
          </div>
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
        <div class="total-label">Total: ${{ calculateTotal.toFixed(2) }}</div>
        <div class="form-actions">
          <button @click="submitOrder" class="submit-button" :disabled="!isValid">Submit</button>
        </div>
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
      venmo: false,
      suggestions: [] as any[]
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
    },
    handleNameInput() {
      // Clear suggestions if both inputs are empty
      if (this.firstName.length < 2 && this.lastName.length < 2) {
        this.suggestions = [];
        return;
      }
      
      const firstNameTerm = this.firstName.toLowerCase();
      const lastNameTerm = this.lastName.toLowerCase();
      
      this.suggestions = store.students
        .filter(student => {
          const matchesFirstName = 
            student.first_name.toLowerCase().includes(firstNameTerm) ||
            (student.nickname && student.nickname.toLowerCase().includes(firstNameTerm));
          
          const matchesLastName = 
            student.last_name.toLowerCase().includes(lastNameTerm);
          
          // Match if either name matches their respective search term
          // If one search term is empty, only check the other
          return (firstNameTerm.length >= 2 ? matchesFirstName : true) &&
                 (lastNameTerm.length >= 2 ? matchesLastName : true);
        })
        .slice(0, 5); // Limit to 5 suggestions
    },
    selectStudent(student) {
      this.firstName = student.first_name;
      this.lastName = student.last_name;
      this.grade = student.grade.replace(/^Grade\s*/i, '');
      this.suggestions = [];
    }
  }
})
</script>

<style scoped>
.manual-sale-container {
  padding: 1rem;
  max-width: 800px;
  margin: 0 auto;
}

.customer-info-row {
  display: grid;
  grid-template-columns: 1fr 1fr 80px;
  gap: 0.5rem;
  align-items: center;
}

.name-input {
  width: 100%;
}

.compact-input {
  padding: 0.5rem;
  font-size: 0.9rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.grade-input {
  width: 80px;
}

.autocomplete {
  position: relative;
  width: 100%;
}

.suggestions-box {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
}

.suggestion-item {
  padding: 0.5rem;
  cursor: pointer;
}

.suggestion-item:hover {
  background: #f3f4f6;
}

.menu-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 0.5rem;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
}

.status-box {
  background: white;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.1);
  margin: 1rem 0;
}

.toggle-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
}

.pickup-toggle {
  background: #fee2e2;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  border: 1px solid #fecaca;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pickup-toggle:hover {
  background: #fecaca;
}

.pickup-toggle.is-picked-up {
  background: #dcfce7;
  border-color: #86efac;
}

.pickup-toggle.is-picked-up:hover {
  background: #bbf7d0;
}

.pickup-toggle input[type="checkbox"] {
  display: none;
}

.pickup-toggle input[type="checkbox"]:checked + .pickup-label {
  color: #16a34a;
  font-weight: 600;
}

.pickup-toggle input[type="checkbox"]:checked + .pickup-label .pickup-icon {
  color: #16a34a;
}

.pickup-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  color: #dc2626;
  font-weight: 500;
  transition: color 0.2s ease;
}

.is-picked-up .pickup-label {
  color: #16a34a;
}

.pickup-icon {
  font-size: 1.2rem;
}

.payment-toggles {
  display: flex;
  gap: 0.75rem;
  background: #f8fafc;
  padding: 0.5rem;
  border-radius: 8px;
}

.payment-toggle {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #64748b;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
}

.payment-toggle:hover {
  background: #e2e8f0;
}

.payment-toggle input[type="checkbox"] {
  display: none;
}

.payment-toggle input[type="checkbox"]:checked + span {
  color: #16a34a;
  font-weight: 500;
}

.payment-toggle input[type="checkbox"]:checked {
  background: #dcfce7;
}

.payment-toggle input[type="checkbox"]:checked ~ span {
  background: #dcfce7;
}

.payment-toggle:has(input[type="checkbox"]:checked) {
  background: #dcfce7;
  border-color: #86efac;
}

.pickup-toggle:has(input[type="checkbox"]:checked) {
  background: #dcfce7;
  border-color: #86efac;
}

.total-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.submit-button {
  padding: 0.75rem 2.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
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
</style>
