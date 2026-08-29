import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, Upload, X, Save } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

export default function AddChapter() {
  const { id: comicId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [chapterNumber, setChapterNumber] = useState('');
  const [title, setTitle] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [pages, setPages] = useState<File[]>([]);
  const [pagesPreviews, setPagesPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: comic, isLoading } = useQuery({
    queryKey: ['comic-for-chapter', comicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comics')
        .select('id, title, creator_id, chapters(chapter_number)')
        .eq('id', comicId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Auto-suggest next chapter number
  useState(() => {
    if (comic?.chapters) {
      const maxChapter = Math.max(0, ...comic.chapters.map(c => c.chapter_number));
      setChapterNumber(String(maxChapter + 1));
    }
  });

  const convertPdfToImages = async (file: File): Promise<File[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const imageFiles: File[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/png', 0.95)
      );
      const imgFile = new File([blob], `${file.name}-page-${i}.png`, { type: 'image/png' });
      imageFiles.push(imgFile);
    }
    return imageFiles;
  };

  const handlePagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const allImages: File[] = [];

    for (const file of files) {
      if (file.type === 'application/pdf') {
        toast.info(`Converting PDF "${file.name}" to images...`);
        try {
          const pdfImages = await convertPdfToImages(file);
          allImages.push(...pdfImages);
        } catch (err) {
          console.error('PDF conversion error:', err);
          toast.error(`Failed to convert PDF "${file.name}"`);
        }
      } else {
        allImages.push(file);
      }
    }

    setPages(prev => [...prev, ...allImages]);
    setPagesPreviews(prev => [...prev, ...allImages.map(f => URL.createObjectURL(f))]);
  };

  const removePage = (index: number) => {
    setPages(prev => prev.filter((_, i) => i !== index));
    setPagesPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!comicId || !profile?.id) {
      toast.error('Missing required data');
      return;
    }

    if (pages.length === 0) {
      toast.error('Please upload at least one page');
      return;
    }

    if (!chapterNumber || isNaN(Number(chapterNumber))) {
      toast.error('Please enter a valid chapter number');
      return;
    }

    setSaving(true);

    try {
      // Create chapter
      const { data: chapter, error: chapterError } = await supabase
        .from('chapters')
        .insert({
          comic_id: comicId,
          chapter_number: parseInt(chapterNumber),
          title: title || null,
          is_published: isPublished,
        })
        .select()
        .single();

      if (chapterError) throw chapterError;

      // Upload pages
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const pagePath = `pages/${comicId}/${chapter.id}/${i + 1}-${page.name}`;
        
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
            chapter_id: chapter.id,
            page_number: i + 1,
            image_url: publicUrl,
          });

        if (pageInsertError) throw pageInsertError;
      }

      toast.success('Chapter added successfully!');
      navigate(`/comic/${comicId}/edit`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to add chapter');
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

  if (!comic || (profile && comic.creator_id !== profile.id)) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-xl font-semibold mb-2">Access denied</h2>
          <Button variant="link" onClick={() => navigate('/')}>Go back home</Button>
        </div>
      </MainLayout>
    );
  }

  const nextChapterNum = Math.max(0, ...comic.chapters.map(c => c.chapter_number)) + 1;

  return (
    <MainLayout>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/comic/${comicId}/edit`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Add Chapter</h1>
            <p className="text-sm text-muted-foreground">{comic.title}</p>
          </div>
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
                  value={chapterNumber || nextChapterNum}
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
                <Label>Publish immediately</Label>
                <p className="text-xs text-muted-foreground">Make this chapter visible to readers</p>
              </div>
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            </div>
          </div>

          {/* Upload Pages */}
          <div className="space-y-3">
            <Label>Chapter Pages</Label>
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors">
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Drop files or click to upload</span>
              <span className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP, PDF</span>
              <input type="file" accept="image/*,.pdf,application/pdf" multiple onChange={handlePagesChange} className="hidden" />
            </label>

            {pagesPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {pagesPreviews.map((preview, i) => (
                  <div key={i} className="relative aspect-[3/4] rounded-lg overflow-hidden group">
                    <img src={preview} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="destructive"
                        size="iconSm"
                        onClick={() => removePage(i)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <span className="absolute bottom-1 left-1 text-xs bg-background/80 px-2 py-0.5 rounded">
                      {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            variant="gradient"
            className="w-full"
            onClick={handleSubmit}
            disabled={saving || pages.length === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Uploading...' : 'Save Chapter'}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
