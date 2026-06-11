import './assets/main.css'

import { createApp } from 'vue'
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faAppleWhole,
  faChevronLeft,
  faChevronRight,
  faCloud,
  faBookOpen,
  faCircleHalfStroke,
  faCircleQuestion,
  faLeaf,
  faLemon,
  faMusic,
  faStar,
  faSun,
  faVolumeXmark,
  faWallet,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'

import App from './App.vue'
import router from './router'

library.add(
  faAppleWhole,
  faChevronLeft,
  faChevronRight,
  faCloud,
  faBookOpen,
  faCircleHalfStroke,
  faCircleQuestion,
  faLeaf,
  faLemon,
  faMusic,
  faStar,
  faSun,
  faVolumeXmark,
  faWallet,
  faXmark,
)

const app = createApp(App)

app.component('FontAwesomeIcon', FontAwesomeIcon)
app.use(router)

app.mount('#app')
