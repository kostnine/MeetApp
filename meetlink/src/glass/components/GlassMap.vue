<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useMapStore, MAP_CENTER } from '../stores/map'
import { useMeStore } from '../stores/me'

const emit = defineEmits(['open-story', 'post-story', 'locate'])

const map = useMapStore()
const me = useMeStore()

const mapEl = ref(null)
let leaflet = null
let outerRing = null
let innerRing = null
const storyLayer = L.layerGroup()
const center = [MAP_CENTER.lat, MAP_CENTER.lng]

function youIcon() {
  return L.divIcon({
    className: 'lf-icon',
    html: '<div class="lf-you"><div class="lf-you__pulse"></div><div class="lf-you__dot"><span>YOU</span></div></div>',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  })
}

function storyIcon(story) {
  const size = story.size || 48
  const dot = story.online ? '<span class="lf-story__dot"></span>' : ''
  return L.divIcon({
    className: 'lf-icon',
    html: `<div class="lf-story"><span class="lf-story__halo" style="background:${story.halo}"></span><span class="lf-story__av"><span class="lf-story__g" style="background:${story.gradient}"><span class="lf-story__mono">${story.mono}</span></span>${dot}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function renderStories() {
  storyLayer.clearLayers()
  for (const story of map.visibleStories) {
    if (typeof story.lat !== 'number') continue
    L.marker([story.lat, story.lng], { icon: storyIcon(story), keyboard: false })
      .on('click', () => emit('open-story', story))
      .addTo(storyLayer)
  }
}

function applyRadius(fit = true) {
  const meters = map.radius
  if (outerRing) outerRing.setRadius(meters)
  if (innerRing) innerRing.setRadius(meters / 2)
  if (fit && leaflet && outerRing) {
    leaflet.fitBounds(outerRing.getBounds(), { padding: [40, 40], animate: true })
  }
}

function recenter() {
  if (leaflet) leaflet.setView(center, leaflet.getZoom(), { animate: true })
  applyRadius(true)
  emit('locate')
}

onMounted(() => {
  leaflet = L.map(mapEl.value, {
    center,
    zoom: 15,
    zoomControl: false,
    attributionControl: true,
  })

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 20,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  }).addTo(leaflet)

  outerRing = L.circle(center, {
    radius: map.radius,
    color: '#8b7cf6',
    weight: 1,
    opacity: 0.4,
    dashArray: '4 5',
    fill: false,
    interactive: false,
  }).addTo(leaflet)

  innerRing = L.circle(center, {
    radius: map.radius / 2,
    color: '#8b7cf6',
    weight: 1,
    opacity: 0.5,
    fillColor: '#8b7cf6',
    fillOpacity: 0.07,
    interactive: false,
  }).addTo(leaflet)

  L.marker(center, { icon: youIcon(), interactive: false, zIndexOffset: 1000 }).addTo(leaflet)
  storyLayer.addTo(leaflet)

  renderStories()
  applyRadius(true)

  // Ensure tiles fill once the container has its final size.
  setTimeout(() => leaflet && leaflet.invalidateSize(), 200)
})

onBeforeUnmount(() => {
  if (leaflet) {
    leaflet.remove()
    leaflet = null
  }
})

watch(() => map.radius, () => applyRadius(true))
watch(() => map.visibleStories, renderStories, { deep: true })
</script>

<template>
  <div class="map-canvas">
    <div ref="mapEl" class="map-leaflet" />

    <!-- Bottom-left: approximate-area pill -->
    <div class="approx-pill">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" stroke="#9c7cd6" stroke-width="2" />
        <path d="M12 8v5" stroke="#9c7cd6" stroke-width="2" stroke-linecap="round" />
        <circle cx="12" cy="16.5" r="1" fill="#9c7cd6" />
      </svg>
      Approximate area · {{ map.radiusLabel }} zone
    </div>

    <!-- Bottom-right: my location -->
    <div class="map-controls">
      <button type="button" class="locate-btn" title="My location" @click="recenter">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3.4" stroke="#5a4f9e" stroke-width="2" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#5a4f9e" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <!-- Hidden-from-map overlay -->
    <div v-if="!me.showOnMap" class="hidden-overlay">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
        <path d="M3 3l18 18" stroke="#8b7cf6" stroke-width="2" stroke-linecap="round" />
        <path
          d="M10.6 6.2A9 9 0 0 1 21 12s-1 2-2.7 3.6M6.3 7.6A12 12 0 0 0 3 12s3.5 6 9 6a8.7 8.7 0 0 0 3.3-.7"
          stroke="#8b7cf6"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <div class="hidden-title">You're hidden from the map</div>
      <div class="hidden-sub">No one nearby can see you right now.</div>
      <button type="button" class="primary-btn hidden-cta" @click="me.toggleVisible()">Go visible</button>
    </div>

    <!-- Centered Post story button -->
    <div class="post-row">
      <button type="button" class="primary-btn post-btn" @click="emit('post-story')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="#fff" stroke-width="2.4" stroke-linecap="round" />
        </svg>
        Post story
      </button>
    </div>
  </div>
</template>

<style scoped>
.map-canvas {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: clamp(420px, 60vh, 640px);
  border-radius: 26px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow: 0 16px 44px rgba(96, 73, 168, 0.14);
}
.map-leaflet {
  position: absolute;
  inset: 0;
  z-index: 0;
}

/* Pills + controls (above the map) */
.approx-pill {
  position: absolute;
  left: 14px;
  bottom: 14px;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 999px;
  padding: 7px 13px;
  color: #6b6385;
  font-size: 11.5px;
  font-weight: 700;
  box-shadow: 0 6px 18px rgba(96, 73, 168, 0.12);
}
.map-controls {
  position: absolute;
  right: 14px;
  bottom: 40px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.locate-btn {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(96, 73, 168, 0.14);
}

.primary-btn {
  border: none;
  cursor: pointer;
  border-radius: 16px;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 14px;
  color: #fff;
  background: var(--ml-accent-gradient);
  box-shadow: 0 12px 28px rgba(139, 124, 246, 0.45);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.post-row {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 5;
  display: flex;
  gap: 10px;
  justify-content: center;
  padding: 0 14px 14px;
  pointer-events: none;
}
.post-btn {
  pointer-events: auto;
  flex: 1;
  max-width: 210px;
  padding: 14px 0;
}

/* Hidden overlay */
.hidden-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: rgba(244, 239, 251, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 30px;
}
.hidden-title {
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 19px;
  margin-top: 14px;
  color: var(--ml-ink-1);
}
.hidden-sub {
  font-size: 13.5px;
  color: #7c7493;
  margin-top: 6px;
  max-width: 260px;
  line-height: 1.5;
}
.hidden-cta {
  margin-top: 18px;
  padding: 12px 24px;
  border-radius: 14px;
  box-shadow: 0 10px 24px rgba(139, 124, 246, 0.4);
}
</style>
