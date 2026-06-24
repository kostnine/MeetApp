import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  restoreSession,
  loginRequest,
  registerRequest,
  guestLogin,
  logout as apiLogout,
} from '../api'
import { connectSocket, disconnectSocket } from '../socket'
import { useSessionStore } from './session'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const isAuthed = computed(() => !!user.value)

  let restorePromise = null

  async function enter({ reset = false } = {}) {
    // Drop any previous account's socket (so we don't reuse its token/rooms).
    disconnectSocket()
    // Clear in-memory data ONLY when switching accounts (login/register/guest) — NOT on a
    // page-reload restore. Resetting on restore meant a transient reload failure (e.g. a
    // cold-started server) left the chat list emptied instead of just reloading.
    if (reset) useSessionStore().reset()
    await useSessionStore().loadData()
    connectSocket(user.value?.nickname)
  }

  // Run once on app start (and awaited by the router guard).
  function ensureRestored() {
    if (!restorePromise) restorePromise = doRestore()
    return restorePromise
  }
  async function doRestore() {
    user.value = await restoreSession()
    if (user.value) await enter({ reset: false })
    return user.value
  }

  async function login(identifier, password) {
    user.value = await loginRequest(identifier, password)
    await enter({ reset: true })
  }

  async function register(payload) {
    user.value = await registerRequest(payload)
    await enter({ reset: true })
  }

  async function guest() {
    user.value = await guestLogin()
    await enter({ reset: true })
  }

  function logout() {
    apiLogout()
    disconnectSocket()
    user.value = null
    restorePromise = null
    useSessionStore().reset()
  }

  return { user, isAuthed, ensureRestored, login, register, guest, logout }
})
