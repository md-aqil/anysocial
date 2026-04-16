import axios from 'axios';
import type { PlatformAdapter, PlatformPayload, PublishResult, ValidationResult } from './platform-adapter.interface.js';
import { getPlatformRules } from '../config/platform-rules.js';

export class InstagramAdapter implements PlatformAdapter {
  /**
   * Prepare content for Instagram
   * - Strip excessive hashtags (>30)
   * - Enforce character limit (2200)
   */
  prepareContent(content: string): PlatformPayload {
    const rules = getPlatformRules('INSTAGRAM');

    // Count and limit hashtags
    const hashtagRegex = /#[\w]+/g;
    const hashtags = content.match(hashtagRegex) || [];
    
    let processedContent = content;
    if (hashtags.length > rules.hashtagLimit) {
      // Remove excess hashtags from the end
      const excessCount = hashtags.length - rules.hashtagLimit;
      const excessHashtags = hashtags.slice(-excessCount);
      excessHashtags.forEach((tag) => {
        processedContent = processedContent.replace(tag, '');
      });
    }

    // Truncate to max chars if needed
    if (processedContent.length > rules.maxChars) {
      processedContent = processedContent.substring(0, rules.maxChars - 3) + '...';
    }

    return {
      caption: processedContent.trim(),
      mediaUrls: [],
      metadata: {
        originalHashtagCount: hashtags.length,
        processedHashtagCount: (processedContent.match(hashtagRegex) || []).length
      },
      platformSpecificFields: {}
    };
  }

  /**
   * Format media URLs for Instagram
   * Instagram requires specific aspect ratios: 1:1, 4:5, or 16:9
   */
  formatMediaUrls(mediaUrls: string[]): string[] {
    // Instagram accepts URLs directly, but they must meet aspect ratio requirements
    // Validation happens before upload
    return mediaUrls;
  }

  /**
   * Validate payload meets Instagram requirements
   */
  validatePayload(payload: PlatformPayload): ValidationResult {
    const errors: string[] = [];
    const rules = getPlatformRules('INSTAGRAM');

    if (payload.caption.length > rules.maxChars) {
      errors.push(`Caption exceeds ${rules.maxChars} characters`);
    }

    if (payload.mediaUrls.length === 0) {
      errors.push('At least one media item required');
    }

    if (payload.mediaUrls.length > rules.maxMediaCount) {
      errors.push(`Maximum ${rules.maxMediaCount} media items allowed for carousel`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Publish to Instagram via Graph API
   * 
   * Instagram requires a two-step process:
   * 1. Create a media container
   * 2. Publish the container (requires 1-2 second delay)
   * 
   * For carousels, create multiple containers then publish as carousel
   */
  async publish(accountId: string, payload: PlatformPayload): Promise<PublishResult> {
    try {
      const accessToken = payload.platformSpecificFields.accessToken as string;
      const pageId = payload.platformSpecificFields.pageId as string;

      if (!accessToken || !pageId) {
        throw new Error('Missing Instagram credentials');
      }

      let mediaContainerId: string;

      // Handle carousel vs single media
      if (payload.mediaUrls.length > 1) {
        // Carousel post
        const containerIds: string[] = [];

        for (const mediaUrl of payload.mediaUrls) {
          const isVideo = mediaUrl.includes('.mp4');
          const containerEndpoint = `https://graph.facebook.com/v21.0/${pageId}/media`;

          // Create container for each media item
          // Note: carousel items use 'VIDEO', standalone reels use 'REELS'
          const containerResponse = await axios.post(containerEndpoint, {
            is_carousel_item: true,
            media_type: isVideo ? 'VIDEO' : 'IMAGE',
            image_url: isVideo ? undefined : mediaUrl,
            video_url: isVideo ? mediaUrl : undefined,
            access_token: accessToken
          });

          containerIds.push(containerResponse.data.id);
        }

        // Create parent carousel container
        const carouselContainerResponse = await axios.post(
          `https://graph.facebook.com/v21.0/${pageId}/media`,
          {
            is_carousel: true,
            children: containerIds.join(','),
            caption: payload.caption,
            access_token: accessToken
          }
        );

        mediaContainerId = carouselContainerResponse.data.id;
      } else {
        // Single media post
        const isVideo = payload.mediaUrls[0].includes('.mp4');
        const mediaUrl = payload.mediaUrls[0];
        const containerEndpoint = `https://graph.facebook.com/v21.0/${pageId}/media`;

        if (mediaUrl.includes('localhost') || mediaUrl.includes('127.0.0.1')) {
          console.warn('!!!! INSTAGRAM PUBLISH WARNING !!!!');
          console.warn('Instagram cannot download media from localhost. Please use a public URL (e.g. via ngrok).');
          return {
            success: false,
            platformPostId: '',
            url: '',
            error: 'Instagram requires a public URL for media. Localhost is not supported. Please use ngrok.'
          };
        }

        console.log(`[IG PUBLISH] Attempting to publish to Page: ${pageId}`);
        console.log(`[IG PUBLISH] Media URL: ${mediaUrl}`);

        const containerResponse = await axios.post(containerEndpoint, {
          media_type: isVideo ? 'REELS' : undefined,
          image_url: isVideo ? undefined : mediaUrl,
          video_url: isVideo ? mediaUrl : undefined,
          caption: payload.caption,
          share_to_feed: isVideo ? (payload.platformSpecificFields.shareToFeed ?? true) : undefined,
          access_token: accessToken
        });

        mediaContainerId = containerResponse.data.id;
        console.log(`[IG PUBLISH] Created container: ${mediaContainerId}`);
      }

      // Polling for container readiness
      console.log(`[IG PUBLISH] Status polling started for: ${mediaContainerId}`);
      let isReady = false;
      let attempts = 0;
      const maxAttempts = 90; // 3 minutes total (90 * 2s)

      while (!isReady && attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const statusResponse = await axios.get(
            `https://graph.facebook.com/v21.0/${mediaContainerId}`,
            {
              params: {
                fields: 'status_code',
                access_token: accessToken
              }
            }
          );
          
          const status = statusResponse.data.status_code as string;
          console.log(`[IG PUBLISH] Attempt ${attempts}: Status is ${status}`);
          
          if (status === 'FINISHED') {
            isReady = true;
          } else if (status === 'IN_PROGRESS') {
            continue;
          } else if (status === 'ERROR') {
            throw new Error(`Instagram container failed processing with status: ERROR`);
          } else if (status === 'EXPIRED') {
            throw new Error('Instagram media container expired before it could be published. Please retry.');
          }
        } catch (err: any) {
          console.warn(`[IG PUBLISH] Polling error: ${err.message}`);
        }
      }

      if (!isReady) {
        throw new Error(
          'Instagram media container processing timed out after 3 minutes. The container may still be processing — please retry later.'
        );
      }

      // Publish the container
      const publishResponse = await axios.post(
        `https://graph.facebook.com/v21.0/${pageId}/media_publish`,
        {
          creation_id: mediaContainerId,
          access_token: accessToken
        }
      );

      return {
        success: true,
        platformPostId: publishResponse.data.id,
        url: `https://www.instagram.com/p/${publishResponse.data.id}`
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
      const errorDetail = error.response?.data?.error?.error_user_msg || '';

      console.error(`[IG PUBLISH ERROR] ${errorMessage}`);
      if (error.response?.data) {
        console.error(`[IG PUBLISH DETAIL] ${JSON.stringify(error.response.data)}`);
      }

      return {
        success: false,
        platformPostId: '',
        url: '',
        error: `Instagram publish failed: ${errorMessage}${errorDetail ? ` - ${errorDetail}` : ''}`
      };
    }
  }
}

export const instagramAdapter = new InstagramAdapter();
