import { io } from 'socket.io-client'
import { OWNER_NICKNAME, getToken } from './api'
import { useChatsStore } from './stores/chats'
import { useRequestsStore } from './stores/requests'
import { useMapStore } from './stores/map'

// Realtime via socket.io. Connects to the same origin; Vite proxies /socket.io → :4000 (ws).
let socket = null

export function connectSocket(nickname) {
  if (socket) return socket

  // Send the JWT in the handshake so the server can put this socket in its own
  // per-profile room and only deliver this user's conversations/messages.
  socket = io({ path: '/socket.io', auth: { token: getToken() } })

  socket.on('connect', () => {
    socket.emit('online:join', { nickname: nickname || OWNER_NICKNAME })
  })

  socket.on('messages:message', (payload) => useChatsStore().receiveMessage(payload))
  socket.on('messages:conversation', (row) => useChatsStore().receiveConversation(row))
  socket.on('messages:read', (payload) => useChatsStore().receiveRead(payload))
  socket.on('requests:response', (payload) => useRequestsStore().receiveResponse(payload))
  socket.on('stories:new', (story) => useMapStore().receiveStory(story))

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
