import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, BookOpen, Eye, ChevronRight as ArrowRight } from 'lucide-react';
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
      className="relative rounded-2xl overflow-hidden bg-secondary aspect-[16/9] sm:aspect-[2/1] md:aspect-[21/9] card-glow"
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
          className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
          loading="lazy"
        />
      )}

      {/* Gradient overlays - deeper */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
      
      {/* Subtle glow behind content */}
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-primary/5 blur-3xl rounded-full" />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end h-full p-5 sm:p-6 md:p-8 max-w-lg">
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-primary mb-1.5 flex items-center gap-1.5">
          🔥 <span className="text-accent">Featured</span>
        </span>
        <h2 className="text-xl sm:text-2xl md:text-4xl font-extrabold mb-1.5 text-shine line-clamp-2 tracking-tight">{comic.title}</h2>
        {comic.description && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">{comic.description}</p>
        )}
        <div className="flex items-center gap-3">
          <Link to={`/comic/${comic.id}`}>
            <Button size="lg" className="bg-gradient-primary text-primary-foreground font-bold text-sm sm:text-base px-6 cta-glow rounded-xl">
              <BookOpen className="w-4 h-4 mr-2" />
              Start Reading
              <ArrowRight className="w-4 h-4 ml-1.5 arrow-icon" />
            </Button>
          </Link>
          {comic.view_count != null && comic.view_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground bg-background/40 backdrop-blur-sm px-2 py-1 rounded-lg">
              <Eye className="w-3.5 h-3.5 text-accent" /> {comic.view_count.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Nav arrows */}
      {comics.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-background/40 backdrop-blur-md border border-border/30 hover:bg-background/70 hover:border-primary/40 transition-all">
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-background/40 backdrop-blur-md border border-border/30 hover:bg-background/70 hover:border-primary/40 transition-all">
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {comics.length > 1 && (
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {comics.slice(0, 8).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current 
                  ? 'bg-primary w-6 shadow-glow' 
                  : 'bg-foreground/20 w-1.5 hover:bg-foreground/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
