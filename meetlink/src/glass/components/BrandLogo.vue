<script setup>
import { computed } from 'vue'

const props = defineProps({
  size: { type: Number, default: 34 },
  withWordmark: { type: Boolean, default: false },
  wordmarkSize: { type: Number, default: 21 },
})

const markStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  borderRadius: `${Math.round(props.size * 0.32)}px`,
  boxShadow: `0 ${Math.round(props.size * 0.24)}px ${Math.round(props.size * 0.55)}px rgba(139,124,246,.42)`,
}))

const circle = computed(() => ({
  size: Math.round(props.size * 0.35),
  offset: Math.round(props.size * 0.235),
  border: Math.max(2, props.size * 0.05),
}))

const filledStyle = computed(() => ({
  left: `${circle.value.offset}px`,
  width: `${circle.value.size}px`,
  height: `${circle.value.size}px`,
}))

const outlinedStyle = computed(() => ({
  right: `${circle.value.offset}px`,
  width: `${circle.value.size}px`,
  height: `${circle.value.size}px`,
  borderWidth: `${circle.value.border}px`,
}))
</script>

<template>
  <span class="brand">
    <span class="brand-mark" :style="markStyle">
      <span class="brand-circle brand-circle--filled" :style="filledStyle" />
      <span class="brand-circle brand-circle--outlined" :style="outlinedStyle" />
    </span>
    <span v-if="withWordmark" class="brand-word" :style="{ fontSize: `${wordmarkSize}px` }">meetlink</span>
  </span>
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: 11px;
}
.brand-mark {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ml-accent-gradient);
}
.brand-circle {
  position: absolute;
  border-radius: 999px;
}
.brand-circle--filled {
  background: rgba(255, 255, 255, 0.96);
}
.brand-circle--outlined {
  border-style: solid;
  border-color: rgba(255, 255, 255, 0.96);
}
.brand-word {
  font-family: var(--ml-font-display);
  font-weight: 700;
  letter-spacing: -0.5px;
  color: var(--ml-ink-1);
}
</style>
