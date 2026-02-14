import { MainLayout } from '@/components/layout/MainLayout';
import { CommunityFeed } from '@/components/community/CommunityFeed';
import { Users } from 'lucide-react';

export default function Community() {
  return (
    <MainLayout>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-5 h-5 text-primary emoji-glow" />
          <h1 className="text-xl font-bold text-shine">Community</h1>
        </div>
        <CommunityFeed />
      </div>
    </MainLayout>
  );
}
