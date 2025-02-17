const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO and attach it to the server
const io = new Server(server);

app.use(express.json());

// File path to store persistent data
const dataPath = path.join(__dirname, 'data.json');

// Global data store that will be shared by all sockets
let data = {
  orders: [],
  menuItems: [],
  students: []
};

// Load persistent data from file, or initialize with default data if the file doesn't exist.
async function loadData() {
  try {
    const fileContent = await fs.readFile(dataPath, 'utf8');
    data = JSON.parse(fileContent);
    console.log('Data loaded:', data);
  } catch (error) {
    console.log('Data file not found or invalid. Using default data.');
    data = {
      orders: [],
      menuItems: [],
      students: []
    };
    await saveData(); // Create the file with default data.
  }
}

// Save current data to file
async function saveData() {
  try {
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
    console.log('Data saved to file.');
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// Load initial data on server startup
loadData();

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../dist')));

// API endpoint to get the persisted data
app.get('/api/data', (req, res) => {
  res.json(data);
});

// API endpoint to update and persist data
app.post('/api/data', (req, res) => {
  const newData = req.body;
  data = { ...data, ...newData };
  saveData();
  io.emit('dataUpdated', data);
  res.status(200).send('Data saved successfully');
});

// Fallback: Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Socket.IO integration for live updates and persisting between clients
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Once a client connects, send the most up-to-date data.
  socket.emit('initialData', data);

  // Listen for complete data updates (if you need to update multiple pieces at once)
  socket.on('updateData', async (newData) => {
    console.log('Received updateData from', socket.id);
    data = { ...data, ...newData };
    await saveData();
    io.emit('dataUpdated', data);
  });

  // Listen for a new order
  socket.on('orderAdded', async (order) => {
    console.log('Order added from', socket.id, 'Order ID:', order.id);
    if (!data.orders.find(o => o.id === order.id)) { // Avoid duplicates
      data.orders.push(order);
      await saveData();
      io.emit('orderAdded', order);
    }
  });

  // Listen for an order update
  socket.on('orderUpdated', async (updatedOrder) => {
    console.log('Order updated from', socket.id, 'Order ID:', updatedOrder.id);
    const index = data.orders.findIndex(o => o.id === updatedOrder.id);
    if (index !== -1) {
      // Merge the new data with the existing order
      data.orders[index] = { ...data.orders[index], ...updatedOrder };
      await saveData();
      io.emit('orderUpdated', data.orders[index]);
    }
  });

  // Listen for order deletion
  socket.on('orderDeleted', async (orderId) => {
    console.log('Order deleted from', socket.id, 'Order ID:', orderId);
    const index = data.orders.findIndex(o => o.id === orderId);
    if (index !== -1) {
      data.orders.splice(index, 1);
      await saveData();
      io.emit('orderDeleted', orderId);
    }
  });

  // Listen for menu updates
  socket.on('menuUpdated', async (menuItems) => {
    console.log('Menu updated from', socket.id);
    data.menuItems = menuItems;
    await saveData();
    io.emit('menuUpdated', menuItems);
  });

  // Handle socket disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
