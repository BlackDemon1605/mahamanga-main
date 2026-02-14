import { Link } from 'react-router-dom';
import { Play, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface HistoryCardProps {
  comicId: string;
  title: string;
  coverUrl?: string;
  chapterId?: string | null;
  chapterNumber?: number | null;
  chapterTitle?: string | null;
  pageNumber?: number | null;
  lastReadAt: string;
}

export function HistoryCard({
  comicId,
  title,
  coverUrl,
  chapterId,
  chapterNumber,
  pageNumber,
  lastReadAt,
}: HistoryCardProps) {
  const continueLink = chapterId 
    ? `/reader/${comicId}/${chapterId}?page=${pageNumber || 1}`
    : `/comic/${comicId}`;

  const progressText = chapterNumber 
    ? `Ch. ${chapterNumber}${pageNumber ? `, Page ${pageNumber}` : ''}`
    : 'Not started';

  const timeAgo = formatDistanceToNow(new Date(lastReadAt), { addSuffix: true });

  return (
    <div className="group animate-fade-up">
      <Link to={continueLink} className="block">
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
              <Clock className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-90" />
          
          {/* Continue badge */}
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-primary/90 rounded-md">
            <Play className="w-3 h-3 fill-current" />
            <span className="text-[10px] font-semibold">Continue</span>
          </div>

          {/* Time ago */}
          <div className="absolute top-2 right-2 px-2 py-1 bg-background/80 backdrop-blur-sm rounded-md">
            <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
          </div>
          
          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="font-semibold text-sm line-clamp-2 mb-1 text-foreground group-hover:text-primary transition-colors">
              {title}
            </h3>
            
            <p className="text-xs text-primary font-medium">
              {progressText}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}