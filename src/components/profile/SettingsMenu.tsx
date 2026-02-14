import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MoreVertical, Settings, KeyRound, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export function SettingsMenu() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Edit profile form state
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [fieldErrors, setFieldErrors] = useState({ username: '', general: '' });
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  const openEditProfile = () => {
    setDisplayName(profile?.display_name || '');
    setUsername(profile?.username || '');
    setBio(profile?.bio || '');
    setFieldErrors({ username: '', general: '' });
    setShowEditProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    
    setFieldErrors({ username: '', general: '' });
    setLoading(true);

    try {
      // Check username availability if changed
      if (username !== profile.username) {
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .neq('id', profile.id)
          .maybeSingle();

        if (checkError) throw checkError;
        
        if (existingUser) {
          setFieldErrors(prev => ({ ...prev, username: 'Username is already taken' }));
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          username: username.trim() || null,
          bio: bio.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await refreshProfile();
      setShowEditProfile(false);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      setFieldErrors(prev => ({ ...prev, general: error.message || 'Failed to update profile' }));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully');
    } catch (error: any) {
      setPasswordError(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="iconSm" className="absolute top-0 right-0">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={openEditProfile}>
            <Settings className="w-4 h-4 mr-2" />
            Edit Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowChangePassword(true)}>
            <KeyRound className="w-4 h-4 mr-2" />
            Change Password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setFieldErrors(prev => ({ ...prev, username: '' }));
                }}
                placeholder="Your username"
              />
              {fieldErrors.username && (
                <p className="text-sm text-destructive">{fieldErrors.username}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself"
                rows={3}
              />
            </div>

            {fieldErrors.general && (
              <p className="text-sm text-destructive">{fieldErrors.general}</p>
            )}
            
            <Button onClick={handleSaveProfile} disabled={loading} className="w-full">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Enter new password"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Confirm new password"
              />
            </div>

            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
            
            <Button onClick={handleChangePassword} disabled={loading} className="w-full">
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
