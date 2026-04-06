'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Download } from 'lucide-react';
import type { DownloadResult } from '@/types';

interface ResultCardProps {
  result: DownloadResult;
  onReset: () => void;
}

export function ResultCard({ result, onReset }: ResultCardProps) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = result.downloadUrl;
    link.target = '_blank';
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

      <span className="inline-block text-xs font-medium px-3 py-1 rounded-full bg-brand text-white mb-6">
        {result.format.toUpperCase()}
      </span>

      <button
        onClick={handleDownload}
        className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-brand text-white font-display font-bold rounded-lg shadow-[0_0_20px_rgba(255,59,92,0.3)] hover:brightness-110 hover:scale-[1.01] transition-all duration-200"
      >
        <Download className="w-5 h-5" />
        Download
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
