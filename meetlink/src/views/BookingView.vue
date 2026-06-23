<script setup>
import { AtSign, Check, MessageCircle, Sparkles } from '@lucide/vue'
import BookingCalendar from '../components/BookingCalendar.vue'
import { useMeetStore } from '../stores/meet'

const store = useMeetStore()
</script>

<template>
  <section class="view-grid">
    <div class="panel booking-panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Бронирование</p>
          <h2>Дата, время и контакт</h2>
        </div>
      </div>

      <div v-if="store.bookingSent" class="success-card">
        <Check :size="20" />
        <div>
          <strong>Заявка отправлена</strong>
          <span>Я увижу ее в резервациях и смогу подтвердить.</span>
        </div>
      </div>

      <BookingCalendar />

      <form class="booking-form" @submit.prevent="store.submitReservation">
        <label>
          <span>Имя или ник</span>
          <div class="field">
            <AtSign :size="18" />
            <input v-model="store.form.alias" type="text" placeholder="Например Guest_4821" />
          </div>
        </label>

        <label>
          <span>Instagram / Telegram / телефон</span>
          <div class="field">
            <MessageCircle :size="18" />
            <input v-model="store.form.contact" type="text" placeholder="@nickname или +370..." required />
          </div>
        </label>

        <label>
          <span>Комментарий</span>
          <textarea v-model="store.form.note" rows="3" placeholder="Например: лучше написать вечером"></textarea>
        </label>

        <button class="primary-button" type="submit" :disabled="store.isSubmitting">
          <Sparkles :size="18" />
          {{ store.isSubmitting ? 'Отправляем...' : 'Забронировать' }}
        </button>
      </form>
    </div>

    <aside class="panel side-info">
      <h3>Как это работает</h3>
      <p>Гость может оставить контакт без регистрации. Если ник пустой, появится Guest_4821.</p>
      <div class="mini-steps">
        <span>1. Выбор времени</span>
        <span>2. Контакт</span>
        <span>3. Подтверждение</span>
      </div>
    </aside>
  </section>
</template>
