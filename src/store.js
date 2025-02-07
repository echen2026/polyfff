import { reactive } from 'vue';
import { io } from 'socket.io-client';
import emitter from './eventBus';

const store = reactive({
  orders: [],
  menuItems: [],

  async loadData() {
    try {
      const response = await fetch('/api/data');
      const data = await response.json();
      this.orders = data.orders;
      this.menuItems = data.menuItems;
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  },

  async saveData() {
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orders: this.orders,
          menuItems: this.menuItems
        })
      });
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  },

  updateOrder(updatedOrder) {
    const index = this.orders.findIndex(o => o.id === updatedOrder.id);
    if (index !== -1) {
      this.orders.splice(index, 1, updatedOrder);
      this.saveData();
    }
  },

  addOrder(order) {
    order.id = Date.now();
    this.orders.push(order);
    this.saveData();
  }
});

// Listen for events
emitter.on('updateOrder', (order) => {
  console.log("Updating order in store", order);
  store.updateOrder(order);
});

emitter.on('addOrder', (order) => {
  store.addOrder(order);
});

// Socket.IO connection
const socket = io();
socket.on('dataUpdated', (data) => {
  store.orders = data.orders;
  store.menuItems = data.menuItems;
});

export default store; 