import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Privacy settings that don't already live on the `me` store.
 * (Show-me-on-map and contacts-after-approval are shared with `me` so they stay
 * in sync with Edit profile + the sidebar.)
 */
export const useSettingsStore = defineStore('settings', () => {
  const blocked = ref([
    { id: 'b1', name: 'Spam_acc_88' },
    { id: 'b2', name: 'Mark T.' },
  ])

  function unblock(id) {
    blocked.value = blocked.value.filter((user) => user.id !== id)
  }

  return { blocked, unblock }
})
