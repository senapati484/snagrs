export type Platform =
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'twitter'
  | 'reddit'
  | 'unknown';

export type DownloadFormat = 'mp4' | 'mp3';

export type DownloadStatus = 'idle' | 'loading' | 'success' | 'error';

export interface DownloadRequest {
  url: string;
  format: DownloadFormat;
}

export interface DownloadResult {
  downloadUrl: string;
  filename: string;
  format: DownloadFormat;
  platform: Platform;
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
