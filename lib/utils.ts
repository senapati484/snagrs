import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Platform, DownloadFormat } from '@/types';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function detectPlatform(url: string): Platform {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return 'youtube';
  }
  if (lowerUrl.includes('instagram.com')) {
    return 'instagram';
  }
  if (lowerUrl.includes('tiktok.com')) {
    return 'tiktok';
  }
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
    return 'twitter';
  }
  if (lowerUrl.includes('reddit.com') || lowerUrl.includes('redd.it')) {
    return 'reddit';
  }
  return 'unknown';
}

export function getPlatformLabel(platform: Platform): string {
  const labels: Record<Platform, string> = {
    youtube: 'YouTube',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    twitter: 'Twitter / X',
    reddit: 'Reddit',
    unknown: 'Unknown',
  };
  return labels[platform];
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function generateFilename(platform: Platform, format: DownloadFormat): string {
  return `snagr-${platform}-${Date.now()}.${format}`;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2);
}
