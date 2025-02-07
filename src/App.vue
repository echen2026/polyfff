<template>
  <div id="app">
    <header>
      <h1>Fun Food Friday Manager</h1>
      <nav>
        <button @click="showComponent('orderList')" :class="{ active: currentComponent === 'orderList' }">Home</button>
        <button @click="showComponent('settings')" :class="{ active: currentComponent === 'settings' }">Settings</button>
        <button @click="showComponent('addSale')" :class="{ active: currentComponent === 'addSale' }">Add Manual Sale</button>
      </nav>
    </header>
    <OrderList v-if="currentComponent === 'orderList'" :orders="orders" @selectOrder="setSelectedOrder"/>
    <OrderDetail v-if="currentComponent === 'orderDetail'" :order="selectedOrder" @close="currentComponent = 'orderList'" @updateOrder="updateOrder"/>
    <Settings v-if="currentComponent === 'settings'"/>
    <AddManualSale v-if="currentComponent === 'addSale'" @orderSubmitted="addOrder"/>
  </div>
</template>

<script>
import store from './store';
import OrderList from './components/OrderList.vue';
import OrderDetail from './components/OrderDetail.vue';
import Settings from './components/Settings.vue';
import AddManualSale from './components/AddManualSale.vue';

export default {
  components: {
    OrderList,
    OrderDetail,
    Settings,
    AddManualSale,
  },
  data() {
    return {
      currentComponent: 'orderList',
      selectedOrder: null,
    };
  },
  computed: {
    orders() {
      return store.orders;
    }
  },
  created() {
    store.loadData();
  },
  methods: {
    showComponent(component) {
      this.currentComponent = component;
    },
    setSelectedOrder(order) {
      this.selectedOrder = order;
      this.currentComponent = 'orderDetail';
    },
    updateOrder(updatedOrder) {
      const index = store.orders.findIndex(o => o.id === updatedOrder.id);
      if (index !== -1) {
        store.orders.splice(index, 1, updatedOrder);
        store.saveData();
      }
    },
    addOrder(order) {
      order.id = Date.now(); // Assign a unique ID
      store.orders.push(order);
      store.saveData();
      this.currentComponent = 'orderList';
    }
  }
};
</script>

<style src="./styles.css"></style>