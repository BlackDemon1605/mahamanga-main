import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { ComicGrid } from '@/components/comics/ComicGrid';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const GENRE_TABS = [
  { value: 'all', label: 'All' },
  { value: 'action', label: 'Action' },
  { value: 'horror', label: 'Horror' },
  { value: 'romance', label: 'Romance' },
  { value: 'sci-fi', label: 'Sci-Fi' },
];

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = searchParams.get('sort') || 'trending';
  const genre = searchParams.get('genre') || 'all';

  const title = sort === 'latest' ? 'Latest Updates' : 'Trending Now';

  const { data: comics, isLoading } = useQuery({
    queryKey: ['comics', 'browse', sort, genre],
    queryFn: async () => {
      let query = supabase
        .from('comics')
        .select('*, chapters(id)')
        .eq('is_published', true);

      if (genre !== 'all') {
        query = query.contains('genre', [genre]);
      }

      if (sort === 'latest') {
        query = query.order('created_at', { ascending: false });
      } else {
        query = query.order('view_count', { ascending: false });
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
  });

  const handleGenreChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === 'all') {
      params.delete('genre');
    } else {
      params.set('genre', value);
    }
    setSearchParams(params);
  };

  return (
    <MainLayout>
      <div className="px-4 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Link to="/">
            <Button variant="ghost" size="iconSm">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-shine">{title}</h1>
        </div>

        <Tabs value={genre} onValueChange={handleGenreChange} className="mb-6">
          <TabsList className="w-full justify-start overflow-x-auto">
            {GENRE_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <ComicGrid comics={comics || []} loading={isLoading} />
      </div>
    </MainLayout>
  );
}
