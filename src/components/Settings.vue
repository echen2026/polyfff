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
    // Bind menuItems to the store. This computed property will update as the store changes.
    menuItems: {
      get() {
        // Return the API-loaded (or default) menu items from the store.
        return store.menuItems || [];
      },
      set(newMenuItems) {
        // When the UI changes, update the store as well as persist the localStorage.
        store.menuItems = newMenuItems;
        localStorage.setItem('menuItems', JSON.stringify(newMenuItems));
      }
    }
  },
  mounted() {
    // Check if localStorage has menu items. If not, the API should update the store later.
    const savedItems = localStorage.getItem('menuItems');
    if (savedItems) {
      store.menuItems = JSON.parse(savedItems);
    }
    // Optionally, trigger an API call here that updates store.menuItems.
    // Example:
    // this.fetchMenuItemsFromAPI();
  },
  methods: {
    // If needed, you can add a method to fetch the menu items from your API.
    async fetchMenuItemsFromAPI() {
      try {
        const response = await fetch('/api/menu-items');
        const apiMenuItems = await response.json();
        if (Array.isArray(apiMenuItems)) {
          this.menuItems = apiMenuItems;  // This will update the computed setter.
        }
      } catch (error) {
        console.error('Failed to load menu items from API:', error);
      }
    },
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
      const headers = ['First Name', 'Last Name', 'Payment Status', 'Pickup Status', 'Grade'];
      const menuNames = this.menuItems.map(item => item.name);
      headers.push(...menuNames, 'Total Cost');
      
      let csvContent = headers.join(',') + '\n';
      
      store.orders.forEach(order => {
        const row = [
          order.firstName,
          order.lastName,
          order.paymentMethod,
          order.checkedIn ? 'Picked Up' : 'Not Picked Up',
          order.grade
        ];
        
        // For each menu item, add the corresponding quantity.
        this.menuItems.forEach(menuItem => {
          const orderItem = order.items.find(item => item.name === menuItem.name);
          row.push(orderItem ? orderItem.quantity : '0');
        });
        
        // Calculate the total cost.
        const total = order.items.reduce((sum, item) => {
          const mi = this.menuItems.find(m => m.name === item.name);
          return sum + (mi ? mi.price * item.quantity : 0);
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
    resetOrders() {
      store.orders = [];
      store.saveData();
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
</script>
