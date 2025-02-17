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

// In-memory store (replace with a database in production)
let data = {
  orders: [],
  menuItems: [],
  students: []
};

// Load initial data
async function loadData() {
  try {
    const studentsData = await fs.readFile('result.json', 'utf8');
    data.students = JSON.parse(studentsData);
    
    // Load other data if stored in files
    const ordersData = await fs.readFile('orders.json', 'utf8');
    data.orders = JSON.parse(ordersData);
    
    const menuData = await fs.readFile('menu.json', 'utf8');
    data.menuItems = JSON.parse(menuData);
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

loadData();

// Serve initial data
app.get('/api/data', (req, res) => {
  res.json(data);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected');

  // Send current data to new clients
  socket.emit('dataUpdated', data);

  // Handle data updates from clients
  socket.on('updateData', (newData) => {
    data.orders = newData.orders;
    data.menuItems = newData.menuItems;
    // Broadcast to ALL clients including sender
    io.emit('dataUpdated', data);
    // Save to persistent storage
    saveData();
  });

  socket.on('orderAdded', (order) => {
    // Add order to server data
    data.orders.push(order);
    // Broadcast to ALL clients
    io.emit('orderAdded', order);
    saveData();
  });

  socket.on('orderUpdated', (updatedOrder) => {
    // Update order in server data
    const index = data.orders.findIndex(o => o.id === updatedOrder.id);
    if (index !== -1) {
      data.orders[index] = updatedOrder;
    }
    // Broadcast to ALL clients
    io.emit('orderUpdated', updatedOrder);
    saveData();
  });

  socket.on('orderDeleted', (orderId) => {
    // Delete order from server data
    const index = data.orders.findIndex(o => o.id === orderId);
    if (index !== -1) {
      data.orders.splice(index, 1);
    }
    // Broadcast to ALL clients
    io.emit('orderDeleted', orderId);
    saveData();
  });
});

// Save data periodically
async function saveData() {
  try {
    await fs.writeFile('orders.json', JSON.stringify(data.orders));
    await fs.writeFile('menu.json', JSON.stringify(data.menuItems));
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});