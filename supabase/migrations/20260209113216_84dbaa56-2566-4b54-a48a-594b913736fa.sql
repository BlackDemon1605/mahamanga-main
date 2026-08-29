
-- Community Posts table
CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  content text NOT NULL,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT posts_content_length CHECK (char_length(content) <= 500)
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON public.posts FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Post Likes table
CREATE TABLE public.post_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post likes viewable by everyone" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users can like posts" ON public.post_likes FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can unlike posts" ON public.post_likes FOR DELETE USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Post Replies table
CREATE TABLE public.post_replies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT post_replies_content_length CHECK (char_length(content) <= 500)
);

ALTER TABLE public.post_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post replies viewable by everyone" ON public.post_replies FOR SELECT USING (true);
CREATE POLICY "Users can reply to posts" ON public.post_replies FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete their own replies" ON public.post_replies FOR DELETE USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Promotion Banners table
CREATE TABLE public.promotion_banners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  image_url text NOT NULL,
  destination_url text,
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.promotion_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active banners viewable by everyone" ON public.promotion_banners FOR SELECT USING (true);
CREATE POLICY "Admins can manage banners" ON public.promotion_banners FOR INSERT WITH CHECK (created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can update banners" ON public.promotion_banners FOR UPDATE USING (created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can delete banners" ON public.promotion_banners FOR DELETE USING (created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Thoughts (profile status) table
CREATE TABLE public.thoughts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  CONSTRAINT thoughts_content_length CHECK (char_length(content) <= 100)
);

ALTER TABLE public.thoughts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Thoughts viewable by everyone" ON public.thoughts FOR SELECT USING (true);
CREATE POLICY "Users can create their thought" ON public.thoughts FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update their thought" ON public.thoughts FOR UPDATE USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete their thought" ON public.thoughts FOR DELETE USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- User Roles table (security best practice: separate table)
CREATE TYPE public.app_role AS ENUM ('admin', 'creator', 'user');

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Trigger for updated_at on posts
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for posts for live feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_replies;
