import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.aurora.boxofficetycoon',
  appName: 'Box Office Tycoon',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
