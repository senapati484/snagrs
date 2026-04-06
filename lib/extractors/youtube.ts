import type { DownloadResult, DownloadFormat } from '@/types';
import type { SnagError } from '@/types';
import { generateFilename, detectPlatform } from '@/lib/utils';

const INVIDIOUS_INSTANCES = [
  'https://invidious.fdn.in',
  'https://invidious.snopyta.org',
  'https://invidious.kavin.rocks',
  'https://yewtu.be',
  'https://invidious.jingl.xyz',
];

function extractVideoId(url: string): string {
  try {
    const parsedUrl = new URL(url);
    
    if (parsedUrl.hostname.includes('youtu.be')) {
      return parsedUrl.pathname.slice(1);
    }
    
    if (parsedUrl.pathname.includes('/shorts/')) {
      return parsedUrl.pathname.split('/shorts/')[1];
    }
    
    return parsedUrl.searchParams.get('v') || '';
  } catch {
    return '';
  }
}

async function fetchWithInvidious(videoId: string, instance: string, format: DownloadFormat): Promise<DownloadResult | null> {
  try {
    const response = await fetch(`${instance}/api/v1/videos/${videoId}?fields=formatStreams,adaptiveFormats`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    const formatStreams = data.formatStreams || [];
    const adaptiveFormats = data.adaptiveFormats || [];
    
    let downloadUrl: string | undefined;
    
    if (format === 'mp3') {
      const audioFormats = adaptiveFormats
        .filter((f: Record<string, unknown>) => (f.type as string)?.includes('audio'))
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) => 
          parseInt((b.bitrate as string) || '0', 10) - parseInt((a.bitrate as string) || '0', 10)
        );
      
      downloadUrl = (audioFormats[0] as Record<string, unknown>)?.url as string;
    } else {
      const videoFormats = formatStreams.length > 0 ? formatStreams : adaptiveFormats.filter((f: Record<string, unknown>) => (f.type as string)?.includes('video'));
      
      const sorted = (videoFormats as Record<string, unknown>[])
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
          const aLabel = (a.qualityLabel as string || '0').replace('p', '');
          const bLabel = (b.qualityLabel as string || '0').replace('p', '');
          return parseInt(bLabel, 10) - parseInt(aLabel, 10);
        });
      
      downloadUrl = (sorted[0] as Record<string, unknown>)?.url as string;
    }
    
    if (!downloadUrl) {
      return null;
    }
    
    return {
      downloadUrl,
      filename: generateFilename('youtube', format),
      format,
      platform: 'youtube',
    };
  } catch {
    return null;
  }
}

export async function extractYouTube(
  url: string,
  format: DownloadFormat
): Promise<DownloadResult> {
  const videoId = extractVideoId(url);
  
  if (!videoId) {
    throw { message: 'Invalid YouTube URL' } as SnagError;
  }
  
  let lastError: SnagError = { message: 'Could not fetch this YouTube video. It may be private or age-restricted.' };
  
  for (const instance of INVIDIOUS_INSTANCES) {
    const result = await fetchWithInvidious(videoId, instance, format);
    if (result) {
      return result;
    }
  }
  
  throw lastError;
}
