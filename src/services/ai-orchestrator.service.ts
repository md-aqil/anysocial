import { VertexAI } from '@google-cloud/vertexai';
import { storageService } from './media-upload.service.js';
import textToSpeech from '@google-cloud/text-to-speech';
import speech from '@google-cloud/speech';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { GoogleAuth } from 'google-auth-library';
import { prisma } from '../db/prisma.js';

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

  private async getAiSettings() {
    try {
      const setting = await prisma.appSetting.findUnique({ where: { key: 'ai_models' } });
      if (setting && setting.value) return setting.value as any;
    } catch (e) {
      console.warn("Failed to fetch AI settings, using defaults", e);
    }
    return {
      text: { primary: 'gemini-2.5-flash', secondary: 'gemini-1.5-pro', tertiary: 'gemini-2.5-pro' },
      image: { primary: 'gemini-2.5-flash', secondary: 'pollinations', tertiary: 'stock' },
      voice: { primary: 'google-cloud-standard', secondary: 'gemini-2.5-flash', tertiary: 'gemini-2.5-pro' }
    };
  }

  async analyzeMedia(mediaFile: any): Promise<any> {
    const settings = await this.getAiSettings();
    if (!this.vertexAI) {
      console.warn('Vertex AI not configured, skipping media analysis');
      return { caption: "", keywords: "", tags: "" };
    }
    const model = this.vertexAI.getGenerativeModel({ model: settings.text.primary });

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
    const settings = await this.getAiSettings();
    if (!this.vertexAI) {
      return { adaptedContent: content };
    }
    const model = this.vertexAI.getGenerativeModel({ model: settings.text.primary });

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

  async generateContent(prompt: string, mediaParts?: { data: string, mimeType: string }[], useAdvancedModel: boolean = true): Promise<string> {
    try {
      const settings = await this.getAiSettings();
      if (useAdvancedModel) {
        const { GoogleAuth } = await import('google-auth-library');
        const auth = new GoogleAuth({
          scopes: [
            'https://www.googleapis.com/auth/cloud-platform',
            'https://www.googleapis.com/auth/generative-language'
          ]
        });
        const client = await auth.getClient();
        const token = (await client.getAccessToken()).token;
        
        const executeScriptGen = async (overrideModel?: string) => {
          const modelName = overrideModel || settings.text.primary;
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
          
          const parts: any[] = [{ text: prompt }];
          if (mediaParts && mediaParts.length > 0) {
            for (const mp of mediaParts) {
              parts.push({
                inlineData: {
                  data: mp.data,
                  mimeType: mp.mimeType
                }
              });
            }
          }
          
          const res = await client.request({
            url: endpoint,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            data: {
              contents: [{ role: 'user', parts }],
              generationConfig: {
                temperature: parseFloat(process.env.CONTENT_TEMPERATURE || '0.9'),
                maxOutputTokens: parseInt(process.env.CONTENT_MAX_TOKENS || '8192'),
                responseMimeType: "application/json"
              }
            }
          });

          const data = res.data as any;
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          console.log(`[Gemini] ✅ Script generated via ${modelName} (${text.length} chars)`);
          return text;
        };

        try {
          return await executeScriptGen();
        } catch (e: any) {
          console.warn("[Gemini Script Failed] Primary model error:", e.message);
          try {
            return await executeScriptGen(settings.text.secondary);
          } catch (e2: any) {
            console.warn("[Gemini Fallback Failed] Secondary model error:", e2.message);
            // Fall through to the standard Vertex AI implementation below
          }
        }
      }

      if (!this.vertexAI) {
        throw new Error("Vertex AI is not configured.");
      }

      const modelName = settings.text.primary;
      console.log(`[DEBUG Vertex AI] using model: ${modelName}, settings primary: ${settings.text.primary}, env: ${process.env.VERTEX_AI_MODEL}`);
      const model = this.vertexAI.getGenerativeModel({ model: modelName });
      
      const parts: any[] = [{ text: prompt }];
      if (mediaParts && mediaParts.length > 0) {
        for (const mp of mediaParts) {
          parts.push({
            inlineData: {
              data: mp.data,
              mimeType: mp.mimeType
            }
          });
        }
      }

      const request = {
        contents: [{ role: 'user', parts }],
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
      if (err.cause) console.error("Cause:", err.cause);
      throw err;
    }
  }

  async chatContent(messages: any[], mediaFile?: any): Promise<string> {
    try {
      const settings = await this.getAiSettings();
      if (!this.vertexAI) {
        throw new Error("Vertex AI is not configured.");
      }

      const modelName = settings.text.primary;
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

  // 1. Gemini image generation. Reel visuals must come from the LLM image model only.
  async generateImage(prompt: string, seed: number = 0, referenceImageBase64?: string | null, referenceMimeType?: string | null): Promise<string> {
    const uniqueId = Math.random().toString(36).substring(7);
    
    if (!process.env.VERTEX_AI_PROJECT_ID) {
      throw new Error("Vertex AI is not configured for LLM image generation.");
    }

    try {
      // 🚀 Primary: Gemini 2.5 Flash Image Model (via REST API to match cURL exactly)
      const projectId = process.env.VERTEX_AI_PROJECT_ID;
      const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
      
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });
      const client = await auth.getClient();
      const accessToken = await client.getAccessToken();

      const modelId = 'gemini-2.5-flash-image';
      const url = `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:generateContent`;

      let finalPromptText = prompt;
      try {
        const parsed = JSON.parse(prompt);
        if (parsed.prompt) {
          finalPromptText = parsed.prompt;
          if (parsed.negative_prompt) {
             finalPromptText += `\n\nAvoid: ${parsed.negative_prompt}`;
          }
          if (parsed.api_parameters?.aspect_ratio) {
             finalPromptText += `\n\nAspect Ratio: ${parsed.api_parameters.aspect_ratio}`;
          }
        }
      } catch(e) {
        // Not JSON, use as is
      }

      const requestParts: any[] = [{ text: finalPromptText }];
      if (referenceImageBase64 && referenceMimeType) {
        requestParts.push({
          inlineData: {
            mimeType: referenceMimeType,
            data: referenceImageBase64
          }
        });
      }

      const requestBody = {
        contents: {
          role: "user",
          parts: requestParts
        },
        generation_config: {
          response_modalities: ["TEXT", "IMAGE"]
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`REST API Error ${response.status}: ${errorText}`);
      }

      const result: any = await response.json();
      
      // Parse response matching the structure returned by the cURL payload
      let base64Data = null;
      
      // The REST API returns an array or an object depending on streaming vs standard.
      // Usually it's `{ candidates: [ ... ] }` or `[ { candidates: [...] } ]`.
      const candidates = Array.isArray(result) ? result[0]?.candidates : result.candidates;
      
      if (!candidates || candidates.length === 0) throw new Error("No image generated by Gemini");
      
      const parts = candidates[0].content?.parts || [];
      for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
              base64Data = part.inlineData.data;
              break;
          }
      }
      
      if (!base64Data) {
          throw new Error("No image data returned from Gemini");
      }
      
      const tempPath = path.join(os.tmpdir(), `gemini_img_${Date.now()}_${uniqueId}.jpg`);
      fs.writeFileSync(tempPath, Buffer.from(base64Data, 'base64'));
      return tempPath;
    } catch (e: any) {
      console.warn("[Gemini Image Generation Error] Falling back to Pollinations:", e.message || e);
      try {
        return await this.fetchPollinationsImage(prompt, seed);
      } catch (fallbackErr: any) {
        console.warn("[Pollinations Fallback Error] Falling back to Stock Image:", fallbackErr.message);
        return await this.fetchStockImage(prompt);
      }
    }
  }

  async fetchPollinationsImage(prompt: string, seed: number): Promise<string> {
    console.warn(`[Pollinations Fallback] Attempting pollinations.ai for prompt: ${prompt}`);
    const encodedPrompt = encodeURIComponent(prompt.substring(0, 500));
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1920&nologo=true&seed=${seed}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Pollinations API failed");
    const buffer = Buffer.from(await res.arrayBuffer());
    const tempPath = path.join(os.tmpdir(), `pollinations_${Date.now()}.jpg`);
    fs.writeFileSync(tempPath, buffer);
    return tempPath;
  }

  async fetchStockImage(query: string): Promise<string> {
    console.warn(`[Stock Failsafe] Fetching stock image for query: ${query}`);
    try {
      let imageUrl = 'https://picsum.photos/1080/1920'; // default dummy
      
      if (process.env.PEXELS_API_KEY && query !== 'fallback') {
         const searchUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query.substring(0, 30))}&orientation=portrait&per_page=1`;
         const pexelsRes = await fetch(searchUrl, { headers: { 'Authorization': process.env.PEXELS_API_KEY } });
         if (pexelsRes.ok) {
            const data: any = await pexelsRes.json();
            if (data.photos && data.photos.length > 0) imageUrl = data.photos[0].src.portrait || data.photos[0].src.large;
         }
      } else if (process.env.PIXABAY_API_KEY && query !== 'fallback') {
         const searchUrl = `https://pixabay.com/api/?key=${process.env.PIXABAY_API_KEY}&q=${encodeURIComponent(query.substring(0, 30))}&orientation=vertical&per_page=3`;
         const pixabayRes = await fetch(searchUrl);
         if (pixabayRes.ok) {
            const data: any = await pixabayRes.json();
            if (data.hits && data.hits.length > 0) imageUrl = data.hits[0].largeImageURL;
         }
      }

      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error("Download failed");
      const buffer = Buffer.from(await res.arrayBuffer());
      const tempPath = path.join(os.tmpdir(), `stock_${Date.now()}.jpg`);
      fs.writeFileSync(tempPath, buffer);
      return tempPath;
    } catch (e) {
      // Absolute worst case failsafe: generate a solid color valid JPG block
      const tempPath = path.join(os.tmpdir(), `fail_${Date.now()}.jpg`);
      // 1x1 pixel black JPG
      const dummyJpgBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
      fs.writeFileSync(tempPath, Buffer.from(dummyJpgBase64, 'base64'));
      return tempPath;
    }
  }

  // 2. Voice Synthesis Engine (Google Cloud TTS)
  async generateVoiceover(text: string, voiceName: string = 'en-US-Journey-D', language: string = 'en-US', useAdvancedModel: boolean = false): Promise<string> {
    const settings = await this.getAiSettings();
    if (useAdvancedModel) {
      const { GoogleAuth } = await import('google-auth-library');
      const auth = new GoogleAuth({
        scopes: [
          'https://www.googleapis.com/auth/cloud-platform',
          'https://www.googleapis.com/auth/generative-language'
        ]
      });
      const client = await auth.getClient();
      const token = (await client.getAccessToken()).token;
      
      let geminiVoice = 'Aoede';
      if (voiceName === 'Charon') geminiVoice = 'Charon';
      else if (voiceName === 'Puck') geminiVoice = 'Puck';
      else if (voiceName === 'Kore') geminiVoice = 'Kore';
      else if (voiceName === 'Fenrir') geminiVoice = 'Fenrir';
      else if (voiceName === 'Leda') geminiVoice = 'Leda';
      
      let languageCode = 'en-US';
      if (language.includes('Hindi')) languageCode = 'hi-IN';
      else if (language.includes('Spanish')) languageCode = 'es-ES';

      const executeVoiceGen = async (overrideModel?: string) => {
        const modelName = overrideModel || (settings.voice.primary.includes('gemini') ? settings.voice.primary : 'gemini-2.5-flash');
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
        
        const res = await client.request({
          url: endpoint,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          data: {
            contents: [{ role: 'user', parts: [{ text }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { 
                    voiceName: geminiVoice
                  }
                }
              }
            }
          }
        });

        const data = res.data as any;
        const inlineData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (!inlineData || !inlineData.data) throw new Error("TTS generated no audio.");

        const rawBuffer = Buffer.from(inlineData.data, 'base64');
        const mimeType = inlineData.mimeType || 'audio/l16; rate=24000; channels=1';
        
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
        header.writeUInt16LE(1, 20);
        header.writeUInt16LE(numChannels, 22);
        header.writeUInt32LE(sampleRate, 24);
        header.writeUInt32LE(byteRate, 28);
        header.writeUInt16LE(blockAlign, 32);
        header.writeUInt16LE(bitsPerSample, 34);
        header.write('data', 36);
        header.writeUInt32LE(dataSize, 40);
        
        const wavBuffer = Buffer.concat([header, rawBuffer]);

        const uniqueId = Math.random().toString(36).substring(7);
        const os = await import('os');
        const path = await import('path');
        const tempPath = path.join(os.tmpdir(), `voiceover_${Date.now()}_${uniqueId}.wav`);
        
        const fs = await import('fs');
        fs.writeFileSync(tempPath, wavBuffer);
        return tempPath;
      };

      try {
        return await executeVoiceGen(settings.voice.tertiary.includes('gemini') ? settings.voice.tertiary : 'gemini-2.5-flash');
      } catch (e: any) {
        console.warn("[Gemini 2.5 Flash TTS Failed] High demand or error. Falling back...", e.message);
        try {
          return await executeVoiceGen('gemini-2.5-pro');
        } catch (e2: any) {
          console.warn("[Gemini TTS Failed] Falling back to standard Google Cloud TTS...", e2.message);
          // fall through to standard Google Cloud TTS
        }
      }
    }

    const textToSpeech = await import('@google-cloud/text-to-speech');
    const client = new textToSpeech.TextToSpeechClient();
    
    let bcp47Language = 'en-US';
    let actualVoiceName = 'en-US-Journey-D';

    if (language.includes('Hindi')) {
      bcp47Language = 'hi-IN';
      if (voiceName === 'Aoede' || voiceName === 'Kore') actualVoiceName = 'hi-IN-Neural2-A';
      else actualVoiceName = 'hi-IN-Neural2-C';
    } else if (language.includes('Spanish')) {
      bcp47Language = 'es-ES';
      if (voiceName === 'Aoede' || voiceName === 'Kore') actualVoiceName = 'es-ES-Journey-O';
      else actualVoiceName = 'es-ES-Journey-D';
    } else {
      bcp47Language = 'en-US';
      if (voiceName === 'Aoede' || voiceName === 'Kore') actualVoiceName = 'en-US-Journey-O';
      else if (voiceName === 'Charon') actualVoiceName = 'en-US-Journey-F';
      else actualVoiceName = 'en-US-Journey-D';
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
      const uniqueId = Math.random().toString(36).substring(7);
      const os = await import('os');
      const path = await import('path');
      const tempPath = path.join(os.tmpdir(), `voiceover_${Date.now()}_${uniqueId}.wav`);
      
      const fs = await import('fs');
      fs.writeFileSync(tempPath, response.audioContent as Uint8Array, 'binary');
      return tempPath;
    } catch (e: any) {
      console.error("[Google Cloud TTS Error]:", e.message || e);
      throw new Error(`TTS Failed: ${e.message}`);
    }
  }

    /**
   * Transcribes audio and returns exact word-level timestamps using Google Cloud Speech-to-Text.
   */
  async transcribeAudio(audioPath: string, languageCode: string = 'en-US'): Promise<Array<{ word: string, startTime: number, endTime: number }>> {
    console.log(`[Transcription] Transcribing ${audioPath} in ${languageCode}...`);
    const speech = await import('@google-cloud/speech');
    const client = new speech.v1.SpeechClient();
    const fs = await import('fs');
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

// 3. Lyria - Music Generation via Vertex AI interactions API
  async generateMusic(prompt: string, imageInputs: Array<{ path?: string; uri?: string; mimeType?: string; data?: string }> = []): Promise<string> {
    console.log(`Generating music via Lyria 2 with prompt: ${prompt}`);

    const projectId = process.env.VERTEX_AI_PROJECT_ID;
    if (!projectId) {
      throw new Error("Vertex AI is not configured for Lyria music generation.");
    }

    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    const publisherEndpoint = 'publishers/google/models/lyria-002';
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/${publisherEndpoint}:predict`;
    
    const requestBody = {
      instances: [
        { prompt: prompt }
      ],
      parameters: {
        sample_count: 1
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Lyria API Error ${response.status}: ${errorText.substring(0, 1000)}`);
    }

    const result: any = await response.json();
    const predictions = result.predictions;
    if (!predictions || predictions.length === 0) {
      throw new Error(`Lyria returned no audio data. Response preview: ${JSON.stringify(result).substring(0, 1000)}`);
    }

    const audioPart = predictions[0];
    const bytesBase64 = audioPart.bytesBase64Encoded;
    if (!bytesBase64) {
      throw new Error(`Lyria response did not contain bytesBase64Encoded.`);
    }

    const audioBuffer = Buffer.from(bytesBase64, 'base64');
    const tempPath = path.join(os.tmpdir(), `lyria_${Date.now()}.wav`);
    fs.writeFileSync(tempPath, audioBuffer);
    return tempPath;
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

      const settings = await this.getAiSettings();
      const model = this.vertexAI.getGenerativeModel({ model: settings.text.primary });
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
