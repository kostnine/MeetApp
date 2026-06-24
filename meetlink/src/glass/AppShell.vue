<script setup>
import { computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { Map as MapIcon, QrCode, MessageCircle, UserRound, Settings } from '@lucide/vue'
import { useUiStore } from './stores/ui'
import { useMeStore } from './stores/me'
import { useRequestsStore } from './stores/requests'
import { useChatsStore } from './stores/chats'
import { useAuthStore } from './stores/auth'
import { useMapStore } from './stores/map'
import BrandLogo from './components/BrandLogo.vue'
import QrModal from './components/QrModal.vue'
import StoryViewer from './components/StoryViewer.vue'
import PostStorySheet from './components/PostStorySheet.vue'
import PersonSheet from './components/PersonSheet.vue'
import ProfileModal from './components/ProfileModal.vue'
import MeAvatar from './components/MeAvatar.vue'

const ui = useUiStore()
const me = useMeStore()
const requests = useRequestsStore()
const chats = useChatsStore()
const auth = useAuthStore()
const map = useMapStore()
const route = useRoute()

const navItems = computed(() => [
  { name: 'map', label: 'Map', icon: MapIcon },
  { name: 'requests', label: 'Requests', icon: QrCode, badge: requests.newCount },
  { name: 'chats', label: 'Chats', icon: MessageCircle, badge: chats.unreadTotal },
  { name: 'profile', label: 'Profile', icon: UserRound },
  { name: 'settings', label: 'Settings', icon: Settings, desktopOnly: true },
])

const mobileNavItems = computed(() => navItems.value.filter((item) => !item.desktopOnly))
const showChrome = computed(() => !route.meta?.bare)
const visLabel = computed(() => (me.showOnMap ? 'Visible' : 'Hidden'))
const visSub = computed(() =>
  me.showOnMap ? 'People nearby can see you' : 'You are hidden from the map',
)

function isActive(name) {
  // Keep the parent tab active on child routes (e.g. /profile/edit highlights Profile).
  return route.path === `/${name}` || route.path.startsWith(`/${name}/`)
}

onMounted(() => {
  ui.init()
  auth.ensureRestored()
})
</script>

<template>
  <div class="ml-shell">
    <!-- DESKTOP SIDEBAR -->
    <aside v-if="showChrome && ui.isDesktop" class="sidebar ml-panel">
      <BrandLogo :with-wordmark="true" :size="34" :wordmark-size="21" class="sidebar-brand" />

      <nav class="sidebar-nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="nav-item"
          :class="{ 'nav-item--active': isActive(item.name) }"
        >
          <span class="nav-icon"><component :is="item.icon" :size="20" /></span>
          <span class="nav-label">{{ item.label }}</span>
          <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-spacer" />

      <button type="button" class="vis-toggle" @click="me.toggleVisible()">
        <div class="vis-text">
          <div class="vis-label">{{ visLabel }}</div>
          <div class="vis-sub">{{ visSub }}</div>
        </div>
        <span class="vis-track" :class="{ 'vis-track--on': me.showOnMap }">
          <span class="vis-knob" />
        </span>
      </button>

      <RouterLink :to="{ name: 'profile' }" class="me-card">
        <span class="me-avatar" :class="{ ring: map.hasMyStory }"><MeAvatar :avatar="me.profile.avatar" :mono="me.mono" :gradient="me.gradient" /></span>
        <span class="me-text">
          <span class="me-name">{{ me.profile.name }}</span>
          <span class="me-city">{{ me.profile.cityShort }}</span>
        </span>
      </RouterLink>
    </aside>

    <!-- MAIN -->
    <div class="ml-main" :class="{ 'ml-main--mobile': showChrome && !ui.isDesktop }">
      <RouterView v-slot="{ Component }">
        <component :is="Component" :key="route.fullPath" />
      </RouterView>
    </div>

    <!-- MOBILE BOTTOM NAV -->
    <nav v-if="showChrome && !ui.isDesktop" class="bottom-nav">
      <RouterLink
        v-for="item in mobileNavItems"
        :key="item.name"
        :to="{ name: item.name }"
        class="bottom-item"
        :class="{ 'bottom-item--active': isActive(item.name) }"
      >
        <span class="bottom-icon"><component :is="item.icon" :size="22" /></span>
        <span class="bottom-label">{{ item.label }}</span>
        <span v-if="item.badge" class="bottom-badge">{{ item.badge }}</span>
      </RouterLink>
    </nav>

    <!-- TOAST -->
    <div v-if="ui.toast" :key="ui.toast" class="ml-toast">{{ ui.toast }}</div>

    <!-- OVERLAYS -->
    <QrModal />
    <StoryViewer v-if="ui.storyList.length" />
    <PostStorySheet />
    <PersonSheet />
    <ProfileModal />
  </div>
</template>

<style scoped>
.ml-shell {
  min-height: 100vh;
  display: flex;
  background: var(--ml-mesh);
}

/* Sidebar */
.sidebar {
  flex: none;
  width: 256px;
  align-self: stretch;
  position: sticky;
  top: 14px;
  height: 100vh;
  height: calc(100dvh - 28px); /* account for the 14px top/bottom margins so it doesn't overflow */
  display: flex;
  flex-direction: column;
  padding: 24px 16px 20px;
  margin: 14px 0 14px 14px;
  border-radius: 26px;
}
.sidebar-brand {
  padding: 0 8px;
}
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 26px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 14px;
  padding: 12px 13px;
  text-decoration: none;
  background: transparent;
  color: var(--ml-ink-2);
  font-size: 14.5px;
  font-weight: 700;
  transition:
    background 0.16s ease,
    color 0.16s ease;
}
.nav-item:hover {
  background: rgba(255, 255, 255, 0.45);
}
.nav-item--active {
  background: rgba(139, 124, 246, 0.14);
  color: var(--ml-accent-ink);
}
.nav-icon {
  display: flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
}
.nav-label {
  flex: 1;
}
.nav-badge {
  margin-left: auto;
  min-width: 20px;
  height: 20px;
  border-radius: 999px;
  background: var(--ml-accent-gradient);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
}
.sidebar-spacer {
  flex: 1;
}

/* Visibility toggle */
.vis-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.45);
  border-radius: 16px;
  padding: 13px;
  cursor: pointer;
  text-align: left;
}
.vis-label {
  font-size: 13.5px;
  font-weight: 800;
  color: var(--ml-ink-1);
}
.vis-sub {
  font-size: 11.5px;
  color: #8b83a0;
  margin-top: 2px;
}
.vis-track {
  width: 40px;
  height: 23px;
  border-radius: 999px;
  background: #cdc6dd;
  position: relative;
  flex: none;
  transition: background 0.2s;
}
.vis-track--on {
  background: var(--ml-accent-gradient);
}
.vis-knob {
  position: absolute;
  top: 2.5px;
  left: 2.5px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: left 0.2s;
}
.vis-track--on .vis-knob {
  left: 19.5px;
}

/* me mini-profile */
.me-card {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-top: 12px;
  padding: 8px;
  border-radius: 14px;
  text-decoration: none;
}
.me-card:hover {
  background: rgba(255, 255, 255, 0.45);
}
.me-avatar {
  width: 40px;
  height: 40px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 17px;
  color: #fff;
  flex: none;
}
/* Instagram-style "active story" ring on my avatar. */
.me-avatar.ring {
  background: var(--ml-accent-gradient);
  padding: 3px;
  box-sizing: border-box;
}
.me-avatar.ring :deep(.me-av) {
  box-shadow: 0 0 0 2px #fff;
}
.me-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.me-name {
  font-size: 14px;
  font-weight: 800;
  color: var(--ml-ink-1);
}
.me-city {
  font-size: 11.5px;
  color: #8b83a0;
}

/* Main */
.ml-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.ml-main--mobile {
  padding-bottom: 92px;
}

/* Mobile bottom nav */
.bottom-nav {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 10px 8px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 14px 40px rgba(96, 73, 168, 0.2);
}
.bottom-item {
  position: relative;
  flex: 1;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #9a93ad;
  padding: 4px 0;
}
.bottom-item--active {
  color: var(--ml-accent-ink);
}
.bottom-icon {
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
}
.bottom-label {
  font-size: 10.5px;
  font-weight: 700;
}
.bottom-badge {
  position: absolute;
  top: -2px;
  right: 50%;
  margin-right: -22px;
  min-width: 16px;
  height: 16px;
  border-radius: 999px;
  background: var(--ml-accent-gradient);
  color: #fff;
  font-size: 9.5px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 2px solid #fff;
}

/* Toast */
.ml-toast {
  position: fixed;
  left: 50%;
  bottom: 9vh;
  transform: translateX(-50%);
  z-index: 240;
  background: rgba(42, 35, 66, 0.94);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #fff;
  font-size: 13.5px;
  font-weight: 700;
  padding: 12px 20px;
  border-radius: 999px;
  box-shadow: 0 14px 36px rgba(42, 35, 66, 0.4);
  white-space: nowrap;
  animation: mlToast 2s ease both;
}
</style>
