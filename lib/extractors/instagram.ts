import type { DownloadResult, DownloadFormat } from '@/types';
import type { SnagError } from '@/types';
import { generateFilename, detectPlatform } from '@/lib/utils';

function extractShortcode(url: string): string {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    const shortcode = pathParts.find(p => p && !['p', 'reels', 'tv'].includes(p.toLowerCase()));
    return shortcode || pathParts[pathParts.length - 1] || '';
  } catch {
    return '';
  }
}

export async function extractInstagram(
  url: string,
  format: DownloadFormat
): Promise<DownloadResult> {
  try {
    const shortcode = extractShortcode(url);
    
    if (!shortcode) {
      throw { message: 'Invalid Instagram URL' } as SnagError;
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    // Try 1: oEmbed API
    try {
      const oembedUrl = `https://www.instagram.com/oembed/?url=${encodeURIComponent(url)}`;
      const oembedRes = await fetch(oembedUrl, { headers });
      
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        if (oembedData.is_video && oembedData.thumbnail_url) {
          return {
            downloadUrl: oembedData.thumbnail_url,
            filename: generateFilename('instagram', format),
            format,
            platform: detectPlatform(url),
          };
        }
      }
    } catch {}

    // Try 2: Mobile web scraping
    const mobileUrl = `https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`;
    const mobileRes = await fetch(mobileUrl, { headers });
    
    if (mobileRes.ok) {
      try {
        const contentType = mobileRes.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await mobileRes.json();
          const media = data?.graphql?.shortcode_media || data?.data?.shortcode_media;
          
          if (media) {
            if (media.video_url) {
              return {
                downloadUrl: media.video_url,
                filename: generateFilename('instagram', format),
                format,
                platform: detectPlatform(url),
              };
            }
            
            // Check carousel
            if (media.edge_sidecar_to_children?.edges) {
              for (const edge of media.edge_sidecar_to_children.edges) {
                if (edge.node.is_video && edge.node.video_url) {
                  return {
                    downloadUrl: edge.node.video_url,
                    filename: generateFilename('instagram', format),
                    format,
                    platform: detectPlatform(url),
                  };
                }
              }
            }
          }
        }
      } catch {}
    }

    // Try 3: Regular page HTML scraping
    const pageRes = await fetch(url, { headers });
    
    if (pageRes.ok) {
      const html = await pageRes.text();
      
      // Look for JSON-LD
      const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      if (jsonLdMatch) {
        try {
          const jsonLd = JSON.parse(jsonLdMatch[1]);
          if (jsonLd.video?.contentUrl) {
            return {
              downloadUrl: jsonLd.video.contentUrl,
              filename: generateFilename('instagram', format),
              format,
              platform: detectPlatform(url),
            };
          }
        } catch {}
      }
      
      // Look for sharedData
      const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({[\s\S]*?});/);
      if (sharedDataMatch) {
        try {
          const sharedData = JSON.parse(sharedDataMatch[1]);
          const media = sharedData?.entry_data?.PostPage?.[0]?.shortcode_media;
          
          if (media?.video_url) {
            return {
              downloadUrl: media.video_url,
              filename: generateFilename('instagram', format),
              format,
              platform: detectPlatform(url),
            };
          }
        } catch {}
      }
      
      // Look for edge_media_to_parent_comment or other data
      const edgeMatch = html.match(/"video_url"\s*:\s*"([^"]+)"/);
      if (edgeMatch) {
        return {
          downloadUrl: edgeMatch[1].replace(/\\u0026/g, '&'),
          filename: generateFilename('instagram', format),
          format,
          platform: detectPlatform(url),
        };
      }
    }

    throw { message: 'Could not extract Instagram video. Make sure the post is public.' } as SnagError;
  } catch (error) {
    if ((error as SnagError).message) {
      throw error;
    }
    throw { message: 'Could not extract Instagram video. Make sure the post is public.' } as SnagError;
  }
}
