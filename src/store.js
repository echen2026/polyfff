import { reactive } from 'vue';
import { io } from 'socket.io-client';
import emitter from './eventBus';

const store = reactive({
  orders: [],
  students: [],
  menuItems: [],

  async loadData() {
    try {
      const savedData = localStorage.getItem('orders')
      if (savedData) {
        this.orders = JSON.parse(savedData)
      }

      const savedMenuItems = localStorage.getItem('menuItems')
      if (savedMenuItems) {
        this.menuItems = JSON.parse(savedMenuItems)
      }

      const response = await fetch('/result.json')
      this.students = await response.json()
    } catch (error) {
      console.error('Error loading data:', error)
    }
  },

  saveData() {
    localStorage.setItem('orders', JSON.stringify(this.orders))
  },

  updateOrder(updatedOrder) {
    const index = this.orders.findIndex(o => o.id === updatedOrder.id)
    if (index !== -1) {
      this.orders[index] = updatedOrder
      this.saveData()
    }
  },

  processNewOrders(csvData) {
    return csvData.map(row => {
      // Extract and clean names from the CSV - remove all punctuation and extra spaces
      const cleanName = (name) => name.toLowerCase().replace(/[^\w\s]/g, '').trim()
      const csvFirstName = cleanName(row['First Name'])
      const csvLastName = cleanName(row['Last Name'])

      console.log(`Looking for match for: ${csvFirstName} ${csvLastName}`)

      // Find matching student with enhanced name matching
      const student = this.students.find(s => {
        const firstName = cleanName(s.first_name)
        const nickname = cleanName(s.nickname)
        const lastName = cleanName(s.last_name)

        // Split names in case of multiple parts
        const csvFirstParts = csvFirstName.split(' ')
        const csvLastParts = csvLastName.split(' ')
        const firstParts = firstName.split(' ')
        const lastParts = lastName.split(' ')
        const nickParts = nickname.split(' ')

        // Join all parts of last name to handle hyphenated names
        const fullLastName = lastParts.join('')
        const fullCsvLastName = csvLastParts.join('')

        // Try normal order
        const normalOrderMatch = (
          // First name matches first name or nickname
          (csvFirstParts.some(part => firstParts.includes(part) || nickParts.includes(part))) &&
          // Last name matches last name (either with spaces or without)
          (csvLastParts.join(' ') === lastParts.join(' ') || fullCsvLastName === fullLastName)
        )

        // Try reversed order
        const reversedOrderMatch = (
          // CSV first name matches last name
          (csvFirstParts.join(' ') === lastParts.join(' ') || csvFirstParts.join('') === fullLastName) &&
          // CSV last name matches first name or nickname
          (csvLastParts.some(part => firstParts.includes(part) || nickParts.includes(part)))
        )

        if (normalOrderMatch || reversedOrderMatch) {
          console.log(`Found match: ${firstName}/${nickname} ${lastName}`)
          return true
        }

        return false
      })

      if (!student) {
        console.log(`No match found for: ${csvFirstName} ${csvLastName}`)
      }

      // Create items array from the CSV row
      const items = []
      const menuItems = {
        'Taiwanese sausage rice plate': 13.5,
        'Smoked chicken rice plate': 13.5,
        'Sausage Rice roll': 8.5,
        'Beef Rice Roll': 9.5,
        'Vegetarian Rice Roll': 7,
        'Sweet Rice Roll': 7,
        'Egg Omelet': 7.5,
        'Popcorn Chicken': 7.5,
        'Chinese Donut': 4
      }

      // Add items that have a quantity greater than 0
      Object.entries(menuItems).forEach(([name, price]) => {
        const quantity = parseInt(row[name] || 0)
        if (quantity > 0) {
          items.push({
            name,
            quantity,
            price
          })
        }
      })

      // Create the order object with the matched student's information
      return {
        id: Date.now() + Math.random(), // Ensure unique ID
        orderId: student ? student.id : null,
        firstName: student ? student.first_name : row['First Name'],
        lastName: student ? student.last_name : row['Last Name'],
        grade: student ? student.grade : row['Grade'],
        email: student ? student.email : '',
        items,
        paymentMethod: 'Unpaid',
        checkedIn: false
      }
    })
  },

  updateOrderId(orderId, newStudentId) {
    const order = this.orders.find(o => o.id === orderId)
    if (order) {
      order.orderId = newStudentId
      this.saveData()
    }
  },

  downloadCSV() {
    let csvContent = "First Name,Last Name,Grade,Items,Total,Payment Method,Picked Up,Student ID\n"
    
    this.orders.forEach(order => {
      const items = order.items.map(item => `${item.quantity}x ${item.name}`).join('; ')
      const total = order.items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
      
      csvContent += `${order.firstName},${order.lastName},${order.grade},"${items}",${total},${order.paymentMethod},${order.checkedIn ? 'Yes' : 'No'},${order.orderId || ''}\n`
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "orders.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  },

  deleteOrder(orderId) {
    const index = this.orders.findIndex(order => order.id === orderId)
    if (index !== -1) {
      this.orders.splice(index, 1)
      this.saveData()
    }
  },

  toggleOrderProperty(orderId, property) {
    const order = this.orders.find(o => o.id === orderId)
    if (order) {
      order[property] = !order[property]
      this.saveData()
    }
  },

  addOrder(order) {
    this.orders.push(order)
    this.saveData()
  }
});

// Listen for events
emitter.on('updateOrder', (order) => {
  console.log("Updating order in store", order);
  store.updateOrder(order);
});

emitter.on('addOrder', (order) => {
  store.addOrder(order);
});

// Socket.IO connection for real-time updates
const socket = io();
socket.on('dataUpdated', (data) => {
  store.orders = data.orders;
  store.menuItems = data.menuItems;
});

export default store; 