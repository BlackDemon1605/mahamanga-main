import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { RatingStars } from '@/components/comics/RatingStars';
import { CommentsSection } from '@/components/comics/CommentsSection';
import { LikeButton } from '@/components/social/LikeButton';
import { FollowButton } from '@/components/social/FollowButton';
import { FollowStats } from '@/components/social/FollowStats';
import {
  BookOpen, Eye, Clock,
  Share2, ChevronRight, Play, BookMarked, Pencil, BookmarkMinus } from
'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function ComicDetail() {
  const { id } = useParams<{id: string;}>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const viewCountedRef = useRef(false);

  const { data: comic, isLoading } = useQuery({
    queryKey: ['comic', id],
    queryFn: async () => {
      const { data, error } = await supabase.
      from('comics').
      select(`
          *,
          profiles:creator_id(username, display_name, avatar_url),
          chapters(id, chapter_number, title, created_at, is_published)
        `).
      eq('id', id).
      single();

      if (error) throw error;
      return data;
    }
  });

  // Fetch ratings data
  const { data: ratingsData } = useQuery({
    queryKey: ['comic-rating', id],
    queryFn: async () => {
      const { data: ratings, error } = await supabase.
      from('ratings').
      select('rating').
      eq('comic_id', id);

      if (error) throw error;

      const total = ratings?.length || 0;
      const sum = ratings?.reduce((acc, r) => acc + r.rating, 0) || 0;
      const average = total > 0 ? sum / total : 0;

      return { average, total };
    }
  });

  // Fetch user's rating
  const { data: userRating } = useQuery({
    queryKey: ['user-rating', id, profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data } = await supabase.
      from('ratings').
      select('rating').
      eq('user_id', profile.id).
      eq('comic_id', id).
      maybeSingle();
      return data?.rating || 0;
    },
    enabled: !!profile?.id
  });

  // Increment view count for non-creators
  useEffect(() => {
    const incrementViewCount = async () => {
      if (!id || viewCountedRef.current) return;

      // Don't count if user is the creator
      if (comic && profile?.id === comic.creator_id) return;

      viewCountedRef.current = true;

      try {
        // Increment view count using RPC (bypasses RLS with SECURITY DEFINER)
        await supabase.rpc('increment_view_count', { comic_id: id });
        // Invalidate queries to reflect new count
        queryClient.invalidateQueries({ queryKey: ['comic', id] });
      } catch (err) {
        console.error('Failed to increment view count:', err);
      }
    };

    if (comic) {
      incrementViewCount();
    }
  }, [id, comic, profile?.id, queryClient]);

  const { data: isBookmarked } = useQuery({
    queryKey: ['bookmark', id, profile?.id],
    queryFn: async () => {
      if (!profile?.id) return false;
      const { data } = await supabase.
      from('bookmarks').
      select('id').
      eq('user_id', profile.id).
      eq('comic_id', id).
      maybeSingle();
      return !!data;
    },
    enabled: !!profile?.id
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Not logged in');

      if (isBookmarked) {
        await supabase.
        from('bookmarks').
        delete().
        eq('user_id', profile.id).
        eq('comic_id', id);
      } else {
        await supabase.
        from('bookmarks').
        insert({ user_id: profile.id, comic_id: id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmark', id] });
      toast.success(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
    },
    onError: () => {
      toast.error('Failed to update bookmark');
    }
  });

  const handleShare = async () => {
    try {
      await navigator.share({
        title: comic?.title,
        url: window.location.href
      });
    } catch {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const startReading = (chapterId?: string) => {
    const chapters = comic?.chapters?.filter((c) => c.is_published).sort((a, b) => a.chapter_number - b.chapter_number);
    const targetChapter = chapterId || chapters?.[0]?.id;
    if (targetChapter) {
      navigate(`/read/${targetChapter}`);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>);

  }

  if (!comic) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-xl font-semibold mb-2">Comic not found</h2>
          <Link to="/" className="text-primary hover:underline">Go back home</Link>
        </div>
      </MainLayout>);

  }

  const publishedChapters = comic.chapters?.filter((c) => c.is_published).sort((a, b) => a.chapter_number - b.chapter_number) || [];
  const isCreator = profile?.id === comic.creator_id;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="relative h-64 md:h-80">
          {/* Edit Button for Creator */}
          {isCreator &&
          <Button
            variant="glass"
            size="sm"
            className="absolute top-4 right-4 z-20"
            onClick={() => navigate(`/comic/${id}/edit`)}>

              <Pencil className="w-4 h-4 mr-2" />
              Edit Comic
            </Button>
          }
          {comic.cover_image_url &&
          <img
            src={comic.cover_image_url}
            alt={comic.title}
            className="w-full h-full object-cover" />

          }
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>

        <div className="px-4 -mt-24 relative z-10">
          <div className="flex gap-4 mb-4">
            {/* Cover */}
            <div className="w-28 md:w-36 shrink-0">
              <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-card bg-gradient-card">
                {comic.cover_image_url ?
                <img
                  src={comic.cover_image_url}
                  alt={comic.title}
                  className="w-full h-full object-cover" /> :


                <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground" />
                  </div>
                }
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 pt-16 md:pt-20">
              <span className={`inline-block px-2 py-0.5 text-xs font-semibold uppercase rounded-md mb-2 ${
              comic.status === 'ongoing' ? 'bg-primary/90' :
              comic.status === 'completed' ? 'bg-accent/90' : 'bg-muted'}`
              }>
                {comic.status}
              </span>
              <h1 className="text-xl md:text-2xl font-bold mb-2">{comic.title}</h1>
              <p className="text-sm text-muted-foreground mb-2">
                by {comic.profiles?.display_name || comic.profiles?.username || 'Unknown'}
              </p>
              
              {/* Follow button for creator */}
              <div className="mb-3">
                <FollowButton targetUserId={comic.creator_id} size="sm" />
                <div className="mt-2">
                  <FollowStats userId={comic.creator_id} />
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {(comic.view_count || 0).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {publishedChapters.length} chapters
                </span>
              </div>
            </div>
          </div>

          {/* Like/Dislike buttons */}
          <div className="mb-4">
            <LikeButton comicId={id!} />
          </div>

          {/* Rating */}
          <div className="mb-4">
            <RatingStars
              comicId={id!}
              userId={profile?.id}
              currentRating={userRating || 0}
              averageRating={ratingsData?.average || 0}
              totalRatings={ratingsData?.total || 0} />

          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mb-6">
            <Button
              variant="gradient"
              size="lg"
              className="flex-1"
              onClick={() => startReading()}
              disabled={publishedChapters.length === 0}>

              <Play className="w-5 h-5 mr-2" />
              {publishedChapters.length > 0 ? 'Start Reading' : 'No chapters yet'}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12"
              onClick={() => bookmarkMutation.mutate()}
              disabled={!profile}>

              {isBookmarked ?
              <BookmarkMinus className="w-5 h-5 text-accent" /> :

              <BookMarked className="w-5 h-5" />
              }
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12"
              onClick={handleShare}>

              <Share2 className="w-5 h-5" />
            </Button>
          </div>

          {/* Genres */}
          {comic.genre && comic.genre.length > 0 &&
          <div className="flex flex-wrap gap-2 mb-6">
              {comic.genre.map((g) =>
            <span key={g} className="px-3 py-1 bg-secondary rounded-full text-sm">
                  {g}
                </span>
            )}
            </div>
          }

          {/* Description */}
          {comic.description &&
          <div className="glass rounded-xl p-4 mb-6">
              <h2 className="font-semibold mb-2">Synopsis</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {comic.description}
              </p>
            </div>
          }

          {/* Chapters */}
          <div className="glass rounded-xl overflow-hidden mb-6">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold">Chapters</h2>
              <span className="text-sm text-muted-foreground">
                {publishedChapters.length} chapters
              </span>
            </div>
            
            {publishedChapters.length === 0 ?
            <div className="p-8 text-center text-muted-foreground">
                <BookMarked className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No chapters available yet</p>
              </div> :

            <div className="divide-y divide-border">
                {publishedChapters.map((chapter) =>
              <button
                key={chapter.id}
                onClick={() => startReading(chapter.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors text-left">

                    <div>
                      <p className="font-medium">
                        Chapter {chapter.chapter_number}
                        {chapter.title && `: ${chapter.title}`}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(chapter.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>
              )}
              </div>
            }
          </div>

          {/* Comments Section */}
          <div className="mb-6">
            <CommentsSection comicId={id!} />
          </div>
        </div>
      </div>
    </MainLayout>);

}