import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, BookOpen, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Comic {
  id: string;
  title: string;
  description?: string | null;
  cover_image_url?: string | null;
  view_count?: number | null;
}

export function TrendingSlider({ comics }: { comics: Comic[] }) {
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const next = useCallback(() => {
    setCurrent(prev => (prev + 1) % comics.length);
  }, [comics.length]);

  const prev = useCallback(() => {
    setCurrent(prev => (prev - 1 + comics.length) % comics.length);
  }, [comics.length]);

  useEffect(() => {
    if (comics.length <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, comics.length]);

  if (comics.length === 0) return null;

  const comic = comics[current];

  return (
    <div
      className="relative rounded-2xl overflow-hidden bg-secondary aspect-[16/9] sm:aspect-[2/1] md:aspect-[21/9]"
      onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStart === null) return;
        const diff = touchStart - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
          diff > 0 ? next() : prev();
        }
        setTouchStart(null);
      }}
    >
      {/* Background cover */}
      {comic.cover_image_url && (
        <img
          src={comic.cover_image_url}
          alt={comic.title}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          loading="lazy"
        />
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end h-full p-5 sm:p-6 md:p-8 max-w-md">
        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-primary mb-1">🔥 Trending</span>
        <h2 className="text-lg sm:text-xl md:text-3xl font-bold mb-1 text-shine line-clamp-2">{comic.title}</h2>
        {comic.description && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3">{comic.description}</p>
        )}
        <div className="flex items-center gap-3">
          <Link to={`/comic/${comic.id}`}>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm">
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              Read Now
            </Button>
          </Link>
          {comic.view_count != null && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="w-3.5 h-3.5" /> {comic.view_count}
            </span>
          )}
        </div>
      </div>

      {/* Nav arrows */}
      {comics.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-colors">
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-colors">
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {comics.length > 1 && (
        <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {comics.slice(0, 8).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all ${i === current ? 'bg-primary w-3 sm:w-4' : 'bg-foreground/30'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
