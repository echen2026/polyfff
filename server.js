const express = require('express');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs').promises;

// Increase JSON payload size limit for image uploads (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../dist')));

// Serve the student order page
app.get('/student-order', (req, res) => {
  res.sendFile(path.join(__dirname, 'student-order.html'));
});

// Serve result.json directly for client-side fallback
app.get('/result.json', (req, res) => {
  fs.readFile('result.json', 'utf8')
    .then(data => {
      res.setHeader('Content-Type', 'application/json');
      res.send(data);
    })
    .catch(err => {
      console.error('Error serving result.json:', err);
      res.status(500).send('Error loading student data');
    });
});

// API endpoint to get data
app.get('/api/data', (req, res) => {
  // Ensure data is properly structured before sending
  const responseData = {
    orders: Array.isArray(data.orders) ? data.orders : [],
    menuItems: Array.isArray(data.menuItems) ? data.menuItems : [],
    students: Array.isArray(data.students) ? data.students : []
  };
  
  console.log('Sending API data with:', {
    studentsCount: responseData.students.length,
    ordersCount: responseData.orders.length,
    menuItemsCount: responseData.menuItems.length
  });
  
  res.json(responseData);
});

// API endpoint to check student data status
app.get('/api/students/status', (req, res) => {
  res.json({
    count: Array.isArray(data.students) ? data.students.length : 0,
    hasData: Array.isArray(data.students) && data.students.length > 0,
    firstFew: Array.isArray(data.students) && data.students.length > 0 
      ? data.students.slice(0, 3).map(s => ({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name
        }))
      : []
  });
});

// API endpoint to handle image uploads
app.post('/api/upload-image', (req, res) => {
  try {
    const { imageData } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }
    
    // The image is already base64 encoded in the request
    // We just need to acknowledge receipt
    res.json({ success: true, message: 'Image received successfully' });
  } catch (error) {
    console.error('Error handling image upload:', error);
    res.status(500).json({ error: 'Server error processing image' });
  }
});

// Handle all routes by serving the index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Global data store
let data = {
  orders: [],
  menuItems: [],
  students: [],
  orderFormLocked: false,
  orderFormTitle: 'Fun Food Friday Order Form',
  orderFormDescription: 'Place your order for Fun Food Friday. Please fill out all fields.'
};

// Load data from files
async function loadDataFromFiles() {
  try {
    // Load students
    try {
      const studentsData = await fs.readFile('result.json', 'utf8');
      const parsedStudents = JSON.parse(studentsData);
      
      if (Array.isArray(parsedStudents) && parsedStudents.length > 0) {
        data.students = parsedStudents;
        console.log(`Successfully loaded ${data.students.length} students from result.json`);
      } else {
        console.error('result.json does not contain a valid array of students');
        data.students = [];
      }
    } catch (e) {
      console.error('Error loading students from result.json:', e);
      data.students = [];
    }

    // Load orders with error handling
    try {
      const ordersData = await fs.readFile('orders.json', 'utf8');
      data.orders = JSON.parse(ordersData);
      console.log(`Successfully loaded ${data.orders.length} orders from orders.json`);
    } catch (e) {
      console.log('No existing orders.json, starting fresh');
      data.orders = [];
    }

    // Load menu items with error handling
    try {
      const menuData = await fs.readFile('menu.json', 'utf8');
      data.menuItems = JSON.parse(menuData);
      console.log(`Successfully loaded ${data.menuItems.length} menu items from menu.json`);
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

  // Handle order form lock updates
  socket.on('orderFormLockUpdated', (locked) => {
    console.log('Order form lock status updated:', locked);
    data.orderFormLocked = locked;
    // Broadcast to all other clients
    socket.broadcast.emit('orderFormLockUpdated', locked);
  });

  // Handle order form settings updates
  socket.on('orderFormSettingsUpdated', (settings) => {
    console.log('Order form settings updated:', settings);
    if (settings.title !== undefined) {
      data.orderFormTitle = settings.title;
    }
    if (settings.description !== undefined) {
      data.orderFormDescription = settings.description;
    }
    // Broadcast to all other clients
    socket.broadcast.emit('orderFormSettingsUpdated', {
      title: data.orderFormTitle,
      description: data.orderFormDescription
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});