import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.a812f800384e4a80818ea38ac62424d4',
  appName: 'Zentro',
  webDir: 'dist',
  server: {
    url: 'https://a812f800-384e-4a80-818e-a38ac62424d4.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0A0A0B',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0A0A0B'
    }
  }
};

export default config;
