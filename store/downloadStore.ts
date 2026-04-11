import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DownloadFormat,
  DownloadStatus,
  DownloadResult,
  SnagError,
  HistoryItem,
} from '@/types';
import { generateId } from '@/lib/utils';

interface DownloadStore {
  url: string;
  format: DownloadFormat;
  quality: string;
  status: DownloadStatus;
  result: DownloadResult | null;
  error: SnagError | null;
  history: HistoryItem[];
  setUrl: (url: string) => void;
  setFormat: (format: DownloadFormat) => void;
  setQuality: (quality: string) => void;
  reset: () => void;
  clearHistory: () => void;
  startDownload: () => Promise<void>;
}

export const useDownloadStore = create<DownloadStore>()(
  persist(
    (set, get) => ({
      url: '',
      format: 'mp4' as DownloadFormat,
      quality: 'best',
      status: 'idle' as DownloadStatus,
      result: null,
      error: null,
      history: [],

      setUrl: (url: string) => set({ url }),

      setFormat: (format: DownloadFormat) => set({ format }),

      setQuality: (quality: string) => set({ quality }),

      reset: () =>
        set({
          status: 'idle',
          result: null,
          error: null,
        }),

      clearHistory: () => set({ history: [] }),

      startDownload: async () => {
        const { url, format, quality } = get();

        set({ status: 'loading', error: null, result: null });

        try {
          const response = await fetch('/api/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, format, quality }),
          });

          const data = await response.json();

          if (!response.ok) {
            set({
              status: 'error',
              error: { message: data.error || 'Something went wrong' },
            });
            return;
          }

          const result: DownloadResult = data;
          
          set({
            status: 'success',
            result,
            history: [
              {
                id: generateId(),
                url,
                format,
                platform: result.platform,
                filename: result.filename,
                downloadUrl: result.downloadUrl,
                timestamp: Date.now(),
              },
              ...get().history.slice(0, 9),
            ],
          });
        } catch (error) {
          set({
            status: 'error',
            error: {
              message:
                error instanceof Error ? error.message : 'Something went wrong',
            },
          });
        }
      },
    }),
    {
      name: 'snagr-store',
      partialize: (state) => ({
        format: state.format,
        quality: state.quality,
        history: state.history,
      }),
    }
  )
);
