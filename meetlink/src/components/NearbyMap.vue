<script setup>
import { computed } from 'vue'
import { Shield } from '@lucide/vue'
import { useMeetStore } from '../stores/meet'

const store = useMeetStore()

// Map the store's legacy bright colors onto the reference mockup palette.
const PALETTE = {
  '#37b7f5': { gradient: 'linear-gradient(135deg,#5E8BBF,#46689E)', halo: 'rgba(94,139,191,.55)' },
  '#708dff': { gradient: 'linear-gradient(135deg,#8576C4,#6B5DB0)', halo: 'rgba(133,118,196,.6)' },
  '#55dfd2': { gradient: 'linear-gradient(135deg,#6FA39A,#4E7D77)', halo: 'rgba(111,163,154,.55)' },
  '#ff5ca8': { gradient: 'linear-gradient(135deg,#A86F9C,#7C5184)', halo: 'rgba(168,111,156,.55)' },
  '#ffd84d': { gradient: 'linear-gradient(135deg,#7B7790,#585469)', halo: 'rgba(123,119,144,.55)' },
}
const FALLBACK = { gradient: 'linear-gradient(135deg,#8576C4,#6B5DB0)', halo: 'rgba(133,118,196,.6)' }

function initial(value) {
  return String(value || '?').slice(0, 1).toUpperCase()
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

const markers = computed(() =>
  store.visibleNearbyUsers.map((user, index) => {
    const skin = PALETTE[String(user.color)] || FALLBACK
    return {
      id: user.id,
      mono: initial(user.name),
      x: clamp(Number(user.x) || 28 + index * 13, 13, 87),
      y: clamp(Number(user.y) || 30 + index * 10, 16, 84),
      gradient: skin.gradient,
      halo: skin.halo,
      online: /онлайн|online/i.test(String(user.status || '')),
      active: store.activeUser?.id === user.id,
      user,
    }
  }),
)

function open(marker) {
  store.setActiveUser(marker.user)
}
</script>

<template>
  <div class="geo-note map-privacy-banner">
    <Shield :size="17" />
    Геолокация включается только после разрешения. Точки на карте примерные, не точные.
  </div>

  <div class="radar-shell">
    <div class="radar-grid" aria-hidden="true"></div>
    <div class="radar-street radar-street-a" aria-hidden="true"></div>
    <div class="radar-street radar-street-b" aria-hidden="true"></div>

    <div class="radar-ring radar-ring-outer" aria-hidden="true"></div>
    <div class="radar-ring radar-ring-inner" aria-hidden="true"></div>
    <div class="radar-pulse" aria-hidden="true"></div>

    <div class="radar-you" aria-hidden="true"><span>Вы</span></div>

    <button
      v-for="m in markers"
      :key="m.id"
      type="button"
      class="radar-marker"
      :class="{ active: m.active }"
      :style="{ left: m.x + '%', top: m.y + '%' }"
      :aria-label="`Показать ${m.user.name}`"
      @click="open(m)"
    >
      <span class="radar-halo" :style="{ background: m.halo }"></span>
      <span class="radar-dot" :style="{ background: m.gradient }">
        <span class="radar-mono">{{ m.mono }}</span>
        <i v-if="m.online" class="radar-online"></i>
      </span>
    </button>

    <div class="radar-approx" aria-hidden="true">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" stroke="currentColor" stroke-width="2" />
        <path d="M12 8v5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        <circle cx="12" cy="16.5" r="1" fill="currentColor" />
      </svg>
      Примерная зона · {{ store.profile.radius }} м
    </div>

    <div class="radar-count" aria-hidden="true">
      <strong>{{ store.visibleNearbyUsers.length }}</strong> рядом сейчас
    </div>

    <div v-if="!store.currentLocation" class="radar-empty">
      Включи геолокацию, чтобы найти людей рядом
    </div>
  </div>
</template>

<style scoped>
.map-privacy-banner {
  margin-bottom: 0;
}

.radar-shell {
  position: relative;
  width: 100%;
  min-height: clamp(420px, 56vh, 560px);
  margin-top: 14px;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: radial-gradient(120% 90% at 50% 42%, #1b1930 0%, #13121c 60%, #0c0b12 100%);
}

.radar-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 46px 46px;
}

.radar-street {
  position: absolute;
  background: rgba(255, 255, 255, 0.035);
}
.radar-street-a {
  left: -12%;
  top: 44%;
  width: 130%;
  height: 30px;
  transform: rotate(-13deg);
}
.radar-street-b {
  left: 52%;
  top: -16%;
  width: 30px;
  height: 135%;
  transform: rotate(20deg);
}

.radar-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 999px;
  transform: translate(-50%, -50%);
}
.radar-ring-outer {
  width: 300px;
  height: 300px;
  border: 1px dashed rgba(149, 118, 196, 0.28);
}
.radar-ring-inner {
  width: 180px;
  height: 180px;
  border: 1px solid rgba(149, 118, 196, 0.4);
  background: rgba(133, 118, 196, 0.06);
}

.radar-pulse {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 130px;
  height: 130px;
  border-radius: 999px;
  border: 1px solid rgba(133, 118, 196, 0.5);
  transform: translate(-50%, -50%);
  animation: radarPulse 3s ease-out infinite;
}
@keyframes radarPulse {
  0% {
    transform: translate(-50%, -50%) scale(0.6);
    opacity: 0.5;
  }
  100% {
    transform: translate(-50%, -50%) scale(2.6);
    opacity: 0;
  }
}

.radar-you {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 46px;
  height: 46px;
  border-radius: 999px;
  background: #8576c4;
  border: 3px solid rgba(255, 255, 255, 0.85);
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
}
.radar-you span {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.3px;
}

.radar-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  border: none;
  background: none;
  cursor: pointer;
  z-index: 4;
  padding: 0;
}
.radar-halo {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 54px;
  height: 54px;
  border-radius: 999px;
  filter: blur(7px);
  transform: translate(-50%, -50%);
}
.radar-dot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 5px 14px rgba(0, 0, 0, 0.5);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease;
}
.radar-marker:hover .radar-dot {
  transform: scale(1.06);
}
.radar-marker.active .radar-dot {
  border-color: rgba(255, 255, 255, 0.9);
  transform: scale(1.1);
}
.radar-mono {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 15px;
  color: #fff;
}
.radar-online {
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: #6fb6a9;
  border: 2.5px solid #13121c;
}

.radar-approx,
.radar-count {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: rgba(12, 11, 18, 0.72);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 11.5px;
  font-weight: 600;
}
.radar-approx {
  left: 14px;
  bottom: 14px;
  color: #b6b0cc;
}
.radar-count {
  right: 14px;
  top: 14px;
  color: #c9c4da;
}
.radar-count strong {
  font-family: 'Space Grotesk', sans-serif;
  color: #fff;
}

.radar-empty {
  position: absolute;
  left: 50%;
  top: 63%;
  transform: translate(-50%, 0);
  max-width: 220px;
  text-align: center;
  background: rgba(12, 11, 18, 0.78);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 12px 16px;
  color: #c9c4da;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  z-index: 5;
}

@media (prefers-reduced-motion: reduce) {
  .radar-pulse {
    animation: none;
  }
}
</style>
