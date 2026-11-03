import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'org.mercybird.app',
  appName: 'Mercy Bird',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
}

export default config
