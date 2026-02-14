import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ComicRow } from '@/components/comics/ComicRow';

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
        .limit(6);

      if (error) throw error;
      return data;
    },
  });

  if (!isLoading && comics.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-lg font-bold text-shine">{genre}</h2>
        </div>
        {viewAllPath && (
          <a href={viewAllPath} className="text-muted-foreground hover:text-primary text-sm flex items-center gap-1">
            View all
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </a>
        )}
      </div>
      <ComicRow comics={comics} loading={isLoading} />
    </section>
  );
}
