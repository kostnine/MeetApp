<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Info } from '@lucide/vue'
import { useMeStore } from '../stores/me'
import { useSettingsStore } from '../stores/settings'
import { useUiStore } from '../stores/ui'
import { useAuthStore } from '../stores/auth'

const me = useMeStore()
const settings = useSettingsStore()
const ui = useUiStore()
const auth = useAuthStore()
const router = useRouter()

function signOut() {
  auth.logout()
  router.push('/welcome')
  ui.showToast('Signed out')
}

// Each row reads/writes its own source — shared flags live on `me`, the rest on `settings`.
const toggles = computed(() => [
  { label: 'Show me on the map', sub: 'People nearby can find you', on: me.showOnMap, set: (v) => (me.showOnMap = v) },
  { label: 'Approximate location only', sub: 'Hide your exact position — show a wide area', on: me.approximateLocation, set: (v) => (me.approximateLocation = v) },
  { label: 'Messages from nearby', sub: 'Let people who see your story message you', on: me.messagesFromNearby, set: (v) => (me.messagesFromNearby = v) },
  { label: 'Messages from request links', sub: 'Let people who open your link reply', on: me.messagesFromRequests, set: (v) => (me.messagesFromRequests = v) },
  { label: 'Contacts after approval', sub: 'Reveal contacts only when you accept', on: me.contactsAfterApproval, set: (v) => (me.contactsAfterApproval = v) },
])

function toggleRow(row) {
  row.set(!row.on)
  me.persistProfile()
}

function mono(name) {
  return String(name || '?').trim().slice(0, 1).toUpperCase()
}

function deleteAccount() {
  ui.showToast('Account deletion is disabled in this demo')
}
</script>

<template>
  <div class="settings ml-scroll">
    <div class="settings-inner">
      <div class="ml-eyebrow">Privacy</div>
      <h1 class="ml-title settings-title">Settings</h1>

      <div class="toggle-card ml-panel">
        <button
          v-for="(t, i) in toggles"
          :key="i"
          type="button"
          class="setting-row"
          @click="toggleRow(t)"
        >
          <div class="setting-text">
            <div class="setting-label">{{ t.label }}</div>
            <div class="setting-sub">{{ t.sub }}</div>
          </div>
          <span class="setting-track" :class="{ 'setting-track--on': t.on }">
            <span class="setting-knob" />
          </span>
        </button>
      </div>

      <div class="info-card">
        <Info :size="18" class="info-icon" />
        <div>
          meetlink only ever shows an <b>approximate area</b> — never your exact location. Markers
          are snapped to a wide zone so no one can pinpoint where you are.
        </div>
      </div>

      <div class="field-label">BLOCKED USERS</div>
      <div class="blocked-card">
        <div v-if="!settings.blocked.length" class="blocked-empty">No blocked users.</div>
        <div v-for="u in settings.blocked" :key="u.id" class="blocked-row">
          <div class="blocked-avatar">{{ mono(u.name) }}</div>
          <div class="blocked-name">{{ u.name }}</div>
          <button type="button" class="unblock-btn" @click="settings.unblock(u.id)">Unblock</button>
        </div>
      </div>

      <button type="button" class="signout-btn" @click="signOut">Sign out</button>
      <button type="button" class="delete-btn" @click="deleteAccount">Delete account</button>
    </div>
  </div>
</template>

<style scoped>
.settings {
  flex: 1;
  overflow: auto;
}
.settings-inner {
  max-width: 600px;
  margin: 0 auto;
  padding: 22px 18px 28px;
}
.settings-title {
  margin: 2px 0 0;
}

/* Toggle list */
.toggle-card {
  margin-top: 18px;
  border-radius: 22px;
  padding: 8px;
}
.setting-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 15px;
  text-align: left;
  border-radius: 16px;
  transition: background 0.16s ease;
}
.setting-row:hover {
  background: rgba(255, 255, 255, 0.4);
}
.setting-label {
  font-size: 15px;
  font-weight: 700;
  color: var(--ml-ink-1);
}
.setting-sub {
  font-size: 12.5px;
  color: #8b83a0;
  margin-top: 2px;
}
.setting-track {
  width: 46px;
  height: 27px;
  border-radius: 999px;
  background: #cdc6dd;
  position: relative;
  flex: none;
  transition: background 0.2s;
}
.setting-track--on {
  background: var(--ml-accent-gradient);
}
.setting-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 21px;
  height: 21px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: left 0.2s;
}
.setting-track--on .setting-knob {
  left: 22px;
}

/* Info card */
.info-card {
  margin-top: 14px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 16px;
  border-radius: 18px;
  background: rgba(139, 124, 246, 0.07);
  border: 1px solid rgba(139, 124, 246, 0.18);
  font-size: 13px;
  color: var(--ml-ink-2);
  line-height: 1.55;
}
.info-icon {
  flex: none;
  margin-top: 1px;
  color: var(--ml-accent-ink);
}

/* Blocked users */
.field-label {
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--ml-eyebrow);
  margin: 24px 0 10px;
}
.blocked-card {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.7);
  padding: 8px;
}
.blocked-empty {
  padding: 18px;
  text-align: center;
  font-size: 13.5px;
  color: var(--ml-ink-3);
}
.blocked-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 13px;
}
.blocked-avatar {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(120, 100, 170, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 16px;
  color: #7c7493;
}
.blocked-name {
  flex: 1;
  font-size: 14.5px;
  font-weight: 700;
  color: #3e3656;
}
.unblock-btn {
  border: 1px solid rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.6);
  color: var(--ml-accent-ink-soft);
  border-radius: 11px;
  padding: 8px 16px;
  cursor: pointer;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 13px;
}

/* Sign out */
.signout-btn {
  width: 100%;
  margin-top: 24px;
  border: 1px solid rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.55);
  color: var(--ml-accent-ink-soft);
  border-radius: 16px;
  padding: 15px 0;
  cursor: pointer;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 14.5px;
}

/* Delete account */
.delete-btn {
  width: 100%;
  margin-top: 12px;
  border: 1px solid rgba(236, 80, 100, 0.3);
  background: rgba(236, 80, 100, 0.07);
  color: var(--ml-danger);
  border-radius: 16px;
  padding: 15px 0;
  cursor: pointer;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 14.5px;
}
</style>
