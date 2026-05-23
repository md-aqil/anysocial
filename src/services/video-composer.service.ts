import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { promisify } from 'util';
import stream from 'stream';

const pipeline = promisify(stream.pipeline);

/**
 * Helper to download a URL to a local temp file
 */
async function downloadToTemp(url: string, fileName: string): Promise<string> {
  const tempPath = path.join(os.tmpdir(), fileName);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${url}`);
  
  const fileStream = fs.createWriteStream(tempPath);
  // @ts-ignore - response.body is a readable stream
  await pipeline(response.body, fileStream);
  return tempPath;
}

export class VideoComposerService {
  /**
   * Helper to accurately get the duration of an audio or video file using ffprobe.
   */
  static getMediaDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return reject(err);
        resolve(metadata.format.duration || 60);
      });
    });
  }

  /**
   * Generates video clips from images or short videos, standardizing their resolution and length.
   * Applies pan/zoom effect to images.
   */
  static async createVideoClips(
    imageUrls: string[], 
    duration: number = 10, 
    orientation: 'vertical' | 'horizontal' = 'vertical', 
    signal?: AbortSignal
  ): Promise<{ clipPaths: string[], tempFiles: string[] }> {
    const width = orientation === 'horizontal' ? 1280 : 720;
    const height = orientation === 'horizontal' ? 720 : 1280;
    
    const clipPaths: string[] = [];
    const tempFiles: string[] = [];
    const BATCH_SIZE = 6; // Balanced for CPU usage and speed

    for (let i = 0; i < imageUrls.length; i += BATCH_SIZE) {
      const batch = imageUrls.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (url, j) => {
        const index = i + j;
        if (signal?.aborted) throw new Error('Aborted');
        
        let imagePath = url;
        if (!url.startsWith('/')) {
          imagePath = await downloadToTemp(url, `img_${Date.now()}_${index}.jpg`);
          tempFiles.push(imagePath);
        }
        
        // Basic check: Does file exist and have size?
        if (!fs.existsSync(imagePath) || fs.statSync(imagePath).size < 100) {
          throw new Error(`Invalid image file at ${imagePath}`);
        }

        const outputPath = path.join(os.tmpdir(), `clip_${Date.now()}_${index}.mp4`);
        tempFiles.push(outputPath);

        await new Promise((resolve, reject) => {
          const fps = 25;
          const isVideo = imagePath.toLowerCase().endsWith('.mp4') || imagePath.toLowerCase().endsWith('.webm');
          
          const proc = ffmpeg(imagePath);
          
          if (isVideo) {
            proc.inputOptions(['-stream_loop -1'])
              .outputOptions([
                `-t ${duration}`,
                `-vf scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=${fps}`,
                '-c:v libx264',
                '-pix_fmt yuv420p',
                `-r ${fps}`,
                '-preset superfast'
              ]);
          } else {
            proc.inputOptions(['-loop 1'])
              .outputOptions([
                `-t ${duration}`,
                '-vf', `scale=iw*2:-2,zoompan=z='min(zoom+0.0006,1.5)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}`,
                '-c:v libx264',
                '-pix_fmt yuv420p',
                `-r ${fps}`,
                '-preset superfast' 
              ]);
          }

          proc.on('start', () => console.log(`FFmpeg started (Clip ${index})`))
            .on('error', (err) => {
              if (signal?.aborted) return resolve(false);
              console.error(`FFmpeg Error (Clip ${index}):`, err.message);
              reject(new Error(`FFmpeg failed: ${err.message}`));
            })
            .on('end', () => resolve(true));

          if (signal) {
            signal.addEventListener('abort', () => {
              try { (proc as any).kill('SIGKILL'); } catch (e) {}
              reject(new Error('Aborted'));
            });
          }

          proc.save(outputPath);
        });

        return outputPath;
      });

      const results = await Promise.all(batchPromises);
      clipPaths.push(...results.filter((r): r is string => !!r));
    }
    
    return { clipPaths, tempFiles };
  }

  /**
   * Concatenates multiple video clips into a single video file.
   */
  static async concatVideos(videoPaths: string[], signal?: AbortSignal): Promise<{ outputPath: string, tempFiles: string[] }> {
    const outputPath = path.join(os.tmpdir(), `concat_${Date.now()}.mp4`);
    const listPath = path.join(os.tmpdir(), `list_${Date.now()}.txt`);
    
    // Create a file list for ffmpeg concat demuxer
    const listContent = videoPaths.map(p => `file '${p}'`).join('\n');
    fs.writeFileSync(listPath, listContent);

    await new Promise((resolve, reject) => {
      const proc = ffmpeg()
        .input(listPath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions(['-c copy'])
        .on('error', (err) => {
          if (signal?.aborted) return resolve(false);
          reject(err);
        })
        .on('end', resolve);

      if (signal) {
        signal.addEventListener('abort', () => {
          try { (proc as any).kill('SIGKILL'); } catch (e) {}
          reject(new Error('Aborted'));
        });
      }

      proc.save(outputPath);
    });

    return { outputPath, tempFiles: [listPath] };
  }

  /**
   * Generates a basic animated subtitle (.srt) file based on word count and duration
   */
  static async generateSubtitlesFile(script: string, durationInSeconds: number): Promise<string> {
    const srtPath = path.join(os.tmpdir(), `subs_${Date.now()}.srt`);
    const cleanScript = script.replace(/[^\w\s\u0900-\u097F]/g, ''); // Keep alphanumeric and Hindi/Devanagari
    const words = cleanScript.split(/\s+/).filter(w => w.length > 0);
    
    // Group words into chunks of 3 for fast, animated Tiktok-style pacing
    const wordsPerSubtitle = 3;
    const totalChunks = Math.ceil(words.length / wordsPerSubtitle);
    const durationPerChunk = durationInSeconds / totalChunks;

    let srtContent = '';
    const formatTime = (timeInSeconds: number) => {
      const date = new Date(timeInSeconds * 1000);
      return date.toISOString().substring(11, 23).replace('.', ',');
    };

    for (let i = 0; i < totalChunks; i++) {
      const chunkWords = words.slice(i * wordsPerSubtitle, (i + 1) * wordsPerSubtitle).join(' ');
      const startTime = i * durationPerChunk;
      const endTime = (i + 1) * durationPerChunk;
      srtContent += `${i + 1}\n${formatTime(startTime)} --> ${formatTime(endTime)}\n${chunkWords}\n\n`;
    }

    fs.writeFileSync(srtPath, srtContent);
    return srtPath;
  }

  /**
   * Merges a final video with a primary audio track (e.g., voiceover) and burns subtitles.
   */
  static async mergeAudioVideo(videoPath: string, audioUrl: string, subtitlePath?: string, signal?: AbortSignal): Promise<{ outputPath: string, tempFiles: string[] }> {
    const tempFiles: string[] = [];
    const audioPath = audioUrl.startsWith('/') ? audioUrl : await downloadToTemp(audioUrl, `audio_${Date.now()}.mp3`);
    if (!audioUrl.startsWith('/')) tempFiles.push(audioPath);
    
    const finalOutputPath = path.join(os.tmpdir(), `final_${Date.now()}.mp4`);

    await new Promise((resolve, reject) => {
        const outputOpts = [
          '-c:a aac',
          '-b:a 192k',
          '-map 0:v:0',
          '-map 1:a:0',
          '-shortest'
        ];

        if (subtitlePath) {
          // Burn subtitles into video (requires video transcoding)
          outputOpts.unshift('-c:v libx264', '-preset superfast', `-vf subtitles=${subtitlePath}:force_style='Fontname=Arial,Fontsize=32,PrimaryColour=&H00FFFF,Bold=1,Outline=2,BorderStyle=1,Alignment=2,MarginV=120'`);
        } else {
          outputOpts.unshift('-c:v copy');
        }

        const proc = ffmpeg()
          .input(videoPath)
          .input(audioPath)
          .outputOptions(outputOpts)
          .on('error', (err) => {
          if (signal?.aborted) return resolve(false);
          reject(err);
        })
        .on('end', resolve);

      if (signal) {
        signal.addEventListener('abort', () => {
          try { (proc as any).kill('SIGKILL'); } catch (e) {}
          reject(new Error('Aborted'));
        });
      }

      proc.save(finalOutputPath);
    });

    return { outputPath: finalOutputPath, tempFiles };
  }

  /**
   * Mixes a primary audio track (voiceover) with background music.
   */
  static async addBackgroundMusic(
    mainAudioPath: string, 
    bgMusicPath: string,
    mainDuration: number,
    signal?: AbortSignal
  ): Promise<{ outputPath: string, tempFiles: string[] }> {
    const tempFiles: string[] = [];
    const outputPath = path.join(os.tmpdir(), `audio_with_bg_${Date.now()}.mp3`);

    await new Promise((resolve, reject) => {
      const proc = ffmpeg()
        .input(bgMusicPath)
        .inputOptions(['-stream_loop -1']) // Loop the background music indefinitely
        .input(mainAudioPath)
        .outputOptions([
          '-filter_complex', `[0:a]volume=0.09,afade=t=out:st=${Math.max(0, mainDuration - 3)}:d=3[bg];[1:a][bg]amix=inputs=2:duration=first:dropout_transition=3`,
          '-c:a', 'libmp3lame',
          '-b:a', '320k'
        ])
        .on('error', (err) => {
          if (signal?.aborted) return resolve(false);
          reject(err);
        })
        .on('end', resolve);

      if (signal) {
        signal.addEventListener('abort', () => {
          try { (proc as any).kill('SIGKILL'); } catch (e) {}
          reject(new Error('Aborted'));
        });
      }

      proc.save(outputPath);
    });

    return { outputPath, tempFiles: [bgMusicPath] };
  }
}
