import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FollowListModal } from './FollowListModal';

interface FollowStatsProps {
  userId: string;
}

export function FollowStats({ userId }: FollowStatsProps) {
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  const { data: followersCount = 0 } = useQuery({
    queryKey: ['followersCount', userId],
    queryFn: async () => {
      const { count, error } = await supabase.
      from('follows').
      select('id', { count: 'exact', head: true }).
      eq('following_id', userId);

      if (error) throw error;
      return count || 0;
    }
  });

  const { data: followingCount = 0 } = useQuery({
    queryKey: ['followingCount', userId],
    queryFn: async () => {
      const { count, error } = await supabase.
      from('follows').
      select('id', { count: 'exact', head: true }).
      eq('follower_id', userId);

      if (error) throw error;
      return count || 0;
    }
  });

  return (
    <>
      <div className="flex items-center gap-4 text-sm">
        <button
          onClick={() => setShowFollowers(true)}
          className="flex items-center gap-1 hover:opacity-70 transition-opacity">

          <span className="font-bold">{followersCount}</span>
          <span className="text-muted-foreground">Readers</span>
        </button>
        <button onClick={() => setShowFollowing(true)}
        className="flex items-center gap-1 hover:opacity-70 transition-opacity">
          <span className="font-bold">{followingCount}</span>
          <span className="text-muted-foreground">Reading</span>
        </button>
      </div>

      <FollowListModal
        userId={userId}
        type="followers"
        open={showFollowers}
        onOpenChange={setShowFollowers} />

      <FollowListModal
        userId={userId}
        type="following"
        open={showFollowing}
        onOpenChange={setShowFollowing} />

    </>);

}