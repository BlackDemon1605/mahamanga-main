import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface SectionHeaderProps {
  title: string;
  viewAllPath?: string;
}

export function SectionHeader({ title, viewAllPath }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold text-shine">{title}</h2>
      {viewAllPath && (
        <Link to={viewAllPath}>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
            View all
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      )}
    </div>
  );
}
