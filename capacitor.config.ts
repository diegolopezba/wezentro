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
      // Keyboard overlays the webview; we lift inputs ourselves via
      // the --keyboard-height CSS variable so the page behind never reflows.
      resize: 'none',
    },
    // iOS Privacy usage descriptions (required for App Store review)
    Permissions: {
      // Location — shown when requesting geolocation for nearby events
      NSLocationWhenInUseUsageDescription: 'Zentro usa tu ubicación para mostrarte eventos cercanos y ayudarte a crear eventos en tu lugar.',
      // Camera — shown when uploading event or profile photos
      NSCameraUsageDescription: 'Zentro usa la cámara para que puedas subir fotos de perfil y de tus eventos.',
      // Microphone — required when uploading videos that capture audio
      NSMicrophoneUsageDescription: 'Zentro accede al micrófono para grabar audio cuando subes videos a tus eventos o perfil.',
      // Photo library — shown when picking images for events/profile
      NSPhotoLibraryUsageDescription: 'Zentro accede a tu galería para que puedas elegir fotos para tu perfil y tus eventos.',
      NSPhotoLibraryAddUsageDescription: 'Zentro puede guardar imágenes de eventos en tu galería.',
      // Push notifications
      NSUserNotificationsUsageDescription: 'Zentro envía notificaciones sobre mensajes, eventos y actualizaciones para que no te pierdas nada.',
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
