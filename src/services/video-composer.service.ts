import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { promisify } from 'util';
import stream from 'stream';

// Configure fontconfig to use our local fonts.conf so that Poppins is resolved globally
process.env.FONTCONFIG_FILE = path.join(process.cwd(), 'fonts.conf');

/**
 * Ensures Poppins font is copied to standard system fonts directory (~/.fonts) 
 * so that libass / fontconfig can find it dynamically on any hosting provider.
 */
function ensureFontsInstalled() {
  try {
    const homedir = os.homedir();
    const isMac = process.platform === 'darwin';
    const systemFontsDir = isMac 
      ? path.join(homedir, 'Library', 'Fonts') 
      : path.join(homedir, '.fonts');
      
    const localFontPath = path.join(process.cwd(), 'src', 'assets', 'fonts', 'Poppins-Bold.ttf');
    
    if (fs.existsSync(localFontPath)) {
      if (!fs.existsSync(systemFontsDir)) {
        fs.mkdirSync(systemFontsDir, { recursive: true });
      }
      const targetFontPath = path.join(systemFontsDir, 'Poppins-Bold.ttf');
      if (!fs.existsSync(targetFontPath)) {
        fs.copyFileSync(localFontPath, targetFontPath);
        console.log(`Successfully installed premium font Poppins-Bold.ttf to ${targetFontPath}`);
      }
    }
  } catch (err) {
    console.error('Failed to copy Poppins font to system folder:', err);
  }
}

// Run font setup immediately upon importing the service
ensureFontsInstalled();

const pipeline = promisify(stream.pipeline);

/**
 * Helper to download a URL to a local temp file with robust error handling and fallback support
 */
async function downloadToTemp(url: string, fileName: string): Promise<string> {
  const tempPath = path.join(os.tmpdir(), fileName);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(15000) // 15s timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP Status ${response.status}`);
    }
    
    const fileStream = fs.createWriteStream(tempPath);
    // @ts-ignore
    await pipeline(response.body, fileStream);
    return tempPath;
  } catch (err: any) {
    console.error(`[Download Resiliency Fallback] Failed to download ${url}: ${err.message}. Using backup asset.`);
    
    // Auto-detect if audio or image is being requested
    const isAudio = url.includes('.mp3') || url.includes('.wav') || url.includes('.ogg') || fileName.includes('audio') || fileName.includes('bgm');
    
    if (!isAudio) {
      try {
        console.log(`[Download Resiliency Fallback] Dynamically generating backdrop for ${fileName} via Google -> NVIDIA -> Pixabay...`);
        const { AiOrchestratorService } = await import('./ai-orchestrator.service.js');
        const aiOrchestrator = new AiOrchestratorService();
        
        // Use a generic cinematic landscape/portrait descriptor
        const generatedPath = await aiOrchestrator.fetchStockImage("beautiful cinematic vertical background wallpaper");
        if (fs.existsSync(generatedPath)) {
          fs.copyFileSync(generatedPath, tempPath);
          return tempPath;
        }
      } catch (genErr: any) {
        console.error(`[Download Resiliency Fallback] Dynamic image generation chain failed: ${genErr.message}`);
      }
    }

    const fallbackUrl = isAudio
      ? 'https://raw.githubusercontent.com/mdn/webaudio-examples/main/audio-analyser/viper.mp3'
      : 'https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=400&h=720&fit=crop'; // fallback URL as safety check only

    try {
      const response = await fetch(fallbackUrl, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`Backup server returned ${response.status}`);
      const fileStream = fs.createWriteStream(tempPath);
      // @ts-ignore
      await pipeline(response.body, fileStream);
      return tempPath;
    } catch (fallbackErr: any) {
      console.error(`[Download Resiliency Critical] Backup also failed: ${fallbackErr.message}. Creating zero-byte emergency file.`);
      fs.writeFileSync(tempPath, Buffer.alloc(0));
      return tempPath;
    }
  }
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
   * Generates a premium animated Advanced SubStation Alpha (.ass) subtitle file.
   * Utilizes the custom Poppins font with dynamic karaoke timing tags for highlighting words as they are spoken.
   */
  static async generateSubtitlesFile(script: string, durationInSeconds: number): Promise<string> {
    const assPath = path.join(os.tmpdir(), `subs_${Date.now()}.ass`);
    
    // Clean script: Keep alphanumeric, spaces, and Devanagari (Hindi) characters
    const cleanScript = script.replace(/[^\w\s\u0900-\u097F]/g, '');
    const words = cleanScript.split(/\s+/).filter(w => w.length > 0);
    
    if (words.length === 0) {
      fs.writeFileSync(assPath, '');
      return assPath;
    }

    // Snappy TikTok/Reels style: Group words into blocks of 3 words per line
    const wordsPerLine = 3;
    const lines: string[][] = [];
    for (let i = 0; i < words.length; i += wordsPerLine) {
      lines.push(words.slice(i, i + wordsPerLine));
    }

    const totalLines = lines.length;
    const durationPerLine = durationInSeconds / totalLines;

    const formatTime = (timeInSeconds: number) => {
      const hours = Math.floor(timeInSeconds / 3600);
      const minutes = Math.floor((timeInSeconds % 3600) / 60);
      const seconds = Math.floor(timeInSeconds % 60);
      const centiseconds = Math.floor((timeInSeconds % 1) * 100);
      
      const pad = (num: number, size: number) => ('00' + num).slice(-size);
      return `${hours}:${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(centiseconds, 2)}`;
    };

    let assContent = `[Script Info]
; Script generated by AnySocial Premium Subtitle Engine
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Poppins,44,&H00FFFFFF,&H0000FFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,3.0,0,2,10,10,420,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    for (let i = 0; i < totalLines; i++) {
      const lineWords = lines[i];
      const startTime = i * durationPerLine;
      const endTime = (i + 1) * durationPerLine;
      
      const startStr = formatTime(startTime);
      const endStr = formatTime(endTime);
      
      const lineDurationCs = Math.round(durationPerLine * 100);
      const wordsCount = lineWords.length;
      
      // Add a pop animation at the start of each dialog segment
      let textWithKaraoke = '{\\t(0,100,\\fscx108\\fscy108)\\t(100,200,\\fscx100\\fscy100)}';
      let remainingCs = lineDurationCs;
      
      for (let j = 0; j < wordsCount; j++) {
        let wordDurationCs = Math.floor(lineDurationCs / wordsCount);
        if (j === wordsCount - 1) {
          wordDurationCs = remainingCs;
        } else {
          remainingCs -= wordDurationCs;
        }
        
        textWithKaraoke += `{\\kf${wordDurationCs}}${lineWords[j]} `;
      }

      assContent += `Dialogue: 0,${startStr},${endStr},Default,,0000,0000,0000,,${textWithKaraoke.trim()}\n`;
    }

    fs.writeFileSync(assPath, assContent);
    return assPath;
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
          // Burn subtitles into video using escaped path to ensure robustness
          const escapedPath = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:');
          outputOpts.unshift('-c:v libx264', '-preset superfast', `-vf subtitles='${escapedPath}'`);
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
