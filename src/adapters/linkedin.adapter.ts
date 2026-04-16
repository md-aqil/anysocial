import axios from 'axios';
import type { PlatformAdapter, PlatformPayload, PublishResult, ValidationResult } from './platform-adapter.interface.js';
import { getPlatformRules } from '../config/platform-rules.js';

export class LinkedInAdapter implements PlatformAdapter {
  /**
   * Prepare content for LinkedIn
   * - Enforce 3000 character limit
   * - Limit hashtags to 3 (best practice)
   * - Detect article vs image post
   */
  prepareContent(content: string): PlatformPayload {
    const rules = getPlatformRules('LINKEDIN');

    // Count and limit hashtags (best practice: max 3)
    const hashtagRegex = /#[\w]+/g;
    const hashtags = content.match(hashtagRegex) || [];

    let processedContent = content;
    if (hashtags.length > rules.hashtagLimit) {
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

    // Check if content contains article link
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = content.match(urlRegex) || [];
    const hasArticleLink = urls.some((url) => this.isArticleUrl(url));

    return {
      caption: processedContent.trim(),
      mediaUrls: [],
      metadata: {
        originalHashtagCount: hashtags.length,
        processedHashtagCount: (processedContent.match(hashtagRegex) || []).length,
        isArticlePost: hasArticleLink,
        urls
      },
      platformSpecificFields: {}
    };
  }

  /**
   * Format media URLs for LinkedIn
   * LinkedIn requires URN format for media
   */
  formatMediaUrls(mediaUrls: string[]): string[] {
    // LinkedIn will convert URLs to URNs during upload
    return mediaUrls;
  }

  /**
   * Validate payload meets LinkedIn requirements
   */
  validatePayload(payload: PlatformPayload): ValidationResult {
    const errors: string[] = [];
    const rules = getPlatformRules('LINKEDIN');

    if (payload.caption.length > rules.maxChars) {
      errors.push(`Post exceeds ${rules.maxChars} characters`);
    }

    if (payload.mediaUrls.length === 0 && !payload.metadata.isArticlePost) {
      // LinkedIn allows text-only posts, but we warn
      console.warn('LinkedIn post without media may have lower engagement');
    }

    if (payload.mediaUrls.length > rules.maxMediaCount) {
      errors.push(`Maximum ${rules.maxMediaCount} media items allowed`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Publish to LinkedIn via UGC Post API
   * 
   * Flow:
   * 1. Register upload (get URN)
   * 2. Upload media (if any)
   * 3. Create UGC Post with media URN
   * 
   * IMPORTANT: LinkedIn requires media URN before creating post
   */
  async publish(accountId: string, payload: PlatformPayload): Promise<PublishResult> {
    try {
      const accessToken = payload.platformSpecificFields.accessToken as string;
      const personUrn = payload.platformSpecificFields.personUrn as string;

      if (!accessToken) {
        throw new Error('Missing LinkedIn access token');
      }

      // Step 1: Upload media and get URN (if any)
      let mediaAssetUrn: string | undefined;
      if (payload.mediaUrls.length > 0) {
        mediaAssetUrn = await this.uploadMedia(payload.mediaUrls[0], accessToken);
      }

      // Step 2: Create UGC Post
      const postData: any = {
        author: personUrn || `urn:li:person:${accountId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: payload.caption
            },
            shareMediaCategory: mediaAssetUrn ? 'IMAGE' : 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      // Add media if exists
      if (mediaAssetUrn) {
        postData.specificContent['com.linkedin.ugc.ShareContent'].media = [
          {
            status: 'READY',
            description: {
              text: payload.caption.substring(0, 200) // Short description
            },
            media: mediaAssetUrn,
            title: {
              text: 'Shared media'
            }
          }
        ];
      }

      // Create post
      const response = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        postData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      // Extract post ID from URN (format: urn:li:share:1234567890)
      const shareUrn = response.data.id;
      const shareId = shareUrn.split(':').pop();

      return {
        success: true,
        platformPostId: shareId!,
        url: `https://www.linkedin.com/feed/update/${shareUrn}`
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        platformPostId: '',
        url: '',
        error: `LinkedIn publish failed: ${errorMessage}`
      };
    }
  }

  /**
   * Upload media to LinkedIn and return URN
   * 
   * LinkedIn uses a register-upload mechanism:
   * 1. Register upload intent (get URN and upload URL)
   * 2. Upload media to signed URL
   * 3. Media is automatically processed
   */
  private async uploadMedia(mediaUrl: string, accessToken: string): Promise<string> {
    try {
      // Download media from URL
      const mediaResponse = await axios.get(mediaUrl, {
        responseType: 'arraybuffer'
      });
      const mediaBuffer = Buffer.from(mediaResponse.data);
      const contentType = mediaResponse.headers['content-type'];

      const isVideo = contentType.includes('video');
      const isImage = contentType.includes('image');

      if (!isImage && !isVideo) {
        throw new Error(`Unsupported media type: ${contentType}`);
      }

      // Register upload
      const registerData = {
        registerUploadRequest: {
          recipes: isVideo
            ? ['urn:li:digitalmediaRecipe:feedshareVideo']
            : ['urn:li:digitalmediaRecipe:feedshareImage'],
          owner: `urn:li:person:${accessToken}`, // Will be replaced with actual person URN
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent'
            }
          ]
        }
      };

      const registerResponse = await axios.post(
        'https://api.linkedin.com/v2/assets?action=registerUpload',
        registerData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      const uploadUrl = registerResponse.data.value.uploadMechanism[
        'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
      ].uploadUrl;

      const assetUrn = registerResponse.data.value.asset;

      // Upload media to signed URL
      await axios.put(uploadUrl, mediaBuffer, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': contentType
        }
      });

      // Wait briefly for LinkedIn to process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      return assetUrn;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Media upload failed: ${errorMessage}`);
    }
  }

  /**
   * Check if URL is an article link
   */
  private isArticleUrl(url: string): boolean {
    const articlePatterns = [
      /linkedin\.com\/pulse\//i,
      /medium\.com\//i,
      /wordpress\.com\//i,
      /blogspot\./i
    ];

    return articlePatterns.some((pattern) => pattern.test(url));
  }
}

export const linkedinAdapter = new LinkedInAdapter();
