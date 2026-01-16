import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Clock, ExternalLink, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QRHistoryItem, QROptions } from '@/types/qr';
import { getQRHistory, deleteQRFromHistory } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface HistoryPanelProps {
  onSelect: (options: QROptions) => void;
}

export function HistoryPanel({ onSelect }: HistoryPanelProps) {
  const [history, setHistory] = useState<QRHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    const response = await getQRHistory();
    if (response.success) {
      setHistory(response.data);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const response = await deleteQRFromHistory(id);
    if (response.success) {
      setHistory((prev) => prev.filter((item) => item.id !== id));
      toast.success('Removed from history');
    }
  };

  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <History className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Recent</h3>
      </div>

      <ScrollArea className="h-[280px] -mx-2 px-2">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center py-8"
            >
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </motion.div>
          ) : history.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-muted-foreground text-sm py-8"
            >
              No history yet
            </motion.div>
          ) : (
            <div className="space-y-2">
              {history.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-secondary/50 cursor-pointer transition-all"
                  onClick={() => onSelect(item.options)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.content}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(item.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => handleDelete(item.id, e)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <div
                      className="w-4 h-4 rounded-sm border border-border"
                      style={{ backgroundColor: item.options.fgColor }}
                    />
                    <div
                      className="w-4 h-4 rounded-sm border border-border"
                      style={{ backgroundColor: item.options.bgColor }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {item.options.size}px • {item.options.cornerStyle}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}
