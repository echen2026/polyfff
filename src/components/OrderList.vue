<template>
    <div>
      <div class="search-container">
        <div class="header-controls">
          <h2>Search First or Last Name</h2>
        </div>
        <input v-model="search" placeholder="Search by first or last name..."/>
        <div class="filter-buttons">
          <button @click="setFilter('all')" :class="{ active: currentFilter === 'all' }">All</button>
          <button @click="setFilter('cash')" :class="{ active: currentFilter === 'cash' }">Cash</button>
          <button @click="setFilter('venmo')" :class="{ active: currentFilter === 'venmo' }">Venmo</button>
          <button @click="setFilter('prepaid')" :class="{ active: currentFilter === 'prepaid' }">Prepaid</button>
          <button @click="setFilter('poly')" :class="{ active: currentFilter === 'poly' }">Poly</button>
          <button @click="setFilter('unpaid')" :class="{ active: currentFilter === 'unpaid' }">Unpaid</button>
          <button @click="setFilter('picked-up')" :class="{ active: currentFilter === 'picked-up' }">Picked Up</button>
          <button @click="setFilter('not-picked-up')" :class="{ active: currentFilter === 'not-picked-up' }">Not Picked Up</button>
        </div>
      </div>
      <ul>
        <li v-for="order in filteredOrders" :key="order.id" class="order-card">
          <div class="order-header">
            <div class="order-name">{{ order.firstName }} {{ order.lastName }}</div>
            <div class="order-controls">
              <select v-model="order.paymentMethod" @change="updateOrderWithPaymentMethod(order)" class="payment-select">
                <option value="Cash">Cash</option>
                <option value="Venmo">Venmo</option>
                <option value="Prepaid">Prepaid</option>
                <option value="Poly">Poly</option>
                <option value="Unpaid">Unpaid</option>
              </select>
              <button @click="togglePickup(order)" :class="{'checked-in': order.checkedIn}" class="pickup-toggle">
                {{ order.checkedIn ? 'Picked Up' : 'Not Picked Up' }}
              </button>
            </div>
          </div>
          <div class="order-details">
            <div class="detail-row">
              <span class="detail-label">Grade:</span>
              <span class="detail-value">{{ order.grade }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Total:</span>
              <span class="detail-value">${{ calculateTotal(order) }}</span>
            </div>
            <div class="order-items">
              <div v-for="item in order.items" :key="item.name" class="item-row">
                <span class="item-name">{{ item.name }}</span>
                <span class="item-quantity">x{{ item.quantity }}</span>
                <span class="item-price">${{ (item.price * item.quantity).toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>
</template>

<script>
import emitter from '../eventBus';

export default {
  props: ['orders'],
  data() {
    return {
      search: '',
      currentFilter: 'all',
    };
  },
  computed: {
    filteredOrders() {
      let filtered = this.orders;
      if (this.currentFilter !== 'all') {
        filtered = filtered.filter(order => {
          switch (this.currentFilter) {
            case 'cash': return order.paymentMethod === 'Cash';
            case 'venmo': return order.paymentMethod === 'Venmo';
            case 'prepaid': return order.paymentMethod === 'Prepaid';
            case 'poly': return order.paymentMethod === 'Poly';
            case 'unpaid': return order.paymentMethod === 'Unpaid';
            case 'picked-up': return order.checkedIn;
            case 'not-picked-up': return !order.checkedIn;
            default: return true;
          }
        });
      }
      const searchTerms = this.search.toLowerCase().split(' ');
      return filtered.filter(order => {
        const fullName = `${order.firstName} ${order.lastName}`.toLowerCase();
        return searchTerms.every(term => fullName.includes(term));
      });
    }
  },
  methods: {
    calculateTotal(order) {
      return order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
    },
    setFilter(filter) {
      this.currentFilter = filter;
    },
    togglePickup(order) {
      order.checkedIn = !order.checkedIn;
      emitter.emit('updateOrder', order);
    },
    updateOrderWithPaymentMethod(order) {
      // also set pickup status to to true
      // order.checkedIn = true;
      emitter.emit('updateOrder', order);
    },
    updateOrder(order) {
      emitter.emit('updateOrder', order);
    },
    downloadCSV() {
      // Get all unique menu items from orders
      const menuItems = new Set();
      this.orders.forEach(order => {
        order.items.forEach(item => menuItems.add(item.name));
      });

      // Create headers array with fixed columns first, then menu items
      const headers = [
        'First Name',
        'Last Name', 
        'Grade',
        'Total',
        'Picked Up',
        'Poly',
        'Prepaid',
        'Venmo',
        ...Array.from(menuItems)
      ];

      // Create CSV content starting with headers
      let csvContent = headers.join(',') + '\n';

      // Add each order as a row
      this.orders.forEach(order => {
        // Calculate total
        const total = order.items.reduce((sum, item) => 
          sum + (item.price * item.quantity), 0
        );

        // Create base row data
        const row = [
          order.firstName,
          order.lastName,
          order.grade,
          total.toFixed(2),
          order.checkedIn ? 'Yes' : 'No',
          order.isPoly ? 'Yes' : 'No',
          order.prepaid ? 'Yes' : 'No',
          order.venmo ? 'Yes' : 'No'
        ];

        // Add quantities for each menu item
        menuItems.forEach(menuItem => {
          const orderItem = order.items.find(item => item.name === menuItem);
          row.push(orderItem ? orderItem.quantity : '0');
        });

        csvContent += row.join(',') + '\n';
      });

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'orders.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
};
</script>