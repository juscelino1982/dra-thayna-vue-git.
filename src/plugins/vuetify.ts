import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

const emeraldTheme = {
  dark: false,
  colors: {
    primary: '#10B981', // emerald-500
    secondary: '#14B8A6', // teal-500
    accent: '#06B6D4', // cyan-500
    error: '#EF4444', // red-500
    info: '#3B82F6', // blue-500
    success: '#10B981', // emerald-500
    warning: '#F59E0B', // amber-500
    background: '#F0FDF4', // emerald-50
    surface: '#FFFFFF',
  },
}

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'emeraldTheme',
    themes: {
      emeraldTheme,
    },
  },
  icons: {
    defaultSet: 'mdi',
  },
})
