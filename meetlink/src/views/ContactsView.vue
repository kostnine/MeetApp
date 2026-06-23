<script setup>
import { AtSign, Check, LockKeyhole, LogIn, MessageCircle, Send, UserPlus } from '@lucide/vue'
import ContactCard from '../components/ContactCard.vue'
import { useMeetStore } from '../stores/meet'

const store = useMeetStore()
</script>

<template>
  <section class="view-grid contacts-view">
    <div class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Оставить контакт</p>
          <h2>Instagram, Telegram или телефон</h2>
        </div>
        <MessageCircle :size="22" />
      </div>

      <div v-if="store.contactSent" class="success-card">
        <Check :size="20" />
        <div>
          <strong>Контакт отправлен</strong>
          <span>Заявка появится у владельца профиля в списке контактов.</span>
        </div>
      </div>

      <form class="booking-form" @submit.prevent="store.submitContact">
        <label>
          <span>Ваш ник или имя</span>
          <div class="field">
            <AtSign :size="18" />
            <input v-model="store.contactForm.alias" type="text" placeholder="Можно оставить пустым" />
          </div>
        </label>

        <label>
          <span>Как с вами связаться</span>
          <div class="field">
            <MessageCircle :size="18" />
            <input
              v-model="store.contactForm.contact"
              type="text"
              placeholder="@instagram, t.me/link или +370..."
              required
            />
          </div>
        </label>

        <label>
          <span>Комментарий</span>
          <textarea
            v-model="store.contactForm.note"
            rows="3"
            placeholder="Например: лучше написать вечером"
          ></textarea>
        </label>

        <button class="primary-button" type="submit" :disabled="store.isContactSubmitting">
          <Send :size="18" />
          {{ store.isContactSubmitting ? 'Отправляем...' : 'Оставить контакт' }}
        </button>
      </form>
    </div>

    <div class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Контакты / заявки</p>
          <h2>Люди, которые оставили контакт</h2>
        </div>
        <UserPlus :size="22" />
      </div>

      <div v-if="!store.isAdmin" class="lock-card">
        <LockKeyhole :size="24" />
        <div>
          <strong>Контакты скрыты</strong>
          <span>Гости могут оставить контакт, но список виден только администратору.</span>
        </div>
        <RouterLink class="primary-button" :to="{ name: 'login', query: { redirect: '/contacts' } }">
          <LogIn :size="18" />
          Войти
        </RouterLink>
      </div>

      <template v-else>
      <div class="filter-row">
        <button :class="{ selected: store.contactFilter === 'all' }" type="button" @click="store.contactFilter = 'all'">Все</button>
        <button :class="{ selected: store.contactFilter === 'профиль' }" type="button" @click="store.contactFilter = 'профиль'">Профиль</button>
        <button :class="{ selected: store.contactFilter === 'карта' }" type="button" @click="store.contactFilter = 'карта'">Карта</button>
        <button :class="{ selected: store.contactFilter === 'бронь' }" type="button" @click="store.contactFilter = 'бронь'">Бронь</button>
      </div>

      <div class="contact-list">
        <ContactCard
          v-for="contact in store.filteredContacts"
          :key="contact.id"
          :contact="contact"
        />
      </div>
      </template>
    </div>
  </section>
</template>
