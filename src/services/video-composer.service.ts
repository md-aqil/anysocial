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
        console.log(`[Download Resiliency Fallback] Dynamically generating LLM backdrop for ${fileName}...`);
        const { AiOrchestratorService } = await import('./ai-orchestrator.service.js');
        const aiOrchestrator = new AiOrchestratorService();
        
        // Use a generic cinematic landscape/portrait descriptor
        const generatedPath = await aiOrchestrator.generateImage("beautiful cinematic vertical background wallpaper, vertical 9:16, no text, no watermark", Math.floor(Math.random() * 1000000));
        if (fs.existsSync(generatedPath)) {
          fs.copyFileSync(generatedPath, tempPath);
          return tempPath;
        }
      } catch (genErr: any) {
        console.error(`[Download Resiliency Fallback] Dynamic image generation chain failed: ${genErr.message}`);
      }
    }

    if (!isAudio) {
      console.error(`[Download Resiliency Critical] LLM backdrop generation failed. Creating zero-byte emergency file.`);
      fs.writeFileSync(tempPath, Buffer.alloc(0));
      return tempPath;
    }

    try {
      const response = await fetch('https://raw.githubusercontent.com/mdn/webaudio-examples/main/audio-analyser/viper.mp3', { signal: AbortSignal.timeout(10000) });
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
        resolve(Number(metadata.format.duration) || 60);
      });
    });
  }

  /**
   * Generates video clips from images or short videos, standardizing their resolution and length.
   * Applies pan/zoom effect to images.
   */
  static async createVideoClips(
    imageUrls: string[], 
    duration: number | number[] = 10, 
    orientation: 'vertical' | 'horizontal' = 'vertical', 
    signal?: AbortSignal,
    movements?: string[]
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
          const isVideo = imagePath.toLowerCase().endsWith('.mp4') || imagePath.toLowerCase().endsWith('.webm') || imagePath.toLowerCase().endsWith('.mov');
          const currentDuration = Array.isArray(duration) ? duration[index] : duration;
          
          const proc = ffmpeg(imagePath);
          
          if (isVideo) {
            proc.outputOptions([
                `-t ${currentDuration + 2}`,
                `-vf scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps},tpad=stop_mode=clone:stop_duration=2`,
                '-c:v libx264',
                '-pix_fmt yuv420p',
                `-r ${fps}`,
                '-preset superfast'
              ]);
          } else {
            // Pre-crop image to 9:16 ratio at double resolution to prevent any stretching before zoompan
            const cropW = 1440;
            const cropH = 2560;
            
            const currentMovement = movements && movements[index] ? movements[index] : 'zoom_in';
            let zoomPanFilter = `zoompan=z='min(zoom+0.0006,1.5)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}`; // Default zoom_in
            
            if (currentMovement === 'zoom_out') {
              zoomPanFilter = `zoompan=z='max(1.3-0.001*in,1.0)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}`;
            } else if (currentMovement === 'pan_right') {
              zoomPanFilter = `zoompan=z='1.2':d=1:x='min(x+2,iw-iw/zoom)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}`;
            } else if (currentMovement === 'pan_left') {
              zoomPanFilter = `zoompan=z='1.2':d=1:x='max(iw-iw/zoom-x-2,0)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}`;
            } else if (currentMovement === 'pan_up') {
              zoomPanFilter = `zoompan=z='1.2':d=1:x='iw/2-(iw/zoom/2)':y='max(ih-ih/zoom-y-2,0)':s=${width}x${height}:fps=${fps}`;
            } else if (currentMovement === 'pan_down') {
              zoomPanFilter = `zoompan=z='1.2':d=1:x='iw/2-(iw/zoom/2)':y='min(y+2,ih-ih/zoom)':s=${width}x${height}:fps=${fps}`;
            } else if (currentMovement === 'static') {
              zoomPanFilter = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
            }

            proc.inputOptions(['-loop 1'])
              .outputOptions([
                `-t ${currentDuration + 2}`,
                '-vf', `scale=${cropW}:${cropH}:force_original_aspect_ratio=increase,crop=${cropW}:${cropH},setsar=1,${zoomPanFilter}`,
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

  static async concatVideos(videoPaths: string[], signal?: AbortSignal, clipDuration: number | number[] = 4.0): Promise<{ outputPath: string, tempFiles: string[] }> {
    if (videoPaths.length <= 1) {
      return { outputPath: videoPaths[0] || '', tempFiles: [] };
    }

    const outputPath = path.join(os.tmpdir(), `concat_${Date.now()}.mp4`);
    const tempFiles: string[] = [];

    await new Promise((resolve, reject) => {
      const proc = ffmpeg();
      
      // Add all input clips
      for (const p of videoPaths) {
        proc.input(p);
      }

      const transitionDuration = 0.5; // 0.5s zoom-in transition
      let filterString = '';
      let lastOutput = '[0:v]';
      let accumulatedDuration = 0;

      const transitions = ['zoomin', 'fade', 'pixelize', 'slideleft', 'slideright', 'smoothup', 'circleopen', 'dissolve'];

      for (let i = 0; i < videoPaths.length - 1; i++) {
        const nextInput = `[${i + 1}:v]`;
        const outputLabel = `[v_trans_${i}]`;
        
        const currentClipDuration = Array.isArray(clipDuration) ? clipDuration[i] : clipDuration;
        accumulatedDuration += currentClipDuration;
        
        // Exact offset mathematical formula to trigger transition at clip boundary
        const offset = accumulatedDuration - (i + 1) * transitionDuration;
        const randomTransition = transitions[Math.floor(Math.random() * transitions.length)];
        
        filterString += `${lastOutput}${nextInput}xfade=transition=${randomTransition}:duration=${transitionDuration}:offset=${offset}${outputLabel};`;
        lastOutput = outputLabel;
      }

      if (filterString.endsWith(';')) {
        filterString = filterString.slice(0, -1);
      }

      proc.complexFilter([filterString])
        .map(lastOutput)
        .videoCodec('libx264')
        .outputOptions([
          '-pix_fmt yuv420p',
          '-preset superfast'
        ])
        .on('error', (err) => {
          if (signal?.aborted) return resolve(false);
          console.error('[Concat Zoom Transition Error]:', err.message);
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

    return { outputPath, tempFiles };
  }

  static transliterateHindiToRoman(text: string): string {
    const charMap: Record<string, string> = {
      'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
      'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng', 'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
      'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n', 'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
      'प': 'p', 'फ': 'f', 'ब': 'b', 'भ': 'bh', 'म': 'm', 'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
      'क्ष': 'ksh', 'त्र': 'tr', 'ज्ञ': 'gy',
      'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
      'ं': 'n', 'ँ': 'n', 'ः': 'h', '्': '', '़': '', 'ऽ': 'a', 'ॐ': 'om', '।': '.', '॥': '.'
    };
    
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (charMap[char] !== undefined) {
        result += charMap[char];
      } else {
        result += char;
      }
    }
    return result;
  }

  /**
   * Generates a premium animated Advanced SubStation Alpha (.ass) subtitle file.
   * Utilizes the custom Poppins font with dynamic karaoke timing tags for highlighting words as they are spoken.
   */
  static async generateSubtitlesFile(script: string, durationInSeconds: number, wordTimings?: Array<{ word: string, startTime: number, endTime: number }>): Promise<string> {
    const assPath = path.join(os.tmpdir(), `subs_${Date.now()}.ass`);
    
    // Snappy TikTok/Reels style: Group words into blocks of 3 words per line
    const wordsPerLine = 3;
    const lines: { text: string[], duration: number, wordsCs: number[], startTime?: number }[] = [];

    if (wordTimings && wordTimings.length > 0) {
      // 🚀 AI-DRIVEN PRECISE TIMING MODE (Perfect Sync)
      for (let i = 0; i < wordTimings.length; i += wordsPerLine) {
        const lineTimings = wordTimings.slice(i, i + wordsPerLine);
        const lineStartTime = lineTimings[0].startTime;
        const lineEndTime = lineTimings[lineTimings.length - 1].endTime;
        const lineDuration = lineEndTime - lineStartTime;
        
        const lineWords: string[] = [];
        const wordsCs: number[] = [];
        
        for (const wt of lineTimings) {
          lineWords.push(wt.word);
          const wordDurCs = Math.round((wt.endTime - wt.startTime) * 100);
          wordsCs.push(Math.max(wordDurCs, 1)); // At least 1cs
        }
        
        lines.push({ text: lineWords, duration: lineDuration, wordsCs, startTime: lineStartTime });
      }
    } else {
      // ⚠️ FALLBACK MATH-BASED HEURISTIC MODE
      const cleanScript = script.replace(/[^\w\s.,!?'"’\-अ-ह०-९]/g, '');
      const words = cleanScript.split(/\s+/).filter(w => w.length > 0);
      
      if (words.length === 0) {
        fs.writeFileSync(assPath, '');
        return assPath;
      }

    // First pass to assign relative weights based on word length and punctuation
    const wordWeights = words.map(w => {
      let weight = w.length;
      if (w.endsWith(',') || w.endsWith(';')) weight += 3;
      if (w.endsWith('.') || w.endsWith('!') || w.endsWith('?')) weight += 6;
      // Base minimum weight so short words (like "a", "I") still get some time
      return Math.max(weight, 2); 
    });
    
    const totalWeight = wordWeights.reduce((sum, w) => sum + w, 0);
    const durationPerWeight = durationInSeconds / totalWeight;

    // The lines array and wordsPerLine are already declared in the outer scope, so we just use them.
      for (let i = 0; i < words.length; i += wordsPerLine) {
        const lineWords = words.slice(i, i + wordsPerLine);
        const lineWeights = wordWeights.slice(i, i + wordsPerLine);
        let lineDuration = 0;
        const wordsCs: number[] = [];
        
        for (let j = 0; j < lineWords.length; j++) {
          const wordDur = lineWeights[j] * durationPerWeight;
          lineDuration += wordDur;
          wordsCs.push(Math.round(wordDur * 100)); // centiseconds for karaoke
        }
        
        lines.push({ text: lineWords, duration: lineDuration, wordsCs });
      }
    }

    const formatTime = (timeInSeconds: number) => {
      const hours = Math.floor(timeInSeconds / 3600);
      const minutes = Math.floor((timeInSeconds % 3600) / 60);
      const seconds = Math.floor(timeInSeconds % 60);
      const centiseconds = Math.floor((timeInSeconds % 1) * 100);
      
      const pad = (num: number, size: number) => ('00' + num).slice(-size);
      return `${hours}:${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(centiseconds, 2)}`;
    };

    const isHindi = /[\u0900-\u097F]/.test(script);
    const fontName = isHindi ? 'Arial' : 'Poppins';

    let assContent = `[Script Info]
; Script generated by AnySocial Premium Subtitle Engine
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},64,&H00FFFFFF,&H0000FFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,3.0,0,2,10,10,420,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    let currentTime = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const startTime = line.startTime !== undefined ? line.startTime : currentTime;
      const endTime = startTime + line.duration;
      currentTime = endTime;
      
      const startStr = formatTime(startTime);
      const endStr = formatTime(endTime);
      
      const lineDurationCs = Math.round(line.duration * 100);
      
      // Add a continuous slow zoom effect over the entire duration of the segment
      const durationMs = lineDurationCs * 10;
      let textWithKaraoke = `{\\fscx95\\fscy95\\t(0,${durationMs},\\fscx115\\fscy115)}`;
      let remainingCs = lineDurationCs;
      
      for (let j = 0; j < line.text.length; j++) {
        let wordDurationCs = line.wordsCs[j];
        
        if (j === line.text.length - 1) {
          wordDurationCs = remainingCs; // prevent rounding drift
        } else {
          remainingCs -= wordDurationCs;
        }
        
        textWithKaraoke += `{\\kf${wordDurationCs}}${line.text[j]} `;
      }

      assContent += `Dialogue: 0,${startStr},${endStr},Default,,0000,0000,0000,,${textWithKaraoke.trim()}\n`;
    }

    fs.writeFileSync(assPath, assContent);
    return assPath;
  }


  /**
   * Merges a final video with a primary audio track (e.g., voiceover) and burns subtitles.
   */
  static async mergeAudioVideo(videoPath: string, audioUrl?: string | null, subtitlePath?: string, signal?: AbortSignal, hookText?: string, duration?: number, llmDetails?: string): Promise<{ outputPath: string, tempFiles: string[] }> {
    const tempFiles: string[] = [];
    let audioPath: string | null = null;
    if (audioUrl) {
      audioPath = audioUrl.startsWith('/') ? audioUrl : await downloadToTemp(audioUrl, `audio_${Date.now()}.mp3`);
      if (!audioUrl.startsWith('/')) tempFiles.push(audioPath);
    }
    
    const finalOutputPath = path.join(os.tmpdir(), `final_${Date.now()}.mp4`);
    
    await new Promise((resolve, reject) => {
        const filters: string[] = [];
        
        if (subtitlePath) {
          // Burn subtitles into video using escaped path to ensure robustness
          const escapedPath = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:');
          filters.push(`subtitles='${escapedPath}'`);
        }
    
        // Hook overlay if provided (render it at the top of the viewport)
        if (hookText) {
          const fontPath = path.join(process.cwd(), 'src', 'assets', 'fonts', 'Poppins-Bold.ttf');
          const escapedHook = hookText.replace(/'/g, "'\\''");
          // position it dynamically at the upper center
          filters.push(`drawtext=text='${escapedHook}':fontfile='${fontPath}':fontcolor=white:fontsize=32:bordercolor=black:borderw=3:shadowcolor=black@0.6:shadowx=2:shadowy=2:x=(w-text_w)/2:y=120`);
        }

        // LLM Details Watermark (render at the bottom)
        if (llmDetails) {
          const fontPath = path.join(process.cwd(), 'src', 'assets', 'fonts', 'Poppins-Bold.ttf');
          const escapedDetails = llmDetails.replace(/'/g, "'\\''").replace(/:/g, '\\:');
          filters.push(`drawtext=text='${escapedDetails}':fontfile='${fontPath}':fontcolor=white@0.6:fontsize=20:box=1:boxcolor=black@0.4:boxborderw=5:x=(w-text_w)/2:y=h-60`);
        }

        const outputOpts: string[] = [];

        if (audioPath) {
          outputOpts.push(
            '-c:a aac',
            '-b:a 192k',
            '-map 0:v:0',
            '-map 1:a:0'
          );
        } else {
          outputOpts.push(
            '-map 0:v:0',
            '-c:a copy'
          );
        }
    
        // Trim to duration if specified, otherwise use shortest stream
        if (duration) {
          outputOpts.push(`-t ${duration}`);
        } else if (audioPath) {
          outputOpts.push('-shortest');
        }
    
        const proc = ffmpeg()
          .input(videoPath);

        if (audioPath) {
          proc.input(audioPath);
        }

        if (filters.length > 0) {
          proc.videoCodec('libx264')
              .videoFilters(filters);
          outputOpts.push('-preset', 'superfast');
        } else {
          proc.videoCodec('copy');
        }

        proc.outputOptions(outputOpts)
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
  static async addBackgroundMusic(voiceoverPath: string, bgmPath: string, duration: number, signal?: AbortSignal): Promise<{ outputPath: string, tempFiles: string[] }> {
    const outputPath = path.join(os.tmpdir(), `mixed_${Date.now()}.wav`);
    
    await new Promise((resolve, reject) => {
      const proc = ffmpeg()
        .input(voiceoverPath)
        .input(bgmPath)
        .inputOptions(['-stream_loop', '-1'])
        .complexFilter([
          // Downmix BGM volume to make voiceover clearly audible
          '[1:a]volume=0.35[bgm]',
          // Mix background audio with voiceover. Finish when the voiceover (first input) ends.
          '[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[out]'
        ])
        .map('[out]')
        .audioCodec('pcm_s16le')
        .outputOptions([`-t ${duration}`])
        .on('error', (err) => {
          if (signal?.aborted) return resolve(false);
          reject(err);
        })
        .on('end', () => {
          try {
            const stats = fs.statSync(outputPath);
            if (stats.size === 0) {
              return reject(new Error(`addBackgroundMusic generated a 0-byte file at ${outputPath}`));
            }
            resolve(true);
          } catch (e: any) {
            reject(new Error(`addBackgroundMusic failed to verify output file: ${e.message}`));
          }
        });

      if (signal) {
        signal.addEventListener('abort', () => {
          try { (proc as any).kill('SIGKILL'); } catch (e) {}
          reject(new Error('Aborted'));
        });
      }

      proc.save(outputPath);
    });

    return { outputPath, tempFiles: [] };
  }

  /**
   * Loops an audio file to reach a target duration.
   */
  static async extendAudio(audioPath: string, duration: number, signal?: AbortSignal): Promise<string> {
    const outputPath = path.join(os.tmpdir(), `extended_${Date.now()}.mp3`);
    await new Promise((resolve, reject) => {
      const proc = ffmpeg(audioPath)
        .inputOptions(['-stream_loop', '-1'])
        .outputOptions([`-t ${duration}`])
        .audioCodec('libmp3lame')
        .on('end', resolve)
        .on('error', reject);
      
      if (signal) {
        signal.addEventListener('abort', () => {
          try { (proc as any).kill('SIGKILL'); } catch (e) {}
          reject(new Error('Aborted'));
        });
      }
      proc.save(outputPath);
    });
    return outputPath;
  }

  // New method: generateThumbnail extracts a single frame as JPEG.
  static async generateThumbnail(videoPath: string, outputPath?: string): Promise<string> {
    const outPath = outputPath ?? path.join(path.dirname(videoPath), `thumb_${path.basename(videoPath, path.extname(videoPath))}.jpg`);
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions(['-vframes 1', '-q:v 2'])
        .output(outPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
    return outPath;
  }
}
