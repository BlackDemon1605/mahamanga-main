import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { WavyAvatar } from '@/components/ui/wavy-avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Trash2, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { AdminBadge } from '@/components/social/AdminBadge';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  profiles?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function PostCard({ post }: { post: Post }) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showReplies, setShowReplies] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  // Likes
  const { data: likes = [] } = useQuery({
    queryKey: ['post-likes', post.id],
    queryFn: async () => {
      const { data } = await supabase.from('post_likes').select('user_id').eq('post_id', post.id);
      return data || [];
    },
  });

  const isLiked = profile ? likes.some(l => l.user_id === profile.id) : false;

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('Login required');
      if (isLiked) {
        await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', profile.id);
      } else {
        await supabase.from('post_likes').insert({ post_id: post.id, user_id: profile.id });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['post-likes', post.id] }),
  });

  // Replies
  const { data: replies = [] } = useQuery({
    queryKey: ['post-replies', post.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('post_replies')
        .select('*')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });
      if (!data || data.length === 0) return [];
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', userIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      return data.map(r => ({ ...r, profiles: profileMap.get(r.user_id) || null }));
    },
    enabled: showReplies,
  });

  const addReply = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('Login required');
      await supabase.from('post_replies').insert({
        post_id: post.id, user_id: profile.id, content: replyContent.trim(),
      });
    },
    onSuccess: () => {
      setReplyContent('');
      queryClient.invalidateQueries({ queryKey: ['post-replies', post.id] });
    },
    onError: () => toast.error('Failed to reply'),
  });

  const deletePost = useMutation({
    mutationFn: async () => {
      await supabase.from('posts').delete().eq('id', post.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast.success('Post deleted');
    },
  });

  const displayName = post.profiles?.display_name || post.profiles?.username || 'Anonymous';

  return (
    <div className="glass rounded-xl p-4 animate-fade-up">
      <div className="flex gap-3">
        <div onClick={() => navigate(`/profile/${post.user_id}`)} className="cursor-pointer">
          <WavyAvatar
            src={post.profiles?.avatar_url}
            fallback={displayName[0]?.toUpperCase() || 'U'}
            size="sm"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-shine cursor-pointer" onClick={() => navigate(`/profile/${post.user_id}`)}>
                {displayName}
              </span>
              <AdminBadge userId={post.user_id} />
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>
            {profile?.id === post.user_id && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="iconSm" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete post?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deletePost.mutate()}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <p className="text-sm mt-1 whitespace-pre-wrap break-words">{post.content}</p>
          {post.image_url && (
            <img src={post.image_url} alt="" className="mt-2 rounded-lg max-h-80 w-auto object-cover" loading="lazy" />
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 mt-3">
            <Button
              variant="ghost" size="sm"
              className={`h-7 px-2 gap-1 ${isLiked ? 'text-accent' : 'text-muted-foreground'}`}
              onClick={() => profile ? toggleLike.mutate() : navigate('/auth')}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-accent' : ''}`} />
              <span className="text-xs">{likes.length}</span>
            </Button>
            <Button
              variant="ghost" size="sm"
              className="h-7 px-2 gap-1 text-muted-foreground"
              onClick={() => setShowReplies(!showReplies)}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs">Reply</span>
              {showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </div>

          {/* Replies section */}
          {showReplies && (
            <div className="mt-3 space-y-3 border-l-2 border-border pl-3">
              {replies.map((reply: any) => (
                <div key={reply.id} className="flex gap-2">
                  <WavyAvatar
                    src={reply.profiles?.avatar_url}
                    fallback={(reply.profiles?.display_name || reply.profiles?.username || 'U')[0]?.toUpperCase()}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs">
                        {reply.profiles?.display_name || reply.profiles?.username || 'Anonymous'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 whitespace-pre-wrap break-words">{reply.content}</p>
                  </div>
                </div>
              ))}
              {profile && (
                <div className="flex gap-2 mt-2">
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a reply..."
                    className="bg-secondary min-h-[50px] resize-none text-xs"
                    maxLength={500}
                  />
                  <Button
                    size="sm" variant="gradient"
                    onClick={() => replyContent.trim() && addReply.mutate()}
                    disabled={!replyContent.trim()}
                  >
                    <Send className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
