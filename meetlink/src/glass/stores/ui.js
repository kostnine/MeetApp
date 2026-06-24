import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * UI store — viewport mode, transient overlays and toast.
 * The responsive switch happens at 1000px (matchMedia), matching the design.
 */
export const useUiStore = defineStore('ui', () => {
  const isDesktop = ref(typeof window !== 'undefined' ? window.innerWidth >= 1000 : true)
  const toast = ref('')

  // Overlays that layer above screens (story sheet, post-story, QR modal, public page).
  const qrRequest = ref(null)
  const selectedStory = ref(null)
  const showPostStory = ref(false)
  // Tap-a-person card on the map (avatar, distance, their line, Message / Send request).
  const selectedPerson = ref(null)
  // Full-screen story viewer (Instagram-style tap-through).
  const storyList = ref([])
  const storyIndex = ref(0)
  const storyMine = ref(false)

  let bound = false
  let toastTimer = null

  function update() {
    isDesktop.value = window.innerWidth >= 1000
  }

  function init() {
    if (typeof window === 'undefined' || bound) return
    bound = true
    update()
    // resize covers the common case; matchMedia covers zoom / devtools boundary crossings.
    window.addEventListener('resize', update)
    window.matchMedia('(min-width: 1000px)').addEventListener('change', update)
  }

  function showToast(text) {
    toast.value = text
    if (toastTimer) window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => {
      toast.value = ''
    }, 2000)
  }

  function openQr(request) {
    qrRequest.value = request
  }
  function closeQr() {
    qrRequest.value = null
  }

  function openStory(story) {
    selectedStory.value = story
  }
  function closeStory() {
    selectedStory.value = null
  }

  function openPostStory() {
    showPostStory.value = true
  }
  function closePostStory() {
    showPostStory.value = false
  }

  function openPerson(person) {
    selectedPerson.value = person
  }
  function closePerson() {
    selectedPerson.value = null
  }

  function openStoryViewer(list, index = 0, mine = false) {
    storyList.value = Array.isArray(list) ? list : []
    storyIndex.value = index
    storyMine.value = mine
  }
  function closeStoryViewer() {
    storyList.value = []
  }
  function storyNext() {
    if (storyIndex.value < storyList.value.length - 1) storyIndex.value += 1
    else closeStoryViewer()
  }
  function storyPrev() {
    if (storyIndex.value > 0) storyIndex.value -= 1
  }

  async function copyText(text) {
    try {
      await navigator.clipboard?.writeText(text)
      return true
    } catch {
      return false
    }
  }

  return {
    isDesktop,
    toast,
    qrRequest,
    selectedStory,
    showPostStory,
    selectedPerson,
    init,
    showToast,
    openQr,
    closeQr,
    openStory,
    closeStory,
    openPostStory,
    closePostStory,
    openPerson,
    closePerson,
    storyList,
    storyIndex,
    storyMine,
    openStoryViewer,
    closeStoryViewer,
    storyNext,
    storyPrev,
    copyText,
  }
})
