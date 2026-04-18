import axios from 'axios';
import type { PlatformAdapter, PlatformPayload, PublishResult, ValidationResult } from './platform-adapter.interface.js';
import { getPlatformRules } from '../config/platform-rules.js';

export class ThreadsAdapter implements PlatformAdapter {
  /**
   * Prepare content for Threads
   * - Enforce character limit (500)
   */
  prepareContent(content: string): PlatformPayload {
    const rules = getPlatformRules('THREADS');

    let processedContent = content;

    // Truncate to max chars if needed
    if (processedContent.length > rules.maxChars) {
      processedContent = processedContent.substring(0, rules.maxChars - 3) + '...';
    }

    return {
      caption: processedContent.trim(),
      mediaUrls: [],
      metadata: {},
      platformSpecificFields: {}
    };
  }

  /**
   * Format media URLs for Threads
   */
  formatMediaUrls(mediaUrls: string[]): string[] {
    return mediaUrls;
  }

  /**
   * Validate payload meets Threads requirements
   */
  validatePayload(payload: PlatformPayload): ValidationResult {
    const errors: string[] = [];
    const rules = getPlatformRules('THREADS');

    if (payload.caption.length > rules.maxChars) {
      errors.push(`Caption exceeds ${rules.maxChars} characters`);
    }

    // Threads allows text-only posts, so we don't strictly require media like Instagram does.
    if (payload.mediaUrls.length > rules.maxMediaCount) {
      errors.push(`Maximum ${rules.maxMediaCount} media items allowed`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Publish to Threads via Graph API
   */
  async publish(accountId: string, payload: PlatformPayload): Promise<PublishResult> {
    try {
      const accessToken = payload.platformSpecificFields.accessToken as string;

      if (!accessToken) {
        throw new Error('Missing Threads credentials');
      }

      let mediaContainerId: string;

      // Single item or text only
      if (payload.mediaUrls.length <= 1) {
        const hasMedia = payload.mediaUrls.length === 1;
        let isVideo = false;
        let mediaUrl = undefined;
        
        if (hasMedia) {
          mediaUrl = payload.mediaUrls[0];
          isVideo = mediaUrl.includes('.mp4');

          if (mediaUrl.includes('localhost') || mediaUrl.includes('127.0.0.1')) {
            throw new Error('Threads requires a public URL for media. Localhost is not supported. Please use ngrok.');
          }
        }

        console.log(`[THREADS PUBLISH] Creating container...`);

        // Create container
        const containerResponse = await axios.post('https://graph.threads.net/v1.0/me/threads', null, {
          params: {
            media_type: hasMedia ? (isVideo ? 'VIDEO' : 'IMAGE') : 'TEXT',
            text: payload.caption || undefined,
            image_url: hasMedia && !isVideo ? mediaUrl : undefined,
            video_url: hasMedia && isVideo ? mediaUrl : undefined,
            access_token: accessToken
          }
        });

        mediaContainerId = containerResponse.data.id;
        console.log(`[THREADS PUBLISH] Created container: ${mediaContainerId}`);
      } else {
        // Carousel post
        const containerIds: string[] = [];

        for (const mediaUrl of payload.mediaUrls) {
          const isVideo = mediaUrl.includes('.mp4');
          if (mediaUrl.includes('localhost') || mediaUrl.includes('127.0.0.1')) {
             throw new Error('Threads requires a public URL for media. Localhost is not supported. Please use ngrok.');
          }

          // Create item container
          const containerResponse = await axios.post('https://graph.threads.net/v1.0/me/threads', null, {
            params: {
              media_type: isVideo ? 'VIDEO' : 'IMAGE',
              is_carousel_item: true,
              image_url: isVideo ? undefined : mediaUrl,
              video_url: isVideo ? mediaUrl : undefined,
              access_token: accessToken
            }
          });

          containerIds.push(containerResponse.data.id);
        }

        // Create parent carousel container
        const carouselContainerResponse = await axios.post('https://graph.threads.net/v1.0/me/threads', null, {
          params: {
            media_type: 'CAROUSEL',
            children: containerIds.join(','),
            text: payload.caption || undefined,
            access_token: accessToken
          }
        });

        mediaContainerId = carouselContainerResponse.data.id;
        console.log(`[THREADS PUBLISH] Created carousel container: ${mediaContainerId}`);
      }

      // Polling for container readiness
      console.log(`[THREADS PUBLISH] Polling status for container: ${mediaContainerId}`);
      let isReady = false;
      let attempts = 0;
      const maxAttempts = 90; // 3 minutes total (90 * 2s)

      while (!isReady && attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const statusResponse = await axios.get(
            `https://graph.threads.net/v1.0/${mediaContainerId}`,
            {
              params: {
                fields: 'status',
                access_token: accessToken
              }
            }
          );
          
          const status = statusResponse.data.status as string;
          console.log(`[THREADS PUBLISH] Attempt ${attempts}: Status is ${status}`);
          
          if (status === 'FINISHED') {
            isReady = true;
          } else if (status === 'IN_PROGRESS') {
            continue;
          } else if (status === 'ERROR') {
            const errorMsg = statusResponse.data.error_message || 'Unknown processing error';
            throw new Error(`Threads container failed processing: ${errorMsg}`);
          } else if (status === 'EXPIRED') {
            throw new Error('Threads media container expired before it could be published. Please retry.');
          }
        } catch (err: any) {
          if (err.response?.status === 400 && err.response?.data?.error?.message?.includes('not found')) {
            // Container might not be instantly available to query
            console.warn(`[THREADS PUBLISH] Container status checking delayed...`);
          } else if (err.message && err.message.includes('failed processing')) {
            throw err;
          } else {
             console.warn(`[THREADS PUBLISH] Polling error: ${err.message}`);
          }
        }
      }

      if (!isReady) {
        throw new Error('Threads media container processing timed out after 3 minutes. Please retry.');
      }

      // Publish the container
      const publishResponse = await axios.post(
        `https://graph.threads.net/v1.0/me/threads_publish`, null,
        {
          params: {
            creation_id: mediaContainerId,
            access_token: accessToken
          }
        }
      );

      return {
        success: true,
        platformPostId: publishResponse.data.id,
        url: `https://www.threads.net/post/${publishResponse.data.id}` // Approximation based on ID, Threads API doesn't always return permalink
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
      console.error(`[THREADS PUBLISH ERROR] ${errorMessage}`);

      return {
        success: false,
        platformPostId: '',
        url: '',
        error: `Threads publish failed: ${errorMessage}`
      };
    }
  }
}

export const threadsAdapter = new ThreadsAdapter();
