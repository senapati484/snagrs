import { NextRequest, NextResponse } from 'next/server';
import { Innertube, Platform } from 'youtubei.js';

// Configure custom JS evaluator for deciphering YouTube signatures
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Platform.shim.eval = async (data: any, env: any) => {
  const properties: string[] = [];
  if (env.n) {
    properties.push(`n: exportedVars.nFunction("${env.n}")`);
  }
  if (env.sig) {
    properties.push(`sig: exportedVars.sigFunction("${env.sig}")`);
  }
  const code = `${data.output}\nreturn { ${properties.join(', ')} }`;
  return new Function(code)();
};

// Reuse Innertube instance
let innertubeInstance: Innertube | null = null;

async function getInnertube(): Promise<Innertube> {
  if (!innertubeInstance) {
    innertubeInstance = await Innertube.create({
      lang: 'en',
      location: 'US',
      retrieve_player: true,
      generate_session_locally: true,
      enable_session_cache: false,
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

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get('url');
  const format = searchParams.get('format') || 'mp4';
  const quality = searchParams.get('quality') || 'best';
  const filename = searchParams.get('filename') || `snagr-youtube.${format}`;

  if (!videoUrl) {
    return NextResponse.json(
      { error: 'Missing URL parameter' },
      { status: 400 }
    );
  }

  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    return NextResponse.json(
      { error: 'Invalid YouTube URL' },
      { status: 400 }
    );
  }

  try {
    const yt = await getInnertube();
    // Use getInfo() instead of getBasicInfo() to get deciphered URLs
    const info = await yt.getInfo(videoId);

    if (!info || !info.streaming_data) {
      innertubeInstance = null;
      return NextResponse.json(
        { error: 'Could not fetch video. It may be private or age-restricted.' },
        { status: 404 }
      );
    }

    const contentType = format === 'mp3' ? 'audio/mpeg' : 'video/mp4';

    // Get all available formats
    const streamingData = info.streaming_data;
    const allFormats = [
      ...(streamingData.formats || []),
      ...(streamingData.adaptive_formats || []),
    ];

    if (allFormats.length === 0) {
      return NextResponse.json(
        { error: 'No downloadable formats found for this video.' },
        { status: 404 }
      );
    }

    // Helper: detect if format is video (has height) or audio (no height)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isVideo = (f: any) => f.height != null && f.height > 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isAudio = (f: any) => f.height == null || f.height === 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let targetFormat: any = null;

    if (format === 'mp3') {
      // For MP3 audio, get audio-only formats (itag 140, 249, 250, 251, etc.)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const audioFormats = allFormats.filter((f: any) => isAudio(f));

      if (audioFormats.length === 0) {
        return NextResponse.json(
          { error: 'No audio format available for this video.' },
          { status: 404 }
        );
      }

      // Sort by itag (higher = better quality, 251 = best audio)
      audioFormats.sort((a, b) => (b.itag || 0) - (a.itag || 0));

      if (quality === 'best' || quality === 'auto') {
        targetFormat = audioFormats[0];
      } else {
        // Try to match specific bitrate preference (use itag as proxy)
        const bitrateMap: Record<string, number> = {
          '320kbps': 251,
          '192kbps': 250,
          '128kbps': 140,
        };
        const targetItag = bitrateMap[quality] || audioFormats[0].itag;
        targetFormat = audioFormats.find((f) => f.itag === targetItag) || audioFormats[0];
      }
    } else {
      // For MP4 video, use combined video+audio when available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let videoFormats = allFormats.filter((f: any) => isVideo(f));

      if (videoFormats.length === 0) {
        return NextResponse.json(
          { error: 'No video format available for this video.' },
          { status: 404 }
        );
      }

      // Sort by height descending (higher = better quality)
      videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0));

      if (quality === 'best' || quality === 'auto') {
        targetFormat = videoFormats[0];
      } else {
        // Try to match specific height (e.g., "1080p" -> 1080, "720p" -> 720)
        const targetHeight = parseInt(quality.replace('p', ''));
        if (targetHeight) {
          targetFormat = videoFormats.find((f) => f.height === targetHeight) || videoFormats[0];
        } else {
          targetFormat = videoFormats[0];
        }
      }
    }

    if (!targetFormat) {
      return NextResponse.json(
        { error: 'Could not find a suitable format for this video.' },
        { status: 404 }
      );
    }

    // Use youtubei.js built-in download
    let stream;
    if (format === 'mp3') {
      // For audio, use type 'audio' which works with any quality
      stream = await info.download({
        type: 'audio' as const,
        format: 'any' as const,
      });
    } else {
      // For video, use 'video+audio' with 'best' - this is the only way to get
      // a combined stream that includes both video and audio
      // Specifying specific quality at high resolution fails because those are separate tracks
      stream = await info.download({
        type: 'video+audio' as const,
        quality: 'best' as const,
        format: 'mp4' as const,
      });
    }

    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, max-age=0',
      'Access-Control-Allow-Origin': '*',
    };

    // stream from youtubei.js is a ReadableStream
    return new Response(stream as ReadableStream, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('YouTube stream error:', error);
    innertubeInstance = null;
    return NextResponse.json(
      { error: 'Failed to stream YouTube video' },
      { status: 500 }
    );
  }
}
