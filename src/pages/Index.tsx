import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { ComicRow } from '@/components/comics/ComicRow';
import { PromoBanner } from '@/components/home/PromoBanner';
import { TrendingSlider } from '@/components/home/TrendingSlider';
import { GenreSection } from '@/components/home/GenreSection';
import { CommunityFeed } from '@/components/community/CommunityFeed';
import { Clock, TrendingUp, Users, Swords, Skull, Heart, Rocket } from 'lucide-react';

export default function Index() {
  const { data: trendingComics, isLoading: loadingTrending } = useQuery({
    queryKey: ['comics', 'trending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comics')
        .select('*, chapters(id)')
        .eq('is_published', true)
        .order('view_count', { ascending: false })
        .limit(6);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: latestComics, isLoading: loadingLatest } = useQuery({
    queryKey: ['comics', 'latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comics')
        .select('*, chapters(id)')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <MainLayout>
      <div className="px-4 py-6 space-y-8 max-w-7xl mx-auto">
        {/* Trending Slider - Hero (top 6 most viewed) */}
        <TrendingSlider comics={trendingComics || []} />

        {/* Promo Banners */}
        <PromoBanner />

        {/* Latest Updates section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary emoji-glow" />
              <h2 className="text-lg font-bold text-shine">Latest Updates</h2>
            </div>
            <a href="/browse?sort=latest" className="text-muted-foreground hover:text-primary text-sm flex items-center gap-1">
              View all
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </a>
          </div>
          <ComicRow comics={latestComics || []} loading={loadingLatest} />
        </section>

        {/* Genre Sections */}
        <GenreSection genre="Action" icon={<Swords className="w-5 h-5 text-primary emoji-glow" />} viewAllPath="/browse?genre=Action" />
        <GenreSection genre="Horror" icon={<Skull className="w-5 h-5 text-primary emoji-glow" />} viewAllPath="/browse?genre=Horror" />
        <GenreSection genre="Romance" icon={<Heart className="w-5 h-5 text-primary emoji-glow" />} viewAllPath="/browse?genre=Romance" />
        <GenreSection genre="Sci-Fi" icon={<Rocket className="w-5 h-5 text-primary emoji-glow" />} viewAllPath="/browse?genre=Sci-Fi" />

        {/* Community Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary emoji-glow" />
            <h2 className="text-lg font-bold text-shine">Community</h2>
          </div>
          <CommunityFeed />
        </section>

        {/* Empty state */}
        {!loadingTrending && !loadingLatest && 
         (!trendingComics || trendingComics.length === 0) && 
         (!latestComics || latestComics.length === 0) && (
          <section className="text-center py-16">
            <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No comics yet</h2>
            <p className="text-muted-foreground mb-6">
              Be the first to upload your manga or webtoon!
            </p>
          </section>
        )}
      </div>
    </MainLayout>
  );
}
