<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import QRCode from 'qrcode'
import { Check, Copy, Download, Link as LinkIcon, MessageCircle, Printer, QrCode, Sparkles, UsersRound } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { useMeetStore } from '../stores/meet'

const store = useMeetStore()
const qrDataUrl = ref('')
const qrError = ref('')
const publicRequestUrl = computed(() => `https://${store.activeRequestLink}`)

async function renderQrCode() {
  if (!store.activeRequest?.code) return
  try {
    qrError.value = ''
    qrDataUrl.value = await QRCode.toDataURL(publicRequestUrl.value, {
      width: 720,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#07131f', light: '#ffffff' },
    })
  } catch (error) {
    qrError.value = error.message
  }
}

async function createRequest() {
  await store.createMeetRequest()
  await renderQrCode()
}

function downloadQrCode() {
  if (!qrDataUrl.value) return
  const link = document.createElement('a')
  link.href = qrDataUrl.value
  link.download = `meetme-${store.activeRequest.code}.png`
  link.click()
}

function printRequest() {
  window.print()
}

watch(() => store.activeRequest?.code, renderQrCode)
onMounted(renderQrCode)
</script>

<template>
  <section class="view-grid request-create-view simple-request-view">
    <div class="panel request-builder simple-request-builder">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Новый запрос</p>
          <h2>Создать ссылку</h2>
        </div>
        <LinkIcon :size="22" />
      </div>

      <p class="request-intro">
        Напиши короткое сообщение. Человек откроет ссылку или отсканирует QR-код и сможет оставить ответ и контакт.
      </p>

      <form class="booking-form simple-request-form" @submit.prevent="createRequest">
        <label>
          <span>Сообщение для человека</span>
          <textarea
            v-model.trim="store.requestDraft.message"
            rows="7"
            maxlength="600"
            placeholder="Например: Привет! Я увидел тебя сегодня в кофейне и хотел бы познакомиться. Если тебе комфортно, оставь ответ."
            required
          ></textarea>
          <small class="field-counter">{{ store.requestDraft.message.length }}/600</small>
        </label>

        <div class="request-privacy-note">
          <MessageCircle :size="18" />
          <span>По ссылке будет видно только это сообщение и форму ответа. Геолокация и параметры поиска не используются.</span>
        </div>

        <button class="primary-button create-request-button" type="submit" :disabled="store.isSubmitting">
          <Sparkles :size="18" />
          {{ store.isSubmitting ? 'Создаём...' : 'Создать ссылку и QR-код' }}
        </button>
      </form>
    </div>

    <aside class="panel link-result-panel printable-request-card">
      <div class="panel-head no-print-actions">
        <div>
          <p class="eyebrow">Готово</p>
          <h2>Ссылка и QR-код</h2>
        </div>
        <QrCode :size="22" />
      </div>

      <div class="print-brand">
        <span class="print-brand-mark">M</span>
        <div>
          <strong>MeetMe</strong>
          <small>Ответь, если тоже хочешь познакомиться</small>
        </div>
      </div>

      <div class="qr-code-frame">
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR-код ссылки на запрос" />
        <div v-else class="qr-code-placeholder">
          <QrCode :size="48" />
          <span>{{ qrError || 'Создай ссылку, чтобы получить QR-код' }}</span>
        </div>
      </div>

      <div class="print-request-message">
        <MessageCircle :size="19" />
        <p>{{ store.activeRequest?.message || store.requestDraft.message }}</p>
      </div>

      <div class="print-request-link">
        <span>Открой ссылку или наведи камеру</span>
        <strong>{{ store.activeRequestLink }}</strong>
      </div>

      <div class="request-result-actions no-print-actions">
        <button class="primary-button" type="button" @click="store.copyRequestLink">
          <Check v-if="store.requestCopied" :size="18" />
          <Copy v-else :size="18" />
          {{ store.requestCopied ? 'Скопировано' : 'Скопировать ссылку' }}
        </button>
        <button class="ghost-button" type="button" :disabled="!qrDataUrl" @click="downloadQrCode">
          <Download :size="18" />
          Скачать QR
        </button>
        <button class="ghost-button" type="button" :disabled="!qrDataUrl" @click="printRequest">
          <Printer :size="18" />
          Распечатать
        </button>
      </div>

      <RouterLink v-if="store.activeRequest?.code" class="ghost-button no-print-actions" :to="{ name: 'request-response', params: { code: store.activeRequest.code } }">
        <UsersRound :size="18" />
        Посмотреть страницу гостя
      </RouterLink>
    </aside>
  </section>
</template>
