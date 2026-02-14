import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { z } from 'zod';
import logo from '@/assets/logo.jpg';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = signInSchema.extend({
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username too long'),
});

interface FieldErrors {
  username: string;
  email: string;
  password: string;
}

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [isVerifyEmail, setIsVerifyEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({ username: '', email: '', password: '' });
  const [confirmError, setConfirmError] = useState('');
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordReset(true);
        setIsForgotPassword(false);
        setIsSignUp(false);
        setIsVerifyEmail(false);
      }
      if (event === 'SIGNED_IN') {
        setIsVerifyEmail(false);
        navigate('/');
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  if (user && !isPasswordReset && !isVerifyEmail) {
    navigate('/');
    return null;
  }

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast.error('Google sign-in failed. Please try again.');
    }
    setGoogleLoading(false);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({ username: '', email: '', password: '' });
    setConfirmError('');

    if (password.length < 6) {
      setFieldErrors(prev => ({ ...prev, password: 'Password must be at least 6 characters' }));
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setFieldErrors(prev => ({ ...prev, password: error.message }));
    } else {
      toast.success('Password updated successfully!');
      setIsPasswordReset(false);
      navigate('/');
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({ username: '', email: '', password: '' });

    if (!email || !z.string().email().safeParse(email).success) {
      setFieldErrors(prev => ({ ...prev, email: 'Please enter a valid email' }));
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth',
    });

    if (error) {
      setFieldErrors(prev => ({ ...prev, email: error.message }));
    } else {
      toast.success('Password reset link sent! Check your email.');
      setIsForgotPassword(false);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({ username: '', email: '', password: '' });

    try {
      if (isSignUp) {
        const validation = signUpSchema.safeParse({ email, password, username });
        if (!validation.success) {
          const errors = validation.error.errors;
          const newFieldErrors: FieldErrors = { username: '', email: '', password: '' };
          errors.forEach(err => {
            const field = err.path[0] as keyof FieldErrors;
            if (field in newFieldErrors) {
              newFieldErrors[field] = err.message;
            }
          });
          setFieldErrors(newFieldErrors);
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, username);
        if (error) {
          if (error.message === 'USERNAME_TAKEN') {
            setFieldErrors(prev => ({ ...prev, username: 'Username is already taken' }));
          } else if (error.message.includes('already registered')) {
            setFieldErrors(prev => ({ ...prev, email: 'This email is already registered' }));
          } else {
            setFieldErrors(prev => ({ ...prev, email: error.message }));
          }
        } else {
          // Show verify email page
          setIsVerifyEmail(true);
        }
      } else {
        const validation = signInSchema.safeParse({ email, password });
        if (!validation.success) {
          const errors = validation.error.errors;
          const newFieldErrors: FieldErrors = { username: '', email: '', password: '' };
          errors.forEach(err => {
            const field = err.path[0] as keyof FieldErrors;
            if (field in newFieldErrors) {
              newFieldErrors[field] = err.message;
            }
          });
          setFieldErrors(newFieldErrors);
          setLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login')) {
            setFieldErrors(prev => ({ ...prev, password: 'Invalid email or password' }));
          } else if (error.message.includes('Email not confirmed')) {
            setIsVerifyEmail(true);
          } else {
            setFieldErrors(prev => ({ ...prev, email: error.message }));
          }
        } else {
          toast.success('Welcome back!');
          navigate('/');
        }
      }
    } catch (err) {
      setFieldErrors(prev => ({ ...prev, email: 'Something went wrong. Please try again.' }));
    } finally {
      setLoading(false);
    }
  };

  const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={logo} alt="Maha Manga" className="w-16 h-16 rounded-2xl mx-auto mb-4 object-cover shadow-glow" />
          <h1 className="text-3xl font-bold text-gradient mb-2">Maha Manga</h1>
          <p className="text-muted-foreground">
            {isVerifyEmail ? 'Verify your email' : isPasswordReset ? 'Set your new password' : isForgotPassword ? 'Reset your password' : isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        {/* Form */}
        <div className="glass rounded-2xl p-6">
          {isVerifyEmail ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Check your email</h2>
              <p className="text-muted-foreground text-sm">
                We've sent a verification link to
              </p>
              <p className="font-medium text-primary">{email}</p>
              <p className="text-muted-foreground text-xs">
                Click the link in the email to verify your account. Once verified, you'll be automatically redirected.
              </p>
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm pt-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Waiting for verification...
              </div>
              <div className="pt-4 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const { error } = await supabase.auth.resend({
                      type: 'signup',
                      email,
                    });
                    if (error) toast.error(error.message);
                    else toast.success('Verification email resent!');
                  }}
                  className="w-full"
                >
                  Resend verification email
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setIsVerifyEmail(false);
                    setIsSignUp(false);
                  }}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mx-auto"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to Sign In
                </button>
              </div>
            </div>
          ) : isPasswordReset ? (
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
                    className={`pl-10 pr-10 bg-secondary border-border ${fieldErrors.password ? 'border-destructive' : ''}`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password && <p className="text-sm text-destructive">{fieldErrors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(''); }}
                    className={`pl-10 pr-10 bg-secondary border-border ${confirmError ? 'border-destructive' : ''}`}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmError && <p className="text-sm text-destructive">{confirmError}</p>}
              </div>

              <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          ) : isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
                    className={`pl-10 bg-secondary border-border ${fieldErrors.email ? 'border-destructive' : ''}`}
                  />
                </div>
                {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email}</p>}
              </div>

              <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setFieldErrors({ username: '', email: '', password: '' }); }}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mx-auto"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to Sign In
              </button>
            </form>
          ) : (
            <>
              {/* Google Sign In */}
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full mb-4 gap-2"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
              >
                {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
                Continue with Google
              </Button>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="username"
                        type="text"
                        placeholder="Choose a username"
                        value={username}
                        onChange={(e) => { setUsername(e.target.value); clearFieldError('username'); }}
                        className={`pl-10 bg-secondary border-border ${fieldErrors.username ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {fieldErrors.username && <p className="text-sm text-destructive">{fieldErrors.username}</p>}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
                      className={`pl-10 bg-secondary border-border ${fieldErrors.email ? 'border-destructive' : ''}`}
                    />
                  </div>
                  {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email}</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => { setIsForgotPassword(true); setFieldErrors({ username: '', email: '', password: '' }); }}
                        className="text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
                      className={`pl-10 pr-10 bg-secondary border-border ${fieldErrors.password ? 'border-destructive' : ''}`}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="text-sm text-destructive">{fieldErrors.password}</p>}
                </div>

                <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
                  {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
