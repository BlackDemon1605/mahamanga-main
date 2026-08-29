import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PostCard } from './PostCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { WavyAvatar } from '@/components/ui/wavy-avatar';
import { Send, MessageSquarePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CommunityFeedProps {
  maxPosts?: number; // limit posts shown (for homepage)
}

export function CommunityFeed({ maxPosts }: CommunityFeedProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState('');

  const { data: allPosts = [], isLoading, refetch } = useQuery({
    queryKey: ['community-posts-all'],
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      if (!data || data.length === 0) return [];
      const userIds = [...new Set(data.map(p => p.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', userIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      return data.map(p => ({ ...p, profiles: profileMap.get(p.user_id) || null }));
    },
  });

  // Live updates for new/deleted posts
  useEffect(() => {
    const channel = supabase
      .channel('community-posts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        queryClient.invalidateQueries({ queryKey: ['community-posts-all'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const createPost = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('Login required');
      const { error } = await supabase.from('posts').insert({
        user_id: profile.id,
        content: newPost.trim(),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setNewPost('');
      await refetch();
      toast.success('Post created! 🎉');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to create post'),
  });

  const displayPosts = maxPosts ? allPosts.slice(0, maxPosts) : allPosts;


  return (
    <div className="space-y-4">
      {/* Create post */}
      {profile ? (
        <div className="glass rounded-xl p-4">
          <div className="flex gap-3">
            <WavyAvatar
              src={profile.avatar_url}
              fallback={(profile.display_name || profile.username || 'U')[0]?.toUpperCase()}
              size="sm"
            />
            <div className="flex-1 space-y-2">
              <Textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="What's on your mind? 💭"
                className="bg-secondary min-h-[80px] resize-none"
                maxLength={500}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{newPost.length}/500</span>
                <Button
                  size="sm" variant="gradient"
                  onClick={() => newPost.trim() && createPost.mutate()}
                  disabled={!newPost.trim() || createPost.isPending}
                >
                  <Send className="w-4 h-4 mr-1" />
                  Post
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass rounded-xl p-4 text-center text-sm text-muted-foreground">
          <a href="/auth" className="text-primary hover:underline">Sign in</a> to join the conversation
        </div>
      )}

      {/* Posts feed */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : displayPosts.length === 0 ? (
        <div className="text-center py-12 glass rounded-xl">
          <MessageSquarePlus className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayPosts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
