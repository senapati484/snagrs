import type { DownloadResult, DownloadFormat } from '@/types';
import type { SnagError } from '@/types';
import { generateFilename, detectPlatform } from '@/lib/utils';

function extractVideoId(url: string): string {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    // Look for video ID in path (usually after @username/video/)
    const videoIdx = pathParts.indexOf('video');
    if (videoIdx !== -1 && pathParts[videoIdx + 1]) {
      return pathParts[videoIdx + 1];
    }
    // Or find any numeric ID
    const numericPart = pathParts.find(p => /^\d+$/.test(p));
    return numericPart || '';
  } catch {
    return '';
  }
}

export async function extractTikTok(
  url: string,
  format: DownloadFormat
): Promise<DownloadResult> {
  try {
    const videoId = extractVideoId(url);
    
    // Try 1: TikTok oEmbed (works for some cases)
    try {
      const oembedUrl = `https://www.tiktok.com/api/aweme/v1/web/aweme/detail/?aweme_id=${videoId}`;
      const oembedRes = await fetch(oembedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        const awemeData = data?.aweme_detail || data;
        
        if (awemeData?.video?.play_addr?.url_list?.length) {
          return {
            downloadUrl: awemeData.video.play_addr.url_list[0],
            filename: generateFilename('tiktok', format),
            format,
            platform: detectPlatform(url),
          };
        }
      }
    } catch {}

    // Try 2: Web page scraping
    const pageRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    
    if (!pageRes.ok) {
      throw { message: 'Could not extract TikTok video. The video may be private.' } as SnagError;
    }
    
    const html = await pageRes.text();
    
    // Try to find in various data structures
    
    // SIGI_STATE (older format)
    const sigiMatch = html.match(/<script id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/);
    if (sigiMatch) {
      try {
        const sigiData = JSON.parse(sigiMatch[1]);
        
        // Try ItemModule
        if (sigiData?.ItemModule) {
          const items = Object.values(sigiData.ItemModule);
          for (const item of items as Record<string, unknown>[]) {
            const video = (item as Record<string, unknown>).video as Record<string, unknown>;
            if (video?.downloadAddr) {
              return {
                downloadUrl: video.downloadAddr as string,
                filename: generateFilename('tiktok', format),
                format,
                platform: detectPlatform(url),
              };
            }
          }
        }
        
        // Try aweme_v2
        if (sigiData?.aweme_v2?.detail?.aweme_info) {
          const info = sigiData.aweme_v2.detail.aweme_info as Record<string, unknown>;
          const video = info.video as Record<string, unknown>;
          if (video?.downloadAddr) {
            return {
              downloadUrl: video.downloadAddr as string,
              filename: generateFilename('tiktok', format),
              format,
              platform: detectPlatform(url),
            };
          }
        }
      } catch {}
    }
    
    // WEBAPP_STATE (newer format)
    const webappMatch = html.match(/<script id="WEBAPP_STATE"[^>]*>([\s\S]*?)<\/script>/);
    if (webappMatch) {
      try {
        const webData = JSON.parse(webappMatch[1]);
        
        // Look for video data in various possible locations
        if (webData?.AwemeRoute?.data?.awemeDetail) {
          const detail = webData.AwemeRoute.data.awemeDetail as Record<string, unknown>;
          const video = detail.video as Record<string, unknown>;
          if (video?.downloadAddr) {
            return {
              downloadUrl: video.downloadAddr as string,
              filename: generateFilename('tiktok', format),
              format,
              platform: detectPlatform(url),
            };
          }
        }
      } catch {}
    }
    
    // JSON-LD
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd?.video?.contentUrl) {
          return {
            downloadUrl: jsonLd.video.contentUrl,
            filename: generateFilename('tiktok', format),
            format,
            platform: detectPlatform(url),
          };
        }
      } catch {}
    }
    
    // Direct regex for video_url
    const playAddrMatch = html.match(/"playAddr"\s*:\s*"([^"]+)"/);
    if (playAddrMatch) {
      return {
        downloadUrl: playAddrMatch[1].replace(/\\u0026/g, '&'),
        filename: generateFilename('tiktok', format),
        format,
        platform: detectPlatform(url),
      };
    }
    
    // downloadAddr
    const downloadAddrMatch = html.match(/"downloadAddr"\s*:\s*"([^"]+)"/);
    if (downloadAddrMatch) {
      return {
        downloadUrl: downloadAddrMatch[1].replace(/\\u0026/g, '&'),
        filename: generateFilename('tiktok', format),
        format,
        platform: detectPlatform(url),
      };
    }
    
    throw { message: 'Could not extract TikTok video. The video may be private.' } as SnagError;
  } catch (error) {
    if ((error as SnagError).message) {
      throw error;
    }
    throw { message: 'Could not extract TikTok video. The video may be private.' } as SnagError;
  }
}
