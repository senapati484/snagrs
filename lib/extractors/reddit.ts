import type { DownloadResult, DownloadFormat, QualityOption } from '@/types';
import type { SnagError } from '@/types';
import { generateFilename } from '@/lib/utils';

function cleanUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    // Remove query params
    parsedUrl.search = '';
    let cleaned = parsedUrl.toString();
    // Remove trailing slash
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
  format: DownloadFormat,
  quality?: string
): Promise<DownloadResult> {
  try {
    const clean = cleanUrl(url);

    let post: RedditPostData | undefined;

    // Strategy 1: Try fetching Reddit JSON with various approaches
    const approaches = [
      // Approach 1: Standard JSON endpoint
      async () => {
        const jsonUrl = `${clean}.json`;
        const response = await fetch(jsonUrl, {
          headers: {
            'User-Agent': 'web:snagr:v0.1.0 (by /u/snagr_app)',
            Accept: 'application/json',
          },
          redirect: 'follow',
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data?.[0]?.data?.children?.[0]?.data;
      },
      // Approach 2: old.reddit.com JSON
      async () => {
        const oldUrl = clean.replace('www.reddit.com', 'old.reddit.com');
        const jsonUrl = `${oldUrl}.json`;
        const response = await fetch(jsonUrl, {
          headers: {
            'User-Agent': 'web:snagr:v0.1.0 (by /u/snagr_app)',
            Accept: 'application/json',
          },
          redirect: 'follow',
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data?.[0]?.data?.children?.[0]?.data;
      },
      // Approach 3: Add raw_json=1 parameter
      async () => {
        const jsonUrl = `${clean}.json?raw_json=1`;
        const response = await fetch(jsonUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          redirect: 'follow',
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data?.[0]?.data?.children?.[0]?.data;
      },
    ];

    for (const approach of approaches) {
      try {
        post = await approach();
        if (post) break;
      } catch {
        continue;
      }
    }

    if (!post) {
      throw {
        message: 'Could not fetch Reddit post. It may be private or the URL may be invalid.',
      } as SnagError;
    }

    // Check if it's a video post
    if (!post.is_video) {
      // Check if it's a crosspost with video
      const crosspostVideo =
        post.crosspost_parent_list?.[0]?.media?.reddit_video;
      if (!crosspostVideo) {
        throw {
          message: 'This Reddit post does not contain a video.',
        } as SnagError;
      }

      // Use crosspost video
      return buildResult(crosspostVideo, format, quality);
    }

    const redditVideo = post.media?.reddit_video;
    if (!redditVideo) {
      // Check crosspost as fallback
      const crosspostVideo =
        post.crosspost_parent_list?.[0]?.media?.reddit_video;
      if (crosspostVideo) {
        return buildResult(crosspostVideo, format, quality);
      }

      throw {
        message: 'This Reddit post does not contain a downloadable video.',
      } as SnagError;
    }

    return buildResult(redditVideo, format, quality);
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof (error as SnagError).message === 'string'
    ) {
      throw error;
    }
    throw {
      message:
        'Could not extract Reddit video. The post may be private or not contain video.',
    } as SnagError;
  }
}

interface RedditPostData {
  is_video?: boolean;
  media?: {
    reddit_video?: RedditVideoData;
  };
  crosspost_parent_list?: Array<{
    media?: {
      reddit_video?: RedditVideoData;
    };
  }>;
}

interface RedditVideoData {
  fallback_url?: string;
  dash_url?: string;
  hls_url?: string;
  scrubber_media_url?: string;
  duration?: number;
  height?: number;
}

function buildResult(
  redditVideo: RedditVideoData,
  format: DownloadFormat,
  quality?: string
): DownloadResult {
  let downloadUrl = redditVideo.fallback_url;

  if (!downloadUrl) {
    downloadUrl = redditVideo.scrubber_media_url;
  }

  if (!downloadUrl) {
    throw {
      message: 'Could not find a downloadable video URL.',
    } as SnagError;
  }

  // Remove the query params that Reddit adds (like ?source=fallback)
  // but keep the base URL
  const urlObj = new URL(downloadUrl);
  downloadUrl = urlObj.origin + urlObj.pathname;

  // Build quality options from available URLs
  const availableQualities: QualityOption[] = [];
  const fallbackUrl = redditVideo.fallback_url;

  if (fallbackUrl) {
    // Reddit typically has: DASH_1080p.mp4, DASH_720p.mp4, DASH_480p.mp4, etc.
    const qualityPatterns = [
      { pattern: /DASH_1080p\.mp4/, label: '1080p', height: 1080 },
      { pattern: /DASH_720p\.mp4/, label: '720p', height: 720 },
      { pattern: /DASH_480p\.mp4/, label: '480p', height: 480 },
      { pattern: /DASH_360p\.mp4/, label: '360p', height: 360 },
      { pattern: /DASH_\d+\.mp4/, label: 'SD', height: undefined },
    ];

    // Check if the fallback URL contains quality indicator
    for (const qp of qualityPatterns) {
      if (qp.pattern.test(fallbackUrl)) {
        availableQualities.push({
          label: qp.label,
          value: qp.label,
          height: qp.height,
        });
        break;
      }
    }

    // If no match found, just add as best
    if (availableQualities.length === 0) {
      availableQualities.push({ label: 'Best', value: 'best' });
    }
  }

  if (format === 'mp3') {
    // Reddit stores audio separately.
    // The audio URL follows the pattern: replace DASH_XXX.mp4 with DASH_AUDIO_128.mp4
    const baseUrl = downloadUrl.replace(/DASH_\d+\.mp4$/, '');

    // Try the most common audio pattern
    downloadUrl = `${baseUrl}DASH_AUDIO_128.mp4`;

    // Audio quality options for MP3
    availableQualities.length = 0;
    availableQualities.push(
      { label: '128kbps', value: '128kbps', bitrate: 128 },
      { label: '64kbps', value: '64kbps', bitrate: 64 }
    );
  }

  return {
    downloadUrl,
    filename: generateFilename('reddit', format),
    format,
    platform: 'reddit',
    quality: quality || 'auto',
    availableQualities: availableQualities.length > 0 ? availableQualities : [{ label: 'Best', value: 'best' }],
  };
}
