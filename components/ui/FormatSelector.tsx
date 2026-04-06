'use client';

import { Video, Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DownloadFormat } from '@/types';

interface FormatSelectorProps {
  format: DownloadFormat;
  onChange: (format: DownloadFormat) => void;
}

export function FormatSelector({ format, onChange }: FormatSelectorProps) {
  return (
    <div className="flex gap-2 p-1 bg-muted rounded-lg">
      <button
        type="button"
        onClick={() => onChange('mp4')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
          format === 'mp4'
            ? 'bg-brand text-white'
            : 'bg-transparent text-muted-foreground hover:text-white'
        )}
      >
        <Video className="w-4 h-4" />
        MP4
      </button>
      <button
        type="button"
        onClick={() => onChange('mp3')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
          format === 'mp3'
            ? 'bg-brand text-white'
            : 'bg-transparent text-muted-foreground hover:text-white'
        )}
      >
        <Music2 className="w-4 h-4" />
        MP3
      </button>
    </div>
  );
}
