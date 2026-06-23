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

  function reset() {
    loaded = false
  }

  return { apiError, loadData, reset }
})
