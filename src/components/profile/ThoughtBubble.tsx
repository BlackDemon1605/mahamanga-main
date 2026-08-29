import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, X, Edit3 } from 'lucide-react';
import { toast } from 'sonner';

interface ThoughtBubbleProps {
  userId: string;
  isOwnProfile: boolean;
}

export function ThoughtBubble({ userId, isOwnProfile }: ThoughtBubbleProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [showInput, setShowInput] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [content, setContent] = useState('');

  const { data: thought } = useQuery({
    queryKey: ['thought', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('thoughts')
        .select('*')
        .eq('user_id', userId)
        .gte('expires_at', new Date().toISOString())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!profile) return;
      await supabase.from('thoughts').delete().eq('user_id', userId);
      if (content.trim()) {
        const { error } = await supabase.from('thoughts').insert({
          user_id: userId,
          content: content.trim(),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thought', userId] });
      setShowInput(false);
      toast.success(content.trim() ? 'Thought posted! ✨' : 'Thought removed');
    },
    onError: () => toast.error('Failed to save thought'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('thoughts').delete().eq('user_id', userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thought', userId] });
      toast.success('Thought removed');
    },
  });

  return (
    <>
      {/* Thought bubble - positioned above avatar via parent */}
      {thought && (
        <div
          className="cursor-pointer animate-fade-in w-full flex justify-center"
          onClick={() => setShowFull(true)}
        >
          <div className="relative bg-primary/10 backdrop-blur-md border border-primary/20 rounded-2xl px-3 py-1.5 max-w-[200px] sm:max-w-[240px]">
            <p className="text-[10px] sm:text-xs text-foreground text-center break-words line-clamp-2">
              💭 {thought.content}
            </p>
            {/* Bubble tail */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary/10 border-b border-r border-primary/20 rotate-45" />
          </div>
        </div>
      )}

      {/* Add thought button - shows below avatar when no thought */}
      {isOwnProfile && !thought && (
        <button
          onClick={() => { setContent(''); setShowInput(true); }}
          className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
        >
          <Sparkles className="w-3 h-3" />
          Add thought
        </button>
      )}

      {/* Edit button - small icon */}
      {isOwnProfile && thought && (
        <button
          onClick={(e) => { e.stopPropagation(); setContent(thought.content || ''); setShowInput(true); }}
          className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
        >
          <Edit3 className="w-3 h-3" />
          Edit
        </button>
      )}

      {/* Input dialog */}
      <Dialog open={showInput} onOpenChange={setShowInput}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {thought ? 'Edit Your Thought' : 'Share a Thought'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind? (disappears in 24h)"
              maxLength={100}
              className="bg-secondary"
            />
            <p className="text-xs text-muted-foreground">{content.length}/100 • Disappears after 24 hours</p>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-primary text-primary-foreground" onClick={() => saveMutation.mutate()}>
                {content.trim() ? 'Post' : 'Clear'}
              </Button>
              {thought && (
                <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate()}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full thought dialog */}
      <Dialog open={showFull} onOpenChange={setShowFull}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary emoji-glow" />
              Thought
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm">{thought?.content}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
