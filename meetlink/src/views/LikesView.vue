<script setup>
import { Heart, MessageCircle } from '@lucide/vue'
import { useMeetStore } from '../stores/meet'

const store = useMeetStore()
</script>

<template>
  <section class="panel">
    <div class="panel-head">
      <div>
        <p class="eyebrow">Лайки</p>
        <h2>Мои, входящие и взаимные</h2>
      </div>
      <Heart :size="22" />
    </div>
    <div class="likes-list">
      <article v-for="like in store.likes" :key="like.id" class="contact-card">
        <div class="mini-avatar">{{ like.name.slice(0, 1) }}</div>
        <div>
          <h3>{{ like.name }}</h3>
          <p>{{ like.distance }} м · {{ like.type === 'mutual' ? 'взаимный лайк' : like.type === 'me' ? 'я лайкнул' : 'лайкнул меня' }}</p>
        </div>
        <button class="ghost-button small" type="button">
          <MessageCircle :size="16" />
          контакт
        </button>
      </article>
    </div>
  </section>
</template>
