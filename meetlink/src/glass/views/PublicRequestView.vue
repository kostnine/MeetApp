<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { X, Mail, Check } from '@lucide/vue'
import { useRequestsStore } from '../stores/requests'
import { useMeStore } from '../stores/me'
import { useUiStore } from '../stores/ui'
import BrandLogo from '../components/BrandLogo.vue'

const route = useRoute()
const router = useRouter()
const requests = useRequestsStore()
const me = useMeStore()
const ui = useUiStore()

const ANON_GRADIENT = 'linear-gradient(135deg,#b9b2d6,#8d85ad)'

const code = route.params.code
const request = ref(null)
const loading = ref(true)

onMounted(async () => {
  request.value = await requests.loadByCode(code)
  loading.value = false
})

const mode = ref('view') // 'view' | 'form' | 'done' | 'declined'
const pForm = reactive({ contact: '', alias: '', note: '' })

const name = computed(() => request.value?.displayName || 'Someone nearby')
const mono = computed(() => name.value.trim().slice(0, 1).toUpperCase())
const avatarGradient = computed(() => (request.value?.anonymous ? ANON_GRADIENT : me.gradient))

function decline() {
  mode.value = 'declined'
}
async function submit() {
  if (!pForm.contact.trim()) {
    ui.showToast('Add a contact so they can reach you')
    return
  }
  const created = await requests.addPublicReply(code, pForm)
  // Signed-in reply → the backend opened a real chat; drop them straight into it.
  if (created?.conversation?.id) {
    ui.showToast('Reply sent — chat opened')
    router.push('/chats')
    return
  }
  mode.value = 'done'
}
async function copyContact() {
  const ok = await ui.copyText(request.value?.contact)
  ui.showToast(ok ? 'Contact copied' : request.value?.contact || '')
}
function toIncoming() {
  requests.viewIncoming()
  router.push('/requests')
}
function close() {
  router.push('/welcome')
}
</script>

<template>
  <div class="public ml-scroll">
    <div class="public-card">
      <header class="public-head">
        <BrandLogo :size="28" :with-wordmark="true" :wordmark-size="16" />
        <button type="button" class="public-close" aria-label="Close" @click="close">
          <X :size="14" />
        </button>
      </header>

      <!-- Loading -->
      <div v-if="loading" class="pub-state pub-loading">Loading…</div>

      <!-- Not found / expired -->
      <div v-else-if="!request" class="pub-state pub-notfound">
        <div class="nf-title">This link isn’t active</div>
        <div class="nf-sub">It may have expired or been removed.</div>
        <button type="button" class="btn-glass nf-close" @click="close">Close</button>
      </div>

      <!-- View -->
      <template v-else-if="mode === 'view'">
        <div class="pub-view">
          <div class="ml-eyebrow">Someone wants to meet</div>
          <div class="pub-avatar" :style="{ background: avatarGradient }">{{ mono }}</div>
          <div class="pub-name">{{ name }}</div>
          <div class="pub-place">{{ request.place }}</div>
          <div class="pub-note">{{ request.message }}</div>

          <div v-if="request.contact" class="pub-contact">
            <div class="pub-contact-label">Reach {{ name }} directly</div>
            <button type="button" class="pub-contact-value" @click="copyContact">
              {{ request.contact }}
            </button>
            <div class="pub-contact-hint">Tap to copy</div>
          </div>
        </div>
        <div class="pub-actions">
          <button type="button" class="btn-glass" @click="decline">Not interested</button>
          <button type="button" class="btn-primary pub-reply" @click="mode = 'form'">
            {{ request.contact ? 'Reply in app' : 'Reply' }}
          </button>
        </div>
        <div class="pub-noacct">No account needed to reply.</div>
      </template>

      <!-- Reply form -->
      <div v-else-if="mode === 'form'" class="pub-form">
        <div class="form-title">Leave your reply</div>
        <div class="form-sub">Shared with {{ name }} only — and only if they accept you back.</div>

        <div class="field-label">YOUR CONTACT</div>
        <div class="input-box input-box--accent">
          <Mail :size="18" class="input-icon" />
          <input v-model="pForm.contact" class="bare-input" placeholder="Instagram, Telegram or phone" />
        </div>

        <div class="field-label">YOUR NAME <span class="opt">(optional)</span></div>
        <div class="input-box"><input v-model="pForm.alias" class="bare-input" placeholder="Name or nickname" /></div>

        <div class="field-label">MESSAGE <span class="opt">(optional)</span></div>
        <textarea v-model="pForm.note" class="form-textarea" placeholder="Say something…" />

        <button type="button" class="btn-primary form-send" @click="submit">Send reply</button>
      </div>

      <!-- Sent -->
      <div v-else-if="mode === 'done'" class="pub-state pub-done">
        <div class="done-check"><Check :size="34" /></div>
        <div class="done-title">Your reply was sent</div>
        <div class="done-sub">If {{ name }} accepts, you’ll be able to continue chatting.</div>
        <button type="button" class="btn-primary done-cta" @click="toIncoming">See it land in Incoming</button>
      </div>

      <!-- Declined -->
      <div v-else class="pub-state pub-declined">
        <div class="declined-title">No worries</div>
        <div class="declined-sub">Nothing was shared. You can close this page.</div>
        <button type="button" class="btn-glass declined-close" @click="close">Close</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.public {
  flex: 1;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: auto;
  background:
    radial-gradient(800px 600px at 15% 10%, #e5d6ff 0%, transparent 55%),
    radial-gradient(700px 560px at 88% 90%, #c9e6ff 0%, transparent 55%), rgba(242, 237, 251, 0.96);
}
.public-card {
  width: 100%;
  max-width: 420px;
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(34px) saturate(160%);
  -webkit-backdrop-filter: blur(34px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 30px 80px rgba(96, 73, 168, 0.24);
  padding: 14px 24px 28px;
  animation: mlPop 0.26s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
.public-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0 4px;
}
.public-close {
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

/* View */
.pub-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-top: 18px;
}
.pub-avatar {
  width: 74px;
  height: 74px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 30px;
  color: #fff;
  margin-top: 16px;
  box-shadow: 0 14px 34px rgba(139, 124, 246, 0.35);
}
.pub-name {
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 22px;
  color: var(--ml-ink-1);
  margin-top: 14px;
}
.pub-place {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--ml-accent-ink-soft);
  font-weight: 700;
  background: rgba(139, 124, 246, 0.1);
  padding: 5px 12px;
  border-radius: 999px;
  margin-top: 8px;
}
.pub-note {
  width: 100%;
  margin-top: 16px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.5);
  padding: 18px;
  font-size: 15.5px;
  color: #3e3656;
  line-height: 1.55;
  text-wrap: pretty;
}
.pub-contact {
  width: 100%;
  margin-top: 16px;
  text-align: center;
}
.pub-contact-label {
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ml-eyebrow);
  margin-bottom: 8px;
}
.pub-contact-value {
  width: 100%;
  border: 1px solid rgba(139, 124, 246, 0.4);
  background: rgba(139, 124, 246, 0.08);
  color: var(--ml-accent-ink);
  border-radius: 14px;
  padding: 14px;
  cursor: pointer;
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 16px;
  word-break: break-word;
}
.pub-contact-value:hover {
  background: rgba(139, 124, 246, 0.14);
}
.pub-contact-hint {
  font-size: 11px;
  color: var(--ml-ink-3);
  margin-top: 6px;
}
.pub-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}
.pub-noacct {
  text-align: center;
  font-size: 12px;
  color: var(--ml-ink-3);
  margin-top: 14px;
}

/* Buttons */
.btn-primary {
  border: none;
  cursor: pointer;
  background: var(--ml-accent-gradient);
  color: #fff;
  border-radius: 15px;
  padding: 15px 0;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 14.5px;
  box-shadow: 0 12px 28px rgba(139, 124, 246, 0.4);
}
.btn-glass {
  border: 1px solid rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.5);
  color: #7c7493;
  border-radius: 15px;
  padding: 15px 0;
  cursor: pointer;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 14.5px;
}
.pub-actions .btn-glass {
  flex: 1;
}
.pub-reply {
  flex: 1.4;
}

/* Form */
.pub-form {
  margin-top: 16px;
}
.form-title {
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 19px;
  color: var(--ml-ink-1);
}
.form-sub {
  font-size: 13px;
  color: #7c7493;
  margin-top: 4px;
  line-height: 1.5;
}
.field-label {
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--ml-eyebrow);
  margin: 18px 0 8px;
}
.field-label .opt {
  color: #b7afc8;
}
.input-box {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.6);
  border-radius: 13px;
  padding: 12px 14px;
}
.input-box--accent {
  border-color: rgba(139, 124, 246, 0.4);
  background: rgba(139, 124, 246, 0.06);
  padding: 13px 14px;
}
.input-icon {
  flex: none;
  color: var(--ml-eyebrow);
}
.bare-input {
  width: 100%;
  border: none;
  outline: none;
  background: none;
  color: var(--ml-ink-1);
  font-family: var(--ml-font-body);
  font-size: 15px;
}
.form-textarea {
  width: 100%;
  min-height: 74px;
  resize: none;
  border: 1px solid rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.6);
  border-radius: 13px;
  padding: 13px;
  color: var(--ml-ink-1);
  font-family: var(--ml-font-body);
  font-size: 14.5px;
  line-height: 1.45;
  outline: none;
}
.form-send {
  width: 100%;
  margin-top: 18px;
  border-radius: 15px;
  padding: 16px 0;
  font-size: 15.5px;
}

/* Shared state blocks */
.pub-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

/* Sent */
.pub-done {
  margin-top: 30px;
  animation: mlUp 0.4s ease both;
  padding-bottom: 10px;
}
.done-check {
  width: 72px;
  height: 72px;
  border-radius: 999px;
  background: rgba(52, 217, 168, 0.16);
  border: 1px solid rgba(52, 217, 168, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ml-success);
}
.done-title {
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 23px;
  color: var(--ml-ink-1);
  margin-top: 18px;
}
.done-sub {
  font-size: 14px;
  color: #7c7493;
  margin-top: 8px;
  max-width: 260px;
  line-height: 1.5;
}
.done-cta {
  margin-top: 22px;
  width: auto;
  padding: 14px 26px;
  border-radius: 14px;
}

/* Declined / not found */
.pub-declined {
  margin-top: 40px;
  padding-bottom: 20px;
}
.pub-notfound {
  margin-top: 34px;
  padding-bottom: 16px;
}
.pub-loading {
  margin-top: 40px;
  padding-bottom: 16px;
  color: var(--ml-ink-3);
  font-size: 14px;
}
.declined-title,
.nf-title {
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 20px;
  color: var(--ml-ink-1);
}
.declined-sub,
.nf-sub {
  font-size: 14px;
  color: #7c7493;
  margin-top: 8px;
  max-width: 240px;
  line-height: 1.5;
}
.declined-close,
.nf-close {
  margin-top: 22px;
  width: auto;
  padding: 13px 26px;
  border-radius: 14px;
  color: var(--ml-accent-ink-soft);
  background: rgba(255, 255, 255, 0.55);
  font-size: 14px;
}
</style>
