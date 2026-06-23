import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { MotionPlugin } from '@vueuse/motion'
import './glass/glass.css'
import AppShell from './glass/AppShell.vue'
import router from './glass/router'

createApp(AppShell).use(createPinia()).use(router).use(MotionPlugin).mount('#app')
