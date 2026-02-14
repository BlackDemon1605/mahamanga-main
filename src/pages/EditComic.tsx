import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  ArrowLeft, Save, Trash2, Plus, Image, 
  Eye, EyeOff, ChevronRight, BookOpen, Settings
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const genres = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports'];
const statuses = [
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'hiatus', label: 'Hiatus' },
];

export default function EditComic() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [status, setStatus] = useState('ongoing');
  const [isPublished, setIsPublished] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: comic, isLoading } = useQuery({
    queryKey: ['comic-edit', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comics')
        .select(`
          *,
          chapters(id, chapter_number, title, is_published, created_at, view_count)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (comic) {
      setTitle(comic.title);
      setDescription(comic.description || '');
      setSelectedGenres(comic.genre || []);
      setStatus(comic.status || 'ongoing');
      setIsPublished(comic.is_published || false);
      setCoverPreview(comic.cover_image_url);
    }
  }, [comic]);

  // Check ownership
  useEffect(() => {
    if (comic && profile && comic.creator_id !== profile.id) {
      toast.error('You do not have permission to edit this comic');
      navigate(`/comic/${id}`);
    }
  }, [comic, profile, id, navigate]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setSaving(true);
      let coverUrl = comic?.cover_image_url;

      if (coverFile && profile?.id) {
        const coverPath = `covers/${profile.id}/${Date.now()}-${coverFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('comics')
          .upload(coverPath, coverFile);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('comics')
          .getPublicUrl(coverPath);
        
        coverUrl = publicUrl;
      }

      const { error } = await supabase
        .from('comics')
        .update({
          title,
          description,
          genre: selectedGenres,
          status,
          is_published: isPublished,
          cover_image_url: coverUrl,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comic', id] });
      queryClient.invalidateQueries({ queryKey: ['comic-edit', id] });
      toast.success('Comic updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save changes');
    },
    onSettled: () => {
      setSaving(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('comics')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Comic deleted');
      navigate('/profile');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete comic');
    },
  });

  const toggleChapterPublish = useMutation({
    mutationFn: async ({ chapterId, published }: { chapterId: string; published: boolean }) => {
      const { error } = await supabase
        .from('chapters')
        .update({ is_published: published })
        .eq('id', chapterId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comic-edit', id] });
      toast.success('Chapter visibility updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update chapter');
    },
  });

  const deleteChapter = useMutation({
    mutationFn: async (chapterId: string) => {
      const { error } = await supabase
        .from('chapters')
        .delete()
        .eq('id', chapterId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comic-edit', id] });
      toast.success('Chapter deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete chapter');
    },
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!comic) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-xl font-semibold mb-2">Comic not found</h2>
          <Button variant="link" onClick={() => navigate('/')}>Go back home</Button>
        </div>
      </MainLayout>
    );
  }

  const chapters = comic.chapters?.sort((a, b) => a.chapter_number - b.chapter_number) || [];

  return (
    <MainLayout>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/comic/${id}`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Edit Comic</h1>
          </div>
          <Button variant="gradient" onClick={() => saveMutation.mutate()} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-6">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="chapters">Chapters</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            {/* Cover Image */}
            <div className="space-y-2">
              <Label>Cover Image</Label>
              <div className="flex items-start gap-4">
                <label className="relative flex flex-col items-center justify-center w-32 h-44 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors overflow-hidden group">
                  {coverPreview ? (
                    <>
                      <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Image className="w-6 h-6" />
                      </div>
                    </>
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

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-secondary"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-secondary min-h-[120px]"
              />
            </div>

            {/* Genres */}
            <div className="space-y-2">
              <Label>Genres</Label>
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
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex gap-2">
                {statuses.map((s) => (
                  <Button
                    key={s.value}
                    variant={status === s.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatus(s.value)}
                    className="rounded-full"
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Chapters Tab */}
          <TabsContent value="chapters" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Chapters ({chapters.length})</h3>
              <Button variant="gradient" size="sm" onClick={() => navigate(`/comic/${id}/add-chapter`)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Chapter
              </Button>
            </div>

            {chapters.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No chapters yet</p>
                <Button variant="outline" onClick={() => navigate(`/comic/${id}/add-chapter`)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Chapter
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {chapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    className="glass rounded-xl p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        Chapter {chapter.chapter_number}
                        {chapter.title && `: ${chapter.title}`}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {chapter.view_count || 0}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full ${
                          chapter.is_published ? 'bg-primary/20 text-primary' : 'bg-muted'
                        }`}>
                          {chapter.is_published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() => toggleChapterPublish.mutate({ 
                          chapterId: chapter.id, 
                          published: !chapter.is_published 
                        })}
                        title={chapter.is_published ? 'Unpublish' : 'Publish'}
                      >
                        {chapter.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() => navigate(`/comic/${id}/edit-chapter/${chapter.id}`)}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="iconSm" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Chapter?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete Chapter {chapter.chapter_number} and all its pages. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90"
                              onClick={() => deleteChapter.mutate(chapter.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Publish Status */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Publish Status</h4>
                  <p className="text-sm text-muted-foreground">
                    {isPublished ? 'Your comic is visible to everyone' : 'Only you can see this comic'}
                  </p>
                </div>
                <Switch
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="glass rounded-xl p-4">
              <h4 className="font-medium mb-3">Statistics</h4>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{(comic.view_count || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Views</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{chapters.length}</p>
                  <p className="text-xs text-muted-foreground">Chapters</p>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="rounded-xl border border-destructive/50 p-4">
              <h4 className="font-medium text-destructive mb-2">Danger Zone</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Deleting your comic is permanent and cannot be undone. All chapters and pages will be removed.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Comic
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{comic.title}" and all its chapters and pages. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90"
                      onClick={() => deleteMutation.mutate()}
                    >
                      Delete Forever
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
