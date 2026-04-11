export type Platform =
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'twitter'
  | 'reddit'
  | 'unknown';

export type DownloadFormat = 'mp4' | 'mp3';

export type VideoQuality = '1080p' | '720p' | '480p' | '360p' | 'auto';
export type AudioQuality = '320kbps' | '192kbps' | '128kbps' | 'auto';

export type DownloadStatus = 'idle' | 'loading' | 'success' | 'error';

export interface QualityOption {
  label: string;
  value: string;
  height?: number;
  bitrate?: number;
  itag?: number;
}

export interface DownloadRequest {
  url: string;
  format: DownloadFormat;
  quality?: string;
}

export interface DownloadResult {
  downloadUrl: string;
  filename: string;
  format: DownloadFormat;
  platform: Platform;
  quality?: string;
  availableQualities?: QualityOption[];
  /** When true, use /api/stream instead of /api/proxy */
  useStream?: boolean;
  /** Original video URL (used by stream endpoint) */
  sourceUrl?: string;
}

export interface SnagError {
  message: string;
  code?: string;
}

export interface HistoryItem {
  id: string;
  url: string;
  format: DownloadFormat;
  platform: Platform;
  filename: string;
  downloadUrl: string;
  timestamp: number;
}
