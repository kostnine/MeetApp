<script setup>
import {
  AtSign,
  Camera,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  ImagePlus,
  Link as LinkIcon,
  MapPin,
  MessageCircle,
  Navigation,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  Star,
  Trash2,
  UserRound,
  X,
} from '@lucide/vue'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AvatarCropModal from '../components/AvatarCropModal.vue'
import { useMeetStore } from '../stores/meet'

const store = useMeetStore()
const cropSource = ref('')
const editorTab = ref('photos')

const editorTabs = [
  { id: 'photos', label: 'Фото' },
  { id: 'profile', label: 'Данные' },
  { id: 'privacy', label: 'Видимость' },
]
const radiusOptions = [200, 400, 700, 1000, 1500, 3000]

const galleryPreview = computed(() => store.profile.photos.slice(0, 5))
const locationText = computed(() => {
  const parts = [store.profile.area, store.profile.city].filter(Boolean)
  return parts.length ? parts.join(', ') : 'Локация не указана'
})

async function chooseAvatar(event) {
  const source = await store.selectAvatarPhoto(event)
  if (source) cropSource.value = source
}

function editCurrentAvatar() {
  if (store.profileForm.avatarUrl) cropSource.value = store.profileForm.avatarUrl
}

async function saveAvatarCrop(imageUrl) {
  cropSource.value = ''
  await store.saveCroppedAvatar(imageUrl)
}

function radiusLabel(radius) {
  return radius >= 1000 ? `${Number(radius / 1000).toLocaleString('ru-RU')} км` : `${radius} м`
}
</script>

<template>
  <section class="profile-page profile-page-compact">
    <div class="panel compact-profile-card">
      <div class="compact-profile-main">
        <div class="compact-avatar-wrap">
          <div class="avatar compact-avatar">
            <img
              v-if="store.profile.avatarUrl"
              :src="store.profile.avatarUrl"
              :style="store.imagePositionStyle(store.profile.avatarPositionX, store.profile.avatarPositionY)"
              alt=""
            />
            <span v-else>{{ store.profile.name.slice(0, 1).toUpperCase() }}</span>
          </div>
          <span class="compact-online">{{ store.profile.status }}</span>
        </div>

        <div class="compact-profile-copy">
          <p class="eyebrow">@{{ store.profile.handle }}</p>
          <h2>{{ store.profile.name }}</h2>
          <p class="compact-location">
            <MapPin :size="16" />
            {{ locationText }}
          </p>
          <p class="compact-bio">{{ store.profile.bio || 'Добавь короткое био, чтобы люди сразу понимали, зачем тебе писать.' }}</p>

          <div class="compact-chip-row">
            <span>{{ store.profile.city || 'Город' }}</span>
            <span>{{ store.profile.area || 'Район' }}</span>
            <span>до {{ store.profile.radius }} м</span>
            <span>{{ store.profile.showOnMap ? 'на карте' : 'скрыт' }}</span>
          </div>
        </div>
      </div>

      <div class="compact-profile-footer">
        <div class="compact-actions">
          <RouterLink class="primary-button" :to="{ name: 'request' }">
            <LinkIcon :size="18" />
            Создать запрос
          </RouterLink>
          <RouterLink class="ghost-button" :to="{ name: 'nearby' }">
            <MessageCircle :size="18" />
            Написать рядом
          </RouterLink>
        </div>
      </div>
    </div>

    <div class="panel compact-visibility-card">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Видимость</p>
          <h2>Что увидят люди</h2>
        </div>
        <ShieldCheck :size="22" />
      </div>

      <div class="compact-privacy-list">
        <div class="contact-row">
          <AtSign :size="18" />
          <span>{{ store.profile.instagram || 'Instagram не указан' }}</span>
          <strong>публично</strong>
        </div>
        <div class="contact-row">
          <MessageCircle :size="18" />
          <span>{{ store.profile.telegram || 'Telegram не указан' }}</span>
          <strong>после ответа</strong>
        </div>
        <div class="contact-row">
          <Phone :size="18" />
          <span>{{ store.profile.phone || 'Телефон не указан' }}</span>
          <strong>приватно</strong>
        </div>
        <div class="contact-row">
          <Navigation :size="18" />
          <span>{{ store.profile.city || 'Город' }}, до {{ store.profile.radius }} м</span>
          <strong>примерно</strong>
        </div>
        <div class="contact-row">
          <MapPin :size="18" />
          <span>{{ store.profile.showOnMap ? 'Показываешься на карте' : 'Скрыт с карты' }}</span>
          <strong>{{ store.profile.showOnMap ? 'включено' : 'выключено' }}</strong>
        </div>
      </div>
    </div>

    <form class="panel compact-editor-card" @submit.prevent="store.saveProfile">
      <div class="compact-editor-head">
        <div>
          <p class="eyebrow">Настройки</p>
          <h2>Редактировать профиль</h2>
        </div>
        <div class="compact-editor-tabs" role="tablist" aria-label="Разделы редактора">
          <button
            v-for="tab in editorTabs"
            :key="tab.id"
            type="button"
            :class="{ active: editorTab === tab.id }"
            @click="editorTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div v-if="editorTab === 'photos'" class="compact-editor-body compact-photo-editor">
        <div class="avatar-control-card">
          <div class="avatar preview-avatar">
            <img
              v-if="store.profileForm.avatarUrl"
              :src="store.profileForm.avatarUrl"
              :style="store.imagePositionStyle(store.profileForm.avatarPositionX, store.profileForm.avatarPositionY)"
              alt=""
            />
            <span v-else>{{ store.profileForm.name.slice(0, 1).toUpperCase() || 'M' }}</span>
          </div>
          <div class="avatar-control-copy">
            <strong>Аватар</strong>
            <small>Показывается в профиле, на карте и в чатах.</small>
          </div>
          <div class="avatar-upload-actions">
            <label class="ghost-button file-button">
              <Camera :size="17" />
              Выбрать
              <input type="file" accept="image/*" @change="chooseAvatar" />
            </label>
            <button
              v-if="store.profileForm.avatarUrl"
              class="ghost-button"
              type="button"
              @click="editCurrentAvatar"
            >
              <Pencil :size="17" />
              Фокус
            </button>
            <button
              v-if="store.profileForm.avatarUrl"
              class="ghost-button icon-danger"
              type="button"
              :disabled="store.isPhotoUploading"
              @click="store.clearAvatarPhoto"
            >
              <Trash2 :size="17" />
              Удалить
            </button>
          </div>
        </div>

        <div class="compact-gallery-toolbar">
          <div>
            <strong>Галерея</strong>
            <small>{{ store.profile.photos.length ? `${store.profile.photos.length} фото в профиле` : 'Добавь 3-5 снимков' }}</small>
          </div>
          <label class="primary-button file-button">
            <ImagePlus :size="17" />
            Добавить
            <input type="file" accept="image/*" multiple @change="store.addProfilePhotos" />
          </label>
        </div>

        <div v-if="store.profile.photos.length" class="compact-gallery-strip">
          <div
            v-for="photo in galleryPreview"
            :key="photo.id"
            class="compact-gallery-item"
            :class="{ editing: store.editingPhotoId === photo.id }"
          >
            <div class="compact-gallery-photo">
              <img
                :src="photo.imageUrl"
                :style="
                  store.imagePositionStyle(
                    store.editingPhotoId === photo.id ? store.photoEditForm.positionX : photo.positionX,
                    store.editingPhotoId === photo.id ? store.photoEditForm.positionY : photo.positionY,
                  )
                "
                alt=""
              />
              <div class="photo-actions">
                <button type="button" aria-label="Редактировать фото" @click="store.editProfilePhoto(photo)">
                  <Pencil :size="14" />
                </button>
                <button type="button" aria-label="Сделать аватаром" @click="store.setProfileAvatarFromPhoto(photo)">
                  <Star :size="14" />
                </button>
                <button type="button" aria-label="Удалить фото" @click="store.removeProfilePhoto(photo.id)">
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>

            <div v-if="store.editingPhotoId === photo.id" class="compact-photo-tools">
              <input v-model.trim="store.photoEditForm.caption" type="text" maxlength="120" placeholder="Подпись к фото" />
              <div class="compact-photo-actions">
                <label class="ghost-button file-button">
                  <Camera :size="15" />
                  Заменить
                  <input type="file" accept="image/*" @change="store.replaceProfilePhoto($event, photo.id)" />
                </label>
                <button class="ghost-button" type="button" @click="store.cancelPhotoEdit">
                  <X :size="15" />
                  Отмена
                </button>
                <button class="primary-button" type="button" :disabled="store.isPhotoUploading" @click="store.saveProfilePhoto(photo.id)">
                  <Save :size="15" />
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="compact-empty-gallery">
          <ImagePlus :size="22" />
          <span>Пока нет фото. Снимки можно добавить без перезагрузки страницы.</span>
        </div>
        <p v-if="store.isPhotoUploading" class="muted">Загружаем фото...</p>
      </div>

      <div v-else-if="editorTab === 'profile'" class="compact-editor-body compact-form-grid">
        <label>
          <span>Ник</span>
          <div class="field">
            <AtSign :size="18" />
            <input v-model.trim="store.profileForm.handle" type="text" placeholder="kostnine" required />
          </div>
        </label>

        <label>
          <span>Имя</span>
          <div class="field">
            <UserRound :size="18" />
            <input v-model.trim="store.profileForm.name" type="text" placeholder="Kostnine" required />
          </div>
        </label>

        <label class="wide-field">
          <span>Био</span>
          <textarea
            v-model.trim="store.profileForm.bio"
            rows="3"
            placeholder="Коротко о себе. Например: люблю прогулки, кофе и спокойное общение."
          ></textarea>
        </label>

        <label>
          <span>Instagram</span>
          <div class="field">
            <AtSign :size="18" />
            <input v-model.trim="store.profileForm.instagram" type="text" placeholder="@username" />
          </div>
        </label>

        <label>
          <span>Telegram</span>
          <div class="field">
            <MessageCircle :size="18" />
            <input v-model.trim="store.profileForm.telegram" type="text" placeholder="t.me/username" />
          </div>
        </label>

        <label>
          <span>Телефон</span>
          <div class="field">
            <Phone :size="18" />
            <input v-model.trim="store.profileForm.phone" type="text" placeholder="+370..." />
          </div>
        </label>
      </div>

      <div v-else class="compact-editor-body compact-privacy-editor">
        <label class="toggle-row">
          <input v-model="store.profileForm.showOnMap" type="checkbox" />
          <span class="toggle-icon">
            <Eye v-if="store.profileForm.showOnMap" :size="18" />
            <EyeOff v-else :size="18" />
          </span>
          <span>
            <strong>{{ store.profileForm.showOnMap ? 'Показываться на карте' : 'Скрыться с карты' }}</strong>
            <small>Точная точка не показывается, только примерный район.</small>
          </span>
        </label>

        <div class="compact-form-grid">
          <label>
            <span>Город</span>
            <div class="field">
              <MapPin :size="18" />
              <input v-model.trim="store.profileForm.city" type="text" placeholder="Vilnius" />
            </div>
          </label>

          <label>
            <span>Район</span>
            <div class="field">
              <Navigation :size="18" />
              <input v-model.trim="store.profileForm.area" type="text" placeholder="Old Town" />
            </div>
          </label>

          <div class="wide-field compact-choice-field">
            <span>Радиус видимости</span>
            <div class="radius-option-grid" role="radiogroup" aria-label="Радиус видимости">
              <button
                v-for="radius in radiusOptions"
                :key="radius"
                type="button"
                :class="{ active: Number(store.profileForm.radius) === radius }"
                @click="store.profileForm.radius = radius"
              >
                {{ radiusLabel(radius) }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="compact-save-row">
        <p v-if="store.apiError" class="form-error">{{ store.apiError }}</p>
        <button class="primary-button" type="submit" :disabled="store.isProfileSaving || store.isPhotoUploading">
          <Check v-if="store.profileSaved" :size="18" />
          <Save v-else :size="18" />
          {{ store.profileSaved ? 'Сохранено' : store.isProfileSaving ? 'Сохраняем...' : 'Сохранить' }}
        </button>
        <button class="ghost-button" type="button" @click="editorTab = editorTab === 'photos' ? 'profile' : 'photos'">
          <ChevronRight :size="17" />
          {{ editorTab === 'photos' ? 'К данным' : 'К фото' }}
        </button>
      </div>
    </form>

    <AvatarCropModal
      v-if="cropSource"
      :source="cropSource"
      @cancel="cropSource = ''"
      @save="saveAvatarCrop"
    />
  </section>
</template>
