import { ReactNode } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

interface MainLayoutProps {
  children: ReactNode;
  hideHeader?: boolean;
  hideNav?: boolean;
}

export function MainLayout({ children, hideHeader, hideNav }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-dark bg-ambient">
      {!hideHeader && <Header />}
      <main
        className={`relative z-[1] safe-area-x ${!hideHeader ? 'pt-safe-header' : 'safe-area-top'} ${
          !hideNav ? 'pb-safe-nav' : 'safe-area-bottom'
        }`}
      >
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
