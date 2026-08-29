import { useNavigate } from 'react-router-dom';
import { WavyAvatar } from '@/components/ui/wavy-avatar';
import { FollowButton } from '@/components/social/FollowButton';

interface ProfileCardProps {
  profile: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  };
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const navigate = useNavigate();

  return (
    <div
      className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
      onClick={() => navigate(`/profile/${profile.id}`)}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <WavyAvatar
          src={profile.avatar_url}
          fallback={(profile.display_name || profile.username || 'U')[0].toUpperCase()}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">
            {profile.display_name || profile.username || 'Anonymous'}
          </p>
          {profile.username && (
            <p className="text-sm text-muted-foreground truncate">@{profile.username}</p>
          )}
          {profile.bio && (
            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{profile.bio}</p>
          )}
        </div>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <FollowButton targetUserId={profile.id} size="sm" />
      </div>
    </div>
  );
}
