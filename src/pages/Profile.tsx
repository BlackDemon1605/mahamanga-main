import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ComicGrid } from '@/components/comics/ComicGrid';
import { SettingsMenu } from '@/components/profile/SettingsMenu';
import { WavyAvatar } from '@/components/ui/wavy-avatar';
import { ThoughtBubble } from '@/components/profile/ThoughtBubble';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FollowStats } from '@/components/social/FollowStats';
import { FollowButton } from '@/components/social/FollowButton';
import { BookMarked, PenTool } from 'lucide-react';
import { AdminBadge } from '@/components/social/AdminBadge';

export default function Profile() {
  const { user, profile: currentUserProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  
  const isOwnProfile = !userId || userId === currentUserProfile?.id;

  const { data: viewedProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !isOwnProfile,
  });

  const profile = isOwnProfile ? currentUserProfile : viewedProfile;

  if (!authLoading && !user && !userId) {
    navigate('/auth');
    return null;
  }

  const { data: thought } = useQuery({
    queryKey: ['thought', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('thoughts')
        .select('id')
        .eq('user_id', profile!.id)
        .gte('expires_at', new Date().toISOString())
        .maybeSingle();
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: comics, isLoading: loadingComics } = useQuery({
    queryKey: ['user-comics', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      let query = supabase
        .from('comics')
        .select('*, chapters(id)')
        .eq('creator_id', profile.id)
        .order('created_at', { ascending: false });
      if (!isOwnProfile) {
        query = query.eq('is_published', true);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: bookmarks, isLoading: loadingBookmarks } = useQuery({
    queryKey: ['bookmarks', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('bookmarks')
        .select('comic_id, comics(*, chapters(id))')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(b => b.comics).filter(Boolean);
    },
    enabled: !!profile?.id && isOwnProfile,
  });

  if (authLoading || loadingProfile) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!profile && userId) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-muted-foreground">User not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="px-4 py-6 max-w-7xl mx-auto">
        {/* Profile header */}
        <div className="relative flex items-start gap-4 mb-6">
          {/* Avatar column with thought above */}
          <div className="flex flex-col items-center shrink-0">
            {profile?.id && (
              <ThoughtBubble userId={profile.id} isOwnProfile={isOwnProfile} />
            )}
            <WavyAvatar
              src={profile?.avatar_url}
              fallback={profile?.display_name?.[0] || profile?.username?.[0] || 'U'}
              size="lg"
              hasThought={!!thought}
            />
          </div>

          {/* Info */}
          <div className="flex-1 pt-2 pr-8 min-w-0">
            <h1 className="text-xl font-bold text-shine truncate flex items-center gap-2">
              {profile?.display_name || profile?.username || 'User'}
              {profile?.id && <AdminBadge userId={profile.id} />}
            </h1>
            <p className="text-sm text-muted-foreground">@{profile?.username || 'anonymous'}</p>
            {profile?.bio && <p className="text-sm mt-1 line-clamp-2">{profile.bio}</p>}
            {profile?.id && (
              <div className="mt-2 flex items-center gap-4">
                <FollowStats userId={profile.id} />
                {!isOwnProfile && <FollowButton targetUserId={profile.id} />}
              </div>
            )}
          </div>
          
          {isOwnProfile && <SettingsMenu />}
        </div>

        {/* Tabs */}
        {isOwnProfile ? (
          <Tabs defaultValue="bookmarks" className="w-full">
            <TabsList className="w-full grid grid-cols-2 bg-secondary rounded-xl p-1 mb-6">
              <TabsTrigger value="bookmarks" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <BookMarked className="w-4 h-4 mr-2" />
                Bookmarks
              </TabsTrigger>
              <TabsTrigger value="my-comics" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <PenTool className="w-4 h-4 mr-2" />
                My Comics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bookmarks" className="mt-0">
              <ComicGrid comics={(bookmarks as any) || []} loading={loadingBookmarks} />
            </TabsContent>

            <TabsContent value="my-comics" className="mt-0">
              <ComicGrid comics={comics || []} loading={loadingComics} showPublishStatus={true} />
            </TabsContent>
          </Tabs>
        ) : (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PenTool className="w-5 h-5" />
              Comics
            </h2>
            <ComicGrid comics={comics || []} loading={loadingComics} />
          </div>
        )}
      </div>
    </MainLayout>
  );
}
