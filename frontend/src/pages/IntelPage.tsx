import { MapDots } from '@/components/MapDots';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronDown } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { ScanAreaSummary } from '@/lib/api';

interface IntelPageProps {
  isMobileV2: boolean;
  isMobile: boolean;
  setShowNavOverlay: (show: boolean) => void;
  handleExportCsv: (range: 'day' | 'week' | 'month') => void;
  intelRange: 'all' | 'today' | '7d' | '30d';
  setIntelRange: (range: 'all' | 'today' | '7d' | '30d') => void;
  intelSummary: {
    total: number;
    today: number;
    rangeTotal: number;
    avgResponseMs: number | null;
  };
  intelLoading: boolean;
  intelTrends: Array<{ date: string; count: number }>;
  scanAreas: ScanAreaSummary[];
  radarLabel: string;
  arsenalStats: { total: number; dynamic: number };
  setActiveTab: (tab: 'studio' | 'codes' | 'analytics' | 'settings' | 'upgrade' | 'adaptive') => void;
  userProfile: { timezone?: string | null } | null;
  profileForm: { timezone: string };
}

const intelRangeLabels: Record<'all' | 'today' | '7d' | '30d', string> = {
  all: 'All time',
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
};

export function IntelPage({
  isMobileV2,
  isMobile,
  setShowNavOverlay,
  handleExportCsv,
  intelRange,
  setIntelRange,
  intelSummary,
  intelLoading,
  intelTrends,
  scanAreas,
  radarLabel,
  arsenalStats,
  setActiveTab,
  userProfile,
  profileForm,
}: IntelPageProps) {
  const [isSignalsMenuOpen, setIsSignalsMenuOpen] = useState(false);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const signalsCardRef = useRef<HTMLDivElement>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);

  const trendTimeZone =
    userProfile?.timezone || profileForm.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const trendPoints = useMemo(() => {
    // Check if we're showing hourly data (for today)
    const isHourly = (intelTrends as any)?.hourly === true || (intelTrends.length > 0 && intelRange === 'today');
    
    if (isHourly && intelRange === 'today') {
      // Handle hourly data for today
      const hourFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: trendTimeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hour12: false,
      });
      const map = new Map<string, number>();
      intelTrends.forEach((point) => {
        if (!point.date) return;
        const key = hourFormatter.format(new Date(point.date));
        map.set(key, point.count ?? 0);
      });
      
      // Generate 24 hours for today
      const today = new Date();
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      
      // Helper to format hour as simple number (12, 1, 2, ... 11)
      const formatHourLabel = (date: Date): string => {
        const hour = date.getHours();
        // Convert 24-hour to 12-hour format: 0->12, 1-11->1-11, 12->12, 13-23->1-11
        const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return hour12.toString();
      };
      
      return Array.from({ length: 24 }, (_, index) => {
        const date = new Date(todayStart);
        date.setHours(date.getHours() + index);
        const key = hourFormatter.format(date);
        return {
          date,
          count: map.get(key) ?? 0,
          label: formatHourLabel(date), // Show just hour number: "12", "1", "2", etc.
        };
      });
    } else {
      // Original day-based grouping
      const keyFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: trendTimeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      // Show actual dates (MM/DD) instead of just weekdays
      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: trendTimeZone,
        month: 'short',
        day: 'numeric',
      });
      const map = new Map<string, number>();
      intelTrends.forEach((point) => {
        if (!point.date) return;
        const key = keyFormatter.format(new Date(point.date));
        map.set(key, point.count ?? 0);
      });
      
      // Determine number of days based on intelRange
      let days = 7; // default
      if (intelRange === 'today') {
        days = 1;
      } else if (intelRange === '7d') {
        days = 7;
      } else if (intelRange === '30d') {
        days = 30;
      } else if (intelRange === 'all') {
        // For "all", show last 30 days as a reasonable default
        days = 30;
      }
      
      const today = new Date();
      return Array.from({ length: days }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (days - 1 - index));
        const key = keyFormatter.format(date);
        return {
          date,
          count: map.get(key) ?? 0,
          label: dateFormatter.format(date), // Show actual date like "Jan 15"
        };
      });
    }
  }, [intelTrends, trendTimeZone, intelRange]);

  const intelMapPanel = (
    <div className="glass-panel rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Intel</p>
          <h3 className="text-lg font-semibold">Command Map</h3>
        </div>
        <span className="text-xs uppercase tracking-[0.3em] text-primary">Live</span>
      </div>

      <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Radar</p>
        <div className="relative h-56 rounded-2xl border border-amber-300/30 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.12),rgba(17,24,39,0.9))] overflow-hidden">
          <img
            src="/map.svg"
            alt="World map outline"
            className="absolute inset-0 h-full w-full object-cover opacity-35"
            loading="lazy"
          />
          {scanAreas.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-md border border-amber-300/40 bg-black/40 px-4 py-2 text-[10px] uppercase tracking-[0.5em] text-amber-200 font-semibold">
                {radarLabel}
              </div>
            </div>
          ) : null}
          <MapDots areas={scanAreas} />
          <div className="absolute inset-6 rounded-full border border-amber-200/30" />
          <div className="absolute inset-12 rounded-full border border-amber-200/20" />
          <div className="absolute inset-20 rounded-full border border-amber-200/10" />
          <div className="absolute left-1/2 top-1/2 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300/10" />
          <div className="absolute inset-0 radar-sweep" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('codes')}
          className="rounded-xl border border-border/60 bg-secondary/30 p-3 sm:p-4 text-center transition hover:border-primary/60 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Active Nodes</p>
          <p className="text-lg sm:text-2xl font-semibold mt-2">{arsenalStats.total.toLocaleString()}</p>
        </button>
        <div
          ref={signalsCardRef}
          onClick={() => setIsSignalsMenuOpen((prev) => !prev)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setIsSignalsMenuOpen((prev) => !prev);
            }
          }}
          className="relative rounded-xl border border-border/60 bg-secondary/30 p-3 sm:p-4 text-center transition hover:border-primary/60 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <div className="flex items-center justify-center">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Signals</p>
          </div>
          <p className="text-lg sm:text-2xl font-semibold mt-2">
            {intelLoading ? '...' : intelSummary.rangeTotal.toLocaleString()}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            {intelRangeLabels[intelRange]}
          </p>
          {isSignalsMenuOpen && (
            <div className="absolute left-1/2 top-full z-20 mt-2 w-40 -translate-x-1/2 rounded-xl border border-border/80 bg-card/95 p-2 text-left shadow-lg">
              {(['today', '7d', '30d', 'all'] as const).map((range) => (
                <div
                  key={range}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setIntelRange(range);
                    setIsSignalsMenuOpen(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setIntelRange(range);
                      setIsSignalsMenuOpen(false);
                    }
                  }}
                  className="w-full rounded-lg px-2 py-1 text-xs uppercase tracking-[0.25em] text-muted-foreground transition hover:bg-secondary/50 hover:text-foreground"
                >
                  {intelRangeLabels[range]}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 sm:p-4 text-center flex flex-col items-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Response Time</p>
          <p className="text-lg sm:text-2xl font-semibold mt-2">
            {intelLoading
              ? '...'
              : Number.isFinite(intelSummary.avgResponseMs) && intelSummary.avgResponseMs !== null
                ? intelSummary.avgResponseMs < 1000
                  ? `${Math.round(intelSummary.avgResponseMs)}ms`
                  : `${(intelSummary.avgResponseMs / 1000).toFixed(2)}s`
                : 'N/A'}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 bg-secondary/30 p-4 sm:col-span-2 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">Signal Trends</p>
          <div 
            ref={graphContainerRef}
            className="relative w-full" 
            style={{ height: '200px' }}
            onMouseLeave={() => !isMobile && setHoveredPointIndex(null)}
          >
            {trendPoints.length > 0 ? (() => {
              // Calculate chart dimensions
              const max = Math.max(1, ...trendPoints.map((p) => p.count ?? 0));
              const points = trendPoints.length;
              const svgWidth = Math.max(400, points * 20);
              const svgHeight = 180;
              const padding = 20;
              const chartWidth = svgWidth - padding * 2;
              const chartHeight = svgHeight - padding * 2;
              const gridLines = 4;
              
              // Calculate label interval based on range
              const labelInterval = intelRange === '30d' || intelRange === 'all' 
                ? Math.max(1, Math.floor(points / 6))
                : intelRange === '7d'
                ? Math.max(1, Math.floor(points / 4))
                : 1;
              
              // Generate path data for line and area
              const getPointCoords = (index: number, count: number) => {
                const x = padding + (chartWidth / Math.max(1, points - 1)) * index;
                const y = padding + chartHeight - ((count / max) * chartHeight);
                return { x, y };
              };
              
              // Format full time label for tooltip (desktop only)
              const formatFullTimeLabel = (point: { date: Date; label: string; count: number }) => {
                if (intelRange === 'today') {
                  // For hourly data, show full time like "12:00 AM"
                  const timeFormatter = new Intl.DateTimeFormat('en-US', {
                    timeZone: trendTimeZone,
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  });
                  return timeFormatter.format(point.date);
                } else {
                  // For day-based data, show date and count
                  const dateFormatter = new Intl.DateTimeFormat('en-US', {
                    timeZone: trendTimeZone,
                    month: 'short',
                    day: 'numeric',
                    year: intelRange === 'all' ? 'numeric' : undefined,
                  });
                  return `${dateFormatter.format(point.date)}: ${point.count} scans`;
                }
              };
              
              const linePath = trendPoints.map((point, index) => {
                const { x, y } = getPointCoords(index, point.count ?? 0);
                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ');
              
              const areaPath = `${linePath} L ${padding + chartWidth} ${padding + chartHeight} L ${padding} ${padding + chartHeight} Z`;
              
              // Get hovered point coordinates for tooltip positioning (desktop only)
              const hoveredPoint = !isMobile && hoveredPointIndex !== null ? trendPoints[hoveredPointIndex] : null;
              const hoveredCoords = hoveredPoint && hoveredPointIndex !== null
                ? getPointCoords(hoveredPointIndex, hoveredPoint.count ?? 0)
                : null;
              
              return (
                <>
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full h-full"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <defs>
                      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgb(251, 191, 36)" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="rgb(251, 191, 36)" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    
                    {/* Grid lines */}
                    {Array.from({ length: gridLines + 1 }).map((_, i) => {
                      const y = padding + (chartHeight / gridLines) * i;
                      const value = max - (max / gridLines) * i;
                      return (
                        <g key={`grid-${i}`}>
                          <line
                            x1={padding}
                            y1={y}
                            x2={svgWidth - padding}
                            y2={y}
                            stroke="currentColor"
                            strokeOpacity="0.1"
                            strokeWidth="1"
                          />
                          {i < gridLines && (
                            <text
                              x={padding - 8}
                              y={y + 4}
                              fontSize="10"
                              fill="currentColor"
                              fillOpacity="0.4"
                              textAnchor="end"
                              className="font-mono"
                            >
                              {Math.round(value)}
                            </text>
                          )}
                        </g>
                      );
                    })}
                    
                    {/* Area fill */}
                    {max > 0 && (
                      <path
                        d={areaPath}
                        fill="url(#lineGradient)"
                        stroke="none"
                      />
                    )}
                    
                    {/* Line */}
                    {max > 0 && points > 0 && (
                      <path
                        d={linePath}
                        fill="none"
                        stroke="rgb(251, 191, 36)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="drop-shadow-sm"
                      />
                    )}
                    
                    {/* Data points */}
                    {max > 0 && trendPoints.map((point, index) => {
                      const { x, y } = getPointCoords(index, point.count ?? 0);
                      const isHovered = !isMobile && hoveredPointIndex === index;
                      const radius = isHovered ? 8 : 4;
                      
                      return (
                        <g 
                          key={`point-${index}`}
                          onMouseEnter={() => !isMobile && setHoveredPointIndex(index)}
                          onMouseLeave={() => !isMobile && setHoveredPointIndex(null)}
                          className={!isMobile ? "cursor-pointer" : ""}
                        >
                          {/* Larger transparent circle for easier hover target (desktop only) */}
                          {!isMobile && (
                            <circle
                              cx={x}
                              cy={y}
                              r="12"
                              fill="transparent"
                              className="pointer-events-auto"
                            />
                          )}
                          <circle
                            cx={x}
                            cy={y}
                            r={radius}
                            fill="rgb(251, 191, 36)"
                            stroke="hsl(var(--background))"
                            strokeWidth={isHovered ? "3" : "2"}
                            className={!isMobile ? "transition-all duration-200" : ""}
                            style={!isMobile ? { 
                              filter: isHovered ? 'drop-shadow(0 0 8px rgb(251, 191, 36))' : 'none',
                              transform: isHovered ? 'scale(1.2)' : 'scale(1)',
                            } : {}}
                          />
                          <title>{`${point.label}: ${point.count} scans`}</title>
                        </g>
                      );
                    })}
                    
                    {/* X-axis labels */}
                    {trendPoints.map((point, index) => {
                      if (index % labelInterval !== 0 && index !== points - 1) return null;
                      const { x } = getPointCoords(index, 0);
                      return (
                        <text
                          key={`label-${index}`}
                          x={x}
                          y={svgHeight - 5}
                          fontSize="10"
                          fill="currentColor"
                          fillOpacity="0.5"
                          textAnchor="middle"
                          className="uppercase tracking-wider"
                        >
                          {point.label}
                        </text>
                      );
                    })}
                  </svg>
                  
                  {/* Tooltip for hovered point (desktop only) */}
                  {!isMobile && hoveredPoint && hoveredCoords && graphContainerRef.current && (
                    <div
                      className="absolute pointer-events-none z-50 rounded-lg border border-amber-500/30 bg-card/95 backdrop-blur-sm px-3 py-2 shadow-lg"
                      style={{
                        left: `${(hoveredCoords.x / svgWidth) * 100}%`,
                        top: `${(hoveredCoords.y / svgHeight) * 100}%`,
                        transform: 'translate(-50%, -120%)',
                      }}
                    >
                      <p className="text-xs font-semibold text-amber-300 whitespace-nowrap">
                        {formatFullTimeLabel(hoveredPoint)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {hoveredPoint.count} {hoveredPoint.count === 1 ? 'scan' : 'scans'}
                      </p>
                    </div>
                  )}
                </>
              );
            })() : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No scan data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const intelSnapshotPanel = (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Mission Snapshot</p>
        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Signal Strength</span>
            <span className="text-primary">92%</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Scan Velocity</span>
            <span className="text-primary">+18%</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Adaptive Nodes</span>
            <span className="text-primary">4</span>
          </div>
        </div>
      </div>
      <div className="glass-panel rounded-2xl p-6 hidden lg:block">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Top Regions</p>
        <div className="mt-3 space-y-2 text-sm">
          {(() => {
            // Calculate top regions from scanAreas
            if (scanAreas.length === 0) {
              return (
                <div className="text-xs text-muted-foreground py-2">No scan data available.</div>
              );
            }

            // Calculate total scans across all areas
            const totalScans = scanAreas.reduce((sum, area) => sum + area.count, 0);
            
            if (totalScans === 0) {
              return (
                <div className="text-xs text-muted-foreground py-2">No scans recorded.</div>
              );
            }

            // Sort areas by count (descending) and take top 3
            const topRegions = [...scanAreas]
              .sort((a, b) => b.count - a.count)
              .slice(0, 3)
              .map((area) => ({
                label: area.label,
                count: area.count,
                percentage: Math.round((area.count / totalScans) * 100)
              }));

            if (topRegions.length === 0) {
              return (
                <div className="text-xs text-muted-foreground py-2">No regions to display.</div>
              );
            }

            return topRegions.map((region, index) => (
              <div key={`${region.label}-${index}`} className="flex items-center justify-between">
                <span className="truncate pr-2">{region.label}</span>
                <span className="text-primary font-semibold flex-shrink-0">{region.percentage}%</span>
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );

  return (
    <section id="intel" className={`space-y-6 ${isMobileV2 ? 'qrc-v2-section' : ''}`}>
      {isMobileV2 ? (
        <div className="space-y-4">
          {/* Clickable Header - OUTSIDE and ON TOP of container */}
          <div className="mb-0 pb-3">
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground mb-1">Intel</p>
            <h2 
              className="text-lg font-semibold cursor-pointer hover:text-primary/80 transition-colors"
              onClick={() => setShowNavOverlay(true)}
            >
              Live Intelligence
            </h2>
          </div>
          
          <div className="glass-panel rounded-2xl p-4 flex flex-col overflow-hidden">
            <ScrollArea className="qrc-arsenal-scroll qrc-no-scroll-x max-w-full w-full">
              <div className="flex flex-col min-h-0 space-y-6">
                {/* Export CSV - inside scrollable */}
                <div className="relative">
                  <select
                    defaultValue=""
                    onChange={(event) => {
                      const value = event.target.value as 'day' | 'week' | 'month' | '';
                      if (!value) return;
                      handleExportCsv(value);
                      event.target.value = '';
                    }}
                    className="appearance-none rounded-xl border border-border bg-secondary/30 px-3 py-2 text-xs uppercase tracking-[0.3em] text-foreground pr-7 hover:bg-secondary/40 w-full"
                  >
                    <option value="" disabled>Export CSV</option>
                    <option value="day">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                </div>

                {/* Tabs for Map/Snapshot */}
                <Tabs defaultValue="map">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="map">Map</TabsTrigger>
                    <TabsTrigger value="snapshot">Snapshot</TabsTrigger>
                  </TabsList>
                  <TabsContent value="map" className="mt-4">{intelMapPanel}</TabsContent>
                  <TabsContent value="snapshot" className="mt-4">{intelSnapshotPanel}</TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-2 sm:flex-nowrap sm:items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Intel</p>
                <h2 
                  className="text-2xl sm:text-3xl font-semibold tracking-tight cursor-pointer hover:text-primary/80 transition-colors"
                  onClick={() => setShowNavOverlay(true)}
                >
                  Live Intelligence
                </h2>
              </div>
              <div className="relative ml-auto">
                <select
                  defaultValue=""
                  onChange={(event) => {
                    const value = event.target.value as 'day' | 'week' | 'month' | '';
                    if (!value) return;
                    handleExportCsv(value);
                    event.target.value = '';
                  }}
                  className="appearance-none rounded-xl border border-border bg-secondary/30 px-3 py-2 text-xs uppercase tracking-[0.3em] text-foreground pr-7 hover:bg-secondary/40"
                >
                  <option value="" disabled>Export CSV</option>
                  <option value="day">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
              {intelMapPanel}
              {intelSnapshotPanel}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
