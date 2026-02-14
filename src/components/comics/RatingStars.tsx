import React, { useState, forwardRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  comicId: string;
  userId?: string;
  currentRating?: number;
  averageRating?: number;
  totalRatings?: number;
  readonly?: boolean;
}

export const RatingStars = forwardRef<HTMLDivElement, RatingStarsProps>(
  ({ comicId, userId, currentRating = 0, averageRating = 0, totalRatings = 0, readonly = false }, ref) => {
  const [hoverRating, setHoverRating] = useState(0);
  const queryClient = useQueryClient();

  const rateMutation = useMutation({
    mutationFn: async (rating: number) => {
      if (!userId) throw new Error('Not logged in');

      const { error } = await supabase
        .from('ratings')
        .upsert({
          user_id: userId,
          comic_id: comicId,
          rating,
        }, { onConflict: 'user_id,comic_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comic', comicId] });
      queryClient.invalidateQueries({ queryKey: ['comic-rating', comicId] });
      toast.success('Rating submitted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit rating');
    },
  });

  const handleClick = (rating: number) => {
    if (readonly || !userId) return;
    rateMutation.mutate(rating);
  };

  const displayRating = hoverRating || currentRating;

  return (
    <div ref={ref} className="flex items-center gap-3">
      <div 
        className="flex items-center gap-0.5"
        onMouseLeave={() => !readonly && setHoverRating(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleClick(star)}
            onMouseEnter={() => !readonly && userId && setHoverRating(star)}
            disabled={readonly || !userId}
            className={cn(
              "transition-colors p-0.5",
              !readonly && userId && "cursor-pointer hover:scale-110",
              readonly && "cursor-default"
            )}
          >
            <Star
              className={cn(
                "w-5 h-5 transition-colors",
                star <= displayRating 
                  ? "fill-yellow-400 text-yellow-400" 
                  : "fill-transparent text-muted-foreground"
              )}
            />
          </button>
        ))}
      </div>
      <div className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{averageRating.toFixed(1)}</span>
        <span className="mx-1">·</span>
        <span>{totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'}</span>
      </div>
    </div>
  );
});

RatingStars.displayName = 'RatingStars';
