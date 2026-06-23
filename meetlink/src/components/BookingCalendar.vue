<script setup>
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from '@lucide/vue'
import { useMeetStore } from '../stores/meet'

const store = useMeetStore()
</script>

<template>
  <div class="calendar-picker">
    <div class="calendar-top">
      <button class="calendar-nav" type="button" aria-label="Предыдущая неделя">
        <ChevronLeft :size="18" />
      </button>
      <div>
        <strong>Июнь 2026</strong>
        <span>{{ store.slots.length }} свободных слотов</span>
      </div>
      <button class="calendar-nav" type="button" aria-label="Следующая неделя">
        <ChevronRight :size="18" />
      </button>
    </div>

    <div class="calendar-grid" role="list" aria-label="Дни календаря">
      <button
        v-for="day in store.calendarDays"
        :key="day.id"
        class="calendar-day"
        :class="{ selected: store.selectedDay === day.id, disabled: !store.slotCount(day.id) }"
        type="button"
        @click="store.selectDay(day)"
      >
        <span>{{ day.week }}</span>
        <strong>{{ day.day }}</strong>
        <small v-if="day.isToday">сегодня</small>
        <small v-else-if="store.slotCount(day.id)">{{ store.slotCount(day.id) }} сл.</small>
        <small v-else>нет</small>
      </button>
    </div>

    <div class="selected-summary">
      <Clock3 :size="17" />
      <span>{{ store.selectedDayInfo?.day }} {{ store.selectedDayInfo?.month }}, {{ store.selectedSlotItem?.time }}</span>
    </div>

    <div class="time-grid" role="list" aria-label="Доступное время">
      <button
        v-for="slot in store.availableSlots"
        :key="slot.id"
        class="time-card"
        :class="{ selected: store.selectedSlot === slot.id }"
        type="button"
        @click="store.selectSlot(slot.id)"
      >
        <strong>{{ slot.time }}</strong>
        <span>{{ slot.place }}</span>
      </button>
    </div>
  </div>
</template>
