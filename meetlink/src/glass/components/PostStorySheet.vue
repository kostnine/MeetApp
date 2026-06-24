<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Image as ImageIcon, Camera, X } from '@lucide/vue'
import { useUiStore } from '../stores/ui'
import { useMapStore } from '../stores/map'

const ui = useUiStore()
const map = useMapStore()

// Transient draft. The component stays mounted, so reset it each time the sheet opens.
const form = reactive({
  text: '',
  location: 'approx',
  duration: '1h',
  who: 'everyone',
  image: '',
})

const fileInput = ref(null)
const cameraInput = ref(null)

// Drag the grabber/header down to dismiss the sheet.
const dragY = ref(0)
const interacted = ref(false)
let dragStartY = 0
let dragging = false

const sheetStyle = computed(() => {
  if (dragY.value) {
    return { animation: 'none', transform: `translateY(${dragY.value}px)`, transition: 'none' }
  }
  if (interacted.value) {
    return { animation: 'none', transform: 'translateY(0)', transition: 'transform 0.25s ease' }
  }
  return null
})

function onDragStart(event) {
  dragStartY = event.clientY
  dragging = true
  interacted.value = true
  try {
    event.currentTarget.setPointerCapture?.(event.pointerId)
  } catch {
    /* synthetic pointer */
  }
}
function onDragMove(event) {
  if (!dragging) return
  dragY.value = Math.max(0, event.clientY - dragStartY)
}
function onDragEnd() {
  if (!dragging) return
  dragging = false
  if (dragY.value > 120) {
    ui.closePostStory()
  }
  dragY.value = 0
}

function resetForm() {
  interacted.value = false
  dragY.value = 0
  form.text = ''
  form.location = 'approx'
  form.duration = '1h'
  form.who = 'everyone'
  form.image = ''
}

function takePhoto() {
  cameraInput.value?.click()
}
function pickPhoto() {
  fileInput.value?.click()
}
function onFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (!file.type?.startsWith('image/')) {
    ui.showToast('Please choose an image file')
    return
  }
  if (file.size > 25_000_000) {
    ui.showToast('That image is too large')
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    const src = String(reader.result || '')
    // Downscale + recompress so a full-res phone photo doesn't exceed the API limit.
    const img = new Image()
    img.onload = () => {
      const max = 1280
      let w = img.width
      let h = img.height
      if (Math.max(w, h) > max) {
        const scale = max / Math.max(w, h)
        w = Math.round(w * scale)
        h = Math.round(h * scale)
      }
      try {
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        form.image = canvas.toDataURL('image/jpeg', 0.82)
      } catch {
        form.image = src // canvas failed — fall back to the original
      }
    }
    img.onerror = () => {
      form.image = src // undecodable (e.g. some HEIC) — send the original
    }
    img.src = src
  }
  reader.readAsDataURL(file)
}
function removePhoto() {
  form.image = ''
}

watch(
  () => ui.showPostStory,
  (open) => {
    if (open) resetForm()
  },
)

const locModes = [
  { key: 'approx', label: 'Approximate area' },
  { key: 'venue', label: 'Current venue' },
  { key: 'custom', label: 'Custom place' },
]
const durOpts = [
  { key: '30m', label: '30 min' },
  { key: '1h', label: '1 hour' },
  { key: '3h', label: '3 hours' },
  { key: 'forever', label: 'Until I remove it' },
]
const whoOpts = [
  { key: 'everyone', label: 'Everyone nearby' },
  { key: 'registered', label: 'Registered only' },
  { key: 'nobody', label: 'Nobody, just show' },
]

async function publish() {
  if (!form.text.trim() && !form.image) {
    ui.showToast('Add a photo or write something first')
    return
  }
  const ok = await map.publishStory(form)
  if (!ok) {
    ui.showToast('Could not post your story — please try again')
    return
  }
  await map.load() // refresh so my new story shows up (avatar ring + "view my story")
  ui.closePostStory()
  ui.showToast('Story posted — you’re live on the map')
}
</script>

<template>
  <div v-if="ui.showPostStory" class="post-scrim" @click="ui.closePostStory()">
    <div class="post-sheet" :style="sheetStyle" @click.stop>
      <div
        class="post-drag"
        @pointerdown="onDragStart"
        @pointermove="onDragMove"
        @pointerup="onDragEnd"
        @pointercancel="onDragEnd"
      >
        <div class="grabber" />
        <div class="post-head">
          <div class="post-title">Post a story</div>
          <div class="post-sub">Snap a photo or drop a note. It disappears when it expires.</div>
        </div>
      </div>

      <div class="post-body ml-scroll">
        <!-- Photo first (Instagram-style): take a photo or upload one -->
        <input
          ref="cameraInput"
          type="file"
          accept="image/*"
          capture="environment"
          class="file-input"
          @change="onFile"
        />
        <input ref="fileInput" type="file" accept="image/*" class="file-input" @change="onFile" />

        <div v-if="!form.image" class="photo-pick">
          <button type="button" class="photo-btn photo-btn--cam" @click="takePhoto">
            <Camera :size="22" />
            <span>Take photo</span>
          </button>
          <button type="button" class="photo-btn" @click="pickPhoto">
            <ImageIcon :size="22" />
            <span>Upload</span>
          </button>
        </div>
        <div v-else class="photo-preview">
          <img :src="form.image" alt="Story photo" />
          <button type="button" class="photo-remove" aria-label="Remove photo" @click="removePhoto">
            <X :size="16" />
          </button>
        </div>

        <textarea
          v-model="form.text"
          class="post-textarea"
          placeholder="Add a caption — “sitting in this bar, come say hi…”"
        />

        <div class="field-label">LOCATION</div>
        <div class="chip-group">
          <button
            v-for="o in locModes"
            :key="o.key"
            type="button"
            class="chip"
            :class="{ 'chip--active': form.location === o.key }"
            @click="form.location = o.key"
          >
            {{ o.label }}
          </button>
        </div>

        <div class="field-label">VISIBLE FOR</div>
        <div class="chip-group">
          <button
            v-for="o in durOpts"
            :key="o.key"
            type="button"
            class="chip"
            :class="{ 'chip--active': form.duration === o.key }"
            @click="form.duration = o.key"
          >
            {{ o.label }}
          </button>
        </div>

        <div class="field-label">WHO CAN MESSAGE</div>
        <div class="chip-group">
          <button
            v-for="o in whoOpts"
            :key="o.key"
            type="button"
            class="chip"
            :class="{ 'chip--active': form.who === o.key }"
            @click="form.who = o.key"
          >
            {{ o.label }}
          </button>
        </div>
      </div>

      <div class="post-footer">
        <button type="button" class="publish-btn" @click="publish">Publish story</button>
        <button type="button" class="cancel-btn" @click="ui.closePostStory()">Cancel</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.post-scrim {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  height: 100vh;
  height: 100dvh; /* pin to the *visible* viewport on mobile, not the taller layout one */
  z-index: 150;
  background: rgba(60, 46, 110, 0.3);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.post-sheet {
  width: 100%;
  max-width: 480px;
  max-height: 92vh;
  max-height: 92dvh;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(34px) saturate(160%);
  -webkit-backdrop-filter: blur(34px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-bottom: none;
  border-radius: 30px 30px 0 0;
  padding: 14px 22px 0;
  box-shadow: 0 -20px 50px rgba(96, 73, 168, 0.22);
  transform-origin: bottom center;
  animation: mlSheetPop 0.36s cubic-bezier(0.2, 0.9, 0.25, 1) both;
}
.post-drag {
  flex: none;
  touch-action: none;
  cursor: grab;
  padding-top: 4px;
}
.post-drag:active {
  cursor: grabbing;
}
.grabber {
  width: 44px;
  height: 5px;
  border-radius: 999px;
  background: rgba(90, 70, 150, 0.28);
  margin: 0 auto 14px;
}
.post-head {
  flex: none;
}
.post-title {
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 22px;
  letter-spacing: -0.5px;
  color: var(--ml-ink-1);
}
.post-sub {
  font-size: 13px;
  color: #7c7493;
  margin-top: 3px;
}

/* Scrollable middle so the footer stays put on small phones. */
.post-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px 0 6px;
}

.file-input {
  display: none;
}
.photo-pick {
  display: flex;
  gap: 10px;
}
.photo-btn {
  flex: 1;
  height: 88px;
  border-radius: 16px;
  border: 1px dashed rgba(139, 124, 246, 0.45);
  background: rgba(255, 255, 255, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  color: #8b83a0;
}
.photo-btn span {
  font-size: 13px;
  font-weight: 700;
}
.photo-btn--cam {
  border-style: solid;
  border-color: rgba(139, 124, 246, 0.5);
  background: rgba(139, 124, 246, 0.12);
  color: var(--ml-accent-ink);
}
.photo-preview {
  position: relative;
  width: 100%;
  height: 240px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.8);
}
.photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.photo-remove {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 999px;
  background: rgba(42, 35, 66, 0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.post-textarea {
  width: 100%;
  min-height: 84px;
  resize: none;
  margin-top: 12px;
  border: 1px solid rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.6);
  border-radius: 16px;
  padding: 15px;
  color: var(--ml-ink-1);
  font-family: var(--ml-font-body);
  font-size: 15.5px;
  line-height: 1.5;
  outline: none;
}
.field-label {
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--ml-eyebrow);
  margin: 18px 0 9px;
}
.chip-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.chip {
  border: 1px solid rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.55);
  color: #6b6385;
  border-radius: 12px;
  padding: 10px 15px;
  cursor: pointer;
  font-family: var(--ml-font-body);
  font-size: 13px;
  font-weight: 700;
  transition:
    background 0.16s ease,
    color 0.16s ease,
    border-color 0.16s ease;
}
.chip--active {
  border-color: rgba(139, 124, 246, 0.5);
  background: rgba(139, 124, 246, 0.14);
  color: var(--ml-accent-ink);
}

/* Pinned footer — Publish is always reachable, never scrolls off-screen. */
.post-footer {
  flex: none;
  padding: 12px 0 calc(16px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(120, 100, 180, 0.12);
  background: linear-gradient(to top, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0));
}
.publish-btn {
  width: 100%;
  border: none;
  cursor: pointer;
  background: var(--ml-accent-gradient);
  color: #fff;
  border-radius: 16px;
  padding: 16px 0;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 15.5px;
  box-shadow: 0 12px 28px rgba(139, 124, 246, 0.42);
}
.cancel-btn {
  width: 100%;
  margin-top: 8px;
  border: none;
  background: none;
  color: #8b83a0;
  cursor: pointer;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 13px;
  padding: 6px;
}
</style>
