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
      diagnosticResult: null
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
      this.menuItems.push({ name: '', price: 0 });
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
        { name: 'Sandwich', price: 5.00 },
        { name: 'Drink', price: 2.00 },
        { name: 'Chips', price: 1.50 },
        { name: 'Cookie', price: 1.00 }
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
</style>

