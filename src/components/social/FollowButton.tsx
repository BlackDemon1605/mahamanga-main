import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

interface FollowButtonProps {
  targetUserId: string;
  size?: 'sm' | 'default';
}

export function FollowButton({ targetUserId, size = 'default' }: FollowButtonProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: isFollowing } = useQuery({
    queryKey: ['following', profile?.id, targetUserId],
    queryFn: async () => {
      if (!profile?.id) return false;
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', profile.id)
        .eq('following_id', targetUserId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!profile?.id && profile.id !== targetUserId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Not logged in');
      
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', profile.id)
          .eq('following_id', targetUserId);
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: profile.id, following_id: targetUserId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['following', profile?.id, targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['followers', targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['followersCount', targetUserId] });
      toast.success(isFollowing ? 'Unfollowed' : 'Now Reading');
    },
    onError: () => {
      toast.error('Failed to update follow status');
    },
  });

  // Don't show button if viewing own profile or not logged in
  if (!profile?.id || profile.id === targetUserId) return null;

  return (
    <Button
      variant={isFollowing ? 'outline' : 'gradient'}
      size={size}
      onClick={() => followMutation.mutate()}
      disabled={followMutation.isPending}
    >
      {isFollowing ? (
        <>
          <UserCheck className="w-4 h-4 mr-2" />
           Reading
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4 mr-2" />
          Follow
        </>
      )}
    </Button>
  );
}
