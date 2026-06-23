<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import BrandLogo from '../components/BrandLogo.vue'

const router = useRouter()
const auth = useAuthStore()

const mode = ref('login') // 'login' | 'register'
const loading = ref(false)
const error = ref('')
const form = reactive({ identifier: '', nickname: '', email: '', password: '' })

function toggle() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  error.value = ''
}

async function submit() {
  if (loading.value) return
  error.value = ''
  loading.value = true
  try {
    if (mode.value === 'login') {
      await auth.login(form.identifier, form.password)
    } else {
      await auth.register({
        email: form.email.trim(),
        nickname: form.nickname.trim(),
        password: form.password,
      })
    }
    router.push('/map')
  } catch (e) {
    error.value = e.message || 'Something went wrong'
  } finally {
    loading.value = false
  }
}

async function guest() {
  if (loading.value) return
  loading.value = true
  try {
    await auth.guest()
    router.push('/map')
  } catch (e) {
    error.value = e.message || 'Could not continue'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth">
    <div class="auth-card">
      <div class="auth-logo"><BrandLogo :size="44" :with-wordmark="true" :wordmark-size="26" /></div>

      <h1 class="auth-title">{{ mode === 'login' ? 'Welcome back' : 'Create your account' }}</h1>
      <p class="auth-sub">
        {{ mode === 'login' ? 'Sign in to pick up where you left off.' : 'Join to post stories, send requests and chat.' }}
      </p>

      <form class="auth-form" @submit.prevent="submit">
        <template v-if="mode === 'register'">
          <label class="auth-label">NICKNAME</label>
          <div class="auth-input"><input v-model="form.nickname" autocomplete="username" placeholder="yourname" /></div>

          <label class="auth-label">EMAIL</label>
          <div class="auth-input"><input v-model="form.email" type="email" autocomplete="email" placeholder="you@example.com" /></div>
        </template>

        <template v-else>
          <label class="auth-label">EMAIL OR NICKNAME</label>
          <div class="auth-input"><input v-model="form.identifier" autocomplete="username" placeholder="you@example.com" /></div>
        </template>

        <label class="auth-label">PASSWORD</label>
        <div class="auth-input">
          <input v-model="form.password" type="password" autocomplete="current-password" placeholder="••••••••" />
        </div>

        <div v-if="error" class="auth-error">{{ error }}</div>

        <button type="submit" class="auth-submit" :disabled="loading">
          {{ loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account' }}
        </button>
      </form>

      <button type="button" class="auth-toggle" @click="toggle">
        {{ mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in' }}
      </button>

      <div class="auth-divider"><span>or</span></div>
      <button type="button" class="auth-guest" :disabled="loading" @click="guest">Continue as guest</button>

      <button type="button" class="auth-back" @click="router.push('/welcome')">Back</button>
    </div>
  </div>
</template>

<style scoped>
.auth {
  flex: 1;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
}
.auth-card {
  width: 100%;
  max-width: 400px;
  border-radius: 32px;
  padding: 34px 30px 26px;
  text-align: center;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(30px) saturate(150%);
  -webkit-backdrop-filter: blur(30px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 30px 80px rgba(96, 73, 168, 0.22);
}
.auth-logo {
  display: flex;
  justify-content: center;
}
.auth-title {
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 23px;
  letter-spacing: -0.5px;
  color: var(--ml-ink-1);
  margin: 22px 0 0;
}
.auth-sub {
  font-size: 14px;
  line-height: 1.5;
  color: #6b6385;
  margin: 8px 0 0;
  text-wrap: pretty;
}
.auth-form {
  display: flex;
  flex-direction: column;
  margin-top: 22px;
  text-align: left;
}
.auth-label {
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--ml-eyebrow);
  margin: 0 0 7px 2px;
}
.auth-label:not(:first-child) {
  margin-top: 14px;
}
.auth-input {
  border: 1px solid rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.6);
  border-radius: 13px;
  padding: 12px 14px;
}
.auth-input input {
  width: 100%;
  border: none;
  outline: none;
  background: none;
  color: var(--ml-ink-1);
  font-family: var(--ml-font-body);
  font-size: 15px;
}
.auth-error {
  margin-top: 14px;
  font-size: 13px;
  font-weight: 700;
  color: var(--ml-danger);
  background: rgba(236, 80, 100, 0.07);
  border: 1px solid rgba(236, 80, 100, 0.25);
  border-radius: 12px;
  padding: 10px 12px;
  text-wrap: pretty;
}
.auth-submit {
  margin-top: 20px;
  border: none;
  cursor: pointer;
  border-radius: 15px;
  padding: 15px 0;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 15px;
  color: #fff;
  background: var(--ml-accent-gradient);
  box-shadow: 0 12px 28px rgba(139, 124, 246, 0.4);
}
.auth-submit:disabled {
  opacity: 0.7;
  cursor: default;
}
.auth-toggle {
  margin-top: 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 13.5px;
  color: var(--ml-accent-ink);
}
.auth-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 18px 0 14px;
  color: var(--ml-ink-3);
  font-size: 12px;
}
.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(120, 100, 180, 0.18);
}
.auth-guest {
  width: 100%;
  cursor: pointer;
  border-radius: 15px;
  padding: 13px 0;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 14px;
  color: var(--ml-accent-ink-soft);
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.85);
}
.auth-back {
  margin-top: 14px;
  border: none;
  background: none;
  cursor: pointer;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 13px;
  color: #8b83a0;
}
</style>
