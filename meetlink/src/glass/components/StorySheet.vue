<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '../stores/ui'
import { useMapStore } from '../stores/map'
import { useChatsStore } from '../stores/chats'

const ui = useUiStore()
const map = useMapStore()
const chats = useChatsStore()
const router = useRouter()

const story = computed(() => ui.selectedStory)
const status = computed(() =>
  story.value?.online
    ? { text: 'Online now', color: 'var(--ml-success)' }
    : { text: 'Last seen recently', color: 'var(--ml-ink-3)' },
)

function message() {
  const current = story.value
  ui.closeStory()
  chats.startFromStory(current)
  router.push('/chats')
}
function viewProfile() {
  ui.closeStory()
  ui.showToast('Profile — coming soon')
}
function report() {
  ui.closeStory()
  ui.showToast('Reported')
}
function hide() {
  const current = story.value
  ui.closeStory()
  map.hideStory(current.id)
  ui.showToast('Hidden from your map')
}
</script>

<template>
  <div v-if="story" class="story-scrim" @click="ui.closeStory()">
    <div class="story-sheet" @click.stop>
      <div class="grabber" />

      <div class="story-top">
        <div class="story-avatar" :style="{ background: story.gradient }">
          <span>{{ story.mono }}</span>
          <span v-if="story.online" class="story-online" />
        </div>
        <div class="story-id">
          <div class="story-name-row">
            <span class="story-name">{{ story.name }}</span>
            <span class="story-age">{{ story.age }}</span>
          </div>
          <div class="story-meta">
            <span class="story-dist">{{ story.dist }} away</span>
            <span class="dot" />
            <span class="story-status" :style="{ color: status.color }">{{ status.text }}</span>
          </div>
        </div>
        <button type="button" class="story-close" aria-label="Close" @click="ui.closeStory()">
          <svg width="14" height="14" viewBox="0 0 24 24">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <div class="story-place-row">
        <span class="place-pill">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M12 21c5-5 7-8.5 7-12a7 7 0 1 0-14 0c0 3.5 2 7 7 12z" stroke="#5a4ff6" stroke-width="2" stroke-linejoin="round" />
            <circle cx="12" cy="9" r="2.2" stroke="#5a4ff6" stroke-width="2" />
          </svg>
          {{ story.place }}
        </span>
        <span class="story-time">posted {{ story.posted }}</span>
      </div>

      <p class="story-text">{{ story.text }}</p>

      <div class="story-media" :class="{ 'story-media--photo': story.image }">
        <img v-if="story.image" :src="story.image" alt="Story photo" class="story-img" />
        <span v-else class="media-tag">story photo</span>
      </div>

      <div class="story-actions">
        <button type="button" class="primary-btn" @click="message">Message</button>
        <button type="button" class="glass-btn" @click="viewProfile">View profile</button>
      </div>
      <div class="story-actions story-actions--secondary">
        <button type="button" class="ghost-btn" @click="report">Report</button>
        <button type="button" class="ghost-btn" @click="hide">Hide this user</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.story-scrim {
  position: fixed;
  inset: 0;
  z-index: 140;
  background: rgba(60, 46, 110, 0.28);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.story-sheet {
  width: 100%;
  max-width: 460px;
  max-height: 92vh;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(34px) saturate(160%);
  -webkit-backdrop-filter: blur(34px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-bottom: none;
  border-radius: 30px 30px 0 0;
  padding: 14px 22px 28px;
  box-shadow: 0 -20px 50px rgba(96, 73, 168, 0.22);
  animation: mlUp 0.28s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
.grabber {
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: rgba(90, 70, 150, 0.2);
  margin: 0 auto 16px;
}

.story-top {
  display: flex;
  align-items: center;
  gap: 14px;
}
.story-avatar {
  position: relative;
  flex: none;
  width: 58px;
  height: 58px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 23px;
  color: #fff;
}
.story-online {
  position: absolute;
  right: -3px;
  bottom: -3px;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: var(--ml-online);
  border: 3px solid #fff;
}
.story-id {
  flex: 1;
  min-width: 0;
}
.story-name-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.story-name {
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 20px;
  color: var(--ml-ink-1);
}
.story-age {
  font-size: 15px;
  color: var(--ml-ink-3);
}
.story-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 3px;
  font-size: 12.5px;
  color: #7c7493;
}
.story-dist {
  font-weight: 700;
  color: var(--ml-eyebrow);
}
.dot {
  width: 3px;
  height: 3px;
  border-radius: 999px;
  background: #c3bbd4;
}
.story-status {
  font-weight: 700;
}
.story-close {
  flex: none;
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

.story-place-row {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: #7c7493;
}
.place-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 700;
  color: var(--ml-accent-ink-soft);
  background: rgba(139, 124, 246, 0.12);
  padding: 5px 11px;
  border-radius: 999px;
}
.story-text {
  font-size: 15px;
  color: #3e3656;
  line-height: 1.55;
  margin: 13px 0 0;
  text-wrap: pretty;
}
.story-media {
  margin-top: 14px;
  height: 120px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  background-image: repeating-linear-gradient(
    135deg,
    rgba(139, 124, 246, 0.1) 0 10px,
    rgba(236, 127, 182, 0.08) 10px 20px
  );
  display: flex;
  align-items: center;
  justify-content: center;
}
.story-media--photo {
  height: 240px;
  background-image: none;
  overflow: hidden;
}
.story-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.media-tag {
  font-family: var(--ml-font-display);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #9a93ad;
  background: rgba(255, 255, 255, 0.7);
  padding: 5px 11px;
  border-radius: 999px;
}

.story-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}
.story-actions--secondary {
  margin-top: 9px;
}
.primary-btn {
  flex: 1;
  border: none;
  background: var(--ml-accent-gradient);
  color: #fff;
  border-radius: 14px;
  padding: 13px 0;
  cursor: pointer;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 14px;
  box-shadow: 0 10px 24px rgba(139, 124, 246, 0.4);
}
.glass-btn {
  flex: 1;
  border: 1px solid rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.55);
  color: var(--ml-accent-ink-soft);
  border-radius: 14px;
  padding: 13px 0;
  cursor: pointer;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 14px;
}
.ghost-btn {
  flex: 1;
  border: none;
  background: rgba(120, 100, 170, 0.08);
  color: #8b83a0;
  border-radius: 12px;
  padding: 10px 0;
  cursor: pointer;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 13px;
}
</style>
