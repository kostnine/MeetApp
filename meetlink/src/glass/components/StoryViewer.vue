<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { X, MoreHorizontal, Send } from '@lucide/vue'
import { useUiStore } from '../stores/ui'
import { useChatsStore } from '../stores/chats'
import { useMapStore } from '../stores/map'
import MeAvatar from './MeAvatar.vue'

const ui = useUiStore()
const chats = useChatsStore()
const map = useMapStore()
const router = useRouter()

const DURATION = 5000
const HOLD_MS = 180 // press longer than this = hold-to-pause, shorter = tap
const CLOSE_DRAG = 120 // px dragged down to dismiss

const menuOpen = ref(false)
const paused = ref(false)
const dragY = ref(0)

const story = computed(() => ui.storyList[ui.storyIndex] || null)
const statusText = computed(() => (story.value?.online ? 'Online now' : 'Last seen recently'))

// ---- timing: pausable auto-advance ----
let timer = null
let startedAt = 0
let elapsed = 0

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}
function startSegment(fromElapsed = 0) {
  clearTimer()
  elapsed = fromElapsed
  startedAt = Date.now()
  timer = setTimeout(() => ui.storyNext(), Math.max(0, DURATION - elapsed))
}
function pause() {
  if (paused.value) return
  paused.value = true
  clearTimer()
  elapsed += Date.now() - startedAt
}
function resume() {
  if (!paused.value) return
  paused.value = false
  startSegment(elapsed)
}

onMounted(() => startSegment(0))
onBeforeUnmount(clearTimer)
watch(
  () => ui.storyIndex,
  () => {
    menuOpen.value = false
    paused.value = false
    dragY.value = 0
    startSegment(0)
  },
)

// ---- pointer gestures: tap zones, hold-to-pause, swipe-down-to-close ----
let pointer = null
let holdTimer = null

function onPointerDown(event) {
  try {
    event.currentTarget.setPointerCapture?.(event.pointerId)
  } catch {
    /* synthetic / already-released pointer */
  }
  pointer = { x0: event.clientX, y0: event.clientY, t0: Date.now(), dragging: false, hold: false }
  holdTimer = setTimeout(() => {
    if (pointer && !pointer.dragging) {
      pointer.hold = true
      pause()
    }
  }, HOLD_MS)
}
function onPointerMove(event) {
  if (!pointer) return
  const dx = event.clientX - pointer.x0
  const dy = event.clientY - pointer.y0
  if (!pointer.dragging && dy > 10 && dy > Math.abs(dx)) {
    pointer.dragging = true
    clearTimeout(holdTimer)
    pause()
  }
  if (pointer.dragging) dragY.value = Math.max(0, dy)
}
function onPointerUp() {
  clearTimeout(holdTimer)
  if (!pointer) return
  const { x0, t0, dragging, hold } = pointer
  pointer = null

  if (dragging) {
    if (dragY.value > CLOSE_DRAG) {
      close()
      return
    }
    dragY.value = 0 // snap back
    resume()
    return
  }
  if (hold) {
    resume()
    return
  }
  // a quick tap — dismiss the menu if open, else navigate by side
  if (menuOpen.value) {
    menuOpen.value = false
    resume()
    return
  }
  if (x0 < window.innerWidth * 0.32) ui.storyPrev()
  else ui.storyNext()
}
function onPointerCancel() {
  clearTimeout(holdTimer)
  pointer = null
  dragY.value = 0
  resume()
}

const stageStyle = computed(() =>
  dragY.value
    ? {
        transform: `translateY(${dragY.value}px) scale(${Math.max(0.9, 1 - dragY.value / 1500)})`,
        borderRadius: '26px',
        transition: 'none',
      }
    : { transition: 'transform 0.26s ease, border-radius 0.26s ease' },
)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
  if (menuOpen.value) pause()
  else resume()
}

function close() {
  ui.closeStoryViewer()
}
function message() {
  const current = story.value
  ui.closeStoryViewer()
  chats.startFromStory(current)
  router.push('/chats')
}
function viewProfile() {
  menuOpen.value = false
  ui.showToast('Profile — coming soon')
}
function report() {
  menuOpen.value = false
  ui.showToast('Reported')
}
function hide() {
  const current = story.value
  menuOpen.value = false
  ui.closeStoryViewer()
  map.hideStory(current.id)
  ui.showToast('Hidden from your map')
}
</script>

<template>
  <div v-if="story" class="sv" :style="stageStyle">
    <div class="sv-media" :style="{ background: story.image ? '#15101f' : story.gradient }">
      <img v-if="story.image" :src="story.image" class="sv-img" alt="" />
    </div>
    <div class="sv-scrim" />

    <!-- gesture layer: tap sides to navigate, hold to pause, drag down to close -->
    <div
      class="sv-interact"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
    />

    <!-- top: progress bars + header -->
    <div class="sv-top">
      <div class="sv-bars">
        <div v-for="(s, i) in ui.storyList" :key="i" class="sv-bar">
          <span
            :key="i + ':' + ui.storyIndex"
            class="sv-bar-fill"
            :class="{ full: i < ui.storyIndex, active: i === ui.storyIndex }"
            :style="
              i === ui.storyIndex
                ? { animationDuration: DURATION + 'ms', animationPlayState: paused ? 'paused' : 'running' }
                : null
            "
          />
        </div>
      </div>

      <div class="sv-head">
        <span class="sv-avatar">
          <MeAvatar :avatar="story.avatar" :mono="story.mono" :gradient="story.gradient" />
        </span>
        <div class="sv-id">
          <div class="sv-name">
            {{ story.name }} <span v-if="story.age" class="sv-age">{{ story.age }}</span>
          </div>
          <div class="sv-time">{{ story.posted }} · {{ statusText }}</div>
        </div>
        <button v-if="!ui.storyMine" type="button" class="sv-icon" aria-label="More" @click.stop="toggleMenu">
          <MoreHorizontal :size="20" />
        </button>
        <button type="button" class="sv-icon" aria-label="Close" @click.stop="close">
          <X :size="20" />
        </button>
        <div v-if="menuOpen" class="sv-menu" @click.stop>
          <button type="button" @click="viewProfile">View profile</button>
          <button type="button" @click="report">Report</button>
          <button type="button" @click="hide">Hide this user</button>
        </div>
      </div>
    </div>

    <!-- bottom: place/text + message -->
    <div class="sv-bottom">
      <div class="sv-info">
        <span v-if="story.place" class="sv-place">{{ story.place }}</span>
        <p v-if="story.text" class="sv-story-text">{{ story.text }}</p>
      </div>
      <button v-if="!ui.storyMine" type="button" class="sv-message" @click.stop="message">
        <Send :size="17" /> Message
      </button>
    </div>
  </div>
</template>

<style scoped>
.sv {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  height: 100vh;
  height: 100dvh; /* use the visible viewport so the footer/Message never sits below the fold */
  z-index: 220;
  background: #15101f;
  overflow: hidden;
  user-select: none;
  touch-action: none;
}
.sv-media {
  position: absolute;
  inset: 0;
}
.sv-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.sv-scrim {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(rgba(0, 0, 0, 0.45), transparent 22%),
    linear-gradient(transparent 60%, rgba(0, 0, 0, 0.55));
}

/* gesture layer sits over the media but below the header/footer controls */
.sv-interact {
  position: absolute;
  inset: 0;
  z-index: 1;
  touch-action: none;
  cursor: pointer;
}

/* top */
.sv-top {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  z-index: 3;
  padding: 10px 14px 0;
}
.sv-bars {
  display: flex;
  gap: 4px;
}
.sv-bar {
  flex: 1;
  height: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.3);
  overflow: hidden;
}
.sv-bar-fill {
  display: block;
  height: 100%;
  width: 0;
  background: #fff;
  border-radius: 999px;
}
.sv-bar-fill.full {
  width: 100%;
}
.sv-bar-fill.active {
  animation: mlStoryProgress linear forwards;
}
.sv-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  margin-top: 14px;
}
.sv-avatar {
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  font-size: 16px;
}
.sv-id {
  flex: 1;
  min-width: 0;
}
.sv-name {
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 16px;
  color: #fff;
}
.sv-age {
  font-weight: 400;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}
.sv-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
  margin-top: 1px;
}
.sv-icon {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: none;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.sv-menu {
  position: absolute;
  top: 42px;
  right: 0;
  min-width: 160px;
  display: flex;
  flex-direction: column;
  padding: 6px;
  border-radius: 14px;
  background: rgba(30, 24, 46, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.4);
}
.sv-menu button {
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  padding: 10px 12px;
  border-radius: 10px;
  font-family: var(--ml-font-body);
  font-size: 14px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
}
.sv-menu button:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* bottom */
.sv-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  padding: 0 18px calc(24px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sv-info {
  text-wrap: pretty;
}
.sv-place {
  display: inline-flex;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 11px;
  border-radius: 999px;
}
.sv-story-text {
  margin: 10px 0 0;
  font-size: 16px;
  line-height: 1.45;
  color: #fff;
  font-weight: 500;
}
.sv-message {
  align-self: flex-start;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--ml-accent-gradient);
  color: #fff;
  border-radius: 14px;
  padding: 13px 22px;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 14.5px;
  box-shadow: 0 10px 24px rgba(139, 124, 246, 0.45);
}
</style>
