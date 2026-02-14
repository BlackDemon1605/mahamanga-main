import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, Upload, X, Save, Trash2, GripVertical } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function EditChapter() {
  const { id: comicId, chapterId } = useParams<{ id: string; chapterId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  
  const [chapterNumber, setChapterNumber] = useState('');
  const [title, setTitle] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [newPages, setNewPages] = useState<File[]>([]);
  const [newPagesPreviews, setNewPagesPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: chapter, isLoading } = useQuery({
    queryKey: ['chapter-edit', chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapters')
        .select(`
          *,
          comics(id, title, creator_id),
          pages(id, page_number, image_url)
        `)
        .eq('id', chapterId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (chapter) {
      setChapterNumber(String(chapter.chapter_number));
      setTitle(chapter.title || '');
      setIsPublished(chapter.is_published || false);
    }
  }, [chapter]);

  // Check ownership
  useEffect(() => {
    if (chapter?.comics && profile && chapter.comics.creator_id !== profile.id) {
      toast.error('You do not have permission to edit this chapter');
      navigate(`/comic/${comicId}`);
    }
  }, [chapter, profile, comicId, navigate]);

  const handleNewPagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewPages(prev => [...prev, ...files]);
    setNewPagesPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeNewPage = (index: number) => {
    setNewPages(prev => prev.filter((_, i) => i !== index));
    setNewPagesPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const deletePage = useMutation({
    mutationFn: async (pageId: string) => {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapter-edit', chapterId] });
      toast.success('Page deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete page');
    },
  });

  const handleSubmit = async () => {
    if (!chapterId || !comicId) {
      toast.error('Missing required data');
      return;
    }

    if (!chapterNumber || isNaN(Number(chapterNumber))) {
      toast.error('Please enter a valid chapter number');
      return;
    }

    setSaving(true);

    try {
      // Update chapter info
      const { error: updateError } = await supabase
        .from('chapters')
        .update({
          chapter_number: parseInt(chapterNumber),
          title: title || null,
          is_published: isPublished,
        })
        .eq('id', chapterId);

      if (updateError) throw updateError;

      // Upload new pages if any
      if (newPages.length > 0) {
        const existingPagesCount = chapter?.pages?.length || 0;
        
        for (let i = 0; i < newPages.length; i++) {
          const page = newPages[i];
          const pageNumber = existingPagesCount + i + 1;
          const pagePath = `pages/${comicId}/${chapterId}/${pageNumber}-${page.name}`;
          
          const { error: pageUploadError } = await supabase.storage
            .from('comics')
            .upload(pagePath, page);
          
          if (pageUploadError) throw pageUploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('comics')
            .getPublicUrl(pagePath);

          const { error: pageInsertError } = await supabase
            .from('pages')
            .insert({
              chapter_id: chapterId,
              page_number: pageNumber,
              image_url: publicUrl,
            });

          if (pageInsertError) throw pageInsertError;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['chapter-edit', chapterId] });
      toast.success('Chapter updated successfully!');
      setNewPages([]);
      setNewPagesPreviews([]);
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error.message || 'Failed to update chapter');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!chapter) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-xl font-semibold mb-2">Chapter not found</h2>
          <Button variant="link" onClick={() => navigate('/')}>Go back home</Button>
        </div>
      </MainLayout>
    );
  }

  const existingPages = chapter.pages?.sort((a, b) => a.page_number - b.page_number) || [];

  return (
    <MainLayout>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/comic/${comicId}/edit`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Edit Chapter {chapter.chapter_number}</h1>
              <p className="text-sm text-muted-foreground">{chapter.comics?.title}</p>
            </div>
          </div>
          <Button variant="gradient" onClick={handleSubmit} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        <div className="space-y-6">
          {/* Chapter Info */}
          <div className="glass rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="chapterNumber">Chapter Number</Label>
                <Input
                  id="chapterNumber"
                  type="number"
                  value={chapterNumber}
                  onChange={(e) => setChapterNumber(e.target.value)}
                  className="bg-secondary"
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title (optional)</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., The Beginning"
                  className="bg-secondary"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label>Published</Label>
                <p className="text-xs text-muted-foreground">Make this chapter visible to readers</p>
              </div>
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            </div>
          </div>

          {/* Existing Pages */}
          {existingPages.length > 0 && (
            <div className="space-y-3">
              <Label>Existing Pages ({existingPages.length})</Label>
              <div className="grid grid-cols-3 gap-3">
                {existingPages.map((page) => (
                  <div key={page.id} className="relative aspect-[3/4] rounded-lg overflow-hidden group">
                    <img src={page.image_url} alt={`Page ${page.page_number}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="iconSm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Page?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete page {page.page_number}. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90"
                              onClick={() => deletePage.mutate(page.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <span className="absolute bottom-1 left-1 text-xs bg-background/80 px-2 py-0.5 rounded">
                      {page.page_number}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Pages */}
          <div className="space-y-3">
            <Label>Add New Pages</Label>
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors">
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Drop files or click to upload</span>
              <span className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP</span>
              <input type="file" accept="image/*" multiple onChange={handleNewPagesChange} className="hidden" />
            </label>

            {newPagesPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {newPagesPreviews.map((preview, i) => (
                  <div key={i} className="relative aspect-[3/4] rounded-lg overflow-hidden group">
                    <img src={preview} alt={`New Page ${i + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="destructive"
                        size="iconSm"
                        onClick={() => removeNewPage(i)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <span className="absolute bottom-1 left-1 text-xs bg-primary/80 px-2 py-0.5 rounded">
                      New {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
