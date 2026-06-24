<script setup>
import { computed, ref, watch } from 'vue'
import { X, MapPin, ShieldCheck, Copy } from '@lucide/vue'
import { apiFetch, authHeaders } from '../api'
import { useUiStore } from '../stores/ui'

const ui = useUiStore()

const loading = ref(false)
const error = ref('') // '' | 'no-profile' | <message>
const profile = ref(null)

// When opened from a chat we use the PARTICIPANT-GATED endpoint (you've connected, so you may
// see their contacts). Otherwise the public endpoint, which never returns contacts.
watch(
  () => ui.viewProfile,
  async (seed) => {
    profile.value = null
    error.value = ''
    if (!seed) return
    const url = seed.conversationId
      ? `/messages/conversations/${seed.conversationId}/counterpart`
      : seed.nickname
        ? `/profiles/${encodeURIComponent(seed.nickname)}`
        : null
    if (!url) {
      error.value = 'no-profile' // an anonymous counterpart has no account to show
      return
    }
    loading.value = true
    try {
      const data = await apiFetch(url, { headers: authHeaders() })
      profile.value = {
        name: data.name || seed.name,
        age: typeof data.age === 'number' ? data.age : '',
        city: data.city || '',
        bio: data.bio || '',
        interests: Array.isArray(data.interests) ? data.interests : [],
        avatar: data.avatar_url || seed.avatar || '',
        instagram: data.instagram || '',
        telegram: data.telegram || '',
        phone: data.phone || '',
      }
    } catch (e) {
      error.value = e.status === 404 ? 'no-profile' : e.message || 'Could not load profile'
    } finally {
      loading.value = false
    }
  },
)

const contacts = computed(() => {
  const p = profile.value
  if (!p) return []
  const out = []
  if (p.instagram) out.push({ label: 'Instagram', value: p.instagram })
  if (p.telegram) out.push({ label: 'Telegram', value: p.telegram })
  if (p.phone) out.push({ label: 'Phone', value: p.phone })
  return out
})

async function copyContact(value) {
  const ok = await ui.copyText(value)
  ui.showToast(ok ? 'Copied' : value)
}

function close() {
  ui.closeViewProfile()
}
</script>

<template>
  <div v-if="ui.viewProfile" class="vp-scrim" @click="close">
    <div class="vp-card ml-panel" @click.stop>
      <button type="button" class="vp-x" aria-label="Close" @click="close"><X :size="16" /></button>

      <div class="vp-head">
        <div
          class="vp-avatar"
          :style="profile?.avatar || ui.viewProfile.avatar ? null : { background: ui.viewProfile.gradient }"
        >
          <img
            v-if="profile?.avatar || ui.viewProfile.avatar"
            :src="profile?.avatar || ui.viewProfile.avatar"
            alt=""
            class="vp-avatar-img"
          />
          <span v-else>{{ ui.viewProfile.mono }}</span>
        </div>
        <div class="vp-id">
          <div class="vp-name-row">
            <span class="vp-name">{{ profile?.name || ui.viewProfile.name }}</span>
            <span v-if="profile?.age" class="vp-age">{{ profile.age }}</span>
          </div>
          <div v-if="profile?.city" class="vp-city"><MapPin :size="13" /> {{ profile.city }}</div>
        </div>
      </div>

      <div v-if="loading" class="vp-state">Loading…</div>
      <div v-else-if="error === 'no-profile'" class="vp-state">This person hasn’t set up a public profile yet.</div>
      <div v-else-if="error" class="vp-state vp-state--err">{{ error }}</div>
      <template v-else-if="profile">
        <p v-if="profile.bio" class="vp-bio">{{ profile.bio }}</p>

        <template v-if="profile.interests.length">
          <div class="vp-label">INTERESTS</div>
          <div class="vp-chips">
            <span v-for="t in profile.interests" :key="t" class="vp-chip">{{ t }}</span>
          </div>
        </template>

        <template v-if="contacts.length">
          <div class="vp-label">REACH THEM ON</div>
          <div class="vp-contacts">
            <button
              v-for="c in contacts"
              :key="c.label"
              type="button"
              class="vp-contact"
              title="Copy"
              @click="copyContact(c.value)"
            >
              <div class="vp-contact-body">
                <div class="vp-contact-label">{{ c.label }}</div>
                <div class="vp-contact-value">{{ c.value }}</div>
              </div>
              <Copy :size="15" class="vp-contact-copy" />
            </button>
          </div>
        </template>
        <div v-else class="vp-note">
          <ShieldCheck :size="16" class="vp-note-icon" />
          <span>No contact shared yet — it'll appear here once they add one.</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.vp-scrim {
  position: fixed;
  inset: 0;
  z-index: 210;
  background: rgba(40, 30, 70, 0.34);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.vp-card {
  position: relative;
  width: 100%;
  max-width: 400px;
  border-radius: 26px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(30px) saturate(150%);
  -webkit-backdrop-filter: blur(30px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 30px 70px rgba(96, 73, 168, 0.28);
  animation: mlPop 0.24s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
.vp-x {
  position: absolute;
  top: 14px;
  right: 14px;
  border: none;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: rgba(120, 100, 170, 0.1);
  color: #7c7493;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vp-head {
  display: flex;
  align-items: center;
  gap: 15px;
  padding-right: 30px;
}
.vp-avatar {
  position: relative;
  flex: none;
  width: 72px;
  height: 72px;
  border-radius: 22px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 30px;
}
.vp-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.vp-id {
  min-width: 0;
}
.vp-name-row {
  display: flex;
  align-items: baseline;
  gap: 9px;
}
.vp-name {
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 23px;
  letter-spacing: -0.5px;
  color: var(--ml-ink-1);
}
.vp-age {
  font-size: 17px;
  color: var(--ml-ink-3);
}
.vp-city {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--ml-accent-ink-soft);
  background: rgba(139, 124, 246, 0.1);
  padding: 5px 12px;
  border-radius: 999px;
  margin-top: 8px;
}
.vp-state {
  margin-top: 18px;
  font-size: 14px;
  color: var(--ml-ink-3);
}
.vp-state--err {
  color: var(--ml-danger);
}
.vp-bio {
  margin: 18px 0 0;
  font-size: 15px;
  color: #3e3656;
  line-height: 1.6;
  text-wrap: pretty;
}
.vp-label {
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--ml-eyebrow);
  margin: 20px 0 10px;
}
.vp-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.vp-chip {
  font-size: 13px;
  font-weight: 700;
  color: var(--ml-ink-2);
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 999px;
  padding: 8px 14px;
}
.vp-note {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 20px;
  padding: 13px 14px;
  border-radius: 16px;
  background: rgba(139, 124, 246, 0.07);
  border: 1px solid rgba(139, 124, 246, 0.18);
  font-size: 12.5px;
  color: var(--ml-ink-2);
  line-height: 1.45;
}
.vp-note-icon {
  flex: none;
  color: var(--ml-accent-ink);
}
.vp-contacts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.vp-contact {
  display: flex;
  align-items: center;
  gap: 11px;
  text-align: left;
  cursor: pointer;
  border: 1px solid rgba(139, 124, 246, 0.25);
  background: rgba(139, 124, 246, 0.07);
  border-radius: 14px;
  padding: 11px 13px;
}
.vp-contact:hover {
  background: rgba(139, 124, 246, 0.13);
}
.vp-contact-body {
  flex: 1;
  min-width: 0;
}
.vp-contact-label {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ml-eyebrow);
}
.vp-contact-value {
  font-family: var(--ml-font-display);
  font-size: 15px;
  font-weight: 600;
  color: var(--ml-ink-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.vp-contact-copy {
  flex: none;
  color: var(--ml-accent-ink);
}
</style>
