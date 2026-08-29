import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Handles the Android hardware / gesture back button when running inside
 * a native shell (Capacitor). Falls back silently on plain web.
 */
export function useNativeBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const cap = (window as any).Capacitor;
    const AppPlugin = cap?.Plugins?.App;
    if (!AppPlugin?.addListener) return;

    let remove: (() => void) | undefined;

    const handler = AppPlugin.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
      if (location.pathname !== '/' && (canGoBack || window.history.length > 1)) {
        navigate(-1);
      } else {
        AppPlugin.exitApp?.();
      }
    });

    Promise.resolve(handler).then((h: any) => {
      remove = h?.remove?.bind(h);
    });

    return () => remove?.();
  }, [navigate, location.pathname]);
}
