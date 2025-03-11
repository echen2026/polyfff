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
      console.log('Fetching data from server...');
      const response = await fetch('/api/data');
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const serverData = await response.json();
      console.log('Data loaded from server:', serverData);

      // Check if students are present in the response
      if (serverData.students && Array.isArray(serverData.students) && serverData.students.length > 0) {
        console.log('Students loaded successfully:', serverData.students.length);
        this.students = [...serverData.students]; // Create a new array to ensure reactivity
      } else {
        console.error('No students found in server data or students is not an array.');
        // Try to load students directly from result.json as a fallback
        try {
          console.log('Attempting to load students directly from result.json...');
          const studentsResponse = await fetch('/result.json');
          if (!studentsResponse.ok) {
            throw new Error(`Failed to fetch result.json: ${studentsResponse.status}`);
          }
          
          const studentsData = await studentsResponse.json();
          if (Array.isArray(studentsData) && studentsData.length > 0) {
            console.log('Students loaded from result.json:', studentsData.length);
            this.students = [...studentsData]; // Create a new array to ensure reactivity
          } else {
            console.error('Failed to load students from result.json');
          }
        } catch (studentsError) {
          console.error('Error loading students from result.json:', studentsError);
        }
      }

      // Always override the local store with the server data.
      this.orders = serverData.orders || [];
      this.menuItems = serverData.menuItems || [];
      
      // Save to localStorage for offline use
      this.saveToLocalStorage();
      
      // Log the final state after loading
      console.log('Final data state after loading:', {
        studentsCount: this.students.length,
        ordersCount: this.orders.length,
        menuItemsCount: this.menuItems.length
      });
      
      return {
        studentsCount: this.students.length,
        ordersCount: this.orders.length,
        menuItemsCount: this.menuItems.length
      };
    } catch (error) {
      console.error('Error loading data from server:', error);
      // Try to load from localStorage as fallback
      this.loadFromLocalStorage();
      return {
        studentsCount: this.students.length,
        ordersCount: this.orders.length,
        menuItemsCount: this.menuItems.length,
        error: error.message
      };
    }
  },

  loadFromLocalStorage() {
    try {
      const savedOrders = localStorage.getItem('orders');
      const savedMenuItems = localStorage.getItem('menuItems');
      const savedStudents = localStorage.getItem('students');
      
      if (savedOrders) {
        this.orders = JSON.parse(savedOrders);
        console.log(`Loaded ${this.orders.length} orders from localStorage`);
      }
      
      if (savedMenuItems) {
        this.menuItems = JSON.parse(savedMenuItems);
        console.log(`Loaded ${this.menuItems.length} menu items from localStorage`);
      }
      
      if (savedStudents) {
        const parsedStudents = JSON.parse(savedStudents);
        if (Array.isArray(parsedStudents) && parsedStudents.length > 0) {
          this.students = parsedStudents;
          console.log(`Loaded ${this.students.length} students from localStorage`);
        }
      }
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
    }
  },

  saveToLocalStorage() {
    try {
      localStorage.setItem('orders', JSON.stringify(this.orders));
      localStorage.setItem('menuItems', JSON.stringify(this.menuItems));
      
      // Only save students to localStorage if we have them
      if (Array.isArray(this.students) && this.students.length > 0) {
        localStorage.setItem('students', JSON.stringify(this.students));
        console.log(`Saved ${this.students.length} students to localStorage`);
      }
    } catch (error) {
      console.error('Error saving data to localStorage:', error);
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