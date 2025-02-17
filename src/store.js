import { reactive } from 'vue';
import { io } from 'socket.io-client';
import emitter from './eventBus';

// Initialize socket with reconnection settings
const socket = io({
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
  timeout: 20000
});

const store = reactive({
  orders: [],
  students: [],
  menuItems: [],
  isConnected: false,

  async loadData() {
    // First load whatever is in localStorage
    this.loadFromLocalStorage();
    
    try {
      const response = await fetch('/api/data');
      const serverData = await response.json();
      console.log('Data loaded from server:', serverData);

      // Check if students are present in the response
      if (serverData.students && serverData.students.length > 0) {
        console.log('Students loaded:', serverData.students);
      } else {
        console.log('No students found in server data.');
      }

      // Always override the local store with the server data.
      this.orders = serverData.orders;
      this.menuItems = serverData.menuItems;
      this.students = serverData.students;
      this.saveToLocalStorage();
    } catch (error) {
      console.error('Error loading data from server:', error);
    }
  },

  loadFromLocalStorage() {
    try {
      const savedOrders = localStorage.getItem('orders');
      const savedMenuItems = localStorage.getItem('menuItems');
      
      if (savedOrders) this.orders = JSON.parse(savedOrders);
      if (savedMenuItems) this.menuItems = JSON.parse(savedMenuItems);
      
      console.log('Data loaded from localStorage');
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  },

  saveToLocalStorage() {
    try {
      localStorage.setItem('orders', JSON.stringify(this.orders));
      localStorage.setItem('menuItems', JSON.stringify(this.menuItems));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  updateOrder(updatedOrder) {
    const index = this.orders.findIndex(o => o.id === updatedOrder.id);
    if (index !== -1) {
      // Create a new order object to ensure proper reactivity
      const newOrder = {
        ...this.orders[index],
        ...updatedOrder,
        id: this.orders[index].id // Ensure ID stays the same
      };
      this.orders[index] = newOrder;
      this.saveToLocalStorage();
      socket.emit('orderUpdated', newOrder);
    }
  },

  deleteOrder(orderId) {
    const index = this.orders.findIndex(order => order.id === orderId);
    if (index !== -1) {
      this.orders.splice(index, 1);
      this.saveToLocalStorage();
      socket.emit('orderDeleted', orderId);
    }
  },

  addOrder(order) {
    if (!this.orders.find(o => o.id === order.id)) {
      this.orders.push(order);
      this.saveToLocalStorage();
      socket.emit('orderAdded', order);
    }
  },

  updateMenuItems(menuItems) {
    this.menuItems = menuItems;
    this.saveToLocalStorage();
    socket.emit('menuUpdated', menuItems);
  },

  toggleOrderProperty(orderId, property) {
    const orderIndex = this.orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      // Directly update the reactive property on this order
      this.orders[orderIndex][property] = !this.orders[orderIndex][property];
      this.saveToLocalStorage();
      socket.emit('orderUpdated', this.orders[orderIndex]);
    }
  },

  async saveData() {
    // Save to localStorage as before.
    this.saveToLocalStorage();
    
    // Log the size of the data being sent
    const payload = {
      orders: this.orders,
      menuItems: this.menuItems,
      students: this.students
    };
    console.log("Payload size:", JSON.stringify(payload).length); // Log the size of the payload
    
    // Now also persist to the backend via a POST request.
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        console.error("Failed to persist data to server, status:", response.status);
      }
    } catch (error) {
      console.error("Error saving data to server:", error);
    }
  }
});

// Socket event listeners
socket.on('connect', () => {
  console.log('Connected to server');
  store.isConnected = true;
  store.loadData();
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
  store.isConnected = false;
});

socket.on('initialData', (data) => {
  console.log('Received initial data');
  store.orders = data.orders;
  store.menuItems = data.menuItems;
  store.students = data.students;
  store.saveToLocalStorage();
});

socket.on('dataUpdated', (data) => {
  console.log('Received data update');
  store.orders = data.orders;
  store.menuItems = data.menuItems;
  store.saveToLocalStorage();
});

socket.on('orderAdded', (order) => {
  console.log('Received new order:', order.id);
  if (!store.orders.find(o => o.id === order.id)) {
    store.orders.push(order);
    store.saveToLocalStorage();
  }
});

socket.on('orderUpdated', (updatedOrder) => {
  console.log('Received order update:', updatedOrder.id);
  const index = store.orders.findIndex(o => o.id === updatedOrder.id);
  if (index !== -1) {
    store.orders[index] = updatedOrder;
    store.saveToLocalStorage();
  }
});

socket.on('orderDeleted', (orderId) => {
  console.log('Received order deletion:', orderId);
  const index = store.orders.findIndex(o => o.id === orderId);
  if (index !== -1) {
    store.orders.splice(index, 1);
    store.saveToLocalStorage();
  }
});

socket.on('menuUpdated', (menuItems) => {
  console.log('Received menu update');
  store.menuItems = menuItems;
  store.saveToLocalStorage();
});

// Event bus listeners
emitter.on('updateOrder', (order) => {
  store.updateOrder(order);
});

emitter.on('addOrder', (order) => {
  store.addOrder(order);
});

export default store; 