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

  async function enter() {
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
    if (user.value) await enter()
    return user.value
  }

  async function login(identifier, password) {
    user.value = await loginRequest(identifier, password)
    await enter()
  }

  async function register(payload) {
    user.value = await registerRequest(payload)
    await enter()
  }

  async function guest() {
    user.value = await guestLogin()
    await enter()
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
