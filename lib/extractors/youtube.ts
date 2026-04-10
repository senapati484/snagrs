import { Innertube, Platform } from 'youtubei.js';
import { generateFilename } from '@/lib/utils';
import type { DownloadResult, DownloadFormat, QualityOption } from '@/types';
import type { SnagError } from '@/types';

// Configure custom JS evaluator for deciphering YouTube signatures
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Platform.shim.eval = (data: any, env: any) => {
  const properties: string[] = [];
  if (env.n) {
    properties.push(`n: __YTOBJ__.nFunction("${env.n}")`);
  }
  if (env.sig) {
    properties.push(`sig: __YTOBJ__.sigFunction("${env.sig}")`);
  }
  const fullCode = `${data.output}\nreturn { ${properties.join(', ')} }`;
  return new Function('__YTOBJ__', fullCode)(env);
};

// Reuse a single Innertube instance across requests
let innertubeInstance: Innertube | null = null;

async function getInnertube(): Promise<Innertube> {
  if (!innertubeInstance) {
    innertubeInstance = await Innertube.create({
      lang: 'en',
      location: 'US',
      retrieve_player: true,
    });
  }
  return innertubeInstance;
}

function extractVideoId(url: string): string {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname.includes('youtu.be')) {
      return parsedUrl.pathname.slice(1).split('?')[0];
    }
    if (parsedUrl.pathname.includes('/shorts/')) {
      return parsedUrl.pathname.split('/shorts/')[1].split('?')[0];
    }
    return parsedUrl.searchParams.get('v') || '';
  } catch {
    return '';
  }
}

function getYouTubeQualities(info: any): { video: QualityOption[]; audio: QualityOption[] } {
  const video: QualityOption[] = [];
  const audio: QualityOption[] = [];

  const formats = info?.streaming_data?.adaptive_formats || [];
  const allFormats = [...(info?.streaming_data?.formats || []), ...formats];

  // Helper: detect if format is video (has height) or audio (no height)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isVideo = (f: any) => f.height != null && f.height > 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isAudio = (f: any) => f.height == null || f.height === 0;

  for (const fmt of allFormats) {
    const itag = fmt.itag;
    const qualityLabel = fmt.quality_label;

    // Video formats have height
    if (isVideo(fmt) && qualityLabel) {
      const height = parseInt(qualityLabel.replace('p', ''));
      if (!video.find((v) => v.height === height)) {
        video.push({
          label: qualityLabel,
          value: qualityLabel, // Use quality label as value (e.g., "1080p")
          height,
        });
      }
    }

    // Audio formats have no height (itags 140, 249, 250, 251, etc.)
    if (isAudio(fmt) && fmt.audio_bitrate) {
      const bitrate = `${fmt.audio_bitrate}kbps`;
      if (!audio.find((a) => a.bitrate === fmt.audio_bitrate)) {
        audio.push({
          label: bitrate,
          value: bitrate,
          bitrate: fmt.audio_bitrate,
        });
      }
    }
  }

  // Sort by quality descending
  video.sort((a, b) => (b.height || 0) - (a.height || 0));
  audio.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

  return { video, audio };
}

export async function extractYouTube(
  url: string,
  format: DownloadFormat,
  quality?: string
): Promise<DownloadResult> {
  const videoId = extractVideoId(url);

  if (!videoId) {
    throw { message: 'Invalid YouTube URL' } as SnagError;
  }

  try {
    const yt = await getInnertube();
    // Use getInfo() to get full info with deciphered URLs
    const info = await yt.getInfo(videoId);

    if (!info || !info.streaming_data) {
      throw {
        message: 'Could not fetch this YouTube video. It may be private or age-restricted.',
      } as SnagError;
    }

    // Get available qualities
    const { video: availableVideo, audio: availableAudio } = getYouTubeQualities(info);
    const availableQualities: QualityOption[] = format === 'mp3' ? availableAudio : availableVideo;

    const filename = generateFilename('youtube', format);

    return {
      downloadUrl: videoId,
      filename,
      format,
      platform: 'youtube',
      quality: quality || 'auto',
      availableQualities,
      useStream: true,
      sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'message' in error) {
      const msg = (error as { message: string }).message;
      if (msg.includes('Could not fetch') || msg.includes('Invalid YouTube')) {
        throw error;
      }
      if (msg.includes('private') || msg.includes('unavailable')) {
        throw { message: 'This video is private or unavailable.' } as SnagError;
      }
      if (msg.includes('age')) {
        throw { message: 'Age-restricted content cannot be downloaded.' } as SnagError;
      }
      if (msg.includes('Sign in')) {
        throw { message: 'This video requires sign-in and cannot be downloaded.' } as SnagError;
      }
    }
    innertubeInstance = null;
    throw {
      message: 'Could not fetch this YouTube video. It may be private or age-restricted.',
    } as SnagError;
  }
}
