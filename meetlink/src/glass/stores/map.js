import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { apiFetch, authHeaders } from '../api'

/** Marker skins — colored gradient + matching blurred halo. */
const SKINS = {
  violet: { gradient: 'linear-gradient(135deg,#8b7cf6,#6d5de0)', halo: 'rgba(139,124,246,.5)' },
  pink: { gradient: 'linear-gradient(135deg,#f2749b,#ec7fb6)', halo: 'rgba(242,116,155,.5)' },
  blue: { gradient: 'linear-gradient(135deg,#5aa6f2,#3f86e0)', halo: 'rgba(90,166,242,.5)' },
  green: { gradient: 'linear-gradient(135deg,#3fbf95,#34b38a)', halo: 'rgba(63,191,149,.5)' },
  amber: { gradient: 'linear-gradient(135deg,#f5a65b,#ef8e3e)', halo: 'rgba(245,166,91,.5)' },
  teal: { gradient: 'linear-gradient(135deg,#56c7c0,#3fb0a8)', halo: 'rgba(86,199,192,.5)' },
}

/** Radius options (meters) and the px sizing of the two on-map radius circles. */
export const RADIUS_OPTIONS = [
  { meters: 500, label: '500 m', inner: 150, outer: 240 },
  { meters: 1000, label: '1 km', inner: 210, outer: 320 },
  { meters: 2000, label: '2 km', inner: 280, outer: 430 },
  { meters: 6000, label: 'City', inner: 320, outer: 480 },
]

// Anything beyond the close radii is treated as the city-wide view.
export const CITY_METERS = 6000

function mono(name) {
  return String(name || '?').trim().slice(0, 1).toUpperCase()
}

function distanceLabel(meters) {
  if (meters < 1000) return `${meters} m`
  return `${(meters / 1000).toFixed(1).replace(/\.0$/, '')} km`
}

// Map centre (Vilnius) — the YOU marker + radius rings anchor here.
export const MAP_CENTER = { lat: 54.6872, lng: 25.2797 }

// Offset a lat/lng by a distance (m) along a bearing (deg) — places markers on the real map.
function offsetLatLng(distM, bearingDeg) {
  const R = 6378137
  const d = distM / R
  const brng = (bearingDeg * Math.PI) / 180
  const lat1 = (MAP_CENTER.lat * Math.PI) / 180
  const lng1 = (MAP_CENTER.lng * Math.PI) / 180
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng),
  )
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    )
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI }
}

// Deterministic position from distance + index (stories aren't geo-positioned on the backend).
function storyLatLng(distanceM, index) {
  return offsetLatLng(distanceM, (index * 137.5) % 360)
}

function relativeTime(iso) {
  if (!iso) return 'recently'
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} h ago`
  const d = Math.round(hr / 24)
  return d === 1 ? 'yesterday' : `${d} days ago`
}

// Stories aren't geo-positioned on the backend; lay them out on the stylised map deterministically.
const LAYOUT = [
  { x: 32, y: 30, size: 50, distanceM: 240 },
  { x: 66, y: 28, size: 48, distanceM: 410 },
  { x: 74, y: 54, size: 46, distanceM: 680 },
  { x: 24, y: 56, size: 48, distanceM: 320 },
  { x: 42, y: 70, size: 50, distanceM: 150 },
  { x: 60, y: 68, size: 44, distanceM: 900 },
]
const SKIN_KEYS = ['violet', 'blue', 'pink', 'green', 'amber', 'teal']
const PLACE_LABEL = { approx: 'Approximate area', venue: 'Current venue', custom: 'Custom place' }

function mapServerStory(row, index) {
  const layout = LAYOUT[index % LAYOUT.length]
  const skin = SKINS[SKIN_KEYS[index % SKIN_KEYS.length]]
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    mono: mono(row.name),
    gradient: skin.gradient,
    halo: skin.halo,
    online: !!row.online,
    distanceM: layout.distanceM,
    dist: distanceLabel(layout.distanceM),
    place: row.place || '',
    posted: relativeTime(row.createdAt),
    text: row.text,
    image: row.image || null,
    avatar: row.avatar || null,
    size: layout.size,
    ...storyLatLng(layout.distanceM, index),
  }
}

/** Mock "stories nearby" — replace with real geo data + sockets later. */
const SEED_STORIES = [
  { id: 's1', name: 'Mara', age: 24, skin: 'violet', online: true, distanceM: 240, place: 'Lukiškės', posted: '12 min ago', x: 32, y: 30, size: 50, text: 'Reading by the window at this tiny coffee place — say hi if you’re around ☕' },
  { id: 's2', name: 'Davis', age: 29, skin: 'blue', online: true, distanceM: 410, place: 'Old Town', posted: '1 h ago', x: 66, y: 28, size: 48, text: 'Just landed in Vilnius for the week, looking for someone to show me the good ramen.' },
  { id: 's3', name: 'Ina', age: 22, skin: 'pink', online: false, distanceM: 680, place: 'Užupis', posted: '3 h ago', x: 74, y: 54, size: 46, text: 'Sketching by the river. Bring snacks.' },
  { id: 's4', name: 'Tomas', age: 31, skin: 'green', online: true, distanceM: 320, place: 'Cathedral Sq.', posted: '20 min ago', x: 24, y: 56, size: 48, text: 'Anyone up for a sunset run along the river in ~30 min?' },
  { id: 's5', name: 'Sofia', age: 26, skin: 'amber', online: true, distanceM: 150, place: 'Vokiečių', posted: '5 min ago', x: 42, y: 70, size: 50, text: 'At the bookshop on the corner, killing time before a film.' },
  { id: 's6', name: 'Luka', age: 27, skin: 'teal', online: false, distanceM: 900, place: 'Naujamiestis', posted: '2 h ago', x: 60, y: 68, size: 44, text: 'New in town, working from a café today — happy to chat.' },
]

export const useMapStore = defineStore('map', () => {
  const radius = ref(1000) // meters
  const view = ref('map') // 'map' | 'list'
  // Map centre — defaults to Vilnius, replaced by the device's real location when allowed.
  const center = ref({ lat: MAP_CENTER.lat, lng: MAP_CENTER.lng })
  const hiddenIds = ref([])
  const stories = ref(SEED_STORIES.map((s, i) => decorate(s, i)))
  const myStories = ref([])
  const hasMyStory = computed(() => myStories.value.length > 0)

  function decorate(story, index) {
    const skin = SKINS[story.skin] || SKINS.violet
    return {
      ...story,
      mono: mono(story.name),
      gradient: skin.gradient,
      halo: skin.halo,
      dist: distanceLabel(story.distanceM),
      size: story.size || 48,
      ...storyLatLng(story.distanceM, index),
    }
  }

  const radiusInfo = computed(
    () => RADIUS_OPTIONS.find((option) => option.meters === radius.value) || RADIUS_OPTIONS[1],
  )
  const radiusLabel = computed(() => radiusInfo.value.label)

  // Stories within the chosen radius (or everyone, in the city view) and not hidden.
  const visibleStories = computed(() =>
    stories.value.filter(
      (story) =>
        (radius.value >= CITY_METERS || story.distanceM <= radius.value) &&
        !hiddenIds.value.includes(story.id),
    ),
  )
  const nearbyCount = computed(() => visibleStories.value.length)

  function setRadius(meters) {
    radius.value = meters
  }

  function setView(next) {
    view.value = next
  }

  function setCenter(lat, lng) {
    if (typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      center.value = { lat, lng }
    }
  }

  function hideStory(id) {
    if (!hiddenIds.value.includes(id)) hiddenIds.value.push(id)
  }

  // Load nearby stories from the backend (everyone but you).
  async function load() {
    try {
      const [nearby, mine] = await Promise.all([
        apiFetch('/stories/nearby', { headers: authHeaders() }),
        apiFetch('/stories/mine', { headers: authHeaders() }),
      ])
      stories.value = nearby.map((row, index) => mapServerStory(row, index))
      myStories.value = mine.map((row, index) => mapServerStory(row, index))
    } catch {
      // keep seeded stories if the backend is unreachable
    }
  }

  // Publish a story from the post-story sheet.
  async function publishStory(form) {
    try {
      await apiFetch('/stories', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          text: form.text,
          place: PLACE_LABEL[form.location] || null,
          visibleFor: form.duration,
          whoCanMessage: form.who,
          imageUrl: form.image || null,
        }),
      })
      return true
    } catch {
      return false
    }
  }

  return {
    radius,
    view,
    center,
    stories,
    myStories,
    hasMyStory,
    hiddenIds,
    radiusInfo,
    radiusLabel,
    visibleStories,
    nearbyCount,
    setRadius,
    setView,
    setCenter,
    hideStory,
    load,
    publishStory,
  }
})
