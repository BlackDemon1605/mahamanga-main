import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import logo from '@/assets/logo.jpg';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Button } from '@/components/ui/button';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const canGoBack = location.pathname !== '/';

  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass-strong border-b border-border/30 safe-area-top safe-area-x">
      <div className="flex items-center justify-between h-14 px-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-1 min-w-0">
          {canGoBack && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Go back"
              className="h-9 w-9 shrink-0 -ml-2"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <img src={logo} alt="Maha Manga" className="w-9 h-9 rounded-xl object-cover shadow-glow shrink-0" />
            <span className="text-xl font-extrabold text-gradient tracking-tight truncate">Maha Manga</span>
          </Link>
        </div>
        <NotificationBell />
      </div>
    </header>
  );
}
