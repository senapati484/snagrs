import { execSync } from 'child_process';
import type { DownloadResult, DownloadFormat, QualityOption } from '@/types';
import type { SnagError } from '@/types';
import { generateFilename } from '@/lib/utils';

export async function extractTikTok(
  url: string,
  format: DownloadFormat,
  quality?: string
): Promise<DownloadResult> {
  try {
    // Resolve short URLs first
    let resolvedUrl = url;
    try {
      const redirectRes = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
      });
      if (redirectRes.url && redirectRes.url !== url) {
        resolvedUrl = redirectRes.url;
      }
    } catch {
      // Continue with original URL
    }

    // Use yt-dlp to get the best video URL
    // --get-url: only print the media URL
    // --no-playlist: don't download entire playlist
    // -f: format selector
    let ytdlpArgs: string[] = ['--get-url', '--no-playlist'];

    if (format === 'mp3') {
      // For audio, extract best audio track
      ytdlpArgs.push('-f', 'bestaudio[ext=m4a]/bestaudio');
    } else {
      // For video, select by quality or get best available
      if (quality && quality !== 'best' && quality !== 'auto') {
        const height = parseInt(quality.replace('p', ''));
        if (height > 0) {
          // Get up to requested height
          ytdlpArgs.push('-f', `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`);
        } else {
          ytdlpArgs.push('-f', 'bestvideo+bestaudio/best');
        }
      } else {
        ytdlpArgs.push('-f', 'bestvideo+bestaudio/best');
      }
    }

    ytdlpArgs.push(resolvedUrl);

    const output = execSync(`yt-dlp ${ytdlpArgs.join(' ')}`, {
      timeout: 30000,
      encoding: 'utf-8',
    });

    const downloadUrl = output.trim();

    if (!downloadUrl || !downloadUrl.startsWith('http')) {
      throw {
        message: 'Could not extract TikTok video URL.',
      } as SnagError;
    }

    // Build quality options - TikTok typically has 2-3 quality levels
    let availableQualities: QualityOption[] = [];
    if (format === 'mp3') {
      availableQualities = [
        { label: 'Best Audio', value: 'bestaudio' },
      ];
    } else {
      // Try to get format info for quality options
      try {
        const formatOutput = execSync(
          `yt-dlp --list-formats --no-playlist "${resolvedUrl}"`,
          { timeout: 15000, encoding: 'utf-8' }
        );
        // Parse height from format list
        const heights: number[] = [];
        const heightMatches = formatOutput.matchAll(/(\d{3,4})[xX]\d+/g);
        for (const match of heightMatches) {
          heights.push(parseInt(match[1]));
        }
        const unique = [...new Set(heights)].sort((a, b) => b - a);
        availableQualities = unique.slice(0, 4).map((h) => ({
          label: `${h}p`,
          value: `${h}`,
          height: h,
        }));
        if (availableQualities.length === 0) {
          availableQualities = [{ label: 'Best', value: 'best' }];
        }
      } catch {
        availableQualities = [{ label: 'Best', value: 'best' }];
      }
    }

    return {
      downloadUrl,
      filename: generateFilename('tiktok', format),
      format,
      platform: 'tiktok',
      quality: quality || 'auto',
      availableQualities,
    };
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
      message: 'Could not extract TikTok video. The video may be private or the link may be invalid.',
    } as SnagError;
  }
}
