import axios from 'axios';
import type { PlatformAdapter, PlatformPayload, PublishResult, ValidationResult } from './platform-adapter.interface.js';
import { getPlatformRules } from '../config/platform-rules.js';
import { prisma } from '../db/prisma.js';
import { oauthService } from '../modules/oauth/oauth.service.js';
import { tokenCrypto } from '../crypto/token-crypto.service.js';

export interface YouTubeVideoMetadata {
  title: string;
  description: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus: 'public' | 'private' | 'unlisted';
}

export class YouTubeAdapter implements PlatformAdapter {
  /**
   * Prepare content for YouTube
   */
  prepareContent(content: string): PlatformPayload {
    const rules = getPlatformRules('YOUTUBE');

    const lines = content.split('\n');
    let title: string;
    let description: string;

    if (lines.length > 1 && lines[0].length <= 100) {
      title = lines[0].trim();
      description = lines.slice(1).join('\n').trim();
    } else {
      title = content.substring(0, 100).trim();
      description = content;
    }

    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }

    const hashtagRegex = /#([\w]+)/g;
    const hashtags = content.match(hashtagRegex) || [];
    const tags = hashtags.map((tag) => tag.substring(1)).slice(0, rules.hashtagLimit);

    if (description.length > rules.maxChars) {
      description = description.substring(0, rules.maxChars);
    }

    return {
      caption: description,
      mediaUrls: [],
      metadata: { title, tags, originalHashtags: hashtags.length, processedTags: tags.length },
      platformSpecificFields: {}
    };
  }

  formatMediaUrls(mediaUrls: string[]): string[] {
    return mediaUrls.slice(0, 1);
  }

  validatePayload(payload: PlatformPayload): ValidationResult {
    const errors: string[] = [];
    const rules = getPlatformRules('YOUTUBE');
    const title = payload.metadata.title as string;

    if (!title || title.length === 0) errors.push('Video title is required');
    if (title && title.length > 100) errors.push('Title exceeds 100 characters');
    if (payload.caption.length > rules.maxChars) errors.push(`Description exceeds ${rules.maxChars} characters`);
    if (payload.mediaUrls.length === 0) errors.push('Video file is required');
    if (payload.mediaUrls.length > 1) errors.push('YouTube only supports single video per post');

    return { valid: errors.length === 0, errors };
  }

  /**
   * Main publish method with automatic token refresh.
   * 
   * CRITICAL: _doPublish THROWS on failure (does NOT catch internally).
   * This allows this method to correctly detect 401s and retry.
   */
  async publish(externalAccountId: string, payload: PlatformPayload): Promise<PublishResult> {
    const internalAccountId = payload.platformSpecificFields.accountId as string;

    try {
      console.log(`[YT] Starting publish for channel: ${externalAccountId}`);
      return await this._doPublish(payload);
    } catch (error: any) {
      const status = error.response?.status;
      console.log(`[YT] publish() caught error: status=${status}, msg=${error.message}`);

      // Token expired: refresh and retry once
      if (status === 401 && internalAccountId) {
        console.log('[YT] 401 detected — refreshing token and retrying...');
        try {
          await oauthService.refreshToken(internalAccountId);
          const account = await prisma.socialAccount.findUnique({ where: { id: internalAccountId } });
          if (!account) throw new Error('Account not found after refresh');

          const newToken = tokenCrypto.decrypt(JSON.parse(account.accessToken));
          payload.platformSpecificFields.accessToken = newToken;
          console.log('[YT] Token refreshed, retrying publish...');

          return await this._doPublish(payload);
        } catch (retryErr: any) {
          console.error('[YT] Retry after refresh failed:', retryErr.message);
          return {
            success: false,
            platformPostId: '',
            url: '',
            error: `YouTube publish failed after token refresh: ${retryErr.message}`
          };
        }
      }

      return {
        success: false,
        platformPostId: '',
        url: '',
        error: `YouTube publish failed: ${error.response?.data?.error?.message || error.message}`
      };
    }
  }

  /**
   * Core publish logic. 
   * IMPORTANT: This method THROWS all errors — it does NOT catch them.
   * The outer publish() method handles error recovery (401 refresh, etc.)
   */
  private async _doPublish(payload: PlatformPayload): Promise<PublishResult> {
    const accessToken = payload.platformSpecificFields.accessToken as string;

    if (!accessToken) throw new Error('Missing YouTube access token');
    if (payload.mediaUrls.length === 0) throw new Error('No video URL provided');

    const videoUrl = payload.mediaUrls[0];
    const title = (payload.metadata.title as string) || (payload.platformSpecificFields.title as string) || 'Untitled Video';
    const description = payload.caption || '';
    const privacyStatus = (payload.platformSpecificFields.privacy as string) || 'public';
    const categoryId = (payload.platformSpecificFields.category as string) || '22';
    const selfDeclaredMadeForKids = payload.platformSpecificFields.madeForKids === true;

    // Build tags array
    let tags: string[] = [];
    if (Array.isArray(payload.metadata.tags)) {
      tags = payload.metadata.tags as string[];
    } else if (typeof payload.platformSpecificFields.tags === 'string') {
      tags = (payload.platformSpecificFields.tags as string).split(',').map(t => t.trim()).filter(Boolean);
    }

    console.log(`[YT] Downloading video from: ${videoUrl}`);

    // Step 1: Download video
    const videoResponse = await axios.get(videoUrl, {
      responseType: 'arraybuffer',
      maxContentLength: Infinity,
      timeout: 120000 // 2 min
    });
    const videoBuffer = Buffer.from(videoResponse.data);
    console.log(`[YT] Video downloaded: ${videoBuffer.length} bytes`);

    // Step 2: Initialize resumable upload session
    console.log(`[YT] Initializing resumable upload... title="${title}"`);
    const initResponse = await axios.post(
      'https://www.googleapis.com/upload/youtube/v3/videos',
      {
        snippet: { title, description, tags, categoryId },
        status: { privacyStatus, selfDeclaredMadeForKids }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': 'video/*',
          'X-Upload-Content-Length': videoBuffer.length.toString()
        },
        params: { part: 'snippet,status', uploadType: 'resumable' }
      }
    );

    const uploadUrl = initResponse.headers.location;
    if (!uploadUrl) throw new Error('Failed to get resumable upload URL from YouTube');
    console.log(`[YT] Got upload URL, uploading ${videoBuffer.length} bytes...`);

    // Step 3: Upload in chunks
    const chunkSize = 10 * 1024 * 1024; // 10MB
    let startByte = 0;
    let videoId: string | null = null;

    while (startByte < videoBuffer.length) {
      const endByte = Math.min(startByte + chunkSize, videoBuffer.length) - 1;
      const chunk = videoBuffer.slice(startByte, endByte + 1);

      const uploadResponse = await axios.put(uploadUrl, chunk, {
        headers: {
          'Content-Length': chunk.length.toString(),
          'Content-Range': `bytes ${startByte}-${endByte}/${videoBuffer.length}`
        },
        validateStatus: (s) => s < 500, // 308 Resume Incomplete is OK
        timeout: 120000
      });

      console.log(`[YT] Chunk ${startByte}-${endByte}: HTTP ${uploadResponse.status}`);

      if (uploadResponse.status === 201 || uploadResponse.status === 200) {
        videoId = uploadResponse.data.id;
        console.log(`[YT] Upload complete! Video ID: ${videoId}`);
        break;
      }

      if (uploadResponse.status !== 308) {
        throw new Error(`Unexpected upload status: ${uploadResponse.status} - ${JSON.stringify(uploadResponse.data)}`);
      }

      startByte = endByte + 1;
    }

    if (!videoId) throw new Error('Upload completed but no video ID returned');

    // Step 4: Upload custom thumbnail (best-effort, non-blocking)
    const thumbnailUrl = payload.platformSpecificFields.thumbnailUrl as string;
    if (thumbnailUrl) {
      try {
        console.log(`[YT] Uploading thumbnail from: ${thumbnailUrl}`);
        const thumbResp = await axios.get(thumbnailUrl, { responseType: 'arraybuffer', timeout: 30000 });
        await this.uploadThumbnail(videoId, Buffer.from(thumbResp.data), accessToken);
        console.log('[YT] Thumbnail uploaded successfully');
      } catch (thumbErr: any) {
        let errStr = thumbErr.message;
        if (thumbErr.response && thumbErr.response.data) {
          errStr = typeof thumbErr.response.data === 'object' ? JSON.stringify(thumbErr.response.data) : thumbErr.response.data.toString();
        } else if (thumbErr.response) {
          errStr += ` (Status: ${thumbErr.response.status})`;
        }
        console.warn('[YT] Thumbnail upload failed (non-fatal):', errStr);
      }
    }

    return {
      success: true,
      platformPostId: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`
    };
  }

  async uploadThumbnail(videoId: string, imageBuffer: Buffer, accessToken: string): Promise<void> {
    await axios.post(
      'https://www.googleapis.com/upload/youtube/v3/thumbnails/set',
      imageBuffer,
      {
        params: { videoId },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'image/jpeg'
        }
      }
    );
  }

  async deletePost(accountId: string, platformPostId: string, accessToken?: string): Promise<boolean> {
    if (!accessToken || !platformPostId) return false;
    try {
      await axios.delete(`https://www.googleapis.com/youtube/v3/videos`, {
        params: { id: platformPostId },
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      return true;
    } catch (e) {
      console.warn(`Failed to delete YouTube video ${platformPostId}`);
      return false;
    }
  }
}

export const youtubeAdapter = new YouTubeAdapter();
