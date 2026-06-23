<script setup>
import { useRouter } from 'vue-router'
import { useUiStore } from '../stores/ui'
import { useRequestsStore } from '../stores/requests'
import { useAuthStore } from '../stores/auth'
import BrandLogo from '../components/BrandLogo.vue'

const router = useRouter()
const ui = useUiStore()
const requests = useRequestsStore()
const auth = useAuthStore()

function openMap() {
  router.push(auth.isAuthed ? '/map' : '/auth')
}
function createRequest() {
  if (!auth.isAuthed) {
    router.push('/auth')
    return
  }
  requests.startCreate()
  router.push('/requests')
}
function signIn() {
  router.push('/auth')
}
async function guest() {
  try {
    await auth.guest()
    router.push('/map')
  } catch (error) {
    ui.showToast(error.message || 'Could not continue')
  }
}
</script>

<template>
  <div class="onboarding">
    <span class="bubble bubble-1" aria-hidden="true" />
    <span class="bubble bubble-2" aria-hidden="true" />
    <span class="bubble bubble-3" aria-hidden="true" />
    <span class="bubble bubble-4" aria-hidden="true" />

    <div class="onboard-card">
      <div class="onboard-logo"><BrandLogo :size="52" :with-wordmark="true" :wordmark-size="30" /></div>

      <h1 class="onboard-headline">Meet people around you in real life.</h1>
      <p class="onboard-sub">
        Post a story on the map, discover people nearby, drop a note, share a link or QR code, and
        start chatting.
      </p>

      <div class="onboard-actions">
        <button type="button" class="btn-primary" @click="openMap">Open the map</button>
        <button type="button" class="btn-glass" @click="createRequest">Create a request</button>
        <div class="onboard-row">
          <button type="button" class="btn-faint" @click="signIn">Sign in</button>
          <button type="button" class="btn-faint" @click="guest">Continue as guest</button>
        </div>
      </div>

      <div class="onboard-footer">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M12 22s7-4.5 7-11V5l-7-3-7 3v6c0 6.5 7 11 7 11z" stroke="#9c95b0" stroke-width="2" stroke-linejoin="round" />
        </svg>
        Only approximate location is ever shown.
      </div>
    </div>
  </div>
</template>

<style scoped>
.onboarding {
  flex: 1;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
  position: relative;
  overflow: hidden;
}

/* Floating pastel bubbles */
.bubble {
  position: absolute;
  border-radius: 999px;
}
.bubble-1 {
  left: 14%;
  top: 20%;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #ffb6c8, #f2749b);
  opacity: 0.55;
  filter: blur(0.4px);
  box-shadow: 0 18px 40px rgba(242, 116, 155, 0.35);
  animation: mlFloat 7s ease-in-out infinite;
}
.bubble-2 {
  right: 16%;
  top: 26%;
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #a9d4ff, #5aa6f2);
  opacity: 0.5;
  box-shadow: 0 18px 40px rgba(90, 166, 242, 0.3);
  animation: mlFloat 9s ease-in-out infinite 0.8s;
}
.bubble-3 {
  left: 20%;
  bottom: 18%;
  width: 52px;
  height: 52px;
  background: linear-gradient(135deg, #9ee9c8, #3fbf95);
  opacity: 0.5;
  box-shadow: 0 18px 40px rgba(63, 191, 149, 0.3);
  animation: mlFloat 8s ease-in-out infinite 0.4s;
}
.bubble-4 {
  right: 22%;
  bottom: 22%;
  width: 38px;
  height: 38px;
  background: linear-gradient(135deg, #c3b6ff, #8b7cf6);
  opacity: 0.55;
  box-shadow: 0 18px 40px rgba(139, 124, 246, 0.3);
  animation: mlFloat 6.5s ease-in-out infinite 0.6s;
}

/* Card */
.onboard-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 430px;
  border-radius: 34px;
  padding: 40px 32px 32px;
  text-align: center;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(30px) saturate(150%);
  -webkit-backdrop-filter: blur(30px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 30px 80px rgba(96, 73, 168, 0.22);
}
.onboard-logo {
  display: flex;
  align-items: center;
  justify-content: center;
}
.onboard-headline {
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 27px;
  line-height: 1.18;
  letter-spacing: -0.7px;
  color: var(--ml-ink-1);
  margin: 26px 0 0;
  text-wrap: balance;
}
.onboard-sub {
  font-size: 15px;
  line-height: 1.6;
  color: #6b6385;
  margin: 14px 0 0;
  text-wrap: pretty;
}
.onboard-actions {
  display: flex;
  flex-direction: column;
  gap: 11px;
  margin-top: 28px;
}
.btn-primary {
  border: none;
  cursor: pointer;
  border-radius: 16px;
  padding: 16px 0;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 15.5px;
  color: #fff;
  background: var(--ml-accent-gradient);
  box-shadow: 0 14px 30px rgba(139, 124, 246, 0.4);
}
.btn-glass {
  cursor: pointer;
  border-radius: 16px;
  padding: 15px 0;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 15px;
  color: var(--ml-accent-ink-soft);
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.85);
}
.onboard-row {
  display: flex;
  gap: 11px;
  margin-top: 2px;
}
.btn-faint {
  flex: 1;
  cursor: pointer;
  border-radius: 16px;
  padding: 13px 0;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 14px;
  color: #635b7d;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.7);
}
.onboard-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: 22px;
  font-size: 12px;
  color: var(--ml-ink-3);
}

@media (prefers-reduced-motion: reduce) {
  .bubble {
    animation: none;
  }
}
</style>
