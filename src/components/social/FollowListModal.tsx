import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WavyAvatar } from '@/components/ui/wavy-avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FollowButton } from './FollowButton';
import { Skeleton } from '@/components/ui/skeleton';

interface FollowListModalProps {
  userId: string;
  type: 'followers' | 'following';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FollowListModal({ userId, type, open, onOpenChange }: FollowListModalProps) {
  const navigate = useNavigate();

  const { data: users, isLoading } = useQuery({
    queryKey: [type, userId],
    queryFn: async () => {
      if (type === 'followers') {
        // Get users who follow this user
        const { data, error } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', userId);
        
        if (error) throw error;
        
        if (!data || data.length === 0) return [];
        
        // Get profiles of followers
        const followerIds = data.map(f => f.follower_id);
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', followerIds);
        
        if (profileError) throw profileError;
        return profiles || [];
      } else {
        // Get users this user follows
        const { data, error } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId);
        
        if (error) throw error;
        
        if (!data || data.length === 0) return [];
        
        // Get profiles of following
        const followingIds = data.map(f => f.following_id);
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', followingIds);
        
        if (profileError) throw profileError;
        return profiles || [];
      }
    },
    enabled: open,
  });

  const handleUserClick = (profileId: string) => {
    onOpenChange(false);
    navigate(`/profile/${profileId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{type === 'followers' ? 'Readers' : 'Reading'}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[400px] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : users && users.length > 0 ? (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => handleUserClick(user.id)}
                  >
                    <WavyAvatar
                      src={user.avatar_url}
                      fallback={(user.display_name || user.username || 'U')[0].toUpperCase()}
                      size="sm"
                    />
                    <div>
                      <p className="font-medium text-sm">
                        {user.display_name || user.username || 'Anonymous'}
                      </p>
                      {user.username && (
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      )}
                    </div>
                  </div>
                  <FollowButton targetUserId={user.id} size="sm" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {type === 'followers' ? 'No readers yet' : 'Not reading anyone'}
            </p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
