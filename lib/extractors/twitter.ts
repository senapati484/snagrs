import { execSync } from 'child_process';
import type { DownloadResult, DownloadFormat, QualityOption } from '@/types';
import type { SnagError } from '@/types';
import { generateFilename } from '@/lib/utils';

export async function extractTwitter(
  url: string,
  format: DownloadFormat,
  quality?: string
): Promise<DownloadResult> {
  try {
    // Use yt-dlp to get the video URL
    // yt-dlp supports twitter.com and x.com URLs
    let ytdlpArgs: string[] = ['--get-url', '--no-playlist'];

    if (format === 'mp3') {
      ytdlpArgs.push('-f', 'bestaudio[ext=m4a]/bestaudio');
    } else {
      if (quality && quality !== 'best' && quality !== 'auto') {
        const height = parseInt(quality.replace('p', ''));
        if (height > 0) {
          ytdlpArgs.push('-f', `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`);
        } else {
          ytdlpArgs.push('-f', 'bestvideo+bestaudio/best');
        }
      } else {
        ytdlpArgs.push('-f', 'bestvideo+bestaudio/best');
      }
    }

    ytdlpArgs.push(url);

    const output = execSync(`yt-dlp ${ytdlpArgs.join(' ')}`, {
      timeout: 30000,
      encoding: 'utf-8',
    });

    const downloadUrl = output.trim();

    if (!downloadUrl || !downloadUrl.startsWith('http')) {
      throw {
        message: 'Could not extract Twitter/X video URL.',
      } as SnagError;
    }

    // Build quality options
    let availableQualities: QualityOption[] = [];
    if (format === 'mp3') {
      availableQualities = [{ label: 'Best Audio', value: 'bestaudio' }];
    } else {
      try {
        const formatOutput = execSync(
          `yt-dlp --list-formats --no-playlist "${url}"`,
          { timeout: 15000, encoding: 'utf-8' }
        );
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
      filename: generateFilename('twitter', format),
      format,
      platform: 'twitter',
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
      message: 'Could not extract Twitter/X video. Make sure the tweet is public and contains a video.',
    } as SnagError;
  }
}
