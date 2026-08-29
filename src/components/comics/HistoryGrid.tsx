import { HistoryCard } from './HistoryCard';
import { Skeleton } from '@/components/ui/skeleton';

interface HistoryItem {
  comic_id: string;
  chapter_id: string | null;
  page_number: number | null;
  last_read_at: string;
  comics: {
    id: string;
    title: string;
    cover_image_url: string | null;
  } | null;
  chapters: {
    chapter_number: number;
    title: string | null;
  } | null;
}

interface HistoryGridProps {
  items: HistoryItem[];
  loading?: boolean;
}

export function HistoryGrid({ items, loading }: HistoryGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[3/4] rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No reading history yet</p>
        <p className="text-sm mt-1">Start reading to see your history here</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
      {items.map((item) => (
        item.comics && (
          <HistoryCard
            key={`${item.comic_id}-${item.chapter_id}`}
            comicId={item.comic_id}
            title={item.comics.title}
            coverUrl={item.comics.cover_image_url || undefined}
            chapterId={item.chapter_id}
            chapterNumber={item.chapters?.chapter_number}
            chapterTitle={item.chapters?.title}
            pageNumber={item.page_number}
            lastReadAt={item.last_read_at}
          />
        )
      ))}
    </div>
  );
}