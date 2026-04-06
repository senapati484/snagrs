'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Download, Trash2 } from 'lucide-react';
import { useDownloadStore } from '@/store/downloadStore';
import type { Platform } from '@/types';

const platformColors: Record<Platform, string> = {
  youtube: '#FF0000',
  instagram: '#E1306C',
  tiktok: '#69C9D0',
  twitter: '#1D9BF0',
  reddit: '#FF4500',
  unknown: '#666666',
};

export function HistoryPanel() {
  const { history, clearHistory } = useDownloadStore();
  const [isExpanded, setIsExpanded] = useState(false);

  if (history.length === 0) {
    return null;
  }

  const truncatedHistory = history.slice(0, 5);

  const handleDownload = (downloadUrl: string) => {
    window.open(downloadUrl, '_blank');
  };

  const truncateUrl = (url: string, maxLength: number = 40) => {
    if (url.length <= maxLength) return url;
    return url.slice(0, maxLength) + '...';
  };

  return (
    <div className="w-full max-w-lg mx-auto mt-8">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
      >
        <span>Recent Downloads ({history.length})</span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 bg-surface border border-border rounded-xl p-4 space-y-3 overflow-hidden"
          >
            {truncatedHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 text-sm"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: platformColors[item.platform] }}
                />
                <span className="flex-1 text-muted-foreground truncate">
                  {truncateUrl(item.url)}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand shrink-0">
                  {item.format.toUpperCase()}
                </span>
                <button
                  onClick={() => handleDownload(item.downloadUrl)}
                  className="p-1 hover:bg-muted rounded transition-colors shrink-0"
                >
                  <Download className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            ))}

            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="flex items-center gap-1 text-xs text-[#555555] hover:text-brand transition-colors mt-2"
              >
                <Trash2 className="w-3 h-3" />
                Clear history
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
