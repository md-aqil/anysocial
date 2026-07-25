import axios from 'axios';
import fs from 'fs';
import path from 'path';
import type { PlatformAdapter, PlatformPayload, PublishResult, ValidationResult } from './platform-adapter.interface.js';
import { getPlatformRules } from '../config/platform-rules.js';

export class FacebookAdapter implements PlatformAdapter {
  prepareContent(content: string): PlatformPayload {
    const rules = getPlatformRules('FACEBOOK');

    let processedContent = content;
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

  formatMediaUrls(mediaUrls: string[]): string[] {
    return mediaUrls;
  }

  validatePayload(payload: PlatformPayload): ValidationResult {
    const errors: string[] = [];
    const rules = getPlatformRules('FACEBOOK');

    if (payload.caption.length > rules.maxChars) {
      errors.push(`Caption exceeds ${rules.maxChars} characters`);
    }

    if (payload.mediaUrls.length > rules.maxMediaCount) {
      errors.push(`Maximum ${rules.maxMediaCount} media items allowed`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async publish(accountId: string, payload: PlatformPayload): Promise<PublishResult> {
    try {
      const accessToken = payload.platformSpecificFields.accessToken as string;

      if (!accessToken || !accountId) {
        throw new Error('Missing Facebook credentials');
      }

      let publishResponse;

      if (payload.mediaUrls.length > 1) {
        // Multi-media (Carousel-style) Feed Post
        const postType = payload.platformSpecificFields.postType || 'FEED';
        if (postType !== 'FEED') {
          throw new Error(`Multiple media items are only supported for FEED posts on Facebook. (Got: ${postType})`);
        }

        console.log(`[FB PUBLISH] Handling multi-media post with ${payload.mediaUrls.length} items`);
        const attachedMedia: { media_fbid: string }[] = [];

        const getAbsoluteMediaUrl = (url: string) => {
          if (url.startsWith('http://') || url.startsWith('https://')) return url;
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://socialsched.vibeship.in';
          return `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
        };

        for (const mediaUrl of payload.mediaUrls) {
          const fullMediaUrl = getAbsoluteMediaUrl(mediaUrl);
          const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('.mov') || mediaUrl.includes('.webm');

          if (isVideo) {
            console.log(`[FB PUBLISH] Uploading unpublished video for multi-media post: ${fullMediaUrl}`);
            const uploadResponse = await axios.post(`https://graph.facebook.com/v21.0/${accountId}/videos`, {
              file_url: fullMediaUrl,
              published: false,
              access_token: accessToken
            });
            attachedMedia.push({ media_fbid: uploadResponse.data.id });
            console.log(`[FB PUBLISH] Uploaded unpublished video ID: ${uploadResponse.data.id}`);
          } else {
            console.log(`[FB PUBLISH] Uploading unpublished photo for multi-media post: ${fullMediaUrl}`);
            const uploadResponse = await axios.post(`https://graph.facebook.com/v21.0/${accountId}/photos`, {
              url: fullMediaUrl,
              published: false,
              access_token: accessToken
            });
            attachedMedia.push({ media_fbid: uploadResponse.data.id });
            console.log(`[FB PUBLISH] Uploaded unpublished photo ID: ${uploadResponse.data.id}`);
          }
        }

        // Publish feed post with attached media
        try {
          publishResponse = await axios.post(`https://graph.facebook.com/v21.0/${accountId}/feed`, {
            message: payload.caption,
            attached_media: attachedMedia,
            access_token: accessToken
          });
        } catch (feedErr: any) {
          console.warn(`[FB PUBLISH] Native JSON attached_media post failed: ${feedErr.response?.data?.error?.message || feedErr.message}. Retrying with URLSearchParams...`);
          
          const params = new URLSearchParams();
          if (payload.caption) params.append('message', payload.caption);
          params.append('access_token', accessToken);
          params.append('attached_media', JSON.stringify(attachedMedia));

          publishResponse = await axios.post(`https://graph.facebook.com/v21.0/${accountId}/feed`, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          });
        }
      } else if (payload.mediaUrls.length === 1) {
        const mediaUrl = payload.mediaUrls[0];
        const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('.mov');
        const postType = payload.platformSpecificFields.postType || 'FEED';

        if (postType === 'REEL') {
          if (!isVideo) throw new Error("Reels must be video files.");
          
          // Phase 1: Initialize the Reel Upload
          const startResponse = await axios.post(`https://graph.facebook.com/v21.0/${accountId}/video_reels`, {
            upload_phase: 'start',
            access_token: accessToken
          });
          
          const { video_id: videoId, upload_url: uploadUrl } = startResponse.data;
          
          if (!uploadUrl || !videoId) {
            throw new Error("Failed to get Reel upload URL from Facebook.");
          }

          // Phase 2: Binary Video Upload to Meta's rupload endpoint
          const fileName = mediaUrl.split('/').pop();
          const filePath = path.join(process.cwd(), 'frontend', 'public', 'uploads', fileName!);
          
          if (!fs.existsSync(filePath)) {
            throw new Error(`Media file not found for upload: ${filePath}`);
          }

          const fileBuffer = fs.readFileSync(filePath);
          console.log(`[FB PUBLISH] Starting binary upload for Reel ${videoId}, size: ${fileBuffer.length} bytes`);

          await axios.post(uploadUrl, fileBuffer, {
            headers: {
              'Authorization': `OAuth ${accessToken}`,
              'offset': '0',
              'file_size': fileBuffer.length.toString(),
              'Content-Type': 'application/octet-stream'
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            timeout: 120000
          });

          console.log(`[FB PUBLISH] Binary upload sent for Reel ${videoId}`);

          let uploadConfirmed = false;
          let uploadAttempts = 0;
          const maxUploadAttempts = 15;

          while (!uploadConfirmed && uploadAttempts < maxUploadAttempts) {
            uploadAttempts++;
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
              const statusResponse = await axios.get(
                `https://graph.facebook.com/v21.0/${videoId}`,
                { params: { fields: 'status', access_token: accessToken } }
              );
              const uploadStatus = statusResponse.data.status?.video_status;
              console.log(`[FB PUBLISH] Upload confirm (attempt ${uploadAttempts}): ${uploadStatus}`);

              if (uploadStatus === 'upload_complete') {
                uploadConfirmed = true;
              } else if (uploadStatus === 'error') {
                throw new Error('Facebook binary upload was rejected by Meta servers.');
              }
            } catch (err: any) {
              if (err.message.includes('rejected')) throw err;
              console.warn(`[FB PUBLISH] Upload status check error: ${err.message}`);
            }
          }

          if (!uploadConfirmed) {
            throw new Error('Facebook binary upload did not confirm within 30 seconds.');
          }

          // Phase 3: Finish and Publish
          console.log(`[FB PUBLISH] Calling finish/publish for Reel: ${videoId}`);
          publishResponse = await axios.post(`https://graph.facebook.com/v21.0/${accountId}/video_reels`, {
            upload_phase: 'finish',
            video_id: videoId,
            video_state: 'PUBLISHED',
            description: payload.caption,
            video_title: payload.platformSpecificFields.reelTitle || undefined,
            access_token: accessToken
          }, {
            timeout: 30000
          });
        } else if (postType === 'STORY') {
          if (isVideo) {
            publishResponse = await axios.post(`https://graph.facebook.com/v21.0/${accountId}/video_stories`, null, {
              params: {
                file_url: mediaUrl,
                access_token: accessToken
              }
            });
          } else {
            publishResponse = await axios.post(`https://graph.facebook.com/v21.0/${accountId}/photo_stories`, null, {
              params: {
                url: mediaUrl,
                access_token: accessToken
              }
            });
          }
        } else {
          // Standard FEED Post (Single)
          if (isVideo) {
            publishResponse = await axios.post(`https://graph.facebook.com/v21.0/${accountId}/videos`, {
              file_url: mediaUrl,
              description: payload.caption,
              access_token: accessToken
            });
          } else {
            const imageResponse = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(imageResponse.data);
            const formData = new FormData();
            formData.append('caption', payload.caption);
            formData.append('access_token', accessToken);
            formData.append('source', new Blob([imageBuffer], { type: 'image/jpeg' }), 'upload.jpg');
            publishResponse = await axios.post(`https://graph.facebook.com/v21.0/${accountId}/photos`, formData);
          }
        }
      } else {
        // Text only feed post
        if (payload.platformSpecificFields.postType === 'REEL' || payload.platformSpecificFields.postType === 'STORY') {
           throw new Error("Reels and Stories require media attachments.");
        }
        publishResponse = await axios.post(`https://graph.facebook.com/v21.0/${accountId}/feed`, {
          message: payload.caption,
          access_token: accessToken
        });
      }

      return {
        success: true,
        platformPostId: publishResponse.data.id,
        url: `https://facebook.com/${publishResponse.data.post_id || publishResponse.data.id}`
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
      return {
        success: false,
        platformPostId: '',
        url: '',
        error: `Facebook publish failed: ${errorMessage}`
      };
    }
  }

  async deletePost(_accountId: string, platformPostId: string, accessToken?: string): Promise<boolean> {
    if (!accessToken || !platformPostId) return false;
    try {
      await axios.delete(`https://graph.facebook.com/v21.0/${platformPostId}`, {
        params: { access_token: accessToken }
      });
      return true;
    } catch (e) {
      console.warn(`Failed to delete facebook post ${platformPostId}`);
      return false;
    }
  }
}

export const facebookAdapter = new FacebookAdapter();
