import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LogoUploadProps {
  logo?: string;
  onLogoChange: (logo: string | undefined) => void;
}

export function LogoUpload({ logo, onLogoChange }: LogoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        onLogoChange(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    [onLogoChange]
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
                accept="image/*"
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
