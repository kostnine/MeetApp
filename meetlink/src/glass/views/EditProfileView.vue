<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, Camera, X } from '@lucide/vue'
import { useMeStore } from '../stores/me'
import { useUiStore } from '../stores/ui'
import MeAvatar from '../components/MeAvatar.vue'

const me = useMeStore()
const ui = useUiStore()
const router = useRouter()

const newInterest = ref('')
const fileInput = ref(null)

function pickPhoto() {
  fileInput.value?.click()
}
async function onFile(event) {
  const file = event.target.files?.[0]
  if (file) {
    const error = await me.setDraftAvatar(file)
    if (error) ui.showToast(error)
  }
  event.target.value = ''
}

const editToggles = [
  { key: 'showOnMap', label: 'Show me on the map', sub: 'People nearby can find you' },
  { key: 'allowMessages', label: 'Allow messages', sub: 'Let people start a chat with you' },
  { key: 'contactsAfterApproval', label: 'Contacts after approval', sub: 'Reveal contacts only when you accept' },
]

// Snapshot the profile into the draft on entry (covers deep-links to /profile/edit).
onMounted(() => me.startEdit())

function cancel() {
  router.push({ name: 'profile' })
}
function save() {
  me.saveEdit()
  ui.showToast('Profile saved')
  router.push({ name: 'profile' })
}
function addInterest() {
  me.addDraftInterest(newInterest.value)
  newInterest.value = ''
}
</script>

<template>
  <div class="profile ml-scroll">
    <div class="profile-inner">
      <button type="button" class="back-btn" @click="cancel">
        <ChevronLeft :size="16" /> Cancel
      </button>

      <div class="profile-card ml-panel">
        <div class="edit-title">Edit profile</div>

        <div class="edit-avatar-row">
          <button type="button" class="edit-avatar" aria-label="Upload avatar" @click="pickPhoto">
            <MeAvatar :avatar="me.draft.avatar" :mono="me.draftMono" :gradient="me.gradient" />
            <span class="camera-badge"><Camera :size="14" /></span>
          </button>
          <input ref="fileInput" type="file" accept="image/*" class="file-input" @change="onFile" />
          <div class="edit-avatar-hint">
            Tap the photo to upload a new avatar.<br />JPG or PNG, square works best.
            <button v-if="me.draft.avatar" type="button" class="remove-photo" @click="me.clearDraftAvatar()">
              Remove photo
            </button>
          </div>
        </div>

        <div class="edit-grid">
          <div class="edit-field grow">
            <div class="field-label">NICKNAME</div>
            <div class="input-box"><input v-model="me.draft.name" class="bare-input" /></div>
          </div>
          <div class="edit-field age">
            <div class="field-label">AGE</div>
            <div class="input-box"><input v-model="me.draft.age" class="bare-input" inputmode="numeric" /></div>
          </div>
        </div>

        <div class="field-label">CITY / AREA</div>
        <div class="input-box"><input v-model="me.draft.city" class="bare-input" /></div>

        <div class="field-label">BIO</div>
        <textarea v-model="me.draft.bio" class="ml-textarea" />

        <div class="field-label">INTERESTS</div>
        <div class="interest-chips">
          <span v-for="tag in me.draft.interests" :key="tag" class="interest-chip interest-chip--editable">
            {{ tag }}
            <button type="button" class="chip-remove" :aria-label="`Remove ${tag}`" @click="me.removeDraftInterest(tag)">
              <X :size="10" />
            </button>
          </span>
        </div>
        <div class="add-interest">
          <div class="input-box grow">
            <input
              v-model="newInterest"
              class="bare-input"
              placeholder="Add an interest…"
              @keydown.enter="addInterest"
            />
          </div>
          <button type="button" class="soft-btn" @click="addInterest">Add</button>
        </div>

        <div class="field-label">CONTACTS</div>
        <div class="contacts-stack">
          <div class="contact-row">
            <span class="contact-label">Instagram</span>
            <input v-model="me.draft.instagram" class="bare-input" />
          </div>
          <div class="contact-row">
            <span class="contact-label">Telegram</span>
            <input v-model="me.draft.telegram" class="bare-input" />
          </div>
          <div class="contact-row">
            <span class="contact-label">Phone</span>
            <input v-model="me.draft.phone" class="bare-input" />
          </div>
        </div>

        <div class="field-label">VISIBILITY</div>
        <div class="toggle-stack">
          <button
            v-for="t in editToggles"
            :key="t.key"
            type="button"
            class="toggle-row"
            @click="me.draft[t.key] = !me.draft[t.key]"
          >
            <div>
              <div class="toggle-label">{{ t.label }}</div>
              <div class="toggle-sub">{{ t.sub }}</div>
            </div>
            <span class="toggle-track" :class="{ 'toggle-track--on': me.draft[t.key] }">
              <span class="toggle-knob" />
            </span>
          </button>
        </div>

        <div class="edit-actions">
          <button type="button" class="glass-btn act-grow" @click="cancel">Cancel</button>
          <button type="button" class="primary-btn act-save" @click="save">Save changes</button>
        </div>
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
  padding: 24px;
  box-shadow: 0 14px 40px rgba(96, 73, 168, 0.13);
}
.field-label {
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--ml-eyebrow);
  margin: 16px 0 7px;
}
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: none;
  background: none;
  cursor: pointer;
  color: #8b83a0;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 13.5px;
  padding: 0;
  margin-bottom: 14px;
}
.edit-title {
  font-family: var(--ml-font-display);
  font-size: 21px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: var(--ml-ink-1);
}
.edit-avatar-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 18px;
}
.edit-avatar {
  position: relative;
  flex: none;
  width: 72px;
  height: 72px;
  border-radius: 22px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 30px;
  color: #fff;
}
.camera-badge {
  position: absolute;
  right: -4px;
  bottom: -4px;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid rgba(120, 100, 180, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(96, 73, 168, 0.18);
  color: var(--ml-accent-ink);
}
.edit-avatar-hint {
  font-size: 13px;
  color: #7c7493;
  line-height: 1.5;
}
.file-input {
  display: none;
}
.remove-photo {
  display: inline-block;
  margin-top: 6px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 0;
  font-family: var(--ml-font-body);
  font-size: 12.5px;
  font-weight: 700;
  color: var(--ml-danger);
}
.edit-grid {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  flex-wrap: wrap;
}
.edit-field.grow {
  flex: 1;
  min-width: 160px;
}
.edit-field.age {
  flex: none;
  width: 100px;
}
.edit-field .field-label {
  margin: 0 0 7px;
}
.input-box {
  border: 1px solid rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.6);
  border-radius: 13px;
  padding: 12px 14px;
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
.ml-textarea {
  width: 100%;
  min-height: 90px;
  resize: none;
  border: 1px solid rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.6);
  border-radius: 13px;
  padding: 13px;
  color: var(--ml-ink-1);
  font-family: var(--ml-font-body);
  font-size: 15px;
  line-height: 1.5;
  outline: none;
}
.interest-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.interest-chip--editable {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 700;
  color: var(--ml-accent-ink-soft);
  background: rgba(139, 124, 246, 0.12);
  border-radius: 999px;
  padding: 8px 10px 8px 14px;
}
.chip-remove {
  border: none;
  background: rgba(90, 79, 158, 0.16);
  border-radius: 999px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--ml-accent-ink-soft);
}
.add-interest {
  display: flex;
  gap: 9px;
  margin-top: 10px;
}
.input-box.grow {
  flex: 1;
}
.soft-btn {
  flex: none;
  border: none;
  cursor: pointer;
  background: rgba(139, 124, 246, 0.14);
  color: var(--ml-accent-ink);
  border-radius: 13px;
  padding: 0 18px;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 14px;
}
.contacts-stack {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.contact-row {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.6);
  border-radius: 13px;
  padding: 12px 14px;
}
.contact-label {
  font-size: 12px;
  font-weight: 800;
  color: var(--ml-eyebrow);
  width: 64px;
  flex: none;
}
.toggle-stack {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.5);
  border-radius: 14px;
  padding: 13px 15px;
  cursor: pointer;
  text-align: left;
}
.toggle-label {
  font-size: 14px;
  font-weight: 700;
  color: var(--ml-ink-1);
}
.toggle-sub {
  font-size: 12px;
  color: #8b83a0;
  margin-top: 2px;
}
.toggle-track {
  width: 44px;
  height: 26px;
  border-radius: 999px;
  background: #cdc6dd;
  position: relative;
  flex: none;
  transition: background 0.2s;
}
.toggle-track--on {
  background: var(--ml-accent-gradient);
}
.toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: left 0.2s;
}
.toggle-track--on .toggle-knob {
  left: 21px;
}
.edit-actions {
  display: flex;
  gap: 10px;
  margin-top: 22px;
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
  background: rgba(255, 255, 255, 0.4);
  color: #6b6385;
  border-radius: 14px;
  padding: 14px 0;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 14.5px;
}
.act-grow {
  flex: 1;
}
.act-save {
  flex: 1.4;
}
</style>
