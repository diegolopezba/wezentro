import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.NODE_ENV !== 'production';

const config: CapacitorConfig = {
  appId: 'app.lovable.a812f800384e4a80818ea38ac62424d4',
  appName: 'Zentro',
  webDir: 'dist',

  // DEV ONLY: hot-reload from preview server. Remove or set isDev=false for store builds.
  ...(isDev && {
    server: {
      url: 'https://a812f800-384e-4a80-818e-a38ac62424d4.lovableproject.com?forceHideBadge=true',
      cleartext: true,
    },
  }),

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0A0A0B',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0A0A0B',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },

  android: {
    allowMixedContent: false,
    backgroundColor: '#0A0A0B',
  },

  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0A0A0B',
    preferredContentMode: 'mobile',
    scheme: 'zentro',
  },
};

export default config;
