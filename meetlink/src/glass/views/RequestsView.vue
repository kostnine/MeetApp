<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, MessageSquare, ChevronLeft, Mail, Link2, Check } from '@lucide/vue'
import { useRequestsStore } from '../stores/requests'
import { useMeStore } from '../stores/me'
import { useUiStore } from '../stores/ui'
import { useChatsStore } from '../stores/chats'
import QrImage from '../components/QrImage.vue'

const requests = useRequestsStore()
const me = useMeStore()
const ui = useUiStore()
const chats = useChatsStore()
const router = useRouter()

const ANON_GRADIENT = 'linear-gradient(135deg,#b9b2d6,#8d85ad)'

const displayOpts = [
  { key: 'profile', label: 'My profile' },
  { key: 'anonymous', label: 'Anonymous' },
  { key: 'custom', label: 'Custom name' },
]
const placeOpts = ['Bar', 'Cafe', 'Street', 'Event', 'Other']
const expiryOpts = [
  { key: '1h', label: '1 hour' },
  { key: '24h', label: '24 hours' },
  { key: '7d', label: '7 days' },
  { key: 'never', label: 'Never' },
]

const tabs = computed(() => [
  { key: 'mine', label: 'My requests', count: requests.counts.mine },
  { key: 'incoming', label: 'Incoming', count: requests.counts.incoming },
  { key: 'archived', label: 'Archived', count: requests.counts.archived },
])

function mono(name) {
  return String(name || '?').trim().slice(0, 1).toUpperCase()
}

function statusBadge(request) {
  if (request.status === 'active') return { text: 'Active', color: '#1fb98c', bg: 'rgba(52,217,168,.14)' }
  return { text: 'Expired', color: '#9c95b0', bg: 'rgba(120,100,170,.1)' }
}
function replyBadge(response) {
  if (response.status === 'accepted') return { text: 'Accepted', color: '#1fb98c', bg: 'rgba(52,217,168,.14)' }
  return { text: 'New reply', color: '#5a4ff6', bg: 'rgba(139,124,246,.14)' }
}

// The original request this reply answered (shown as a quoted snippet on the card).
function reqSnippet(response) {
  const req = requests.requests.find((q) => q.id === response.requestId)
  return req?.message || ''
}

// Turn the single stored contact string into a labelled, copyable chip.
function contactChips(response) {
  const raw = String(response.contact || '').trim()
  if (!raw) return []
  const low = raw.toLowerCase()
  let label = 'Contact'
  if (low.includes('t.me') || low.includes('telegram')) label = 'Telegram'
  else if (/^[+0-9][0-9\s()\-]{4,}$/.test(raw)) label = 'Phone'
  else if (raw.startsWith('@') || low.includes('instagram')) label = 'Instagram'
  else if (raw.includes('@') && raw.includes('.')) label = 'Email'
  return [{ label, value: raw }]
}
function replyBorder(response) {
  if (response.status === 'accepted') return 'rgba(52,217,168,.3)'
  return 'rgba(139,124,246,.28)'
}

// ----- live preview (create form) -----
const previewName = computed(() => {
  if (requests.draft.display === 'profile') return me.profile.name
  if (requests.draft.display === 'custom') return requests.draft.customName.trim() || 'Someone'
  return 'Someone nearby'
})
const previewMono = computed(() => mono(previewName.value))
const previewGradient = computed(() =>
  requests.draft.display === 'profile' ? me.gradient : ANON_GRADIENT,
)
const previewMessage = computed(
  () => requests.draft.message.trim() || 'Your note will appear here as the other person sees it.',
)

// ----- actions -----
async function copyLink(code) {
  await ui.copyText(requests.urlFor(code))
  ui.showToast('Link copied')
}
async function share(code) {
  const url = requests.urlFor(code)
  if (navigator.share) {
    try {
      await navigator.share({ title: 'meetlink request', url })
      return
    } catch {
      /* dismissed */
    }
  }
  await ui.copyText(url)
  ui.showToast('Link copied')
}

// Start chat = accept the reply and open the conversation.
function startChat(response) {
  requests.acceptResponse(response)
  chats.startFromRequest(response)
  router.push('/chats')
}
function archive(response) {
  requests.archiveResponse(response)
  ui.showToast('Archived')
}
async function copyValue(text) {
  const ok = await ui.copyText(text)
  ui.showToast(ok ? 'Copied' : text || '')
}
function saveContact(response) {
  const all = contactChips(response).map((c) => c.value).join('\n')
  if (!all) {
    ui.showToast('No contact was left')
    return
  }
  ui.copyText(all)
  ui.showToast('Contact copied')
}
function openChat(response) {
  chats.startFromRequest(response)
  router.push('/chats')
}
function previewPublic() {
  router.push(`/r/${requests.generated.code}`)
}

// ----- done-state copy -----
const doneCopied = ref(false)
let doneTimer = null
async function copyGenerated() {
  await ui.copyText(requests.urlFor(requests.generated.code))
  doneCopied.value = true
  if (doneTimer) clearTimeout(doneTimer)
  doneTimer = setTimeout(() => {
    doneCopied.value = false
  }, 1500)
}
</script>

<template>
  <div class="requests ml-scroll">
    <div class="requests-inner">
      <!-- ===================== LIST ===================== -->
      <template v-if="requests.mode === 'list'">
        <header class="req-header">
          <div>
            <div class="ml-eyebrow">Request notes</div>
            <h1 class="ml-title">Your requests</h1>
          </div>
          <button type="button" class="primary-btn new-btn" @click="requests.startCreate()">
            <Plus :size="17" /> New request
          </button>
        </header>

        <div class="req-tabs">
          <button
            v-for="t in tabs"
            :key="t.key"
            type="button"
            class="chip"
            :class="{ 'chip--active': requests.tab === t.key }"
            @click="requests.setTab(t.key)"
          >
            {{ t.label }} <span class="chip-count">{{ t.count }}</span>
          </button>
        </div>

        <!-- My requests -->
        <div v-if="requests.tab === 'mine'" class="req-stack">
          <article v-for="r in requests.mineList" :key="r.id" class="mine-card ml-panel">
            <div class="qr-thumb"><QrImage :value="requests.urlFor(r.code)" :margin="1" /></div>
            <div class="mine-body">
              <div class="mine-meta">
                <span
                  class="badge"
                  :style="{ color: statusBadge(r).color, background: statusBadge(r).bg }"
                  >{{ statusBadge(r).text }}</span
                >
                <span class="mine-created">{{ r.created }}</span>
              </div>
              <p class="mine-message">{{ r.message }}</p>
              <div class="mine-row">
                <span class="mine-link">{{ requests.linkFor(r.code) }}</span>
                <span class="replies-pill">
                  <MessageSquare :size="12" /> {{ requests.repliesFor(r.id) }} replies
                </span>
              </div>
              <div class="mine-actions">
                <button type="button" class="btn btn--soft" @click="ui.openQr(r)">Open QR</button>
                <button type="button" class="btn btn--glass" @click="copyLink(r.code)">Copy link</button>
                <button type="button" class="btn btn--glass" @click="share(r.code)">Share</button>
              </div>
            </div>
          </article>
        </div>

        <!-- Incoming -->
        <div v-else-if="requests.tab === 'incoming'" class="req-stack">
          <div v-if="!requests.incomingList.length" class="empty">
            <div class="empty-icon"><MessageSquare :size="28" /></div>
            <div class="empty-title">No replies yet</div>
            <div class="empty-sub">Share your link or QR — replies land here.</div>
          </div>
          <article
            v-for="r in requests.incomingList"
            :key="r.id"
            class="reply-card ml-panel"
            :style="{ borderColor: replyBorder(r) }"
          >
            <div class="reply-head">
              <div class="reply-avatar" :style="{ background: r.gradient }">{{ mono(r.name) }}</div>
              <div class="reply-id">
                <div class="reply-name-row">
                  <span class="reply-name">{{ r.name }}</span>
                  <span v-if="r.age" class="reply-age">{{ r.age }}</span>
                  <span
                    class="badge"
                    :style="{ color: replyBadge(r).color, background: replyBadge(r).bg }"
                    >{{ replyBadge(r).text }}</span
                  >
                </div>
                <div class="reply-when">Replied {{ r.time }}</div>
              </div>
            </div>

            <!-- which request they replied to -->
            <div v-if="reqSnippet(r)" class="reply-quote">
              <span class="reply-quote-bar" />
              <div class="reply-quote-body">
                <div class="reply-quote-label">In reply to your request</div>
                <div class="reply-quote-text">{{ reqSnippet(r) }}</div>
              </div>
            </div>

            <!-- their message -->
            <div class="reply-section-label">THEIR MESSAGE</div>
            <p class="reply-message">{{ r.message }}</p>

            <!-- contacts they left -->
            <template v-if="contactChips(r).length">
              <div class="reply-section-label">CONTACTS THEY LEFT</div>
              <div class="contact-chips">
                <div v-for="(c, i) in contactChips(r)" :key="i" class="contact-chip">
                  <div class="contact-chip-icon"><Mail :size="16" /></div>
                  <div class="contact-chip-body">
                    <div class="contact-chip-label">{{ c.label }}</div>
                    <div class="contact-chip-value">{{ c.value }}</div>
                  </div>
                  <button type="button" class="contact-chip-copy" @click="copyValue(c.value)">Copy</button>
                </div>
              </div>
            </template>

            <div class="reply-actions">
              <template v-if="r.status === 'new'">
                <button type="button" class="btn btn--primary" @click="startChat(r)">Start chat</button>
                <button type="button" class="btn btn--glass" @click="saveContact(r)">Save contact</button>
                <button type="button" class="btn btn--ghost" @click="archive(r)">Archive</button>
              </template>
              <button v-else type="button" class="btn btn--outline" @click="openChat(r)">Open chat</button>
            </div>
          </article>
        </div>

        <!-- Archived -->
        <div v-else class="req-stack">
          <div v-if="!requests.archivedList.length" class="empty">
            <div class="empty-icon"><MessageSquare :size="28" /></div>
            <div class="empty-title">Nothing archived</div>
            <div class="empty-sub">Expired and archived requests show up here.</div>
          </div>
          <article v-for="r in requests.archivedList" :key="r.id" class="archived-card">
            <div class="mine-meta">
              <span class="badge badge--muted">{{ r.status === 'expired' ? 'Expired' : 'Archived' }}</span>
              <span class="mine-created">{{ r.created }}</span>
            </div>
            <p class="archived-message">{{ r.message }}</p>
          </article>
        </div>
      </template>

      <!-- ===================== CREATE ===================== -->
      <template v-else-if="requests.mode === 'create'">
        <button type="button" class="back-btn" @click="requests.backToList()">
          <ChevronLeft :size="16" /> Back to requests
        </button>

        <div class="create-row">
          <div class="create-card ml-panel">
            <div class="create-title">Create a request</div>
            <div class="create-sub">A note someone opens via your link or QR.</div>

            <div class="field-label">YOUR NOTE</div>
            <textarea
              v-model="requests.draft.message"
              class="ml-textarea"
              placeholder="Hi, I saw you at the bar and you seemed interesting. If you'd like, you can answer here…"
            />

            <div class="field-label">SHOW YOURSELF AS</div>
            <div class="chip-group">
              <button
                v-for="o in displayOpts"
                :key="o.key"
                type="button"
                class="chip"
                :class="{ 'chip--active': requests.draft.display === o.key }"
                @click="requests.draft.display = o.key"
              >
                {{ o.label }}
              </button>
            </div>
            <input
              v-if="requests.draft.display === 'custom'"
              v-model="requests.draft.customName"
              class="ml-input custom-name"
              placeholder="Name they'll see"
            />

            <div class="field-label">CONTEXT / PLACE</div>
            <div class="chip-group">
              <button
                v-for="p in placeOpts"
                :key="p"
                type="button"
                class="chip"
                :class="{ 'chip--active': requests.draft.place === p }"
                @click="requests.draft.place = p"
              >
                {{ p }}
              </button>
            </div>

            <div class="field-label">LINK EXPIRES</div>
            <div class="chip-group">
              <button
                v-for="e in expiryOpts"
                :key="e.key"
                type="button"
                class="chip"
                :class="{ 'chip--active': requests.draft.expiry === e.key }"
                @click="requests.draft.expiry = e.key"
              >
                {{ e.label }}
              </button>
            </div>

            <div class="field-label">HOW THEY REACH YOU</div>
            <div class="input-with-icon">
              <Mail :size="18" class="input-icon" />
              <input
                v-model="requests.draft.contact"
                class="bare-input"
                placeholder="Instagram, Telegram or phone"
              />
            </div>

            <button type="button" class="primary-btn generate-btn" @click="requests.generate()">
              <Link2 :size="19" /> Generate link &amp; QR
            </button>
          </div>

          <aside v-if="ui.isDesktop" class="preview-col">
            <div class="field-label preview-label">PREVIEW · WHAT THEY SEE</div>
            <div class="preview-card">
              <div class="preview-avatar" :style="{ background: previewGradient }">{{ previewMono }}</div>
              <div class="preview-name">{{ previewName }}</div>
              <div class="preview-tag">wants to meet up nearby</div>
              <p class="preview-message">{{ previewMessage }}</p>
            </div>
            <div class="preview-note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 22s7-4.5 7-11V5l-7-3-7 3v6c0 6.5 7 11 7 11z" stroke="#8b83a0" stroke-width="2" stroke-linejoin="round" />
              </svg>
              Shown on your request page so people can reach you directly — leave it blank to only chat in-app.
            </div>
          </aside>
        </div>
      </template>

      <!-- ===================== DONE ===================== -->
      <template v-else>
        <div class="done">
          <div class="done-check"><Check :size="28" /></div>
          <div class="done-title">Your request is live</div>
          <div class="done-sub">Show the QR or share the link. Replies land in your Incoming tab.</div>

          <div class="done-qr-wrap">
            <div class="done-qr"><QrImage :value="requests.urlFor(requests.generated.code)" :margin="2" /></div>
          </div>

          <div class="done-link-field">
            <span class="done-link">{{ requests.linkFor(requests.generated.code) }}</span>
            <button type="button" class="btn btn--soft done-copy" @click="copyGenerated">
              {{ doneCopied ? 'Copied' : 'Copy' }}
            </button>
          </div>

          <button type="button" class="ghost-wide" @click="previewPublic">Preview public page</button>
          <div class="done-actions">
            <button type="button" class="ghost-wide flex1" @click="requests.startCreate()">Create another</button>
            <button type="button" class="primary-btn flex1" @click="requests.viewIncoming()">View replies</button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.requests {
  flex: 1;
  overflow: auto;
}
.requests-inner {
  max-width: 720px;
  margin: 0 auto;
  padding: 22px 18px 28px;
}

/* Header */
.req-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}
.primary-btn {
  border: none;
  cursor: pointer;
  background: var(--ml-accent-gradient);
  color: #fff;
  font-family: var(--ml-font-body);
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.new-btn {
  border-radius: 14px;
  padding: 12px 18px;
  font-size: 14px;
  box-shadow: 0 10px 24px rgba(139, 124, 246, 0.4);
}

/* Tabs / chips */
.req-tabs {
  display: flex;
  gap: 8px;
  margin: 18px 0 16px;
  flex-wrap: wrap;
}
.chip {
  border: 1px solid rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.55);
  color: #6b6385;
  border-radius: 999px;
  padding: 9px 16px;
  cursor: pointer;
  font-family: var(--ml-font-body);
  font-size: 13px;
  font-weight: 700;
  transition: background 0.16s ease, color 0.16s ease, border-color 0.16s ease;
}
.chip--active {
  border-color: rgba(139, 124, 246, 0.5);
  background: rgba(139, 124, 246, 0.14);
  color: var(--ml-accent-ink);
}
.chip-count {
  opacity: 0.7;
  font-size: 12px;
}

.req-stack {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

/* Badges */
.badge {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border-radius: 999px;
  padding: 3px 9px;
}
.badge--muted {
  color: #9c95b0;
  background: rgba(120, 100, 170, 0.1);
}

/* Buttons */
.btn {
  border: none;
  cursor: pointer;
  border-radius: 11px;
  padding: 9px 15px;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 12.5px;
}
.btn--soft {
  background: rgba(139, 124, 246, 0.14);
  color: var(--ml-accent-ink);
}
.btn--glass {
  border: 1px solid rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.55);
  color: #6b6385;
}
.btn--primary {
  background: var(--ml-accent-gradient);
  color: #fff;
  padding: 10px 20px;
  border-radius: 12px;
  font-size: 13px;
  box-shadow: 0 8px 20px rgba(139, 124, 246, 0.35);
}
.btn--ghost {
  background: rgba(120, 100, 170, 0.08);
  color: #8b83a0;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 13px;
}
.btn--outline {
  border: 1px solid rgba(139, 124, 246, 0.5);
  background: rgba(139, 124, 246, 0.1);
  color: var(--ml-accent-ink);
  padding: 10px 20px;
  border-radius: 12px;
  font-size: 13px;
}

/* My-request card */
.mine-card {
  border-radius: 22px;
  padding: 18px;
  display: flex;
  gap: 16px;
}
.qr-thumb {
  flex: none;
  width: 74px;
  height: 74px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid rgba(120, 100, 180, 0.14);
  padding: 7px;
  box-shadow: 0 4px 12px rgba(96, 73, 168, 0.1);
}
.mine-body {
  flex: 1;
  min-width: 0;
}
.mine-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mine-created {
  font-size: 12px;
  color: var(--ml-ink-3);
}
.mine-message {
  margin: 9px 0 0;
  font-size: 14.5px;
  color: #3e3656;
  line-height: 1.5;
  text-wrap: pretty;
}
.mine-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 11px;
  flex-wrap: wrap;
}
.mine-link {
  font-family: var(--ml-font-display);
  font-size: 12.5px;
  font-weight: 700;
  color: var(--ml-eyebrow);
}
.replies-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  color: var(--ml-accent-ink-soft);
  background: rgba(139, 124, 246, 0.1);
  border-radius: 999px;
  padding: 4px 10px;
}
.mine-actions {
  display: flex;
  gap: 8px;
  margin-top: 13px;
  flex-wrap: wrap;
}

/* Reply card */
.reply-card {
  border-radius: 20px;
  padding: 16px 18px;
}
.reply-head {
  display: flex;
  align-items: flex-start;
  gap: 13px;
}
.reply-avatar {
  flex: none;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 18px;
  color: #fff;
}
.reply-id {
  flex: 1;
  min-width: 0;
}
.reply-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.reply-name {
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 16px;
  color: var(--ml-ink-1);
}
.reply-contact {
  font-size: 12.5px;
  color: var(--ml-eyebrow);
  font-weight: 700;
  margin-top: 3px;
}
.reply-contact--btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: none;
  background: rgba(139, 124, 246, 0.1);
  color: var(--ml-accent-ink);
  border-radius: 999px;
  padding: 4px 11px;
  cursor: pointer;
  font-family: var(--ml-font-body);
}
.reply-contact--btn:hover {
  background: rgba(139, 124, 246, 0.18);
}
.reply-age {
  font-size: 14px;
  color: var(--ml-ink-3);
}
.reply-when {
  font-size: 12px;
  font-weight: 600;
  color: var(--ml-ink-3);
  margin-top: 3px;
}
.reply-quote {
  display: flex;
  align-items: stretch;
  gap: 9px;
  margin-top: 13px;
  border-radius: 13px;
  background: rgba(139, 124, 246, 0.07);
  border: 1px solid rgba(139, 124, 246, 0.16);
  padding: 9px 12px 9px 10px;
}
.reply-quote-bar {
  flex: none;
  width: 3px;
  border-radius: 999px;
  background: var(--ml-violet);
}
.reply-quote-body {
  min-width: 0;
}
.reply-quote-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ml-eyebrow);
}
.reply-quote-text {
  font-size: 12.5px;
  color: #7c7493;
  line-height: 1.4;
  margin-top: 2px;
  text-wrap: pretty;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.reply-section-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ml-eyebrow);
  margin: 15px 0 7px;
}
.reply-message {
  margin: 0;
  font-size: 14.5px;
  color: #3e3656;
  line-height: 1.55;
  text-wrap: pretty;
}
.contact-chips {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.contact-chip {
  display: flex;
  align-items: center;
  gap: 11px;
  border: 1px solid rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.62);
  border-radius: 13px;
  padding: 10px 11px;
}
.contact-chip-icon {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(139, 124, 246, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ml-accent-ink);
}
.contact-chip-body {
  flex: 1;
  min-width: 0;
}
.contact-chip-label {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ml-eyebrow);
}
.contact-chip-value {
  font-family: var(--ml-font-display);
  font-size: 14.5px;
  font-weight: 600;
  color: var(--ml-ink-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.contact-chip-copy {
  flex: none;
  border: none;
  cursor: pointer;
  background: rgba(139, 124, 246, 0.14);
  color: var(--ml-accent-ink);
  border-radius: 10px;
  padding: 8px 13px;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 12.5px;
}
.reply-actions {
  display: flex;
  gap: 9px;
  margin-top: 13px;
  flex-wrap: wrap;
}

/* Archived */
.archived-card {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.6);
  padding: 16px 18px;
  opacity: 0.85;
}
.archived-message {
  margin: 9px 0 0;
  font-size: 14px;
  color: #7c7493;
  line-height: 1.5;
  text-wrap: pretty;
}

/* Empty states */
.empty {
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9c95b0;
}
.empty-title {
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 17px;
  color: var(--ml-ink-1);
  margin-top: 14px;
}
.empty-sub {
  font-size: 13.5px;
  color: #7c7493;
  margin-top: 6px;
  line-height: 1.5;
}

/* Create form */
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
.create-row {
  display: flex;
  gap: 22px;
  align-items: flex-start;
  flex-wrap: wrap;
}
.create-card {
  flex: 1;
  min-width: 280px;
  border-radius: 24px;
  padding: 22px;
}
.create-title {
  font-family: var(--ml-font-display);
  font-size: 21px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: var(--ml-ink-1);
}
.create-sub {
  font-size: 13px;
  color: #7c7493;
  margin-top: 3px;
}
.field-label {
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--ml-eyebrow);
  margin: 18px 0 8px;
}
.ml-textarea {
  width: 100%;
  min-height: 120px;
  resize: none;
  border: 1px solid rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.6);
  border-radius: 15px;
  padding: 15px;
  color: var(--ml-ink-1);
  font-family: var(--ml-font-body);
  font-size: 15.5px;
  line-height: 1.5;
  outline: none;
}
.chip-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.chip-group .chip {
  border-radius: 12px;
  padding: 10px 15px;
}
.ml-input {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.6);
  border-radius: 13px;
  padding: 12px 14px;
  color: var(--ml-ink-1);
  font-family: var(--ml-font-body);
  font-size: 15px;
  outline: none;
}
.custom-name {
  margin-top: 9px;
}
.input-with-icon {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.6);
  border-radius: 13px;
  padding: 13px 14px;
}
.input-icon {
  color: var(--ml-eyebrow);
  flex: none;
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
.generate-btn {
  width: 100%;
  margin-top: 22px;
  border-radius: 15px;
  padding: 16px 0;
  font-size: 15.5px;
  box-shadow: 0 12px 28px rgba(139, 124, 246, 0.42);
}

/* Preview column */
.preview-col {
  flex: none;
  width: 300px;
}
.preview-label {
  margin: 0 0 9px;
}
.preview-card {
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 12px 34px rgba(96, 73, 168, 0.12);
  padding: 22px;
  text-align: center;
}
.preview-avatar {
  width: 60px;
  height: 60px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 24px;
  color: #fff;
}
.preview-name {
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 18px;
  color: var(--ml-ink-1);
  margin-top: 12px;
}
.preview-tag {
  font-size: 12.5px;
  color: var(--ml-eyebrow);
  font-weight: 700;
  margin-top: 3px;
}
.preview-message {
  margin: 14px 0 0;
  font-size: 14.5px;
  color: #3e3656;
  line-height: 1.55;
  text-wrap: pretty;
}
.preview-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 13px;
  color: #8b83a0;
  font-size: 12px;
  line-height: 1.5;
}
.preview-note svg {
  flex: none;
  margin-top: 1px;
}

/* Done state */
.done {
  max-width: 430px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 8px;
}
.done-check {
  width: 56px;
  height: 56px;
  border-radius: 999px;
  background: rgba(52, 217, 168, 0.16);
  border: 1px solid rgba(52, 217, 168, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1fb98c;
}
.done-title {
  font-family: var(--ml-font-display);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: var(--ml-ink-1);
  margin-top: 16px;
}
.done-sub {
  font-size: 14px;
  color: #7c7493;
  margin-top: 6px;
  text-align: center;
  max-width: 300px;
  line-height: 1.5;
}
.done-qr-wrap {
  margin-top: 22px;
  padding: 18px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 18px 44px rgba(96, 73, 168, 0.16);
}
.done-qr {
  width: 196px;
  height: 196px;
  padding: 14px;
  background: #fff;
  border-radius: 18px;
}
.done-link-field {
  width: 100%;
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.6);
  border-radius: 14px;
  padding: 6px 6px 6px 16px;
}
.done-link {
  flex: 1;
  min-width: 0;
  font-family: var(--ml-font-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--ml-ink-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.done-copy {
  flex: none;
  padding: 11px 18px;
  font-size: 13px;
}
.ghost-wide {
  width: 100%;
  margin-top: 12px;
  border: 1px solid rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.55);
  color: var(--ml-accent-ink-soft);
  border-radius: 14px;
  padding: 14px 0;
  cursor: pointer;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 14.5px;
}
.done-actions {
  display: flex;
  gap: 10px;
  width: 100%;
  margin-top: 10px;
}
.flex1 {
  flex: 1;
}
.done-actions .primary-btn {
  border-radius: 14px;
  padding: 13px 0;
  font-size: 14px;
  box-shadow: 0 10px 24px rgba(139, 124, 246, 0.4);
}
.done-actions .ghost-wide {
  margin-top: 0;
}
</style>
