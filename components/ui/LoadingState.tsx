'use client';

import { motion } from 'framer-motion';
import type { DownloadFormat } from '@/types';

interface LoadingStateProps {
  format?: DownloadFormat;
}

export function LoadingState({ format = 'mp4' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      <div className="flex items-end gap-1 h-12">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="w-2 bg-brand rounded-sm"
            animate={{
              height: ['12px', '36px', '12px'],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.1,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      <p className="text-muted-foreground text-sm font-body">
        Fetching your {format}...
      </p>
    </div>
  );
}
