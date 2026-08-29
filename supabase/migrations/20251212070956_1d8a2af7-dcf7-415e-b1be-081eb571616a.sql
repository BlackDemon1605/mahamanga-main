-- Create follows table for user-to-user following
CREATE TABLE public.follows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Create comic_likes table for like/dislike on comics
CREATE TABLE public.comic_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comic_id uuid NOT NULL,
  user_id uuid NOT NULL,
  is_like boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(comic_id, user_id)
);

-- Create comment_likes table for likes on comments
CREATE TABLE public.comment_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Add parent_id to comments for replies
ALTER TABLE public.comments ADD COLUMN parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comic_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Follows policies
CREATE POLICY "Anyone can view follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON public.follows FOR INSERT 
  WITH CHECK (follower_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE 
  USING (follower_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Comic likes policies
CREATE POLICY "Anyone can view comic likes" ON public.comic_likes FOR SELECT USING (true);
CREATE POLICY "Users can like comics" ON public.comic_likes FOR INSERT 
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update their likes" ON public.comic_likes FOR UPDATE 
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can remove likes" ON public.comic_likes FOR DELETE 
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Comment likes policies
CREATE POLICY "Anyone can view comment likes" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can like comments" ON public.comment_likes FOR INSERT 
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can remove comment likes" ON public.comment_likes FOR DELETE 
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));