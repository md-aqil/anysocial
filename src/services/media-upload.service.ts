import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';

// Set explicit ffmpeg path for Homebrew installs on Mac
ffmpeg.setFfmpegPath('/opt/homebrew/bin/ffmpeg');
ffmpeg.setFfprobePath('/opt/homebrew/bin/ffprobe');

export interface MediaMeta {
  mimeType: string;
  originalName: string;
  postId: string;
  platform?: string;
}

export interface UploadResult {
  url: string;
  key: string;
  contentType: string;
}

export interface PlatformVariant {
  platform: string;
  url: string;
  dimensions: { width: number; height: number };
  aspectRatio: number;
}

export interface StorageProvider {
  upload(file: Buffer, meta: MediaMeta): Promise<UploadResult>;
  generateVariants(file: Buffer, platform: string): Promise<PlatformVariant[]>;
}

export class LocalDiskStorageService implements StorageProvider {
  private uploadDir: string;
  private baseUrl: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'frontend', 'public', 'uploads');
    this.baseUrl = process.env.BASE_URL?.replace(':3001', ':3000') || 'http://localhost:3000'; // Target frontend URL statically
    
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(file: Buffer, meta: MediaMeta): Promise<UploadResult> {
    const filename = `${uuidv4()}-${meta.originalName.replace(/[^a-zA-Z0-9.]/g, '')}`;
    const filePath = path.join(this.uploadDir, filename);

    fs.writeFileSync(filePath, file);

    const url = `${this.baseUrl}/uploads/${filename}`;

    return {
      url,
      key: filename,
      contentType: meta.mimeType
    };
  }

  async generateVariants(file: Buffer, platform: string): Promise<PlatformVariant[]> {
    const variants: PlatformVariant[] = [];
    
    try {
      const metadata = await sharp(file).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      variants.push({
        platform,
        url: '',
        dimensions: { width, height },
        aspectRatio: height > 0 ? width / height : 0
      });

      if (platform === 'INSTAGRAM' && width !== height) {
        const size = Math.min(width, height);
        // We do not need to convert toBuffer here, we are just defining variants for metadata
        // If we needed to save it to disk, we would do it here. 
        // For now, these are placeholder variants for the result structure.
        variants.push({
          platform: 'INSTAGRAM_SQUARE',
          url: '',
          dimensions: { width: size, height: size },
          aspectRatio: 1.0
        });
      }
    } catch (e) {
      // If sharp fails (e.g. for videos), return empty for now
    }

    return variants;
  }

  // Check if FFmpeg is actually available on the system
  private isFfmpegAvailable(): boolean {
    return fs.existsSync('/opt/homebrew/bin/ffmpeg') && fs.existsSync('/opt/homebrew/bin/ffprobe');
  }

  async conformImage(file: Buffer, targetRatio: number): Promise<Buffer> {
    const metadata = await sharp(file).metadata();
    const { width, height } = metadata;
    if (!width || !height) return file;

    const currentRatio = width / height;
    
    // Determine the total size of the new canvas
    let canvasWidth, canvasHeight;
    if (currentRatio > targetRatio) {
      // Current is wider than target
      canvasWidth = width;
      canvasHeight = Math.round(width / targetRatio);
    } else {
      // Current is taller than target
      canvasWidth = Math.round(height * targetRatio);
      canvasHeight = height;
    }

    // 1. Create the blurred background
    const blurredBackground = await sharp(file)
      .resize(canvasWidth, canvasHeight, { fit: 'cover' })
      .blur(40)
      .toBuffer();

    // 2. Overlay the original image centered
    return await sharp(blurredBackground)
      .composite([{ 
        input: file, 
        gravity: 'center' 
      }])
      .toFormat('jpeg')
      .toBuffer();
  }

  async conformVideo(inputPath: string, targetRatio: number): Promise<string> {
    if (!this.isFfmpegAvailable()) {
      console.warn('FFmpeg/ffprobe not found. Skipping auto-conform and using original video.');
      return inputPath;
    }
    
    const filename = `${uuidv4()}-conformed.mp4`;
    const outputPath = path.join(this.uploadDir, filename);

    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) return reject(err);
        
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        if (!videoStream) return reject(new Error('No video stream found'));
        
        const { width, height } = videoStream;
        if (!width || !height) return reject(new Error('Invalid video dimensions'));

        const currentRatio = width / height;
        
        let targetWidth, targetHeight;
        if (currentRatio > targetRatio) {
          targetWidth = width;
          targetHeight = Math.round(width / targetRatio);
        } else {
          targetHeight = height;
          targetWidth = Math.round(height * targetRatio);
        }
        
        // Ensure even dimensions for H.264
        const w = targetWidth % 2 === 0 ? targetWidth : targetWidth + 1;
        const h = targetHeight % 2 === 0 ? targetHeight : targetHeight + 1;

        ffmpeg(inputPath)
          .complexFilter([
            // Layer 1: Scaled & blurred background (high blur power for dreamy effect)
            `[0:v]scale=${w}:${h},boxblur=luma_radius=20:luma_power=4[bg]`,
            // Layer 2: Original scaled to fit, centred
            `[0:v]scale=${w}:${h}:force_original_aspect_ratio=decrease[fg]`,
            // Combine layers
            `[bg][fg]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2[outv]`
          ])
          .map('[outv]')       // video output
          .map('0:a?')         // audio (optional — won't fail if source has no audio)
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions([
            '-pix_fmt yuv420p',    // yuv420p for broadest device compatibility
            '-movflags +faststart' // place moov atom at file start for streaming/mobile
          ])
          .output(outputPath)
          .on('end', () => resolve(outputPath))
          .on('error', (err) => reject(err))
          .run();
      });
    });
  }
}

export const storageService = new LocalDiskStorageService();
