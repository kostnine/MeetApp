<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { AtSign, Check, LockKeyhole, LogIn, Mail, UserPlus, UserRound } from '@lucide/vue'
import { useMeetStore } from '../stores/meet'

const store = useMeetStore()
const router = useRouter()
const mode = ref('login')

const destination = computed(() => {
  return router.currentRoute.value.query.redirect || { name: 'profile' }
})

const isBusy = computed(() => store.isLoggingIn || store.isRegistering)

async function submitAuth() {
  const ok = mode.value === 'register' ? await store.registerAccount() : await store.login()
  if (ok) router.push(destination.value)
}
</script>

<template>
  <section class="auth-view">
    <div class="panel auth-panel">
      <div class="auth-mark">
        <LockKeyhole :size="26" />
      </div>

      <div>
        <p class="eyebrow">Аккаунт MeetMe</p>
        <h2>{{ mode === 'register' ? 'Создать профиль' : 'Войти в профиль' }}</h2>
        <p class="muted">
          {{ mode === 'register'
            ? 'Ник, контакты, заявки и чаты будут привязаны к твоему аккаунту.'
            : 'Войди по email или нику. Старый админ-пароль тоже работает без email.' }}
        </p>
      </div>

      <div class="auth-mode-switch" role="tablist" aria-label="Авторизация">
        <button
          type="button"
          :class="{ active: mode === 'login' }"
          @click="mode = 'login'; store.authError = ''"
        >
          <LogIn :size="17" />
          Вход
        </button>
        <button
          type="button"
          :class="{ active: mode === 'register' }"
          @click="mode = 'register'; store.authError = ''"
        >
          <UserPlus :size="17" />
          Регистрация
        </button>
      </div>

      <div v-if="store.isAdmin" class="success-card auth-success">
        <Check :size="20" />
        <div>
          <strong>Ты уже вошел</strong>
          <span>Можно открыть профиль, заявки или выйти из аккаунта.</span>
        </div>
      </div>

      <form v-else class="booking-form auth-form" @submit.prevent="submitAuth">
        <template v-if="mode === 'login'">
          <label>
            <span>Email или ник</span>
            <div class="field">
              <AtSign :size="18" />
              <input
                v-model="store.loginForm.identifier"
                type="text"
                placeholder="kostnine или mail@example.com"
                autocomplete="username"
              />
            </div>
          </label>

          <label>
            <span>Пароль</span>
            <div class="field">
              <LockKeyhole :size="18" />
              <input
                v-model="store.loginForm.password"
                type="password"
                placeholder="Введите пароль"
                autocomplete="current-password"
                required
              />
            </div>
          </label>

          <p class="auth-helper">Можно оставить поле email пустым и войти старым админ-паролем.</p>
        </template>

        <template v-else>
          <label>
            <span>Ник</span>
            <div class="field">
              <AtSign :size="18" />
              <input
                v-model="store.registerForm.nickname"
                type="text"
                placeholder="kostnine"
                autocomplete="username"
                required
              />
            </div>
          </label>

          <label>
            <span>Имя</span>
            <div class="field">
              <UserRound :size="18" />
              <input
                v-model="store.registerForm.name"
                type="text"
                placeholder="Kostnine"
                autocomplete="name"
              />
            </div>
          </label>

          <label>
            <span>Email</span>
            <div class="field">
              <Mail :size="18" />
              <input
                v-model="store.registerForm.email"
                type="email"
                placeholder="mail@example.com"
                autocomplete="email"
                required
              />
            </div>
          </label>

          <label>
            <span>Пароль</span>
            <div class="field">
              <LockKeyhole :size="18" />
              <input
                v-model="store.registerForm.password"
                type="password"
                placeholder="Минимум 6 символов"
                autocomplete="new-password"
                required
              />
            </div>
          </label>
        </template>

        <p v-if="store.authError" class="form-error">{{ store.authError }}</p>

        <button class="primary-button" type="submit" :disabled="isBusy">
          <component :is="mode === 'register' ? UserPlus : LogIn" :size="18" />
          {{
            isBusy
              ? 'Проверяем...'
              : mode === 'register'
                ? 'Создать аккаунт'
                : 'Войти'
          }}
        </button>
      </form>

      <div v-if="store.isAdmin" class="auth-actions">
        <RouterLink class="primary-button" :to="{ name: 'profile' }">Открыть профиль</RouterLink>
        <button class="ghost-button" type="button" @click="store.logout">Выйти</button>
      </div>
    </div>
  </section>
</template>
