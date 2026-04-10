import type { DownloadResult, DownloadFormat, QualityOption } from '@/types';
import type { SnagError } from '@/types';
import { generateFilename } from '@/lib/utils';

function extractTweetId(url: string): string {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    // Handle /user/status/TWEET_ID format
    const statusIdx = pathParts.indexOf('status');
    if (statusIdx !== -1 && pathParts[statusIdx + 1]) {
      return pathParts[statusIdx + 1].split('?')[0];
    }
    // Fallback: last numeric segment
    const numeric = pathParts.reverse().find((p) => /^\d+$/.test(p));
    return numeric || '';
  } catch {
    return '';
  }
}

interface FxTwitterVariant {
  url?: string;
  content_type?: string;
  bitrate?: number;
  type?: string;
  height?: number;
  width?: number;
}

interface FxTwitterMedia {
  type?: string;
  url?: string;
  thumbnail_url?: string;
  variants?: FxTwitterVariant[];
  video_info?: {
    variants?: FxTwitterVariant[];
  };
}

interface FxTwitterResponse {
  code?: number;
  message?: string;
  tweet?: {
    media?: {
      videos?: FxTwitterMedia[];
      all?: FxTwitterMedia[];
    };
    video?: {
      url?: string;
      variants?: FxTwitterVariant[];
    };
  };
}

export async function extractTwitter(
  url: string,
  format: DownloadFormat,
  quality?: string
): Promise<DownloadResult> {
  const tweetId = extractTweetId(url);

  if (!tweetId) {
    throw { message: 'Invalid Twitter/X URL' } as SnagError;
  }

  try {
    let downloadUrl: string | undefined;
    let availableQualities: QualityOption[] = [];

    // Strategy 1: Use fxtwitter API (most reliable)
    try {
      const fxRes = await fetch(`https://api.fxtwitter.com/status/${tweetId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Snagr/1.0)',
          Accept: 'application/json',
        },
      });

      if (fxRes.ok) {
        const data = (await fxRes.json()) as FxTwitterResponse;
        const tweet = data?.tweet;

        if (tweet) {
          // Check for video in media.videos
          const videos = tweet.media?.videos;
          if (videos && videos.length > 0) {
            const video = videos[0];

            // Extract variants with quality info
            if (video.video_info?.variants) {
              availableQualities = video.video_info.variants
                .filter((v: FxTwitterVariant) => v.content_type?.includes('video/mp4'))
                .map((v: FxTwitterVariant, i: number) => ({
                  label: v.height ? `${v.height}p` : `Quality ${i + 1}`,
                  value: i.toString(),
                  height: v.height,
                  bitrate: v.bitrate,
                }))
                .sort((a: { height?: number }, b: { height?: number }) => (b.height || 0) - (a.height || 0));
            }

            if (video.url) {
              downloadUrl = video.url;
            }
          }

          // Check for video in media.all
          if (!downloadUrl && tweet.media?.all) {
            for (const media of tweet.media.all) {
              if (media.type === 'video' || media.type === 'gif') {
                if (media.url) {
                  downloadUrl = media.url;
                  break;
                }
              }
            }
          }
        }
      }
    } catch {
      // fxtwitter failed, try next strategy
    }

    // Strategy 2: Use vxtwitter (alternative)
    if (!downloadUrl) {
      try {
        const vxRes = await fetch(
          `https://api.vxtwitter.com/status/${tweetId}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Snagr/1.0)',
              Accept: 'application/json',
            },
          }
        );

        if (vxRes.ok) {
          const data = (await vxRes.json()) as FxTwitterResponse;
          const tweet = data?.tweet;

          if (tweet?.media?.videos && tweet.media.videos.length > 0) {
            const video = tweet.media.videos[0];
            if (video.url) {
              downloadUrl = video.url;
            }
          }
        }
      } catch {
        // vxtwitter failed too
      }
    }

    // Strategy 3: Twitter syndication API
    if (!downloadUrl) {
      try {
        const syndicationUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&features=tfw_timeline_list:;tfw_follower_count_sunset:true;tfw_tweet_edit_backend:on;tfw_refsrc_session:on;tfw_fosnr_soft_interventions_enabled:on;tfw_show_birdwatch_pivots_enabled:on;tfw_show_business_verified_badge:on;tfw_duplicate_scribes_to_settings:on;tfw_use_profile_image_shape_enabled:on;tfw_show_blue_verified_badge:on;tfw_legacy_timeline_sunset:true;tfw_show_gov_verified_badge:on;tfw_show_business_affiliate_badge:on;tfw_tweet_edit_frontend:on`;
        const synRes = await fetch(syndicationUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        if (synRes.ok) {
          const data = await synRes.json();
          const mediaDetails = data?.mediaDetails;

          if (Array.isArray(mediaDetails)) {
            for (const media of mediaDetails) {
              if (
                media.type === 'video' ||
                media.type === 'animated_gif'
              ) {
                const variants = media.video_info?.variants || [];
                const mp4Variants = variants.filter(
                  (v: FxTwitterVariant) =>
                    v.content_type?.includes('video/mp4')
                );

                if (mp4Variants.length > 0) {
                  availableQualities = mp4Variants
                    .map((v: FxTwitterVariant, i: number) => ({
                      label: v.height ? `${v.height}p` : `Quality ${i + 1}`,
                      value: i.toString(),
                      height: v.height,
                      bitrate: v.bitrate,
                    }))
                    .sort((a: { height?: number }, b: { height?: number }) => (b.height || 0) - (a.height || 0));

                  mp4Variants.sort(
                    (a: FxTwitterVariant, b: FxTwitterVariant) =>
                      (b.bitrate || 0) - (a.bitrate || 0)
                  );
                  downloadUrl = mp4Variants[0].url;
                  break;
                }
              }
            }
          }
        }
      } catch {
        // syndication failed too
      }
    }

    if (!downloadUrl) {
      throw {
        message:
          'No video found in this tweet. Make sure the tweet contains a video and is public.',
      } as SnagError;
    }

    return {
      downloadUrl,
      filename: generateFilename('twitter', format),
      format,
      platform: 'twitter',
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
      message: 'Could not extract video from this tweet.',
    } as SnagError;
  }
}
