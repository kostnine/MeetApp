<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { X, MapPin } from '@lucide/vue'
import { useUiStore } from '../stores/ui'
import { useChatsStore } from '../stores/chats'
import { useMapStore } from '../stores/map'

const ui = useUiStore()
const chats = useChatsStore()
const map = useMapStore()
const router = useRouter()

const person = computed(() => ui.selectedPerson)
const replyDraft = ref('')

const REACTIONS = ['❤️', '🔥', '😍', '👋', '😮', '😂']

function close() {
  ui.closePerson()
}

// A reply (typed or an emoji) opens a private chat with this person, seeded with it.
function reply(text) {
  const p = person.value
  const body = String(text || '').trim()
  if (!p || !body) return
  chats.startFromStory(p)
  chats.draft = body
  chats.sendMessage()
  replyDraft.value = ''
  ui.closePerson()
  router.push('/chats')
}

function report() {
  ui.closePerson()
  ui.showToast('Reported. Thanks for keeping meetlink safe.')
}
function hide() {
  const p = person.value
  if (p) map.hideStory(p.id)
  ui.closePerson()
  ui.showToast('You won’t see this person again')
}
</script>

<template>
  <div v-if="person" class="person-scrim" @click="close">
    <div class="person-sheet ml-scroll" @click.stop>
      <div class="person-grab" />

      <!-- header -->
      <div class="person-head">
        <div class="person-avatar" :style="person.avatar ? null : { background: person.gradient }">
          <img v-if="person.avatar" :src="person.avatar" alt="" class="person-avatar-img" />
          <span v-else>{{ person.mono }}</span>
          <span v-if="person.online" class="person-online" />
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
          <X :size="14" />
        </button>
      </div>

      <!-- place + posted time -->
      <div v-if="person.place || person.posted" class="person-place-row">
        <span v-if="person.place" class="person-place-pill"><MapPin :size="12" /> {{ person.place }}</span>
        <span v-if="person.posted" class="person-posted">{{ person.posted }}</span>
      </div>

      <!-- story text -->
      <p v-if="person.text" class="person-text">{{ person.text }}</p>

      <!-- story media (photo or placeholder), Instagram-style -->
      <div class="person-media" :class="{ 'person-media--placeholder': !person.image }">
        <img v-if="person.image" :src="person.image" alt="" class="person-media-img" />
        <span v-else class="person-media-tag">Story photo</span>
        <div v-if="person.place" class="person-media-scrim">
          <span class="person-media-loc"><MapPin :size="11" /> {{ person.place }}</span>
        </div>
      </div>

      <!-- quick reactions -->
      <div class="person-reacts">
        <button
          v-for="e in REACTIONS"
          :key="e"
          type="button"
          class="person-react"
          @click="reply(e)"
        >
          {{ e }}
        </button>
      </div>

      <!-- reply bar -->
      <div class="person-reply">
        <input
          v-model="replyDraft"
          class="person-reply-input"
          :placeholder="`Reply to ${person.name}…`"
          @keydown.enter="reply(replyDraft)"
        />
        <button type="button" class="person-send" aria-label="Send" @click="reply(replyDraft)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h13M12 5l7 7-7 7" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
      <div class="person-reply-note">Your reply opens a private chat with {{ person.name }}.</div>

      <!-- safety actions -->
      <div class="person-footer">
        <button type="button" class="person-foot-btn" @click="report">Report</button>
        <button type="button" class="person-foot-btn" @click="hide">Hide this user</button>
      </div>
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
  background: rgba(60, 46, 110, 0.28);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.person-sheet {
  width: 100%;
  max-width: 460px;
  max-height: 92dvh;
  overflow: auto;
  border-radius: 30px 30px 0 0;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(34px) saturate(160%);
  -webkit-backdrop-filter: blur(34px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-bottom: none;
  box-shadow: 0 -20px 50px rgba(96, 73, 168, 0.22);
  padding: 14px 22px 28px;
  animation: mlUp 0.28s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
.person-grab {
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: rgba(90, 70, 150, 0.2);
  margin: 0 auto 16px;
}
.person-head {
  display: flex;
  align-items: center;
  gap: 14px;
}
.person-avatar {
  position: relative;
  flex: none;
  width: 58px;
  height: 58px;
  border-radius: 18px;
  overflow: visible;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 23px;
}
.person-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 18px;
}
.person-online {
  position: absolute;
  right: -3px;
  bottom: -3px;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: var(--ml-online);
  border: 3px solid #fff;
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
  font-size: 15px;
  color: var(--ml-ink-3);
}
.person-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 3px;
  font-size: 12.5px;
}
.person-dist {
  font-weight: 700;
  color: var(--ml-eyebrow);
}
.person-dot {
  width: 3px;
  height: 3px;
  border-radius: 999px;
  background: #c3bbd4;
}
.person-status {
  font-weight: 700;
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
.person-place-row {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: #7c7493;
}
.person-place-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 700;
  color: var(--ml-accent-ink-soft);
  background: rgba(139, 124, 246, 0.12);
  padding: 5px 11px;
  border-radius: 999px;
}
.person-text {
  margin: 13px 0 0;
  font-size: 14.5px;
  color: #3e3656;
  line-height: 1.55;
  text-wrap: pretty;
}
.person-media {
  position: relative;
  margin-top: 14px;
  height: 228px;
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.8);
}
.person-media--placeholder {
  background-image: repeating-linear-gradient(
    135deg,
    rgba(139, 124, 246, 0.13) 0 12px,
    rgba(236, 127, 182, 0.1) 12px 24px
  );
}
.person-media-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.person-media-tag {
  position: absolute;
  top: 13px;
  left: 13px;
  font-family: var(--ml-font-display);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #9a93ad;
  background: rgba(255, 255, 255, 0.78);
  padding: 5px 11px;
  border-radius: 999px;
}
.person-media-scrim {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 34px 14px 14px;
  background: linear-gradient(to top, rgba(42, 35, 66, 0.6), transparent);
  display: flex;
  align-items: center;
}
.person-media-loc {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 700;
  color: #fff;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  padding: 5px 11px;
  border-radius: 999px;
}
.person-reacts {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  margin-top: 14px;
  padding: 0 4px;
}
.person-react {
  flex: 1;
  border: 1px solid rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.5);
  border-radius: 14px;
  padding: 9px 0;
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
  transition:
    transform 0.12s ease,
    background 0.12s ease;
}
.person-react:hover {
  transform: scale(1.18);
  background: rgba(255, 255, 255, 0.85);
}
.person-reply {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 12px;
}
.person-reply-input {
  flex: 1;
  min-width: 0;
  border: 1px solid rgba(139, 124, 246, 0.4);
  outline: none;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 999px;
  padding: 14px 18px;
  font-family: var(--ml-font-body);
  font-size: 15px;
  color: var(--ml-ink-1);
}
.person-send {
  flex: none;
  width: 48px;
  height: 48px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background: var(--ml-accent-gradient);
  box-shadow: 0 8px 20px rgba(139, 124, 246, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}
.person-reply-note {
  text-align: center;
  font-size: 11.5px;
  color: var(--ml-ink-3);
  margin-top: 9px;
}
.person-footer {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}
.person-foot-btn {
  flex: 1;
  border: none;
  cursor: pointer;
  background: rgba(120, 100, 170, 0.08);
  color: #8b83a0;
  border-radius: 12px;
  padding: 10px 0;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 13px;
}
</style>
