
<template>
  <div class="add-sale">
    <h2>Add Manual Sale</h2>
    <input v-model="firstName" placeholder="First Name"/>
    <input v-model="lastName" placeholder="Last Name"/>
    <input v-model="grade" placeholder="Grade"/>
    
    <h3>Items</h3>
    <div v-for="item in menuItems" :key="item.name">
      <span>{{ item.name }} (${{ item.price }})</span>
      <div class="quantity-controls">
        <button @click="decreaseQuantity(item.name)">-</button>
        <span>{{ items[item.name] || 0 }}</span>
        <button @click="increaseQuantity(item.name)">+</button>
      </div>
    </div>

    <h3>Total: ${{ total }}</h3>
    <div class="status-controls">
      <h3>Payment Status</h3>
      <div class="button-group">
        <button @click="setPaymentMethod('Cash')" :class="{'active': paymentMethod === 'Cash', 'status-cash': true}">Cash</button>
        <button @click="setPaymentMethod('Venmo')" :class="{'active': paymentMethod === 'Venmo', 'status-venmo': true}">Venmo</button>
        <button @click="setPaymentMethod('Unpaid')" :class="{'active': paymentMethod === 'Unpaid', 'status-unpaid': true}">Unpaid</button>
      </div>

      <h3>Pickup Status</h3>
      <div class="button-group">
        <button @click="toggleCheckedIn()" :class="{'active': checkedIn, 'checked-in': checkedIn}">
          {{ checkedIn ? 'Picked Up' : 'Not Picked Up' }}
        </button>
      </div>
    </div>
    <button class="submit-button" @click="submitOrder">Submit Order</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      firstName: '',
      lastName: '',
      grade: '',
      items: {},
      paymentMethod: 'Unpaid',
      checkedIn: false,
      menuItems: []
    };
  },
  mounted() {
    const savedItems = localStorage.getItem('menuItems');
    this.menuItems = savedItems ? JSON.parse(savedItems) : [
      { name: 'Cheeseburger', price: 6 },
      { name: 'Fries', price: 3 }
    ];
  },
  computed: {
    total() {
      return Object.entries(this.items).reduce((sum, [itemName, quantity]) => {
        const menuItem = this.menuItems.find(item => item.name === itemName);
        return sum + (menuItem ? menuItem.price * quantity : 0);
      }, 0);
    }
  },
  methods: {
    increaseQuantity(itemName) {
      this.items[itemName] = (this.items[itemName] || 0) + 1;
      this.$forceUpdate();
    },
    decreaseQuantity(itemName) {
      if (this.items[itemName] > 0) {
        this.items[itemName]--;
        this.$forceUpdate();
      }
    },
    setPaymentMethod(method) {
      this.paymentMethod = method;
    },
    toggleCheckedIn() {
      this.checkedIn = !this.checkedIn;
    },
    submitOrder() {
      const order = {
        firstName: this.firstName,
        lastName: this.lastName,
        grade: this.grade,
        items: Object.entries(this.items)
          .filter(([_, quantity]) => quantity > 0)
          .map(([itemName, quantity]) => {
            const menuItem = this.menuItems.find(item => item.name === itemName);
            return {
              name: itemName,
              quantity: quantity,
              price: menuItem.price
            };
          }),
        paymentMethod: this.paymentMethod,
        checkedIn: this.checkedIn,
      };
      this.$emit('orderSubmitted', order);
    }
  }
};
</script>
