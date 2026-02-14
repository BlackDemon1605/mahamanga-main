import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Watermark } from '@/components/reader/Watermark';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  ChevronLeft, ChevronRight, X, List, 
  ChevronDown, Maximize, Minimize, LogIn 
} from 'lucide-react';

export default function Reader() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChapterList, setShowChapterList] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const authTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Show auth popup every 2-3 minutes for non-logged-in users
  useEffect(() => {
    if (user) return; // Don't show if logged in

    const delay = Math.floor(Math.random() * 60000) + 120000; // 2-3 min random
    const startTimer = () => {
      authTimerRef.current = setInterval(() => {
        setShowAuthPrompt(true);
      }, delay);
    };

    startTimer();
    return () => {
      if (authTimerRef.current) clearInterval(authTimerRef.current);
    };
  }, [user]);

  const { data: chapter, isLoading } = useQuery({
    queryKey: ['chapter', chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapters')
        .select(`
          *,
          comics:comic_id(id, title, creator_id),
          pages(id, page_number, image_url)
        `)
        .eq('id', chapterId)
        .single();
      
      if (error) throw error;
      return {
        ...data,
        pages: data.pages?.sort((a, b) => a.page_number - b.page_number) || [],
      };
    },
  });

  const { data: allChapters } = useQuery({
    queryKey: ['comic-chapters', chapter?.comic_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapters')
        .select('id, chapter_number, title')
        .eq('comic_id', chapter?.comic_id)
        .eq('is_published', true)
        .order('chapter_number', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!chapter?.comic_id,
  });

  // Find prev/next chapters
  const currentChapterIndex = allChapters?.findIndex(c => c.id === chapterId) ?? -1;
  const prevChapter = currentChapterIndex > 0 ? allChapters?.[currentChapterIndex - 1] : null;
  const nextChapter = currentChapterIndex < (allChapters?.length || 0) - 1 ? allChapters?.[currentChapterIndex + 1] : null;

  // Update reading history
  useEffect(() => {
    if (profile?.id && chapter?.comics?.id) {
      supabase
        .from('reading_history')
        .upsert({
          user_id: profile.id,
          comic_id: chapter.comics.id,
          chapter_id: chapterId,
          last_read_at: new Date().toISOString(),
        }, { onConflict: 'user_id,comic_id' });
    }
  }, [profile?.id, chapter?.comics?.id, chapterId]);

  // Toggle controls on tap
  const handleTap = useCallback(() => {
    setShowControls(prev => !prev);
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowControls(true);
        setShowChapterList(false);
      }
      if (e.key === 'ArrowLeft' && prevChapter) {
        navigate(`/read/${prevChapter.id}`);
      }
      if (e.key === 'ArrowRight' && nextChapter) {
        navigate(`/read/${nextChapter.id}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, prevChapter, nextChapter]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center">
        <h2 className="text-xl font-semibold mb-2">Chapter not found</h2>
        <Link to="/" className="text-primary hover:underline">Go back home</Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50">
      {/* Top bar */}
      <div 
        className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
          showControls ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="glass-strong flex items-center justify-between h-14 px-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="iconSm" 
              onClick={() => navigate(`/comic/${chapter.comics?.id}`)}
            >
              <X className="w-5 h-5" />
            </Button>
            <div className="ml-2">
              <p className="text-sm font-medium line-clamp-1">{chapter.comics?.title}</p>
              <p className="text-xs text-muted-foreground">
                Ch. {chapter.chapter_number}{chapter.title && `: ${chapter.title}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => setShowChapterList(!showChapterList)}
            >
              <List className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="iconSm" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Chapter list dropdown */}
      {showChapterList && (
        <div className="fixed top-14 right-4 w-64 max-h-96 overflow-y-auto glass-strong rounded-xl shadow-card z-50 animate-fade-in">
          <div className="p-2">
            {allChapters?.map((ch) => (
              <button
                key={ch.id}
                onClick={() => {
                  navigate(`/read/${ch.id}`);
                  setShowChapterList(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  ch.id === chapterId 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-secondary'
                }`}
              >
                <p className="text-sm font-medium">Chapter {ch.chapter_number}</p>
                {ch.title && <p className="text-xs opacity-80">{ch.title}</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pages - Vertical scroll (Webtoon style) */}
      <div 
        className="h-full overflow-y-auto pt-14 pb-20"
        onClick={handleTap}
      >
        <div className="max-w-3xl mx-auto">
          {chapter.pages.map((page) => (
            <div key={page.id} className="relative">
              <img
                src={page.image_url}
                alt={`Page ${page.page_number}`}
                className="w-full h-auto select-none"
                style={{ WebkitUserDrag: 'none' } as React.CSSProperties}
                loading="lazy"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
              />
              {/* Watermark overlay per page - always shows app name, plus username if logged in */}
              <Watermark />
            </div>
          ))}

          {chapter.pages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
              <p>No pages in this chapter</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ${
          showControls ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="glass-strong flex items-center justify-between h-16 px-4 border-t border-border/50">
          <Button
            variant="outline"
            onClick={() => prevChapter && navigate(`/read/${prevChapter.id}`)}
            disabled={!prevChapter}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </Button>
          
          <div className="flex flex-col items-center">
            <p className="text-xs text-muted-foreground">
              Chapter {chapter.chapter_number} of {allChapters?.length || 0}
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => nextChapter && navigate(`/read/${nextChapter.id}`)}
            disabled={!nextChapter}
            className="gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Auth prompt for non-logged-in users */}
      <Dialog open={showAuthPrompt} onOpenChange={setShowAuthPrompt}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="w-5 h-5 text-primary" />
              Join MahaManga
            </DialogTitle>
            <DialogDescription>
              Sign in to save your reading progress, bookmark your favorite comics, and join the community!
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-2">
            <Button onClick={() => { setShowAuthPrompt(false); navigate('/auth'); }}>
              Sign In / Sign Up
            </Button>
            <Button variant="ghost" onClick={() => setShowAuthPrompt(false)}>
              Continue Reading
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
