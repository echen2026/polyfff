const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO and attach it to the server
const io = new Server(server);

app.use(express.json());

// Determine the path to data.json
const dataPath = path.join(__dirname, 'data.json');

// Check if data.json exists; if not, create it with default content.
if (!fs.existsSync(dataPath)) {
  console.log('data.json not found. Creating a new data file.');
  const defaultData = {
    orders: [],
    menuItems: []
  };
  fs.writeFileSync(dataPath, JSON.stringify(defaultData, null, 2));
}

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../dist')));

// API endpoint to get the persisted data
app.get('/api/data', (req, res) => {
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Failed to read data:', err);
      return res.status(500).send('Error reading data');
    }
    res.json(JSON.parse(data));
  });
});

// API endpoint to update and persist data
app.post('/api/data', (req, res) => {
  const newData = req.body;
  fs.writeFile(dataPath, JSON.stringify(newData, null, 2), (err) => {
    if (err) {
      console.error('Failed to save data:', err);
      return res.status(500).send('Error saving data');
    }
    // Notify all connected clients that data has been updated
    io.emit('dataUpdated', newData);
    res.status(200).send('Data saved successfully');
  });
});

// Fallback: Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
