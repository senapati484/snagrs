import type { DownloadResult, DownloadFormat, QualityOption } from '@/types';
import type { SnagError } from '@/types';
import { generateFilename } from '@/lib/utils';

function extractVideoId(url: string): string {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    const videoIdx = pathParts.indexOf('video');
    if (videoIdx !== -1 && pathParts[videoIdx + 1]) {
      return pathParts[videoIdx + 1].split('?')[0];
    }
    const numericPart = pathParts.find((p) => /^\d+$/.test(p));
    return numericPart || '';
  } catch {
    return '';
  }
}

// Mobile user agent to get simpler page structure
const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function extractTikTok(
  url: string,
  format: DownloadFormat,
  quality?: string
): Promise<DownloadResult> {
  try {
    // Resolve short URLs (vm.tiktok.com) to full URLs
    let resolvedUrl = url;
    if (url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com')) {
      try {
        const redirectRes = await fetch(url, {
          method: 'HEAD',
          redirect: 'follow',
          headers: { 'User-Agent': MOBILE_UA },
        });
        if (redirectRes.url) {
          resolvedUrl = redirectRes.url;
        }
      } catch {
        // Continue with original URL
      }
    }

    const videoId = extractVideoId(resolvedUrl);

    // Strategy 1: Fetch TikTok page and parse __UNIVERSAL_DATA_FOR_REHYDRATION__
    let downloadUrl: string | undefined;
    let availableQualities: QualityOption[] = [];

    try {
      const pageRes = await fetch(resolvedUrl, {
        headers: {
          'User-Agent': DESKTOP_UA,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
        },
        redirect: 'follow',
      });

      if (pageRes.ok) {
        const html = await pageRes.text();

        // Try __UNIVERSAL_DATA_FOR_REHYDRATION__ (current TikTok format)
        const universalMatch = html.match(
          /<script\s+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
        );
        if (universalMatch) {
          try {
            const universalData = JSON.parse(universalMatch[1]);
            // Navigate to video data - TikTok nests it deep
            const defaultScope = universalData?.__DEFAULT_SCOPE__;
            const webappData =
              defaultScope?.['webapp.video-detail']?.itemInfo?.itemStruct;

            if (webappData?.video) {
              downloadUrl =
                webappData.video.downloadAddr ||
                webappData.video.playAddr ||
                webappData.video.play_addr?.url_list?.[0];

              // Extract available qualities from video data
              if (webappData.video.play_addr?.url_list) {
                const urlList = webappData.video.play_addr.url_list;
                availableQualities = urlList.map((u: string, i: number) => ({
                  label: i === 0 ? 'HD' : i === 1 ? 'SD' : `Quality ${i + 1}`,
                  value: i.toString(),
                }));
              }
            }
          } catch {
            // Parse failed, try next pattern
          }
        }

        // Try SIGI_STATE (older but still used sometimes)
        if (!downloadUrl) {
          const sigiMatch = html.match(
            /<script\s+id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/
          );
          if (sigiMatch) {
            try {
              const sigiData = JSON.parse(sigiMatch[1]);
              if (sigiData?.ItemModule) {
                const items = Object.values(sigiData.ItemModule) as Array<{
                  video?: { downloadAddr?: string; playAddr?: string; bitrateInfo?: Array<{ label?: string }> };
                }>;
                for (const item of items) {
                  if (item?.video?.downloadAddr) {
                    downloadUrl = item.video.downloadAddr;
                    break;
                  }
                  if (item?.video?.playAddr) {
                    downloadUrl = item.video.playAddr;
                    break;
                  }
                }
              }
            } catch {
              // Parse failed
            }
          }
        }

        // Try JSON-LD
        if (!downloadUrl) {
          const jsonLdMatch = html.match(
            /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/
          );
          if (jsonLdMatch) {
            try {
              const jsonLd = JSON.parse(jsonLdMatch[1]);
              if (jsonLd?.contentUrl) {
                downloadUrl = jsonLd.contentUrl;
              } else if (jsonLd?.video?.contentUrl) {
                downloadUrl = jsonLd.video.contentUrl;
              }
            } catch {
              // Parse failed
            }
          }
        }

        // Direct regex patterns as last resort
        if (!downloadUrl) {
          const patterns = [
            /"playAddr"\s*:\s*"([^"]+)"/,
            /"downloadAddr"\s*:\s*"([^"]+)"/,
            /"play_addr"[^}]*"url_list"\s*:\s*\["([^"]+)"/,
          ];
          for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match?.[1]) {
              downloadUrl = match[1]
                .replace(/\\u0026/g, '&')
                .replace(/\\u002F/g, '/');
              break;
            }
          }
        }
      }
    } catch {
      // Page fetch failed
    }

    // Strategy 2: Try TikTok API with video ID
    if (!downloadUrl && videoId) {
      try {
        const apiUrl = `https://api16-normal-c-useast1a.tiktokv.com/aweme/v1/feed/?aweme_id=${videoId}`;
        const apiRes = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'TikTok 26.2.0 rv:262018 (iPhone; iOS 14.4.2; en_US) Cronet',
          },
        });

        if (apiRes.ok) {
          const data = await apiRes.json();
          const awemeList = data?.aweme_list;
          if (Array.isArray(awemeList) && awemeList.length > 0) {
            const video = awemeList[0]?.video;
            if (video) {
              downloadUrl =
                video.play_addr?.url_list?.[0] ||
                video.download_addr?.url_list?.[0];

              // Extract qualities from API
              if (video.play_addr?.url_list) {
                const urlList = video.play_addr.url_list;
                availableQualities = urlList.map((u: string, i: number) => ({
                  label: i === 0 ? 'HD' : i === 1 ? 'SD' : `Quality ${i + 1}`,
                  value: i.toString(),
                }));
              }
            }
          }
        }
      } catch {
        // API failed
      }
    }

    if (!downloadUrl) {
      throw {
        message:
          'Could not extract TikTok video. The video may be private or the link may be invalid.',
      } as SnagError;
    }

    // Clean up URL if needed
    downloadUrl = downloadUrl
      .replace(/\\u0026/g, '&')
      .replace(/\\u002F/g, '/');

    return {
      downloadUrl,
      filename: generateFilename('tiktok', format),
      format,
      platform: 'tiktok',
      quality: quality || 'auto',
      availableQualities: availableQualities.length > 0 ? availableQualities : [{ label: 'Best', value: '0' }],
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
      message: 'Could not extract TikTok video. The video may be private.',
    } as SnagError;
  }
}
