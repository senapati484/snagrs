'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QualitySelector } from './QualitySelector';
import type { DownloadResult } from '@/types';

interface ResultCardProps {
  result: DownloadResult;
  onReset: () => void;
}

export function ResultCard({ result, onReset }: ResultCardProps) {
  // Default to first available quality, or 'auto' if none
  const defaultQuality = result.availableQualities?.[0]?.value || 'auto';
  const [selectedQuality, setSelectedQuality] = useState(defaultQuality);

  const handleDownload = () => {
    let downloadHref: string;

    if (result.useStream && result.sourceUrl) {
      // Use streaming endpoint (YouTube) — streams directly via youtubei.js
      const streamUrl = new URL('/api/stream', window.location.origin);
      streamUrl.searchParams.set('url', result.sourceUrl);
      streamUrl.searchParams.set('filename', result.filename);
      streamUrl.searchParams.set('format', result.format);
      streamUrl.searchParams.set('quality', selectedQuality);
      downloadHref = streamUrl.toString();
    } else {
      // Use proxy endpoint (other platforms)
      const proxyUrl = new URL('/api/proxy', window.location.origin);
      proxyUrl.searchParams.set('url', result.downloadUrl);
      proxyUrl.searchParams.set('filename', result.filename);
      proxyUrl.searchParams.set('format', result.format);
      proxyUrl.searchParams.set('quality', selectedQuality);
      downloadHref = proxyUrl.toString();
    }

    const link = document.createElement('a');
    link.href = downloadHref;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="w-full bg-surface border border-border rounded-xl p-6 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
      </motion.div>

      <h2 className="text-2xl font-display font-bold text-white mb-2">
        Ready to Download
      </h2>

      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="inline-block text-xs font-medium px-3 py-1 rounded-full bg-brand text-white">
          {result.format.toUpperCase()}
        </span>
        {result.quality && (
          <span className="text-xs text-muted-foreground">
            {result.quality}
          </span>
        )}
      </div>

      {result.availableQualities && result.availableQualities.length > 1 && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">Select Quality:</p>
          <QualitySelector
            qualities={result.availableQualities}
            selected={selectedQuality}
            onChange={setSelectedQuality}
          />
        </div>
      )}

      <button
        onClick={handleDownload}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-4 px-6 bg-brand text-white font-display font-bold rounded-lg shadow-[0_0_20px_rgba(255,59,92,0.3)] hover:brightness-110 hover:scale-[1.01] transition-all duration-200'
        )}
      >
        <Download className="w-5 h-5" />
        Download{selectedQuality !== 'auto' && selectedQuality !== 'best' ? ` (${selectedQuality})` : ''}
      </button>

      <button
        onClick={onReset}
        className="block w-full mt-4 text-sm text-muted-foreground hover:text-brand transition-colors"
      >
        ↩ Download another
      </button>
    </motion.div>
  );
}
