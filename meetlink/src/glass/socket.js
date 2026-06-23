import { io } from 'socket.io-client'
import { OWNER_NICKNAME } from './api'
import { useChatsStore } from './stores/chats'
import { useRequestsStore } from './stores/requests'

// Realtime via socket.io. Connects to the same origin; Vite proxies /socket.io → :4000 (ws).
let socket = null

export function connectSocket(nickname) {
  if (socket) return socket

  socket = io({ path: '/socket.io' })

  socket.on('connect', () => {
    socket.emit('online:join', { nickname: nickname || OWNER_NICKNAME })
  })

  socket.on('messages:message', (payload) => useChatsStore().receiveMessage(payload))
  socket.on('messages:conversation', (row) => useChatsStore().receiveConversation(row))
  socket.on('requests:response', (payload) => useRequestsStore().receiveResponse(payload))

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
