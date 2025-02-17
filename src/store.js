import { reactive } from 'vue';
import { io } from 'socket.io-client';
import emitter from './eventBus';

const store = reactive({
  orders: [],
  students: [],

  async loadData() {
    try {
      const savedData = localStorage.getItem('orders')
      if (savedData) {
        this.orders = JSON.parse(savedData)
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
      // Extract first and last name from the CSV
      const firstName = row['First Name']
      const lastName = row['Last Name']

      // Find matching student
      const student = this.students.find(s => 
        s.first_name.trim().toLowerCase() === firstName.trim().toLowerCase() &&
        s.last_name.trim().toLowerCase() === lastName.trim().toLowerCase()
      )

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

      // Create the order object
      return {
        id: Date.now() + Math.random(), // Ensure unique ID
        orderId: student ? student.id : null,
        firstName,
        lastName,
        grade: row['Grade'],
        items,
        paymentMethod: 'Cash', // Default value since it's not in CSV
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