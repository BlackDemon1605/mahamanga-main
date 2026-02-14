-- Create function to increment view count atomically
CREATE OR REPLACE FUNCTION public.increment_view_count(comic_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE comics
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = comic_id;
END;
$$;