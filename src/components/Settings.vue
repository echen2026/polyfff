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
    store.loadData().then(() => {
      console.log('Students loaded:', store.students);
    });
  },
  methods: {
    triggerFileInput() {
      console.log("File input triggered");
      this.$refs.fileInput.click();
    },
    async handleFileUpload(event) {
      const file = event.target.files[0];
      console.log("Selected file:", file);
      if (!file) return;
      
      const text = await file.text();
      console.log("File content:", text);
      const rows = text.split('\n').map(row => row.split(','));
      console.log("Parsed rows:", rows);
      const headers = rows[0];

      // Ensure students are loaded before processing the CSV
      await store.loadData(); // Wait for students to load
      console.log('Students loaded after file upload:', store.students);

      if (store.students.length === 0) {
        console.log("No students available for matching. Skipping order processing.");
        return; // or handle accordingly
      }

      const orders = []; // Initialize orders array
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        console.log(`Processing row: ${row}`); // Log the current row being processed
        if (row.length < 5) {
          console.log("Row is too short, skipping:", row); // Log if the row is too short
          continue;
        }

        console.log("Number of students:", store.students.length); // Log the number of students
        console.log("Students array:", store.students); // Log the students array
        console.log("First Name:", row[3].trim(), "Last Name:", row[2].trim()); // Log the input names
        const studentId = findStudentId(row[3].trim(), row[2].trim(), store.students); // Get student ID
        const order = {
          id: Date.now() + i, // Consider using a more consistent ID generation method
          orderId: studentId, // Link orderId to the student ID
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
            const menuItem = this.menuItems[(currentIndex - 6) / 2];
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
      await store.saveData(); // Ensure data is saved after import
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
      store.updateMenuItems(this.menuItems);
    }
  }
};

function findStudentId(firstName, lastName, students) {
  console.log("findStudentId called with:", firstName, lastName); // Log the parameters
  students = students || []; // Ensure students is an array
  
  const cleanName = (name) => name.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const cleanFirstName = cleanName(firstName);
  const cleanLastName = cleanName(lastName);
  
  console.log(`Looking for match for: ${cleanFirstName} ${cleanLastName}`);

  const student = students.find(s => {
    console.log("Checking student:", s); // Log the current student being checked
    const studentFirstName = cleanName(s.first_name);
    const studentNickname = cleanName(s.nickname);
    const studentLastName = cleanName(s.last_name);
    
    console.log(`Comparing with: ${studentFirstName} ${studentLastName} (Nickname: ${studentNickname})`);

    const isMatch = (studentFirstName === cleanFirstName && studentLastName === cleanLastName) ||
                    (studentNickname === cleanFirstName && studentLastName === cleanLastName);
    
    if (isMatch) {
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
