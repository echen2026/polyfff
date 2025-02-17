<template>
  <div class="settings">
    <h2>Settings</h2>
    
    <div class="section">
      <h3>Import/Export Data</h3>
      <input type="file" accept=".csv" @change="handleFileUpload" ref="fileInput" style="display: none" />
      <button @click="triggerFileInput">Import CSV</button>
      <button @click="downloadCSV">Download CSV</button>
      <button @click="resetOrders">Reset</button>
    </div>

    <div class="section">
      <h3>Manage Menu Items</h3>
      <div v-for="(item, index) in menuItems" :key="index" class="menu-item">
        <input v-model="item.name" placeholder="Item name" />
        <input v-model.number="item.price" type="number" step="0.01" placeholder="Price" />
        <button @click="removeMenuItem(index)" class="remove-button">Remove</button>
      </div>
      <button @click="addMenuItem" class="add-button">Add Menu Item</button>
      <button @click="saveMenuItems" class="save-button">Save Menu</button>
    </div>
  </div>
</template>

<script>
import store from '../store';

export default {
  computed: {
    menuItems: {
      get() {
        return store.menuItems || [];
      },
      set(newMenuItems) {
        store.menuItems = newMenuItems;
        localStorage.setItem('menuItems', JSON.stringify(newMenuItems));
      }
    }
  },
  mounted() {
    const savedItems = localStorage.getItem('menuItems');
    if (savedItems) {
      store.menuItems = JSON.parse(savedItems);
    }
  },
  methods: {
    triggerFileInput() {
      this.$refs.fileInput.click();
    },
    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      const text = await file.text();
      const rows = text.split('\n').map(row => row.split(','));
      const headers = rows[0];

      // Process headers to extract menu items with their prices.
      const menuItems = [];
      for (let i = 0; i < headers.length; i++) {
        if (headers[i + 1] && !isNaN(headers[i + 1])) {
          menuItems.push({
            name: headers[i].trim(),
            price: parseFloat(headers[i + 1])
          });
          i++; // Skip the price column.
        }
      }
      
      // Update menu items in local state, localStorage, and the central store.
      this.menuItems = menuItems;
      localStorage.setItem('menuItems', JSON.stringify(menuItems));
      store.menuItems = menuItems;
      
      // Process orders from CSV.
      const orders = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 5) continue;
        
        const order = {
          id: Date.now() + i,
          orderId: findStudentId(row[3].trim(), row[2].trim(), store.students),
          firstName: row[3].trim(),
          lastName: row[2].trim(),
          grade: row[4].trim(),
          items: [],
          paymentMethod: 'Unpaid',
          checkedIn: false
        };
        
        // Process items starting from the 7th column.
        let currentIndex = 6;
        while (currentIndex < row.length) {
          const quantity = parseInt(row[currentIndex]);
          if (!isNaN(quantity) && quantity > 0) {
            const menuItem = menuItems[(currentIndex - 6) / 2];
            if (menuItem) {
              order.items.push({
                name: menuItem.name,
                quantity: quantity,
                price: menuItem.price
              });
            }
          }
          currentIndex += 2; // Skip the price column.
        }
        
        if (order.items.length > 0) {
          orders.push(order);
          console.log("Imported order:", order);
        }
      }
      
      // Update the central store's orders and persist the changes.
      store.orders = orders;
      store.saveData();
    },
    downloadCSV() {
      // Get menu item names for headers
      const menuNames = this.menuItems.map(item => item.name);
      
      // Create headers with total cost before menu items
      const headers = [
        'First Name',
        'Last Name',
        'Grade',
        'Email',
        'Total Cost',
        'Picked Up',
        'Poly',
        'Prepaid',
        'Venmo'
      ];
      headers.push(...menuNames);
      
      let csvContent = headers.join(',') + '\n';
      
      store.orders.forEach(order => {
        // Calculate total cost first
        const total = order.items.reduce((sum, item) => {
          const menuItem = this.menuItems.find(m => m.name === item.name);
          return sum + (menuItem ? menuItem.price * item.quantity : 0);
        }, 0);

        // Create base row data with toggles
        const row = [
          order.firstName,
          order.lastName,
          order.grade,
          order.email || '',
          total.toFixed(2),
          order.checkedIn ? 'Yes' : 'No',
          order.isPoly ? 'Yes' : 'No',
          order.prepaid ? 'Yes' : 'No',
          order.venmo ? 'Yes' : 'No'
        ];
        
        // Add quantities for each menu item
        this.menuItems.forEach(menuItem => {
          const orderItem = order.items.find(item => item.name === menuItem.name);
          row.push(orderItem ? orderItem.quantity : '0');
        });
        
        csvContent += row.join(',') + '\n';
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'orders.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    resetOrders() {
      if (confirm('Are you sure you want to reset all orders? This action cannot be undone.')) {
        store.orders = [];
        store.saveData();
      }
    },
    addMenuItem() {
      this.menuItems.push({ name: '', price: 0 });
    },
    removeMenuItem(index) {
      this.menuItems.splice(index, 1);
    },
    saveMenuItems() {
      localStorage.setItem('menuItems', JSON.stringify(this.menuItems));
      store.menuItems = this.menuItems;
    }
  }
};

function findStudentId(firstName, lastName, students) {
  // Ensure students is an array so that .find can be called safely.
  students = students || [];
  
  // Remove all punctuation and extra spaces
  const cleanName = (name) => name.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const cleanFirstName = cleanName(firstName);
  const cleanLastName = cleanName(lastName);
  
  console.log(`Looking for match for: ${cleanFirstName} ${cleanLastName}`);

  const student = students.find(s => {
    const studentFirstName = cleanName(s.first_name);
    const studentNickname = cleanName(s.nickname);
    const studentLastName = cleanName(s.last_name);
    
    // Split names in case of multiple parts
    const inputFirstParts = cleanFirstName.split(' ');
    const inputLastParts = cleanLastName.split(' ');
    const firstParts = studentFirstName.split(' ');
    const lastParts = studentLastName.split(' ');
    const nickParts = studentNickname.split(' ');

    // Join all parts of last name to handle hyphenated names
    const fullLastName = lastParts.join('');
    const fullInputLastName = inputLastParts.join('');

    // Try normal order
    const normalOrderMatch = (
      // Input first name matches first name or nickname
      (inputFirstParts.some(part => firstParts.includes(part) || nickParts.includes(part))) &&
      // Last name matches last name (either with spaces or without)
      (inputLastParts.join(' ') === lastParts.join(' ') || fullInputLastName === fullLastName)
    );

    // Try reversed order
    const reversedOrderMatch = (
      // Input first name matches last name
      (inputFirstParts.join(' ') === lastParts.join(' ') || inputFirstParts.join('') === fullLastName) &&
      // Input last name matches first name or nickname
      (inputLastParts.some(part => firstParts.includes(part) || nickParts.includes(part)))
    );

    if (normalOrderMatch || reversedOrderMatch) {
      console.log(`Found match: ${studentFirstName}/${studentNickname} ${studentLastName}`);
      return true;
    }

    return false;
  });
  
  if (!student) {
    console.log(`No match found for: ${cleanFirstName} ${cleanLastName}`);
  }
  
  return student ? student.id.toString() : 'unknown';
}
</script>
