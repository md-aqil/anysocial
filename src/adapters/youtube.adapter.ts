import axios from 'axios';
import type { PlatformAdapter, PlatformPayload, PublishResult, ValidationResult } from './platform-adapter.interface.js';
import { getPlatformRules } from '../config/platform-rules.js';

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
   * - Extract title from first line (or generate from content)
   * - Use remaining content as description
   * - Extract hashtags for tags
   */
  prepareContent(content: string): PlatformPayload {
    const rules = getPlatformRules('YOUTUBE');

    // Split content into title and description
    const lines = content.split('\n');
    let title: string;
    let description: string;

    if (lines.length > 1 && lines[0].length <= 100) {
      // First line as title (max 100 chars for YouTube title)
      title = lines[0].trim();
      description = lines.slice(1).join('\n').trim();
    } else {
      // Generate title from content
      title = content.substring(0, 100).trim();
      description = content;
    }

    // Truncate title if needed
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }

    // Extract hashtags for tags
    const hashtagRegex = /#([\w]+)/g;
    const hashtags = content.match(hashtagRegex) || [];
    const tags = hashtags
      .map((tag) => tag.substring(1))
      .slice(0, rules.hashtagLimit);

    // Truncate description if needed
    if (description.length > rules.maxChars) {
      description = description.substring(0, rules.maxChars);
    }

    return {
      caption: description,
      mediaUrls: [],
      metadata: {
        title,
        tags,
        originalHashtags: hashtags.length,
        processedTags: tags.length
      },
      platformSpecificFields: {}
    };
  }

  /**
   * Format media URLs for YouTube
   * YouTube only accepts single video
   */
  formatMediaUrls(mediaUrls: string[]): string[] {
    // YouTube only accepts first video
    return mediaUrls.slice(0, 1);
  }

  /**
   * Validate payload meets YouTube requirements
   */
  validatePayload(payload: PlatformPayload): ValidationResult {
    const errors: string[] = [];
    const rules = getPlatformRules('YOUTUBE');

    const title = payload.metadata.title as string;
    if (!title || title.length === 0) {
      errors.push('Video title is required');
    }

    if (title && title.length > 100) {
      errors.push('Title exceeds 100 characters');
    }

    if (payload.caption.length > rules.maxChars) {
      errors.push(`Description exceeds ${rules.maxChars} characters`);
    }

    if (payload.mediaUrls.length === 0) {
      errors.push('Video file is required');
    }

    if (payload.mediaUrls.length > 1) {
      errors.push('YouTube only supports single video per post');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Publish to YouTube Data API v3
   * 
   * Flow:
   * 1. Initialize resumable upload
   * 2. Upload video in chunks
   * 3. Set video metadata (title, description, tags, privacy)
   * 
   * IMPORTANT: YouTube uses resumable upload for large files
   */
  async publish(accountId: string, payload: PlatformPayload): Promise<PublishResult> {
    try {
      const accessToken = payload.platformSpecificFields.accessToken as string;

      if (!accessToken) {
        throw new Error('Missing YouTube access token');
      }

      if (payload.mediaUrls.length === 0) {
        throw new Error('No video URL provided');
      }

      const videoUrl = payload.mediaUrls[0];
      const title = (payload.metadata.title as string) || 'Untitled Video';
      const description = payload.caption;
      const tags = (payload.metadata.tags as string[]) || [];
      const privacyStatus = (payload.platformSpecificFields.privacyStatus as string) || 'public';

      // Step 1: Download video from URL
      const videoResponse = await axios.get(videoUrl, {
        responseType: 'arraybuffer'
      });
      const videoBuffer = Buffer.from(videoResponse.data);

      // Step 2: Initialize resumable upload
      const initResponse = await axios.post(
        'https://www.googleapis.com/upload/youtube/v3/videos',
        {
          snippet: {
            title,
            description,
            tags,
            categoryId: '22' // People & Blogs (default)
          },
          status: {
            privacyStatus
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Type': 'video/*',
            'X-Upload-Content-Length': videoBuffer.length.toString()
          },
          params: {
            part: 'snippet,status'
          }
        }
      );

      const uploadUrl = initResponse.headers.location;

      if (!uploadUrl) {
        throw new Error('Failed to get upload URL');
      }

      // Step 3: Upload video in chunks
      const chunkSize = 10 * 1024 * 1024; // 10MB chunks
      let startByte = 0;

      while (startByte < videoBuffer.length) {
        const endByte = Math.min(startByte + chunkSize, videoBuffer.length) - 1;
        const chunk = videoBuffer.slice(startByte, endByte + 1);

        const uploadResponse = await axios.put(uploadUrl, chunk, {
          headers: {
            'Content-Length': chunk.length.toString(),
            'Content-Range': `bytes ${startByte}-${endByte}/${videoBuffer.length}`
          }
        });

        // Check if upload is complete
        if (uploadResponse.status === 201 || uploadResponse.status === 200) {
          const videoId = uploadResponse.data.id;
          const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

          return {
            success: true,
            platformPostId: videoId,
            url: videoUrl
          };
        }

        startByte = endByte + 1;
      }

      throw new Error('Upload completed but no video ID returned');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        platformPostId: '',
        url: '',
        error: `YouTube publish failed: ${errorMessage}`
      };
    }
  }

  /**
   * Get video upload status
   * YouTube processes videos after upload, this checks processing status
   */
  async getUploadStatus(videoId: string, accessToken: string): Promise<{
    status: string;
    failureReason?: string;
    rejectionReason?: string;
  }> {
    try {
      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          params: {
            part: 'status',
            id: videoId
          }
        }
      );

      const video = response.data.items[0];
      if (!video) {
        throw new Error('Video not found');
      }

      return {
        status: video.status.uploadStatus,
        failureReason: video.status.failureReason,
        rejectionReason: video.status.rejectionReason
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get upload status: ${errorMessage}`);
    }
  }
}

export const youtubeAdapter = new YouTubeAdapter();
