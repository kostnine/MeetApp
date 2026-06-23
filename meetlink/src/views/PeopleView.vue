<script setup>
import { UsersRound } from '@lucide/vue'
import PersonCard from '../components/PersonCard.vue'
import { useMeetStore } from '../stores/meet'

const store = useMeetStore()
</script>

<template>
  <section class="panel">
    <div class="panel-head">
      <div>
        <p class="eyebrow">Люди рядом</p>
        <h2>Список без карты</h2>
      </div>
      <UsersRound :size="22" />
    </div>
    <div class="people-grid">
      <PersonCard
        v-for="user in store.visibleNearbyUsers"
        :key="user.id"
        :user="user"
      />
    </div>
  </section>
</template>
