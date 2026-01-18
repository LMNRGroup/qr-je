import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicUrlDetails } from '@/lib/api';
import { Loader2, ChevronLeft, ChevronRight, File } from 'lucide-react';

type FileOptions = {
  fileDataUrl?: string;
  fileName?: string;
};

const FileViewer = () => {
  const { id, random } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [fileDataUrl, setFileDataUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!id || !random) {
      setError('Missing file information.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getPublicUrlDetails(id, random)
      .then((data) => {
        const options = (data.options ?? {}) as FileOptions;
        const dataUrl = options.fileDataUrl ?? '';
        if (!dataUrl) {
          setError('File data not available yet.');
          return;
        }
        setFileDataUrl(dataUrl);
        setFileName(options.fileName ?? 'File');
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load file.';
        setError(message);
      })
      .finally(() => setIsLoading(false));
  }, [id, random]);

  const isPdf = useMemo(() => fileDataUrl.startsWith('data:application/pdf'), [fileDataUrl]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-muted-foreground gap-3">
        <File className="h-10 w-10 text-primary" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col gap-2 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">File QR</p>
          <h1 className="text-2xl font-semibold">{fileName}</h1>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
          {isPdf ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted-foreground">
                <span>PDF Preview</span>
                <span>Page {page}</span>
              </div>
              <div className="aspect-[4/5] w-full overflow-hidden rounded-xl border border-border/60 bg-black/5">
                <embed src={`${fileDataUrl}#page=${page}`} type="application/pdf" className="h-full w-full" />
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  className="rounded-full border border-border/60 px-3 py-1 text-xs uppercase tracking-[0.3em]"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-full border border-border/60 px-3 py-1 text-xs uppercase tracking-[0.3em]"
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <img src={fileDataUrl} alt={fileName} className="w-full rounded-xl object-contain" />
          )}
        </div>
      </div>
    </div>
  );
};

export default FileViewer;
