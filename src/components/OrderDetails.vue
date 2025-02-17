<template>
  <div class="order-details">
    <h3>Order Details</h3>
    <div class="toggle-group">
      <label>
        <input type="checkbox" v-model="order.pickedUp" @change="updateOrder('pickedUp', order.pickedUp)" />
        Picked Up
      </label>
      <label>
        <input type="checkbox" v-model="order.poly" @change="updateOrder('poly', order.poly)" />
        Poly
      </label>
      <label>
        <input type="checkbox" v-model="order.venmo" @change="updateOrder('venmo', order.venmo)" />
        Venmo
      </label>
      <label>
        <input type="checkbox" v-model="order.prepaid" @change="updateOrder('prepaid', order.prepaid)" />
        Prepaid
      </label>
    </div>
  </div>
</template>

<script>
import { reactive, toRefs } from 'vue';
import store from '../store';

export default {
  props: {
    order: Object
  },
  setup(props) {
    const state = reactive({
      order: props.order
    });

    const updateOrder = (field, value) => {
      // Update the order state immediately
      state.order[field] = value;

      // Emit the change to the store or handle it directly
      store.updateOrder(state.order);
    };

    return {
      ...toRefs(state),
      updateOrder
    };
  }
};
</script>

<style scoped>
.toggle-group {
  display: flex;
  flex-direction: column;
}
</style> 