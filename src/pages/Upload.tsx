import { useState, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Upload as UploadIcon, Image, X, ChevronRight, ChevronLeft, Check, Search, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

const genres = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports'];

const allLanguages = [
  { code: 'en', name: 'English' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'id', name: 'Indonesian' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'ms', name: 'Malay' },
  { code: 'tl', name: 'Filipino' },
  { code: 'tr', name: 'Turkish' },
  { code: 'pl', name: 'Polish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'el', name: 'Greek' },
  { code: 'he', name: 'Hebrew' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'cs', name: 'Czech' },
  { code: 'ro', name: 'Romanian' },
  { code: 'hu', name: 'Hungarian' },
];

const initialLanguages = [...allLanguages];

type Step = 1 | 2 | 3 | 4 | 5;

export default function Upload() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  
  // Form data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [language, setLanguage] = useState('en');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [pages, setPages] = useState<File[]>([]);
  const [pagesPreviews, setPagesPreviews] = useState<string[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [customGenre, setCustomGenre] = useState('');
  const [languageOpen, setLanguageOpen] = useState(false);
  const [customLanguageName, setCustomLanguageName] = useState('');
  const [languages, setLanguages] = useState(initialLanguages);

  // Redirect to auth if not logged in
  if (!authLoading && !user) {
    navigate('/auth');
    return null;
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

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

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const addCustomGenre = () => {
    const trimmed = customGenre.trim();
    if (trimmed && !selectedGenres.includes(trimmed)) {
      setSelectedGenres(prev => [...prev, trimmed]);
      setCustomGenre('');
    }
  };

  const addCustomLanguage = () => {
    const trimmed = customLanguageName.trim();
    if (trimmed && !languages.some(l => l.name.toLowerCase() === trimmed.toLowerCase())) {
      const newLang = { code: trimmed.toLowerCase().replace(/\s+/g, '-'), name: trimmed };
      setLanguages(prev => [...prev, newLang]);
      setLanguage(newLang.code);
      setCustomLanguageName('');
      setLanguageOpen(false);
    }
  };

  const selectedLanguage = languages.find(l => l.code === language);

  const canProceed = () => {
    switch (step) {
      case 1: return title.length >= 3;
      case 2: return pages.length > 0;
      case 3: return selectedGenres.length > 0;
      case 4: return true;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (!profile?.id) {
      toast.error('Profile not found');
      return;
    }

    setLoading(true);

    try {
      let coverUrl = null;

      // Upload cover image
      if (coverFile) {
        const coverPath = `covers/${profile.id}/${Date.now()}-${coverFile.name}`;
        const { error: coverError } = await supabase.storage
          .from('comics')
          .upload(coverPath, coverFile);
        
        if (coverError) throw coverError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('comics')
          .getPublicUrl(coverPath);
        
        coverUrl = publicUrl;
      }

      // Create comic
      const { data: comic, error: comicError } = await supabase
        .from('comics')
        .insert({
          creator_id: profile.id,
          title,
          description,
          cover_image_url: coverUrl,
          genre: selectedGenres,
          language,
          is_published: isPublished,
        })
        .select()
        .single();

      if (comicError) throw comicError;

      // Create first chapter
      const { data: chapter, error: chapterError } = await supabase
        .from('chapters')
        .insert({
          comic_id: comic.id,
          chapter_number: 1,
          title: 'Chapter 1',
          is_published: isPublished,
        })
        .select()
        .single();

      if (chapterError) throw chapterError;

      // Upload pages
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const pagePath = `pages/${comic.id}/${chapter.id}/${i + 1}-${page.name}`;
        
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

      toast.success('Comic uploaded successfully!');
      navigate(`/comic/${comic.id}`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload comic');
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = ['New Title', 'Upload Pages', 'Metadata', 'Preview', 'Publish'];

  return (
    <MainLayout>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {stepTitles.map((title, i) => (
              <div
                key={i}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  step > i + 1
                    ? 'bg-primary text-primary-foreground'
                    : step === i + 1
                    ? 'bg-gradient-primary text-primary-foreground shadow-glow'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {step > i + 1 ? <Check className="w-4 h-4" /> : i + 1}
              </div>
            ))}
          </div>
          <div className="h-1 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-primary transition-all duration-300"
              style={{ width: `${((step - 1) / 4) * 100}%` }}
            />
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Step {step}: {stepTitles[step - 1]}
          </p>
        </div>

        {/* Step 1: Title & Description */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-up">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter your comic title"
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell readers about your comic..."
                className="bg-secondary min-h-[120px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Cover Image</Label>
              <div className="flex items-start gap-4">
                <label className="flex flex-col items-center justify-center w-32 h-44 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors">
                  {coverPreview ? (
                    <img src={coverPreview} alt="Cover" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <>
                      <Image className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">Add cover</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Upload Pages */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-up">
            <div className="space-y-2">
              <Label>Chapter Pages *</Label>
              <p className="text-sm text-muted-foreground">
                Upload your comic pages in order. You can drag to reorder or remove pages.
              </p>
            </div>
            
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors">
              <UploadIcon className="w-8 h-8 text-muted-foreground mb-2" />
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
        )}

        {/* Step 3: Metadata */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-up">
            <div className="space-y-2">
              <Label>Genre(s) *</Label>
              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <Button
                    key={genre}
                    variant={selectedGenres.includes(genre) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleGenre(genre)}
                    className="rounded-full"
                  >
                    {genre}
                  </Button>
                ))}
                {/* Custom genres that user added */}
                {selectedGenres.filter(g => !genres.includes(g)).map((genre) => (
                  <Button
                    key={genre}
                    variant="default"
                    size="sm"
                    onClick={() => toggleGenre(genre)}
                    className="rounded-full"
                  >
                    {genre}
                  </Button>
                ))}
              </div>
              {/* Add custom genre input */}
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Type custom genre..."
                  value={customGenre}
                  onChange={(e) => setCustomGenre(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomGenre();
                    }
                  }}
                  className="bg-secondary flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCustomGenre}
                  disabled={!customGenre.trim()}
                >
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Language</Label>
              <Popover open={languageOpen} onOpenChange={setLanguageOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={languageOpen}
                    className="w-full justify-between bg-secondary"
                  >
                    {selectedLanguage?.name || 'Select language...'}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 bg-background border border-border z-50" align="start">
                  <Command className="bg-background">
                    <CommandInput placeholder="Search language..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>
                        <div className="p-2 text-sm text-muted-foreground">
                          No language found. Add your own below.
                        </div>
                      </CommandEmpty>
                      <CommandGroup className="max-h-60 overflow-y-auto">
                        {languages.map((lang) => (
                          <CommandItem
                            key={lang.code}
                            value={lang.name}
                            onSelect={() => {
                              setLanguage(lang.code);
                              setLanguageOpen(false);
                            }}
                            className="cursor-pointer"
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                language === lang.code ? 'opacity-100' : 'opacity-0'
                              }`}
                            />
                            {lang.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      {/* Add custom language option */}
                      <div className="p-2 border-t border-border">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add custom language..."
                            value={customLanguageName}
                            onChange={(e) => setCustomLanguageName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                addCustomLanguage();
                              }
                            }}
                            className="bg-secondary flex-1 h-8 text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={addCustomLanguage}
                            disabled={!customLanguageName.trim()}
                            className="h-8"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        {/* Step 4: Preview */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-up">
            <div className="glass rounded-xl p-4">
              <div className="flex gap-4">
                {coverPreview && (
                  <img src={coverPreview} alt="Cover" className="w-24 h-32 object-cover rounded-lg" />
                )}
                <div>
                  <h3 className="font-bold text-lg">{title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedGenres.map(g => (
                      <span key={g} className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  {pages.length} pages • {selectedLanguage?.name}
                </p>
              </div>
            </div>

            <div className="glass rounded-xl p-4">
              <h4 className="font-medium mb-3">Page Preview</h4>
              <div className="grid grid-cols-4 gap-2">
                {pagesPreviews.slice(0, 4).map((p, i) => (
                  <img key={i} src={p} alt={`Page ${i + 1}`} className="aspect-[3/4] object-cover rounded" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Publish Settings */}
        {step === 5 && (
          <div className="space-y-6 animate-fade-up">
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Publish immediately</h4>
                  <p className="text-sm text-muted-foreground">
                    Make your comic visible to readers right away
                  </p>
                </div>
                <Button
                  variant={isPublished ? 'default' : 'outline'}
                  onClick={() => setIsPublished(!isPublished)}
                >
                  {isPublished ? 'Yes' : 'No'}
                </Button>
              </div>
            </div>

            {!isPublished && (
              <p className="text-sm text-muted-foreground">
                Your comic will be saved as a draft. You can publish it later from your profile.
              </p>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep((step - 1) as Step)}
              className="flex-1"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          {step < 5 ? (
            <Button
              variant="gradient"
              onClick={() => setStep((step + 1) as Step)}
              disabled={!canProceed()}
              className="flex-1"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              variant="gradient"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Uploading...' : isPublished ? 'Publish Comic' : 'Save Draft'}
            </Button>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
