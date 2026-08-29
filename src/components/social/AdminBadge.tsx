import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ShieldCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AdminBadgeProps {
  userId: string; // This is the profile id (not auth user_id)
}

export function AdminBadge({ userId }: AdminBadgeProps) {
  const { data: isAdmin } = useQuery({
    queryKey: ['is-admin-badge', userId],
    queryFn: async () => {
      // First get the auth user_id from profile id
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', userId)
        .maybeSingle();
      if (!profile) return false;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.user_id)
        .eq('role', 'admin')
        .maybeSingle();
      return !!data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  if (!isAdmin) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
      </TooltipTrigger>
      <TooltipContent>
        <p>Administrator</p>
      </TooltipContent>
    </Tooltip>
  );
}
