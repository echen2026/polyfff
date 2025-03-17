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
        <div class="menu-item-header">
          <div class="menu-item-inputs">
            <input v-model="item.name" placeholder="Item name" class="menu-item-name" />
            <input v-model.number="item.price" type="number" step="0.01" placeholder="Price" class="menu-item-price" />
          </div>
          <div class="menu-item-actions">
            <button @click="toggleItemExpanded(index)" class="toggle-button">
              {{ isItemExpanded(index) ? 'Hide Details' : 'Show Details' }}
            </button>
            <button @click="removeMenuItem(index)" class="remove-button">Remove</button>
          </div>
        </div>
        
        <div v-if="isItemExpanded(index)" class="menu-item-details">
          <label for="item-description">Item Description:</label>
          <textarea 
            :id="'item-description-' + index"
            v-model="item.description" 
            placeholder="Enter item description (optional)"
            class="form-control item-description"
            rows="2"
          ></textarea>
          <p class="help-text">This description will be shown to students when they view the item details.</p>
          
          <div class="image-upload-section">
            <label for="item-image">Item Image:</label>
            <div class="image-preview-container">
              <img 
                v-if="item.imageUrl" 
                :src="item.imageUrl" 
                class="image-preview" 
                alt="Menu item preview"
              />
              <div v-else-if="item.imageLoading" class="image-loading">
                Uploading image...
              </div>
              <div v-else class="no-image">No image uploaded</div>
            </div>
            <div class="image-url-input">
              <label for="item-image-url">Image URL:</label>
              <input 
                type="text" 
                :id="'item-image-url-' + index" 
                v-model="item.imageUrlInput" 
                placeholder="Enter direct image URL" 
                class="form-control"
              />
              <div class="url-buttons">
                <button 
                  @click="testImageUrl(index)" 
                  class="test-url-button"
                  :disabled="testingImageUrl === index"
                >
                  {{ testingImageUrl === index ? 'Testing...' : 'Test URL' }}
                </button>
                <button @click="applyImageUrl(index)" class="apply-url-button">
                  Apply URL
                </button>
                <button @click="useSampleImageUrl(index)" class="sample-url-button">
                  Use Sample URL
                </button>
              </div>
            </div>
            <p class="help-text">Enter a direct URL to an image, or upload one below.</p>
            <div class="image-upload-controls">
              <input 
                type="file" 
                :id="'item-image-' + index" 
                @change="(e) => handleImageUpload(e, index)" 
                accept="image/*"
                class="image-input"
              />
              <button @click="triggerImageUpload(index)" class="upload-button">
                {{ item.imageUrl ? 'Change Image' : 'Upload Image' }}
              </button>
              <button 
                v-if="item.imageUrl" 
                @click="removeImage(index)" 
                class="remove-image-button"
              >
                Remove Image
              </button>
            </div>
            <p class="help-text">Upload an image to display with this menu item. Recommended size: 300x200px.</p>
          </div>
        </div>
      </div>
      <button @click="addMenuItem" class="add-button">Add Menu Item</button>
      <button @click="saveMenuItems" class="save-button">Save Menu</button>
    </div>
    
    <div class="section">
      <h3>Student Order Form</h3>
      
      <div class="form-customization">
        <h4>Form Customization</h4>
        <div class="form-group">
          <label for="form-title">Form Title:</label>
          <input 
            id="form-title" 
            v-model="formSettings.title" 
            placeholder="Enter form title" 
            class="form-control"
          />
        </div>
        
        <div class="form-group">
          <label for="form-description">Form Description:</label>
          <textarea 
            id="form-description" 
            v-model="formSettings.description" 
            placeholder="Enter form description" 
            class="form-control"
            rows="3"
          ></textarea>
        </div>
        
        <button @click="saveFormSettings" class="save-button">Save Form Settings</button>
      </div>
      
      <div class="order-form-controls">
        <div class="status-display">
          <span class="status-label">Status:</span>
          <span class="status-value" :class="{ 'status-open': !orderFormLocked, 'status-closed': orderFormLocked }">
            {{ orderFormLocked ? 'Closed' : 'Open' }}
          </span>
        </div>
        <button 
          @click="toggleOrderForm" 
          :class="{ 'lock-button': !orderFormLocked, 'unlock-button': orderFormLocked }"
        >
          {{ orderFormLocked ? 'Open Orders' : 'Close Orders' }}
        </button>
      </div>
      <p class="help-text">
        {{ orderFormLocked ? 
          'The student order form is currently closed. Students cannot place new orders.' : 
          'The student order form is currently open. Students can place new orders.' 
        }}
      </p>
    </div>
    
    <!-- Diagnostic Section -->
    <div class="section diagnostic">
      <h3>System Diagnostics</h3>
      <div class="diagnostic-info">
        <p>Students loaded: {{ studentCount }}</p>
        <p>Menu items: {{ menuItems.length }}</p>
        <button @click="checkStudentData" class="diagnostic-button">Check Student Data</button>
        <button @click="reloadData" class="diagnostic-button">Reload Data</button>
        <button @click="forceLoadStudents" class="diagnostic-button">Force Load Students</button>
        <button @click="addDefaultMenuItems" class="diagnostic-button">Add Default Menu Items</button>
      </div>
      
      <div class="diagnostic-tools">
        <h4>CSV Analysis</h4>
        <input type="file" accept=".csv" @change="analyzeCSV" ref="analyzeFileInput" style="display: none" />
        <button @click="$refs.analyzeFileInput.click()" class="diagnostic-button">Analyze CSV File</button>
        <p class="help-text">Use this to analyze your CSV file structure without importing it</p>
      </div>
      
      <div v-if="diagnosticResult" class="diagnostic-result">
        <pre>{{ diagnosticResult }}</pre>
      </div>
    </div>
  </div>
</template>

<script>
import store from '../store';

export default {
  data() {
    return {
      diagnosticResult: null,
      formSettings: {
        title: '',
        description: ''
      },
      expandedItems: [],
      testingImageUrl: null
    };
  },
  computed: {
    menuItems: {
      get() {
        return store.menuItems || [];
      },
      set(newMenuItems) {
        store.menuItems = newMenuItems;
        localStorage.setItem('menuItems', JSON.stringify(newMenuItems));
      }
    },
    studentCount() {
      return Array.isArray(store.students) ? store.students.length : 0;
    },
    orderFormLocked: {
      get() {
        return store.orderFormLocked;
      },
      set(value) {
        store.toggleOrderFormLock(value);
      }
    }
  },
  mounted() {
    const savedItems = localStorage.getItem('menuItems');
    if (savedItems) {
      store.menuItems = JSON.parse(savedItems);
    }
    
    // Load form settings
    this.formSettings.title = store.orderFormTitle;
    this.formSettings.description = store.orderFormDescription;
    
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
      
      try {
        const text = await file.text();
        console.log("File content length:", text.length);
        
        // Parse CSV as simple comma-separated values
        const rows = text.split('\n')
          .map(line => line.split(','))
          .filter(row => row.length > 1);
        
        console.log("Parsed rows:", rows.length);
        
        if (rows.length <= 1) {
          alert("The CSV file appears to be empty or invalid. Please check the file and try again.");
          return;
        }
        
        const headers = rows[0];
        console.log("CSV Headers:", headers);

        // Debug the CSV structure
        console.log("First data row:", rows[1]);
        console.log("Second data row (if exists):", rows.length > 2 ? rows[2] : "N/A");

        // Extract menu items from headers
        // Assuming format: item1, price1, item2, price2, etc.
        const extractedMenuItems = [];
        for (let i = 6; i < headers.length - 1; i += 2) {
          const itemName = headers[i].trim();
          const priceStr = headers[i + 1].trim();
          
          // Try to parse the price
          let price = 0;
          if (priceStr) {
            // Remove any non-numeric characters except decimal point
            const cleanPriceStr = priceStr.replace(/[^\d.]/g, '');
            price = parseFloat(cleanPriceStr);
            if (isNaN(price)) price = 0;
          }
          
          if (itemName) {
            extractedMenuItems.push({
              name: itemName,
              price: price
            });
            console.log(`Extracted menu item from headers: ${itemName}, Price: ${price}`);
          }
        }
        
        // If we found menu items in the headers, use them
        if (extractedMenuItems.length > 0) {
          console.log(`Found ${extractedMenuItems.length} menu items in CSV headers`);
          this.menuItems = extractedMenuItems;
          this.saveMenuItems();
        } else {
          console.log("No menu items found in CSV headers");
          // Check if we have menu items
          if (!this.menuItems || this.menuItems.length === 0) {
            const addDefaults = confirm("No menu items found in CSV headers and you don't have any menu items defined. Would you like to add some default items?");
            if (addDefaults) {
              this.addDefaultMenuItems();
            }
          }
        }

        // Ensure students are loaded before processing the CSV
        if (!Array.isArray(store.students) || store.students.length === 0) {
          console.log("Students not loaded yet, loading now...");
          await store.loadData(); // Wait for students to load
        }
        
        console.log('Students available for matching:', store.students.length);

        if (!Array.isArray(store.students) || store.students.length === 0) {
          console.error("No students available for matching. Skipping order processing.");
          alert("No student data available. Please try refreshing the page or contact support.");
          return;
        }

        // Use fixed column indices for student data
        const firstName = 3;  // Column index for first name
        const lastName = 2;   // Column index for last name
        const grade = 4;      // Column index for grade
        
        console.log(`Using fixed column indices: First Name=${firstName}, Last Name=${lastName}, Grade=${grade}`);

        const orders = []; // Initialize orders array
        
        // Process each row
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          console.log(`Processing row ${i} (length ${row.length}):`, row);
          
          // Skip rows that are too short
          if (row.length < Math.max(firstName, lastName, grade) + 1) {
            console.log("Row is too short, skipping:", row);
            continue;
          }

          // Get the name and grade from the fixed columns
          const firstNameValue = row[firstName].trim();
          const lastNameValue = row[lastName].trim();
          const gradeValue = row[grade].trim();
          
          console.log(`Extracted name: ${firstNameValue} ${lastNameValue}, Grade: ${gradeValue}`);
          
          if (!firstNameValue || !lastNameValue) {
            console.log("Missing name information, skipping row:", row);
            continue;
          }

          // Look up the student ID
          console.log(`Looking up student: ${firstNameValue} ${lastNameValue}`);
          const studentId = findStudentId(firstNameValue, lastNameValue, store.students);
          console.log(`Student ID result: ${studentId}`);
          
          const order = {
            id: Date.now() + i,
            orderId: studentId,
            firstName: firstNameValue,
            lastName: lastNameValue,
            grade: gradeValue,
            items: [],
            paymentMethod: 'Unpaid',
            checkedIn: false
          };

          // Process items - look for quantities in the data rows
          let hasItems = false;
          
          // For each menu item, look for the quantity in the corresponding column
          for (let j = 0; j < this.menuItems.length; j++) {
            // Calculate the column index for this item's quantity
            // Assuming quantities start at column 6 and each item takes 2 columns (item, price)
            const columnIndex = 6 + (j * 2);
            
            if (columnIndex < row.length) {
              const quantityStr = row[columnIndex].trim();
              const quantity = parseInt(quantityStr);
              
              console.log(`Checking for ${this.menuItems[j].name} quantity at column ${columnIndex}: "${quantityStr}" -> ${quantity}`);
              
              if (!isNaN(quantity) && quantity > 0) {
                order.items.push({
                  name: this.menuItems[j].name,
                  quantity: quantity,
                  price: this.menuItems[j].price
                });
                hasItems = true;
                console.log(`Added item: ${this.menuItems[j].name}, Quantity: ${quantity}, Price: ${this.menuItems[j].price}`);
              }
            }
          }
          
          if (hasItems) {
            orders.push(order);
            console.log("Imported order:", order);
          } else {
            console.log("No items found for this order, skipping");
          }
        }
        
        if (orders.length === 0) {
          console.error("No valid orders found in the CSV file");
          alert("No valid orders found in the CSV file. Please check the file format and try again.");
          return;
        }
        
        console.log(`Successfully imported ${orders.length} orders`);
        
        // Update the central store's orders and persist the changes.
        store.orders = orders;
        await store.saveData(); // Ensure data is saved after import
        alert(`Successfully imported ${orders.length} orders`);
      } catch (error) {
        console.error("Error processing CSV file:", error);
        alert("Error processing CSV file: " + error.message);
      }
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
        'Absent',
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

        // Find student email from result.json based on ID
        let email = order.email || '';
        if (order.orderId) {
          // Try to find the student by ID in the students array
          const student = store.students.find(s => s.id.toString() === order.orderId.toString());
          if (student && student.email) {
            email = student.email;
          }
        }

        // Create base row data with toggles
        const row = [
          order.firstName,
          order.lastName,
          order.grade,
          email,
          total.toFixed(2),
          order.checkedIn ? 'Yes' : 'No',
          order.isAbsent ? 'Y' : '',
          order.isPoly ? 'Y' : '',
          order.prepaid ? 'Y' : '',
          order.venmo ? 'Y' : ''
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
      this.menuItems.push({ 
        name: '', 
        price: 0, 
        description: '',
        imageUrl: null,
        imageUrlInput: '' 
      });
      // Automatically expand the newly added item
      this.expandedItems.push(this.menuItems.length - 1);
    },
    removeMenuItem(index) {
      this.menuItems.splice(index, 1);
    },
    saveMenuItems() {
      localStorage.setItem('menuItems', JSON.stringify(this.menuItems));
      store.updateMenuItems(this.menuItems);
    },
    async checkStudentData() {
      try {
        // Check student data from the API
        const response = await fetch('/api/students/status');
        const status = await response.json();
        
        // Check local store data
        const localStudents = Array.isArray(store.students) ? store.students.length : 0;
        
        this.diagnosticResult = JSON.stringify({
          api: status,
          local: {
            count: localStudents,
            hasData: localStudents > 0,
            sampleStudents: Array.isArray(store.students) && store.students.length > 0 
              ? store.students.slice(0, 3).map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}` }))
              : []
          }
        }, null, 2);
      } catch (error) {
        this.diagnosticResult = `Error checking student data: ${error.message}`;
      }
    },
    async reloadData() {
      try {
        await store.loadData();
        this.diagnosticResult = `Data reloaded. Students: ${store.students.length}, Orders: ${store.orders.length}, Menu Items: ${store.menuItems.length}`;
      } catch (error) {
        this.diagnosticResult = `Error reloading data: ${error.message}`;
      }
    },
    async forceLoadStudents() {
      try {
        this.diagnosticResult = "Loading students directly from result.json...";
        const response = await fetch('/result.json');
        if (!response.ok) {
          throw new Error(`Failed to fetch result.json: ${response.status}`);
        }
        
        const studentsData = await response.json();
        if (Array.isArray(studentsData) && studentsData.length > 0) {
          store.students = [...studentsData];
          localStorage.setItem('students', JSON.stringify(store.students));
          this.diagnosticResult = `Successfully loaded ${store.students.length} students directly from result.json.`;
        } else {
          this.diagnosticResult = "Error: result.json did not contain a valid array of students.";
        }
      } catch (error) {
        this.diagnosticResult = `Error loading students: ${error.message}`;
      }
    },
    
    // Add default menu items
    addDefaultMenuItems() {
      const defaultItems = [
        { 
          name: 'Sandwich', 
          price: 5.00,
          description: 'Fresh sandwich with your choice of fillings.',
          imageUrl: null,
          imageUrlInput: ''
        },
        { 
          name: 'Drink', 
          price: 2.00,
          description: 'Refreshing beverage options including water, juice, and soda.',
          imageUrl: null,
          imageUrlInput: ''
        },
        { 
          name: 'Chips', 
          price: 1.50,
          description: 'Crispy potato chips in various flavors.',
          imageUrl: null,
          imageUrlInput: ''
        },
        { 
          name: 'Cookie', 
          price: 1.00,
          description: 'Freshly baked chocolate chip cookie.',
          imageUrl: null,
          imageUrlInput: ''
        }
      ];
      
      // Add the default items to the menu
      this.menuItems = [...defaultItems];
      
      // Save the menu items
      this.saveMenuItems();
      
      alert(`Added ${defaultItems.length} default menu items.`);
    },
    
    // Add a function to analyze a CSV file
    analyzeCSV(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      this.diagnosticResult = "Analyzing CSV file...";
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        
        // Parse the CSV
        const rows = text.split('\n')
          .map(line => line.split(','))
          .filter(row => row.length > 1);
        
        if (rows.length <= 1) {
          this.diagnosticResult = "CSV file is empty or has only headers.";
          return;
        }
        
        const headers = rows[0];
        
        // Try to identify the column indices for first name, last name, and grade
        const columnIndices = this.identifyColumns(headers);
        
        // Extract menu items from headers
        const extractedMenuItems = [];
        for (let i = 6; i < headers.length - 1; i += 2) {
          const itemName = headers[i].trim();
          const priceStr = headers[i + 1].trim();
          
          // Try to parse the price
          let price = 0;
          if (priceStr) {
            // Remove any non-numeric characters except decimal point
            const cleanPriceStr = priceStr.replace(/[^\d.]/g, '');
            price = parseFloat(cleanPriceStr);
            if (isNaN(price)) price = 0;
          }
          
          if (itemName) {
            extractedMenuItems.push({
              name: itemName,
              price: price,
              column: i
            });
          }
        }
        
        // Analyze the data rows
        const dataRows = rows.slice(1);
        const rowLengths = dataRows.map(row => row.length);
        const minRowLength = Math.min(...rowLengths);
        const maxRowLength = Math.max(...rowLengths);
        
        // Check for quantities in the expected columns
        const quantityCounts = [];
        extractedMenuItems.forEach(item => {
          let count = 0;
          for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            if (item.column < row.length) {
              const value = row[item.column].trim();
              const quantity = parseInt(value);
              if (!isNaN(quantity) && quantity > 0) {
                count++;
              }
            }
          }
          quantityCounts.push({
            item: item.name,
            column: item.column,
            count: count,
            percentage: Math.round((count / dataRows.length) * 100)
          });
        });
        
        const analysis = {
          fileInfo: {
            name: file.name,
            size: file.size,
            type: file.type
          },
          structure: {
            totalRows: rows.length,
            dataRows: rows.length - 1,
            headers: headers,
            minRowLength,
            maxRowLength
          },
          studentColumns: columnIndices,
          extractedMenuItems,
          quantityCounts,
          sampleRows: dataRows.slice(0, 3)
        };
        
        this.diagnosticResult = JSON.stringify(analysis, null, 2);
      };
      
      reader.readAsText(file);
    },
    // Helper method to identify column indices
    identifyColumns(headers) {
      const result = {
        firstName: undefined,
        lastName: undefined,
        grade: undefined
      };
      
      // Look for column headers that might contain first name, last name, and grade
      headers.forEach((header, index) => {
        const headerLower = header.toLowerCase();
        
        if (headerLower.includes('first') || headerLower === 'first') {
          result.firstName = index;
        } else if (headerLower.includes('last') || headerLower === 'last') {
          result.lastName = index;
        } else if (headerLower.includes('grade') || headerLower === 'grade') {
          result.grade = index;
        }
      });
      
      // If we couldn't find the columns by name, use default indices
      if (result.firstName === undefined) result.firstName = 3; // Default first name column
      if (result.lastName === undefined) result.lastName = 2;   // Default last name column
      if (result.grade === undefined) result.grade = 4;         // Default grade column
      
      return result;
    },
    toggleOrderForm() {
      console.log('Toggle order form clicked. Current state:', this.orderFormLocked);
      store.toggleOrderFormLock(!this.orderFormLocked);
      console.log('New state should be:', !this.orderFormLocked);
    },
    saveFormSettings() {
      // Save form settings to the store
      store.updateOrderFormSettings({
        title: this.formSettings.title,
        description: this.formSettings.description
      });
      
      // Show a confirmation message
      alert('Form settings saved successfully!');
    },
    toggleItemExpanded(index) {
      const itemIndex = this.expandedItems.indexOf(index);
      if (itemIndex === -1) {
        // Item is not expanded, so expand it
        this.expandedItems.push(index);
      } else {
        // Item is expanded, so collapse it
        this.expandedItems.splice(itemIndex, 1);
      }
    },
    isItemExpanded(index) {
      return this.expandedItems.includes(index);
    },
    async handleImageUpload(event, index) {
      const file = event.target.files[0];
      if (!file) return;
      
      // Show loading state
      this.menuItems[index].imageLoading = true;
      
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const imageData = e.target.result;
          
          // Upload the image to the server
          try {
            await store.uploadImage(imageData);
            // On success, update the menu item
            this.menuItems[index].imageUrl = imageData;
            this.saveMenuItems(); // Save the updated menu items
          } catch (error) {
            alert('Failed to upload image. Please try again.');
            console.error('Image upload failed:', error);
          } finally {
            // Clear loading state
            this.menuItems[index].imageLoading = false;
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        alert('Error processing image. Please try a different image.');
        console.error('Error processing image:', error);
        this.menuItems[index].imageLoading = false;
      }
    },
    triggerImageUpload(index) {
      const fileInput = document.getElementById(`item-image-${index}`);
      if (fileInput) {
        fileInput.click();
      }
    },
    removeImage(index) {
      this.menuItems[index].imageUrl = null;
      this.saveMenuItems(); // Save the updated menu items
    },
    applyImageUrl(index) {
      const url = this.menuItems[index].imageUrlInput.trim();
      if (url) {
        // Check if the URL is valid
        if (this.isValidImageUrl(url)) {
          this.menuItems[index].imageUrl = url;
          this.saveMenuItems();
          alert('Image URL applied successfully!');
        } else {
          alert('Please enter a valid image URL. URLs should start with http:// or https:// and end with an image extension like .jpg, .png, .gif, etc.');
        }
      } else {
        alert('Please enter an image URL.');
      }
    },
    isValidImageUrl(url) {
      // Basic URL validation
      if (!url.match(/^https?:\/\//)) {
        return false;
      }
      
      // Check if it's likely an image URL (ends with common image extensions)
      // This is a simple check and might not catch all valid image URLs
      return url.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i) !== null || 
             // Also allow data URLs for base64 encoded images
             url.startsWith('data:image/');
    },
    testImageUrl(index) {
      const url = this.menuItems[index].imageUrlInput.trim();
      if (!url) {
        alert('Please enter an image URL.');
        return;
      }
      
      // Check if the URL is valid
      if (!this.isValidImageUrl(url)) {
        alert('Image URL is not valid. Please enter a valid image URL.');
        return;
      }
      
      // Set loading state
      this.testingImageUrl = index;
      
      // Try to load the image
      const img = new Image();
      img.onload = () => {
        alert('Image loaded successfully! The URL is valid.');
        this.testingImageUrl = null;
      };
      img.onerror = () => {
        alert('Failed to load the image. The URL might be invalid or the image might not be accessible.');
        this.testingImageUrl = null;
      };
      img.src = url;
    },
    useSampleImageUrl(index) {
      // Sample image URLs for different food items
      const sampleUrls = {
        'Sandwich': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
        'Drink': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
        'Chips': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
        'Cookie': 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
        'Pizza': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
        'Salad': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
        'Fruit': 'https://images.unsplash.com/photo-1519996529931-28324d5a630e?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
        'Dessert': 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
      };
      
      // Get the item name
      const itemName = this.menuItems[index].name.trim();
      
      // Find a matching sample URL or use a default
      let sampleUrl = '';
      if (itemName && sampleUrls[itemName]) {
        sampleUrl = sampleUrls[itemName];
      } else {
        // Use a generic food image if no match
        sampleUrl = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80';
      }
      
      // Set the URL input
      this.menuItems[index].imageUrlInput = sampleUrl;
    }
  }
};

function findStudentId(firstName, lastName, students) {
  console.log("findStudentId called with:", firstName, lastName);
  
  // Check if students is a valid array
  if (!students || !Array.isArray(students) || students.length === 0) {
    console.error("Students array is invalid or empty:", students);
    return 'unknown';
  }
  
  console.log("Number of students to search through:", students.length);
  
  const cleanName = (name) => {
    if (!name) return '';
    return name.toLowerCase().replace(/[^\w\s]/g, '').trim();
  };
  
  const cleanFirstName = cleanName(firstName);
  const cleanLastName = cleanName(lastName);
  
  console.log(`Looking for match for: "${cleanFirstName}" "${cleanLastName}"`);

  // Log a few sample students for debugging
  console.log("Sample students for matching:");
  students.slice(0, 3).forEach((s, i) => {
    console.log(`Student ${i}: ${s.first_name} ${s.last_name} (ID: ${s.id})`);
  });

  // First try exact match (normal order)
  let student = students.find(s => {
    if (!s || typeof s !== 'object') {
      console.warn("Invalid student object:", s);
      return false;
    }
    
    const studentFirstName = cleanName(s.first_name);
    const studentNickname = s.nickname ? cleanName(s.nickname) : '';
    const studentLastName = cleanName(s.last_name);
    
    const exactMatch = (studentFirstName === cleanFirstName && studentLastName === cleanLastName) ||
                       (studentNickname === cleanFirstName && studentLastName === cleanLastName);
    
    if (exactMatch) {
      console.log(`Exact match found: ${s.first_name} ${s.last_name} (ID: ${s.id})`);
    }
    
    return exactMatch;
  });
  
  // Try exact match with swapped names
  if (!student) {
    console.log("No exact match found, trying with swapped names...");
    student = students.find(s => {
      if (!s || typeof s !== 'object') return false;
      
      const studentFirstName = cleanName(s.first_name);
      const studentNickname = s.nickname ? cleanName(s.nickname) : '';
      const studentLastName = cleanName(s.last_name);
      
      // Check if first name matches last name or last name matches first name
      const swappedMatch = (studentFirstName === cleanLastName && studentLastName === cleanFirstName) ||
                          (studentNickname === cleanLastName && studentLastName === cleanFirstName) ||
                          (studentFirstName === cleanLastName && cleanFirstName === studentLastName) ||
                          (studentNickname === cleanLastName && cleanFirstName === studentLastName);
      
      if (swappedMatch) {
        console.log(`Swapped name match found: ${s.first_name} ${s.last_name} (ID: ${s.id})`);
      }
      
      return swappedMatch;
    });
  }
  
  // Try all possible combinations of first name, last name, and nickname
  if (!student) {
    console.log("No swapped match found, trying all name combinations...");
    student = students.find(s => {
      if (!s || typeof s !== 'object') return false;
      
      const studentFirstName = cleanName(s.first_name);
      const studentNickname = s.nickname ? cleanName(s.nickname) : '';
      const studentLastName = cleanName(s.last_name);
      
      // Create arrays of all possible names
      const csvNames = [cleanFirstName, cleanLastName].filter(n => n);
      const studentNames = [studentFirstName, studentNickname, studentLastName].filter(n => n);
      
      // Check if any two names match (regardless of order)
      let matchFound = false;
      for (const csvName of csvNames) {
        if (studentNames.includes(csvName)) {
          matchFound = true;
          break;
        }
      }
      
      if (matchFound) {
        console.log(`Name combination match found: ${s.first_name} ${s.last_name} (ID: ${s.id})`);
      }
      
      return matchFound;
    });
  }
  
  // If no exact match, try fuzzy match (first letter of first name + last name)
  if (!student && cleanFirstName && cleanLastName) {
    console.log("No combination match found, trying fuzzy match...");
    const firstInitial = cleanFirstName.charAt(0);
    student = students.find(s => {
      if (!s || typeof s !== 'object') return false;
      
      const studentFirstName = cleanName(s.first_name);
      const studentNickname = s.nickname ? cleanName(s.nickname) : '';
      const studentLastName = cleanName(s.last_name);
      
      const fuzzyMatch = (studentFirstName.charAt(0) === firstInitial && studentLastName === cleanLastName) ||
                         (studentNickname.charAt(0) === firstInitial && studentLastName === cleanLastName) ||
                         // Also try with swapped names
                         (studentLastName.charAt(0) === firstInitial && studentFirstName === cleanLastName) ||
                         (studentLastName.charAt(0) === firstInitial && studentNickname === cleanLastName);
      
      if (fuzzyMatch) {
        console.log(`Fuzzy match found: ${s.first_name} ${s.last_name} (ID: ${s.id})`);
      }
      
      return fuzzyMatch;
    });
  }
  
  // If still no match, try just matching last name
  if (!student && cleanLastName) {
    console.log("No fuzzy match found, trying last name only match...");
    student = students.find(s => {
      if (!s || typeof s !== 'object') return false;
      
      const studentLastName = cleanName(s.last_name);
      const studentFirstName = cleanName(s.first_name);
      const studentNickname = s.nickname ? cleanName(s.nickname) : '';
      
      // Check if last name matches any of the student's names
      const lastNameMatch = studentLastName === cleanLastName || 
                           studentFirstName === cleanLastName || 
                           studentNickname === cleanLastName;
      
      if (lastNameMatch) {
        console.log(`Last name match found: ${s.first_name} ${s.last_name} (ID: ${s.id})`);
      }
      
      return lastNameMatch;
    });
  }
  
  // If still no match, try just matching first name
  if (!student && cleanFirstName) {
    console.log("No last name match found, trying first name only match...");
    student = students.find(s => {
      if (!s || typeof s !== 'object') return false;
      
      const studentFirstName = cleanName(s.first_name);
      const studentNickname = s.nickname ? cleanName(s.nickname) : '';
      const studentLastName = cleanName(s.last_name);
      
      // Check if first name matches any of the student's names
      const firstNameMatch = studentFirstName === cleanFirstName || 
                            studentNickname === cleanFirstName || 
                            studentLastName === cleanFirstName;
      
      if (firstNameMatch) {
        console.log(`First name match found: ${s.first_name} ${s.last_name} (ID: ${s.id})`);
      }
      
      return firstNameMatch;
    });
  }
  
  if (student) {
    console.log(`Final match: ${student.first_name} ${student.last_name} (ID: ${student.id})`);
    return student.id.toString();
  } else {
    console.log(`No match found for: ${cleanFirstName} ${cleanLastName}`);
    return 'unknown';
  }
}

// Helper function to find potential name columns
function findNameColumns(rows) {
  if (rows.length <= 1) return [];
  
  const headers = rows[0];
  const nameColumns = [];
  
  headers.forEach((header, i) => {
    const headerLower = header.toLowerCase();
    if (headerLower.includes('first') || 
        headerLower.includes('last') || 
        headerLower.includes('name')) {
      nameColumns.push({
        index: i,
        header: header,
        samples: rows.slice(1, 4).map(row => i < row.length ? row[i] : null)
      });
    }
  });
  
  return nameColumns;
}

// Helper function to find potential item columns
function findItemColumns(rows) {
  if (rows.length <= 1) return [];
  
  const headers = rows[0];
  const itemColumns = [];
  
  headers.forEach((header, i) => {
    // Check if most values in this column are numbers
    let numberCount = 0;
    rows.slice(1, Math.min(rows.length, 10)).forEach(row => {
      if (i < row.length && !isNaN(parseInt(row[i]))) {
        numberCount++;
      }
    });
    
    if (numberCount > (Math.min(rows.length - 1, 9) / 2)) {
      itemColumns.push({
        index: i,
        header: header,
        samples: rows.slice(1, 4).map(row => i < row.length ? row[i] : null)
      });
    }
  });
  
  return itemColumns;
}
</script>

<style scoped>
.diagnostic {
  margin-top: 20px;
  border-top: 1px solid #ccc;
  padding-top: 20px;
}

.diagnostic-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 15px;
}

.diagnostic-button {
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.diagnostic-button:hover {
  background-color: #e0e0e0;
}

.diagnostic-result {
  margin-top: 10px;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
  overflow: auto;
  max-height: 400px;
  border: 1px solid #ddd;
}

.diagnostic-result pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 12px;
}

.diagnostic-tools {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.diagnostic-tools h4 {
  margin-top: 0;
  margin-bottom: 10px;
}

.help-text {
  margin-top: 5px;
  font-size: 0.8em;
  color: #666;
}

.order-form-controls {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
  padding: 12px;
  background-color: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.status-display {
  display: flex;
  align-items: center;
  gap: 5px;
}

.status-label {
  font-weight: bold;
}

.status-value {
  padding: 5px 10px;
  border-radius: 4px;
  font-weight: 500;
}

.status-open {
  background-color: #d1fae5;
  color: #047857;
  border: 1px solid #a7f3d0;
}

.status-closed {
  background-color: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.lock-button, .unlock-button {
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.lock-button {
  background-color: #e5f2ff;
  border-color: #99ccff;
  color: #0066cc;
}

.unlock-button {
  background-color: #ffebeb;
  border-color: #ffb3b3;
  color: #cc0000;
}

.lock-button:hover {
  background-color: #cce5ff;
  border-color: #66b3ff;
}

.unlock-button:hover {
  background-color: #ffd6d6;
  border-color: #ff8080;
}

.lock-button:focus, .unlock-button:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.lock-button:active, .unlock-button:active {
  transform: translateY(1px);
}

.form-customization {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.form-customization h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #374151;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #4B5563;
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 4px;
  font-size: 0.9rem;
  transition: border-color 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: #3B82F6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

textarea.form-control {
  resize: vertical;
  min-height: 80px;
}

.save-button {
  background-color: #3B82F6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.save-button:hover {
  background-color: #2563EB;
}

.save-button:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4);
}

.menu-item {
  margin-bottom: 15px;
  padding: 15px;
  background-color: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.menu-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.menu-item-inputs {
  display: flex;
  gap: 10px;
  flex: 1;
}

.menu-item-name {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 4px;
  font-size: 0.9rem;
}

.menu-item-price {
  width: 100px;
  padding: 8px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 4px;
  font-size: 0.9rem;
}

.menu-item-actions {
  display: flex;
  gap: 10px;
}

.toggle-button {
  background-color: #E5E7EB;
  border: 1px solid #D1D5DB;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-button:hover {
  background-color: #D1D5DB;
}

.remove-button {
  background-color: #FEE2E2;
  border: 1px solid #FECACA;
  color: #B91C1C;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.remove-button:hover {
  background-color: #FECACA;
}

.menu-item-details {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #E5E7EB;
}

.item-description {
  margin-top: 5px;
}

.add-button {
  background-color: #D1FAE5;
  border: 1px solid #A7F3D0;
  color: #047857;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  margin-right: 10px;
  transition: all 0.2s;
}

.add-button:hover {
  background-color: #A7F3D0;
}

.image-upload-section {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #E5E7EB;
}

.image-preview-container {
  margin-bottom: 10px;
}

.image-preview {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

.no-image {
  padding: 10px;
  text-align: center;
  color: #666;
  border: 1px solid #D1D5DB;
  border-radius: 4px;
}

.image-loading {
  padding: 10px;
  text-align: center;
  color: #3B82F6;
  background-color: #EFF6FF;
  border: 1px solid #BFDBFE;
  border-radius: 4px;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

.image-upload-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.image-input {
  display: none;
}

.upload-button {
  background-color: #E5E7EB;
  border: 1px solid #D1D5DB;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-button:hover {
  background-color: #D1D5DB;
}

.remove-image-button {
  background-color: #FEE2E2;
  border: 1px solid #FECACA;
  color: #B91C1C;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.remove-image-button:hover {
  background-color: #FECACA;
}

.image-url-input {
  margin: 15px 0;
  padding: 15px;
  background-color: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 6px;
}

.image-url-input label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #0369a1;
}

.image-url-input input {
  width: 100%;
  padding: 8px 12px;
  margin-bottom: 10px;
  border: 1px solid #bae6fd;
  border-radius: 4px;
}

.url-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.test-url-button, .sample-url-button {
  flex: 1;
  min-width: 100px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.9rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background-color: #E5E7EB;
  border: 1px solid #D1D5DB;
}

.test-url-button:hover, .sample-url-button:hover {
  background-color: #D1D5DB;
}

.test-url-button:disabled {
  background-color: #F3F4F6;
  color: #9CA3AF;
  cursor: not-allowed;
  border-color: #E5E7EB;
  opacity: 0.7;
}

.apply-url-button {
  flex: 1;
  min-width: 100px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.9rem;
  text-align: center;
  cursor: pointer;
  transition: background-color 0.2s;
  background-color: #0ea5e9;
  color: white;
  border: none;
  font-weight: 500;
}

.apply-url-button:hover {
  background-color: #0284c7;
}
</style>

