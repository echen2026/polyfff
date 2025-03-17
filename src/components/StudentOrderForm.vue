<template>
  <div class="student-order-form">
    <div v-if="orderFormLocked" class="form-locked">
      <div class="lock-icon">🔒</div>
      <h2>Orders are currently closed</h2>
      <p>The ordering system is not accepting new orders at this time. Please check back later.</p>
    </div>

    <div v-else>
      <div class="form-header">
        <h1>{{ formTitle }}</h1>
        <p class="form-description">{{ formDescription }}</p>
      </div>

      <div class="form-content">
        <!-- Student Info Section -->
        <div class="student-info-section">
          <h2>Your Information</h2>
          <div v-if="!isAuthenticated" class="auth-section">
            <p>Please sign in with your school Google account to continue</p>
            <div id="googleSignInButton"></div>
          </div>
          <div v-else class="student-info">
            <div class="student-profile">
              <div class="student-details">
                <h3>{{ currentUser?.given_name }} {{ currentUser?.family_name }}</h3>
                <p class="student-email">{{ currentUser?.email }}</p>
                <p class="student-grade" v-if="matchedStudent">{{ formatGrade(matchedStudent.grade) }}</p>
                <div v-if="!matchedStudent" class="student-not-found">
                  <p class="error-message">Your email was not found in our system.</p>
                  <p class="help-text">Please contact an administrator or try signing in with a different account.</p>
                </div>
              </div>
            </div>
            <button @click="signOut" class="sign-out-button">Sign Out</button>
          </div>
        </div>

        <!-- Menu Section -->
        <div class="menu-section">
          <h2>Menu Items</h2>
          <div class="menu-grid">
            <div v-for="item in menuItems" :key="item.name" class="menu-item">
              <div 
                v-if="item.imageUrl"
                class="item-image" 
                :style="{ 
                  backgroundImage: `url(${item.imageUrl})`,
                  backgroundColor: '#f5f5f7'
                }"
                @error="handleImageError"
              >
                <div class="item-overlay"></div>
              </div>
              <div class="item-content">
                <div class="item-header">
                  <h3>{{ item.name }}</h3>
                  <div class="item-price">${{ item.price.toFixed(2) }}</div>
                </div>
                <p class="item-description" v-if="item.description">{{ item.description }}</p>
                <div class="quantity-controls">
                  <button 
                    @click="decrementQuantity(item)" 
                    class="quantity-btn"
                    :disabled="!getQuantity(item)"
                  >
                    <span class="minus-icon">−</span>
                  </button>
                  <span class="quantity">{{ getQuantity(item) }}</span>
                  <button 
                    @click="incrementQuantity(item)" 
                    class="quantity-btn"
                  >
                    <span class="plus-icon">+</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Order Summary Section -->
        <div class="order-summary" v-if="hasItems">
          <h2>Order Summary</h2>
          <div class="summary-content">
            <div class="summary-items">
              <div v-for="[itemName, quantity] in selectedItemsArray" :key="itemName" class="summary-item">
                <span class="item-name">{{ itemName }}</span>
                <span class="item-quantity">x{{ quantity }}</span>
                <span class="item-total">${{ (getItemPrice(itemName) * quantity).toFixed(2) }}</span>
              </div>
            </div>
            <div class="summary-total">
              <span>Total</span>
              <span class="total-amount">${{ totalAmount.toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <button 
            @click="submitOrder" 
            class="submit-button"
            :disabled="!isValid"
          >
            Place Order
          </button>
        </div>
      </div>

      <!-- Order Confirmation Overlay -->
      <div v-if="orderSubmitted" class="confirmation-overlay">
        <div class="confirmation-modal">
          <div class="confirmation-icon">✓</div>
          <h2>Thank You!</h2>
          <p>Your order has been submitted successfully.</p>
          <button @click="resetForm" class="reset-button">Place Another Order</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import store from '../store.js'
import { MenuItem, Student } from '../types'
import emitter from '../eventBus'
import { isAuthenticated, currentUser, initGoogleAuth, signOut } from '../services/auth'

export default defineComponent({
  name: 'StudentOrderForm',
  setup() {
    return {
      store,
      isAuthenticated,
      currentUser,
      signOut
    }
  },
  data() {
    return {
      selectedItems: {} as Record<string, number>,
      orderSubmitted: false,
      submittedOrderId: '',
      formTitle: 'Place Your Order',
      formDescription: 'Please sign in to place your order.',
      matchedStudent: null as Student | null
    }
  },
  computed: {
    menuItems(): MenuItem[] {
      return store.menuItems || []
    },
    calculateTotal(): number {
      return Object.entries(this.selectedItems).reduce((total, [itemName, quantity]) => {
        const item = this.menuItems.find(i => i.name === itemName)
        return total + (item ? item.price * quantity : 0)
      }, 0)
    },
    isValid(): boolean {
      return (
        this.isAuthenticated &&
        this.matchedStudent !== null &&
        Object.values(this.selectedItems).some(quantity => quantity > 0)
      )
    },
    orderFormLocked(): boolean {
      return store.orderFormLocked
    },
    formTitle(): string {
      return store.orderFormTitle
    },
    formDescription(): string {
      return store.orderFormDescription
    },
    student(): Student {
      return store.students.find((s: Student) => s.id === this.submittedOrderId) || {} as Student;
    },
    totalAmount(): number {
      return this.calculateTotal;
    },
    hasItems(): boolean {
      return Object.values(this.selectedItems).some(quantity => quantity > 0);
    },
    selectedItemsArray(): [string, number][] {
      return Object.entries(this.selectedItems)
        .filter(([_, quantity]) => quantity > 0) as [string, number][];
    }
  },
  mounted() {
    // Initialize Google Sign-In
    initGoogleAuth()
    
    // Load data when component is mounted
    store.loadData().then(() => {
      console.log('Data loaded for student order form')
    })
    
    // Listen for order form lock updates
    emitter.on('orderFormLockUpdated', (locked: boolean) => {
      console.log('Order form lock status updated:', locked)
    })
    
    // Listen for order form settings updates
    emitter.on('orderFormSettingsUpdated', (settings: any) => {
      console.log('Order form settings updated:', settings)
    })

    // Watch for user authentication changes
    this.$watch(() => this.currentUser, (newUser) => {
      if (newUser) {
        this.matchStudentByEmail(newUser.email)
      }
    })
  },
  unmounted() {
    // Clean up event listeners
    emitter.off('orderFormLockUpdated')
    emitter.off('orderFormSettingsUpdated')
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
    getItemPrice(itemName: string): number {
      const item = this.menuItems.find(i => i.name === itemName);
      return item ? item.price : 0;
    },
    matchStudentByEmail(email: string) {
      this.matchedStudent = store.students.find((student: Student) => 
        student.email?.toLowerCase() === email.toLowerCase()
      ) || null
    },
    formatGrade(grade: string): string {
      // Remove any 'Grade' prefix if it exists
      return grade.replace(/^Grade\s*/i, 'Grade ');
    },
    submitOrder() {
      if (!this.isValid) return

      const orderItems = Object.entries(this.selectedItems)
        .filter(([_, quantity]) => quantity > 0)
        .map(([itemName, quantity]) => {
          const item = this.menuItems.find((i: MenuItem) => i.name === itemName)!
          return {
            name: itemName,
            quantity,
            price: item.price
          }
        })

      const order = {
        id: Date.now(),
        orderId: this.matchedStudent?.id.toString(),
        firstName: this.currentUser?.given_name || '',
        lastName: this.currentUser?.family_name || '',
        grade: this.matchedStudent?.grade || '',
        email: this.currentUser?.email || '',
        items: orderItems,
        checkedIn: false,
        isPoly: false,
        prepaid: false,
        venmo: false,
        isAbsent: false,
        paymentMethod: 'Unpaid'
      }

      this.submittedOrderId = order.id.toString()
      store.orders.push(order)
      store.saveData()
      this.orderSubmitted = true
    },
    resetForm() {
      this.selectedItems = {}
      this.orderSubmitted = false
      this.submittedOrderId = ''
    },
    handleImageError(event: Event) {
      // If the image fails to load, set a fallback background
      const target = event.target as HTMLElement;
      if (target) {
        target.style.backgroundImage = 'none';
      }
    }
  }
})
</script>

<style scoped>
.student-order-form {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.form-locked {
  text-align: center;
  padding: 80px 20px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
}

.lock-icon {
  font-size: 48px;
  margin-bottom: 24px;
  color: #86868b;
}

.form-locked h2 {
  font-size: 28px;
  color: #1d1d1f;
  margin-bottom: 16px;
  font-weight: 600;
}

.form-locked p {
  font-size: 18px;
  color: #86868b;
  max-width: 400px;
  margin: 0 auto;
  line-height: 1.5;
}

.form-header {
  text-align: center;
  margin-bottom: 60px;
}

.form-header h1 {
  font-size: 48px;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 16px;
  letter-spacing: -0.5px;
}

.form-description {
  font-size: 21px;
  color: #86868b;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.4;
}

.form-content {
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
  padding: 40px;
}

/* Student Info Section Styles */
.student-info-section {
  margin-bottom: 40px;
  padding-bottom: 40px;
  border-bottom: 1px solid #f5f5f7;
}

.student-info-section h2 {
  font-size: 28px;
  color: #1d1d1f;
  margin-bottom: 24px;
  font-weight: 600;
}

.auth-section {
  text-align: center;
  padding: 40px;
  background: #f5f5f7;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.auth-section p {
  font-size: 18px;
  color: #1d1d1f;
  margin-bottom: 30px;
  font-weight: 500;
}

#googleSignInButton {
  display: flex;
  justify-content: center;
  margin: 0 auto;
}

.student-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f5f5f7;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 24px;
}

.student-profile {
  display: flex;
  align-items: center;
}

.student-details h3 {
  font-size: 20px;
  color: #1d1d1f;
  margin-bottom: 4px;
  font-weight: 600;
}

.student-email {
  font-size: 14px;
  color: #86868b;
  margin-bottom: 4px;
}

.student-grade {
  font-size: 16px;
  color: #1d1d1f;
  font-weight: 500;
}

.sign-out-button {
  background: #f5f5f7;
  color: #1d1d1f;
  border: 1px solid #d2d2d7;
  border-radius: 980px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sign-out-button:hover {
  background: #e5e5e5;
}

/* Menu Section Styles */
.menu-section {
  margin-bottom: 40px;
}

.menu-section h2 {
  font-size: 28px;
  color: #1d1d1f;
  margin-bottom: 24px;
  font-weight: 600;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.menu-item {
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.menu-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.item-image {
  width: 100%;
  aspect-ratio: 16/9;
  background-size: cover;
  background-position: center;
  position: relative;
  background-color: #f5f5f7;
}

.item-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%);
}

.item-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  background-color: #ffffff;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.item-header h3 {
  font-size: 18px;
  color: #1d1d1f;
  margin: 0;
  font-weight: 600;
  flex: 1;
  line-height: 1.3;
}

.item-price {
  font-size: 18px;
  color: #1d1d1f;
  font-weight: 600;
  white-space: nowrap;
  margin-left: 8px;
}

.item-description {
  font-size: 14px;
  color: #86868b;
  margin-bottom: 16px;
  line-height: 1.4;
  flex-grow: 1;
}

.quantity-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: auto;
}

.quantity-btn {
  width: 36px;
  height: 36px;
  border-radius: 18px;
  border: 1px solid #e5e5e5;
  background: #ffffff;
  color: #1d1d1f;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quantity-btn:hover:not(:disabled) {
  background: #f5f5f7;
  border-color: #d2d2d7;
}

.quantity-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quantity {
  font-size: 18px;
  color: #1d1d1f;
  font-weight: 500;
  min-width: 24px;
  text-align: center;
}

/* Order Summary Styles */
.order-summary {
  background: #f5f5f7;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 40px;
}

.order-summary h2 {
  font-size: 24px;
  color: #1d1d1f;
  margin-bottom: 20px;
  font-weight: 600;
}

.summary-items {
  margin-bottom: 20px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #e5e5e5;
}

.summary-item:last-child {
  border-bottom: none;
}

.item-name {
  font-size: 16px;
  color: #1d1d1f;
}

.item-quantity {
  font-size: 16px;
  color: #86868b;
}

.item-total {
  font-size: 16px;
  color: #1d1d1f;
  font-weight: 500;
}

.summary-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 2px solid #e5e5e5;
  font-size: 20px;
  color: #1d1d1f;
  font-weight: 600;
}

.total-amount {
  font-size: 24px;
}

/* Form Actions Styles */
.form-actions {
  text-align: center;
}

.submit-button {
  background: #0071e3;
  color: #ffffff;
  border: none;
  border-radius: 980px;
  padding: 16px 32px;
  font-size: 17px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 200px;
}

.submit-button:hover:not(:disabled) {
  background: #0077ed;
  transform: translateY(-1px);
}

.submit-button:disabled {
  background: #999999;
  cursor: not-allowed;
}

/* Confirmation Overlay Styles */
.confirmation-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.confirmation-modal {
  background: #ffffff;
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.confirmation-icon {
  width: 72px;
  height: 72px;
  background: #30d158;
  border-radius: 50%;
  color: white;
  font-size: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}

.confirmation-modal h2 {
  font-size: 28px;
  color: #1d1d1f;
  margin-bottom: 16px;
  font-weight: 600;
}

.confirmation-modal p {
  font-size: 16px;
  color: #86868b;
  margin-bottom: 24px;
}

.reset-button {
  background: #0071e3;
  color: #ffffff;
  border: none;
  border-radius: 980px;
  padding: 14px 28px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-button:hover {
  background: #0077ed;
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .student-order-form {
    padding: 20px;
  }

  .form-header h1 {
    font-size: 36px;
  }

  .form-description {
    font-size: 18px;
  }

  .form-content {
    padding: 24px;
  }

  .menu-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .item-image {
    aspect-ratio: 16/9; /* Keep the same aspect ratio on mobile */
  }
  
  .student-info {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .sign-out-button {
    align-self: flex-start;
  }
  
  .student-details h3 {
    font-size: 18px;
  }
  
  .item-header h3 {
    font-size: 16px; 
  }
  
  .item-price {
    font-size: 16px;
  }
}

.item-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #86868b;
  font-weight: 500;
  text-align: center;
  padding: 20px;
  background-color: #f5f5f7;
  z-index: 1;
}

.student-not-found {
  margin-top: 8px;
  padding: 12px;
  background-color: #fff2f2;
  border-radius: 8px;
  border-left: 4px solid #e53e3e;
}

.error-message {
  color: #e53e3e;
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 4px;
}

.help-text {
  color: #666;
  font-size: 13px;
  margin: 0;
}
</style> 