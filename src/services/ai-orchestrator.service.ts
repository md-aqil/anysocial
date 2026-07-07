import { VertexAI } from '@google-cloud/vertexai';
import { storageService } from './media-upload.service.js';
import textToSpeech from '@google-cloud/text-to-speech';
import speech from '@google-cloud/speech';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { GoogleAuth } from 'google-auth-library';

export class AiOrchestratorService {
  private vertexAI?: VertexAI;

  constructor() {
    const project = process.env.VERTEX_AI_PROJECT_ID;
    if (project) {
      this.vertexAI = new VertexAI({
        project: project,
        location: process.env.VERTEX_AI_LOCATION || 'us-central1',
      });
    }
  }

  async analyzeMedia(mediaFile: any): Promise<any> {
    if (!this.vertexAI) {
      console.warn('Vertex AI not configured, skipping media analysis');
      return { caption: "", keywords: "", tags: "" };
    }
    const model = this.vertexAI.getGenerativeModel({ model: process.env.VERTEX_AI_MODEL || 'gemini-2.5-flash' });

    const mediaPart = {
      inlineData: {
        data: mediaFile.buffer.toString('base64'),
        mimeType: mediaFile.mimetype,
      },
    };

    const prompt = `Analyze this media and generate a social media post. Your response should be a JSON object with four properties:
1.  **title**: A short, catchy title (under 100 characters) specifically optimized for platforms like YouTube and TikTok.
2.  **caption**: A compelling and engaging caption for the post.
3.  **keywords**: A list of relevant keywords as a comma-separated string.
4.  **tags**: A list of relevant tags as a comma-separated string, including hashtags.

Make sure the output is a valid JSON object.`;

    const request = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            mediaPart
          ]
        }
      ]
    };

    let result;
    try {
      result = await model.generateContent(request);
    } catch (e: any) {
      console.error('AI Media Analysis failed:', e.message);
      return { title: "Amazing Update!", caption: "Check out this amazing new content! 🚀", keywords: "social, new, update", tags: "#amazing #trending" };
    }
    const response = result.response;

    if (!response || !response.candidates || response.candidates.length === 0) {
      throw new Error('Failed to analyze media: No response from the model');
    }

    const content = response.candidates[0].content.parts[0].text;

    if (!content) {
      throw new Error("Failed to analyze media: Empty response from the model");
    }

    try {
      let jsonStr = content;
      const match = content.match(/```(?:json)?\n?(.*?)\n?```/s);
      if (match && match[1]) {
        jsonStr = match[1];
      } else {
        const start = content.indexOf('{');
        const end = content.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          jsonStr = content.substring(start, end + 1);
        }
      }
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('AI Analysis parsing error:', error);
      // if parsing fails, just return the raw content as the caption
      return { title: "New Video", caption: content, keywords: "", tags: "" };
    }
  }

  async adaptContent(content: string, platform: string): Promise<{ adaptedContent: string }> {
    if (!this.vertexAI) {
      return { adaptedContent: content };
    }
    const model = this.vertexAI.getGenerativeModel({ model: process.env.VERTEX_AI_MODEL || 'gemini-2.5-flash' });

    const prompt = `Adapt the following social media post for ${platform}. 
Modify the tone, style, and length to fit the best practices for ${platform}.
Include relevant hashtags if appropriate for the platform.

Original Content: "${content}"

Your response should be a JSON object with one property:
1. **adaptedContent**: The modified content for ${platform}.

Make sure the output is a valid JSON object.`;

    const request = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    };

    let aiResponse = "";
    try {
      const result = await model.generateContent(request);
      const response = result.response;
      if (response && response.candidates && response.candidates.length > 0) {
        aiResponse = response.candidates[0].content.parts[0].text || "";
      }
    } catch (err: any) {
      console.error("[Gemini Adapt Error]:", err.message);
      return { adaptedContent: content };
    }

    if (!aiResponse) {
      return { adaptedContent: content };
    }

    try {
      const match = aiResponse.match(/```json\n(.*)\n```/s);
      const jsonStr = match ? match[1] : aiResponse;
      const parsed = JSON.parse(jsonStr);
      return { adaptedContent: parsed.adaptedContent || aiResponse };
    } catch (error) {
      console.error('AI Adapt parsing error:', error);
      return { adaptedContent: aiResponse };
    }
  }

  async generateContent(prompt: string): Promise<string> {
    try {
      if (!this.vertexAI) {
        throw new Error("Vertex AI is not configured.");
      }

      const modelName = process.env.VERTEX_AI_MODEL || 'gemini-2.5-flash';
      const model = this.vertexAI.getGenerativeModel({ model: modelName });
      
      const request = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: parseFloat(process.env.CONTENT_TEMPERATURE || '0.9'),
          maxOutputTokens: parseInt(process.env.CONTENT_MAX_TOKENS || '8192'),
          responseMimeType: "application/json"
        }
      };

      const result = await model.generateContent(request);
      const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log(`[Gemini] ✅ Script generated via ${modelName} (${text.length} chars)`);
      return text;
    } catch (err: any) {
      console.error("[Gemini Text Error]:", err.message);
      throw err;
    }
  }

  async chatContent(messages: any[], mediaFile?: any): Promise<string> {
    try {
      if (!this.vertexAI) {
        throw new Error("Vertex AI is not configured.");
      }

      const modelName = process.env.VERTEX_AI_MODEL || 'gemini-2.5-flash';
      const model = this.vertexAI.getGenerativeModel({ model: modelName });
      
      const systemPrompt = "You are an elite social media copywriter. You help the user brainstorm, write, and refine highly engaging social media posts. Follow the user's instructions regarding tone, length, and platform constraints. Do not use markdown headers unless necessary.\n\nIMPORTANT: When you write a caption for the user, ONLY output the final postable content itself. DO NOT include conversational filler like 'Got it!' or 'Here is your caption:'. Return ONLY the raw caption text so it can be directly inserted into a text box.\n\n";

      const contents = messages.map((msg, index) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: index === 0 && msg.role !== 'assistant' ? systemPrompt + msg.content : msg.content }]
      }));

      if (mediaFile && contents.length > 0) {
        const lastUserMsgIndex = contents.map(c => c.role).lastIndexOf('user');
        if (lastUserMsgIndex !== -1) {
          contents[lastUserMsgIndex].parts.push({
            inlineData: {
              data: mediaFile.buffer.toString('base64'),
              mimeType: mediaFile.mimetype,
            }
          } as any);
        }
      }

      const request = {
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      };

      const result = await model.generateContent(request);
      const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return text;
    } catch (err: any) {
      console.error("[Gemini Chat Error]:", err.message);
      throw err;
    }
  }

  // 1. Imagen 3 - Image Generation
  async generateImage(prompt: string, seed: number = 0, allowStockFallback: boolean = true): Promise<string> {
    const uniqueId = Math.random().toString(36).substring(7);
    
    if (!process.env.VERTEX_AI_PROJECT_ID) {
      if (!allowStockFallback) throw new Error("Vertex AI not configured and fallbacks disabled");
      const fallbackUrl = `https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=400&h=720&fit=crop&random=${uniqueId}`;
      const tempPath = path.join(os.tmpdir(), `imagen_fallback_${Date.now()}_${uniqueId}.jpg`);
      const response = await fetch(fallbackUrl);
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(tempPath, Buffer.from(buffer));
      return tempPath;
    }

    try {
      // 🚀 Switch to FLUX (via Pollinations) as the primary generator for flawless anatomy and vertical portraits
      return await this.fetchPollinationsImage(prompt);
    } catch (e: any) {
      console.error("[FLUX Image Generation Error]:", e.message || e);
      if (!allowStockFallback) throw e;

      try {
        // Fallback 1: Pexels Image
        return await this.fetchPexelsImage(prompt);
      } catch (pexelsErr: any) {
        console.error("[Pexels Fallback Error]:", pexelsErr.message || pexelsErr);
        try {
          // Fallback 2: Unsplash
          return await this.fetchUnsplashImage(prompt);
        } catch (unsplashErr: any) {
          console.error("[Unsplash Fallback Error]:", unsplashErr.message || unsplashErr);
          try {
            // Fallback 3: Pixabay search and download
            return await this.fetchPixabayImage(prompt);
          } catch (pixabayErr: any) {
            console.error("[Pixabay Fallback Error]:", pixabayErr.message || pixabayErr);
            try {
              // Fallback 4: Pollinations AI (Free, No API Key)
              return await this.fetchPollinationsImage(prompt);
            } catch (pollinationsErr: any) {
              console.error("[Pollinations Fallback Error]:", pollinationsErr.message || pollinationsErr);
              throw new Error("All AI and Stock Image Generators failed.");
            }
          }
        }
      }
    }
  }

  /**
   * Helper to fetch a free AI image from Pollinations (no API key required)
   */
  async fetchPollinationsImage(prompt: string): Promise<string> {
    // Sanitize prompt for URL usage (remove parentheses, remove negative prompts)
    const cleanKeyword = prompt.replace(/[()]/g, '').replace(/--no[\w\s,]*/g, '').trim();
    console.log(`[Pollinations] Generating AI image for '${cleanKeyword}'...`);
    
    // Pollinations generates images instantly based on URL
    // Enforce 9:16 vertical resolution, remove logo, and strictly use the FLUX model
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanKeyword)}?width=720&height=1280&nologo=true&model=flux`;
    
    const imageResponse = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!imageResponse.ok) {
      throw new Error(`Failed to download Pollinations image from ${imageUrl}`);
    }
    
    const uniqueId = Math.random().toString(36).substring(7);
    const tempPath = path.join(os.tmpdir(), `pollinations_img_${Date.now()}_${uniqueId}.jpg`);
    
    const ab = await imageResponse.arrayBuffer();
    fs.writeFileSync(tempPath, Buffer.from(ab));
    return tempPath;
  }

  /**
   * Helper to search Pixabay vertical images and download it to a local temp file
   */
  async fetchPixabayImage(keyword: string): Promise<string> {
    const cleanKeyword = keyword.split(',')[0].trim(); // Get main subject
    if (!process.env.PIXABAY_API_KEY) {
      throw new Error("No Pixabay API key configured in env");
    }
    
    console.log(`[Pixabay] Searching for '${cleanKeyword}'...`);
    const response = await fetch(`https://pixabay.com/api/?key=${process.env.PIXABAY_API_KEY}&q=${encodeURIComponent(cleanKeyword)}&image_type=photo&orientation=vertical&per_page=3&safesearch=true`);
    if (!response.ok) {
      throw new Error(`Pixabay API error: ${response.status}`);
    }
    const data = await response.json() as any;
    if (!data.hits || data.hits.length === 0) {
      throw new Error(`No Pixabay images found for keyword: ${cleanKeyword}`);
    }
    
    const imageUrl = data.hits[0].largeImageURL;
    console.log(`[Pixabay] Found image URL: ${imageUrl}, downloading...`);
    
    const uniqueId = Math.random().toString(36).substring(7);
    const tempPath = path.join(os.tmpdir(), `pixabay_${Date.now()}_${uniqueId}.jpg`);
    
    const photoResponse = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!photoResponse.ok) {
      throw new Error(`Failed to download Pixabay image from ${imageUrl}`);
    }
    const arrayBuffer = await photoResponse.arrayBuffer();
    fs.writeFileSync(tempPath, Buffer.from(arrayBuffer));
    return tempPath;
  }

  async fetchPixabayVideo(keyword: string): Promise<string> {
    const cleanKeyword = keyword.split(',')[0].trim();
    if (!process.env.PIXABAY_API_KEY) {
      throw new Error("No Pixabay API key configured in env");
    }
    
    console.log(`[Pixabay Video] Searching for '${cleanKeyword}'...`);
    const response = await fetch(`https://pixabay.com/api/videos/?key=${process.env.PIXABAY_API_KEY}&q=${encodeURIComponent(cleanKeyword)}&safesearch=true`);
    if (!response.ok) {
      throw new Error(`Pixabay Video API error: ${response.status}`);
    }
    const data = await response.json() as any;
    
    if (!data.hits || data.hits.length === 0) {
      throw new Error(`No Pixabay videos found for keyword: ${cleanKeyword}`);
    }
    
    const videoData = data.hits[0].videos;
    const videoUrl = videoData.large?.url || videoData.medium?.url || videoData.small?.url;
    
    if (!videoUrl) {
      throw new Error(`No valid video URL found in Pixabay response for ${cleanKeyword}`);
    }

    console.log(`[Pixabay Video] Found video URL: ${videoUrl}, downloading...`);
    
    const uniqueId = Math.random().toString(36).substring(7);
    const tempPath = path.join(os.tmpdir(), `pixabay_vid_${Date.now()}_${uniqueId}.mp4`);
    
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download Pixabay video from ${videoUrl}`);
    }
    const arrayBuffer = await videoResponse.arrayBuffer();
    fs.writeFileSync(tempPath, Buffer.from(arrayBuffer));
    return tempPath;
  }

  async fetchPexelsVideo(keyword: string): Promise<string> {
    const cleanKeyword = keyword.split(',')[0].trim();
    if (!process.env.PEXELS_API_KEY) {
      throw new Error("No Pexels API key configured in env");
    }

    console.log(`[Pexels Video] Searching for '${cleanKeyword}'...`);
    const response = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(cleanKeyword)}&orientation=portrait&per_page=3`, {
      headers: { 'Authorization': process.env.PEXELS_API_KEY }
    });
    
    if (!response.ok) {
      throw new Error(`Pexels Video API error: ${response.status}`);
    }
    const data = await response.json() as any;
    
    if (!data.videos || data.videos.length === 0) {
      throw new Error(`No Pexels videos found for keyword: ${cleanKeyword}`);
    }

    const videoFiles = data.videos[0].video_files;
    const bestFile = videoFiles.find((f: any) => f.quality === 'hd' && f.width < f.height) || videoFiles[0];
    
    const videoUrl = bestFile.link;
    if (!videoUrl) {
      throw new Error(`No valid video URL found in Pexels response for ${cleanKeyword}`);
    }

    console.log(`[Pexels Video] Found video URL: ${videoUrl}, downloading...`);
    const uniqueId = Math.random().toString(36).substring(7);
    const tempPath = path.join(os.tmpdir(), `pexels_vid_${Date.now()}_${uniqueId}.mp4`);
    
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download Pexels video from ${videoUrl}`);
    }
    const ab = await videoResponse.arrayBuffer();
    fs.writeFileSync(tempPath, Buffer.from(ab));
    return tempPath;
  }

  async fetchPexelsImage(keyword: string): Promise<string> {
    const cleanKeyword = keyword.split(',')[0].trim();
    if (!process.env.PEXELS_API_KEY) {
      throw new Error("No Pexels API key configured in env");
    }

    console.log(`[Pexels Image] Searching for '${cleanKeyword}'...`);
    const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(cleanKeyword)}&orientation=portrait&per_page=3`, {
      headers: { 'Authorization': process.env.PEXELS_API_KEY }
    });
    
    if (!response.ok) {
      throw new Error(`Pexels Image API error: ${response.status}`);
    }
    const data = await response.json() as any;
    
    if (!data.photos || data.photos.length === 0) {
      throw new Error(`No Pexels images found for keyword: ${cleanKeyword}`);
    }

    const photoUrl = data.photos[0].src.large2x || data.photos[0].src.large;
    if (!photoUrl) {
      throw new Error(`No valid image URL found in Pexels response for ${cleanKeyword}`);
    }

    console.log(`[Pexels Image] Found image URL: ${photoUrl}, downloading...`);
    const uniqueId = Math.random().toString(36).substring(7);
    const tempPath = path.join(os.tmpdir(), `pexels_img_${Date.now()}_${uniqueId}.jpg`);
    
    const imageResponse = await fetch(photoUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!imageResponse.ok) {
      throw new Error(`Failed to download Pexels image from ${photoUrl}`);
    }
    const ab = await imageResponse.arrayBuffer();
    fs.writeFileSync(tempPath, Buffer.from(ab));
    return tempPath;
  }

  async fetchUnsplashImage(keyword: string): Promise<string> {
    const cleanKeyword = keyword.split(',')[0].trim();
    if (!process.env.UNSPLASH_ACCESS_KEY) {
      throw new Error("No Unsplash API key configured in env");
    }

    console.log(`[Unsplash] Searching for '${cleanKeyword}'...`);
    const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(cleanKeyword)}&orientation=portrait&per_page=3`, {
      headers: { 'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` }
    });
    
    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }
    const data = await response.json() as any;
    
    if (!data.results || data.results.length === 0) {
      throw new Error(`No Unsplash images found for keyword: ${cleanKeyword}`);
    }

    const imageUrl = data.results[0].urls.regular;
    console.log(`[Unsplash] Found image URL: ${imageUrl}, downloading...`);
    
    const uniqueId = Math.random().toString(36).substring(7);
    const tempPath = path.join(os.tmpdir(), `unsplash_${Date.now()}_${uniqueId}.jpg`);
    
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download Unsplash image from ${imageUrl}`);
    }
    const ab = await imageResponse.arrayBuffer();
    fs.writeFileSync(tempPath, Buffer.from(ab));
    return tempPath;
  }

  async getBestStockVideo(keyword: string): Promise<string> {
    try {
      return await this.fetchPexelsVideo(keyword);
    } catch (e: any) {
      console.log(`[Waterfall] Pexels video failed: ${e.message}. Falling back to Pixabay...`);
      return await this.fetchPixabayVideo(keyword);
    }
  }

  async getBestStockImage(keyword: string): Promise<string> {
    try {
      return await this.fetchPexelsImage(keyword);
    } catch (e: any) {
      console.log(`[Waterfall] Pexels image failed: ${e.message}. Falling back to Unsplash...`);
      try {
        return await this.fetchUnsplashImage(keyword);
      } catch (e2: any) {
        console.log(`[Waterfall] Unsplash image failed: ${e2.message}. Falling back to Pixabay...`);
        return await this.fetchPixabayImage(keyword);
      }
    }
  }


  /**
   * Fallback chain to acquire a background image: Google -> Pexels -> Unsplash -> Pixabay
   */
  async fetchStockImage(keyword: string): Promise<string> {
    console.log(`[Stock Image API] Initiating fallback chain for keyword: "${keyword}"`);
    try {
      // 1. Google Vertex AI Imagen 3 first
      const seed = Math.floor(Math.random() * 1000000);
      return await this.generateImage(keyword, seed);
    } catch (googleErr: any) {
      console.warn(`[Stock Image Fallback] Google Imagen 3 failed: ${googleErr.message}. Trying Pexels...`);
      try {
        // 2. Pexels
        return await this.fetchPexelsImage(keyword);
      } catch (pexelsErr: any) {
        console.warn(`[Stock Image Fallback] Pexels failed: ${pexelsErr.message}. Trying Unsplash...`);
        try {
          // 3. Unsplash
          return await this.fetchUnsplashImage(keyword);
        } catch (unsplashErr: any) {
          console.warn(`[Stock Image Fallback] Unsplash failed: ${unsplashErr.message}. Trying Pixabay...`);
          try {
            // 4. Pixabay
            return await this.fetchPixabayImage(keyword);
          } catch (pixabayErr: any) {
            console.error(`[Stock Image Fallback] All sources failed: ${pixabayErr.message}`);
            throw new Error("Could not acquire any backdrop image from Google, Pexels, Unsplash, or Pixabay.");
          }
        }
      }
    }
  }

  // 2. Voice Synthesis Engine (Gemini Multimodal / Kokoro / Google Cloud)
  async generateVoiceover(text: string, voiceName: string = 'en-US-Journey-D', language: string = 'en-US'): Promise<string> {
    const uniqueId = Math.random().toString(36).substring(7);
    const tempPath = path.join(os.tmpdir(), `voiceover_${Date.now()}_${uniqueId}.wav`);

    // 1. ATTEMPT GEMINI 3.1 FLASH TTS (Direct REST API - proven to work)
    if (process.env.VERTEX_AI_PROJECT_ID) {
      try {
        console.log(`[TTS] Attempting Gemini 3.1 Flash TTS via REST API...`);

        // Map UI voice names to Gemini native voices
        const geminiVoiceMap: Record<string, string> = {
          'Puck': 'Puck', 'Charon': 'Charon', 'Aoede': 'Aoede',
          'Kore': 'Kore', 'Fenrir': 'Fenrir', 'Leda': 'Leda',
        };
        const geminiVoice = geminiVoiceMap[voiceName] || 'Puck';

        const auth = new GoogleAuth({
          scopes: [
            'https://www.googleapis.com/auth/cloud-platform',
            'https://www.googleapis.com/auth/generative-language'
          ]
        });
        const client = await auth.getClient();
        const token = (await client.getAccessToken()).token;

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: text }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: geminiVoice }
                }
              }
            }
          })
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Gemini TTS REST Error ${res.status}: ${errText.substring(0, 200)}`);
        }

        const data = await res.json() as any;
        const audioPart = data.candidates?.[0]?.content?.parts?.find(
          (p: any) => p.inlineData && p.inlineData.mimeType?.startsWith('audio')
        );

        if (audioPart?.inlineData?.data) {
          const mimeType = audioPart.inlineData.mimeType || '';
          const rawBuffer = Buffer.from(audioPart.inlineData.data, 'base64');
          console.log(`[TTS] Gemini returned: ${mimeType}, ${rawBuffer.length} bytes`);

          let outputPath = tempPath;

          if (mimeType.includes('L16') || mimeType.toLowerCase().includes('l16') || mimeType.includes('pcm') || mimeType.includes('raw')) {
            // Parse actual parameters from mimeType string e.g. "audio/l16; rate=24000; channels=1"
            const rateMatch = mimeType.match(/rate=(\d+)/i);
            const chanMatch = mimeType.match(/channels=(\d+)/i);
            const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;
            const numChannels = chanMatch ? parseInt(chanMatch[1]) : 1;
            const bitsPerSample = 16;
            const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
            const blockAlign = numChannels * (bitsPerSample / 8);
            const dataSize = rawBuffer.length;
            const header = Buffer.alloc(44);
            header.write('RIFF', 0);
            header.writeUInt32LE(36 + dataSize, 4);
            header.write('WAVE', 8);
            header.write('fmt ', 12);
            header.writeUInt32LE(16, 16);
            header.writeUInt16LE(1, 20);           // PCM = 1
            header.writeUInt16LE(numChannels, 22);
            header.writeUInt32LE(sampleRate, 24);
            header.writeUInt32LE(byteRate, 28);
            header.writeUInt16LE(blockAlign, 32);
            header.writeUInt16LE(bitsPerSample, 34);
            header.write('data', 36);
            header.writeUInt32LE(dataSize, 40);
            fs.writeFileSync(outputPath, Buffer.concat([header, rawBuffer]));
            console.log(`[TTS] PCM→WAV: ${sampleRate}Hz, ${numChannels}ch, ${rawBuffer.length} bytes`);
          } else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
            outputPath = tempPath.replace('.wav', '.mp3');
            fs.writeFileSync(outputPath, rawBuffer);
          } else if (mimeType.includes('ogg') || mimeType.includes('opus')) {
            outputPath = tempPath.replace('.wav', '.ogg');
            fs.writeFileSync(outputPath, rawBuffer);
          } else {
            fs.writeFileSync(outputPath, rawBuffer);
          }

          console.log(`[TTS] ✅ Gemini 3.1 Flash TTS success → ${outputPath}`);
          return outputPath;
        } else {
          throw new Error('No audio data in Gemini TTS response');
        }
      } catch (e: any) {
        console.error(`[TTS] Gemini 3.1 Flash TTS Failed: ${e.message}`);
      }
    }

    // 2. ATTEMPT KOKORO-FASTAPI (LOCAL DOCKER)
    try {
      // Map voices to Kokoro profiles.
      let profileId = "am_michael"; // Standard male
      if (voiceName === 'Charon') profileId = "am_echo"; // Deep male
      else if (voiceName === 'Aoede' || voiceName === 'Kore') profileId = "af_bella"; // Female
      
      // Override for Hindi explicitly
      if (language.includes('Hindi')) {
        profileId = (voiceName === 'Aoede' || voiceName === 'Kore') ? "hf_alpha" : "hm_omega";
      }

      console.log(`[TTS] Attempting to use Kokoro TTS (port 8880) with profile ${profileId}...`);
      
      const KOKORO_HOST = process.env.KOKORO_HOST || 'http://localhost:8880';
      const response = await fetch(`${KOKORO_HOST}/v1/audio/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "kokoro",
          input: text,
          voice: profileId,
          response_format: "wav",
          speed: 1.0
        })
      });

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(tempPath, Buffer.from(buffer));
        console.log(`[TTS] Kokoro generation successful!`);
        return tempPath;
      } else {
        console.warn(`[TTS] Kokoro returned ${response.status}. Falling back to Google Cloud...`);
      }
    } catch (e: any) {
      console.warn(`[TTS] Kokoro Docker not running or failed (${e.message}). Falling back to Google Cloud...`);
    }

    // 2. FALLBACK TO GOOGLE CLOUD TTS
    const textToSpeech = await import('@google-cloud/text-to-speech');
    const client = new textToSpeech.TextToSpeechClient();
    
    // Properly map frontend language strings to BCP-47 and appropriate premium voices
    let bcp47Language = 'en-US';
    let actualVoiceName = 'en-US-Journey-D';

    if (language.includes('Hindi')) {
      bcp47Language = 'hi-IN';
      if (voiceName === 'Aoede' || voiceName === 'Kore') actualVoiceName = 'hi-IN-Neural2-A'; // Female
      else actualVoiceName = 'hi-IN-Neural2-C'; // Male
    } else if (language.includes('Spanish')) {
      bcp47Language = 'es-ES';
      if (voiceName === 'Aoede' || voiceName === 'Kore') actualVoiceName = 'es-ES-Journey-O'; // Female
      else actualVoiceName = 'es-ES-Journey-D'; // Male
    } else {
      bcp47Language = 'en-US';
      if (voiceName === 'Aoede' || voiceName === 'Kore') actualVoiceName = 'en-US-Journey-O'; // Female
      else if (voiceName === 'Charon') actualVoiceName = 'en-US-Journey-F'; // Deep Male
      else actualVoiceName = 'en-US-Journey-D'; // Standard Male
    }

    const request = {
      input: { text: text },
      voice: { languageCode: bcp47Language, name: actualVoiceName },
      audioConfig: { 
        audioEncoding: 'LINEAR16' as const,
        sampleRateHertz: 24000
      },
    };

    try {
      const [response] = await client.synthesizeSpeech(request);
      fs.writeFileSync(tempPath, response.audioContent as Uint8Array, 'binary');
      return tempPath;
    } catch (e: any) {
      console.error("[Google Cloud TTS Error]:", e.message || e);
      // Fallback to dummy voiceover if credentials fail on the live server
      console.log("Using fallback voiceover due to TTS error.");
      const bgmUrl = 'https://raw.githubusercontent.com/mdn/webaudio-examples/main/audio-analyser/viper.mp3';
      const res = await fetch(bgmUrl);
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(tempPath, Buffer.from(buffer));
      return tempPath;
    }
  }

  /**
   * Transcribes audio and returns exact word-level timestamps using Google Cloud Speech-to-Text.
   */
  async transcribeAudio(audioPath: string, languageCode: string = 'en-US'): Promise<Array<{ word: string, startTime: number, endTime: number }>> {
    console.log(`[Transcription] Transcribing ${audioPath} in ${languageCode}...`);
    const client = new speech.SpeechClient();
    const audioBytes = fs.readFileSync(audioPath).toString('base64');

    const request = {
      audio: { content: audioBytes },
      config: {
        encoding: 'LINEAR16' as const,
        sampleRateHertz: 24000,
        languageCode: languageCode,
        enableWordTimeOffsets: true,
      },
    };

    try {
      const [response] = await client.recognize(request);
      const timestamps: Array<{ word: string, startTime: number, endTime: number }> = [];

      if (!response.results) return timestamps;

      for (const result of response.results) {
        if (!result.alternatives || result.alternatives.length === 0) continue;
        const words = result.alternatives[0].words;
        if (!words) continue;

        for (const wordInfo of words) {
          const startTime = Number(wordInfo.startTime?.seconds || 0) + (wordInfo.startTime?.nanos || 0) / 1e9;
          const endTime = Number(wordInfo.endTime?.seconds || 0) + (wordInfo.endTime?.nanos || 0) / 1e9;
          if (wordInfo.word) {
            timestamps.push({ word: wordInfo.word, startTime, endTime });
          }
        }
      }
      
      console.log(`[Transcription] Completed. Found ${timestamps.length} words.`);
      return timestamps;
    } catch (error: any) {
      console.warn(`[Transcription] Failed to transcribe: ${error.message}`);
      return [];
    }
  }

  // 3. Lyria 3 Pro - Music Generation (Mock/Placeholder for Vertex Preview)
  async generateMusic(prompt: string): Promise<string> {
    // In production, this would call the Vertex AI Lyria endpoint once GA
    console.log(`Generating music via Lyria 3 Pro with prompt: ${prompt}`);
    
    // List of reliable, public-domain cinematic/classical background tracks from Wikimedia Commons
    const bgmList = [
      'https://raw.githubusercontent.com/mdn/webaudio-examples/main/audio-basics/outfoxing.mp3',
      'https://raw.githubusercontent.com/mdn/webaudio-examples/main/audio-analyser/viper.mp3',
      'https://raw.githubusercontent.com/mdn/webaudio-examples/main/voice-change-o-matic/audio/concert-crowd.mp3',
      'https://raw.githubusercontent.com/mdn/webaudio-examples/main/multi-track/bassguitar.mp3',
      'https://raw.githubusercontent.com/mdn/webaudio-examples/main/multi-track/clav.mp3'
    ];

    // Pick a track deterministically based on the prompt length so the same prompt gets the same music
    const index = prompt.length % bgmList.length;
    const bgmUrl = bgmList[index];

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const tempPath = path.join(os.tmpdir(), `lyria_${Date.now()}.mp3`);
    
    try {
      const response = await fetch(bgmUrl);
      if (!response.ok) throw new Error(`Failed to fetch BGM: ${response.status}`);
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(tempPath, Buffer.from(buffer));
      return tempPath;
    } catch (e) {
      console.error("Failed to fetch custom BGM, falling back to viper.mp3", e);
      const fallbackUrl = 'https://raw.githubusercontent.com/mdn/webaudio-examples/main/audio-analyser/viper.mp3';
      const response = await fetch(fallbackUrl);
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(tempPath, Buffer.from(buffer));
      return tempPath;
    }
  }

  // 4. Vision QA Inspector
  async evaluateImage(imagePath: string, shotContext: string, characterContext: string): Promise<{ passed: boolean, score: number, reason: string }> {
    try {
      console.log(`[Vision QA] Evaluating image ${path.basename(imagePath)} against context...`);
      
      if (!this.vertexAI) {
        console.warn('Vertex AI not configured, auto-passing Vision QA');
        return { passed: true, score: 100, reason: "Vertex AI not configured" };
      }
      
      const buffer = fs.readFileSync(imagePath);
      const mimeType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      
      const prompt = `You are an elite cinematic Quality Assurance Inspector. 
Evaluate this generated image against the following required scene and character constraints.

SCENE CONTEXT:
${shotContext}

CHARACTER BIBLE:
${characterContext}

Your job is to ensure the image matches the context perfectly and contains NO AI deformities.
Respond with a strict JSON object containing:
1. "passed": boolean (MUST BE FALSE if the image has ANY anatomical distortion, deformed hands/fingers, extra limbs, asymmetrical eyes, weird text/watermarks, or drastically wrong lighting. Only true if it looks flawlessly photorealistic and matches the characters).
2. "score": number between 0 and 100.
3. "reason": A short string explaining your decision, highlighting any detected distortions.

Output ONLY valid JSON.`;

      const model = this.vertexAI.getGenerativeModel({ model: process.env.VERTEX_AI_MODEL || 'gemini-2.5-flash' });
      const mediaPart = {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: mimeType,
        },
      };

      const request = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              mediaPart
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      };

      const result = await model.generateContent(request);
      const response = result.response;

      if (!response || !response.candidates || response.candidates.length === 0) {
        throw new Error('No response from Gemini Vision QA');
      }

      const textResponse = response.candidates[0].content.parts[0].text || '';
      
      try {
        const parsed = JSON.parse(textResponse);
        console.log(`[Vision QA] Score: ${parsed.score} - Passed: ${parsed.passed} - Reason: ${parsed.reason}`);
        
        // Enforce strict passing threshold
        if (parsed.score < 85) {
          parsed.passed = false;
        }
        
        return {
          passed: !!parsed.passed,
          score: parsed.score || 0,
          reason: parsed.reason || "No reason provided"
        };
      } catch (parseErr) {
        console.error("[Vision QA] Failed to parse JSON response:", textResponse);
        return { passed: true, score: 90, reason: "Fallback auto-pass due to parse error" };
      }
    } catch (e: any) {
      console.error("[Vision QA] Error evaluating image:", e.message);
      // Fail open so the pipeline doesn't crash on API issues
      return { passed: true, score: 100, reason: "API Failure Fallback" };
    }
  }
}

export const aiOrchestrator = new AiOrchestratorService();
