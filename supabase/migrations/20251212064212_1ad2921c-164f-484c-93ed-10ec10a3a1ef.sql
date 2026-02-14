-- Create ratings table
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comic_id UUID NOT NULL REFERENCES public.comics(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, comic_id)
);

-- Create comments table
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comic_id UUID NOT NULL REFERENCES public.comics(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Ratings RLS policies
CREATE POLICY "Ratings are viewable by everyone"
ON public.ratings FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own rating"
ON public.ratings FOR INSERT
WITH CHECK (user_id IN (SELECT id FROM profiles WHERE profiles.user_id = auth.uid()));

CREATE POLICY "Users can update their own rating"
ON public.ratings FOR UPDATE
USING (user_id IN (SELECT id FROM profiles WHERE profiles.user_id = auth.uid()));

CREATE POLICY "Users can delete their own rating"
ON public.ratings FOR DELETE
USING (user_id IN (SELECT id FROM profiles WHERE profiles.user_id = auth.uid()));

-- Comments RLS policies
CREATE POLICY "Comments are viewable by everyone"
ON public.comments FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own comments"
ON public.comments FOR INSERT
WITH CHECK (user_id IN (SELECT id FROM profiles WHERE profiles.user_id = auth.uid()));

CREATE POLICY "Users can update their own comments"
ON public.comments FOR UPDATE
USING (user_id IN (SELECT id FROM profiles WHERE profiles.user_id = auth.uid()));

CREATE POLICY "Users can delete their own comments"
ON public.comments FOR DELETE
USING (user_id IN (SELECT id FROM profiles WHERE profiles.user_id = auth.uid()));

-- Add updated_at trigger for ratings
CREATE TRIGGER update_ratings_updated_at
BEFORE UPDATE ON public.ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for comments
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();