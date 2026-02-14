import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';

interface CommentLikeButtonProps {
  commentId: string;
}

export function CommentLikeButton({ commentId }: CommentLikeButtonProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: likesCount = 0 } = useQuery({
    queryKey: ['comment-likes', commentId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('comment_likes')
        .select('id', { count: 'exact', head: true })
        .eq('comment_id', commentId);
      
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: isLiked } = useQuery({
    queryKey: ['user-comment-like', commentId, profile?.id],
    queryFn: async () => {
      if (!profile?.id) return false;
      const { data } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', profile.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!profile?.id,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Not logged in');
      
      if (isLiked) {
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', profile.id);
      } else {
        await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: profile.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comment-likes', commentId] });
      queryClient.invalidateQueries({ queryKey: ['user-comment-like', commentId, profile?.id] });
    },
    onError: () => {
      toast.error('Please sign in to like comments');
    },
  });

  return (
    <Button
      variant="ghost"
      size="iconSm"
      className={isLiked ? 'text-accent' : 'text-muted-foreground'}
      onClick={() => likeMutation.mutate()}
      disabled={likeMutation.isPending}
    >
      <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
      {likesCount > 0 && <span className="ml-1 text-xs">{likesCount}</span>}
    </Button>
  );
}
