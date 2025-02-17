const express = require('express');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs').promises;

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../dist')));

// Handle all routes by serving the index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Global data store
let data = {
  orders: [],
  menuItems: [],
  students: []
};

// Load data from files
async function loadDataFromFiles() {
  try {
    // Load students
    const studentsData = await fs.readFile('result.json', 'utf8');
    data.students = JSON.parse(studentsData);

    // Load orders with error handling
    try {
      const ordersData = await fs.readFile('orders.json', 'utf8');
      data.orders = JSON.parse(ordersData);
    } catch (e) {
      console.log('No existing orders.json, starting fresh');
      data.orders = [];
    }

    // Load menu items with error handling
    try {
      const menuData = await fs.readFile('menu.json', 'utf8');
      data.menuItems = JSON.parse(menuData);
    } catch (e) {
      console.log('No existing menu.json, starting fresh');
      data.menuItems = [];
    }

    console.log('Initial data loaded:', {
      studentsCount: data.students.length,
      ordersCount: data.orders.length,
      menuItemsCount: data.menuItems.length
    });
  } catch (error) {
    console.error('Error loading initial data:', error);
  }
}

// Save data to files
async function saveDataToFiles() {
  try {
    await fs.writeFile('orders.json', JSON.stringify(data.orders, null, 2));
    await fs.writeFile('menu.json', JSON.stringify(data.menuItems, null, 2));
    console.log('Data saved to files');
  } catch (error) {
    console.error('Error saving data to files:', error);
  }
}

// Initialize data
loadDataFromFiles();

// API endpoint for initial data load
app.get('/api/data', (req, res) => {
  res.json(data);
});

// Socket connection handling
io.on('connection', (socket) => {
  console.log('Client connected');

  // Send current data to new client
  socket.emit('initialData', data);

  // Handle complete data update
  socket.on('updateData', (newData) => {
    console.log('Received updateData');
    data.orders = newData.orders;
    data.menuItems = newData.menuItems;
    saveDataToFiles();
    io.emit('dataUpdated', data);
  });

  // Handle single order addition
  socket.on('orderAdded', (order) => {
    console.log('Received new order:', order.id);
    if (!data.orders.find(o => o.id === order.id)) {
      data.orders.push(order);
      saveDataToFiles();
      io.emit('orderAdded', order);
    }
  });

  // Handle single order update
  socket.on('orderUpdated', (updatedOrder) => {
    console.log('Updating order:', updatedOrder.id);
    const index = data.orders.findIndex(o => o.id === updatedOrder.id);
    if (index !== -1) {
      // Preserve existing order data and only update changed fields
      data.orders[index] = {
        ...data.orders[index],
        ...updatedOrder
      };
      saveDataToFiles();
      // Broadcast the update to all clients EXCEPT the sender
      socket.broadcast.emit('orderUpdated', data.orders[index]);
    }
  });

  // Handle single order deletion
  socket.on('orderDeleted', (orderId) => {
    console.log('Deleting order:', orderId);
    const index = data.orders.findIndex(o => o.id === orderId);
    if (index !== -1) {
      data.orders.splice(index, 1);
      saveDataToFiles();
      io.emit('orderDeleted', orderId);
    }
  });

  // Handle menu updates
  socket.on('menuUpdated', (menuItems) => {
    console.log('Updating menu items');
    data.menuItems = menuItems;
    saveDataToFiles();
    io.emit('menuUpdated', menuItems);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});