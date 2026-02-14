import * as React from "react";
import { cn } from "@/lib/utils";

interface WavyAvatarProps {
  src?: string | null;
  fallback: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  hasThought?: boolean;
  onClick?: () => void;
}

const sizeMap = {
  sm: 'w-9 h-9',
  md: 'w-12 h-12',
  lg: 'w-20 h-20',
  xl: 'w-24 h-24',
};

const borderSizeMap = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-28 h-28',
};

const textSizeMap = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-2xl',
  xl: 'text-3xl',
};

export function WavyAvatar({ src, fallback, size = 'md', className, hasThought, onClick }: WavyAvatarProps) {
  const uniqueId = React.useId();
  
  return (
    <div 
      className={cn("relative flex-shrink-0 cursor-pointer group", className)} 
      onClick={onClick}
    >
      <div className={cn(
        "relative flex items-center justify-center",
        borderSizeMap[size],
      )}>
        {/* Wavy multi-line border SVG */}
        <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
          <defs>
            <clipPath id={`wavy-clip-${uniqueId}`}>
              <path d="M100,10 C120,8 135,18 148,30 C161,42 172,48 180,65 C188,82 190,95 188,112 C186,129 178,142 168,155 C158,168 145,176 130,182 C115,188 105,190 100,190 C95,190 85,188 70,182 C55,176 42,168 32,155 C22,142 14,129 12,112 C10,95 12,82 20,65 C28,48 39,42 52,30 C65,18 80,8 100,10Z" />
            </clipPath>
          </defs>
          {/* Outer wavy line 1 */}
          <path 
            d="M100,6 C122,4 138,15 152,28 C166,41 178,48 186,67 C194,86 196,100 194,118 C192,136 183,150 172,162 C161,174 147,182 131,188 C115,194 107,196 100,196 C93,196 85,194 69,188 C53,182 39,174 28,162 C17,150 8,136 6,118 C4,100 6,86 14,67 C22,48 34,41 48,28 C62,15 78,4 100,6Z"
            fill="none"
            stroke={hasThought ? "hsl(270, 100%, 50%)" : "hsl(var(--border))"}
            strokeWidth="1.5"
            opacity="0.4"
            className={hasThought ? "animate-pulse-glow" : ""}
          />
          {/* Outer wavy line 2 */}
          <path 
            d="M100,12 C118,10 134,20 146,32 C158,44 168,50 176,66 C184,82 186,96 184,112 C182,128 175,140 165,152 C155,164 143,172 128,178 C113,184 106,186 100,186 C94,186 87,184 72,178 C57,172 45,164 35,152 C25,140 18,128 16,112 C14,96 16,82 24,66 C32,50 42,44 54,32 C66,20 82,10 100,12Z"
            fill="none"
            stroke={hasThought ? "hsl(300, 100%, 60%)" : "hsl(var(--muted-foreground))"}
            strokeWidth="1.8"
            opacity="0.6"
            className={hasThought ? "animate-pulse-glow" : ""}
          />
          {/* Main wavy border */}
          <path 
            d="M100,18 C116,16 130,24 142,34 C154,44 164,52 172,66 C180,80 182,92 180,108 C178,124 172,136 162,148 C152,160 140,168 126,174 C112,180 106,182 100,182 C94,182 88,180 74,174 C60,168 48,160 38,148 C28,136 22,124 20,108 C18,92 20,80 28,66 C36,52 46,44 58,34 C70,24 84,16 100,18Z"
            fill="none"
            stroke={hasThought ? "hsl(270, 100%, 50%)" : "hsl(var(--border))"}
            strokeWidth="2.5"
            className={hasThought ? "animate-pulse-glow" : ""}
          />
        </svg>

        {/* Avatar image */}
        <div className={cn(
          "overflow-hidden relative z-10",
          sizeMap[size],
        )} style={{ borderRadius: '42% 58% 55% 45% / 48% 42% 58% 52%' }}>
          {src ? (
            <img 
              src={src} 
              alt={fallback} 
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className={cn(
              "w-full h-full flex items-center justify-center bg-gradient-primary text-primary-foreground font-bold",
              textSizeMap[size],
            )}>
              {fallback}
            </div>
          )}
        </div>
      </div>

      {/* Thought indicator dot */}
      {hasThought && (
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary animate-pulse-glow border-2 border-background" />
      )}
    </div>
  );
}
