import { reactive } from 'vue';
import { io } from 'socket.io-client';

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
  }
});

// Establish a Socket.IO connection for realtime updates
const socket = io();
socket.on('dataUpdated', (data) => {
  store.orders = data.orders;
  store.menuItems = data.menuItems;
});

export default store; 