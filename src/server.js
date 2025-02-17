const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Set a higher limit for JSON payloads
app.use(express.json({ limit: '10mb' })); // Adjust the limit as needed

// Initialize Socket.IO and attach it to the server
const io = new Server(server);

// Use a single file for persistent data.
const dataPath = path.join(__dirname, 'data.json');
console.log("DEBUG: Data file path is:", dataPath, "and __dirname is:", __dirname);

let data = {
  orders: [],
  menuItems: [],
  students: []
};

async function loadDataFromFiles() {
  console.log("DEBUG: Attempting to load data from", dataPath);
  try {
    const fileContent = await fs.readFile(dataPath, 'utf8');
    console.log("DEBUG: Raw file content:", fileContent);

    // If fileContent is empty, throw an error to trigger default data.
    if (!fileContent.trim()) {
      throw new Error("data.json is empty");
    }
    data = JSON.parse(fileContent);
    console.log('DEBUG: Data loaded successfully from data.json:', data);
  } catch (error) {
    console.error("DEBUG: Error reading data.json:", error);
    console.log('DEBUG: data.json not found or invalid. Using default data.');
    data = {
      orders: [],
      menuItems: [],
      students: []  // Initially empty students array
    };
    await saveDataToFiles(); // Create the data.json file with default data.
  }

  // NEW: If students array is empty, load student data from result.json.
  if (!data.students || data.students.length === 0) {
    console.log('DEBUG: Students data is empty, attempting to load from result.json');
    try {
      const studentContent = await fs.readFile(path.join(__dirname, 'result.json'), 'utf8');
      const studentData = JSON.parse(studentContent);
      
      // Check if studentData is an object and convert it to an array
      if (typeof studentData === 'object' && !Array.isArray(studentData)) {
        data.students = [studentData]; // Wrap the object in an array
      } else {
        data.students = studentData; // Assume it's already an array
      }
      
      console.log('DEBUG: Students data loaded from result.json:', data.students.length, 'students found');
    } catch (err) {
      console.error('DEBUG: Error loading students from result.json:', err);
      data.students = [];
    }
    await saveDataToFiles(); // Save the updated data with students included.
  }

  // Load students
  const studentsData = await fs.readFile('result.json', 'utf8');
  const studentData = JSON.parse(studentsData);
  
  // Check if studentData is an object and convert it to an array
  if (typeof studentData === 'object' && !Array.isArray(studentData)) {
    data.students = [studentData]; // Wrap the object in an array
  } else {
    data.students = studentData; // Assume it's already an array
  }
  
  console.log('DEBUG: Students loaded:', data.students);
}

async function saveDataToFiles() {
  try {
    console.log("DEBUG: Saving data to file:", data);
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
    console.log("DEBUG: Data saved to file:", dataPath);
  } catch (error) {
    console.error("DEBUG: Error saving data to file:", error);
  }
}

// On startup, load the data from data.json and then start the server:
loadDataFromFiles()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error loading initial data:", error);
    // Even if data loading fails, start the server so you can troubleshoot further.
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT} (but persistent data might not be loaded properly)`);
    });
  });

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../dist')));

// Updated API endpoint to get the persisted data
app.get('/api/data', (req, res) => {
  // Ensure data is valid before sending
  if (!data || !data.orders) {
    data = { orders: [], menuItems: [], students: [] };
  }
  res.json(data);
});

// API endpoint to update and persist data
app.post('/api/data', async (req, res) => {
  console.log("DEBUG: API POST /api/data called with body:", req.body);
  const newData = req.body;

  // Update the data object with new data
  data.orders = newData.orders;
  data.menuItems = newData.menuItems;
  data.students = newData.students;

  // Save the updated data to the file
  await saveDataToFiles();
  io.emit('dataUpdated', data); // Notify all clients of the data update
  res.status(200).send('Data saved successfully');
});

// Fallback: Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Socket.IO integration for live updates and persisting between clients
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send the current data to the client.
  socket.emit('initialData', data);

  // Listen for complete data updates (if you need to update multiple pieces at once)
  socket.on('updateData', async (newData) => {
    console.log('Received updateData from', socket.id);
    data = { ...data, ...newData };
    await saveDataToFiles();
    io.emit('dataUpdated', data);
  });

  // Listen for a new order
  socket.on('orderAdded', async (order) => {
    console.log('Order added from', socket.id, 'Order ID:', order.id);
    if (!data.orders.find(o => o.id === order.id)) {
      data.orders.push(order);
      await saveDataToFiles();
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
      await saveDataToFiles();
      io.emit('orderUpdated', data.orders[index]);
    }
  });

  // Listen for order deletion
  socket.on('orderDeleted', async (orderId) => {
    console.log('Order deleted from', socket.id, 'Order ID:', orderId);
    const index = data.orders.findIndex(o => o.id === orderId);
    if (index !== -1) {
      data.orders.splice(index, 1);
      await saveDataToFiles();
      io.emit('orderDeleted', orderId);
    }
  });

  // Listen for menu updates
  socket.on('menuUpdated', async (menuItems) => {
    console.log('Menu updated from', socket.id);
    data.menuItems = menuItems;
    await saveDataToFiles();
    io.emit('menuUpdated', menuItems);
  });

  // Handle socket disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
