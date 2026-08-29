
-- Function to notify followers when a new comic is published
CREATE OR REPLACE FUNCTION public.notify_followers_new_comic()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  follower RECORD;
  creator_name TEXT;
  comic_title TEXT;
BEGIN
  -- Only trigger when comic becomes published
  IF NEW.is_published = true AND (OLD.is_published IS NULL OR OLD.is_published = false) THEN
    SELECT COALESCE(display_name, username, 'A creator') INTO creator_name
    FROM profiles WHERE id = NEW.creator_id;
    
    comic_title := NEW.title;
    
    FOR follower IN
      SELECT follower_id FROM follows WHERE following_id = NEW.creator_id
    LOOP
      INSERT INTO notifications (recipient_id, sender_id, comic_id, title, message, notification_type)
      VALUES (
        follower.follower_id,
        NEW.creator_id,
        NEW.id,
        '🔥 New comic by ' || creator_name,
        creator_name || ' just released "' || comic_title || '"!',
        'new_comic'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Function to notify followers when a new chapter is published
CREATE OR REPLACE FUNCTION public.notify_followers_new_chapter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  follower RECORD;
  creator_name TEXT;
  comic_title TEXT;
  comic_creator_id UUID;
  comic_uuid UUID;
  comic_published BOOLEAN;
BEGIN
  -- Only trigger when chapter becomes published
  IF NEW.is_published = true AND (OLD IS NULL OR OLD.is_published IS NULL OR OLD.is_published = false) THEN
    SELECT c.creator_id, c.title, c.id, c.is_published
    INTO comic_creator_id, comic_title, comic_uuid, comic_published
    FROM comics c WHERE c.id = NEW.comic_id;
    
    -- Only notify if the comic itself is published
    IF comic_published = true THEN
      SELECT COALESCE(display_name, username, 'A creator') INTO creator_name
      FROM profiles WHERE id = comic_creator_id;
      
      FOR follower IN
        SELECT follower_id FROM follows WHERE following_id = comic_creator_id
      LOOP
        INSERT INTO notifications (recipient_id, sender_id, comic_id, title, message, notification_type)
        VALUES (
          follower.follower_id,
          comic_creator_id,
          comic_uuid,
          '📚 New chapter from ' || creator_name,
          creator_name || ' uploaded Chapter ' || NEW.chapter_number || ' of "' || comic_title || '"',
          'new_chapter'
        );
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_comic_published
  AFTER UPDATE ON public.comics
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_new_comic();

CREATE TRIGGER on_comic_inserted_published
  AFTER INSERT ON public.comics
  FOR EACH ROW
  WHEN (NEW.is_published = true)
  EXECUTE FUNCTION public.notify_followers_new_comic();

CREATE TRIGGER on_chapter_published
  AFTER UPDATE ON public.chapters
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_followers_new_chapter();

CREATE TRIGGER on_chapter_inserted_published
  AFTER INSERT ON public.chapters
  FOR EACH ROW
  WHEN (NEW.is_published = true)
  EXECUTE FUNCTION public.notify_followers_new_chapter();
