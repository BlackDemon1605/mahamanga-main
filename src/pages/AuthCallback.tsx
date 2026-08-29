import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    console.log('[AuthCallback] Mounted, URL:', window.location.href);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthCallback] Auth event:', event, 'Session:', !!session);
      if (event === 'SIGNED_IN' && session) {
        toast.success('Signed in successfully!');
        navigate('/', { replace: true });
      }
    });

    // Also check if session already exists
    supabase.auth.getSession().then(({ data: { session }, error: err }) => {
      console.log('[AuthCallback] getSession:', !!session, 'error:', err?.message);
      if (session) {
        navigate('/', { replace: true });
      } else if (err) {
        setError(true);
        toast.error('Sign-in failed. Please try again.');
        setTimeout(() => navigate('/auth', { replace: true }), 2000);
      }
    });

    // Timeout fallback
    const timeout = setTimeout(() => {
      console.log('[AuthCallback] Timeout reached, redirecting to /auth');
      setError(true);
      toast.error('Sign-in timed out. Please try again.');
      navigate('/auth', { replace: true });
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        {error ? (
          <p className="text-muted-foreground">Redirecting...</p>
        ) : (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Signing you in…</p>
          </>
        )}
      </div>
    </div>
  );
}
