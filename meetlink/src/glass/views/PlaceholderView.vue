<script setup>
defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
})
</script>

<template>
  <div class="placeholder">
    <header class="placeholder-head">
      <div v-if="eyebrow" class="ml-eyebrow">{{ eyebrow }}</div>
      <h1 class="ml-title">{{ title }}</h1>
    </header>

    <div class="placeholder-card ml-panel">
      <div class="placeholder-badge">Coming next</div>
      <p class="placeholder-text">{{ description }}</p>
      <p class="placeholder-note">This screen is part of the glass redesign and will be built next.</p>
    </div>
  </div>
</template>

<style scoped>
.placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 18px 8px;
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
}
.placeholder-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.placeholder-card {
  border-radius: 24px;
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.placeholder-badge {
  align-self: flex-start;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ml-accent-ink);
  background: rgba(139, 124, 246, 0.14);
  border-radius: 999px;
  padding: 4px 11px;
}
.placeholder-text {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--ml-ink-2);
  text-wrap: pretty;
}
.placeholder-note {
  margin: 0;
  font-size: 13px;
  color: var(--ml-ink-3);
}
</style>
