import React, { useState, forwardRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { WavyAvatar } from '@/components/ui/wavy-avatar';
import { CommentLikeButton } from '@/components/social/CommentLikeButton';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Send, Trash2, MessageSquare, User, Reply, ChevronDown, ChevronUp } from 'lucide-react';
import { AdminBadge } from '@/components/social/AdminBadge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CommentsSectionProps {
  comicId: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  profiles: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const CommentsSection = forwardRef<HTMLDivElement, CommentsSectionProps>(({ comicId }, ref) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', comicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          parent_id,
          profiles:user_id(username, display_name, avatar_url)
        `)
        .eq('comic_id', comicId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Comment[];
    },
  });

  const topLevelComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  const addCommentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      if (!profile?.id) throw new Error('Not logged in');
      setSubmitting(true);

      const { error } = await supabase
        .from('comments')
        .insert({
          user_id: profile.id,
          comic_id: comicId,
          content: content.trim(),
          parent_id: parentId || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', comicId] });
      setNewComment('');
      setReplyContent('');
      setReplyingTo(null);
      toast.success('Comment posted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to post comment');
    },
    onSettled: () => {
      setSubmitting(false);
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', comicId] });
      toast.success('Comment deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete comment');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addCommentMutation.mutate({ content: newComment });
  };

  const handleReplySubmit = (parentId: string) => {
    if (!replyContent.trim()) return;
    addCommentMutation.mutate({ content: replyContent, parentId });
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const getDisplayName = (comment: Comment) => {
    return comment.profiles?.display_name || comment.profiles?.username || 'Anonymous';
  };

  const getInitials = (comment: Comment) => {
    const name = getDisplayName(comment);
    return name.charAt(0).toUpperCase();
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const replies = getReplies(comment.id);
    const isExpanded = expandedReplies.has(comment.id);

    return (
      <div key={comment.id} className={`p-4 ${isReply ? 'pl-12 bg-secondary/30' : ''}`}>
        <div className="flex gap-3">
          <WavyAvatar
            src={comment.profiles?.avatar_url}
            fallback={getInitials(comment)}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{getDisplayName(comment)}</span>
                <AdminBadge userId={comment.user_id} />
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <CommentLikeButton commentId={comment.id} />
                {profile?.id === comment.user_id && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="iconSm" className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete comment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete your comment. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => deleteCommentMutation.mutate(comment.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
              {comment.content}
            </p>
            
            {/* Reply button and replies toggle */}
            {!isReply && profile && (
              <div className="flex items-center gap-3 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground h-7 px-2"
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                >
                  <Reply className="w-3 h-3 mr-1" />
                  Reply
                </Button>
                {replies.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground h-7 px-2"
                    onClick={() => toggleReplies(comment.id)}
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                    {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                  </Button>
                )}
              </div>
            )}

            {/* Reply input */}
            {replyingTo === comment.id && (
              <div className="mt-3 flex gap-2">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="bg-secondary min-h-[60px] resize-none text-sm"
                  maxLength={500}
                />
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant="gradient"
                    onClick={() => handleReplySubmit(comment.id)}
                    disabled={!replyContent.trim() || submitting}
                  >
                    <Send className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent('');
                    }}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Replies */}
        {isExpanded && replies.length > 0 && (
          <div className="mt-2 border-l-2 border-border">
            {replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={ref} className="glass rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <MessageSquare className="w-5 h-5" />
        <h2 className="font-semibold">Comments</h2>
        <span className="text-sm text-muted-foreground">({comments.length})</span>
      </div>

      {/* Add comment form */}
      {profile ? (
        <form onSubmit={handleSubmit} className="p-4 border-b border-border">
          <div className="flex gap-3">
            <WavyAvatar
              src={profile.avatar_url || undefined}
              fallback={profile.display_name?.charAt(0) || profile.username?.charAt(0) || 'U'}
              size="sm"
            />
            <div className="flex-1 space-y-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="bg-secondary min-h-[80px] resize-none"
                maxLength={1000}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {newComment.length}/1000
                </span>
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={!newComment.trim() || submitting}
                  variant="gradient"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? 'Posting...' : 'Post'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="p-4 border-b border-border text-center text-sm text-muted-foreground">
          <a href="/auth" className="text-primary hover:underline">Sign in</a> to leave a comment
        </div>
      )}

      {/* Comments list */}
      <div className="divide-y divide-border">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : topLevelComments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          topLevelComments.map(comment => renderComment(comment))
        )}
      </div>
    </div>
  );
});

CommentsSection.displayName = 'CommentsSection';
