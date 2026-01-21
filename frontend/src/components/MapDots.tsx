import { useMemo, useState } from 'react';
import type { ScanAreaSummary } from '@/lib/api';

const MAP_WIDTH = 1200;
const MAP_HEIGHT = 600;

type DotPoint = {
  area: ScanAreaSummary;
  x: number;
  y: number;
};

const projectLatLon = (lat: number, lon: number) => {
  const x = ((lon + 180) / 360) * MAP_WIDTH;
  const y = ((90 - lat) / 180) * MAP_HEIGHT;
  return { x, y };
};

const formatScanLabel = (scan: ScanAreaSummary['recentScans'][number]) => {
  const locationParts = [scan.city, scan.region, scan.countryCode].filter(Boolean).join(', ');
  const deviceInfo = `${scan.device} · ${scan.browser}`;
  const time = new Date(scan.timestamp).toLocaleString();
  return {
    location: locationParts || 'Unknown location',
    deviceInfo,
    time,
  };
};

export function MapDots({ areas }: { areas: ScanAreaSummary[] }) {
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null);

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

  return (
    <div className="absolute inset-0">
      <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="h-full w-full">
        <g id="dots">
          {dots.map((dot) => (
            <circle
              key={dot.area.areaId}
              cx={dot.x}
              cy={dot.y}
              r={4}
              className="fill-amber-300/90 cursor-pointer"
              onClick={() => setActiveAreaId(dot.area.areaId)}
            />
          ))}
        </g>
      </svg>

      {activeArea ? (
        <div className="absolute right-3 top-3 w-64 rounded-xl border border-border/60 bg-card/90 p-3 text-xs shadow-lg backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Area</p>
              <p className="text-sm font-semibold">{activeArea.label}</p>
            </div>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setActiveAreaId(null)}
            >
              Close
            </button>
          </div>
          <div className="mt-2 text-muted-foreground">
            Total: <span className="text-foreground font-semibold">{activeArea.count}</span>
          </div>
          <div className="mt-3 space-y-2 max-h-40 overflow-auto pr-1">
            {activeArea.recentScans.slice(0, 8).map((scan) => {
              const details = formatScanLabel(scan);
              return (
                <div key={`${scan.timestamp}-${scan.ip}`} className="rounded-lg border border-border/40 bg-secondary/40 p-2">
                  <div className="text-[11px] font-semibold text-foreground">{details.location}</div>
                  <div className="text-[10px] text-muted-foreground">{details.deviceInfo}</div>
                  <div className="text-[10px] text-muted-foreground">{scan.ip ?? 'Masked IP'}</div>
                  <div className="text-[10px] text-muted-foreground">{details.time}</div>
                </div>
              );
            })}
            {activeArea.recentScans.length === 0 ? (
              <div className="text-[10px] text-muted-foreground">No recent scans.</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
