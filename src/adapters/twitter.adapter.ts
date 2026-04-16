import axios from 'axios';
import type { PlatformAdapter, PlatformPayload, PublishResult, ValidationResult } from './platform-adapter.interface.js';
import { getPlatformRules } from '../config/platform-rules.js';

export interface TweetThread {
  tweets: string[];
  mediaAttachments: string[][];
}

export class TwitterAdapter implements PlatformAdapter {
  /**
   * Prepare content for Twitter
   * - Enforce 280 character limit
   * - Detect thread if content > 280 chars
   * - URLs count as 23 chars regardless of length
   */
  prepareContent(content: string): PlatformPayload {
    const rules = getPlatformRules('TWITTER');

    // Twitter counts URLs as 23 chars each
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = content.match(urlRegex) || [];
    const urlCharCount = urls.length * 23;

    // Calculate actual character count
    let actualContent = content.replace(urlRegex, 'x'.repeat(23));
    
    // Check if threading is needed
    const isThread = actualContent.length > rules.maxChars;

    let processedContent = content;
    const thread: string[] = [];

    if (isThread) {
      // Split content into thread
      const sentences = content.split(/(?<=[.!?])\s+/);
      let currentTweet = '';

      for (const sentence of sentences) {
        const sentenceUrlCount = (sentence.match(urlRegex) || []).length;
        const sentenceLength = sentence.length + (sentenceUrlCount * (23 - 'http://example.com'.length));

        if ((currentTweet.length + sentenceLength) > rules.maxChars) {
          if (currentTweet) {
            thread.push(currentTweet.trim());
            currentTweet = sentence;
          } else {
            // Single sentence exceeds limit, truncate with ellipsis
            thread.push(sentence.substring(0, rules.maxChars - 3) + '…');
            currentTweet = '';
          }
        } else {
          currentTweet += (currentTweet ? ' ' : '') + sentence;
        }
      }

      if (currentTweet) {
        thread.push(currentTweet.trim());
      }

      processedContent = thread[0];
    } else {
      // Single tweet, truncate if needed
      if (actualContent.length > rules.maxChars) {
        // Find safe truncation point
        const safeLength = rules.maxChars - 3;
        processedContent = content.substring(0, safeLength) + '…';
      }
    }

    return {
      caption: processedContent,
      mediaUrls: [],
      metadata: {
        isThread,
        threadCount: thread.length,
        thread,
        urlCount: urls.length,
        estimatedCharCount: actualContent.length
      },
      platformSpecificFields: {}
    };
  }

  /**
   * Format media URLs for Twitter
   * Twitter requires media_id attachment, not URLs
   */
  formatMediaUrls(mediaUrls: string[]): string[] {
    // Twitter will upload media separately and attach media_ids
    return mediaUrls;
  }

  /**
   * Validate payload meets Twitter requirements
   */
  validatePayload(payload: PlatformPayload): ValidationResult {
    const errors: string[] = [];
    const rules = getPlatformRules('TWITTER');

    // Calculate character count (URLs as 23 chars)
    const urlRegex = /https?:\/\/[^\s]+/g;
    let charCount = payload.caption.replace(urlRegex, 'x'.repeat(23)).length;

    if (charCount > rules.maxChars && !payload.metadata.isThread) {
      errors.push(`Tweet exceeds ${rules.maxChars} characters (currently ${charCount})`);
    }

    if (payload.mediaUrls.length > rules.maxMediaCount) {
      errors.push(`Maximum ${rules.maxMediaCount} media items per tweet`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Publish to Twitter API v2
   * 
   * Flow:
   * 1. Upload media (if any) to get media_ids
   * 2. Create tweet with media_ids attached
   * 3. If thread, create subsequent tweets in_reply_to previous
   */
  async publish(accountId: string, payload: PlatformPayload): Promise<PublishResult> {
    try {
      const accessToken = payload.platformSpecificFields.accessToken as string;

      if (!accessToken) {
        throw new Error('Missing Twitter access token');
      }

      // Step 1: Upload media and get media_ids (if any)
      let mediaIds: string[] = [];
      if (payload.mediaUrls.length > 0) {
        mediaIds = await this.uploadMedia(payload.mediaUrls, accessToken);
      }

      // Step 2: Create tweet(s)
      const thread = (payload.metadata.thread as string[]) || [payload.caption];
      let lastTweetId: string | undefined;

      for (let i = 0; i < thread.length; i++) {
        const tweetText = thread[i];
        const isLastTweet = i === thread.length - 1;

        // Build tweet payload
        const tweetData: any = {
          text: tweetText
        };

        // Attach media only to first tweet
        if (i === 0 && mediaIds.length > 0) {
          tweetData.media = {
            media_ids: mediaIds
          };
        }

        // Reply to previous tweet if threading
        if (lastTweetId) {
          tweetData.reply = {
            in_reply_to_tweet_id: lastTweetId
          };
        }

        // Create tweet
        const response = await axios.post(
          'https://api.twitter.com/2/tweets',
          tweetData,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        lastTweetId = response.data.data.id;

        // If not last tweet, wait briefly to avoid rate limits
        if (!isLastTweet) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      return {
        success: true,
        platformPostId: lastTweetId!,
        url: `https://twitter.com/user/status/${lastTweetId}`
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        platformPostId: '',
        url: '',
        error: `Twitter publish failed: ${errorMessage}`
      };
    }
  }

  /**
   * Upload media to Twitter and return media_ids
   * 
   * Twitter requires chunked upload for media:
   * 1. INIT - Initialize upload
   * 2. APPEND - Upload chunks
   * 3. FINALIZE - Finalize upload
   * 4. STATUS - Check processing status (for videos)
   */
  private async uploadMedia(mediaUrls: string[], accessToken: string): Promise<string[]> {
    const mediaIds: string[] = [];

    for (const mediaUrl of mediaUrls) {
      try {
        // Download media from URL
        const mediaResponse = await axios.get(mediaUrl, {
          responseType: 'arraybuffer'
        });
        const mediaBuffer = Buffer.from(mediaResponse.data);
        const contentType = mediaResponse.headers['content-type'];

        // INIT - Initialize upload
        const initResponse = await axios.post(
          'https://upload.twitter.com/1.1/media/upload.json',
          null,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            },
            params: {
              command: 'INIT',
              media_type: contentType,
              total_bytes: mediaBuffer.length
            }
          }
        );

        const mediaId = initResponse.data.media_id_string;

        // APPEND - Upload media in chunks
        const segmentSize = 5 * 1024 * 1024; // 5MB chunks
        let segmentIndex = 0;

        for (let offset = 0; offset < mediaBuffer.length; offset += segmentSize) {
          const chunk = mediaBuffer.slice(offset, offset + segmentSize);

          const formData = new FormData();
          formData.append('command', 'APPEND');
          formData.append('media_id', mediaId);
          formData.append('segment_index', segmentIndex.toString());
          formData.append('media', new Blob([chunk]));

          await axios.post(
            'https://upload.twitter.com/1.1/media/upload.json',
            formData,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            }
          );

          segmentIndex++;
        }

        // FINALIZE - Complete upload
        const finalizeFormData = new FormData();
        finalizeFormData.append('command', 'FINALIZE');
        finalizeFormData.append('media_id', mediaId);

        await axios.post(
          'https://upload.twitter.com/1.1/media/upload.json',
          finalizeFormData,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );

        // For videos, check processing status
        if (contentType.includes('video')) {
          await this.waitForMediaProcessing(mediaId, accessToken);
        }

        mediaIds.push(mediaId);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to upload media: ${errorMessage}`);
        // Continue without this media
      }
    }

    return mediaIds;
  }

  /**
   * Wait for video media to finish processing
   */
  private async waitForMediaProcessing(mediaId: string, accessToken: string, maxAttempts: number = 10): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

      const response = await axios.get(
        'https://upload.twitter.com/1.1/media/upload.json',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          params: {
            command: 'STATUS',
            media_id: mediaId
          }
        }
      );

      const state = response.data.processing_info?.state;

      if (state === 'succeeded') {
        return;
      }

      if (state === 'failed') {
        throw new Error('Video processing failed');
      }

      // If still processing, wait longer
      const checkAfterSeconds = response.data.processing_info.check_after_secs || 2;
      await new Promise((resolve) => setTimeout(resolve, checkAfterSeconds * 1000));
    }

    throw new Error('Video processing timeout');
  }
}

export const twitterAdapter = new TwitterAdapter();
