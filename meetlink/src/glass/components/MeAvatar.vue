<script setup>
defineProps({
  avatar: { type: String, default: '' },
  mono: { type: String, default: '?' },
  gradient: { type: String, default: 'linear-gradient(135deg,#8b7cf6,#ec7fb6)' },
})
</script>

<template>
  <span class="me-av" :style="{ background: avatar ? '#fff' : gradient }">
    <img v-if="avatar" :src="avatar" alt="" class="me-av-img" />
    <span v-else class="me-av-mono">{{ mono }}</span>
  </span>
</template>

<style scoped>
.me-av {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
  overflow: hidden;
}
.me-av-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.me-av-mono {
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: inherit;
  color: #fff;
}
</style>
