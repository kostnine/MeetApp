<script setup>
import { useRouter } from 'vue-router'
import { MapPin, ShieldCheck, LogOut } from '@lucide/vue'
import { useMeStore } from '../stores/me'
import { useUiStore } from '../stores/ui'
import { useAuthStore } from '../stores/auth'
import { useMapStore } from '../stores/map'
import MeAvatar from '../components/MeAvatar.vue'

const me = useMeStore()
const ui = useUiStore()
const auth = useAuthStore()
const map = useMapStore()
const router = useRouter()

function signOut() {
  auth.logout()
  router.push('/welcome')
  ui.showToast('Signed out')
}

function viewMyStory() {
  if (map.hasMyStory) ui.openStoryViewer(map.myStories, 0, true)
  else ui.showToast('No active story yet — post one from the map')
}
</script>

<template>
  <div class="profile ml-scroll">
    <div class="profile-inner">
      <div class="profile-card ml-panel">
        <div class="profile-head">
          <button
            type="button"
            class="profile-avatar"
            :class="{ 'profile-avatar--story': map.hasMyStory }"
            @click="viewMyStory"
          >
            <MeAvatar :avatar="me.profile.avatar" :mono="me.mono" :gradient="me.gradient" />
          </button>
          <div class="profile-id">
            <div class="profile-name-row">
              <span class="profile-name">{{ me.profile.name }}</span>
              <span class="profile-age">{{ me.profile.age }}</span>
            </div>
            <div class="city-pill"><MapPin :size="13" /> {{ me.profile.city }}</div>
          </div>
        </div>

        <p class="profile-bio">{{ me.profile.bio }}</p>

        <div class="field-label">INTERESTS</div>
        <div class="interest-chips">
          <span v-for="tag in me.profile.interests" :key="tag" class="interest-chip">{{ tag }}</span>
        </div>

        <div class="privacy-note">
          <ShieldCheck :size="18" class="privacy-icon" />
          <div>Contacts are shared only after you approve someone. Instagram, Telegram and phone stay hidden until then.</div>
        </div>

        <div class="profile-actions">
          <button type="button" class="primary-btn act-grow" @click="router.push({ name: 'profile-edit' })">
            Edit profile
          </button>
          <button type="button" class="glass-btn act-grow" @click="viewMyStory">
            {{ map.hasMyStory ? 'View my story' : 'My public story' }}
          </button>
          <button type="button" class="glass-btn" @click="router.push('/settings')">Privacy</button>
        </div>

        <button type="button" class="signout-row" @click="signOut">
          <LogOut :size="16" /> Sign out
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile {
  flex: 1;
  overflow: auto;
}
.profile-inner {
  max-width: 600px;
  margin: 0 auto;
  padding: 22px 18px 28px;
}
.profile-card {
  border-radius: 26px;
  padding: 26px;
  box-shadow: 0 14px 40px rgba(96, 73, 168, 0.13);
}
.profile-head {
  display: flex;
  align-items: center;
  gap: 18px;
}
.profile-avatar {
  flex: none;
  width: 84px;
  height: 84px;
  border: none;
  padding: 0;
  cursor: pointer;
  border-radius: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 36px;
  color: #fff;
  box-shadow: 0 12px 30px rgba(139, 124, 246, 0.35);
}
/* Instagram-style "active story" ring when I have a live story. */
.profile-avatar--story {
  background: var(--ml-accent-gradient);
  padding: 4px;
  box-sizing: border-box;
}
.profile-avatar--story :deep(.me-av) {
  box-shadow: 0 0 0 3px #fff;
}
.profile-id {
  flex: 1;
  min-width: 0;
}
.profile-name-row {
  display: flex;
  align-items: baseline;
  gap: 9px;
}
.profile-name {
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 26px;
  letter-spacing: -0.5px;
  color: var(--ml-ink-1);
}
.profile-age {
  font-size: 18px;
  color: var(--ml-ink-3);
}
.city-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--ml-accent-ink-soft);
  font-weight: 700;
  background: rgba(139, 124, 246, 0.1);
  padding: 5px 12px;
  border-radius: 999px;
  margin-top: 7px;
}
.profile-bio {
  margin: 18px 0 0;
  font-size: 15px;
  color: #3e3656;
  line-height: 1.6;
  text-wrap: pretty;
}
.field-label {
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--ml-eyebrow);
  margin: 20px 0 10px;
}
.interest-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.interest-chip {
  font-size: 13px;
  font-weight: 700;
  color: var(--ml-ink-2);
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 999px;
  padding: 8px 14px;
}
.privacy-note {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 20px;
  padding: 14px;
  border-radius: 16px;
  background: rgba(139, 124, 246, 0.07);
  border: 1px solid rgba(139, 124, 246, 0.18);
  font-size: 13px;
  color: var(--ml-ink-2);
  line-height: 1.45;
}
.privacy-icon {
  flex: none;
  color: var(--ml-accent-ink);
}
.profile-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  flex-wrap: wrap;
}
.primary-btn {
  border: none;
  cursor: pointer;
  background: var(--ml-accent-gradient);
  color: #fff;
  border-radius: 14px;
  padding: 14px 0;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 14.5px;
  box-shadow: 0 10px 24px rgba(139, 124, 246, 0.4);
}
.glass-btn {
  border: 1px solid rgba(255, 255, 255, 0.85);
  cursor: pointer;
  background: rgba(255, 255, 255, 0.55);
  color: var(--ml-accent-ink-soft);
  border-radius: 14px;
  padding: 14px 18px;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 14.5px;
}
.act-grow {
  flex: 1;
  min-width: 130px;
}
.signout-row {
  width: 100%;
  margin-top: 16px;
  padding-top: 16px;
  border: none;
  border-top: 1px solid rgba(120, 100, 180, 0.12);
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 14px;
  color: #8b83a0;
}
.signout-row:hover {
  color: var(--ml-danger);
}
</style>
