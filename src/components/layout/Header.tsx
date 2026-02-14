import { Link } from 'react-router-dom';
import logo from '@/assets/logo.jpg';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass-strong border-b border-border/50">
      <div className="flex items-center justify-between h-14 px-4 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Maha Manga" className="w-8 h-8 rounded-lg object-cover" />
          <span className="text-xl font-bold text-gradient">Maha Manga</span>
        </Link>
      </div>
    </header>
  );
}