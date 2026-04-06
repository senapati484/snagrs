'use client';

import { forwardRef } from 'react';
import { Link2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UrlInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  platformLabel?: string;
  onClear?: () => void;
}

export const UrlInput = forwardRef<HTMLInputElement, UrlInputProps>(
  ({ className, platformLabel, onClear, value, ...props }, ref) => {
    return (
      <div className="relative">
        <div
          className={cn(
            'flex items-center gap-3 w-full rounded-lg border border-border bg-surface px-5 py-4',
            'transition-all duration-200',
            'focus-within:border-brand focus-within:shadow-[0_0_0_2px_rgba(255,59,92,0.2)]',
            className
          )}
        >
          <Link2 className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={ref}
            type="url"
            className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            placeholder="Paste a video URL..."
            value={value}
            {...props}
          />
          {platformLabel && platformLabel !== '' && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-brand/10 text-brand shrink-0">
              {platformLabel}
            </span>
          )}
          {value && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="p-1 hover:bg-muted rounded-full transition-colors shrink-0"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    );
  }
);

UrlInput.displayName = 'UrlInput';
