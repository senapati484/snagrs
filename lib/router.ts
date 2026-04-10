import type { DownloadRequest, DownloadResult, SnagError } from '@/types';
import { detectPlatform, isValidUrl } from '@/lib/utils';
import { extractYouTube } from '@/lib/extractors/youtube';
import { extractInstagram } from '@/lib/extractors/instagram';
import { extractTikTok } from '@/lib/extractors/tiktok';
import { extractTwitter } from '@/lib/extractors/twitter';
import { extractReddit } from '@/lib/extractors/reddit';

export async function resolveDownload(
  request: DownloadRequest
): Promise<DownloadResult> {
  if (!isValidUrl(request.url)) {
    throw { message: 'Invalid URL' } as SnagError;
  }

  const platform = detectPlatform(request.url);

  if (platform === 'unknown') {
    throw {
      message:
        'This platform is not supported yet. Supported: YouTube, Instagram, TikTok, Twitter/X, Reddit',
    } as SnagError;
  }

  switch (platform) {
    case 'youtube':
      return extractYouTube(request.url, request.format, request.quality);
    case 'instagram':
      return extractInstagram(request.url, request.format, request.quality);
    case 'tiktok':
      return extractTikTok(request.url, request.format, request.quality);
    case 'twitter':
      return extractTwitter(request.url, request.format, request.quality);
    case 'reddit':
      return extractReddit(request.url, request.format, request.quality);
    default:
      throw {
        message:
          'This platform is not supported yet. Supported: YouTube, Instagram, TikTok, Twitter/X, Reddit',
      } as SnagError;
  }
}
