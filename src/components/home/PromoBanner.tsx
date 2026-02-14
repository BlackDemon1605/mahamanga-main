import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Megaphone } from 'lucide-react';
import { SectionHeader } from '@/components/comics/SectionHeader';

export function PromoBanner() {
  const { data: banners = [] } = useQuery({
    queryKey: ['promo-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotion_banners')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  if (banners.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Megaphone className="w-5 h-5 text-primary emoji-glow" />
        <h2 className="text-lg font-bold text-shine">Promotions</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
        {banners.map((banner) => (
          <div
            key={banner.id}
            className="group relative rounded-xl overflow-hidden cursor-pointer aspect-[3/4] bg-card shadow-card hover:shadow-glow transition-shadow duration-300"
            onClick={() =>
              banner.destination_url &&
              window.open(banner.destination_url, '_blank')
            }
          >
            <img
              src={banner.image_url}
              alt={banner.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 z-10">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                Sponsored
              </span>
              <h3 className="text-xs md:text-sm font-bold text-shine line-clamp-2">
                {banner.title}
              </h3>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
