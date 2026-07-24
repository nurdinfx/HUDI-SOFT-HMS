import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'online.hudisoft.hms',
  appName: 'HUDI-SOFT HMS',
  webDir: 'out',
  server: {
    url: 'https://hudi-soft-hms.vercel.app',
    cleartext: true
  }
};

export default config;
