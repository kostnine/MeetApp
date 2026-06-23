<script setup>
import { Check, MessageCircle, X } from '@lucide/vue'
import { useMeetStore } from '../stores/meet'

defineProps({
  reservation: {
    type: Object,
    required: true,
  },
})

const store = useMeetStore()
</script>

<template>
  <article class="reservation-row">
    <div>
      <strong>{{ reservation.alias }}</strong>
      <span>{{ reservation.contact }}</span>
    </div>
    <div>
      <strong>{{ reservation.slot.date }} · {{ reservation.slot.time }}</strong>
      <span>{{ reservation.slot.place }} · {{ reservation.source }}</span>
    </div>
    <p>{{ reservation.note }}</p>
    <span :class="['status-chip', reservation.status]">{{ reservation.status }}</span>
    <div class="row-actions">
      <button type="button" title="Подтвердить" @click="store.updateReservation(reservation, 'confirmed')">
        <Check :size="17" />
      </button>
      <button type="button" title="Отменить" @click="store.updateReservation(reservation, 'cancelled')">
        <X :size="17" />
      </button>
      <button type="button" title="Написать">
        <MessageCircle :size="17" />
      </button>
    </div>
  </article>
</template>
