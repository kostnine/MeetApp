// Thin client for the meetlink-api (NestJS) backend.
// Requests go through Vite's /api proxy → http://127.0.0.1:4000 (see vite.config.js).

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'kostnine-admin'
export const OWNER_NICKNAME = import.meta.env.VITE_OWNER_NICKNAME || 'kostnine'
const TOKEN_KEY = 'meetlink_admin_token'

let token = readStoredToken()

function readStoredToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function getToken() {
  return token
}

export function authHeaders() {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function isAuthed() {
  return Boolean(token)
}

function setToken(value) {
  token = value || ''
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token)
    else window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Local storage can be unavailable in private modes — token still works this session.
  }
}

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })

  if (!response.ok) {
    const text = await response.text()
    let message = text
    try {
      const parsed = JSON.parse(text)
      message = Array.isArray(parsed.message) ? parsed.message.join(', ') : parsed.message || text
    } catch {
      message = text
    }
    const error = new Error(message || `API ${response.status}`)
    error.status = response.status
    throw error
  }

  if (response.status === 204) return null
  return response.json()
}

// ----- Auth -----
/** Verify a stored token; returns the user (from /auth/me) or null. */
export async function restoreSession() {
  if (!token) return null
  try {
    return await apiFetch('/auth/me', { headers: authHeaders() })
  } catch {
    setToken('')
    return null
  }
}

export async function loginRequest(identifier, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: identifier?.trim() || undefined, password }),
  })
  setToken(data.token)
  return data.user
}

export async function registerRequest(payload) {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  setToken(data.token)
  return data.user
}

const GUEST_KEY = 'meetlink_guest'
function readGuest() {
  try {
    return JSON.parse(window.localStorage.getItem(GUEST_KEY) || 'null')
  } catch {
    return null
  }
}
function writeGuest(creds) {
  try {
    window.localStorage.setItem(GUEST_KEY, JSON.stringify(creds))
  } catch {
    // storage unavailable — guest still works this session
  }
}

/**
 * "Continue as guest" → a real, NON-admin user account (not the owner/admin).
 * Reuses the same guest identity on this device; creates one on first use.
 */
export async function guestLogin() {
  const saved = readGuest()
  if (saved?.email && saved?.password) {
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: saved.email, password: saved.password }),
      })
      setToken(data.token)
      return data.user
    } catch {
      // saved guest is gone — fall through and make a fresh one
    }
  }
  const rand = Math.random().toString(36).slice(2, 10)
  const creds = {
    email: `guest_${rand}@guest.meetlink`,
    nickname: `guest_${rand}`,
    // Must satisfy the server password rules (8+, uppercase, number, symbol).
    password: `G${rand}7!`,
  }
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...creds, name: 'Guest' }),
  })
  writeGuest(creds)
  setToken(data.token)
  return data.user
}

export function logout() {
  setToken('')
}
