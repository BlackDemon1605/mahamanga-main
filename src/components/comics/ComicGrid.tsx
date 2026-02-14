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

interface ComicGridProps {
  comics: Comic[];
  loading?: boolean;
  showPublishStatus?: boolean;
}

export function ComicGrid({ comics, loading, showPublishStatus = false }: ComicGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="aspect-[3/4] rounded-xl skeleton" />
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {comics.map((comic, index) => (
        <div key={comic.id} style={{ animationDelay: `${index * 50}ms` }}>
          <ComicCard
            id={comic.id}
            title={comic.title}
            coverUrl={comic.cover_image_url}
            genre={comic.genre}
            viewCount={comic.view_count}
            chapterCount={comic.chapters?.length || 0}
            isPublished={comic.is_published}
            showPublishStatus={showPublishStatus}
          />
        </div>
      ))}
    </div>
  );
}
