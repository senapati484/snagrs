'use client';

import { cn } from '@/lib/utils';
import type { QualityOption } from '@/types';

interface QualitySelectorProps {
  qualities: QualityOption[];
  selected: string;
  onChange: (quality: string) => void;
}

export function QualitySelector({ qualities, selected, onChange }: QualitySelectorProps) {
  if (qualities.length <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {qualities.map((q) => (
        <button
          key={q.value}
          type="button"
          onClick={() => onChange(q.value)}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
            selected === q.value
              ? 'bg-brand text-white'
              : 'bg-muted text-muted-foreground hover:text-white'
          )}
        >
          {q.label}
        </button>
      ))}
    </div>
  );
}
