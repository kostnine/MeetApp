import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { apiFetch, authHeaders } from '../api'
import { useMeStore } from './me'

const LINK_HOST = 'meetlink.app'

function shortDate(value) {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(value))
  } catch {
    return ''
  }
}

/** Map a backend meet_request row → the Glass request shape. */
function mapRequest(row) {
  const displayName =
    row.display_as === 'anonymous'
      ? 'Someone nearby'
      : row.display_as === 'custom'
        ? row.custom_name || 'Someone'
        : row.owner_name || 'Someone'
  return {
    id: row.id,
    code: row.code,
    message: row.message,
    displayName,
    anonymous: row.display_as === 'anonymous',
    place: row.place || '',
    contact: row.contact || '',
    status: row.status === 'active' ? 'active' : 'expired',
    created: shortDate(row.created_at),
  }
}

/** Map a backend meet_request_response → the Glass reply shape. */
function mapResponse(row, requestId, index) {
  return {
    id: row.id,
    requestId,
    name: row.alias || 'Someone',
    contact: row.contact || '',
    time: shortDate(row.created_at) || 'just now',
    message: row.message || '',
    status: row.status,
    conversationId: row.conversation_id || null,
    gradient: REPLY_SKINS[index % REPLY_SKINS.length],
  }
}

/** Gradient skins for incoming reply avatars. */
const REPLY_SKINS = [
  'linear-gradient(135deg,#f2749b,#ec7fb6)',
  'linear-gradient(135deg,#5aa6f2,#3f86e0)',
  'linear-gradient(135deg,#3fbf95,#34b38a)',
  'linear-gradient(135deg,#8b7cf6,#6d5de0)',
  'linear-gradient(135deg,#f5a65b,#ef8e3e)',
]

function makeCode() {
  return Math.random().toString(36).slice(2, 8)
}

function emptyDraft() {
  return {
    message: '',
    display: 'profile', // 'profile' | 'anonymous' | 'custom'
    customName: '',
    place: 'Bar',
    expiry: '24h', // '1h' | '24h' | '7d' | 'never'
    contact: '',
  }
}

const SEED_REQUESTS = [
  {
    id: 'r1',
    code: 'k7m2qp',
    message:
      'Hi — I saw you at Coffee Hill this morning, sketching by the window. If you’d like, say hi here.',
    displayName: 'Kostnine',
    anonymous: false,
    place: 'Coffee Hill',
    status: 'active',
    created: '2h ago',
  },
  {
    id: 'r2',
    code: 'a9x4tt',
    message:
      'At the jazz night on Saturday — would’ve loved to actually talk. If that was you in the green jacket, drop a line?',
    displayName: 'Kostnine',
    anonymous: false,
    place: 'Jazz club',
    status: 'active',
    created: 'yesterday',
  },
  {
    id: 'r3',
    code: 'z2p0lm',
    message: 'Looking for a tennis partner around Old Town this week. Beginner-friendly!',
    displayName: 'Kostnine',
    anonymous: false,
    place: 'Old Town',
    status: 'expired',
    created: '5 days ago',
  },
]

const SEED_RESPONSES = [
  {
    id: 'in1',
    requestId: 'r1',
    name: 'Elena',
    contact: '@elena.k',
    time: '12m ago',
    message: 'That was me with the pencils 😄 your guess is right. Happy to grab a coffee sometime.',
    status: 'new',
  },
  {
    id: 'in2',
    requestId: 'r1',
    name: 'Marius',
    contact: 't.me/marius',
    time: '1h ago',
    message: 'Was this near the cathedral? Pretty sure I saw you too.',
    status: 'new',
  },
  {
    id: 'in3',
    requestId: 'r2',
    name: 'Sofia',
    contact: '@sofia',
    time: 'yesterday',
    message: 'Green jacket here! Yes let’s actually meet — free Thursday evening?',
    status: 'accepted',
  },
]

export const useRequestsStore = defineStore('requests', () => {
  const mode = ref('list') // 'list' | 'create' | 'done'
  const tab = ref('mine') // 'mine' | 'incoming' | 'archived'
  const requests = ref(SEED_REQUESTS)
  const responses = ref(
    SEED_RESPONSES.map((r, i) => ({ ...r, gradient: REPLY_SKINS[i % REPLY_SKINS.length] })),
  )
  const draft = reactive(emptyDraft())
  const generated = ref(null)

  // Use the real site origin so the QR/link opens THIS deployment's public page.
  function linkFor(code) {
    const host = typeof window !== 'undefined' ? window.location.host : LINK_HOST
    return `${host}/r/${code}`
  }
  function urlFor(code) {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : `https://${LINK_HOST}`
    return `${origin}/r/${code}`
  }
  function repliesFor(id) {
    return responses.value.filter((r) => r.requestId === id && r.status !== 'archived').length
  }

  const mineList = computed(() => requests.value.filter((r) => r.status === 'active'))
  const archivedList = computed(() => requests.value.filter((r) => r.status !== 'active'))
  const incomingList = computed(() =>
    responses.value.filter((r) => r.status === 'new' || r.status === 'accepted'),
  )
  const newCount = computed(() => responses.value.filter((r) => r.status === 'new').length)

  const counts = computed(() => ({
    mine: mineList.value.length,
    incoming: incomingList.value.length,
    archived: archivedList.value.length,
  }))

  function startCreate() {
    Object.assign(draft, emptyDraft())
    generated.value = null
    mode.value = 'create'
  }
  function backToList() {
    mode.value = 'list'
  }
  function setTab(next) {
    tab.value = next
  }
  function viewIncoming() {
    tab.value = 'incoming'
    mode.value = 'list'
  }

  function resolveDisplayName() {
    if (draft.display === 'anonymous') return 'Someone nearby'
    if (draft.display === 'custom') return draft.customName.trim() || 'Someone'
    return useMeStore().profile.name
  }

  // Load the owner's requests + their replies from the backend.
  async function load() {
    try {
      const rows = await apiFetch('/requests', { headers: authHeaders() })
      requests.value = rows.map(mapRequest)
      const flat = []
      rows.forEach((row) => {
        ;(row.responses || []).forEach((resp) => flat.push(mapResponse(resp, row.id, flat.length)))
      })
      responses.value = flat
    } catch {
      // keep seeded data if the backend is unreachable
    }
  }

  async function generate() {
    try {
      const created = await apiFetch('/requests', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          type: 'offline',
          message: draft.message.trim() || 'Someone nearby wants to meet up.',
          place: draft.place,
          displayAs: draft.display,
          customName: draft.customName,
          contact: draft.contact?.trim() || undefined,
          expires: draft.expiry,
        }),
      })
      const request = mapRequest(created)
      requests.value.unshift(request)
      generated.value = request
      mode.value = 'done'
      return request
    } catch {
      // Offline fallback: create locally so the flow still works.
      const request = {
        id: `r-${Date.now()}`,
        code: makeCode(),
        message: draft.message.trim() || 'Someone nearby wants to meet up.',
        displayName: resolveDisplayName(),
        anonymous: draft.display === 'anonymous',
        place: draft.place,
        contact: draft.contact?.trim() || '',
        status: 'active',
        created: 'just now',
      }
      requests.value.unshift(request)
      generated.value = request
      mode.value = 'done'
      return request
    }
  }

  function findByCode(code) {
    return requests.value.find((r) => r.code === code) || null
  }

  // Public page: fetch a request by code (no auth); fall back to a local copy offline.
  async function loadByCode(code) {
    try {
      return mapRequest(await apiFetch(`/requests/${code}`))
    } catch {
      return findByCode(code)
    }
  }

  // A reply submitted from the public request page → persists + lands in Incoming.
  async function addPublicReply(code, { contact, alias, note }) {
    const request = findByCode(code)
    const payload = {
      status: 'new',
      alias: String(alias || '').trim() || 'Someone',
      contact: String(contact || '').trim(),
      message: String(note || '').trim(),
    }
    try {
      const created = await apiFetch(`/requests/${code}/responses`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      responses.value.unshift(mapResponse(created, request?.id || code, responses.value.length))
    } catch {
      responses.value.unshift({
        id: `in-${Date.now()}`,
        requestId: request ? request.id : code,
        name: payload.alias,
        contact: payload.contact,
        time: 'just now',
        message: payload.message || 'Opened your link.',
        status: 'new',
        gradient: REPLY_SKINS[responses.value.length % REPLY_SKINS.length],
      })
    }
  }

  // Realtime: a reply arrived via socket → add to Incoming (dedupe by id).
  function receiveResponse(payload) {
    const code = payload?.request_code
    const resp = payload?.response || payload
    if (!resp?.id || responses.value.some((r) => r.id === resp.id)) return
    const request = findByCode(code)
    responses.value.unshift({
      id: resp.id,
      requestId: request ? request.id : code,
      name: resp.alias || 'Someone',
      contact: resp.contact || '',
      time: 'just now',
      message: resp.message || '',
      status: resp.status === 'declined' ? 'declined' : resp.status || 'new',
      conversationId: resp.conversation_id || null,
      gradient: REPLY_SKINS[responses.value.length % REPLY_SKINS.length],
    })
  }

  // Incoming reply actions.
  function acceptResponse(response) {
    response.status = 'accepted'
  }
  function archiveResponse(response) {
    response.status = 'archived'
  }

  return {
    mode,
    tab,
    requests,
    responses,
    draft,
    generated,
    mineList,
    archivedList,
    incomingList,
    newCount,
    counts,
    linkFor,
    urlFor,
    repliesFor,
    startCreate,
    backToList,
    setTab,
    viewIncoming,
    generate,
    load,
    findByCode,
    loadByCode,
    addPublicReply,
    receiveResponse,
    acceptResponse,
    archiveResponse,
  }
})
