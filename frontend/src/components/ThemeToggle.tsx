import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const getInitialTheme = (storageKey: string) => {
  if (typeof window === 'undefined') return true;
  const stored = window.localStorage.getItem(storageKey);
  if (stored === 'light') return false;
  if (stored === 'dark') return true;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
};

export function ThemeToggle({ storageKey = 'theme' }: { storageKey?: string }) {
  const [isDark, setIsDark] = useState(() => getInitialTheme(storageKey));

  useEffect(() => {
    setIsDark(getInitialTheme(storageKey));
  }, [storageKey]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      window.localStorage.setItem(storageKey, 'dark');
    } else {
      root.classList.remove('dark');
      window.localStorage.setItem(storageKey, 'light');
    }
  }, [isDark, storageKey]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsDark(!isDark)}
      className="relative h-9 w-9 rounded-lg"
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 0 : 180, scale: isDark ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="absolute"
      >
        <Moon className="h-4 w-4" />
      </motion.div>
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? -180 : 0, scale: isDark ? 0 : 1 }}
        transition={{ duration: 0.2 }}
        className="absolute"
      >
        <Sun className="h-4 w-4" />
      </motion.div>
    </Button>
  );
}
