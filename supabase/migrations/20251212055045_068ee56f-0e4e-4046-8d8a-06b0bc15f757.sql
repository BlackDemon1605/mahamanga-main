-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_creator BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comics table
CREATE TABLE public.comics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  genre TEXT[],
  tags TEXT[],
  language TEXT DEFAULT 'en',
  status TEXT DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'hiatus')),
  is_published BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chapters table
CREATE TABLE public.chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comic_id UUID NOT NULL REFERENCES public.comics(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title TEXT,
  is_published BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comic_id, chapter_number)
);

-- Create pages table
CREATE TABLE public.pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chapter_id, page_number)
);

-- Create bookmarks/favorites table
CREATE TABLE public.bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comic_id UUID NOT NULL REFERENCES public.comics(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, comic_id)
);

-- Create reading history table
CREATE TABLE public.reading_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comic_id UUID NOT NULL REFERENCES public.comics(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  page_number INTEGER DEFAULT 1,
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, comic_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_history ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Comics policies
CREATE POLICY "Published comics are viewable by everyone" ON public.comics FOR SELECT USING (is_published = true OR creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Creators can insert comics" ON public.comics FOR INSERT WITH CHECK (creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Creators can update their own comics" ON public.comics FOR UPDATE USING (creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Creators can delete their own comics" ON public.comics FOR DELETE USING (creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Chapters policies
CREATE POLICY "Chapters are viewable for published comics" ON public.chapters FOR SELECT USING (comic_id IN (SELECT id FROM public.comics WHERE is_published = true OR creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "Creators can insert chapters" ON public.chapters FOR INSERT WITH CHECK (comic_id IN (SELECT id FROM public.comics WHERE creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "Creators can update their chapters" ON public.chapters FOR UPDATE USING (comic_id IN (SELECT id FROM public.comics WHERE creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "Creators can delete their chapters" ON public.chapters FOR DELETE USING (comic_id IN (SELECT id FROM public.comics WHERE creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

-- Pages policies
CREATE POLICY "Pages are viewable for published chapters" ON public.pages FOR SELECT USING (chapter_id IN (SELECT c.id FROM public.chapters c JOIN public.comics co ON c.comic_id = co.id WHERE co.is_published = true OR co.creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "Creators can insert pages" ON public.pages FOR INSERT WITH CHECK (chapter_id IN (SELECT c.id FROM public.chapters c JOIN public.comics co ON c.comic_id = co.id WHERE co.creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "Creators can update their pages" ON public.pages FOR UPDATE USING (chapter_id IN (SELECT c.id FROM public.chapters c JOIN public.comics co ON c.comic_id = co.id WHERE co.creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "Creators can delete their pages" ON public.pages FOR DELETE USING (chapter_id IN (SELECT c.id FROM public.chapters c JOIN public.comics co ON c.comic_id = co.id WHERE co.creator_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

-- Bookmarks policies
CREATE POLICY "Users can view their own bookmarks" ON public.bookmarks FOR SELECT USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert their own bookmarks" ON public.bookmarks FOR INSERT WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete their own bookmarks" ON public.bookmarks FOR DELETE USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Reading history policies
CREATE POLICY "Users can view their own reading history" ON public.reading_history FOR SELECT USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert their own reading history" ON public.reading_history FOR INSERT WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update their own reading history" ON public.reading_history FOR UPDATE USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'username', NEW.raw_user_meta_data ->> 'display_name');
  RETURN NEW;
END;
$$;

-- Trigger for auto-creating profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_comics_updated_at BEFORE UPDATE ON public.comics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON public.chapters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for comics
INSERT INTO storage.buckets (id, name, public) VALUES ('comics', 'comics', true);

-- Storage policies
CREATE POLICY "Comic images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'comics');
CREATE POLICY "Authenticated users can upload comic images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'comics' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own comic images" ON storage.objects FOR UPDATE USING (bucket_id = 'comics' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own comic images" ON storage.objects FOR DELETE USING (bucket_id = 'comics' AND auth.role() = 'authenticated');