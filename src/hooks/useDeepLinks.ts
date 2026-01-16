import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export const useDeepLinks = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Only set up deep link listener on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const handleAppUrlOpen = (event: URLOpenListenerEvent) => {
      // Parse the URL and extract the path
      const url = new URL(event.url);
      const path = url.pathname;
      
      // Handle different deep link paths
      if (path.startsWith('/event/')) {
        navigate(path);
      } else if (path.startsWith('/user/')) {
        navigate(path);
      } else if (path === '/auth') {
        navigate('/auth');
      } else {
        // Default: navigate to home
        navigate('/');
      }
    };

    // Listen for app URL open events (deep links)
    App.addListener('appUrlOpen', handleAppUrlOpen);

    // Check if app was opened with a URL (cold start)
    App.getLaunchUrl().then((launchUrl) => {
      if (launchUrl?.url) {
        handleAppUrlOpen({ url: launchUrl.url });
      }
    });

    return () => {
      App.removeAllListeners();
    };
  }, [navigate]);
};
