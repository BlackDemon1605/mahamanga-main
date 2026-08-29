import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ComicCard } from '@/components/comics/ComicCard';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface GenreSectionProps {
  genre: string;
  icon: React.ReactNode;
  viewAllPath?: string;
}

export function GenreSection({ genre, icon, viewAllPath }: GenreSectionProps) {
  const { data: comics = [], isLoading } = useQuery({
    queryKey: ['comics', 'genre', genre],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comics')
        .select('*, chapters(id)')
        .eq('is_published', true)
        .contains('genre', [genre])
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;
      return data;
    },
  });

  if (!isLoading && comics.length === 0) return null;

  // Show max 12 cards (2 rows of 6)
  const displayComics = comics.slice(0, 12);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl font-extrabold text-shine">{genre}</h2>
        </div>
        {viewAllPath && (
          <Link to={viewAllPath} className="text-accent hover:text-primary text-sm flex items-center gap-1 font-medium transition-colors">
            View all
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-xl skeleton" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {displayComics.map((comic) => (
            <div key={comic.id}>
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
      )}
    </section>
  );
}
