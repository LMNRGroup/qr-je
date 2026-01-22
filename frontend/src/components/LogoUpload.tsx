import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface LogoUploadProps {
  logo?: string;
  maxLogoSize: number;
  onLogoChange: (
    logo: string | undefined,
    meta?: { width: number; height: number; aspect: number }
  ) => void;
}

export function LogoUpload({ logo, maxLogoSize, onLogoChange }: LogoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      const allowedTypes = ['image/png', 'image/jpeg'];
      if (!allowedTypes.includes(file.type)) {
        const message = 'Only PNG or JPG logos are supported for QR code readability.';
        setError(message);
        toast.error(message);
        return;
      }
      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (!result) {
          const message = 'Unable to read that file.';
          setError(message);
          toast.error(message);
          return;
        }
        const img = new Image();
        img.onload = () => {
          const aspect = img.width / img.height || 1;
          const maxSide = Math.max(img.width, img.height);
          const scale = Math.min(1, maxLogoSize / maxSide);
          const width = Math.max(1, Math.round(img.width * scale));
          const height = Math.max(1, Math.round(img.height * scale));
          onLogoChange(result, { width, height, aspect });
          setError(null);
        };
        img.src = result;
      };
      reader.onerror = () => {
        const message = 'Unable to read that file.';
        setError(message);
        toast.error(message);
      };
      reader.readAsDataURL(file);
    },
    [maxLogoSize, onLogoChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const removeLogo = useCallback(() => {
    onLogoChange(undefined);
  }, [onLogoChange]);

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">Center Logo</label>
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {logo ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative group"
          >
            <div className="w-full h-24 rounded-lg border border-border bg-secondary/50 flex items-center justify-center overflow-hidden">
              <img
                src={logo}
                alt="Logo"
                className="max-h-20 max-w-full object-contain"
              />
            </div>
            <Button
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={removeLogo}
            >
              <X className="h-3 w-3" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <label
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`
                relative flex flex-col items-center justify-center w-full h-24 
                border-2 border-dashed rounded-lg cursor-pointer
                transition-all duration-200
                ${
                  isDragging
                    ? 'border-primary bg-primary/10 glow-sm'
                    : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                }
              `}
            >
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleInputChange}
                className="sr-only"
              />
              <motion.div
                animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
                className="flex flex-col items-center gap-2"
              >
                {isDragging ? (
                  <Upload className="h-6 w-6 text-primary" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground">
                  {isDragging ? 'Drop image here' : 'Drag & drop or click'}
                </span>
              </motion.div>
            </label>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
