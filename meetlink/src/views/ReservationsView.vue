<script setup>
import { onMounted, watch } from 'vue'
import { Check, LockKeyhole, LogIn, MessageCircle, SlidersHorizontal, X } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { useMeetStore } from '../stores/meet'

const store = useMeetStore()
const router = useRouter()

async function openChat(item) {
  const conversationId = await store.openConversationForResponse(item)
  router.push({
    name: 'messages',
    query: conversationId ? { conversation: conversationId } : {},
  })
}

onMounted(() => {
  store.markResponsesSeen()
})

watch(
  () => store.requestResponses.map((response) => response.id).join('|'),
  () => store.markResponsesSeen(),
)
</script>

<template>
  <section class="panel">
    <div class="panel-head">
      <div>
        <p class="eyebrow">Запросы на общение</p>
        <h2>Все ответы на твои ссылки</h2>
      </div>
      <SlidersHorizontal :size="22" />
    </div>

    <div v-if="!store.isAdmin" class="lock-card">
      <LockKeyhole :size="24" />
      <div>
        <strong>Нужен вход администратора</strong>
        <span>Ответы, контакты и статусы видишь только ты после входа.</span>
      </div>
      <RouterLink class="primary-button" :to="{ name: 'login', query: { redirect: '/reservations' } }">
        <LogIn :size="18" />
        Войти
      </RouterLink>
    </div>

    <template v-else>
      <div class="filter-row">
        <button :class="{ selected: store.responseFilter === 'all' }" type="button" @click="store.responseFilter = 'all'">Все</button>
        <button :class="{ selected: store.responseFilter === 'accepted' }" type="button" @click="store.responseFilter = 'accepted'">Приняли</button>
        <button :class="{ selected: store.responseFilter === 'declined' }" type="button" @click="store.responseFilter = 'declined'">Отказались</button>
      </div>

      <div class="request-response-list">
        <article
          v-for="item in store.filteredRequestResponses"
          :key="item.id"
          class="request-response-card"
          :class="item.status"
        >
          <div class="mini-avatar">{{ item.alias.slice(0, 1).toUpperCase() }}</div>
          <div>
            <div class="response-topline">
              <strong>{{ item.alias }}<span v-if="item.age">, {{ item.age }}</span></strong>
              <span class="status-badge">
                <Check v-if="item.status === 'accepted'" :size="14" />
                <X v-else :size="14" />
                {{ item.status === 'accepted' ? 'принял' : 'отказался' }}
              </span>
            </div>
            <p>{{ item.message }}</p>
            <small>{{ item.requestLink }} · {{ item.date }}</small>
            <div v-if="item.status === 'accepted'" class="response-actions">
              <a class="ghost-button small" :href="item.contact.startsWith('+') ? `tel:${item.contact}` : '#'" @click.prevent>
                {{ item.contact }}
              </a>
              <button class="primary-button small" type="button" @click="openChat(item)">
                <MessageCircle :size="16" />
                Открыть чат
              </button>
            </div>
          </div>
        </article>
      </div>
    </template>
  </section>
</template>
