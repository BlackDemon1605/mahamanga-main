
-- Add is_pinned column to posts table for admin pinning in community
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

-- Add is_pinned column to comments table for author pinning on comics
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
