<script setup>
import { computed, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  Bell,
  Command,
  Link as LinkIcon,
  LogIn,
  LogOut,
  MapPin,
  Moon,
  Send,
  Settings2,
  Sun,
  UserRound,
} from '@lucide/vue'
import { useMeetStore } from './stores/meet'

const store = useMeetStore()
const route = useRoute()

const appRoutes = [
  { name: 'profile', label: 'Профиль', shortLabel: 'Профиль', description: 'Личная карточка', icon: UserRound },
  { name: 'nearby', label: 'Рядом', shortLabel: 'Рядом', description: 'Люди поблизости', icon: MapPin },
  { name: 'request', label: 'Создать', shortLabel: 'Создать', description: 'Новый запрос', icon: LinkIcon, primary: true },
  { name: 'messages', label: 'Чаты', shortLabel: 'Чаты', description: 'Диалоги и контакты', icon: Send },
  { name: 'reservations', label: 'Входящие', shortLabel: 'Входящие', description: 'Ответы на запросы', icon: Bell },
]

const routeTitles = {
  login: { label: 'Вход', description: 'Админ-доступ' },
  contacts: { label: 'Контакты', description: 'Заявки и данные' },
  people: { label: 'Люди', description: 'Профили рядом' },
  likes: { label: 'Лайки', description: 'Симпатии' },
}

const activeRouteName = computed(() => route.name)
const activeRoute = computed(() => appRoutes.find((item) => item.name === activeRouteName.value) || routeTitles[activeRouteName.value] || appRoutes[0])
const isPublicRequestPage = computed(() => activeRouteName.value === 'request-response')
const noticeTarget = computed(() => {
  if (!store.realtimeNotice) return { name: 'messages' }
  if (store.realtimeNotice.route === 'messages') {
    return {
      name: 'messages',
      query: store.realtimeNotice.conversationId ? { conversation: store.realtimeNotice.conversationId } : {},
    }
  }
  return { name: store.realtimeNotice.route || 'reservations' }
})

function routeBadge(name) {
  if (name === 'messages') return store.unreadConversationCount
  if (name === 'reservations') return store.newResponsesCount
  return 0
}

onMounted(() => {
  store.bootstrap()
})
</script>

<template>
  <main class="app-shell neo-glass-shell" :class="[store.theme, { 'public-shell': isPublicRequestPage }]">
    <div class="neo-ambient" aria-hidden="true">
      <span class="neo-plane plane-one"></span>
      <span class="neo-plane plane-two"></span>
      <span class="neo-plane plane-three"></span>
      <span class="neo-grid"></span>
    </div>

    <header v-if="!isPublicRequestPage" class="floating-status-bar">
      <RouterLink class="brand-pill" :to="{ name: 'messages' }">
        <span class="brand-mark"><Command :size="20" /></span>
        <span>
          <strong>MeetMe</strong>
          <small>people nearby now</small>
        </span>
      </RouterLink>

      <div class="route-pill">
        <span>{{ activeRoute.description }}</span>
        <strong>{{ activeRoute.label }}</strong>
      </div>

      <div class="header-actions">
        <span class="online-pill"><i></i>{{ store.profile.status }}</span>
        <button
          class="icon-button"
          type="button"
          @click="store.toggleTheme"
          :aria-label="store.theme === 'light' ? 'Темная тема' : 'Светлая тема'"
        >
          <Moon v-if="store.theme === 'light'" :size="18" />
          <Sun v-else :size="18" />
        </button>
        <RouterLink class="icon-button" :to="{ name: 'profile' }" aria-label="Настройки профиля">
          <Settings2 :size="18" />
        </RouterLink>
        <button v-if="store.isAdmin" class="icon-button" type="button" aria-label="Выйти" @click="store.logout">
          <LogOut :size="18" />
        </button>
        <RouterLink v-else class="icon-button" :to="{ name: 'login' }" aria-label="Войти">
          <LogIn :size="18" />
        </RouterLink>
      </div>
    </header>

    <section class="workspace neo-workspace">
      <RouterView v-slot="{ Component }">
        <Transition name="page-shift" mode="out-in">
          <component :is="Component" :key="route.fullPath" />
        </Transition>
      </RouterView>
    </section>

    <div v-if="store.realtimeNotice && !isPublicRequestPage" class="realtime-toast neo-toast">
      <div>
        <strong>{{ store.realtimeNotice.title }}</strong>
        <span>{{ store.realtimeNotice.text }}</span>
      </div>
      <RouterLink class="toast-link" :to="noticeTarget" @click="store.clearRealtimeNotice">
        Открыть
      </RouterLink>
      <button type="button" aria-label="Закрыть" @click="store.clearRealtimeNotice">×</button>
    </div>

    <nav v-if="!isPublicRequestPage" class="glass-bottom-dock" aria-label="Навигация MeetMe">
      <RouterLink
        v-for="item in appRoutes"
        :key="item.name"
        :to="{ name: item.name }"
        class="dock-item"
        :class="{ 'is-active': activeRouteName === item.name, 'is-primary': item.primary }"
      >
        <span class="dock-icon">
          <component :is="item.icon" :size="20" />
          <strong v-if="routeBadge(item.name)" class="dock-badge">{{ routeBadge(item.name) }}</strong>
        </span>
        <span>{{ item.shortLabel }}</span>
      </RouterLink>
    </nav>
  </main>
</template>
