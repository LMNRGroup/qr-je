import { useMemo, useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import type { ScanAreaSummary } from '@/lib/api';

const MAP_WIDTH = 1200;
const MAP_HEIGHT = 600;

type DotPoint = {
  area: ScanAreaSummary;
  x: number;
  y: number;
};

const projectLatLon = (lat: number, lon: number) => {
  // Improved projection for better accuracy
  const x = ((lon + 180) / 360) * MAP_WIDTH;
  const y = ((90 - lat) / 180) * MAP_HEIGHT;
  return { x, y };
};

const formatScanLocation = (scan: ScanAreaSummary['recentScans'][number]): string => {
  // Format: "Scan from [City], [Region/Country]"
  const parts: string[] = [];
  
  if (scan.city) {
    parts.push(scan.city);
  }
  
  // For PR, prefer region over countryCode
  if (scan.region && (scan.region.toUpperCase() === 'PR' || scan.region.toUpperCase() === 'PUERTO RICO')) {
    parts.push('PR');
  } else if (scan.region) {
    parts.push(scan.region);
  } else if (scan.countryCode) {
    parts.push(scan.countryCode);
  }
  
  if (parts.length === 0) {
    return 'Unknown location';
  }
  
  return `Scan from ${parts.join(', ')}`;
};

export function MapDots({ areas }: { areas: ScanAreaSummary[] }) {
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const dots = useMemo<DotPoint[]>(() => {
    return areas
      .filter((area) => typeof area.lat === 'number' && typeof area.lon === 'number')
      .map((area) => {
        const { x, y } = projectLatLon(area.lat as number, area.lon as number);
        return { area, x, y };
      });
  }, [areas]);

  const activeArea = activeAreaId
    ? areas.find((area) => area.areaId === activeAreaId)
    : null;

  // Close overlay when clicking outside
  useEffect(() => {
    if (!activeArea) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
        // Check if click was on a dot
        const target = event.target as HTMLElement;
        if (target.tagName === 'circle' || target.closest('circle')) {
          return; // Don't close if clicking on a dot
        }
        setActiveAreaId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeArea]);

  return (
    <div className="absolute inset-0">
      <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="h-full w-full">
        <g id="dots">
          {dots.map((dot) => (
            <g key={dot.area.areaId}>
              {/* Outer glow for better visibility */}
              <circle
                cx={dot.x}
                cy={dot.y}
                r={8}
                className="fill-amber-300/20 cursor-pointer"
                onClick={() => setActiveAreaId(dot.area.areaId)}
              />
              {/* Main dot */}
              <circle
                cx={dot.x}
                cy={dot.y}
                r={6}
                className="fill-amber-300/90 cursor-pointer hover:fill-amber-300 transition-all"
                onClick={() => setActiveAreaId(dot.area.areaId)}
                style={{ filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.8))' }}
              />
              {/* Inner highlight */}
              <circle
                cx={dot.x}
                cy={dot.y}
                r={3}
                className="fill-amber-200 cursor-pointer"
                onClick={() => setActiveAreaId(dot.area.areaId)}
              />
            </g>
          ))}
        </g>
      </svg>

      {activeArea && (
        <div
          ref={overlayRef}
          className="absolute right-3 top-3 z-10 w-72 rounded-xl border border-amber-500/30 bg-card/95 backdrop-blur-xl p-4 text-xs shadow-2xl"
          style={{ maxHeight: 'calc(100% - 1.5rem)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">Area</p>
              <p className="text-base font-semibold text-foreground">{activeArea.label}</p>
            </div>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-secondary/50"
              onClick={(e) => {
                e.stopPropagation();
                setActiveAreaId(null);
              }}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="mb-4 pb-3 border-b border-border/50">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">Scan Count</p>
            <p className="text-2xl font-bold text-amber-400">{activeArea.count.toLocaleString()}</p>
          </div>

          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-2">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2 sticky top-0 bg-card/95 py-1">
              Recent Scans
            </p>
            {activeArea.recentScans.length > 0 ? (
              activeArea.recentScans.slice(0, 20).map((scan, index) => {
                const location = formatScanLocation(scan);
                const time = new Date(scan.timestamp).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                });
                return (
                  <div
                    key={`${scan.timestamp}-${scan.ip}-${index}`}
                    className="rounded-lg border border-border/40 bg-secondary/40 p-2.5 hover:bg-secondary/60 transition-colors"
                  >
                    <div className="text-[11px] font-semibold text-foreground mb-1">
                      {location}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {time}
                    </div>
                    {typeof scan.responseMs === 'number' && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Response: <span className="text-amber-400 font-mono">{scan.responseMs}ms</span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-[10px] text-muted-foreground py-2">No recent scans.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
