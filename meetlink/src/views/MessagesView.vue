<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, Ban, Bell, MessageCircle, Search, Send, Trash2 } from '@lucide/vue'
import { useMeetStore } from '../stores/meet'

const store = useMeetStore()
const route = useRoute()
const mobileThreadOpen = ref(false)
const searchQuery = ref('')
const messageList = ref(null)

const filteredConversations = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return store.conversations

  return store.conversations.filter((conversation) => {
    return [conversation.alias, conversation.contact, conversation.lastMessage, conversation.source]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  })
})

function scrollThreadToBottom() {
  nextTick(() => {
    if (!messageList.value) return
    messageList.value.scrollTop = messageList.value.scrollHeight
  })
}

function openConversation(id) {
  store.openConversation(id)
  mobileThreadOpen.value = true
  scrollThreadToBottom()
}

function closeMobileThread() {
  mobileThreadOpen.value = false
}

async function openRouteConversation() {
  if (!store.conversations.length) {
    await store.loadConversations().catch(() => {})
  }

  const id = String(route.query.conversation || '')
  if (!id) return

  await store.openConversation(id)
  mobileThreadOpen.value = true
  scrollThreadToBottom()
}

onMounted(openRouteConversation)
watch(() => route.query.conversation, openRouteConversation)
watch(() => store.activeConversationId, scrollThreadToBottom)
watch(() => store.activeConversation?.messages.length, scrollThreadToBottom)
watch(() => store.conversations.length, () => {
  if (!store.activeConversation) mobileThreadOpen.value = false
})
</script>

<template>
  <section class="view-grid messages-view" :class="{ 'mobile-thread-open': mobileThreadOpen }">
    <aside class="panel chat-list-panel">
      <div class="telegram-list-head">
        <div>
          <h2>Чаты</h2>
          <small>Запросы и переписки</small>
        </div>
        <Bell :size="22" />
      </div>

      <label class="chat-search">
        <Search :size="18" />
        <input v-model="searchQuery" type="search" placeholder="Поиск" />
      </label>

      <div class="conversation-list" aria-label="Диалоги">
        <div v-if="!store.conversations.length" class="conversation-empty">
          <MessageCircle :size="22" />
          <strong>Пока нет чатов</strong>
          <small>Когда человек примет запрос, диалог появится здесь.</small>
        </div>

        <div v-else-if="!filteredConversations.length" class="conversation-empty">
          <Search :size="22" />
          <strong>Ничего не найдено</strong>
          <small>Попробуй ник, контакт или текст последнего сообщения.</small>
        </div>

        <button
          v-for="conversation in filteredConversations"
          :key="conversation.id"
          type="button"
          class="conversation-item"
          :class="{ selected: store.activeConversation?.id === conversation.id }"
          @click="openConversation(conversation.id)"
        >
          <span class="mini-avatar">{{ conversation.alias.slice(0, 1).toUpperCase() }}</span>
          <span class="conversation-main">
            <strong>{{ conversation.alias }}</strong>
            <small>{{ conversation.lastMessage || conversation.contact || 'Новый диалог' }}</small>
          </span>
          <span class="conversation-meta">
            <small>{{ conversation.updatedAt }}</small>
            <strong v-if="store.isConversationUnread(conversation)" class="chat-unread-badge">1</strong>
            <i v-else-if="conversation.online"></i>
          </span>
        </button>
      </div>
    </aside>

    <div class="panel chat-panel">
      <div class="panel-head chat-desktop-head">
        <div>
          <p class="eyebrow">Переписка</p>
          <h2>{{ store.activeConversation?.alias || 'Диалоги' }}</h2>
        </div>
        <span class="soft-counter">{{ store.conversations.length }}</span>
      </div>

      <section v-if="!store.activeConversation" class="message-thread empty-thread">
        <MessageCircle :size="28" />
        <strong>Выбери чат</strong>
        <span>Открой диалог слева или создай новый запрос, чтобы начать переписку.</span>
      </section>

      <section v-else class="message-thread">
        <div class="thread-head">
          <button class="mobile-back-button" type="button" aria-label="Назад к чатам" @click="closeMobileThread">
            <ArrowLeft :size="22" />
          </button>
          <span class="mini-avatar thread-avatar">{{ store.activeConversation.alias.slice(0, 1).toUpperCase() }}</span>
          <div class="thread-title">
            <strong>{{ store.activeConversation.alias }}</strong>
            <span>
              {{ store.activeConversation.online ? 'онлайн' : 'был недавно' }}
              · {{ store.activeConversation.contact || store.activeConversation.source }}
            </span>
          </div>
          <div class="thread-actions">
            <button
              class="icon-button"
              :class="{ active: store.activeConversation.blocked }"
              type="button"
              :aria-label="store.activeConversation.blocked ? 'Разблокировать' : 'Заблокировать'"
              @click="store.blockConversation(store.activeConversation)"
            >
              <Ban :size="17" />
            </button>
            <button class="icon-button" type="button" aria-label="Удалить чат" @click="store.deleteConversation(store.activeConversation)">
              <Trash2 :size="17" />
            </button>
          </div>
        </div>

        <div ref="messageList" class="message-list">
          <article
            v-for="message in store.activeConversation.messages"
            :key="message.id"
            :class="['message-bubble', message.sender]"
          >
            <p>{{ message.body }}</p>
            <small>{{ message.sender === 'owner' ? 'вы' : store.activeConversation.alias }} · {{ message.time }}</small>
          </article>
        </div>

        <form class="reply-box" @submit.prevent="store.sendChatMessage">
          <p v-if="store.activeConversation.blocked" class="blocked-chat-note">
            Чат заблокирован. Новые сообщения не отправляются.
          </p>
          <input
            v-model="store.replyText"
            type="text"
            :disabled="store.activeConversation.blocked"
            :placeholder="store.activeConversation.blocked ? 'Чат заблокирован' : 'Сообщение'"
          />
          <button class="primary-button send-only-button" type="submit" :disabled="store.activeConversation.blocked" aria-label="Отправить">
            <Send :size="18" />
            <span>Отправить</span>
          </button>
        </form>
      </section>
    </div>
  </section>
</template>
