import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

type DebugEntry = {
  message: string;
  detail?: string;
  time: string;
};

export function DebugOverlay() {
  const [errors, setErrors] = useState<DebugEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const latest = useMemo(() => errors[0], [errors]);

  useEffect(() => {
    const addError = (entry: DebugEntry) => {
      setErrors((prev) => [entry, ...prev].slice(0, 20));
      setIsOpen(true);
    };

    const handleWindowError = (event: ErrorEvent) => {
      addError({
        message: event.message || 'Unhandled error',
        detail: event.error?.stack,
        time: new Date().toLocaleTimeString(),
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
      addError({
        message: reason || 'Unhandled rejection',
        detail: event.reason?.stack || undefined,
        time: new Date().toLocaleTimeString(),
      });
    };

    const handleApiError = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; detail?: string }>).detail;
      addError({
        message: detail?.message || 'API error',
        detail: detail?.detail,
        time: new Date().toLocaleTimeString(),
      });
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleRejection);
    window.addEventListener('qrc:api-error', handleApiError as EventListener);
    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('qrc:api-error', handleApiError as EventListener);
    };
  }, []);

  if (!latest) return null;

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 left-4 z-[100]">
        <button
          type="button"
          className="rounded-full border border-border/60 bg-card/90 px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground shadow-lg backdrop-blur hover:text-foreground"
          onClick={() => setIsOpen(true)}
        >
          DEBUG: {latest.message}
          <ChevronUp className="ml-2 inline-block h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-[100] w-[320px] max-w-[90vw] rounded-2xl border border-border/60 bg-card/95 p-4 text-xs text-foreground shadow-xl backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Debug</p>
          <button
            type="button"
            className={`mt-1 w-full text-left rounded-lg transition ${
              isCopied ? 'bg-emerald-500/10 ring-1 ring-emerald-400/40' : 'hover:bg-secondary/40'
            }`}
            onClick={async () => {
              const payload = [latest.message, latest.detail].filter(Boolean).join('\n');
              try {
                await navigator.clipboard.writeText(payload);
                setIsCopied(true);
                window.setTimeout(() => setIsCopied(false), 900);
              } catch {
                // ignore clipboard errors
              }
            }}
          >
            <p className="font-semibold">{latest.message}</p>
            {latest.detail && (
              <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-[10px] text-muted-foreground">
                {latest.detail}
              </pre>
            )}
            <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {isCopied ? 'Copied' : 'Tap to copy'}
            </p>
          </button>
        </div>
        <button
          type="button"
          className="rounded-full border border-border/60 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
          onClick={() => setIsOpen(false)}
          aria-label="Hide debug overlay"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
      {isOpen && errors.length > 1 && (
        <div className="mt-3 border-t border-border/40 pt-3 text-[10px] text-muted-foreground">
          <p className="uppercase tracking-[0.3em]">Recent</p>
          <ul className="mt-2 space-y-1">
            {errors.slice(1, 6).map((entry, index) => (
              <li key={`${entry.time}-${index}`} className="truncate">
                {entry.time} · {entry.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
