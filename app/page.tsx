'use client';

import { motion } from 'framer-motion';
import { Link2, SplitSquareHorizontal, Zap } from 'lucide-react';
import { DownloadForm } from '@/components/DownloadForm';
import { HistoryPanel } from '@/components/HistoryPanel';
import { SupportedPlatforms } from '@/components/ui/SupportedPlatforms';

export default function Home() {
  return (
    <div className="min-h-screen bg-dark relative overflow-hidden">
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <section className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-display font-extrabold text-white tracking-tight text-5xl sm:text-7xl md:text-8xl lg:text-[96px]"
          >
            SNAGR<span className="text-brand">⚡</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-bold text-2xl sm:text-3xl md:text-4xl text-muted-foreground mt-4"
          >
            Download anything. Instantly.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-body text-sm text-[#555555] mt-2 tracking-widest"
          >
            YouTube · Instagram · TikTok · Twitter · Reddit
          </motion.p>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full max-w-lg relative"
        >
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 50%, rgba(255,59,92,0.06) 0%, transparent 70%)',
            }}
          />
          <DownloadForm />
          <HistoryPanel />
        </motion.section>

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12"
        >
          <SupportedPlatforms />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 hidden md:flex items-center justify-center gap-8"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center">
              <Link2 className="w-5 h-5 text-brand" />
            </div>
            <span className="text-sm text-[#555555]">Copy the link</span>
          </div>
          <div className="w-24 h-px border-t border-dashed border-border" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center">
              <SplitSquareHorizontal className="w-5 h-5 text-brand" />
            </div>
            <span className="text-sm text-[#555555]">Choose MP4 or MP3</span>
          </div>
          <div className="w-24 h-px border-t border-dashed border-border" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center">
              <Zap className="w-5 h-5 text-brand" />
            </div>
            <span className="text-sm text-[#555555]">Hit Snag It</span>
          </div>
        </motion.section>

        <footer className="mt-20 text-xs text-[#333333] text-center">
          No data stored · No sign-up · Open source spirit
        </footer>
      </main>
    </div>
  );
}
