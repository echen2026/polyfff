<template>
  <div id="student-app">
    <header>
      <h1>{{ formTitle }}</h1>
    </header>
    
    <div class="student-order-container">
      <StudentOrderForm />
    </div>
    
    <footer>
      <p>Contact Jeremy or Evan if you encounter any errors.</p>
    </footer>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import StudentOrderForm from './components/StudentOrderForm.vue'
import store from './store.js'

export default defineComponent({
  name: 'StudentApp',
  components: {
    StudentOrderForm
  },
  computed: {
    formTitle(): string {
      return store.orderFormTitle
    }
  }
})
</script>

<style>
#student-app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

header {
  background-color: #1E40AF;
  color: white;
  padding: 1rem;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

header h1 {
  margin: 0;
  font-size: 1.8rem;
}

.student-order-container {
  flex: 1;
  padding: 1rem;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

footer {
  background-color: #F3F4F6;
  padding: 1rem;
  text-align: center;
  font-size: 0.9rem;
  color: #6B7280;
  margin-top: auto;
}
</style> 