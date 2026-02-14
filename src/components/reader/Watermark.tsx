import { memo, useEffect, useState, useCallback } from 'react';

/**
 * Watermark overlay for comic pages.
 * Repeats "MAHA MANGA" every ~6cm (≈227px at 96dpi) vertically,
 * with 2 watermarks per row for coverage.
 * Dynamically adjusts to container height via ResizeObserver.
 */
export const Watermark = memo(function Watermark() {
  const INTERVAL_PX = 227; // ~6cm at 96dpi
  const [rows, setRows] = useState(4);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  const refCallback = useCallback((node: HTMLDivElement | null) => {
    setContainerRef(node);
  }, []);

  useEffect(() => {
    if (!containerRef) return;

    const update = () => {
      const h = containerRef.parentElement?.offsetHeight || containerRef.offsetHeight;
      setRows(Math.max(2, Math.ceil(h / INTERVAL_PX)));
    };

    update();

    const ro = new ResizeObserver(update);
    if (containerRef.parentElement) {
      ro.observe(containerRef.parentElement);
    }
    return () => ro.disconnect();
  }, [containerRef]);

  // Build watermark positions: 2 per row, staggered
  const items: { top: number; left: string; rotation: number }[] = [];
  for (let i = 0; i < rows; i++) {
    const topPx = i * INTERVAL_PX + INTERVAL_PX / 2;
    items.push({ top: topPx, left: '25%', rotation: -30 });
    items.push({ top: topPx, left: '72%', rotation: -25 });
  }

  return (
    <div
      ref={refCallback}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 10,
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
      aria-hidden="true"
    >
      {items.map((pos, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            top: `${pos.top}px`,
            left: pos.left,
            transform: `translate(-50%, -50%) rotate(${pos.rotation}deg)`,
            color: 'rgba(128, 128, 128, 0.22)',
            fontSize: '22px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            letterSpacing: '4px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            lineHeight: 1,
          }}
        >
          MAHA MANGA
        </span>
      ))}
    </div>
  );
});
