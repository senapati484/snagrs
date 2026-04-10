import { NextRequest, NextResponse } from 'next/server';

const requestCounts = new Map<string, { count: number; resetTime: number }>();

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60000;
  const maxRequests = 30;

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
  const downloadUrl = searchParams.get('url');
  const filename = searchParams.get('filename') || 'download.mp4';
  const format = searchParams.get('format') || 'mp4';
  const quality = searchParams.get('quality') || 'auto';

  if (!downloadUrl) {
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

  // For Instagram and TikTok, we need to re-fetch the URLs to get the best quality
  // since the URL from extraction might have quality baked in
  let finalUrl = downloadUrl;

  // Instagram: try to get better quality URL if quality is specified
  if (downloadUrl.includes('instagram') || downloadUrl.includes('cdninstagram') || downloadUrl.includes('fbcdn')) {
    try {
      // Import dynamically to avoid issues
      const { instagramGetUrl } = await import('instagram-url-direct');

      // Try to extract quality-specific URL
      // For now, use the URL as-is since instagram-url-direct returns a list
      // The quality parameter indicates user preference but Instagram CDN URLs are typically optimal
    } catch {
      // Continue with original URL
    }
  }

  try {
    // Determine the appropriate Referer based on the download URL
    let referer = '';
    if (downloadUrl.includes('tiktok')) {
      referer = 'https://www.tiktok.com/';
    } else if (downloadUrl.includes('instagram') || downloadUrl.includes('cdninstagram') || downloadUrl.includes('fbcdn')) {
      referer = 'https://www.instagram.com/';
    } else if (downloadUrl.includes('twimg') || downloadUrl.includes('twitter') || downloadUrl.includes('x.com')) {
      referer = 'https://twitter.com/';
    } else if (downloadUrl.includes('redd.it') || downloadUrl.includes('reddit')) {
      referer = 'https://www.reddit.com/';
    } else if (downloadUrl.includes('googlevideo') || downloadUrl.includes('youtube')) {
      referer = 'https://www.youtube.com/';
    }

    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    if (referer) {
      headers['Referer'] = referer;
      headers['Origin'] = referer.replace(/\/$/, '');
    }

    const rangeHeader = request.headers.get('Range');
    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    const response = await fetch(finalUrl, { headers });

    if (!response.ok && response.status !== 206) {
      return NextResponse.json(
        { error: `Failed to fetch media (status: ${response.status})` },
        { status: 502 }
      );
    }

    // Determine content type based on format
    let contentType = response.headers.get('Content-Type') || 'video/mp4';
    if (format === 'mp3') {
      contentType = 'audio/mpeg';
    }

    const contentLength = response.headers.get('Content-Length') || '';

    // Stream the response body
    const body = response.body;
    if (!body) {
      return NextResponse.json(
        { error: 'Empty response from source' },
        { status: 502 }
      );
    }

    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, max-age=0',
      'Access-Control-Allow-Origin': '*',
    };

    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    }

    return new Response(body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy download' },
      { status: 500 }
    );
  }
}