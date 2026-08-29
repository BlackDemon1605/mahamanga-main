import { useNavigate } from 'react-router-dom';
import { Check, CheckCheck, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  title: string;
  message: string | null;
  notification_type: string;
  comic_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationPanelProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
}

const typeIcons: Record<string, string> = {
  new_comic: '🔥',
  new_chapter: '📚',
  engagement: '⭐',
  admin: '📢',
  community: '🚀',
};

export function NotificationPanel({ notifications, onMarkRead, onMarkAllRead, onClose }: NotificationPanelProps) {
  const navigate = useNavigate();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleClick = (n: Notification) => {
    if (!n.is_read) onMarkRead(n.id);
    if (n.notification_type === 'admin' || n.notification_type === 'community') {
      navigate('/community');
    } else if (n.comic_id) {
      navigate(`/comic/${n.comic_id}`);
    } else {
      navigate('/');
    }
    onClose();
  };

  return (
    <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-xl border border-border/50 bg-background shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/30">
        <h3 className="text-sm font-bold">Notifications</h3>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={onMarkAllRead}>
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Mark all read
            </Button>
          )}
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary/50">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* List */}
      <ScrollArea className="max-h-[400px]">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No notifications yet
          </div>
        ) : (
          <div className="divide-y divide-border/20">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left p-3 hover:bg-secondary/30 transition-colors flex gap-3 items-start ${
                  !n.is_read ? 'bg-primary/5' : ''
                }`}
              >
                <span className="text-lg mt-0.5 shrink-0">
                  {typeIcons[n.notification_type] || '🔔'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-tight ${!n.is_read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!n.is_read && (
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                )}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
