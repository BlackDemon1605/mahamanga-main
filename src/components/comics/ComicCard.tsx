import { Link } from 'react-router-dom';
import { Eye, BookOpen } from 'lucide-react';

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
  return (
    <Link 
      to={`/comic/${id}`}
      className="group block animate-fade-up"
    >
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gradient-card shadow-card">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary">
            <BookOpen className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-80" />
        
        {/* Publish status badge - shown only for creator's own comics view */}
        {showPublishStatus && (
          <span className={`absolute top-2 left-2 px-2 py-0.5 text-[10px] font-semibold uppercase rounded-md ${
            isPublished ? 'bg-green-500/90 text-white' : 'bg-muted text-muted-foreground'
          }`}>
            {isPublished ? 'Public' : 'Draft'}
          </span>
        )}

        {/* Total views badge overlay */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/70 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
          <Eye className="w-3 h-3 text-foreground" />
          <span className="text-[10px] font-medium text-foreground">
            {viewCount >= 1000000 
              ? `${(viewCount / 1000000).toFixed(1)}M` 
              : viewCount >= 1000 
              ? `${(viewCount / 1000).toFixed(1)}K` 
              : viewCount}
          </span>
        </div>
        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-semibold text-sm line-clamp-2 mb-1 text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          
          {genre && genre.length > 0 && (
            <p className="text-[10px] text-muted-foreground mb-2 line-clamp-1">
              {genre.slice(0, 2).join(' • ')}
            </p>
          )}
          
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {chapterCount} ch
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
