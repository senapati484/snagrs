import type { DownloadResult, DownloadFormat } from '@/types';
import type { SnagError } from '@/types';
import { generateFilename, detectPlatform } from '@/lib/utils';

function extractTweetId(url: string): string {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    return pathParts[pathParts.length - 1] || '';
  } catch {
    return '';
  }
}

export async function extractTwitter(
  url: string,
  format: DownloadFormat
): Promise<DownloadResult> {
  try {
    const tweetId = extractTweetId(url);
    
    if (!tweetId) {
      throw { message: 'Invalid Twitter URL' } as SnagError;
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    };

    // Try 1: Mobile Twitter page
    const mobileUrl = `https://mobile.twitter.com/i/status/${tweetId}`;
    const mobileRes = await fetch(mobileUrl, { headers });
    
    let downloadUrl: string | undefined;
    
    if (mobileRes.ok) {
      const html = await mobileRes.text();
      
      // Look for video data in JSON
      const jsonMatch = html.match(/JSON\.parse\(decodeURIComponent\("([^"]+)"\)\)/);
      if (jsonMatch) {
        try {
          const decoded = decodeURIComponent(jsonMatch[1].replace(/\\"/g, '"'));
          const data = JSON.parse(decoded);
          
          if (data?.data?.tweetResult?.result?.legacy?.extended_entities?.media) {
            const media = data.data.tweetResult.result.legacy.extended_entities.media;
            for (const m of media) {
              if (m.type === 'video' || m.type === 'animated_gif') {
                const variants = m.video_info?.variants || [];
                const mp4s = variants.filter((v: Record<string, unknown>) => (v as Record<string, string>).content_type?.includes('mp4'));
                if (mp4s.length > 0) {
                  mp4s.sort((a: Record<string, unknown>, b: Record<string, unknown>) => ((b.bitrate as number) ?? 0) - ((a.bitrate as number) ?? 0));
                  downloadUrl = (mp4s[0] as Record<string, unknown>).url as string;
                  break;
                }
              }
            }
          }
        } catch {}
      }
      
      // Direct video_url regex
      if (!downloadUrl) {
        const videoMatch = html.match(/"video_url"\s*:\s*"([^"]+)"/);
        if (videoMatch) {
          downloadUrl = videoMatch[1].replace(/\\u0026/g, '&');
        }
      }
    }
    
    // Try 2: Regular twitter.com page
    if (!downloadUrl) {
      const pageRes = await fetch(url, { headers });
      
      if (pageRes.ok) {
        const html = await pageRes.text();
        
        // Try to find media details in script data
        const mediaMatch = html.match(/"mediaDetails"\s*:\s*(\[[\s\S]*?\])/);
        if (mediaMatch) {
          try {
            const mediaDetails = JSON.parse(mediaMatch[1]);
            const videoMedia = mediaDetails.find((m: Record<string, unknown>) => m.type === 'video' || m.type === 'animated_gif');
            if (videoMedia) {
              const variants = (videoMedia as Record<string, unknown>).video_info?.variants || [];
              const mp4s = (variants as Record<string, unknown>[]).filter((v: Record<string, unknown>) => (v as Record<string, string>).content_type?.includes('mp4'));
              if (mp4s.length > 0) {
                mp4s.sort((a: Record<string, unknown>, b: Record<string, unknown>) => ((b.bitrate as number) ?? 0) - ((a.bitrate as number) ?? 0));
                downloadUrl = (mp4s[0] as Record<string, unknown>).url as string;
              }
            }
          } catch {}
        }
      }
    }
    
    // Try 3: Fxtwitter / vxtwitter alternative (redirects work)
    if (!downloadUrl) {
      try {
        const altUrl = `https://fxtwitter.com/i/status/${tweetId}`;
        const altRes = await fetch(altUrl, { 
          headers,
          redirect: 'follow'
        });
        
        if (altRes.ok) {
          const html = await altRes.text();
          const videoMatch = html.match(/"video_url"\s*:\s*"([^"]+)"/);
          if (videoMatch) {
            downloadUrl = videoMatch[1].replace(/\\u0026/g, '&');
          }
        }
      } catch {}
    }
    
    if (!downloadUrl) {
      throw { message: 'No video found in this tweet. Text-only tweets cannot be downloaded.' } as SnagError;
    }
    
    return {
      downloadUrl,
      filename: generateFilename('twitter', format),
      format,
      platform: detectPlatform(url),
    };
  } catch (error) {
    if ((error as SnagError).message) {
      throw error;
    }
    throw { message: 'No video found in this tweet. Text-only tweets cannot be downloaded.' } as SnagError;
  }
}
