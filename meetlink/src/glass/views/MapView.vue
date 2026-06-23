<script setup>
import { useMapStore, RADIUS_OPTIONS } from '../stores/map'
import { useMeStore } from '../stores/me'
import { useUiStore } from '../stores/ui'
import GlassMap from '../components/GlassMap.vue'

const map = useMapStore()
const me = useMeStore()
const ui = useUiStore()

const radiusOptions = RADIUS_OPTIONS

function openStory(story) {
  // Open the full-screen viewer and let the user tap through every nearby story.
  const list = map.visibleStories
  const index = Math.max(0, list.findIndex((s) => s.id === story.id))
  ui.openStoryViewer(list, index)
}
function postStory() {
  ui.openPostStory()
}
function openMyStory() {
  if (map.hasMyStory) ui.openStoryViewer(map.myStories, 0, true)
  else ui.showToast('Post a story to share where you are')
}
function locate() {
  ui.showToast('Centering on your approximate location')
}
</script>

<template>
  <div class="map-view">
    <header class="map-header">
      <div>
        <div class="ml-eyebrow">Nearby</div>
        <h1 class="ml-title map-city">{{ me.profile.cityShort }}</h1>
      </div>

      <div class="map-controls-row">
        <div class="segmented">
          <button
            v-for="option in radiusOptions"
            :key="option.meters"
            type="button"
            class="seg-btn"
            :class="{ 'seg-btn--active': map.radius === option.meters }"
            @click="map.setRadius(option.meters)"
          >
            {{ option.label }}
          </button>
        </div>
        <div class="segmented">
          <button
            type="button"
            class="seg-btn"
            :class="{ 'seg-btn--active': map.view === 'map' }"
            @click="map.setView('map')"
          >
            Map
          </button>
          <button
            type="button"
            class="seg-btn"
            :class="{ 'seg-btn--active': map.view === 'list' }"
            @click="map.setView('list')"
          >
            List
          </button>
        </div>
      </div>
    </header>

    <!-- MAP VIEW -->
    <div v-if="map.view === 'map'" class="map-body">
      <GlassMap
        @open-story="openStory"
        @post-story="postStory"
        @open-my-story="openMyStory"
        @locate="locate"
      />

      <aside v-if="ui.isDesktop" class="stories-panel ml-panel">
        <div class="stories-head">
          Stories {{ map.radiusLabel === 'City' ? 'in the city' : 'nearby' }} · {{ map.nearbyCount }}
        </div>
        <div class="stories-scroll ml-scroll">
          <button
            v-for="story in map.visibleStories"
            :key="story.id"
            type="button"
            class="story-row"
            @click="openStory(story)"
          >
            <div class="story-row-avatar" :style="{ background: story.gradient }">
              <span>{{ story.mono }}</span>
              <span v-if="story.online" class="row-online" />
            </div>
            <div class="story-row-body">
              <div class="story-row-name">
                <span class="name">{{ story.name }}</span>
                <span class="age">{{ story.age }}</span>
              </div>
              <div class="story-row-text">{{ story.text }}</div>
            </div>
            <div class="story-row-dist">{{ story.dist }}</div>
          </button>
        </div>
      </aside>
    </div>

    <!-- LIST VIEW -->
    <div v-else class="list-body ml-scroll">
      <div class="list-grid">
        <button
          v-for="story in map.visibleStories"
          :key="story.id"
          type="button"
          class="story-card ml-panel"
          @click="openStory(story)"
        >
          <div class="story-card-head">
            <div class="story-card-avatar" :style="{ background: story.gradient }">
              <span>{{ story.mono }}</span>
              <span v-if="story.online" class="card-online" />
            </div>
            <div>
              <div class="story-card-name">
                <span class="name">{{ story.name }}</span>
                <span class="age">{{ story.age }}</span>
              </div>
              <div class="story-card-meta">{{ story.dist }} · {{ story.place }}</div>
            </div>
          </div>
          <div class="story-card-text">{{ story.text }}</div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 18px 18px 8px;
  gap: 14px;
  min-height: 0;
}

.map-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}
.map-city {
  margin: 2px 0 0;
}

.map-controls-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

/* Segmented controls */
.segmented {
  display: flex;
  gap: 3px;
  padding: 4px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.7);
}
.seg-btn {
  border: none;
  cursor: pointer;
  border-radius: 10px;
  padding: 8px 13px;
  font-family: var(--ml-font-body);
  font-size: 12.5px;
  font-weight: 700;
  background: transparent;
  color: var(--ml-ink-2);
  transition:
    background 0.18s ease,
    color 0.18s ease;
}
.seg-btn--active {
  background: var(--ml-accent-gradient);
  color: #fff;
  box-shadow: 0 6px 16px rgba(139, 124, 246, 0.35);
}

/* Map body */
.map-body {
  flex: 1;
  min-height: 420px;
  display: flex;
  gap: 14px;
}

/* Desktop stories side list */
.stories-panel {
  flex: none;
  width: 312px;
  display: flex;
  flex-direction: column;
  border-radius: 26px;
  overflow: hidden;
}
.stories-head {
  flex: none;
  padding: 18px 20px 10px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ml-eyebrow);
}
.stories-scroll {
  flex: 1;
  overflow: auto;
  padding: 0 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.story-row {
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px;
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid transparent;
  transition:
    background 0.16s ease,
    border-color 0.16s ease;
}
.story-row:hover {
  background: rgba(255, 255, 255, 0.7);
  border-color: rgba(255, 255, 255, 0.8);
}
.story-row-avatar,
.story-card-avatar {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-family: var(--ml-font-display);
  font-weight: 700;
  /* Instagram-style "active story" ring: white gap + accent ring. */
  box-shadow:
    0 0 0 2px #fff,
    0 0 0 4px rgba(139, 124, 246, 0.85);
}
.story-row-avatar {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  font-size: 18px;
}
.row-online,
.card-online {
  position: absolute;
  right: -2px;
  bottom: -2px;
  border-radius: 999px;
  background: var(--ml-online);
  border: 2.5px solid #fff;
}
.row-online {
  width: 12px;
  height: 12px;
}
.story-row-body {
  flex: 1;
  min-width: 0;
}
.story-row-name {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.story-row-name .name {
  font-family: var(--ml-font-display);
  font-weight: 600;
  font-size: 15px;
  color: var(--ml-ink-1);
}
.story-row-name .age {
  font-size: 13px;
  color: var(--ml-ink-3);
}
.story-row-text {
  font-size: 12px;
  color: #7c7493;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}
.story-row-dist {
  flex: none;
  font-family: var(--ml-font-display);
  font-size: 12px;
  font-weight: 700;
  color: var(--ml-eyebrow);
}

/* List view */
.list-body {
  flex: 1;
  overflow: auto;
  padding-bottom: 14px;
}
.list-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}
.story-card {
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 11px;
  padding: 16px;
  border-radius: 22px;
  transition: transform 0.16s ease;
}
.story-card:hover {
  transform: translateY(-2px);
}
.story-card-head {
  display: flex;
  align-items: center;
  gap: 13px;
}
.story-card-avatar {
  width: 50px;
  height: 50px;
  border-radius: 15px;
  font-size: 20px;
}
.card-online {
  width: 13px;
  height: 13px;
}
.story-card-name {
  display: flex;
  align-items: baseline;
  gap: 7px;
}
.story-card-name .name {
  font-family: var(--ml-font-display);
  font-weight: 600;
  font-size: 16px;
  color: var(--ml-ink-1);
}
.story-card-name .age {
  font-size: 14px;
  color: var(--ml-ink-3);
}
.story-card-meta {
  font-size: 12px;
  color: var(--ml-eyebrow);
  font-weight: 700;
  margin-top: 2px;
}
.story-card-text {
  font-size: 13.5px;
  color: var(--ml-ink-2);
  line-height: 1.5;
  text-wrap: pretty;
}

@media (max-width: 999px) {
  .map-body {
    flex-direction: column;
  }
}
</style>
