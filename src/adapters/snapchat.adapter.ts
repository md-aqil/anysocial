import axios from 'axios';
import { PlatformAdapter, PostContent, ValidationResult } from './platform.adapter.js';
import { prisma } from '../db/prisma.js';
import { tokenCrypto } from '../crypto/token-crypto.service.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export class SnapchatAdapter implements PlatformAdapter {
  private readonly baseUrl = 'https://businessapi.snapchat.com/v1';

  async validate(content: PostContent): Promise<ValidationResult> {
    const errors: string[] = [];
    if (!content.media || content.media.length === 0) {
      errors.push('Snapchat requires at least one image or video.');
    }
    if (content.media && content.media.length > 1) {
      errors.push('Snapchat currently supports only one media item per post via API.');
    }
    if (content.content && content.content.length > 160) {
      errors.push('Snapchat caption (description) cannot exceed 160 characters.');
    }
    return { isValid: errors.length === 0, errors };
  }

  async publish(content: PostContent, accountId: string): Promise<any> {
    const account = await prisma.socialAccount.findUnique({
      where: { id: accountId }
    });

    if (!account) throw new Error('Account not found');

    const encryptedToken = JSON.parse(account.accessToken);
    const accessToken = tokenCrypto.decrypt(encryptedToken);

    // 1. Prepare and Upload Media
    const mediaItem = content.media[0];
    const mediaId = await this.uploadMedia(mediaItem, accessToken, account.externalAccountId);

    // 2. Post to Story or Spotlight
    // For now, we'll default to Story, but can be customized via platformOptions
    const postType = (content.platformOptions as any)?.SNAPCHAT?.postType || 'STORY';

    if (postType === 'SPOTLIGHT') {
      return this.postToSpotlight(mediaId, content.content || '', accessToken, account.externalAccountId);
    } else {
      return this.postToStory(mediaId, accessToken, account.externalAccountId);
    }
  }

  private async uploadMedia(mediaUrl: string, accessToken: string, profileId: string): Promise<string> {
    // Download media content
    const response = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    // Encryption Setup
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encryptedBuffer = Buffer.concat([cipher.update(buffer), cipher.final()]);

    // Create Media Container
    const containerResponse = await axios.post(
      `${this.baseUrl}/public_profiles/${profileId}/media`,
      {
        type: mediaUrl.includes('.mp4') ? 'VIDEO' : 'IMAGE',
        name: `Post_${Date.now()}`,
        key: key.toString('base64'),
        iv: iv.toString('base64')
      },
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    const { id: mediaId, upload_url } = containerResponse.data.media;

    // Upload Encrypted Content
    await axios.put(upload_url, encryptedBuffer, {
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
