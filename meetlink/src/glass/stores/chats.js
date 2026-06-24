import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { apiFetch, authHeaders } from '../api'
import { useAuthStore } from './auth'

const SKINS = {
  violet: 'linear-gradient(135deg,#8b7cf6,#6d5de0)',
  pink: 'linear-gradient(135deg,#f2749b,#ec7fb6)',
  blue: 'linear-gradient(135deg,#5aa6f2,#3f86e0)',
  green: 'linear-gradient(135deg,#3fbf95,#34b38a)',
  amber: 'linear-gradient(135deg,#f5a65b,#ef8e3e)',
  teal: 'linear-gradient(135deg,#56c7c0,#3fb0a8)',
}
const SKIN_LIST = Object.values(SKINS)

function mono(name) {
  return String(name || '?').trim().slice(0, 1).toUpperCase()
}

let msgSeq = 1000
function nextId() {
  return ++msgSeq
}

// The story being replied to, stashed by startFromStory so the next sent message
// can render the quoted-story block ("You replied to X's story").
let pendingReplyStory = null

// Backend source → Glass source badge (Story / Request).
function mapSource(source) {
  return source === 'request' ? 'request' : 'story'
}

// Which side of the conversation the logged-in user is on.
function viewerSide(row) {
  const myId = useAuthStore().user?.profileId
  if (myId && row.guest_profile_id === myId) return 'guest'
  return 'owner'
}

// The OTHER person (name + online), from the viewer's perspective.
function counterpart(row, side) {
  return side === 'owner'
    ? { name: row.guest_name || row.guest_nickname || 'Someone', online: row.guest_status === 'online' }
    : { name: row.owner_name || row.owner_nickname || 'Someone', online: row.owner_status === 'online' }
}

// My / the other person's last-read timestamps, from the viewer's perspective.
function readTimes(row, side) {
  return {
    myRead: side === 'owner' ? row.owner_last_read_at : row.guest_last_read_at,
    otherRead: side === 'owner' ? row.guest_last_read_at : row.owner_last_read_at,
  }
}

// Unread = the last message is from the OTHER side and newer than I last read.
function isUnread(row, side, myRead) {
  if (!row.last_sender || row.last_sender === side) return false
  if (!row.last_message_at) return true
  return !myRead || new Date(row.last_message_at) > new Date(myRead)
}

function mapConversation(row, index) {
  const side = viewerSide(row)
  const other = counterpart(row, side)
  const { myRead, otherRead } = readTimes(row, side)
  return {
    id: row.id,
    remote: true,
    side,
    myRead,
    otherRead,
    name: other.name,
    mono: mono(other.name),
    gradient: SKIN_LIST[index % SKIN_LIST.length],
    online: other.online,
    source: mapSource(row.source),
    contact: row.contact || '',
    unread: isUnread(row, side, myRead) ? 1 : 0,
    blocked: !!row.blocked,
    lastMessage: row.last_message || '',
    messages: [],
    loaded: false,
  }
}

// A message is "me" when its sender matches my side. My messages are "seen" once the
// other person's last-read time is at/after when the message was sent.
function mapMessage(row, side = 'owner', otherRead = null) {
  const mine = row.sender === side
  return {
    id: row.id,
    sender: mine ? 'me' : 'them',
    text: row.body,
    at: row.created_at,
    seen: mine && !!otherRead && !!row.created_at && new Date(row.created_at) <= new Date(otherRead),
  }
}

const SEED = [
  {
    id: 'c1',
    name: 'Mara',
    skin: 'violet',
    online: true,
    source: 'story',
    unread: 0,
    messages: [
      { id: 1, sender: 'them', text: 'hey! you were the one reading by the window? ☕' },
      { id: 2, sender: 'me', text: 'haha yeah that was me 📖' },
      { id: 3, sender: 'them', text: 'small world. coffee here tomorrow then?' },
    ],
  },
  {
    id: 'c2',
    name: 'Elena',
    skin: 'pink',
    online: true,
    source: 'request',
    unread: 2,
    messages: [
      { id: 4, sender: 'them', text: 'That was me with the pencils 😄' },
      { id: 5, sender: 'them', text: 'free for a coffee this week?' },
    ],
  },
  {
    id: 'c3',
    name: 'Davis',
    skin: 'blue',
    online: false,
    source: 'story',
    unread: 0,
    messages: [
      { id: 6, sender: 'me', text: 'welcome to Vilnius! the ramen near the cathedral is the move' },
      { id: 7, sender: 'them', text: 'amazing, thanks — heading there tonight 🍜' },
    ],
  },
  {
    id: 'c4',
    name: 'Sofia',
    skin: 'amber',
    online: true,
    source: 'request',
    unread: 1,
    messages: [{ id: 8, sender: 'them', text: 'green jacket here! thursday evening works for me' }],
  },
]

export const useChatsStore = defineStore('chats', () => {
  const conversations = ref(
    SEED.map((c) => ({ ...c, mono: mono(c.name), gradient: SKINS[c.skin] || SKINS.violet })),
  )
  const activeId = ref(null)
  const search = ref('')
  const tab = ref('all') // 'all' | 'stories' | 'requests' | 'unread'
  const draft = ref('')

  const activeConversation = computed(
    () => conversations.value.find((c) => c.id === activeId.value) || null,
  )

  function lastMessage(conversation) {
    const list = conversation.messages
    if (list.length) return list[list.length - 1].text
    return conversation.lastMessage || ''
  }

  const filtered = computed(() => {
    const q = search.value.trim().toLowerCase()
    return conversations.value.filter((c) => {
      if (tab.value === 'stories' && c.source !== 'story') return false
      if (tab.value === 'requests' && c.source !== 'request') return false
      if (tab.value === 'unread' && !c.unread) return false
      if (q && !(c.name.toLowerCase().includes(q) || lastMessage(c).toLowerCase().includes(q)))
        return false
      return true
    })
  })

  const unreadTotal = computed(() => conversations.value.reduce((sum, c) => sum + (c.unread || 0), 0))

  // Load the owner's conversations from the backend. Merge over the current list so a
  // background refresh never wipes the messages of a thread that's already open/loaded.
  async function load() {
    try {
      const rows = await apiFetch('/messages/conversations', { headers: authHeaders() })
      const prev = new Map(conversations.value.map((c) => [c.id, c]))
      conversations.value = rows.map((row, i) => {
        const mapped = mapConversation(row, i)
        const existing = prev.get(row.id)
        if (existing?.loaded) {
          mapped.messages = existing.messages
          mapped.loaded = true
          mapped.otherRead = existing.otherRead ?? mapped.otherRead
        }
        return mapped
      })
    } catch {
      // keep seeded conversations if the backend is unreachable
    }
  }

  // Pull in a single conversation we don't have yet (e.g. a brand-new request chat),
  // WITHOUT rebuilding the whole list — rebuilding would clear the open thread.
  async function addRemoteConversation(id) {
    if (!id || conversations.value.some((c) => c.id === id)) return
    try {
      const row = await apiFetch(`/messages/conversations/${id}`, { headers: authHeaders() })
      receiveConversation(row)
    } catch {
      // ignore — it'll show up on the next manual load
    }
  }

  async function selectChat(id, { read = true } = {}) {
    activeId.value = id
    const conversation = conversations.value.find((c) => c.id === id)
    if (!conversation) return
    if (conversation.remote && !conversation.loaded) {
      try {
        const data = await apiFetch(`/messages/conversations/${id}`, { headers: authHeaders() })
        conversation.otherRead = readTimes(data, conversation.side).otherRead
        conversation.messages = (data.messages || []).map((m) =>
          mapMessage(m, conversation.side, conversation.otherRead),
        )
        conversation.loaded = true
      } catch {
        // leave messages empty on failure
      }
    }
    // Only count as read when actually viewing — not on auto-select or a background tab.
    if (read && (typeof document === 'undefined' || document.visibilityState === 'visible')) {
      markRead(id)
    }
  }

  // Mark a conversation read: clears its unread and records my last-read time.
  async function markRead(id) {
    const conversation = conversations.value.find((c) => c.id === id)
    if (!conversation) return
    conversation.unread = 0
    if (!conversation.remote) return
    try {
      const data = await apiFetch(`/messages/conversations/${id}/read`, {
        method: 'PATCH',
        headers: authHeaders(),
      })
      conversation.myRead = readTimes(data, conversation.side).myRead || new Date().toISOString()
    } catch {
      conversation.myRead = new Date().toISOString()
    }
  }
  function backToList() {
    activeId.value = null
  }
  function setTab(next) {
    tab.value = next
  }

  async function sendMessage() {
    const conversation = activeConversation.value
    const text = draft.value.trim()
    if (!conversation || !text) return

    const local = { id: nextId(), sender: 'me', text, at: new Date().toISOString(), seen: false }
    // First reply after opening a story → show the quoted story above this message.
    if (pendingReplyStory) {
      local.replyStory = { ...pendingReplyStory, mine: true }
      pendingReplyStory = null
    }
    conversation.messages.push(local)
    conversation.lastMessage = text
    draft.value = ''

    if (!conversation.remote) {
      // First message in a story-initiated chat → create the real conversation.
      try {
        const created = await apiFetch('/messages/conversations', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            guestNickname: conversation.nickname || conversation.name,
            source: conversation.source === 'request' ? 'request' : 'map',
            contact: conversation.contact || undefined,
            sender: 'owner',
            body: text,
          }),
        })
        conversation.id = created.id
        conversation.remote = true
        conversation.loaded = true
        conversation.side = 'owner'
        conversation.otherRead = readTimes(created, 'owner').otherRead
        conversation.source = mapSource(created.source)
        // Replace just the optimistic message with the server's — KEEP earlier messages
        // (e.g. the request reply) instead of wiping the whole thread.
        const serverMsg = (created.messages || [])[0]
        const idx = conversation.messages.indexOf(local)
        if (serverMsg && idx !== -1) {
          const mapped = mapMessage(serverMsg, 'owner', conversation.otherRead)
          if (local.replyStory) mapped.replyStory = local.replyStory // keep the quoted story
          conversation.messages.splice(idx, 1, mapped)
        }
        if (activeId.value !== created.id) activeId.value = created.id
      } catch {
        // keep the optimistic local message if creation fails
      }
      return
    }

    try {
      const created = await apiFetch(`/messages/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ sender: conversation.side || 'owner', body: text }),
      })
      const index = conversation.messages.indexOf(local)
      if (index !== -1) {
        // The socket echo may have already added the server message — avoid a duplicate.
        if (conversation.messages.some((m) => m.id === created.id)) conversation.messages.splice(index, 1)
        else {
          const mapped = mapMessage(created, conversation.side, conversation.otherRead)
          if (local.replyStory) mapped.replyStory = local.replyStory // keep the quoted story
          conversation.messages.splice(index, 1, mapped)
        }
      }
    } catch {
      // keep the optimistic message if the send fails
    }
  }

  // ----- Realtime (socket) -----
  function receiveMessage(payload) {
    const convId = payload?.conversation_id
    const raw = payload?.message
    if (!convId || !raw) return
    const conversation = conversations.value.find((c) => c.id === convId)
    if (!conversation) {
      // Unknown conversation — fetch just that one; do NOT reload the whole list
      // (a full reload would blank out whichever chat is currently open).
      addRemoteConversation(convId)
      return
    }
    const msg = mapMessage(raw, conversation.side, conversation.otherRead)
    conversation.lastMessage = msg.text
    if (conversation.loaded && !conversation.messages.some((m) => m.id === msg.id)) {
      conversation.messages.push(msg)
    }
    if (msg.sender === 'them') {
      const viewingNow =
        activeId.value === convId &&
        (typeof document === 'undefined' || document.visibilityState === 'visible')
      if (viewingNow) markRead(convId)
      else conversation.unread = (conversation.unread || 0) + 1
    }
  }

  // Realtime: the other person read the chat → my sent messages flip to "Seen".
  function receiveRead(payload) {
    const convId = payload?.conversation_id
    const side = payload?.side
    if (!convId || !side) return
    const conversation = conversations.value.find((c) => c.id === convId)
    if (!conversation || side === conversation.side) return
    conversation.otherRead = new Date().toISOString()
    conversation.messages.forEach((m) => {
      if (m.sender === 'me') m.seen = true
    })
  }

  function receiveConversation(row) {
    if (!row?.id || conversations.value.some((c) => c.id === row.id)) return
    const side = viewerSide(row)
    const other = counterpart(row, side)
    const { myRead, otherRead } = readTimes(row, side)
    const messages = (row.messages || []).map((m) => mapMessage(m, side, otherRead))
    const last = messages[messages.length - 1]
    conversations.value.unshift({
      id: row.id,
      remote: true,
      side,
      myRead,
      otherRead,
      name: other.name,
      mono: mono(other.name),
      gradient: SKIN_LIST[conversations.value.length % SKIN_LIST.length],
      online: other.online,
      source: mapSource(row.source),
      unread: last && last.sender === 'them' ? 1 : 0,
      lastMessage: last ? last.text : '',
      messages,
      loaded: true,
    })
  }

  function deleteChat(id) {
    const index = conversations.value.findIndex((c) => c.id === id)
    if (index !== -1) conversations.value.splice(index, 1)
    if (activeId.value === id) activeId.value = null
  }

  async function setBlocked(id, blocked) {
    const conversation = conversations.value.find((c) => c.id === id)
    if (!conversation) return
    conversation.blocked = blocked // optimistic
    if (!conversation.remote) return
    try {
      await apiFetch(`/messages/conversations/${id}/${blocked ? 'block' : 'unblock'}`, {
        method: 'PATCH',
        headers: authHeaders(),
      })
    } catch {
      conversation.blocked = !blocked // revert on failure
    }
  }

  // Open an existing conversation with this person, or start a fresh one from a map story.
  function startFromStory(story) {
    // Remember which story this is, so the reply shows the quoted-story block.
    pendingReplyStory =
      story && (story.text || story.image)
        ? { name: story.name, snippet: story.text || 'Photo story', gradient: story.gradient || '' }
        : null
    const existing = conversations.value.find(
      (c) => c.name.toLowerCase() === String(story.name).toLowerCase(),
    )
    if (existing) {
      selectChat(existing.id)
      return existing.id
    }
    const conversation = {
      id: `c-${story.id}-${nextId()}`,
      side: 'owner',
      name: story.name,
      nickname: story.nickname || story.name,
      mono: mono(story.name),
      gradient: story.gradient,
      online: !!story.online,
      source: 'story',
      unread: 0,
      messages: [],
    }
    conversations.value.unshift(conversation)
    selectChat(conversation.id)
    return conversation.id
  }

  // Open (or create) a thread for a request reply — keeps their contact + first message.
  function startFromRequest(reply) {
    // If this reply already has a real conversation, open that one.
    if (reply.conversationId) {
      const linked = conversations.value.find((c) => c.id === reply.conversationId)
      if (linked) {
        selectChat(linked.id, { read: false })
        return linked.id
      }
    }
    const existing = conversations.value.find(
      (c) => c.source === 'request' && c.name === reply.name && c.contact === (reply.contact || ''),
    )
    if (existing) {
      selectChat(existing.id, { read: false })
      return existing.id
    }
    const conversation = {
      id: `req-${reply.id}-${nextId()}`,
      side: 'owner',
      name: reply.name || 'Someone',
      nickname: reply.name || 'Someone',
      contact: reply.contact || '',
      mono: mono(reply.name),
      gradient: reply.gradient || SKIN_LIST[conversations.value.length % SKIN_LIST.length],
      online: false,
      source: 'request',
      unread: 0,
      messages:
        reply.message && reply.message !== 'Opened your link.'
          ? [{ id: nextId(), sender: 'them', text: reply.message, at: new Date().toISOString(), seen: false }]
          : [],
    }
    conversations.value.unshift(conversation)
    selectChat(conversation.id, { read: false })
    return conversation.id
  }

  return {
    conversations,
    activeId,
    search,
    tab,
    draft,
    activeConversation,
    filtered,
    unreadTotal,
    lastMessage,
    load,
    selectChat,
    markRead,
    backToList,
    setTab,
    sendMessage,
    deleteChat,
    setBlocked,
    startFromStory,
    startFromRequest,
    receiveMessage,
    receiveConversation,
    receiveRead,
  }
})
