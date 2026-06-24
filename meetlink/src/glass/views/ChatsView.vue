<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Search, ChevronLeft, MoreHorizontal, Plus, ArrowUp, MessageSquare, MapPin, Link2, Mail } from '@lucide/vue'
import { useChatsStore } from '../stores/chats'
import { useUiStore } from '../stores/ui'

const chats = useChatsStore()
const ui = useUiStore()

const chatTabs = [
  { key: 'all', label: 'All' },
  { key: 'stories', label: 'Stories' },
  { key: 'requests', label: 'Requests' },
  { key: 'unread', label: 'Unread' },
]

const showList = computed(() => ui.isDesktop || !chats.activeConversation)
const showDetail = computed(() => ui.isDesktop || !!chats.activeConversation)
const listWidth = computed(() => (ui.isDesktop ? '340px' : '100%'))

function badge(conversation) {
  return conversation.source === 'story' ? 'Story' : 'Request'
}
// Short centered context pill.
const sourceText = computed(() => {
  const c = chats.activeConversation
  if (!c) return ''
  if (c.replyStory) return c.replyStory.mine ? 'You replied to a story' : 'Replied to your story'
  return c.source === 'story' ? 'Started from a map story' : 'Started from a request note'
})
// Full directional label shown above the quoted story.
const replyStoryLabel = computed(() => {
  const r = chats.activeConversation?.replyStory
  if (!r) return ''
  return r.mine ? `You replied to ${r.name}’s story` : `${r.name} replied to your story`
})

// On desktop keep a conversation open in the right pane — but DON'T mark it read
// (otherwise a backgrounded/auto-selected chat would swallow the unread indicator).
function ensureSelection() {
  if (ui.isDesktop && !chats.activeId && chats.conversations.length) {
    chats.selectChat(chats.conversations[0].id, { read: false })
  }
}
// Mark the open chat read only when the tab is actually visible/focused.
function markActiveRead() {
  if (chats.activeId && document.visibilityState === 'visible') chats.markRead(chats.activeId)
}
onMounted(() => {
  ensureSelection()
  document.addEventListener('visibilitychange', markActiveRead)
  window.addEventListener('focus', markActiveRead)
})
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', markActiveRead)
  window.removeEventListener('focus', markActiveRead)
})
watch(() => ui.isDesktop, ensureSelection)

// Sent / Seen status under my latest message.
const lastStatus = computed(() => {
  const msgs = chats.activeConversation?.messages
  if (!msgs?.length) return ''
  const last = msgs[msgs.length - 1]
  if (last.sender !== 'me') return ''
  return last.seen ? 'Seen' : 'Sent'
})

function open(conversation) {
  chats.selectChat(conversation.id)
}

async function copyConvContact() {
  const c = chats.activeConversation?.contact
  if (!c) return
  const ok = await ui.copyText(c)
  ui.showToast(ok ? 'Contact copied' : c)
}

// Auto-scroll the message list to the newest message.
const msgRef = ref(null)
function scrollToBottom() {
  nextTick(() => {
    if (msgRef.value) msgRef.value.scrollTop = msgRef.value.scrollHeight
  })
}
watch(() => chats.activeConversation?.messages.length, scrollToBottom)
watch(() => chats.activeId, scrollToBottom)

// ⋯ menu
const menuOpen = ref(false)
function menuAction(kind) {
  menuOpen.value = false
  const conversation = chats.activeConversation
  if (kind === 'delete') {
    chats.deleteChat(conversation.id)
    ui.showToast('Chat deleted')
  } else if (kind === 'block') {
    chats.setBlocked(conversation.id, true)
    ui.showToast('User blocked')
  } else if (kind === 'unblock') {
    chats.setBlocked(conversation.id, false)
    ui.showToast('Unblocked')
  } else if (kind === 'report') {
    ui.showToast('Reported')
  } else {
    ui.showToast('Opening profile — coming soon')
  }
}
</script>

<template>
  <div class="chats">
    <!-- ============ LIST ============ -->
    <section v-if="showList" class="chat-list ml-panel" :style="{ width: listWidth }">
      <div class="list-head">
        <div class="ml-eyebrow">Messages</div>
        <h1 class="list-title">Chats</h1>
        <div class="search-box">
          <Search :size="17" class="search-icon" />
          <input v-model="chats.search" class="search-input" placeholder="Search chats" />
        </div>
        <div class="chat-tabs ml-scroll">
          <button
            v-for="t in chatTabs"
            :key="t.key"
            type="button"
            class="chip-sm"
            :class="{ 'chip-sm--active': chats.tab === t.key }"
            @click="chats.setTab(t.key)"
          >
            {{ t.label }}
          </button>
        </div>
      </div>

      <div class="list-scroll ml-scroll">
        <button
          v-for="c in chats.filtered"
          :key="c.id"
          type="button"
          class="chat-row"
          :class="{ 'chat-row--active': c.id === chats.activeId }"
          @click="open(c)"
        >
          <div class="row-avatar" :style="{ background: c.gradient }">
            {{ c.mono }}<span v-if="c.online" class="row-online" />
          </div>
          <div class="row-body">
            <div class="row-name-line">
              <span class="row-name">{{ c.name }}</span>
              <span class="src-badge">{{ badge(c) }}</span>
            </div>
            <div class="row-last">{{ chats.lastMessage(c) }}</div>
          </div>
          <span v-if="c.unread" class="row-unread">{{ c.unread }}</span>
        </button>
        <div v-if="!chats.filtered.length" class="list-empty">No chats found</div>
      </div>
    </section>

    <!-- ============ DETAIL ============ -->
    <section v-if="showDetail" class="chat-detail ml-panel">
      <template v-if="chats.activeConversation">
        <header class="detail-head">
          <button
            v-if="!ui.isDesktop"
            type="button"
            class="icon-round"
            aria-label="Back"
            @click="chats.backToList()"
          >
            <ChevronLeft :size="20" />
          </button>
          <div class="detail-avatar" :style="{ background: chats.activeConversation.gradient }">
            {{ chats.activeConversation.mono }}
          </div>
          <div class="detail-id">
            <div class="detail-name">{{ chats.activeConversation.name }}</div>
            <div v-if="chats.activeConversation.online" class="detail-active">Active now</div>
          </div>
          <div class="menu-wrap">
            <button type="button" class="icon-round" aria-label="Menu" @click="menuOpen = !menuOpen">
              <MoreHorizontal :size="18" />
            </button>
            <div v-if="menuOpen" class="menu-catcher" @click="menuOpen = false" />
            <div v-if="menuOpen" class="menu">
              <button type="button" @click="menuAction('profile')">View profile</button>
              <button
                type="button"
                @click="menuAction(chats.activeConversation.blocked ? 'unblock' : 'block')"
              >
                {{ chats.activeConversation.blocked ? 'Unblock' : 'Block' }}
              </button>
              <button type="button" @click="menuAction('report')">Report</button>
              <button type="button" class="menu-danger" @click="menuAction('delete')">Delete chat</button>
            </div>
          </div>
        </header>

        <div ref="msgRef" class="messages ml-scroll">
          <div class="source-pill">
            <MapPin v-if="chats.activeConversation.source === 'story'" :size="12" />
            <Link2 v-else :size="12" />
            {{ sourceText }}
          </div>
          <button
            v-if="chats.activeConversation.contact"
            type="button"
            class="contact-pill"
            title="Copy contact"
            @click="copyConvContact"
          >
            <Mail :size="13" /> {{ chats.activeConversation.contact }}
          </button>

          <!-- the story this chat answers — anchored to the reply's side -->
          <div
            v-if="chats.activeConversation.replyStory"
            class="story-reply"
            :class="chats.activeConversation.replyStory.mine ? 'story-reply--me' : 'story-reply--them'"
          >
            <div class="story-reply-label">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M9 14L4 9l5-5M4 9h9a7 7 0 0 1 7 7v3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              {{ replyStoryLabel }}
            </div>
            <div class="story-reply-quote">
              <span
                class="story-reply-bar"
                :style="{ background: chats.activeConversation.replyStory.mine ? '#8b7cf6' : '#ec7fb6' }"
              />
              <div
                class="story-reply-thumb"
                :style="{ background: chats.activeConversation.replyStory.gradient || 'rgba(139,124,246,.2)' }"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="3" stroke="rgba(255,255,255,.85)" stroke-width="2"/><circle cx="8.5" cy="10" r="1.5" stroke="rgba(255,255,255,.85)" stroke-width="2"/><path d="M4 17l5-4 4 3 3-2 4 3" stroke="rgba(255,255,255,.85)" stroke-width="2" stroke-linejoin="round"/></svg>
              </div>
              <div class="story-reply-text">{{ chats.activeConversation.replyStory.snippet }}</div>
            </div>
          </div>

          <div
            v-for="m in chats.activeConversation.messages"
            :key="m.id"
            class="msg-row"
            :class="m.sender === 'me' ? 'msg-row--me' : 'msg-row--them'"
          >
            <div class="bubble" :class="m.sender === 'me' ? 'bubble--me' : 'bubble--them'">{{ m.text }}</div>
          </div>
          <div v-if="lastStatus" class="msg-status">{{ lastStatus }}</div>
        </div>

        <div v-if="chats.activeConversation.blocked" class="blocked-bar">
          <span>You blocked this person.</span>
          <button type="button" @click="chats.setBlocked(chats.activeConversation.id, false)">Unblock</button>
        </div>
        <div v-else class="composer">
          <button type="button" class="icon-round" aria-label="Attach"><Plus :size="20" /></button>
          <input
            v-model="chats.draft"
            class="composer-input"
            placeholder="Message…"
            @keydown.enter="chats.sendMessage()"
          />
          <button type="button" class="send-btn" aria-label="Send" @click="chats.sendMessage()">
            <ArrowUp :size="22" />
          </button>
        </div>
      </template>

      <div v-else class="detail-empty">
        <div class="empty-icon"><MessageSquare :size="30" /></div>
        <div class="empty-title">Pick a conversation</div>
        <div class="empty-sub">Your chats from stories and request replies live here.</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.chats {
  /* Bound to the viewport so the message list scrolls internally, not the page. */
  height: 100vh;
  height: 100dvh;
  min-height: 0;
  display: flex;
  gap: 14px;
  padding: 18px;
}

/* ===== List pane ===== */
.chat-list {
  flex: none;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-radius: 24px;
  overflow: hidden;
}
.list-head {
  flex: none;
  padding: 18px 18px 12px;
}
.list-title {
  font-family: var(--ml-font-display);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: var(--ml-ink-1);
  margin: 2px 0 0;
}
.search-box {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 13px;
  border: 1px solid rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.6);
  border-radius: 13px;
  padding: 11px 13px;
}
.search-icon {
  color: var(--ml-ink-3);
  flex: none;
}
.search-input {
  width: 100%;
  border: none;
  outline: none;
  background: none;
  color: var(--ml-ink-1);
  font-family: var(--ml-font-body);
  font-size: 14px;
}
.chat-tabs {
  display: flex;
  gap: 7px;
  margin-top: 12px;
  overflow: auto;
}
.chip-sm {
  flex: none;
  border: 1px solid rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.55);
  color: #6b6385;
  border-radius: 999px;
  padding: 7px 13px;
  cursor: pointer;
  font-family: var(--ml-font-body);
  font-size: 12.5px;
  font-weight: 700;
  white-space: nowrap;
  transition: background 0.16s ease, color 0.16s ease, border-color 0.16s ease;
}
.chip-sm--active {
  border-color: rgba(139, 124, 246, 0.5);
  background: rgba(139, 124, 246, 0.14);
  color: var(--ml-accent-ink);
}
.list-scroll {
  flex: 1;
  overflow: auto;
  padding: 0 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.chat-row {
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px;
  border-radius: 16px;
  background: transparent;
  border: 1px solid transparent;
  transition: background 0.16s ease, border-color 0.16s ease;
}
.chat-row:hover {
  background: rgba(255, 255, 255, 0.5);
}
.chat-row--active {
  background: rgba(139, 124, 246, 0.12);
  border-color: rgba(139, 124, 246, 0.28);
}
.row-avatar,
.detail-avatar {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-family: var(--ml-font-display);
  font-weight: 700;
}
.row-avatar {
  width: 48px;
  height: 48px;
  border-radius: 15px;
  font-size: 19px;
}
.row-online {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: var(--ml-online);
  border: 2.5px solid #fff;
}
.row-body {
  flex: 1;
  min-width: 0;
}
.row-name-line {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}
.row-name {
  font-family: var(--ml-font-display);
  font-weight: 600;
  font-size: 15px;
  color: var(--ml-ink-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.src-badge {
  flex: none;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ml-accent-ink-soft);
  background: rgba(139, 124, 246, 0.12);
  border-radius: 999px;
  padding: 2px 7px;
}
.row-last {
  font-size: 12.5px;
  color: #7c7493;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}
.row-unread {
  flex: none;
  min-width: 20px;
  height: 20px;
  border-radius: 999px;
  background: var(--ml-accent-gradient);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
}
.list-empty {
  padding: 24px 12px;
  text-align: center;
  font-size: 13.5px;
  color: var(--ml-ink-3);
}

/* ===== Detail pane ===== */
.chat-detail {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-radius: 24px;
  overflow: hidden;
}
.detail-head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(120, 100, 180, 0.12);
}
.icon-round {
  flex: none;
  border: none;
  background: rgba(120, 100, 170, 0.1);
  border-radius: 999px;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #7c7493;
}
.icon-round:hover {
  background: rgba(120, 100, 170, 0.16);
}
.detail-avatar {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  font-size: 17px;
}
.detail-id {
  flex: 1;
  min-width: 0;
}
.detail-name {
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 17px;
  color: var(--ml-ink-1);
}
.detail-active {
  font-size: 12px;
  color: var(--ml-success);
  font-weight: 700;
}
.menu-wrap {
  position: relative;
  flex: none;
}
.menu-catcher {
  position: fixed;
  inset: 0;
  z-index: 40;
}
.menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 50;
  min-width: 168px;
  display: flex;
  flex-direction: column;
  padding: 6px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(30px) saturate(160%);
  -webkit-backdrop-filter: blur(30px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 18px 44px rgba(96, 73, 168, 0.22);
}
.menu button {
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  padding: 11px 13px;
  border-radius: 11px;
  font-family: var(--ml-font-body);
  font-size: 14px;
  font-weight: 700;
  color: var(--ml-ink-2);
}
.menu button:hover {
  background: rgba(139, 124, 246, 0.1);
}
.menu-danger {
  color: var(--ml-danger) !important;
}
.menu-danger:hover {
  background: rgba(236, 80, 100, 0.08) !important;
}

.messages {
  flex: 1;
  overflow: auto;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.source-pill {
  align-self: center;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: #7c7493;
  background: rgba(139, 124, 246, 0.1);
  padding: 6px 14px;
  border-radius: 999px;
  margin-bottom: 4px;
}
.source-pill svg {
  color: var(--ml-accent-ink);
}
.contact-pill {
  align-self: center;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(139, 124, 246, 0.4);
  background: rgba(139, 124, 246, 0.08);
  color: var(--ml-accent-ink);
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 13px;
  padding: 8px 16px;
  border-radius: 999px;
  cursor: pointer;
  margin-bottom: 8px;
}
.contact-pill:hover {
  background: rgba(139, 124, 246, 0.16);
}
.msg-row {
  display: flex;
}
.msg-row--me {
  justify-content: flex-end;
}
.msg-row--them {
  justify-content: flex-start;
}
.story-reply {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 74%;
  margin-bottom: 4px;
}
.story-reply--them {
  align-self: flex-start;
  align-items: flex-start;
}
.story-reply--me {
  align-self: flex-end;
  align-items: flex-end;
}
.story-reply-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  color: var(--ml-ink-3);
  padding: 0 4px;
}
.story-reply-quote {
  display: flex;
  align-items: stretch;
  gap: 9px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.75);
  padding: 8px 11px 8px 9px;
}
.story-reply-bar {
  flex: none;
  width: 4px;
  border-radius: 999px;
}
.story-reply-thumb {
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.story-reply-text {
  align-self: center;
  font-size: 12.5px;
  color: #7c7493;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-wrap: pretty;
}
.bubble {
  max-width: 74%;
  padding: 11px 15px;
  font-size: 14.5px;
  line-height: 1.4;
  text-wrap: pretty;
  word-break: break-word;
  box-shadow: 0 4px 14px rgba(96, 73, 168, 0.08);
}
.bubble--me {
  background: var(--ml-accent-gradient);
  color: #fff;
  border-radius: 18px 18px 5px 18px;
}
.bubble--them {
  background: rgba(255, 255, 255, 0.8);
  color: var(--ml-ink-1);
  border-radius: 18px 18px 18px 5px;
}
.msg-status {
  align-self: flex-end;
  font-size: 11px;
  font-weight: 700;
  color: var(--ml-ink-3);
  margin-top: -2px;
  padding-right: 4px;
}

.composer {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-top: 1px solid rgba(120, 100, 180, 0.12);
}
.blocked-bar {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-top: 1px solid rgba(120, 100, 180, 0.12);
  font-size: 13.5px;
  color: var(--ml-ink-2);
}
.blocked-bar button {
  border: 1px solid rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.55);
  color: var(--ml-accent-ink-soft);
  border-radius: 11px;
  padding: 8px 16px;
  cursor: pointer;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 13px;
}
.composer .icon-round {
  width: 40px;
  height: 40px;
}
.composer-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 999px;
  padding: 13px 17px;
  font-family: var(--ml-font-body);
  font-size: 15px;
  color: var(--ml-ink-1);
}
.send-btn {
  flex: none;
  width: 46px;
  height: 46px;
  border-radius: 999px;
  border: none;
  background: var(--ml-accent-gradient);
  box-shadow: 0 8px 20px rgba(139, 124, 246, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
}

.detail-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 30px;
}
.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: rgba(139, 124, 246, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ml-violet);
}
.empty-title {
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 18px;
  color: var(--ml-ink-1);
  margin-top: 14px;
}
.empty-sub {
  font-size: 13.5px;
  color: #7c7493;
  margin-top: 6px;
  line-height: 1.5;
  max-width: 240px;
}

@media (max-width: 999px) {
  .chats {
    height: calc(100dvh - 92px); /* room for the fixed bottom nav */
    padding: 14px;
  }
}
</style>
