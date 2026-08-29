import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ComicRow } from '@/components/comics/ComicRow';
import { PromoBanner } from '@/components/home/PromoBanner';
import { TrendingSlider } from '@/components/home/TrendingSlider';
import { GenreSection } from '@/components/home/GenreSection';
import { CommunityFeed } from '@/components/community/CommunityFeed';
import { Link } from 'react-router-dom';
import { Clock, TrendingUp, Users, Flame, Sparkles, BookOpen, ChevronRight } from 'lucide-react';
import actionImg from '@/assets/genres/action.png';
import adventureImg from '@/assets/genres/adventure.png';
import comedyImg from '@/assets/genres/comedy.png';
import dramaImg from '@/assets/genres/drama.png';
import fantasyImg from '@/assets/genres/fantasy.png';
import horrorImg from '@/assets/genres/horror.png';
import romanceImg from '@/assets/genres/romance.png';
import sciFiImg from '@/assets/genres/sci-fi.png';
import sliceOfLifeImg from '@/assets/genres/slice-of-life.png';
import sportsImg from '@/assets/genres/sports.png';

export default function Index() {
  const { profile } = useAuth();

  // Featured / most viewed for hero
  const { data: featuredComics } = useQuery({
    queryKey: ['comics', 'featured'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comics')
        .select('*')
        .eq('is_published', true)
        .order('view_count', { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  // Trending this week (most viewed)
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

  // Recently added
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

  // Continue reading (user's reading history)
  const { data: continueReading } = useQuery({
    queryKey: ['continue-reading', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('reading_history')
        .select('*, comics(*)')
        .eq('user_id', profile.id)
        .order('last_read_at', { ascending: false })
        .limit(6);
      if (error) throw error;
      return data?.map(rh => ({
        ...rh.comics,
        chapters: [],
      })) || [];
    },
    enabled: !!profile?.id,
  });

  const genres = [
    { name: 'Action', img: actionImg, path: '/browse?genre=Action' },
    { name: 'Adventure', img: adventureImg, path: '/browse?genre=Adventure' },
    { name: 'Comedy', img: comedyImg, path: '/browse?genre=Comedy' },
    { name: 'Drama', img: dramaImg, path: '/browse?genre=Drama' },
    { name: 'Fantasy', img: fantasyImg, path: '/browse?genre=Fantasy' },
    { name: 'Horror', img: horrorImg, path: '/browse?genre=Horror' },
    { name: 'Romance', img: romanceImg, path: '/browse?genre=Romance' },
    { name: 'Sci-Fi', img: sciFiImg, path: '/browse?genre=Sci-Fi' },
    { name: 'Slice of Life', img: sliceOfLifeImg, path: '/browse?genre=Slice of Life' },
    { name: 'Sports', img: sportsImg, path: '/browse?genre=Sports' },
  ];

  return (
    <MainLayout>
      <div className="px-4 py-6 space-y-10 max-w-7xl mx-auto">
        
        {/* 🔥 Featured Hero */}
        <TrendingSlider comics={featuredComics || []} />

        {/* Promo Banners */}
        <PromoBanner />

        {/* 📈 Trending This Week */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-primary emoji-glow" />
              <h2 className="text-xl font-extrabold text-shine">Trending This Week</h2>
            </div>
            <a href="/browse?sort=trending" className="text-accent hover:text-primary text-sm flex items-center gap-1 font-medium transition-colors">
              View all
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>


          <ComicRow comics={trendingComics || []} loading={loadingTrending} />
        </section>

        {/* 🆕 Recently Added */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent emoji-glow" />
              <h2 className="text-xl font-extrabold text-shine">Recently Added</h2>
            </div>
            <a href="/browse?sort=latest" className="text-accent hover:text-primary text-sm flex items-center gap-1 font-medium transition-colors">
              View all
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>


          <ComicRow comics={latestComics || []} loading={loadingLatest} />
        </section>

        {/* 📖 Continue Reading */}
        {continueReading && continueReading.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-accent emoji-glow" />
                <h2 className="text-xl font-extrabold text-shine">Continue Reading</h2>
              </div>
            </div>


            <ComicRow comics={continueReading} />
          </section>
        )}

        {/* 🎭 Explore Genres */}
        <section>
          <div className="flex items-center gap-2 mb-1">
            <img src={dramaImg} alt="Genres" className="w-7 h-7 object-contain" />
            <h2 className="text-xl font-extrabold text-shine">Explore Genres</h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {genres.map(g => (
              <Link
                key={g.name}
                to={g.path}
                className="group relative overflow-hidden rounded-xl bg-gradient-card border border-border/30 p-5 flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:border-primary/50 hover:shadow-glow hover:scale-[1.03]"
              >
                <div className="w-16 h-16 rounded-lg bg-black flex items-center justify-center overflow-hidden">
                  <img src={g.img} alt={g.name} className="w-14 h-14 object-contain group-hover:scale-125 transition-transform duration-300" />
                </div>
                <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{g.name}</span>
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-300" />
              </Link>
            ))}
          </div>
        </section>

        {/* Genre Sections */}
        {genres.map(g => (
          <GenreSection key={g.name} genre={g.name} icon={<img src={g.img} alt={g.name} className="w-7 h-7 object-contain" />} viewAllPath={g.path} />
        ))}

        {/* Community Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-accent emoji-glow" />
              <h2 className="text-xl font-extrabold text-shine">Community</h2>
            </div>
            <Link to="/community" className="text-accent hover:text-primary text-sm flex items-center gap-1 font-medium transition-colors">
              View all
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="max-h-[600px] overflow-y-auto scrollbar-hide rounded-xl">
            <CommunityFeed maxPosts={5} />
          </div>
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
