import { createRouter, createWebHistory } from 'vue-router'
import ProfileView from '../views/ProfileView.vue'
import RequestCreateView from '../views/RequestCreateView.vue'
import RequestResponseView from '../views/RequestResponseView.vue'
import ReservationsView from '../views/ReservationsView.vue'
import ContactsView from '../views/ContactsView.vue'
import NearbyView from '../views/NearbyView.vue'
import PeopleView from '../views/PeopleView.vue'
import LikesView from '../views/LikesView.vue'
import MessagesView from '../views/MessagesView.vue'
import LoginView from '../views/LoginView.vue'
import { useMeetStore } from '../stores/meet'

const routes = [
  { path: '/', redirect: '/profile' },
  { path: '/profile', name: 'profile', component: ProfileView, meta: { requiresAdmin: true } },
  { path: '/request', name: 'request', component: RequestCreateView, meta: { requiresAdmin: true } },
  { path: '/booking', redirect: '/request' },
  { path: '/r/:code', name: 'request-response', component: RequestResponseView },
  { path: '/reservations', name: 'reservations', component: ReservationsView, meta: { requiresAdmin: true } },
  { path: '/contacts', name: 'contacts', component: ContactsView, meta: { requiresAdmin: true } },
  { path: '/nearby', name: 'nearby', component: NearbyView, meta: { requiresAdmin: true } },
  { path: '/people', name: 'people', component: PeopleView, meta: { requiresAdmin: true } },
  { path: '/likes', name: 'likes', component: LikesView, meta: { requiresAdmin: true } },
  { path: '/messages', name: 'messages', component: MessagesView, meta: { requiresAdmin: true } },
  { path: '/login', name: 'login', component: LoginView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAdmin) return true

  const store = useMeetStore()
  if (!store.isAdmin) {
    await store.verifySession()
  }

  if (store.isAdmin) return true

  return {
    name: 'login',
    query: { redirect: to.fullPath },
  }
})

export default router
