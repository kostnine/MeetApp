<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Check, Minus, Plus, RotateCcw, X } from '@lucide/vue'

defineProps({
  source: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['cancel', 'save'])
const cropArea = ref(null)
const image = ref(null)
const imageSize = ref({ width: 1, height: 1 })
const cropSize = ref(320)
const zoom = ref(1)
const offset = ref({ x: 0, y: 0 })
const dragging = ref(false)
const pointerStart = ref({ x: 0, y: 0, offsetX: 0, offsetY: 0 })

const baseScale = computed(() =>
  Math.max(cropSize.value / imageSize.value.width, cropSize.value / imageSize.value.height),
)
const renderedSize = computed(() => ({
  width: imageSize.value.width * baseScale.value * zoom.value,
  height: imageSize.value.height * baseScale.value * zoom.value,
}))
const imageStyle = computed(() => ({
  width: `${renderedSize.value.width}px`,
  height: `${renderedSize.value.height}px`,
  transform: `translate3d(${offset.value.x}px, ${offset.value.y}px, 0)`,
}))

function measureCrop() {
  if (!cropArea.value) return
  cropSize.value = cropArea.value.getBoundingClientRect().width
  clampOffset()
}

function clampOffset() {
  const limitX = Math.max(0, (renderedSize.value.width - cropSize.value) / 2)
  const limitY = Math.max(0, (renderedSize.value.height - cropSize.value) / 2)
  offset.value = {
    x: Math.min(limitX, Math.max(-limitX, offset.value.x)),
    y: Math.min(limitY, Math.max(-limitY, offset.value.y)),
  }
}

function resetCrop() {
  zoom.value = 1
  offset.value = { x: 0, y: 0 }
}

function setZoom(value) {
  zoom.value = Math.min(3, Math.max(1, Number(value)))
  nextTick(clampOffset)
}

function startDrag(event) {
  event.currentTarget.setPointerCapture?.(event.pointerId)
  dragging.value = true
  pointerStart.value = {
    x: event.clientX,
    y: event.clientY,
    offsetX: offset.value.x,
    offsetY: offset.value.y,
  }
}

function moveImage(event) {
  if (!dragging.value) return
  offset.value = {
    x: pointerStart.value.offsetX + event.clientX - pointerStart.value.x,
    y: pointerStart.value.offsetY + event.clientY - pointerStart.value.y,
  }
  clampOffset()
}

function stopDrag() {
  dragging.value = false
}

function handleWheel(event) {
  setZoom(zoom.value + (event.deltaY < 0 ? 0.1 : -0.1))
}

function loadImage() {
  imageSize.value = { width: image.value.naturalWidth, height: image.value.naturalHeight }
  resetCrop()
}

function saveCrop() {
  if (!image.value) return
  const outputSize = 640
  const ratio = outputSize / cropSize.value
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const context = canvas.getContext('2d')
  const x = (cropSize.value - renderedSize.value.width) / 2 + offset.value.x
  const y = (cropSize.value - renderedSize.value.height) / 2 + offset.value.y

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(
    image.value,
    x * ratio,
    y * ratio,
    renderedSize.value.width * ratio,
    renderedSize.value.height * ratio,
  )
  emit('save', canvas.toDataURL('image/jpeg', 0.88))
}

function handleKeydown(event) {
  if (event.key === 'Escape') emit('cancel')
}

watch(zoom, clampOffset)
onMounted(() => {
  measureCrop()
  window.addEventListener('resize', measureCrop)
  window.addEventListener('keydown', handleKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', measureCrop)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div class="crop-modal-backdrop" @mousedown.self="emit('cancel')">
      <section
        v-motion
        :initial="{ opacity: 0, y: 24, scale: 0.97 }"
        :enter="{ opacity: 1, y: 0, scale: 1 }"
        class="crop-modal crop-modal-fullscreen"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-title"
      >
        <header class="crop-modal-head">
          <div>
            <p class="eyebrow">Фото профиля</p>
            <h2 id="crop-title">Настрой кадр</h2>
          </div>
          <button class="ghost-button" type="button" aria-label="Закрыть" @click="emit('cancel')">
            <X :size="18" />
            Отмена
          </button>
        </header>

        <div class="crop-stage">
          <div
            ref="cropArea"
            class="avatar-crop-area"
            :class="{ dragging }"
            @pointerdown="startDrag"
            @pointermove="moveImage"
            @pointerup="stopDrag"
            @pointercancel="stopDrag"
            @wheel.prevent="handleWheel"
          >
            <img ref="image" :src="source" :style="imageStyle" alt="Предпросмотр аватара" draggable="false" @load="loadImage" />
            <div class="crop-shade" aria-hidden="true"></div>
            <div class="crop-ring" aria-hidden="true"></div>
            <div class="crop-corners" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>

        <div class="crop-zoom-control compact">
          <button class="icon-button" type="button" aria-label="Уменьшить" @click="setZoom(zoom - 0.1)">
            <Minus :size="19" />
          </button>
          <span class="crop-zoom-value">{{ Math.round(zoom * 100) }}%</span>
          <button class="icon-button" type="button" aria-label="Увеличить" @click="setZoom(zoom + 0.1)">
            <Plus :size="19" />
          </button>
        </div>

        <footer class="crop-modal-actions">
          <button class="ghost-button" type="button" @click="resetCrop">
            <RotateCcw :size="17" />
            Сбросить
          </button>
          <button class="primary-button" type="button" @click="saveCrop">
            <Check :size="18" />
            Готово
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
