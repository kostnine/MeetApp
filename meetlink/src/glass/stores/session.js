import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useMeStore } from './me'
import { useRequestsStore } from './requests'
import { useMapStore } from './map'
import { useChatsStore } from './chats'

/**
 * Loads real data into the stores once the user is authenticated.
 * Called by the auth store after login/register/restore. Resilient — if the
 * backend is unreachable, stores keep their seeded mock data.
 */
export const useSessionStore = defineStore('session', () => {
  const apiError = ref('')
  let loaded = false

  async function loadData() {
    if (loaded) return
    loaded = true
    const me = useMeStore()
    const requests = useRequestsStore()
    const map = useMapStore()
    const chats = useChatsStore()
    try {
      await Promise.allSettled([me.loadProfile(), requests.load(), map.load(), chats.load()])
    } catch (error) {
      apiError.value = error.message || 'Backend error'
    }
  }

  // Clear ALL in-memory data so the next account starts from a blank slate (no cross-account
  // leakage of chats/requests/stories/profile), and allow loadData() to run again.
  function reset() {
    loaded = false
    apiError.value = ''
    useChatsStore().reset()
    useRequestsStore().reset()
    useMapStore().reset()
    useMeStore().reset()
  }

  return { apiError, loadData, reset }
})
