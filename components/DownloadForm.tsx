'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import { useDownloadStore } from '@/store/downloadStore';
import { UrlInput } from '@/components/ui/UrlInput';
import { FormatSelector } from '@/components/ui/FormatSelector';
import { LoadingState } from '@/components/ui/LoadingState';
import { ResultCard } from '@/components/ui/ResultCard';
import { detectPlatform, getPlatformLabel, isValidUrl } from '@/lib/utils';
import type { DownloadFormat } from '@/types';

export function DownloadForm() {
  const {
    url,
    format,
    status,
    result,
    error,
    setUrl,
    setFormat,
    startDownload,
    reset,
  } = useDownloadStore();

  const platformLabel = url ? getPlatformLabel(detectPlatform(url)) : '';
  const isValid = url ? isValidUrl(url) : false;
  const isLoading = status === 'loading';

  const onSubmit = async () => {
    await startDownload();
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <AnimatePresence mode="wait">
        {status === 'idle' || status === 'error' || status === 'success' ? (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <UrlInput
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              platformLabel={platformLabel}
              onClear={() => setUrl('')}
              placeholder="Paste a video URL..."
              disabled={isLoading}
            />

            <div className="flex justify-between items-center gap-4">
              <FormatSelector
                format={format}
                onChange={(newFormat: DownloadFormat) => setFormat(newFormat)}
              />

              <button
                onClick={onSubmit}
                disabled={!url || !isValid || isLoading}
                className="flex-1 flex items-center justify-center gap-2 py-4 px-6 bg-brand text-white font-display font-bold tracking-wide rounded-lg hover:brightness-110 hover:scale-[1.01] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>Snag It →</>
                )}
              </button>
            </div>

            {status === 'error' && error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-red-500 text-sm"
              >
                <AlertCircle className="w-4 h-4" />
                {error.message}
              </motion.div>
            )}
          </motion.div>
        ) : null}

        {status === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoadingState format={format} />
          </motion.div>
        )}

        {status === 'success' && result && (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ResultCard result={result} onReset={reset} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
