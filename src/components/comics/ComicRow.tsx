import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ComicCard } from './ComicCard';

interface Comic {
  id: string;
  title: string;
  cover_image_url?: string;
  genre?: string[];
  view_count?: number;
  status?: string;
  is_published?: boolean;
  chapters?: { id: string }[];
}

interface ComicRowProps {
  comics: Comic[];
  loading?: boolean;
}

export function ComicRow({ comics, loading }: ComicRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 240;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="min-w-[150px] sm:min-w-[170px] aspect-[3/4] rounded-xl skeleton shrink-0" />
        ))}
      </div>
    );
  }

  if (comics.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">No comics found</p>
      </div>
    );
  }

  return (
    <div className="relative group">
      {/* Left arrow */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Scrollable row */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {comics.map((comic) => (
          <div key={comic.id} className="min-w-[150px] sm:min-w-[170px] max-w-[170px] shrink-0">
            <ComicCard
              id={comic.id}
              title={comic.title}
              coverUrl={comic.cover_image_url}
              genre={comic.genre}
              viewCount={comic.view_count}
              chapterCount={comic.chapters?.length || 0}
              isPublished={comic.is_published}
            />
          </div>
        ))}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
