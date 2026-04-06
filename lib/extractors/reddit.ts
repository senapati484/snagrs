import type { DownloadResult, DownloadFormat } from '@/types';
import type { SnagError } from '@/types';
import { generateFilename, detectPlatform } from '@/lib/utils';

function cleanUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    parsedUrl.search = '';
    let cleaned = parsedUrl.toString();
    if (cleaned.endsWith('/')) {
      cleaned = cleaned.slice(0, -1);
    }
    return cleaned;
  } catch {
    return url;
  }
}

export async function extractReddit(
  url: string,
  format: DownloadFormat
): Promise<DownloadResult> {
  try {
    const clean = cleanUrl(url);
    const jsonUrl = `${clean}.json`;
    
    const response = await fetch(jsonUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
    });
    
    if (!response.ok) {
      throw { message: 'Could not fetch Reddit post' } as SnagError;
    }
    
    const data = await response.json();
    const post = data?.[0]?.data?.children?.[0]?.data;
    
    if (!post) {
      throw { message: 'Could not fetch Reddit post' } as SnagError;
    }
    
    if (!post.is_video) {
      throw { message: 'This Reddit post does not contain a video.' } as SnagError;
    }
    
    const media = post.media?.reddit_video;
    let downloadUrl = media?.fallback_url;
    
    if (!downloadUrl) {
      const crosspostMedia = post.crosspost_parent_list?.[0]?.media?.reddit_video;
      if (crosspostMedia?.fallback_url) {
        downloadUrl = crosspostMedia.fallback_url;
      }
    }
    
    if (!downloadUrl) {
      throw { message: 'This Reddit post does not contain a video.' } as SnagError;
    }
    
    if (format === 'mp3') {
      const audioUrl = downloadUrl.replace(/DASH_.*\.mp4/, 'DASH_audio.mp4');
      downloadUrl = audioUrl;
    }
    
    return {
      downloadUrl,
      filename: generateFilename('reddit', format),
      format,
      platform: detectPlatform(url),
    };
  } catch (error) {
    if ((error as SnagError).message) {
      throw error;
    }
    throw { message: 'Could not extract Reddit video. The post may be private or not contain video.' } as SnagError;
  }
}
