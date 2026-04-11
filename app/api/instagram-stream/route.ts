import { NextRequest, NextResponse } from 'next/server';

const requestCounts = new Map<string, { count: number; resetTime: number }>();

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60000;
  const maxRequests = 20;

  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get('url');
  const filename = searchParams.get('filename') || 'snagr-instagram.mp3';

  if (!videoUrl) {
    return NextResponse.json(
      { error: 'Missing URL parameter' },
      { status: 400 }
    );
  }

  const clientIp = getClientIp(request);
  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429 }
    );
  }

  try {
    // videoUrl is already the actual CDN URL from extraction
    // No need to call instagramGetUrl again - just fetch and convert

    const videoResponse = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.instagram.com/',
        'Origin': 'https://www.instagram.com',
      },
    });

    if (!videoResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch video (status: ${videoResponse.status})` },
        { status: 502 }
      );
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

    // Convert to MP3 using FFmpeg
    const { execSync } = await import('child_process');
    const { writeFileSync, readFileSync, unlinkSync } = await import('fs');

    const inputPath = `/tmp/snagr-ig-input-${Date.now()}.mp4`;
    const outputPath = `/tmp/snagr-ig-output-${Date.now()}.mp3`;

    writeFileSync(inputPath, videoBuffer);

    // Convert to MP3: strip video, encode audio as MP3
    // -vn: no video
    // -acodec libmp3lame: use MP3 encoder
    // -q:a 2: quality level (0-9, lower is better, 2 is good balance)
    execSync(`ffmpeg -i "${inputPath}" -vn -acodec libmp3lame -q:a 2 "${outputPath}" -y`);

    const mp3Buffer = readFileSync(outputPath);

    // Cleanup
    unlinkSync(inputPath);
    unlinkSync(outputPath);

    return new Response(mp3Buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': mp3Buffer.length.toString(),
        'Cache-Control': 'no-store, max-age=0',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Instagram stream error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process Instagram video';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}