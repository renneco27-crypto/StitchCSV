import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.studyup.app',
  appName: 'StudyUp',
  webDir: 'out',
  server: {
    url: 'https://stitchcsv.onrender.com',
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0a0c10',
  },
}

export default config
