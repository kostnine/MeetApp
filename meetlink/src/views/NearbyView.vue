<script setup>
import { EyeOff, Flag, LocateFixed, Map as MapIcon, RefreshCcw, Send } from '@lucide/vue'
import NearbyMap from '../components/NearbyMap.vue'
import { useMeetStore } from '../stores/meet'

const store = useMeetStore()
</script>

<template>
  <section class="view-grid map-view">
    <div class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Карта рядом</p>
          <h2>Онлайн в радиусе {{ store.profile.radius }} м</h2>
        </div>
        <MapIcon :size="22" />
      </div>

      <div class="geo-actions">
        <button class="primary-button" type="button" :disabled="store.isGeolocating" @click="store.enableGeolocation">
          <RefreshCcw v-if="store.isGeolocating" :size="18" />
          <LocateFixed v-else :size="18" />
          {{ store.geoEnabled ? 'Обновить рядом' : 'Включить геолокацию' }}
        </button>
        <span v-if="store.geoError" class="form-error">{{ store.geoError }}</span>
      </div>

      <NearbyMap />
    </div>

    <aside v-if="store.activeUser" class="panel active-user-card">
      <div class="mini-avatar large">{{ store.activeUser.name.slice(0, 1) }}</div>
      <p class="eyebrow">{{ store.activeUser.distance }} м от вас · {{ store.activeUser.status }}</p>
      <h2>{{ store.activeUser.name }}<span v-if="store.activeUser.age">, {{ store.activeUser.age }}</span></h2>
      <p>{{ store.activeUser.contact }}</p>
      <div class="map-action-stack">
        <RouterLink class="primary-button" :to="{ name: 'messages' }" @click="store.startQuickMessage(store.activeUser)">
          <Send :size="18" />
          Написать
        </RouterLink>
        <button class="ghost-button" type="button" @click="store.hideNearbyUser(store.activeUser)">
          <EyeOff :size="18" />
          Скрыть
        </button>
        <button class="ghost-button danger-action" type="button" @click="store.reportNearbyUser(store.activeUser)">
          <Flag :size="18" />
          Пожаловаться
        </button>
      </div>
    </aside>

    <aside v-else class="panel active-user-card empty-nearby-card">
      <LocateFixed :size="26" />
      <h2>Пока никого рядом</h2>
      <p>Включи геолокацию. Мы сохраним примерную точку и покажем только людей, которые сами включили видимость.</p>
    </aside>
  </section>
</template>
