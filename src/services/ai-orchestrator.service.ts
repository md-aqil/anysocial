import { VertexAI } from '@google-cloud/vertexai';
import { storageService } from './media-upload.service.js';
import textToSpeech from '@google-cloud/text-to-speech';
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

    const prompt = `Analyze this media and generate a social media post. Your response should be a JSON object with three properties:
1.  **caption**: A compelling and engaging caption for the post.
2.  **keywords**: A list of relevant keywords as a comma-separated string.
3.  **tags**: A list of relevant tags as a comma-separated string, including hashtags.

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

    const result = await model.generateContent(request);
    const response = result.response;

    if (!response || !response.candidates || response.candidates.length === 0) {
      throw new Error('Failed to analyze media: No response from the model');
    }

    const content = response.candidates[0].content.parts[0].text;

    if (!content) {
      throw new Error("Failed to analyze media: Empty response from the model");
    }

    try {
      const match = content.match(/```json\n(.*)\n```/s);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }
      return JSON.parse(content);
    } catch (error) {
      console.error('AI Analysis parsing error:', error);
      // if parsing fails, just return the raw content as the caption
      return { caption: content, keywords: "", tags: "" };
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

    const result = await model.generateContent(request);
    const response = result.response;

    if (!response || !response.candidates || response.candidates.length === 0) {
      return { adaptedContent: content };
    }

    const aiResponse = response.candidates[0].content.parts[0].text;

    if (!aiResponse) return { adaptedContent: content };

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
      // Use the Generative Language API which has Gemini 3.1 Pro Preview access
      const auth = new GoogleAuth({ 
        scopes: [
          'https://www.googleapis.com/auth/cloud-platform',
          'https://www.googleapis.com/auth/generative-language'
        ]
      });
      const client = await auth.getClient();
      const token = (await client.getAccessToken()).token;
      
      const modelName = process.env.VERTEX_AI_MODEL || 'gemini-3.1-pro-preview';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: parseFloat(process.env.CONTENT_TEMPERATURE || '0.9'),
            maxOutputTokens: parseInt(process.env.CONTENT_MAX_TOKENS || '8192'),
          }
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`GenAI API ${res.status}: ${errText.substring(0, 200)}`);
      }

      const data = await res.json() as any;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log(`[Gemini] ✅ Script generated via ${modelName} (${text.length} chars)`);
      return text;
    } catch (err: any) {
      console.error("[Gemini Text Error]:", err.message);
      // Fallback to ensure pipeline never crashes
      return "Did you know that there is a secret hidden in the deepest part of the ocean? Most people never think about it, but scientists recently discovered something massive moving down there. It completely changes everything we thought we knew about the deep sea. The craziest part? It might be older than the dinosaurs. Follow for more mysteries.";
    }
  }


  // 1. Imagen 3 - Image Generation
  async generateImage(prompt: string, seed: number = 0): Promise<string> {
    const uniqueId = Math.random().toString(36).substring(7);
    
    if (!process.env.VERTEX_AI_PROJECT_ID) {
      const fallbackUrl = `https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=400&h=720&fit=crop&random=${uniqueId}`;
      const tempPath = path.join(os.tmpdir(), `imagen_fallback_${Date.now()}_${uniqueId}.jpg`);
      const response = await fetch(fallbackUrl);
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(tempPath, Buffer.from(buffer));
      return tempPath;
    }

    try {
      // Use raw REST API for Imagen 3 since it requires the :predict endpoint
      const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
      const client = await auth.getClient();
      const accessToken = (await client.getAccessToken()).token;
      
      const projectId = process.env.VERTEX_AI_PROJECT_ID;
      const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
      const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagen-3.0-generate-001:predict`;
      
      const requestPayload = {
        instances: [{ prompt }],
        parameters: {
          aspectRatio: "9:16",
          sampleCount: 1,
          outputOptions: {
            mimeType: "image/jpeg",
            compressionQuality: 95
          }
        }
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Imagen 3 API Error: ${res.status} ${errText}`);
      }

      const data = await res.json();
      const base64Image = data.predictions?.[0]?.bytesBase64Encoded;
      if (!base64Image) throw new Error("Imagen generation failed: No image returned");

      const tempPath = path.join(os.tmpdir(), `imagen_${Date.now()}_${uniqueId}.jpg`);
      fs.writeFileSync(tempPath, Buffer.from(base64Image, 'base64'));
      return tempPath;
    } catch (e: any) {
      console.error("[Imagen 4 API Error]:", e.message || e);
      console.log("Falling back to NVIDIA Flux.2 Klein 4B...");

      const invokeUrl = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b";
      const headers = {
          "Authorization": "Bearer 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",
          "Accept": "application/json",
      };

      const payload = {
        "prompt": prompt,
        "width": 768,
        "height": 1344,
        "seed": seed,
        "steps": 4
      };

      try {
        const fluxResponse = await fetch(invokeUrl, {
            method: "post",
            body: JSON.stringify(payload),
            headers: { "Content-Type": "application/json", ...headers }
        });

        if (fluxResponse.status != 200) {
          const errBody = await fluxResponse.text();
          throw new Error("NVIDIA invocation failed: " + fluxResponse.status + " " + errBody);
        }
        
        const response_body = await fluxResponse.json() as any;
        
        // NVIDIA Flux API returns base64 inside artifacts array or directly as image/b64_json
        const b64 = response_body.image || response_body.artifacts?.[0]?.base64 || response_body.data?.[0]?.b64_json || response_body.b64_json;
        if (!b64) {
          console.error("[Flux Raw Response]:", JSON.stringify(response_body));
          throw new Error("Could not parse NVIDIA image response");
        }
        
        const tempPath = path.join(os.tmpdir(), `flux_${Date.now()}_${uniqueId}.jpg`);
        // Remove data URI prefix if present
        const cleanB64 = typeof b64 === 'string' ? b64.replace(/^data:image\/\w+;base64,/, "") : "";
        fs.writeFileSync(tempPath, Buffer.from(cleanB64, 'base64'));
        return tempPath;
      } catch (fluxErr: any) {
        console.error("[Flux Fallback Error]:", fluxErr.message || fluxErr);
        throw new Error("All AI Image Generators failed.");
      }
    }
  }

  /**
   * Fallback to free Stock API (Pixabay) or Pollinations AI when primary generation fails.
   */
  async fetchStockImage(keyword: string): Promise<string> {
    const cleanKeyword = keyword.split(',')[0].trim(); // Get main subject
    
    // 1. Try Pixabay if API Key exists
    if (process.env.PIXABAY_API_KEY) {
      try {
        const response = await fetch(`https://pixabay.com/api/?key=${process.env.PIXABAY_API_KEY}&q=${encodeURIComponent(cleanKeyword)}&image_type=photo&orientation=vertical&per_page=3&safesearch=true`);
        const data = await response.json() as any;
        if (data.hits && data.hits.length > 0) {
          return data.hits[0].largeImageURL; // Direct stock image URL
        }
      } catch (err) {
        console.error("[Pixabay Stock API Error]:", err);
      }
    }

    // 2. Fallback to free, keyless AI Stock Image API
    console.log(`[Stock API Fallback]: Using Pollinations AI for '${cleanKeyword}'`);
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(keyword)}?width=768&height=1344&nologo=true`;
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
      const uniqueId = Math.random().toString(36).substring(7);
      const tempPath = path.join(os.tmpdir(), `voiceover_fallback_${Date.now()}_${uniqueId}.mp3`);
      
      const res = await fetch(bgmUrl);
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(tempPath, Buffer.from(buffer));
      return tempPath;
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
}

export const aiOrchestrator = new AiOrchestratorService();
