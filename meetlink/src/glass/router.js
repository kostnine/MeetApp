import { createRouter, createWebHistory } from 'vue-router'
import OnboardingView from './views/OnboardingView.vue'
import AuthView from './views/AuthView.vue'
import MapView from './views/MapView.vue'
import RequestsView from './views/RequestsView.vue'
import ChatsView from './views/ChatsView.vue'
import ProfileView from './views/ProfileView.vue'
import EditProfileView from './views/EditProfileView.vue'
import SettingsView from './views/SettingsView.vue'
import PublicRequestView from './views/PublicRequestView.vue'
import { useAuthStore } from './stores/auth'

const routes = [
  { path: '/', redirect: '/welcome' },
  { path: '/welcome', name: 'welcome', component: OnboardingView, meta: { bare: true } },
  { path: '/auth', name: 'auth', component: AuthView, meta: { bare: true } },
  { path: '/map', name: 'map', component: MapView, meta: { requiresAuth: true } },
  { path: '/requests', name: 'requests', component: RequestsView, meta: { requiresAuth: true } },
  { path: '/chats', name: 'chats', component: ChatsView, meta: { requiresAuth: true } },
  { path: '/profile', name: 'profile', component: ProfileView, meta: { requiresAuth: true } },
  { path: '/profile/edit', name: 'profile-edit', component: EditProfileView, meta: { requiresAuth: true } },
  { path: '/settings', name: 'settings', component: SettingsView, meta: { requiresAuth: true } },
  { path: '/r/:code', name: 'public-request', component: PublicRequestView, meta: { bare: true } },
  { path: '/:pathMatch(.*)*', redirect: '/map' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Gate app screens behind auth; restore a stored session first (awaited, runs once).
router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true
  const auth = useAuthStore()
  await auth.ensureRestored()
  if (auth.isAuthed) return true
  return { name: 'welcome' }
})

export default router
