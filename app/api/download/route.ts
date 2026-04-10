import { NextRequest, NextResponse } from 'next/server';
import { resolveDownload } from '@/lib/router';
import type { SnagError } from '@/types';

const requestCounts = new Map<string, { count: number; resetTime: number }>();

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60000;
  const maxRequests = 10;
  
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

export async function POST(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json();
    const { url, format, quality } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['mp4', 'mp3'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400, headers: corsHeaders }
      );
    }

    const clientIp = getClientIp(request);
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: corsHeaders }
      );
    }

    const result = await resolveDownload({ url, format, quality });
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    console.error('Download error:', error);

    if ((error as SnagError).message) {
      return NextResponse.json(
        { error: (error as SnagError).message },
        { status: 422, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}
