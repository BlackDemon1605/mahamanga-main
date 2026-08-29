import { Link } from 'react-router-dom';
import { Eye, BookOpen, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ComicCardProps {
  id: string;
  title: string;
  coverUrl?: string;
  genre?: string[];
  viewCount?: number;
  chapterCount?: number;
  status?: string;
  isPublished?: boolean;
  showPublishStatus?: boolean;
}

export function ComicCard({ id, title, coverUrl, genre, viewCount = 0, chapterCount = 0, isPublished, showPublishStatus = false }: ComicCardProps) {
  const { data: ratingData } = useQuery({
    queryKey: ['comic-avg-rating', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ratings')
        .select('rating')
        .eq('comic_id', id);
      if (error) return { avg: 0, count: 0 };
      const count = data?.length || 0;
      const sum = data?.reduce((a, r) => a + r.rating, 0) || 0;
      return { avg: count > 0 ? sum / count : 0, count };
    },
    staleTime: 60000,
  });

  return (
    <Link 
      to={`/comic/${id}`}
      className="group block"
    >
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gradient-card shadow-card card-glow shine-overlay">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary">
            <BookOpen className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Publish status badge */}
        {showPublishStatus && (
          <span className={`absolute top-2 left-2 px-2 py-0.5 text-[10px] font-semibold uppercase rounded-md ${
            isPublished ? 'bg-green-500/90 text-white' : 'bg-muted text-muted-foreground'
          }`}>
            {isPublished ? 'Public' : 'Draft'}
          </span>
        )}

        {/* Views badge */}
        {viewCount > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/60 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-border/30">
            <Eye className="w-3 h-3 text-accent" />
            <span className="text-[10px] font-medium text-foreground">
              {viewCount >= 1000000 
                ? `${(viewCount / 1000000).toFixed(1)}M` 
                : viewCount >= 1000 
                ? `${(viewCount / 1000).toFixed(1)}K` 
                : viewCount}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-bold text-sm line-clamp-1 mb-1 text-foreground">
            {title}
          </h3>
          
          {genre && genre.length > 0 && (
            <div className="flex items-center gap-1.5 mb-1.5">
              {genre.slice(0, 2).map(g => (
                <span key={g} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium border border-primary/20">
                  {g}
                </span>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {chapterCount} ch
            </span>
            {ratingData && ratingData.avg > 0 && (
              <span className="flex items-center gap-0.5 text-accent">
                <Star className="w-3 h-3 fill-accent" />
                {ratingData.avg.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
