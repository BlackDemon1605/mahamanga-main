import React, { forwardRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';

interface LikeButtonProps {
  comicId: string;
}

export const LikeButton = forwardRef<HTMLDivElement, LikeButtonProps>(({ comicId }, ref) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: likesData } = useQuery({
    queryKey: ['comic-likes', comicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comic_likes')
        .select('is_like')
        .eq('comic_id', comicId);
      
      if (error) throw error;
      
      const likes = data?.filter(l => l.is_like).length || 0;
      const dislikes = data?.filter(l => !l.is_like).length || 0;
      
      return { likes, dislikes };
    },
  });

  const { data: userLike } = useQuery({
    queryKey: ['user-like', comicId, profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data } = await supabase
        .from('comic_likes')
        .select('is_like')
        .eq('comic_id', comicId)
        .eq('user_id', profile.id)
        .maybeSingle();
      return data;
    },
    enabled: !!profile?.id,
  });

  const likeMutation = useMutation({
    mutationFn: async (isLike: boolean) => {
      if (!profile?.id) throw new Error('Not logged in');
      
      // If clicking same button, remove the like/dislike
      if (userLike?.is_like === isLike) {
        await supabase
          .from('comic_likes')
          .delete()
          .eq('comic_id', comicId)
          .eq('user_id', profile.id);
      } else if (userLike) {
        // Update existing like/dislike
        await supabase
          .from('comic_likes')
          .update({ is_like: isLike })
          .eq('comic_id', comicId)
          .eq('user_id', profile.id);
      } else {
        // Insert new like/dislike
        await supabase
          .from('comic_likes')
          .insert({ comic_id: comicId, user_id: profile.id, is_like: isLike });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comic-likes', comicId] });
      queryClient.invalidateQueries({ queryKey: ['user-like', comicId, profile?.id] });
    },
    onError: () => {
      toast.error('Please sign in to like');
    },
  });

  return (
    <div ref={ref} className="flex items-center gap-2">
      <Button
        variant={userLike?.is_like === true ? 'default' : 'outline'}
        size="sm"
        className={userLike?.is_like === true ? 'bg-primary' : ''}
        onClick={() => likeMutation.mutate(true)}
        disabled={likeMutation.isPending || !profile}
      >
        <ThumbsUp className="w-4 h-4 mr-1" />
        {likesData?.likes || 0}
      </Button>
      <Button
        variant={userLike?.is_like === false ? 'destructive' : 'outline'}
        size="sm"
        onClick={() => likeMutation.mutate(false)}
        disabled={likeMutation.isPending || !profile}
      >
        <ThumbsDown className="w-4 h-4 mr-1" />
        {likesData?.dislikes || 0}
      </Button>
    </div>
  );
});

LikeButton.displayName = 'LikeButton';
