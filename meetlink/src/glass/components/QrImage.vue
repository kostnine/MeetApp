<script setup>
import { ref, watch } from 'vue'
import QRCode from 'qrcode'

const props = defineProps({
  value: { type: String, required: true },
  margin: { type: Number, default: 2 },
})

const src = ref('')

async function render() {
  try {
    src.value = await QRCode.toDataURL(props.value || ' ', {
      margin: props.margin,
      width: 360,
      errorCorrectionLevel: 'M',
      color: { dark: '#2a2342', light: '#ffffff' },
    })
  } catch {
    src.value = ''
  }
}

watch(() => [props.value, props.margin], render, { immediate: true })
</script>

<template>
  <img v-if="src" :src="src" alt="QR code" class="qr-img" />
</template>

<style scoped>
.qr-img {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
