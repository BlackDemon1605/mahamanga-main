import { useEffect, useState, ReactNode } from 'react';

interface ContentProtectionProps {
  children: ReactNode;
  enabled?: boolean;
}

export function ContentProtection({ children, enabled = true }: ContentProtectionProps) {
  const [isBlurred, setIsBlurred] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    // Prevent right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent keyboard shortcuts for screenshots and copying
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        navigator.clipboard.writeText('');
        return false;
      }

      // Ctrl+P (Print)
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        return false;
      }

      // Ctrl+S (Save)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        return false;
      }

      // Ctrl+C (Copy)
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        return false;
      }

      // Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }

      // Ctrl+Shift+J (DevTools Console)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
      }

      // Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
      }

      // F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }

      // Cmd+Shift+4 (Mac Screenshot)
      if (e.metaKey && e.shiftKey && e.key === '4') {
        e.preventDefault();
        return false;
      }

      // Cmd+Shift+3 (Mac Screenshot)
      if (e.metaKey && e.shiftKey && e.key === '3') {
        e.preventDefault();
        return false;
      }
    };

    // Blur content when window loses focus (potential screenshot attempt)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlurred(true);
      } else {
        // Small delay before unblurring
        setTimeout(() => setIsBlurred(false), 300);
      }
    };

    // Blur on window blur
    const handleWindowBlur = () => {
      setIsBlurred(true);
    };

    const handleWindowFocus = () => {
      setTimeout(() => setIsBlurred(false), 300);
    };

    // Prevent drag and drop of images
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent copying
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent cutting
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [enabled]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div 
      className={`content-protected transition-all duration-300 ${isBlurred ? 'blur-lg' : ''}`}
      style={{
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      {children}
    </div>
  );
}
