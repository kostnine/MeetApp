import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { apiFetch, authHeaders } from '../api'

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

// Backend source → Glass source badge (Story / Request).
function mapSource(source) {
  return source === 'request' ? 'request' : 'story'
}

function mapConversation(row, index) {
  return {
    id: row.id,
    remote: true,
    name: row.guest_nickname || 'Guest',
    mono: mono(row.guest_nickname),
    gradient: SKIN_LIST[index % SKIN_LIST.length],
    online: false,
    source: mapSource(row.source),
    unread: row.last_sender && row.last_sender !== 'owner' ? 1 : 0,
    blocked: !!row.blocked,
    lastMessage: row.last_message || '',
    messages: [],
    loaded: false,
  }
}

function mapMessage(row) {
  return { id: row.id, sender: row.sender === 'owner' ? 'me' : 'them', text: row.body }
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

  // Load the owner's conversations from the backend.
  async function load() {
    try {
      const rows = await apiFetch('/messages/conversations', { headers: authHeaders() })
      conversations.value = rows.map((row, i) => mapConversation(row, i))
    } catch {
      // keep seeded conversations if the backend is unreachable
    }
  }

  async function selectChat(id) {
    activeId.value = id
    const conversation = conversations.value.find((c) => c.id === id)
    if (!conversation) return
    conversation.unread = 0
    if (conversation.remote && !conversation.loaded) {
      try {
        const data = await apiFetch(`/messages/conversations/${id}`, { headers: authHeaders() })
        conversation.messages = (data.messages || []).map(mapMessage)
        conversation.loaded = true
      } catch {
        // leave messages empty on failure
      }
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

    const local = { id: nextId(), sender: 'me', text }
    conversation.messages.push(local)
    conversation.lastMessage = text
    draft.value = ''

    if (!conversation.remote) {
      // First message in a story-initiated chat → create the real conversation.
      try {
        const created = await apiFetch('/messages/conversations', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ guestNickname: conversation.name, source: 'map', sender: 'owner', body: text }),
        })
        conversation.id = created.id
        conversation.remote = true
        conversation.loaded = true
        conversation.source = mapSource(created.source)
        const serverMsgs = (created.messages || []).map(mapMessage)
        if (serverMsgs.length) conversation.messages = serverMsgs
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
        body: JSON.stringify({ sender: 'owner', body: text }),
      })
      const index = conversation.messages.indexOf(local)
      if (index !== -1) {
        // The socket echo may have already added the server message — avoid a duplicate.
        if (conversation.messages.some((m) => m.id === created.id)) conversation.messages.splice(index, 1)
        else conversation.messages.splice(index, 1, mapMessage(created))
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
      load() // unknown conversation — refresh the list
      return
    }
    const msg = mapMessage(raw)
    conversation.lastMessage = msg.text
    if (conversation.loaded && !conversation.messages.some((m) => m.id === msg.id)) {
      conversation.messages.push(msg)
    }
    if (msg.sender === 'them' && activeId.value !== convId) {
      conversation.unread = (conversation.unread || 0) + 1
    }
  }

  function receiveConversation(row) {
    if (!row?.id || conversations.value.some((c) => c.id === row.id)) return
    const messages = (row.messages || []).map(mapMessage)
    const last = messages[messages.length - 1]
    conversations.value.unshift({
      id: row.id,
      remote: true,
      name: row.guest_nickname || 'Guest',
      mono: mono(row.guest_nickname),
      gradient: SKIN_LIST[conversations.value.length % SKIN_LIST.length],
      online: false,
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
    const existing = conversations.value.find(
      (c) => c.name.toLowerCase() === String(story.name).toLowerCase(),
    )
    if (existing) {
      selectChat(existing.id)
      return existing.id
    }
    const conversation = {
      id: `c-${story.id}-${nextId()}`,
      name: story.name,
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
    backToList,
    setTab,
    sendMessage,
    deleteChat,
    setBlocked,
    startFromStory,
    receiveMessage,
    receiveConversation,
  }
})
