import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { apiFetch, authHeaders } from '../api'

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const MAX_AVATAR_BYTES = 3_000_000

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) {
      reject(new Error('Please choose an image file'))
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      reject(new Error('Image is too large — pick one under 3 MB'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read that image'))
    reader.readAsDataURL(file)
  })
}

/**
 * "me" store — the signed-in person's profile, map/message visibility, and the
 * Edit-profile draft (committed on save, discarded on cancel).
 * Seeded with mock data; replace with real profile fetching/upload later.
 */
export const useMeStore = defineStore('me', () => {
  const profile = reactive({
    name: 'Kostnine',
    age: 27,
    city: 'Vilnius',
    cityShort: 'Vilnius',
    area: 'Old Town',
    bio: 'Here to meet interesting people nearby — calm, casual, no pressure.',
    interests: ['Coffee', 'Live music', 'Running', 'Film'],
    instagram: '@kostnine',
    telegram: 't.me/kostnine',
    phone: '+370 *** ** 280',
    avatar: '',
  })

  // Visibility / privacy flags (all persisted on the profile).
  const showOnMap = ref(true)
  const allowMessages = ref(true)
  const contactsAfterApproval = ref(true)
  const approximateLocation = ref(true)
  const messagesFromNearby = ref(true)
  const messagesFromRequests = ref(true)

  const mono = computed(() => initials(profile.name))
  const gradient = 'linear-gradient(135deg, #8b7cf6, #ec7fb6)'

  function toggleVisible() {
    showOnMap.value = !showOnMap.value
    persistProfile()
  }

  // ----- Edit draft -----
  const draft = reactive({
    name: '',
    age: '',
    city: '',
    bio: '',
    interests: [],
    instagram: '',
    telegram: '',
    phone: '',
    avatar: '',
    showOnMap: true,
    allowMessages: true,
    contactsAfterApproval: true,
  })

  const draftMono = computed(() => initials(draft.name))

  function startEdit() {
    draft.name = profile.name
    draft.age = String(profile.age)
    draft.city = profile.city
    draft.bio = profile.bio
    draft.interests = [...profile.interests]
    draft.instagram = profile.instagram
    draft.telegram = profile.telegram
    draft.phone = profile.phone
    draft.avatar = profile.avatar
    draft.showOnMap = showOnMap.value
    draft.allowMessages = allowMessages.value
    draft.contactsAfterApproval = contactsAfterApproval.value
  }

  function saveEdit() {
    profile.name = draft.name.trim() || profile.name
    profile.age = Number(draft.age) || profile.age
    profile.city = draft.city.trim() || profile.city
    profile.cityShort = profile.city
    profile.bio = draft.bio
    profile.interests = [...draft.interests]
    profile.instagram = draft.instagram
    profile.telegram = draft.telegram
    profile.phone = draft.phone
    profile.avatar = draft.avatar
    showOnMap.value = draft.showOnMap
    allowMessages.value = draft.allowMessages
    contactsAfterApproval.value = draft.contactsAfterApproval
    // Persist to the backend optimistically (local commit already applied above).
    persistProfile()
  }

  // ----- Backend sync -----
  function applyProfile(data) {
    if (!data) return
    profile.name = data.name || profile.name
    profile.city = data.city || profile.city
    profile.cityShort = data.city || profile.cityShort
    profile.area = data.area || profile.area
    profile.bio = data.bio || profile.bio
    profile.instagram = data.instagram || ''
    profile.telegram = data.telegram || ''
    profile.phone = data.phone || ''
    profile.avatar = data.avatar_url || data.avatarUrl || ''
    showOnMap.value = data.show_on_map ?? data.showOnMap ?? showOnMap.value
    allowMessages.value = data.allow_messages ?? allowMessages.value
    contactsAfterApproval.value = data.contacts_after_approval ?? contactsAfterApproval.value
    approximateLocation.value = data.approximate_location ?? approximateLocation.value
    messagesFromNearby.value = data.messages_from_nearby ?? messagesFromNearby.value
    messagesFromRequests.value = data.messages_from_requests ?? messagesFromRequests.value
    if (typeof data.age === 'number') profile.age = data.age
    if (Array.isArray(data.interests)) profile.interests = data.interests
  }

  async function loadProfile() {
    applyProfile(await apiFetch('/profiles/me', { headers: authHeaders() }))
  }

  async function persistProfile() {
    try {
      applyProfile(
        await apiFetch('/profiles/me', {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({
            name: profile.name,
            bio: profile.bio,
            city: profile.city,
            area: profile.area,
            instagram: profile.instagram,
            telegram: profile.telegram,
            phone: profile.phone,
            avatarUrl: profile.avatar,
            showOnMap: showOnMap.value,
            allowMessages: allowMessages.value,
            contactsAfterApproval: contactsAfterApproval.value,
            approximateLocation: approximateLocation.value,
            messagesFromNearby: messagesFromNearby.value,
            messagesFromRequests: messagesFromRequests.value,
            age: Number(profile.age) || null,
            interests: profile.interests,
          }),
        }),
      )
    } catch {
      // Optimistic — the local edit stays even if the save fails (e.g. offline).
    }
  }

  function addDraftInterest(tag) {
    const value = String(tag || '').trim()
    if (value && !draft.interests.includes(value)) draft.interests.push(value)
  }
  function removeDraftInterest(tag) {
    draft.interests = draft.interests.filter((item) => item !== tag)
  }

  // ----- Avatar upload (reads to a data URL; wire to real storage later) -----
  async function setDraftAvatar(file) {
    try {
      draft.avatar = await readImageFile(file)
      return null
    } catch (error) {
      return error.message
    }
  }
  function clearDraftAvatar() {
    draft.avatar = ''
  }

  return {
    profile,
    showOnMap,
    allowMessages,
    contactsAfterApproval,
    approximateLocation,
    messagesFromNearby,
    messagesFromRequests,
    mono,
    gradient,
    draft,
    draftMono,
    toggleVisible,
    startEdit,
    saveEdit,
    addDraftInterest,
    removeDraftInterest,
    setDraftAvatar,
    clearDraftAvatar,
    loadProfile,
    persistProfile,
  }
})
