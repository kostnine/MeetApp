<script setup>
import { ref } from 'vue'
import { useUiStore } from '../stores/ui'
import { useRequestsStore } from '../stores/requests'
import QrImage from './QrImage.vue'

const ui = useUiStore()
const requests = useRequestsStore()

const copied = ref(false)
let copiedTimer = null

async function copyLink() {
  await ui.copyText(requests.urlFor(ui.qrRequest.code))
  copied.value = true
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copied.value = false
  }, 1500)
}

async function share() {
  const url = requests.urlFor(ui.qrRequest.code)
  if (navigator.share) {
    try {
      await navigator.share({ title: 'meetlink request', url })
      return
    } catch {
      /* user dismissed — fall through to copy */
    }
  }
  await ui.copyText(url)
  ui.showToast('Link copied')
}
</script>

<template>
  <div v-if="ui.qrRequest" class="qr-scrim" @click="ui.closeQr()">
    <div class="qr-card" @click.stop>
        <div class="qr-head">
          <span class="qr-title">Scan to reply</span>
          <button type="button" class="qr-close" aria-label="Close" @click="ui.closeQr()">
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        <div class="qr-frame">
          <QrImage :value="requests.urlFor(ui.qrRequest.code)" :margin="2" />
        </div>

        <div class="qr-link">{{ requests.linkFor(ui.qrRequest.code) }}</div>

        <div class="qr-actions">
          <button type="button" class="qr-btn qr-btn--soft" @click="copyLink">
            {{ copied ? 'Copied' : 'Copy link' }}
          </button>
          <button type="button" class="qr-btn qr-btn--primary" @click="share">Share</button>
        </div>
    </div>
  </div>
</template>

<style scoped>
.qr-scrim {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(60, 46, 110, 0.34);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.qr-card {
  width: 100%;
  max-width: 360px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(34px) saturate(160%);
  -webkit-backdrop-filter: blur(34px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 30px 70px rgba(96, 73, 168, 0.28);
  padding: 24px;
  text-align: center;
  animation: mlPop 0.24s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
.qr-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.qr-title {
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 17px;
  color: var(--ml-ink-1);
}
.qr-close {
  border: none;
  background: rgba(120, 100, 170, 0.1);
  border-radius: 999px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #7c7493;
}
.qr-frame {
  margin: 18px auto 0;
  padding: 16px;
  background: #fff;
  border-radius: 20px;
  border: 1px solid rgba(120, 100, 180, 0.12);
  width: 236px;
  height: 236px;
  box-shadow: 0 10px 26px rgba(96, 73, 168, 0.12);
}
.qr-link {
  font-family: var(--ml-font-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--ml-ink-2);
  margin-top: 16px;
  word-break: break-all;
}
.qr-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}
.qr-btn {
  flex: 1;
  border: none;
  cursor: pointer;
  border-radius: 13px;
  padding: 13px 0;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 14px;
}
.qr-btn--soft {
  background: rgba(139, 124, 246, 0.14);
  color: var(--ml-accent-ink);
}
.qr-btn--primary {
  background: var(--ml-accent-gradient);
  color: #fff;
  box-shadow: 0 10px 22px rgba(139, 124, 246, 0.38);
}
</style>
