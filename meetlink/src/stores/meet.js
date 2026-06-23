import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { io } from 'socket.io-client'

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const SOCKET_BASE = import.meta.env.VITE_SOCKET_URL || (import.meta.env.VITE_API_URL ? API_BASE : window.location.origin)
const ADMIN_STORAGE_KEY = 'meetlink_admin_token'
const SEEN_RESPONSES_STORAGE_KEY = 'meetlink_seen_response_ids'
const READ_MESSAGES_STORAGE_KEY = 'meetlink_read_message_ids'

function readStoredAdminToken() {
  try {
    return window.localStorage.getItem(ADMIN_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

function readStoredJson(key, fallback) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

function writeStoredJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Local storage can be unavailable in private browser modes.
  }
}

function guestAlias() {
  return `Guest_${Math.floor(1000 + Math.random() * 9000)}`
}

function nowTime() {
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date())
}

function makeCode() {
  return Math.random().toString(36).slice(2, 8)
}

export const useMeetStore = defineStore('meet', () => {
  const theme = ref('dark')
  const copied = ref(false)
  const requestCopied = ref(false)
  const bookingSent = ref(false)
  const contactSent = ref(false)
  const requestAnswerSent = ref('')
  const apiReady = ref(false)
  const apiError = ref('')
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const isContactSubmitting = ref(false)
  const isLoggingIn = ref(false)
  const isRegistering = ref(false)
  const isProfileSaving = ref(false)
  const isPhotoUploading = ref(false)
  const editingPhotoId = ref('')
  const isGeolocating = ref(false)
  const profileSaved = ref(false)
  const geoEnabled = ref(false)
  const geoError = ref('')
  const currentLocation = ref(null)
  const reservationFilter = ref('all')
  const contactFilter = ref('all')
  const responseFilter = ref('all')
  const adminToken = ref(readStoredAdminToken())
  const adminUser = ref(null)
  const authError = ref('')
  const seenResponseIds = ref(readStoredJson(SEEN_RESPONSES_STORAGE_KEY, []))
  const readMessageIds = ref(readStoredJson(READ_MESSAGES_STORAGE_KEY, {}))
  const socket = ref(null)
  const realtimeNotice = ref(null)

  const loginForm = reactive({
    identifier: '',
    password: '',
  })

  const registerForm = reactive({
    email: '',
    nickname: '',
    name: '',
    password: '',
  })

  const profile = reactive({
    name: 'Kostnine',
    handle: 'kostnine',
    city: 'Vilnius',
    area: 'Old Town',
    radius: 1000,
    status: 'онлайн',
    lastSeen: 'сейчас',
    bio: 'Хочу знакомиться с интересными людьми поблизости. Быстро, спокойно и без лишнего.',
    instagram: '@kostnine',
    telegram: 't.me/kostnine',
    phone: '+370 *** ** 280',
    avatarUrl: '',
    avatarPositionX: 50,
    avatarPositionY: 50,
    photos: [],
    showOnMap: true,
  })

  const profileForm = reactive({
    handle: '',
    name: '',
    bio: '',
    avatarUrl: '',
    avatarPositionX: 50,
    avatarPositionY: 50,
    instagram: '',
    telegram: '',
    phone: '',
    city: '',
    area: '',
    radius: 1000,
    showOnMap: true,
  })

  const photoEditForm = reactive({
    caption: '',
    positionX: 50,
    positionY: 50,
  })

  const requestDraft = reactive({
    type: 'offline',
    message: 'Привет! Хочу познакомиться с интересным человеком для общения и встречи.',
  })

  const responseForm = reactive({
    alias: '',
    age: '',
    contact: '',
    message: '',
  })

  const form = reactive({
    alias: '',
    contact: '',
    note: '',
  })

  const contactForm = reactive({
    alias: '',
    contact: '',
    note: '',
  })

  const chatForm = reactive({
    alias: '',
    contact: '',
    body: '',
  })

  const replyText = ref('')
  const activeRequestCode = ref('abc123')

  const calendarDays = [
    { id: 'jun-6', week: 'Сб', day: '6', month: 'июн', isToday: true },
    { id: 'jun-7', week: 'Вс', day: '7', month: 'июн' },
    { id: 'jun-8', week: 'Пн', day: '8', month: 'июн' },
    { id: 'jun-9', week: 'Вт', day: '9', month: 'июн' },
    { id: 'jun-10', week: 'Ср', day: '10', month: 'июн' },
    { id: 'jun-11', week: 'Чт', day: '11', month: 'июн' },
    { id: 'jun-12', week: 'Пт', day: '12', month: 'июн' },
  ]

  const slots = [
    { id: 1, dayId: 'jun-6', date: '6 июн', time: '19:30', place: 'Old Town' },
    { id: 2, dayId: 'jun-6', date: '6 июн', time: '21:00', place: 'Онлайн' },
    { id: 3, dayId: 'jun-7', date: '7 июн', time: '18:00', place: 'Cathedral Sq.' },
    { id: 4, dayId: 'jun-8', date: '8 июн', time: '14:15', place: 'Coffee Hill' },
    { id: 5, dayId: 'jun-9', date: '9 июн', time: '20:00', place: 'Онлайн' },
    { id: 6, dayId: 'jun-10', date: '10 июн', time: '18:45', place: 'City Center' },
  ]

  const selectedDay = ref(calendarDays[0].id)
  const selectedSlot = ref(slots[0].id)

  const datingRequests = ref([
    {
      id: 'req-1',
      code: 'abc123',
      type: 'nearby',
      message: 'Привет! Хочу познакомиться с интересным человеком для общения и встречи.',
      lookingFor: 'Девушку',
      radius: 1000,
      ageMin: 18,
      ageMax: 35,
      visibleOnMap: true,
      status: 'active',
      createdAt: 'сегодня',
      responses: [
        {
          id: 'resp-1',
          alias: 'Алина',
          age: 23,
          contact: '@alina_inst',
          message: 'Привет! Я тоже люблю путешествовать. Можно списаться.',
          status: 'accepted',
          date: '5 мин назад',
        },
        {
          id: 'resp-2',
          alias: 'Катя',
          age: 25,
          contact: '',
          message: 'Спасибо, но сейчас не ищу общения.',
          status: 'declined',
          date: '15 мин назад',
        },
      ],
    },
  ])

  try {
    const storedRequests = JSON.parse(window.localStorage.getItem('meetlink_dating_requests') || '[]')
    if (Array.isArray(storedRequests) && storedRequests.length) {
      datingRequests.value = storedRequests
      activeRequestCode.value = storedRequests[0].code
    }
  } catch {
    // Request links are still usable inside the current session.
  }

  const reservations = ref([
    {
      id: 101,
      alias: 'Mila',
      contact: '@mila.vln',
      slot: slots[2],
      note: 'Лучше Instagram, отвечаю вечером',
      status: 'new',
      source: 'бронь',
    },
  ])

  const contacts = ref([
    { id: 1, alias: 'Lina', instagram: '@linavibes', telegram: '', phone: '', note: 'Оставила контакт с карты', source: 'карта', date: 'сегодня' },
    { id: 2, alias: 'Guest_4821', instagram: '', telegram: 't.me/guest4821', phone: '', note: 'Без регистрации, хочет созвон', source: 'профиль', date: 'сегодня' },
  ])

  const nearbyUsers = ref([])

  const likes = ref([
    { id: 1, name: 'Mark', type: 'mutual', distance: 260 },
    { id: 2, name: 'Nika', type: 'me', distance: 410 },
    { id: 3, name: 'Lina', type: 'them', distance: 120 },
  ])

  const conversations = ref([])

  const activeConversationId = ref(null)
  const activeUser = ref(null)

  const isAdmin = computed(() => Boolean(adminToken.value && adminUser.value))
  const shareLink = computed(() => `meetme.app/@${profile.handle}`)
  const activeRequest = computed(() => {
    return datingRequests.value.find((request) => request.code === activeRequestCode.value) || datingRequests.value[0]
  })
  const activeRequestLink = computed(() => `meetme.app/r/${activeRequest.value?.code || 'abc123'}`)
  const mapVisibleRequests = computed(() =>
    datingRequests.value.filter((request) => (request.type || 'nearby') === 'nearby' && request.visibleOnMap !== false),
  )
  const requestResponses = computed(() => {
    return datingRequests.value.flatMap((request) =>
      request.responses.map((response) => ({
        ...response,
        requestCode: request.code,
        requestType: request.type || 'nearby',
        requestMessage: request.message,
        requestLink: `meetme.app/r/${request.code}`,
      })),
    )
  })
  const newResponsesCount = computed(() => {
    return requestResponses.value.filter((response) => !seenResponseIds.value.includes(String(response.id))).length
  })
  const filteredRequestResponses = computed(() => {
    if (responseFilter.value === 'all') return requestResponses.value
    return requestResponses.value.filter((response) => response.status === responseFilter.value)
  })
  const newReservationsCount = computed(() => newResponsesCount.value)
  const availableSlots = computed(() => slots.filter((slot) => slot.dayId === selectedDay.value))
  const selectedDayInfo = computed(() => calendarDays.find((day) => day.id === selectedDay.value))
  const selectedSlotItem = computed(() => slots.find((slot) => slot.id === selectedSlot.value) || availableSlots.value[0])
  const filteredReservations = computed(() => {
    if (reservationFilter.value === 'all') return reservations.value
    return reservations.value.filter((reservation) => reservation.status === reservationFilter.value)
  })
  const filteredContacts = computed(() => {
    if (contactFilter.value === 'all') return contacts.value
    return contacts.value.filter((contact) => contact.source === contactFilter.value)
  })
  const visibleNearbyUsers = computed(() => nearbyUsers.value.filter((user) => !user.hidden))
  const activeConversation = computed(() => {
    return conversations.value.find((conversation) => conversation.id === activeConversationId.value) || conversations.value[0]
  })
  const unreadConversationCount = computed(() => {
    return conversations.value.filter((conversation) => isConversationUnread(conversation)).length
  })

  async function apiFetch(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    })

    if (!response.ok) {
      const text = await response.text()
      let message = text

      try {
        message = JSON.parse(text).message || text
      } catch {
        message = text
      }

      const error = new Error(message || `API ${response.status}`)
      error.status = response.status
      throw error
    }

    return response.json()
  }

  function adminHeaders() {
    return adminToken.value
      ? { Authorization: `Bearer ${adminToken.value}` }
      : {}
  }

  function setAdminSession(data) {
    adminToken.value = data.token
    adminUser.value = data.user
    authError.value = ''

    try {
      window.localStorage.setItem(ADMIN_STORAGE_KEY, data.token)
    } catch {
      // Local storage can be unavailable in private browser modes.
    }
  }

  function logout() {
    disconnectRealtime()
    adminToken.value = ''
    adminUser.value = null
    authError.value = ''
    reservations.value = []
    contacts.value = []
    conversations.value = []
    activeConversationId.value = null

    try {
      window.localStorage.removeItem(ADMIN_STORAGE_KEY)
    } catch {
      // Nothing to clear when local storage is unavailable.
    }
  }

  async function verifySession() {
    if (!adminToken.value) return

    try {
      adminUser.value = await apiFetch('/auth/me', {
        headers: adminHeaders(),
      })
      authError.value = ''
    } catch {
      logout()
    }
  }

  async function login() {
    if (!loginForm.password.trim()) return false

    isLoggingIn.value = true
    authError.value = ''

    try {
      const identifier = loginForm.identifier.trim()
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: identifier || undefined,
          password: loginForm.password,
        }),
      })

      setAdminSession(data)
      loginForm.identifier = ''
      loginForm.password = ''
      await loadProfile().catch(() => {})
      await loadAdminData()
      connectRealtime()
      return true
    } catch (error) {
      if (error?.status === 401) {
        authError.value = loginForm.identifier.trim()
          ? 'Неверный email, ник или пароль'
          : 'Неверный пароль администратора'
      } else if (error instanceof TypeError || !error?.status) {
        authError.value = 'Backend не отвечает. Запусти meetlink-api на 4000 порту'
      } else {
        authError.value = error.message || 'Не удалось войти'
      }
      return false

      if (error?.status === 401) {
        authError.value = 'Неверный пароль администратора'
      } else if (error instanceof TypeError || !error?.status) {
        authError.value = 'Backend не отвечает. Запусти meetlink-api на 4000 порту'
      } else {
        authError.value = error.message || 'Не удалось войти'
      }
      return false
    } finally {
      isLoggingIn.value = false
    }
  }

  async function registerAccount() {
    const email = registerForm.email.trim()
    const nickname = registerForm.nickname.trim().replace(/^@/, '')
    const name = registerForm.name.trim()
    const password = registerForm.password.trim()

    if (!email || !nickname || !password) {
      authError.value = 'Заполни email, ник и пароль'
      return false
    }

    isRegistering.value = true
    authError.value = ''

    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          nickname,
          name: name || nickname,
          password,
        }),
      })

      setAdminSession(data)
      registerForm.email = ''
      registerForm.nickname = ''
      registerForm.name = ''
      registerForm.password = ''
      await loadProfile().catch(() => {})
      await loadAdminData()
      connectRealtime()
      return true
    } catch (error) {
      if (error?.status === 409) {
        authError.value = 'Email или ник уже занят'
      } else if (error?.status === 400) {
        authError.value = 'Проверь email, ник и пароль'
      } else if (error instanceof TypeError || !error?.status) {
        authError.value = 'Backend не отвечает. Запусти meetlink-api на 4000 порту'
      } else {
        authError.value = error.message || 'Не удалось создать аккаунт'
      }
      return false
    } finally {
      isRegistering.value = false
    }
  }

  function sourceLabel(source) {
    const labels = {
      profile: 'профиль',
      map: 'карта',
      nearby: 'карта',
      booking: 'бронь',
      request: 'запрос',
      chat: 'чат',
    }

    return labels[source] || source || 'профиль'
  }

  function formatApiDate(date) {
    if (!date) return ''
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(date))
  }

  function slotToMeetingDate(slot) {
    const [, day] = String(slot?.dayId || '').split('-')
    return `2026-06-${String(day || '06').padStart(2, '0')}`
  }

  function mapReservation(row) {
    return {
      id: row.id,
      alias: row.guest_nickname,
      contact: row.contact,
      slot: {
        id: row.id,
        date: formatApiDate(row.meeting_date),
        time: String(row.meeting_time || '').slice(0, 5),
        place: row.place || 'MeetLink',
      },
      note: row.comment || 'Без комментария',
      status: row.status,
      source: 'бронь',
    }
  }

  function mapContact(row) {
    return {
      id: row.id,
      alias: row.guest_nickname,
      instagram: row.instagram || '',
      telegram: row.telegram || '',
      phone: row.phone || '',
      note: row.comment || 'Без комментария',
      source: sourceLabel(row.source),
      date: formatApiDate(row.created_at) || 'сегодня',
    }
  }

  function mapMessage(row) {
    return {
      id: row.id,
      sender: row.sender,
      body: row.body,
      time: new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(row.created_at)),
    }
  }

  function mapConversation(row) {
    return {
      id: row.id,
      alias: row.guest_nickname,
      contact: row.contact || '',
      source: sourceLabel(row.source),
      updatedAt: formatApiDate(row.updated_at) || 'сегодня',
      lastMessage: row.last_message || row.messages?.at(-1)?.body || '',
      online: true,
      blocked: row.blocked ?? false,
      messages: (row.messages || []).map(mapMessage),
    }
  }

  function lastIncomingMessage(conversation) {
    return [...(conversation?.messages || [])].reverse().find((message) => message.sender !== 'owner')
  }

  function isConversationUnread(conversation) {
    const lastIncoming = lastIncomingMessage(conversation)
    if (!conversation || !lastIncoming) return false

    return String(readMessageIds.value[conversation.id] || '') !== String(lastIncoming.id)
  }

  function markConversationRead(conversationOrId) {
    const conversation = typeof conversationOrId === 'object'
      ? conversationOrId
      : conversations.value.find((item) => item.id === conversationOrId)
    const lastIncoming = lastIncomingMessage(conversation)
    if (!conversation || !lastIncoming) return

    readMessageIds.value = {
      ...readMessageIds.value,
      [conversation.id]: String(lastIncoming.id),
    }
    writeStoredJson(READ_MESSAGES_STORAGE_KEY, readMessageIds.value)
  }

  function markResponsesSeen() {
    const ids = requestResponses.value.map((response) => String(response.id))
    if (!ids.length) return

    seenResponseIds.value = Array.from(new Set([...seenResponseIds.value.map(String), ...ids]))
    writeStoredJson(SEEN_RESPONSES_STORAGE_KEY, seenResponseIds.value)
  }

  function mapNearbyUser(row, index) {
    const seed = Array.from(String(row.id || row.nickname || index)).reduce((sum, char) => sum + char.charCodeAt(0), 0)
    return {
      id: row.id,
      name: row.name || row.nickname || `User_${index + 1}`,
      age: row.age || null,
      contact: row.instagram || row.telegram || row.phone || `@${row.nickname}`,
      distance: row.distance_meters ?? row.distance ?? 0,
      lat: Number(row.lat),
      lng: Number(row.lng),
      status: row.status || 'онлайн',
      x: 22 + (seed % 56),
      y: 24 + ((seed * 7) % 52),
      color: ['#37b7f5', '#708dff', '#55dfd2', '#ff5ca8', '#ffd84d'][seed % 5],
      liked: false,
      hidden: false,
      reported: false,
    }
  }

  function mapRequestResponse(row) {
    return {
      id: row.id,
      alias: row.alias || row.guest_nickname,
      age: row.age,
      contact: row.contact || '',
      message: row.message || '',
      status: row.status,
      conversationId: row.conversation_id || row.conversationId || '',
      date: formatApiDate(row.created_at) || row.date || 'сейчас',
    }
  }

  function mapMeetRequest(row) {
    return {
      id: row.id,
      code: row.code,
      type: row.type || 'nearby',
      message: row.message,
      lookingFor: row.looking_for || row.lookingFor || 'Всех',
      radius: row.radius,
      ageMin: row.age_min ?? row.ageMin,
      ageMax: row.age_max ?? row.ageMax,
      visibleOnMap: row.visible_on_map ?? row.visibleOnMap ?? true,
      status: row.status || 'active',
      createdAt: formatApiDate(row.created_at) || row.createdAt || 'сейчас',
      responses: (row.responses || []).map(mapRequestResponse),
    }
  }

  function upsertMeetRequest(request) {
    const index = datingRequests.value.findIndex((item) => item.code === request.code)
    if (index === -1) {
      datingRequests.value.unshift(request)
    } else {
      datingRequests.value[index] = request
    }
    activeRequestCode.value = request.code
    persistDatingRequests()
    return request
  }

  function showRealtimeNotice(notice) {
    realtimeNotice.value = notice
    window.setTimeout(() => {
      if (realtimeNotice.value?.id === notice.id) realtimeNotice.value = null
    }, 4200)
  }

  function clearRealtimeNotice() {
    realtimeNotice.value = null
  }

  function upsertConversation(conversation, options = {}) {
    const mapped = mapConversation(conversation)
    const index = conversations.value.findIndex((item) => item.id === mapped.id)

    if (index === -1) {
      conversations.value.unshift(mapped)
    } else {
      const existing = conversations.value[index]
      conversations.value.splice(index, 1)
      conversations.value.unshift({
        ...existing,
        ...mapped,
        messages: mapped.messages.length ? mapped.messages : existing.messages,
      })
    }

    if (options.makeActive) {
      activeConversationId.value = mapped.id
      markConversationRead(mapped.id)
    }

    return conversations.value.find((item) => item.id === mapped.id) || mapped
  }

  async function applyRealtimeMessage(payload) {
    const message = mapMessage(payload.message || payload)
    const conversationId = payload.conversation_id || payload.conversationId || message.conversation_id
    if (!conversationId) return

    let conversation = conversations.value.find((item) => item.id === conversationId)
    if (!conversation) {
      await loadConversations().catch(() => {})
      conversation = conversations.value.find((item) => item.id === conversationId)
    }

    if (!conversation) return
    const localMatch = conversation.messages.find((item) => {
      return message.sender === 'owner'
        && item.sender === 'owner'
        && item.body === message.body
        && String(item.id).length < 16
    })

    if (localMatch) {
      conversation.messages.splice(conversation.messages.indexOf(localMatch), 1, message)
    } else if (!conversation.messages.some((item) => String(item.id) === String(message.id))) {
      conversation.messages.push(message)
    }

    conversation.lastMessage = message.body
    conversation.updatedAt = 'сейчас'
    conversations.value = [
      conversation,
      ...conversations.value.filter((item) => item.id !== conversation.id),
    ]

    if (activeConversationId.value === conversation.id) {
      markConversationRead(conversation)
    } else if (message.sender !== 'owner') {
      showRealtimeNotice({
        id: `message-${message.id}`,
        title: 'Новое сообщение',
        text: `${conversation.alias}: ${message.body}`,
        route: 'messages',
        conversationId: conversation.id,
      })
    }
  }

  function applyRealtimeResponse(payload) {
    const requestCode = payload.request_code || payload.requestCode
    const response = mapRequestResponse(payload.response || payload)
    const request = datingRequests.value.find((item) => item.code === requestCode)

    if (request) {
      const index = request.responses.findIndex((item) => String(item.id) === String(response.id))
      if (index === -1) request.responses.unshift(response)
      else request.responses[index] = response
      persistDatingRequests()
    } else {
      loadMeetRequests().catch(() => {})
    }

    if (payload.response?.conversation) {
      upsertConversation(payload.response.conversation)
    }

    showRealtimeNotice({
      id: `response-${response.id}`,
      title: response.status === 'accepted' ? 'Запрос принят' : 'Новый ответ',
      text: `${response.alias}: ${response.message}`,
      route: 'reservations',
    })
  }

  function connectRealtime() {
    if (!isAdmin.value || socket.value?.connected) return

    if (!socket.value) {
      socket.value = io(SOCKET_BASE, {
        transports: ['websocket', 'polling'],
        auth: { token: adminToken.value },
      })

      socket.value.on('connect', () => {
        socket.value?.emit('online:join', { nickname: profile.handle })
      })

      socket.value.on('messages:conversation', (conversation) => {
        const mapped = upsertConversation(conversation)
        const lastIncoming = lastIncomingMessage(mapped)
        if (lastIncoming && activeConversationId.value !== mapped.id) {
          showRealtimeNotice({
            id: `conversation-${mapped.id}-${lastIncoming.id}`,
            title: 'Новый чат',
            text: `${mapped.alias}: ${lastIncoming.body}`,
            route: 'messages',
            conversationId: mapped.id,
          })
        }
      })

      socket.value.on('messages:message', applyRealtimeMessage)
      socket.value.on('requests:response', applyRealtimeResponse)
    }

    socket.value.connect()
  }

  function disconnectRealtime() {
    socket.value?.removeAllListeners()
    socket.value?.disconnect()
    socket.value = null
  }

  function splitContactMethod(value) {
    const contact = value.trim()
    const normalized = contact.toLowerCase()

    if (normalized.includes('t.me') || normalized.startsWith('telegram')) {
      return { instagram: '', telegram: contact, phone: '' }
    }

    if (/\d/.test(contact)) {
      return { instagram: '', telegram: '', phone: contact }
    }

    return { instagram: contact, telegram: '', phone: '' }
  }

  function applyProfile(data) {
    profile.name = data.name || 'Kostnine'
    profile.handle = data.nickname || 'kostnine'
    profile.city = data.city || 'Vilnius'
    profile.area = data.area || 'Old Town'
    profile.radius = data.visibility_radius_meters || data.visibilityRadiusMeters || 1000
    profile.status = data.status || 'онлайн'
    profile.bio = data.bio || profile.bio
    profile.instagram = data.instagram || ''
    profile.telegram = data.telegram || ''
    profile.phone = data.phone || ''
    profile.avatarUrl = data.avatar_url || data.avatarUrl || ''
    profile.avatarPositionX = data.avatar_position_x ?? data.avatarPositionX ?? 50
    profile.avatarPositionY = data.avatar_position_y ?? data.avatarPositionY ?? 50
    profile.photos = (data.photos || []).map((photo) => ({
      id: photo.id,
      imageUrl: photo.image_url || photo.imageUrl,
      caption: photo.caption || '',
      positionX: photo.position_x ?? photo.positionX ?? 50,
      positionY: photo.position_y ?? photo.positionY ?? 50,
    }))
    profile.showOnMap = data.show_on_map ?? data.showOnMap ?? true
    syncProfileForm()
  }

  function syncProfileForm() {
    profileForm.handle = profile.handle
    profileForm.name = profile.name
    profileForm.bio = profile.bio
    profileForm.avatarUrl = profile.avatarUrl
    profileForm.avatarPositionX = profile.avatarPositionX
    profileForm.avatarPositionY = profile.avatarPositionY
    profileForm.instagram = profile.instagram
    profileForm.telegram = profile.telegram
    profileForm.phone = profile.phone
    profileForm.city = profile.city
    profileForm.area = profile.area
    profileForm.radius = profile.radius
    profileForm.showOnMap = profile.showOnMap
  }

  function imagePositionStyle(positionX = 50, positionY = 50) {
    return {
      objectPosition: `${Number(positionX) || 50}% ${Number(positionY) || 50}%`,
    }
  }

  async function loadProfile() {
    const data = adminToken.value
      ? await apiFetch('/profiles/me', { headers: adminHeaders() })
      : await apiFetch(`/profiles/${profile.handle}`)

    applyProfile(data)
  }

  async function saveProfile() {
    if (!isAdmin.value) return false

    isProfileSaving.value = true
    profileSaved.value = false
    apiError.value = ''

    try {
      const data = await apiFetch('/profiles/me', {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({
          nickname: profileForm.handle,
          name: profileForm.name,
          bio: profileForm.bio,
          avatarUrl: profileForm.avatarUrl,
          avatarPositionX: Number(profileForm.avatarPositionX),
          avatarPositionY: Number(profileForm.avatarPositionY),
          instagram: profileForm.instagram,
          telegram: profileForm.telegram,
          phone: profileForm.phone,
          city: profileForm.city,
          area: profileForm.area,
          showOnMap: profileForm.showOnMap,
          visibilityRadiusMeters: Number(profileForm.radius),
        }),
      })

      applyProfile(data)
      profileSaved.value = true
      window.setTimeout(() => {
        profileSaved.value = false
      }, 1800)
      return true
    } catch (error) {
      apiError.value = error.message
      if (error.status === 401) logout()
      return false
    } finally {
      isProfileSaving.value = false
    }
  }

  function readImageFile(file) {
    return new Promise((resolve, reject) => {
      if (!file?.type?.startsWith('image/')) {
        reject(new Error('Можно загрузить только изображение'))
        return
      }

      if (file.size > 2_500_000) {
        reject(new Error('Фото слишком большое. Выбери файл до 2.5 MB'))
        return
      }

      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('Не удалось прочитать фото'))
      reader.readAsDataURL(file)
    })
  }

  async function selectAvatarPhoto(event) {
    const file = event?.target?.files?.[0]
    if (!file || !isAdmin.value) return ''

    isPhotoUploading.value = true
    apiError.value = ''

    try {
      return await readImageFile(file)
    } catch (error) {
      apiError.value = error.message
      return ''
    } finally {
      isPhotoUploading.value = false
      if (event?.target) event.target.value = ''
    }
  }

  async function saveCroppedAvatar(imageUrl) {
    if (!imageUrl || !isAdmin.value) return false
    profileForm.avatarUrl = imageUrl
    profileForm.avatarPositionX = 50
    profileForm.avatarPositionY = 50
    return saveProfile()
  }

  async function clearAvatarPhoto() {
    if (!isAdmin.value) return false
    profileForm.avatarUrl = ''
    profileForm.avatarPositionX = 50
    profileForm.avatarPositionY = 50
    return saveProfile()
  }

  async function saveAvatarPosition() {
    if (!isAdmin.value || !profileForm.avatarUrl) return false
    return saveProfile()
  }

  async function addProfilePhotos(event) {
    const files = Array.from(event?.target?.files || [])
    if (!files.length || !isAdmin.value) return

    isPhotoUploading.value = true
    apiError.value = ''

    try {
      for (const file of files.slice(0, 6)) {
        const imageUrl = await readImageFile(file)
        const photo = await apiFetch('/profiles/me/photos', {
          method: 'POST',
          headers: adminHeaders(),
          body: JSON.stringify({ imageUrl }),
        })
        profile.photos.push({
          id: photo.id,
          imageUrl: photo.image_url || photo.imageUrl,
          caption: photo.caption || '',
          positionX: photo.position_x ?? photo.positionX ?? 50,
          positionY: photo.position_y ?? photo.positionY ?? 50,
        })
      }
    } catch (error) {
      apiError.value = error.message
      if (error.status === 401) logout()
    } finally {
      isPhotoUploading.value = false
      if (event?.target) event.target.value = ''
    }
  }

  async function removeProfilePhoto(photoId) {
    if (!photoId || !isAdmin.value) return

    const previousPhotos = [...profile.photos]
    profile.photos = profile.photos.filter((photo) => photo.id !== photoId)
    if (editingPhotoId.value === photoId) {
      editingPhotoId.value = ''
      photoEditForm.caption = ''
    }

    try {
      await apiFetch(`/profiles/me/photos/${photoId}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      })
    } catch (error) {
      profile.photos = previousPhotos
      apiError.value = error.message
      if (error.status === 401) logout()
    }
  }

  function editProfilePhoto(photo) {
    if (!photo || !isAdmin.value) return
    editingPhotoId.value = photo.id
    photoEditForm.caption = photo.caption || ''
    photoEditForm.positionX = photo.positionX ?? 50
    photoEditForm.positionY = photo.positionY ?? 50
  }

  function cancelPhotoEdit() {
    editingPhotoId.value = ''
    photoEditForm.caption = ''
    photoEditForm.positionX = 50
    photoEditForm.positionY = 50
  }

  async function saveProfilePhoto(photoId) {
    if (!photoId || !isAdmin.value) return false

    const photo = profile.photos.find((item) => item.id === photoId)
    if (!photo) return false

    const previousCaption = photo.caption
    const previousPositionX = photo.positionX
    const previousPositionY = photo.positionY
    photo.caption = photoEditForm.caption.trim()
    photo.positionX = Number(photoEditForm.positionX)
    photo.positionY = Number(photoEditForm.positionY)
    isPhotoUploading.value = true
    apiError.value = ''

    try {
      const updated = await apiFetch(`/profiles/me/photos/${photoId}`, {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({
          caption: photo.caption,
          positionX: photo.positionX,
          positionY: photo.positionY,
        }),
      })
      photo.caption = updated.caption || ''
      photo.positionX = updated.position_x ?? updated.positionX ?? photo.positionX
      photo.positionY = updated.position_y ?? updated.positionY ?? photo.positionY
      editingPhotoId.value = ''
      photoEditForm.caption = ''
      photoEditForm.positionX = 50
      photoEditForm.positionY = 50
      return true
    } catch (error) {
      photo.caption = previousCaption
      photo.positionX = previousPositionX
      photo.positionY = previousPositionY
      apiError.value = error.message
      if (error.status === 401) logout()
      return false
    } finally {
      isPhotoUploading.value = false
    }
  }

  async function replaceProfilePhoto(event, photoId) {
    const file = event?.target?.files?.[0]
    const photo = profile.photos.find((item) => item.id === photoId)
    if (!file || !photo || !isAdmin.value) return

    const previousImage = photo.imageUrl
    const previousPositionX = photo.positionX
    const previousPositionY = photo.positionY
    isPhotoUploading.value = true
    apiError.value = ''

    try {
      const imageUrl = await readImageFile(file)
      photo.imageUrl = imageUrl
      const updated = await apiFetch(`/profiles/me/photos/${photoId}`, {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({
          imageUrl,
          caption: photo.caption || '',
          positionX: photo.positionX ?? 50,
          positionY: photo.positionY ?? 50,
        }),
      })
      photo.imageUrl = updated.image_url || updated.imageUrl
      photo.caption = updated.caption || ''
      photo.positionX = updated.position_x ?? updated.positionX ?? photo.positionX
      photo.positionY = updated.position_y ?? updated.positionY ?? photo.positionY
    } catch (error) {
      photo.imageUrl = previousImage
      photo.positionX = previousPositionX
      photo.positionY = previousPositionY
      apiError.value = error.message
      if (error.status === 401) logout()
    } finally {
      isPhotoUploading.value = false
      if (event?.target) event.target.value = ''
    }
  }

  async function setProfileAvatarFromPhoto(photo) {
    if (!photo?.imageUrl || !isAdmin.value) return false
    profileForm.avatarUrl = photo.imageUrl
    profileForm.avatarPositionX = photo.positionX ?? 50
    profileForm.avatarPositionY = photo.positionY ?? 50
    return saveProfile()
  }

  async function loadReservations() {
    const data = await apiFetch('/reservations', {
      headers: adminHeaders(),
    })
    reservations.value = data.map(mapReservation)
  }

  async function loadContacts() {
    const data = await apiFetch('/contacts', {
      headers: adminHeaders(),
    })
    contacts.value = data.map(mapContact)
  }

  async function loadConversations() {
    const data = await apiFetch('/messages/conversations', {
      headers: adminHeaders(),
    })
    conversations.value = data.map(mapConversation)
    activeConversationId.value = conversations.value[0]?.id || null
  }

  async function loadMeetRequests() {
    const data = await apiFetch('/requests', {
      headers: adminHeaders(),
    })
    const mapped = data.map(mapMeetRequest)
    if (mapped.length) {
      datingRequests.value = mapped
      activeRequestCode.value = mapped[0].code
      persistDatingRequests()
    }
  }

  async function loadNearbyUsers(position) {
    if (!isAdmin.value || !position) return []

    const params = new URLSearchParams({
      nickname: profile.handle,
      lat: String(position.lat),
      lng: String(position.lng),
      radius: String(profile.radius || 1000),
    })

    const data = await apiFetch(`/nearby?${params.toString()}`, {
      headers: adminHeaders(),
    })

    nearbyUsers.value = data.map(mapNearbyUser)
    activeUser.value = visibleNearbyUsers.value[0] || null
    return nearbyUsers.value
  }

  async function enableGeolocation() {
    if (!isAdmin.value) return false

    geoError.value = ''

    if (!profile.showOnMap) {
      geoError.value = 'В профиле выключена видимость на карте'
      return false
    }

    if (!navigator.geolocation) {
      geoError.value = 'Браузер не поддерживает геолокацию'
      return false
    }

    isGeolocating.value = true

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000,
        })
      })

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracyMeters: Math.round(position.coords.accuracy || 0),
      }

      currentLocation.value = location

      await apiFetch('/nearby/location', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          nickname: profile.handle,
          ...location,
          isVisible: profile.showOnMap,
        }),
      })

      geoEnabled.value = true
      await loadNearbyUsers(location)
      return true
    } catch (error) {
      geoError.value = error.message || 'Геолокация не включена'
      return false
    } finally {
      isGeolocating.value = false
    }
  }

  async function loadRequestByCode(code) {
    if (!code) return null

    try {
      const data = await apiFetch(`/requests/${code}`)
      return upsertMeetRequest(mapMeetRequest(data))
    } catch (error) {
      apiError.value = error.message
      return findRequest(code) || null
    }
  }

  async function loadAdminData() {
    if (!isAdmin.value) return

    await Promise.all([
      loadMeetRequests().catch(() => {}),
      loadReservations().catch(() => {}),
      loadContacts().catch(() => {}),
      loadConversations().catch(() => {}),
    ])
  }

  async function bootstrap() {
    isLoading.value = true
    apiError.value = ''

    try {
      await loadProfile().catch(() => {})
      await verifySession()
      await loadAdminData()
      connectRealtime()
      apiReady.value = true
    } catch (error) {
      apiReady.value = false
      apiError.value = error.message
    } finally {
      isLoading.value = false
    }
  }

  async function createMeetRequest() {
    const code = makeCode()
    const request = {
      id: `req-${Date.now()}`,
      code,
      type: 'offline',
      message: requestDraft.message.trim() || 'Привет! Хочу познакомиться.',
      lookingFor: 'Личная ссылка',
      radius: null,
      ageMin: null,
      ageMax: null,
      visibleOnMap: false,
      status: 'active',
      createdAt: 'сейчас',
      responses: [],
    }

    requestCopied.value = false
    isSubmitting.value = true

    try {
      const created = await apiFetch('/requests', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          ownerNickname: profile.handle,
          type: request.type,
          message: request.message,
          lookingFor: request.lookingFor,
          radius: request.radius,
          ageMin: request.ageMin,
          ageMax: request.ageMax,
          visibleOnMap: request.visibleOnMap,
        }),
      })

      upsertMeetRequest(mapMeetRequest(created))
      apiReady.value = true
    } catch (error) {
      apiReady.value = false
      apiError.value = error.message
      if (error.status === 401) {
        logout()
        return
      }
      upsertMeetRequest(request)
    } finally {
      isSubmitting.value = false
    }
  }

  function persistDatingRequests() {
    try {
      window.localStorage.setItem('meetlink_dating_requests', JSON.stringify(datingRequests.value))
    } catch {
      // The request still exists in memory if local storage is unavailable.
    }
  }

  async function copyRequestLink() {
    requestCopied.value = true
    try {
      await navigator.clipboard?.writeText(`https://${activeRequestLink.value}`)
    } catch {
      requestCopied.value = false
    }
    window.setTimeout(() => {
      requestCopied.value = false
    }, 1600)
  }

  function findRequest(code) {
    return datingRequests.value.find((request) => request.code === code)
  }

  function resetRequestAnswer() {
    requestAnswerSent.value = ''
    responseForm.alias = ''
    responseForm.age = ''
    responseForm.contact = ''
    responseForm.message = ''
  }

  async function respondToRequest(code, status) {
    const request = findRequest(code)
    if (!request) return false

    const alias = responseForm.alias.trim() || guestAlias()
    const accepted = status === 'accepted'
    if (accepted && !responseForm.contact.trim()) return false

    const response = {
      id: `resp-${Date.now()}`,
      alias,
      age: responseForm.age ? Number(responseForm.age) : null,
      contact: accepted ? responseForm.contact.trim() : '',
      message: responseForm.message.trim() || (accepted ? 'Принял(а) запрос.' : 'Отказался без сообщения.'),
      status,
      date: 'сейчас',
    }

    try {
      const created = await apiFetch(`/requests/${code}/responses`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          alias,
          age: response.age,
          contact: response.contact,
          message: response.message,
        }),
      })

      const mappedResponse = mapRequestResponse(created)
      request.responses.unshift(mappedResponse)
      requestAnswerSent.value = status
      persistDatingRequests()

      if (created.conversation) {
        const conversation = mapConversation(created.conversation)
        conversations.value.unshift(conversation)
        activeConversationId.value = conversation.id
      }

      responseForm.alias = ''
      responseForm.age = ''
      responseForm.contact = ''
      responseForm.message = ''
      apiReady.value = true
      return true
    } catch (error) {
      apiReady.value = false
      apiError.value = error.message
    }

    request.responses.unshift(response)
    requestAnswerSent.value = status
    persistDatingRequests()

    if (accepted) {
      const conversation = {
        id: `request-${response.id}`,
        alias,
        contact: response.contact,
        source: 'запрос',
        updatedAt: 'сейчас',
        lastMessage: response.message,
        online: true,
        blocked: false,
        messages: [
          { id: `${response.id}-m1`, sender: 'guest', body: response.message, time: nowTime() },
        ],
      }
      conversations.value.unshift(conversation)
      activeConversationId.value = conversation.id
    }

    responseForm.alias = ''
    responseForm.age = ''
    responseForm.contact = ''
    responseForm.message = ''
    return true
  }

  function slotCount(dayId) {
    return slots.filter((slot) => slot.dayId === dayId).length
  }

  function selectDay(day) {
    if (!slotCount(day.id)) return
    selectedDay.value = day.id
    selectedSlot.value = slots.find((slot) => slot.dayId === day.id)?.id
  }

  function selectSlot(slotId) {
    selectedSlot.value = slotId
  }

  async function submitReservation() {
    if (!form.contact.trim() || !selectedSlotItem.value) return

    const alias = form.alias.trim() || guestAlias()
    const payload = {
      ownerNickname: profile.handle,
      guestNickname: alias,
      contact: form.contact.trim(),
      comment: form.note.trim(),
      meetingDate: slotToMeetingDate(selectedSlotItem.value),
      meetingTime: selectedSlotItem.value.time,
      place: selectedSlotItem.value.place,
    }

    isSubmitting.value = true
    apiError.value = ''

    try {
      const created = await apiFetch('/reservations', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      reservations.value.unshift(mapReservation(created))
      if (isAdmin.value) await loadContacts().catch(() => {})
    } catch (error) {
      apiError.value = error.message
      reservations.value.unshift({
        id: Date.now(),
        alias,
        contact: form.contact.trim(),
        slot: selectedSlotItem.value,
        note: form.note.trim() || 'Без комментария',
        status: 'new',
        source: 'бронь',
      })
    } finally {
      isSubmitting.value = false
    }

    bookingSent.value = true
    form.alias = ''
    form.contact = ''
    form.note = ''
  }

  async function submitContact() {
    if (!contactForm.contact.trim() && !contactForm.note.trim()) return

    const alias = contactForm.alias.trim() || guestAlias()
    const methods = splitContactMethod(contactForm.contact)
    const payload = {
      ownerNickname: profile.handle,
      guestNickname: alias,
      ...methods,
      comment: contactForm.note.trim(),
      source: 'profile',
    }

    isContactSubmitting.value = true
    apiError.value = ''

    try {
      const created = await apiFetch('/contacts', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      contacts.value.unshift(mapContact(created))
    } catch (error) {
      apiError.value = error.message
      contacts.value.unshift({
        id: Date.now(),
        alias,
        ...methods,
        note: contactForm.note.trim() || 'Без комментария',
        source: 'профиль',
        date: 'сейчас',
      })
    } finally {
      isContactSubmitting.value = false
    }

    contactSent.value = true
    contactForm.alias = ''
    contactForm.contact = ''
    contactForm.note = ''
  }

  async function startConversation() {
    if (!chatForm.body.trim()) return

    const alias = chatForm.alias.trim() || guestAlias()
    const localConversation = {
      id: `local-${Date.now()}`,
      alias,
      contact: chatForm.contact.trim(),
      source: 'чат',
      updatedAt: 'сейчас',
      lastMessage: chatForm.body.trim(),
      online: true,
      blocked: false,
      messages: [
        { id: Date.now(), sender: 'guest', body: chatForm.body.trim(), time: nowTime() },
      ],
    }

    isContactSubmitting.value = true
    apiError.value = ''

    try {
      const created = await apiFetch('/messages/conversations', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          ownerNickname: profile.handle,
          guestNickname: alias,
          contact: chatForm.contact.trim(),
          body: chatForm.body.trim(),
          source: 'chat',
        }),
      })
      const mapped = mapConversation(created)
      conversations.value.unshift(mapped)
      activeConversationId.value = mapped.id
    } catch (error) {
      apiError.value = error.message
      conversations.value.unshift(localConversation)
      activeConversationId.value = localConversation.id
    } finally {
      isContactSubmitting.value = false
    }

    chatForm.alias = ''
    chatForm.contact = ''
    chatForm.body = ''
  }

  async function startQuickMessage(user) {
    const body = `Привет, ${user.name}! Ты рядом?`
    const conversation = {
      id: `nearby-${Date.now()}`,
      alias: user.name,
      contact: user.contact,
      source: 'карта',
      updatedAt: 'сейчас',
      lastMessage: body,
      online: user.status === 'онлайн',
      blocked: false,
      messages: [
        { id: Date.now(), sender: 'owner', body, time: nowTime() },
      ],
    }

    if (!isAdmin.value) {
      conversations.value.unshift(conversation)
      activeConversationId.value = conversation.id
      return
    }

    try {
      const created = await apiFetch('/messages/conversations', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          ownerNickname: profile.handle,
          guestNickname: user.name,
          contact: user.contact,
          body,
          source: 'nearby',
        }),
      })
      const mapped = mapConversation(created)
      conversations.value.unshift(mapped)
      activeConversationId.value = mapped.id
    } catch (error) {
      apiError.value = error.message
      conversations.value.unshift(conversation)
      activeConversationId.value = conversation.id
    }
  }

  async function openConversation(id) {
    if (!isAdmin.value && !String(id).startsWith('local-') && !String(id).startsWith('nearby-') && !String(id).startsWith('request-')) return

    activeConversationId.value = id
    markConversationRead(id)

    if (String(id).startsWith('local-') || String(id).startsWith('nearby-') || String(id).startsWith('request-')) return

    try {
      const data = await apiFetch(`/messages/conversations/${id}`, {
        headers: adminHeaders(),
      })
      const mapped = mapConversation(data)
      const index = conversations.value.findIndex((conversation) => conversation.id === id)
      if (index !== -1) conversations.value[index] = mapped
      else conversations.value.unshift(mapped)
      markConversationRead(mapped)
    } catch (error) {
      apiError.value = error.message
    }
  }

  async function openConversationForResponse(response) {
    if (!isAdmin.value) return ''

    if (!conversations.value.length) {
      await loadConversations().catch(() => {})
    }

    let conversation = response.conversationId
      ? conversations.value.find((item) => item.id === response.conversationId)
      : null

    if (!conversation) {
      const responseAlias = String(response.alias || '').toLowerCase()
      const responseContact = String(response.contact || '').toLowerCase()
      conversation = conversations.value.find((item) => {
        const aliasMatches = String(item.alias || '').toLowerCase() === responseAlias
        const contactMatches = responseContact && String(item.contact || '').toLowerCase() === responseContact
        return aliasMatches || contactMatches
      })
    }

    if (!conversation) return ''

    await openConversation(conversation.id)
    return conversation.id
  }

  async function sendChatMessage() {
    const conversation = activeConversation.value
    if (!conversation || conversation.blocked || !replyText.value.trim()) return

    const localMessage = {
      id: Date.now(),
      sender: 'owner',
      body: replyText.value.trim(),
      time: nowTime(),
    }
    const body = replyText.value.trim()

    conversation.messages.push(localMessage)
    conversation.lastMessage = body
    conversation.updatedAt = 'сейчас'
    replyText.value = ''

    if (!isAdmin.value || String(conversation.id).startsWith('local-') || String(conversation.id).startsWith('nearby-') || String(conversation.id).startsWith('request-')) return

    try {
      const created = await apiFetch(`/messages/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ sender: 'owner', body }),
      })
      conversation.messages.splice(conversation.messages.indexOf(localMessage), 1, mapMessage(created))
      conversations.value = [
        conversation,
        ...conversations.value.filter((item) => item.id !== conversation.id),
      ]
    } catch (error) {
      apiError.value = error.message
    }
  }

  async function blockConversation(conversation) {
    if (!conversation) return

    const nextBlocked = !conversation.blocked
    conversation.blocked = nextBlocked

    if (!isAdmin.value || String(conversation.id).startsWith('local-') || String(conversation.id).startsWith('nearby-') || String(conversation.id).startsWith('request-')) return

    try {
      const data = await apiFetch(`/messages/conversations/${conversation.id}/${nextBlocked ? 'block' : 'unblock'}`, {
        method: 'PATCH',
        headers: adminHeaders(),
      })
      const mapped = mapConversation(data)
      const index = conversations.value.findIndex((item) => item.id === conversation.id)
      if (index !== -1) conversations.value[index] = mapped
    } catch (error) {
      conversation.blocked = !nextBlocked
      apiError.value = error.message
    }
  }

  function deleteConversation(conversation) {
    conversations.value = conversations.value.filter((item) => item.id !== conversation.id)
    activeConversationId.value = conversations.value[0]?.id || null
  }

  async function copyLink() {
    copied.value = true
    try {
      await navigator.clipboard?.writeText(`https://${shareLink.value}`)
    } catch {
      copied.value = false
    }
    window.setTimeout(() => {
      copied.value = false
    }, 1600)
  }

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  function toggleLike(user) {
    if (!user) return
    user.liked = !user.liked
    activeUser.value = user
  }

  function setActiveUser(user) {
    activeUser.value = user
  }

  function hideNearbyUser(user) {
    if (!user) return
    user.hidden = true
    activeUser.value = visibleNearbyUsers.value[0] || null
  }

  function reportNearbyUser(user) {
    if (!user) return
    user.reported = true
    hideNearbyUser(user)
  }

  async function updateReservation(item, status) {
    const previousStatus = item.status
    item.status = status

    try {
      await apiFetch(`/reservations/${item.id}/status`, {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({ status }),
      })
    } catch (error) {
      item.status = previousStatus
      apiError.value = error.message
    }
  }

  return {
    apiBase: API_BASE,
    theme,
    copied,
    requestCopied,
    bookingSent,
    contactSent,
    requestAnswerSent,
    apiReady,
    apiError,
    authError,
    isLoading,
    isSubmitting,
    isContactSubmitting,
    isLoggingIn,
    isRegistering,
    isProfileSaving,
    isPhotoUploading,
    editingPhotoId,
    isGeolocating,
    profileSaved,
    geoEnabled,
    geoError,
    currentLocation,
    reservationFilter,
    contactFilter,
    responseFilter,
    adminToken,
    adminUser,
    realtimeNotice,
    isAdmin,
    profile,
    requestDraft,
    profileForm,
    photoEditForm,
    responseForm,
    calendarDays,
    slots,
    form,
    contactForm,
    chatForm,
    loginForm,
    registerForm,
    replyText,
    selectedDay,
    selectedSlot,
    datingRequests,
    activeRequestCode,
    reservations,
    contacts,
    nearbyUsers,
    likes,
    conversations,
    activeConversationId,
    activeUser,
    shareLink,
    activeRequest,
    activeRequestLink,
    mapVisibleRequests,
    requestResponses,
    filteredRequestResponses,
    newReservationsCount,
    availableSlots,
    selectedDayInfo,
    selectedSlotItem,
    filteredReservations,
    filteredContacts,
    visibleNearbyUsers,
    activeConversation,
    unreadConversationCount,
    newResponsesCount,
    slotCount,
    bootstrap,
    loadProfile,
    saveProfile,
    selectAvatarPhoto,
    saveCroppedAvatar,
    clearAvatarPhoto,
    addProfilePhotos,
    removeProfilePhoto,
    editProfilePhoto,
    cancelPhotoEdit,
    saveProfilePhoto,
    replaceProfilePhoto,
    setProfileAvatarFromPhoto,
    loadReservations,
    loadContacts,
    loadConversations,
    loadMeetRequests,
    loadNearbyUsers,
    enableGeolocation,
    loadRequestByCode,
    loadAdminData,
    login,
    registerAccount,
    logout,
    verifySession,
    connectRealtime,
    disconnectRealtime,
    clearRealtimeNotice,
    createMeetRequest,
    copyRequestLink,
    findRequest,
    respondToRequest,
    resetRequestAnswer,
    selectDay,
    selectSlot,
    submitReservation,
    submitContact,
    startConversation,
    startQuickMessage,
    openConversation,
    openConversationForResponse,
    isConversationUnread,
    markConversationRead,
    markResponsesSeen,
    sendChatMessage,
    blockConversation,
    deleteConversation,
    copyLink,
    toggleTheme,
    toggleLike,
    setActiveUser,
    hideNearbyUser,
    reportNearbyUser,
    updateReservation,
    imagePositionStyle,
    saveAvatarPosition,
  }
})
