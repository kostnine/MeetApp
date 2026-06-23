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

/** Demo "guest" path → log in as the owner (admin) with the dev password. */
export async function guestLogin() {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
  })
  setToken(data.token)
  return data.user
}

export function logout() {
  setToken('')
}
