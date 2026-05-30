import axios from 'axios';
import type { PlatformAdapter, PlatformPayload, PublishResult, ValidationResult } from './platform-adapter.interface.js';
import { getPlatformRules } from '../config/platform-rules.js';

export class SnapchatAdapter implements PlatformAdapter {
  private readonly baseUrl = 'https://businessapi.snapchat.com/v1';

  prepareContent(content: string): PlatformPayload {
    const rules = getPlatformRules('SNAPCHAT');
    let processedContent = content;
    if (processedContent.length > rules.maxChars) {
      processedContent = processedContent.substring(0, rules.maxChars - 3) + '...';
    }
    return {
      caption: processedContent,
      mediaUrls: [],
      metadata: {},
      platformSpecificFields: {}
    };
  }

  formatMediaUrls(mediaUrls: string[]): string[] {
    return mediaUrls.slice(0, 1);
  }

  validatePayload(payload: PlatformPayload): ValidationResult {
    const errors: string[] = [];
    const rules = getPlatformRules('SNAPCHAT');

    if (payload.mediaUrls.length === 0) {
      errors.push('Snapchat requires at least one image or video.');
    }
    if (payload.mediaUrls.length > rules.maxMediaCount) {
      errors.push(`Snapchat only supports ${rules.maxMediaCount} media item per post.`);
    }
    if (payload.caption.length > rules.maxChars) {
      errors.push(`Snapchat caption exceeds ${rules.maxChars} characters.`);
    }

    return { valid: errors.length === 0, errors };
  }

  async publish(accountId: string, payload: PlatformPayload): Promise<PublishResult> {
    try {
      const accessToken = payload.platformSpecificFields.accessToken as string;
      if (!accessToken) throw new Error('Missing Snapchat access token');

      // Resolve Public Profile ID
      let profileId = accountId;
      try {
        const orgsRes = await axios.get('https://adsapi.snapchat.com/v1/me/organizations', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const orgId = orgsRes.data.organizations?.[0]?.organization?.id;
        if (orgId) {
          const profilesRes = await axios.get(`https://adsapi.snapchat.com/v1/organizations/${orgId}/public_profiles`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const fetchedProfileId = profilesRes.data.public_profiles?.[0]?.public_profile?.id;
          if (fetchedProfileId) {
             profileId = fetchedProfileId;
          }
        }
      } catch (err: any) {
        console.warn('Could not dynamically resolve Snapchat public profile ID, falling back:', err.message);
      }

      const mediaUrl = payload.mediaUrls[0];
      const mediaId = await this.uploadMedia(mediaUrl, accessToken, profileId);

      const postType = (payload.platformSpecificFields.postType as string) || 'STORY';
      let result;

      if (postType === 'SPOTLIGHT') {
        result = await this.postToSpotlight(mediaId, payload.caption, accessToken, profileId);
      } else {
        result = await this.postToStory(mediaId, accessToken, profileId);
      }

      return {
        success: true,
        platformPostId: result?.id || 'snap-post',
        url: `https://www.snapchat.com/add/${profileId}`
      };
    } catch (error: any) {
      let errorMessage = error.message;
      
      if (error.response) {
        const dataStr = typeof error.response.data === 'object' ? JSON.stringify(error.response.data) : error.response.data;
        errorMessage += ` - ${dataStr}`;
        if (error.response.status === 403) {
          errorMessage = `HTTP 403 Forbidden: ${dataStr}. Note: The Snapchat Public Profile API is currently allowlist-only. Your OAuth App Client ID must be explicitly allowlisted by Snapchat Support for Public Profile API access, otherwise publish requests will be rejected.`;
        }
      }

      return {
        success: false,
        platformPostId: '',
        url: '',
        error: `Snapchat publish failed: ${errorMessage}`
      };
    }
  }

  private async uploadMedia(mediaUrl: string, accessToken: string, profileId: string): Promise<string> {
    const response = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    // Note: Simple mock for now as the previous crypto logic was incomplete/placeholder
    const containerResponse = await axios.post(
      `${this.baseUrl}/public_profiles/${profileId}/media`,
      {
        type: mediaUrl.includes('.mp4') ? 'VIDEO' : 'IMAGE',
        name: `Post_${Date.now()}`
      },
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    const { id: mediaId, upload_url } = containerResponse.data.media;

    await axios.put(upload_url, buffer, {
      headers: { 'Content-Type': 'application/octet-stream' }
    });

    return mediaId;
  }

  private async postToStory(mediaId: string, accessToken: string, profileId: string): Promise<any> {
    const response = await axios.post(
      `${this.baseUrl}/public_profiles/${profileId}/stories`,
      { media_id: mediaId },
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    return response.data;
  }

  private async postToSpotlight(mediaId: string, description: string, accessToken: string, profileId: string): Promise<any> {
    const response = await axios.post(
      `${this.baseUrl}/public_profiles/${profileId}/spotlights`,
      {
        media_id: mediaId,
        description: description,
        locale: 'en_US'
      },
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    return response.data;
  }
}

export const snapchatAdapter = new SnapchatAdapter();
