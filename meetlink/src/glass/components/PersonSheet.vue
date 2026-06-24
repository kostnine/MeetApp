<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { X, MapPin } from '@lucide/vue'
import { useUiStore } from '../stores/ui'
import { useChatsStore } from '../stores/chats'
import { useRequestsStore } from '../stores/requests'

const ui = useUiStore()
const chats = useChatsStore()
const requests = useRequestsStore()
const router = useRouter()

const person = computed(() => ui.selectedPerson)

function close() {
  ui.closePerson()
}

// Message → open a direct chat with this person.
function message() {
  const p = person.value
  if (!p) return
  chats.startFromStory(p)
  ui.closePerson()
  router.push('/chats')
}

// Send request → open the request-note creator.
function sendRequest() {
  ui.closePerson()
  requests.startCreate()
  router.push('/requests')
}
</script>

<template>
  <div v-if="person" class="person-scrim" @click="close">
    <div class="person-sheet" @click.stop>
      <div class="person-grab" />

      <div class="person-head">
        <div
          class="person-avatar"
          :style="person.avatar ? null : { background: person.gradient }"
        >
          <img v-if="person.avatar" :src="person.avatar" alt="" class="person-avatar-img" />
          <span v-else>{{ person.mono }}</span>
        </div>
        <div class="person-id">
          <div class="person-name-row">
            <span class="person-name">{{ person.name }}</span>
            <span v-if="person.age" class="person-age">{{ person.age }}</span>
          </div>
          <div class="person-meta">
            <span class="person-dist">{{ person.dist }} away</span>
            <span class="person-dot" />
            <span class="person-status" :class="{ online: person.online }">
              {{ person.online ? 'Online now' : 'Offline' }}
            </span>
          </div>
        </div>
        <button type="button" class="person-x" aria-label="Close" @click="close">
          <X :size="15" />
        </button>
      </div>

      <div v-if="person.image" class="person-media">
        <img :src="person.image" alt="" />
      </div>

      <p v-if="person.text" class="person-text">{{ person.text }}</p>

      <div v-if="person.place" class="person-place">
        <MapPin :size="13" /> {{ person.place }}<span v-if="person.posted"> · {{ person.posted }}</span>
      </div>

      <div class="person-actions">
        <button type="button" class="person-btn person-btn--glass" @click="message">Message</button>
        <button type="button" class="person-btn person-btn--primary" @click="sendRequest">Send request</button>
      </div>

      <button type="button" class="person-close" @click="close">Close</button>
    </div>
  </div>
</template>

<style scoped>
.person-scrim {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 100dvh;
  z-index: 150;
  background: rgba(40, 30, 70, 0.34);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.person-sheet {
  width: 100%;
  max-width: 460px;
  display: flex;
  flex-direction: column;
  border-radius: 28px 28px 0 0;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(32px) saturate(150%);
  -webkit-backdrop-filter: blur(32px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 -20px 50px rgba(96, 73, 168, 0.22);
  padding: 12px 22px 26px;
  animation: mlUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
.person-grab {
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: rgba(120, 100, 180, 0.25);
  margin: 2px auto 14px;
}
.person-head {
  display: flex;
  align-items: center;
  gap: 14px;
}
.person-avatar {
  position: relative;
  flex: none;
  width: 60px;
  height: 60px;
  border-radius: 18px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 24px;
}
.person-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.person-id {
  flex: 1;
  min-width: 0;
}
.person-name-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.person-name {
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 20px;
  letter-spacing: -0.4px;
  color: var(--ml-ink-1);
}
.person-age {
  font-size: 16px;
  color: var(--ml-ink-3);
}
.person-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 3px;
  font-size: 13px;
  color: var(--ml-ink-2);
}
.person-dist {
  font-weight: 600;
}
.person-dot {
  width: 3px;
  height: 3px;
  border-radius: 999px;
  background: var(--ml-ink-3);
}
.person-status {
  font-weight: 600;
  color: var(--ml-ink-3);
}
.person-status.online {
  color: var(--ml-success);
}
.person-x {
  flex: none;
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
.person-media {
  margin-top: 14px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.7);
}
.person-media img {
  width: 100%;
  max-height: 260px;
  object-fit: cover;
  display: block;
}
.person-text {
  margin: 14px 0 0;
  font-size: 14.5px;
  color: #3e3656;
  line-height: 1.5;
  text-wrap: pretty;
}
.person-place {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 11px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--ml-accent-ink-soft);
  background: rgba(139, 124, 246, 0.1);
  border-radius: 999px;
  padding: 5px 12px;
}
.person-actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}
.person-btn {
  flex: 1;
  border: none;
  cursor: pointer;
  border-radius: 14px;
  padding: 14px 0;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 14px;
}
.person-btn--glass {
  border: 1px solid rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.6);
  color: var(--ml-accent-ink-soft);
}
.person-btn--primary {
  background: var(--ml-accent-gradient);
  color: #fff;
  box-shadow: 0 10px 24px rgba(139, 124, 246, 0.4);
}
.person-close {
  width: 100%;
  margin-top: 10px;
  border: none;
  background: none;
  cursor: pointer;
  color: #8b83a0;
  font-family: var(--ml-font-body);
  font-weight: 600;
  font-size: 13px;
  padding: 6px;
}
</style>
