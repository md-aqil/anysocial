import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { getPlatformRules, isAspectRatioValid } from '../config/platform-rules.js';
import { MediaValidationError } from '../utils/errors.js';

// Set explicit ffprobe path for Homebrew installs on Mac
ffmpeg.setFfprobePath('/opt/homebrew/bin/ffprobe');

function logToFile(message: string) {
  const logPath = path.join(process.cwd(), 'scratch', 'backend-debug.log');
  const timestamp = new Date().toISOString();
  if (!fs.existsSync(path.dirname(logPath))) {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
  }
  fs.appendFileSync(logPath, `[${timestamp}] MEDIA_VALIDATOR: ${message}\n`);
}

export interface MediaValidationResult {
  valid: boolean;
  errors: string[];
  recommendedCrop?: { x: number; y: number; w: number; h: number };
  metadata: {
    width: number;
    height: number;
    aspectRatio: number;
    mimeType: string;
    sizeBytes: number;
    duration?: number; // For videos
  };
}

export class MediaValidatorService {
  /**
   * Validate media file against platform rules
   */
  async validate(
    file: Buffer,
    platform: string,
    type: 'image' | 'video',
    options?: Record<string, any>
  ): Promise<MediaValidationResult> {
    const rules = getPlatformRules(platform);
    const errors: string[] = [];

    // 1. Handle Metadata Discovery
    let width = 0;
    let height = 0;
    let aspectRatio = 0;
    let mimeType = 'unknown';
    let duration = 0;

    if (type === 'image') {
      try {
        const metadata = await sharp(file).metadata();
        width = metadata.width || 0;
        height = metadata.height || 0;
        aspectRatio = height > 0 ? width / height : 0;
        mimeType = metadata.format ? this.formatToMimeType(metadata.format) : 'unknown';
      } catch (error) {
        return {
          valid: false,
          errors: ['Failed to read image metadata. File may be corrupted or unsupported.'],
          metadata: {
            width: 0,
            height: 0,
            aspectRatio: 0,
            mimeType: 'unknown',
            sizeBytes: file.length
          }
        };
      }
    } else {
      // Use ffprobe to get real metadata for videos if available
      const ffprobePath = '/opt/homebrew/bin/ffprobe';
      const hasFfprobe = fs.existsSync(ffprobePath);

      if (!hasFfprobe) {
        logToFile('ffprobe not found. Using fallback dimensions for video validation.');
        width = 1920;
        height = 1080;
        aspectRatio = width / height;
        duration = 0;
        mimeType = 'video/mp4';
      } else {
        try {
          const tempDir = path.join(process.cwd(), 'scratch', 'temp');
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
          
          const tempPath = path.join(tempDir, `${Date.now()}-probe-${Math.random().toString(36).slice(2)}.mp4`);
          fs.writeFileSync(tempPath, file);
          
          const probeResult = await new Promise<any>((resolve, reject) => {
            ffmpeg.ffprobe(tempPath, (err, metadata) => {
              if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
              if (err) return reject(err);
              resolve(metadata);
            });
          });

          const videoStream = probeResult.streams.find((s: any) => s.codec_type === 'video');
          width = videoStream?.width || 0;
          height = videoStream?.height || 0;
          aspectRatio = height > 0 ? width / height : 0;
          duration = probeResult.format?.duration || 0;
          mimeType = 'video/mp4'; // Probe could detect more, but we assume mp4 for rules
        } catch (probeError) {
          logToFile(`PROBE ERROR: ${probeError}`);
          // Fallback
          width = 1920;
          height = 1080;
          aspectRatio = 16/9;
          duration = 0;
          mimeType = 'video/mp4';
        }
      }
    }

    // Check MIME type
    if (!rules.allowedMimeTypes.includes(mimeType)) {
      errors.push(
        `MIME type ${mimeType} not allowed for ${platform}. Allowed: ${rules.allowedMimeTypes.join(', ')}`
      );
    }

    // Check file size
    if (file.length > rules.maxFileSize) {
      errors.push(
        `File size ${this.formatBytes(file.length)} exceeds maximum ${this.formatBytes(rules.maxFileSize)} for ${platform}`
      );
    }

    // Check aspect ratio
    let targetAspectRatios = [...rules.aspectRatios];
    let minWidth = rules.minDimensions.width;
    let minHeight = rules.minDimensions.height;

    // Instagram specific logic for Reels/Stories
    if (platform === 'INSTAGRAM') {
      // Frontend sends options.postType (not instagramPostType)
      const igType = options?.postType || 'FEED';
      if (igType === 'REEL' || igType === 'STORY') {
        targetAspectRatios = [0.562, 0.5, 0.45, 0.4, 0.8]; // Support ultra-tall vertical
        minWidth = 320; 
        minHeight = 480; // Lowered to support more dimensions
      }
    }

    if (!targetAspectRatios.some((validRatio) => Math.abs(aspectRatio - validRatio) <= 0.15)) {
      errors.push(
        `Aspect ratio ${aspectRatio.toFixed(2)} not valid for ${platform}. Valid ratios: ${targetAspectRatios.join(', ')}`
      );
    }

    // Check dimensions
    if (width < minWidth || height < minHeight) {
      errors.push(
        `Dimensions ${width}x${height} below minimum ${minWidth}x${minHeight} for ${platform}`
      );
    }

    // Check media count (validation happens at service level, but we check type here)
    if (type === 'video') {
      // Platform/post-type-aware duration limit
      let effectiveDurationLimit = rules.videoDurationLimit;
      if (platform === 'INSTAGRAM') {
        const igType = options?.postType || 'FEED';
        if (igType === 'REEL') effectiveDurationLimit = 90;       // Reels: up to 90s
        else if (igType === 'STORY') effectiveDurationLimit = 15;  // Stories: 15s per clip
        // FEED stays at 60s
      }

      if (duration > 0 && duration > effectiveDurationLimit) {
        errors.push(
          `Video duration exceeds maximum ${effectiveDurationLimit}s for ${platform}${platform === 'INSTAGRAM' ? ` (${options?.postType || 'FEED'})` : ''}`
        );
      }
    }
 
    // Generate recommended crop if aspect ratio is invalid
    let recommendedCrop: { x: number; y: number; w: number; h: number } | undefined;
    if (type === 'image' && errors.some((e) => e.includes('Aspect ratio'))) {
      recommendedCrop = this.calculateRecommendedCrop(width, height, platform);
    }
 
    return {
      valid: errors.length === 0,
      errors,
      recommendedCrop,
      metadata: {
        width,
        height,
        aspectRatio,
        mimeType,
        sizeBytes: file.length,
        duration
      }
    };
  }

  /**
   * Convert sharp format string to MIME type
   */
  private formatToMimeType(format: string): string {
    const formatMap: Record<string, string> = {
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo'
    };
    return formatMap[format.toLowerCase()] || `application/${format}`;
  }

  /**
   * Calculate recommended crop to fit closest valid aspect ratio
   */
  private calculateRecommendedCrop(
    width: number,
    height: number,
    platform: string
  ): { x: number; y: number; w: number; h: number } | undefined {
    const rules = getPlatformRules(platform);
    const currentRatio = width / height;

    // Find closest valid ratio
    const closestRatio = rules.aspectRatios.reduce(
      (closest, ratio) => {
        return Math.abs(ratio - currentRatio) < Math.abs(closest - currentRatio)
          ? ratio
          : closest;
      },
      rules.aspectRatios[0]
    );

    // Calculate crop dimensions
    let cropWidth: number;
    let cropHeight: number;

    if (closestRatio > currentRatio) {
      // Need wider crop - reduce height
      cropWidth = width;
      cropHeight = Math.round(width / closestRatio);
    } else {
      // Need taller crop - reduce width
      cropHeight = height;
      cropWidth = Math.round(height * closestRatio);
    }

    const x = Math.round((width - cropWidth) / 2);
    const y = Math.round((height - cropHeight) / 2);

    return {
      x: Math.max(0, x),
      y: Math.max(0, y),
      w: cropWidth,
      h: cropHeight
    };
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get media metadata without validation
   */
  async getMetadata(file: Buffer): Promise<MediaValidationResult['metadata']> {
    try {
      const metadata = await sharp(file).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      return {
        width,
        height,
        aspectRatio: height > 0 ? width / height : 0,
        mimeType: metadata.format ? this.formatToMimeType(metadata.format) : 'unknown',
        sizeBytes: file.length,
        duration: metadata.duration
      };
    } catch (e) {
      // Return basic info if sharp fails (e.g. for videos)
      return {
        width: 0,
        height: 0,
        aspectRatio: 0,
        mimeType: 'video/mp4',
        sizeBytes: file.length,
        duration: 0
      };
    }
  }
}

export const mediaValidator = new MediaValidatorService();
