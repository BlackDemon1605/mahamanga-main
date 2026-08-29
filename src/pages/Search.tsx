import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { ComicGrid } from '@/components/comics/ComicGrid';
import { ProfileCard } from '@/components/search/ProfileCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search as SearchIcon, X, SlidersHorizontal, BookOpen, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const genres = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports'];

export default function Search() {
  const [query, setQuery] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchType, setSearchType] = useState<'comics' | 'profiles'>('comics');

  const { data: comics, isLoading: loadingComics } = useQuery({
    queryKey: ['comics', 'search', query, selectedGenres],
    queryFn: async () => {
      let queryBuilder = supabase
        .from('comics')
        .select('*, chapters(id)')
        .eq('is_published', true);

      if (query) {
        queryBuilder = queryBuilder.ilike('title', `%${query}%`);
      }

      if (selectedGenres.length > 0) {
        queryBuilder = queryBuilder.overlaps('genre', selectedGenres);
      }

      const { data, error } = await queryBuilder.order('view_count', { ascending: false }).limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: searchType === 'comics',
  });

  const { data: profiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ['profiles', 'search', query],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: searchType === 'profiles' && query.trim().length > 0,
  });

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre) 
        : [...prev, genre]
    );
  };

  return (
    <MainLayout>
      <div className="px-4 py-6 space-y-6 max-w-7xl mx-auto">
        {/* Search Tabs */}
        <Tabs value={searchType} onValueChange={(v) => setSearchType(v as 'comics' | 'profiles')}>
          <TabsList className="w-full grid grid-cols-2 bg-secondary rounded-xl p-1">
            <TabsTrigger value="comics" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BookOpen className="w-4 h-4 mr-2" />
              Comics
            </TabsTrigger>
            <TabsTrigger value="profiles" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4 mr-2" />
              Profiles
            </TabsTrigger>
          </TabsList>

          {/* Search bar */}
          <div className="relative mt-4">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={searchType === 'comics' ? 'Search manga, manhwa, webtoons...' : 'Search users by name or username...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-12 pr-20 h-12 bg-secondary border-border rounded-xl text-base"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              {query && (
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={() => setQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {searchType === 'comics' && (
                <Button
                  variant={showFilters ? 'navActive' : 'ghost'}
                  size="iconSm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filters (only for comics) */}
          {searchType === 'comics' && showFilters && (
            <div className="animate-fade-up glass rounded-xl p-4 mt-4">
              <h3 className="text-sm font-medium mb-3">Genres</h3>
              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <Button
                    key={genre}
                    variant={selectedGenres.includes(genre) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleGenre(genre)}
                    className="rounded-full"
                  >
                    {genre}
                  </Button>
                ))}
              </div>
              {selectedGenres.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedGenres([])}
                  className="mt-3 text-muted-foreground"
                >
                  Clear all filters
                </Button>
              )}
            </div>
          )}

          {/* Results */}
          <TabsContent value="comics" className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              {comics?.length || 0} results
            </p>
            <ComicGrid comics={comics || []} loading={loadingComics} />
          </TabsContent>

          <TabsContent value="profiles" className="mt-4">
            {!query.trim() ? (
              <p className="text-center text-muted-foreground py-8">
                Search for users by name or username
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {profiles?.length || 0} results
                </p>
                {loadingProfiles ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : profiles && profiles.length > 0 ? (
                  <div className="space-y-3">
                    {profiles.map((profile) => (
                      <ProfileCard key={profile.id} profile={profile} />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No users found
                  </p>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
