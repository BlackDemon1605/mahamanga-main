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
    <div className="min-h-screen bg-gradient-dark">
      {!hideHeader && <Header />}
      <main className={`${!hideHeader ? 'pt-14' : ''} ${!hideNav ? 'pb-20' : ''}`}>
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
