import axios from 'axios';
import type { PlatformAdapter, PlatformPayload, PublishResult, ValidationResult } from './platform-adapter.interface.js';
import { getPlatformRules } from '../config/platform-rules.js';

export class PinterestAdapter implements PlatformAdapter {
  /**
   * Prepare content for Pinterest
   * - Title: max 100
   * - Description: max 800
   */
  prepareContent(content: string): PlatformPayload {
    const rules = getPlatformRules('PINTEREST');
    
    // Split content into title and description if possible, or just use first line as title
    const lines = content.trim().split('\n');
    const titleCandidate = lines[0].trim();
    const title = titleCandidate.length > 100 ? titleCandidate.substring(0, 97) + '...' : titleCandidate;
    
    let description = content;
    if (description.length > rules.maxChars) {
      description = description.substring(0, rules.maxChars - 3) + '...';
    }

    return {
      caption: description,
      mediaUrls: [],
      metadata: {
        title: title
      },
      platformSpecificFields: {
        title: title
      }
    };
  }

  formatMediaUrls(mediaUrls: string[]): string[] {
    return mediaUrls;
  }

  validatePayload(payload: PlatformPayload): ValidationResult {
    const errors: string[] = [];
    const rules = getPlatformRules('PINTEREST');

    if (payload.caption.length > rules.maxChars) {
      errors.push(`Description exceeds ${rules.maxChars} characters`);
    }

    if (payload.mediaUrls.length === 0) {
      errors.push('At least one image or video required for Pinterest');
    }

    if (!payload.platformSpecificFields.boardId) {
      errors.push('Pinterest board selection is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Publish to Pinterest V5 API
   */
  async publish(accountId: string, payload: PlatformPayload): Promise<PublishResult> {
    try {
      const accessToken = payload.platformSpecificFields.accessToken as string;
      const boardId = payload.platformSpecificFields.boardId as string;
      const title = payload.platformSpecificFields.title || payload.metadata.title;
      const link = payload.platformSpecificFields.link || '';
      const mediaUrl = payload.mediaUrls[0];

      if (!accessToken || !boardId) {
        throw new Error('Missing Pinterest credentials or Board ID');
      }

      const isVideo = mediaUrl.toLowerCase().endsWith('.mp4');

      // Pinterest v5 /pins endpoint
      const response = await axios.post(
        'https://api.pinterest.com/v5/pins',
        {
          board_id: boardId,
          title: title,
          description: payload.caption,
          link: link,
          media_source: {
            source_type: isVideo ? 'video_url' : 'image_url',
            url: mediaUrl,
            // For video, we might need a thumbnail or other fields, but v5 supports simple URLs for some account types
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        platformPostId: response.data.id,
        url: `https://www.pinterest.com/pin/${response.data.id}`
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown Pinterest error';
      console.error(`[PINTEREST PUBLISH ERROR] ${errorMessage}`, error.response?.data);
      
      return {
        success: false,
        platformPostId: '',
        url: '',
        error: `Pinterest publish failed: ${errorMessage}`
      };
    }
  }

  /**
   * Helper to fetch user boards (needed for the UI)
   */
  async getBoards(accessToken: string) {
    try {
      const response = await axios.get('https://api.pinterest.com/v5/boards', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      return response.data.items; // Array of { id, name, ... }
    } catch (error) {
      console.error('Failed to fetch Pinterest boards:', error);
      throw error;
    }
  }
}

export const pinterestAdapter = new PinterestAdapter();
