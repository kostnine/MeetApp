<script setup>
import { computed } from 'vue'
import { ExternalLink } from '@lucide/vue'

const props = defineProps({
  contact: {
    type: Object,
    required: true,
  },
})

const primaryContact = computed(() => props.contact.instagram || props.contact.telegram || props.contact.phone || '')

const contactHref = computed(() => {
  const value = primaryContact.value.trim()
  const lower = value.toLowerCase()

  if (!value) return ''
  if (lower.startsWith('http')) return value
  if (lower.includes('t.me')) return `https://${value.replace(/^https?:\/\//, '')}`
  if (value.startsWith('@')) return `https://instagram.com/${value.slice(1)}`
  if (/\d/.test(value)) return `tel:${value.replace(/\s/g, '')}`

  return ''
})
</script>

<template>
  <article class="contact-card">
    <div class="mini-avatar">{{ contact.alias.slice(0, 1).toUpperCase() }}</div>
    <div>
      <h3>{{ contact.alias }}</h3>
      <p>{{ primaryContact || 'контакт скрыт' }}</p>
      <small>{{ contact.note }} · {{ contact.source }} · {{ contact.date }}</small>
    </div>
    <a
      v-if="contactHref"
      class="ghost-button small"
      :href="contactHref"
      target="_blank"
      rel="noreferrer"
    >
      <ExternalLink :size="16" />
      открыть
    </a>
    <button v-else class="ghost-button small" type="button" disabled>
      <ExternalLink :size="16" />
      открыть
    </button>
  </article>
</template>
