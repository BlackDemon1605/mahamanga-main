import { Home, Search, Upload, User, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { icon: Users, label: 'Community', path: '/community' },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: Home, label: 'Home', path: '/' },
  { icon: Upload, label: 'Upload', path: '/upload' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-strong border-t border-border/50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          const isProtected = path === '/upload' || path === '/profile';
          const finalPath = isProtected && !user ? '/auth' : path;
          
          return (
            <Link key={path} to={finalPath}>
              <Button
                variant={isActive ? 'navActive' : 'nav'}
                size="icon"
                className="flex flex-col items-center justify-center h-14 w-12 gap-1"
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
                <span className={`text-[9px] font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {label}
                </span>
              </Button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
