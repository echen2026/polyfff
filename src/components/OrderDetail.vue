
<template>
    <div class="order-detail">
      <h2>{{ order.firstName }} {{ order.lastName }}</h2>
      <div class="payment-status label">
        Payment Status: <span :class="'status-' + order.paymentMethod.toLowerCase()">{{ order.paymentMethod }}</span>
      </div>
      <div class="total-amount label">
        Total: ${{ total }}
      </div>
      <div class="grade label">
        Grade: {{ order.grade }}
      </div>
      <div class="button-group">
        <button @click="markAsCash" class="status-cash">Mark as Cash</button>
        <button @click="markAsVenmo" class="status-venmo">Mark as Venmo</button>
        <button @click="markAsUnpaid" class="status-unpaid">Mark as Unpaid</button>
        <button @click="toggleCheckIn" :class="{'checked-in': order.checkedIn}">
          {{ order.checkedIn ? 'Mark as Not Picked Up' : 'Mark as Picked Up' }}
        </button>
        <button @click="$emit('close')" class="close-button">Close</button>
      </div>
      <ul>
        <li v-for="item in order.items" :key="item.name">
          {{ item.name }} ({{ item.quantity }}) - ${{ item.price * item.quantity }}
        </li>
      </ul>
    </div>
</template>

<script>
export default {
  props: ['order'],
  computed: {
    total() {
      return this.order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }
  },
  methods: {
    markAsCash() {
      this.order.paymentMethod = 'Cash';
      this.$emit('updateOrder', this.order);
    },
    markAsVenmo() {
      this.order.paymentMethod = 'Venmo';
      this.$emit('updateOrder', this.order);
    },
    markAsUnpaid() {
      this.order.paymentMethod = 'Unpaid';
      this.$emit('updateOrder', this.order);
    },
    toggleCheckIn() {
      this.order.checkedIn = !this.order.checkedIn;
      this.$emit('updateOrder', this.order);
    }
  }
};
</script>
