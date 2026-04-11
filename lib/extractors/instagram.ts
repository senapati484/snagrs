import { instagramGetUrl } from 'instagram-url-direct';
import type { DownloadResult, DownloadFormat, QualityOption } from '@/types';
import type { SnagError } from '@/types';
import { generateFilename } from '@/lib/utils';

interface InstagramUrlData {
  url_list: string[];
  thumbnail?: string;
  original?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results_number?: any;
}

export async function extractInstagram(
  url: string,
  format: DownloadFormat,
  quality?: string
): Promise<DownloadResult> {
  try {
    // Use instagram-url-direct package as primary method
    const data: InstagramUrlData = await instagramGetUrl(url);

    if (
      !data ||
      data.results_number === 0 ||
      !data.url_list ||
      data.url_list.length === 0
    ) {
      throw {
        message:
          'Could not extract Instagram video. Make sure the post is public and contains a video.',
      } as SnagError;
    }

    // Build quality options from url_list
    // Instagram typically provides multiple quality versions
    const availableQualities: QualityOption[] = [];

    // The url_list usually has: [HD version, SD version, ...] or similar
    // We need to classify them based on URL patterns or position
    data.url_list.forEach((downloadUrl: string, index: number) => {
      // Higher quality URLs typically have higher resolution indicators
      // or appear earlier in the list
      const heightLabels = ['1080', '720', '480', '360', '240'];
      let foundQuality = false;

      for (const h of heightLabels) {
        if (downloadUrl.includes(`${h}x`) || downloadUrl.includes(`_${h}.mp4`)) {
          availableQualities.push({
            label: `${h}p`,
            value: index.toString(),
            height: parseInt(h),
          });
          foundQuality = true;
          break;
        }
      }

      if (!foundQuality) {
        // Default labeling based on index position
        const defaultQualities = ['720p', '480p', '360p', '240p'];
        availableQualities.push({
          label: defaultQualities[Math.min(index, defaultQualities.length - 1)] || 'Unknown',
          value: index.toString(),
        });
      }
    });

    // Prefer the first URL in the list (usually the best quality)
    const downloadUrl = data.url_list[0];

    if (!downloadUrl || typeof downloadUrl !== 'string') {
      throw {
        message: 'Could not extract a valid download URL from Instagram.',
      } as SnagError;
    }

    // For MP3 format, we need to stream via FFmpeg conversion
    // Use the instagram-stream endpoint for audio extraction
    if (format === 'mp3') {
      return {
        downloadUrl: downloadUrl,
        filename: generateFilename('instagram', format),
        format,
        platform: 'instagram',
        quality: quality || 'auto',
        useStream: true, // Signal to use instagram-stream endpoint
        sourceUrl: downloadUrl, // Original video URL for streaming
        availableQualities: [{ label: 'Audio', value: 'best' }],
      };
    }

    return {
      downloadUrl,
      filename: generateFilename('instagram', format),
      format,
      platform: 'instagram',
      quality: quality || 'auto',
      availableQualities: availableQualities.length > 0 ? availableQualities : [{ label: 'Best', value: '0' }],
    };
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof (error as SnagError).message === 'string'
    ) {
      const msg = (error as SnagError).message;
      // Pass through our own SnagErrors
      if (msg.includes('Could not extract') || msg.includes('Instagram')) {
        throw error;
      }
    }
    throw {
      message:
        'Could not extract Instagram video. Make sure the post is public and contains a video or reel.',
    } as SnagError;
  }
}
