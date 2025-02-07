
<template>
  <div class="settings">
    <h2>Settings</h2>
    
    <div class="section">
      <h3>Import/Export Data</h3>
      <input type="file" accept=".csv" @change="handleFileUpload" ref="fileInput" style="display: none">
      <button @click="$refs.fileInput.click()">Import CSV</button>
      <button @click="downloadCSV">Download CSV</button>
      <button @click="reset">Reset</button>
    </div>

    <div class="section">
      <h3>Manage Menu Items</h3>
      <div v-for="(item, index) in menuItems" :key="index" class="menu-item">
        <input v-model="item.name" placeholder="Item name"/>
        <input v-model.number="item.price" type="number" step="0.01" placeholder="Price"/>
        <button @click="removeMenuItem(index)" class="remove-button">Remove</button>
      </div>
      <button @click="addMenuItem" class="add-button">Add Menu Item</button>
      <button @click="saveMenuItems" class="save-button">Save Menu</button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      menuItems: []
    }
  },
  mounted() {
    // Load saved menu items
    const savedItems = localStorage.getItem('menuItems');
    this.menuItems = savedItems ? JSON.parse(savedItems) : [
      { name: 'Cheeseburger', price: 6 },
      { name: 'Fries', price: 3 }
    ];
  },
  methods: {
    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      const text = await file.text();
      const rows = text.split('\n').map(row => row.split(','));
      const headers = rows[0];
      
      // Process headers to find menu items and their prices
      const menuItems = [];
      for (let i = 0; i < headers.length; i++) {
        if (headers[i+1] && !isNaN(headers[i+1])) {
          menuItems.push({
            name: headers[i].trim(),
            price: parseFloat(headers[i+1])
          });
          i++; // Skip the price column
        }
      }
      
      // Update menu items
      this.menuItems = menuItems;
      localStorage.setItem('menuItems', JSON.stringify(menuItems));
      
      // Process orders
      const orders = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 5) continue;
        
        const order = {
          id: Date.now() + i,
          firstName: row[3].trim(),
          lastName: row[2].trim(),
          grade: row[4].trim(),
          items: [],
          paymentMethod: 'Unpaid',
          checkedIn: false
        };
        
        // Process items
        let currentIndex = 6; // Start after the basic info columns
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
          currentIndex += 2; // Skip price column
        }
        
        if (order.items.length > 0) {
          orders.push(order);
        }
      }
      
      // Update parent's orders
      this.$parent.$data.orders = orders;
    },
    downloadCSV() {
      const headers = ['First Name', 'Last Name', 'Payment Status', 'Pickup Status', 'Grade'];
      const menuItems = this.menuItems.map(item => item.name);
      headers.push(...menuItems, 'Total Cost');
      
      let csvContent = headers.join(',') + '\n';
      
      this.$parent.$data.orders.forEach(order => {
        const row = [
          order.firstName,
          order.lastName,
          order.paymentMethod,
          order.checkedIn ? 'Picked Up' : 'Not Picked Up',
          order.grade
        ];
        
        // Add quantities for menu items
        this.menuItems.forEach(menuItem => {
          const orderItem = order.items.find(item => item.name === menuItem.name);
          row.push(orderItem ? orderItem.quantity : '0');
        });
        
        // Calculate total cost
        const total = order.items.reduce((sum, item) => {
          const menuItem = this.menuItems.find(m => m.name === item.name);
          return sum + (menuItem?.price || 0) * item.quantity;
        }, 0);
        
        row.push(total.toFixed(2));
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
    reset() {
      this.$parent.$data.orders = [];
    },
    addMenuItem() {
      this.menuItems.push({ name: '', price: 0 });
    },
    removeMenuItem(index) {
      this.menuItems.splice(index, 1);
    },
    saveMenuItems() {
      localStorage.setItem('menuItems', JSON.stringify(this.menuItems));
    }
  }
};
</script>
