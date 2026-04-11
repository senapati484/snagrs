import { NextRequest, NextResponse } from 'next/server';
import { Innertube, Platform } from 'youtubei.js';
import { spawn } from 'child_process';

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

// Reuse Innertube instance
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
    const info = await yt.getInfo(videoId);

    if (!info) {
      innertubeInstance = null;
      return NextResponse.json(
        { error: 'Could not fetch video info. Please try again.' },
        { status: 404 }
      );
    }

    if (!info.streaming_data) {
      innertubeInstance = null;
      const status = info.playability_status?.status || 'unknown';
      const reason = info.playability_status?.reason || 'No streaming data available';
      return NextResponse.json(
        { error: `Could not fetch video. Status: ${status}. Reason: ${reason}` },
        { status: 404 }
      );
    }

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

    let stream;
    let contentType = format === 'mp3' ? 'audio/mp4' : 'video/mp4';

    if (format === 'mp3') {
      // For MP3 audio, we need audio-only stream
      // YouTube doesn't have pure MP3 - audio is in m4a (aac) or webm (opus) containers

      // Get audio-only formats from adaptive_formats
      const adaptiveFormats = info.streaming_data?.adaptive_formats || [];
      const audioFormats = adaptiveFormats
        .filter((f: any) => !f.height || f.height === 0)
        .sort((a: any, b: any) => (b.audio_bitrate || 0) - (a.audio_bitrate || 0));

      // Check if we have audio formats with direct URLs
      const audioWithUrl = audioFormats.filter((f: any) => f.url);

      if (audioWithUrl.length > 0) {
        // We have audio-only format with direct URL!
        const bestAudio = audioWithUrl[0];
        const response = await fetch(bestAudio.url!);
        if (!response.ok) {
          throw new Error(`Audio fetch failed: ${response.status}`);
        }
        stream = response.body;
        contentType = 'audio/mp4';
      } else {
        // No direct URL - download video+audio and use FFmpeg to extract audio
        const combinedFormats = allFormats
          .filter((f: any) => f.height && f.height > 0)
          .sort((a: any, b: any) => (b.height || 0) - (a.height || 0));

        // Use smallest video quality to minimize download size
        const lowestQuality = combinedFormats[combinedFormats.length - 1];
        const height = lowestQuality.height;

        const heightToQuality: Record<number, string> = {
          4320: 'hd4320',
          2160: 'hd2160',
          1440: 'hd1440',
          1080: 'hd1080',
          720: 'hd720',
          480: 'large',
          360: 'medium',
          240: 'small',
          144: 'tiny',
        };

        const qualityStr = height != null ? (heightToQuality[height] || 'best') : 'best';

        // Download the video+audio stream as buffer
        const videoData = await info.download({
          type: 'video+audio',
          quality: qualityStr,
          format: 'mp4',
        });

        // Convert video buffer to audio buffer using FFmpeg
        const { Buffer } = await import('buffer');
        const videoBuffer = Buffer.from(await new Response(videoData).arrayBuffer());

        // Run FFmpeg to extract MP3
        const { execSync } = await import('child_process');

        // Create temp files
        const inputPath = `/tmp/snagr-input-${Date.now()}.mp4`;
        const outputPath = `/tmp/snagr-output-${Date.now()}.mp3`;

        // Write input file
        const { writeFileSync } = await import('fs');
        writeFileSync(inputPath, videoBuffer);

        // Run FFmpeg
        execSync(`ffmpeg -i "${inputPath}" -vn -acodec libmp3lame -q:a 2 "${outputPath}" -y`);

        // Read output
        const { readFileSync, unlinkSync } = await import('fs');
        const mp3Buffer = readFileSync(outputPath);

        // Cleanup temp files
        unlinkSync(inputPath);
        unlinkSync(outputPath);

        // Stream the MP3 buffer
        stream = new ReadableStream({
          start(controller) {
            controller.enqueue(mp3Buffer);
            controller.close();
          }
        });
        contentType = 'audio/mpeg';
      }
    } else {
      // For video (MP4), select by quality
      // Parse quality from parameter (e.g., "1080p" -> 1080)
      let targetHeight = 0;
      if (quality && quality !== 'best' && quality !== 'auto') {
        targetHeight = parseInt(quality.replace('p', ''));
      }

      // Get combined formats (video+audio) sorted by height
      // Filter: formats with height (video streams), sorted by quality
      const combinedFormats = allFormats
        .filter((f: any) => f.height && f.height > 0)
        .sort((a: any, b: any) => (b.height || 0) - (a.height || 0));

      if (combinedFormats.length === 0) {
        return NextResponse.json(
          { error: 'No suitable video format found.' },
          { status: 404 }
        );
      }

      // Select format based on target height
      let targetFormat = combinedFormats[0]; // Default to highest

      if (targetHeight > 0) {
        // Find exact match or closest lower quality
        const matched = combinedFormats.find((f: any) => f.height === targetHeight)
          || combinedFormats.find((f: any) => f.height < targetHeight);
        if (matched) {
          targetFormat = matched;
        }
      }

      // Map height to youtubei.js quality string
      const heightToQuality: Record<number, string> = {
        4320: 'hd4320',
        2160: 'hd2160',
        1440: 'hd1440',
        1080: 'hd1080',
        720: 'hd720',
        480: 'large',
        360: 'medium',
        240: 'small',
        144: 'tiny',
      };

      const qualityStr = targetFormat.height
        ? heightToQuality[targetFormat.height] || 'best'
        : 'best';

      stream = await info.download({
        type: 'video+audio',
        quality: qualityStr,
        format: 'mp4',
      });
    }

    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, max-age=0',
      'Access-Control-Allow-Origin': '*',
    };

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
