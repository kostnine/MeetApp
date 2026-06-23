<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { AtSign, Check, ClipboardEdit, MapPin, MessageCircle, Send, X } from '@lucide/vue'
import { useMeetStore } from '../stores/meet'

const store = useMeetStore()
const route = useRoute()
const formError = ref('')
const isRequestLoading = ref(true)

const request = computed(() => store.findRequest(String(route.params.code || '')))
const requestType = computed(() => request.value?.type || 'nearby')
const isOfflineRequest = computed(() => requestType.value === 'offline')

onMounted(async () => {
  store.resetRequestAnswer()
  await store.loadRequestByCode(String(route.params.code || ''))
  isRequestLoading.value = false
})

async function acceptRequest() {
  formError.value = ''
  if (!request.value) return

  const ok = await store.respondToRequest(request.value.code, 'accepted')
  if (!ok) formError.value = 'Оставь контакт, чтобы можно было ответить.'
}

async function declineRequest() {
  formError.value = ''
  if (!request.value) return

  await store.respondToRequest(request.value.code, 'declined')
}
</script>

<template>
  <section class="request-public-view">
    <div v-if="isRequestLoading" class="panel request-public-card">
      <p class="eyebrow">Загрузка</p>
      <h2>Ищем запрос</h2>
    </div>

    <div v-else-if="!request" class="panel request-public-card">
      <p class="eyebrow">Запрос не найден</p>
      <h2>Эта ссылка уже недоступна</h2>
      <RouterLink class="primary-button" :to="{ name: 'profile' }">Открыть профиль</RouterLink>
    </div>

    <div v-else class="panel request-public-card">
      <div class="request-author">
        <div class="avatar">K</div>
        <div>
          <p class="eyebrow">@{{ store.profile.handle }} · {{ store.profile.status }}</p>
          <h2>
            {{ isOfflineRequest ? `${store.profile.name} оставил комментарий` : `${store.profile.name} хочет познакомиться` }}
          </h2>
        </div>
      </div>

      <div class="request-message" :class="{ personal: isOfflineRequest }">
        <ClipboardEdit v-if="isOfflineRequest" :size="20" />
        <MessageCircle v-else :size="20" />
        <p>{{ request.message }}</p>
      </div>

      <div class="request-tags">
        <template v-if="isOfflineRequest">
          <span>Личная ссылка</span>
          <span>Не на карте</span>
          <span>Форма данных</span>
        </template>
        <template v-else>
          <span>{{ request.lookingFor }}</span>
          <span>{{ request.ageMin }}-{{ request.ageMax }}</span>
          <span>до {{ request.radius }} м</span>
          <span><MapPin :size="13" /> рядом</span>
        </template>
      </div>

      <div v-if="store.requestAnswerSent === 'accepted'" class="success-card">
        <Check :size="20" />
        <div>
          <strong>{{ isOfflineRequest ? 'Данные отправлены' : 'Ответ отправлен' }}</strong>
          <span>
            {{
              isOfflineRequest
                ? 'Автор увидит твой контакт и сможет написать.'
                : 'Контакт открыт, чат создан. Можно продолжить переписку.'
            }}
          </span>
        </div>
      </div>

      <div v-else-if="store.requestAnswerSent === 'declined'" class="success-card decline-card">
        <X :size="20" />
        <div>
          <strong>Отказ отправлен</strong>
          <span>Контакт не открыт, автор увидит только статус отказа.</span>
        </div>
      </div>

      <form v-else class="booking-form" @submit.prevent="acceptRequest">
        <label>
          <span>Имя или ник</span>
          <div class="field">
            <AtSign :size="18" />
            <input v-model="store.responseForm.alias" type="text" placeholder="Можно оставить пустым" />
          </div>
        </label>

        <label>
          <span>Возраст</span>
          <div class="field">
            <input v-model="store.responseForm.age" type="number" min="18" max="80" placeholder="Например 24" />
          </div>
        </label>

        <label>
          <span>{{ isOfflineRequest ? 'Как с тобой связаться' : 'Instagram / Telegram / телефон' }}</span>
          <div class="field">
            <MessageCircle :size="18" />
            <input v-model="store.responseForm.contact" type="text" placeholder="@nickname или +370..." />
          </div>
        </label>

        <label>
          <span>{{ isOfflineRequest ? 'Ответ или комментарий' : 'Сообщение' }}</span>
          <textarea
            v-model="store.responseForm.message"
            rows="3"
            :placeholder="
              isOfflineRequest
                ? 'Например: привет, давай спишемся'
                : 'Например: привет, я тоже люблю прогулки'
            "
          ></textarea>
        </label>

        <p v-if="formError" class="form-error">{{ formError }}</p>

        <div class="decision-row">
          <button class="primary-button" type="submit">
            <Send :size="18" />
            {{ isOfflineRequest ? 'Отправить данные' : 'Принять' }}
          </button>
          <button v-if="!isOfflineRequest" class="ghost-button danger-action" type="button" @click="declineRequest">
            <X :size="18" />
            Отказаться
          </button>
        </div>
      </form>
    </div>
  </section>
</template>
