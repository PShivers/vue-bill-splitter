import { createApp } from 'vue'
import App from './App.vue'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#3498db',
          secondary: '#2c3e50',
          accent: '#27ae60',
          error: '#e74c3c',
          success: '#27ae60',
        },
      },
      dark: {
        colors: {
          primary: '#3498db',
          secondary: '#1e1e1e',
          accent: '#27ae60',
          error: '#e74c3c',
          success: '#27ae60',
        },
      },
    },
  },
})

createApp(App)
  .use(vuetify)
  .mount('#app')