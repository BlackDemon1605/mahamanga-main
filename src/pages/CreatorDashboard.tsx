import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComicGrid } from '@/components/comics/ComicGrid';
import { Shield, Image, Plus, Trash2, Users, BookOpen, BarChart3, Upload, LogIn, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function CreatorDashboard() {
  const { user, profile, signIn } = useAuth();
  const navigate = useNavigate();
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoggingIn, setAdminLoggingIn] = useState(false);
  const queryClient = useQueryClient();
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bannerDestUrl, setBannerDestUrl] = useState('');
  const [bannerStartDate, setBannerStartDate] = useState('');
  const [bannerEndDate, setBannerEndDate] = useState('');
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check user role
  const { data: userRole, isLoading: loadingRole } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data?.role || 'user';
    },
    enabled: !!user?.id,
  });

  const isAdmin = userRole === 'admin';
  const isCreator = userRole === 'creator' || isAdmin;

  // Stats for admin dashboard
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [profilesRes, comicsRes, bannersRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('comics').select('id', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('promotion_banners').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);
      return {
        totalUsers: profilesRes.count || 0,
        totalComics: comicsRes.count || 0,
        activePromotions: bannersRes.count || 0,
      };
    },
    enabled: isAdmin,
  });

  // My comics
  const { data: myComics, isLoading: loadingComics } = useQuery({
    queryKey: ['creator-comics', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comics')
        .select('*, chapters(id)')
        .eq('creator_id', profile!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id && isCreator,
  });

  // All banners (admin only)
  const { data: banners } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotion_banners')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // All users (admin only)
  const { data: allRoles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*');
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const handleImageUpload = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const fileName = `banners/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('comics').upload(fileName, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('comics').getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const closeBannerForm = () => {
    setShowBannerForm(false);
    setEditingBanner(null);
    setBannerTitle('');
    setBannerImageUrl('');
    setBannerDestUrl('');
    setBannerStartDate('');
    setBannerEndDate('');
    setBannerImageFile(null);
  };

  const openEditBanner = (banner: any) => {
    setEditingBanner(banner);
    setBannerTitle(banner.title);
    setBannerImageUrl(banner.image_url);
    setBannerDestUrl(banner.destination_url || '');
    setBannerStartDate(banner.start_date ? banner.start_date.split('T')[0] : '');
    setBannerEndDate(banner.end_date ? banner.end_date.split('T')[0] : '');
    setBannerImageFile(null);
    setShowBannerForm(true);
  };

  const createBannerMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let imageUrl = bannerImageUrl;
      
      if (bannerImageFile) {
        imageUrl = await handleImageUpload(bannerImageFile);
      }
      
      if (!imageUrl) throw new Error('Image is required');

      const { error } = await supabase.from('promotion_banners').insert({
        title: bannerTitle,
        image_url: imageUrl,
        destination_url: bannerDestUrl || null,
        start_date: bannerStartDate || new Date().toISOString(),
        end_date: bannerEndDate || null,
        is_active: true,
        created_by: profile!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      queryClient.invalidateQueries({ queryKey: ['promo-banners'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      closeBannerForm();
      toast.success('Banner created!');
    },
    onError: () => toast.error('Failed to create banner'),
    onSettled: () => setUploading(false),
  });

  const updateBannerMutation = useMutation({
    mutationFn: async () => {
      if (!editingBanner) return;
      setUploading(true);
      let imageUrl = bannerImageUrl;
      if (bannerImageFile) {
        imageUrl = await handleImageUpload(bannerImageFile);
      }
      if (!imageUrl) throw new Error('Image is required');
      const { error } = await supabase.from('promotion_banners').update({
        title: bannerTitle,
        image_url: imageUrl,
        destination_url: bannerDestUrl || null,
        start_date: bannerStartDate || new Date().toISOString(),
        end_date: bannerEndDate || null,
      }).eq('id', editingBanner.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      queryClient.invalidateQueries({ queryKey: ['promo-banners'] });
      closeBannerForm();
      toast.success('Banner updated!');
    },
    onError: () => toast.error('Failed to update banner'),
    onSettled: () => setUploading(false),
  });

  const toggleBannerMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('promotion_banners')
        .update({ is_active: !isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      queryClient.invalidateQueries({ queryKey: ['promo-banners'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const deleteBannerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('promotion_banners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      queryClient.invalidateQueries({ queryKey: ['promo-banners'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Banner deleted');
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await supabase.from('user_roles').delete().eq('user_id', userId);
      if (role !== 'user') {
        const { error } = await supabase.from('user_roles').insert({
          user_id: userId,
          role: role as any,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      toast.success('Role updated');
    },
  });

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoggingIn(true);
    const { error } = await signIn(adminEmail, adminPassword);
    setAdminLoggingIn(false);
    if (error) {
      toast.error('Invalid login credentials');
    }
  };

  // Show admin login form if not logged in
  if (!user && !loadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <Shield className="w-12 h-12 text-primary mx-auto" />
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Sign in to access the dashboard</p>
          </div>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="Email address"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Password"
                required
              />
            </div>
            <Button type="submit" className="w-full" variant="gradient" disabled={adminLoggingIn}>
              <LogIn className="w-4 h-4 mr-2" />
              {adminLoggingIn ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (loadingRole) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!isCreator && !isAdmin) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
          <Shield className="w-16 h-16 text-muted-foreground" />
          <h2 className="text-xl font-bold">Access Restricted</h2>
          <p className="text-muted-foreground text-center">
            You need Creator or Admin role to access this dashboard.
          </p>
        </div>
      </MainLayout>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers ?? '—' },
    { label: 'Total Comics', value: stats?.totalComics ?? '—' },
    { label: 'Active Promotions', value: stats?.activePromotions ?? '—' },
  ];

  return (
    <MainLayout>
      <div className="px-4 py-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-shine mb-6">
          {isAdmin ? '🛡️ Admin Dashboard' : '🎨 Creator Dashboard'}
        </h1>

        {/* Admin Stats */}
        {isAdmin && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {statCards.map((stat) => (
              <div key={stat.label} className="glass rounded-xl p-4 text-center">
                <p className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        <Tabs defaultValue={isAdmin ? "banners" : "comics"} className="w-full">
          <TabsList className={`w-full grid ${isAdmin ? 'grid-cols-3' : 'grid-cols-1'} bg-secondary rounded-xl p-1 mb-6`}>
            {isCreator && (
              <TabsTrigger value="comics" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <BookOpen className="w-4 h-4 mr-2" />
                My Comics
              </TabsTrigger>
            )}
            {isAdmin && (
              <>
                <TabsTrigger value="banners" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Image className="w-4 h-4 mr-2" />
                  Promotions
                </TabsTrigger>
                <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Users className="w-4 h-4 mr-2" />
                  Users
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="comics">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">{myComics?.length || 0} comics</p>
              <Button variant="gradient" size="sm" onClick={() => navigate('/upload')}>
                <Plus className="w-4 h-4 mr-1" /> Upload Comic
              </Button>
            </div>
            <ComicGrid comics={myComics || []} loading={loadingComics} showPublishStatus />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="banners">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">{banners?.length || 0} banners</p>
                <Button variant="gradient" size="sm" onClick={() => setShowBannerForm(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Banner
                </Button>
              </div>
              <div className="space-y-3">
                {banners?.map((banner) => (
                  <div key={banner.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border/30">
                    <img src={banner.image_url} alt={banner.title} className="w-20 h-12 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{banner.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {banner.is_active ? '✅ Active' : '❌ Inactive'}
                        {banner.end_date && ` · Ends ${new Date(banner.end_date).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Switch
                      checked={banner.is_active}
                      onCheckedChange={() => toggleBannerMutation.mutate({ id: banner.id, isActive: banner.is_active })}
                    />
                    <Button variant="ghost" size="iconSm" onClick={() => openEditBanner(banner)}>
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="iconSm" onClick={() => deleteBannerMutation.mutate(banner.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {banners?.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No banners yet. Create your first promotion!</p>
                )}
              </div>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="users">
              <RoleManager allRoles={allRoles || []} onAssign={(userId, role) => assignRoleMutation.mutate({ userId, role })} />
            </TabsContent>
          )}
        </Tabs>

        {/* Banner Form Dialog */}
        <Dialog open={showBannerForm} onOpenChange={(open) => { if (!open) closeBannerForm(); else setShowBannerForm(true); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingBanner ? 'Edit Promotion Banner' : 'Add Promotion Banner'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={bannerTitle} onChange={(e) => setBannerTitle(e.target.value)} placeholder="Banner title" maxLength={100} />
              </div>
              
              {/* Image upload */}
              <div className="space-y-2">
                <Label>Banner Image</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setBannerImageFile(file);
                      setBannerImageUrl('');
                    }
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {bannerImageFile ? bannerImageFile.name : 'Upload Image'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Or paste image URL:</p>
                <Input
                  value={bannerImageUrl}
                  onChange={(e) => { setBannerImageUrl(e.target.value); setBannerImageFile(null); }}
                  placeholder="https://..."
                />
                {(bannerImageFile || bannerImageUrl) && (
                  <img
                    src={bannerImageFile ? URL.createObjectURL(bannerImageFile) : bannerImageUrl}
                    alt="Preview"
                    className="w-full h-24 object-cover rounded-lg"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Destination URL (optional)</Label>
                <Input value={bannerDestUrl} onChange={(e) => setBannerDestUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={bannerStartDate} onChange={(e) => setBannerStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End Date (optional)</Label>
                  <Input type="date" value={bannerEndDate} onChange={(e) => setBannerEndDate(e.target.value)} />
                </div>
              </div>
              <Button
                className="w-full"
                variant="gradient"
                onClick={() => editingBanner ? updateBannerMutation.mutate() : createBannerMutation.mutate()}
                disabled={!bannerTitle || (!bannerImageUrl && !bannerImageFile) || uploading}
              >
                {uploading ? 'Uploading...' : editingBanner ? 'Update Banner' : 'Create Banner'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

// Role Manager sub-component
function RoleManager({ allRoles, onAssign }: { allRoles: any[]; onAssign: (userId: string, role: string) => void }) {
  const [newUserId, setNewUserId] = useState('');
  const [newRole, setNewRole] = useState('admin');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newUserId}
          onChange={(e) => setNewUserId(e.target.value)}
          placeholder="User ID to assign role"
          className="flex-1"
          maxLength={100}
        />
        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          className="bg-secondary border border-border rounded-lg px-3 text-sm"
        >
          <option value="admin">Admin</option>
          <option value="user">User (remove role)</option>
        </select>
        <Button size="sm" onClick={() => { onAssign(newUserId, newRole); setNewUserId(''); }}>
          Assign
        </Button>
      </div>
      <div className="space-y-2">
        {allRoles.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/30">
            <div>
              <p className="text-sm font-mono truncate">{r.user_id}</p>
              <p className="text-xs text-primary font-semibold uppercase">{r.role}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onAssign(r.user_id, 'user')}>
              Remove
            </Button>
          </div>
        ))}
        {allRoles.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No special roles assigned yet.</p>
        )}
      </div>
    </div>
  );
}
