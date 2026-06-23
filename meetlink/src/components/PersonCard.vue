<script setup>
import { Send } from '@lucide/vue'
import { useMeetStore } from '../stores/meet'

defineProps({
  user: {
    type: Object,
    required: true,
  },
})

const store = useMeetStore()
</script>

<template>
  <article class="person-card">
    <div class="mini-avatar large" :style="{ background: user.color }">{{ user.name.slice(0, 1) }}</div>
    <h3>{{ user.name }}<span v-if="user.age">, {{ user.age }}</span></h3>
    <p>{{ user.distance }} м · {{ user.status }}</p>
    <RouterLink class="ghost-button small" :to="{ name: 'messages' }" @click="store.startQuickMessage(user)">
      <Send :size="16" />
      Написать
    </RouterLink>
  </article>
</template>
