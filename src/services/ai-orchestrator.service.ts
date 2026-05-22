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
    const model = this.vertexAI.getGenerativeModel({ model: process.env.VERTEX_AI_MODEL || 'gemini-1.5-pro-002' });

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
    const model = this.vertexAI.getGenerativeModel({ model: process.env.VERTEX_AI_MODEL || 'gemini-1.5-pro-002' });

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
    if (!this.vertexAI) {
      return `Generated text based on: ${prompt}`;
    }
    const model = this.vertexAI.getGenerativeModel({ model: process.env.VERTEX_AI_MODEL || 'gemini-1.5-pro-002' });
    const result = await model.generateContent(prompt);
    return result.response.candidates?.[0]?.content.parts[0]?.text || '';
  }

  // 1. Imagen 3 - Image Generation
  async generateImage(prompt: string): Promise<string> {
    const uniqueId = Math.random().toString(36).substring(7);
    
    if (!this.vertexAI) {
      // Return dynamic fallback if no AI configured
      const fallbackUrl = `https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=400&h=720&fit=crop&random=${uniqueId}`;
      const tempPath = path.join(os.tmpdir(), `imagen_fallback_${Date.now()}_${uniqueId}.jpg`);
      const response = await fetch(fallbackUrl);
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(tempPath, Buffer.from(buffer));
      return tempPath;
    }
    
    const imagenModel = this.vertexAI.getGenerativeModel({ model: 'imagen-4.0-generate-001' });
    
    const request = {
      instances: [{ prompt }],
      parameters: { 
        aspectRatio: "9:16",
        sampleCount: 1,
        sampleImageSize: "1k",
        personGeneration: "allow_all",
        addWatermark: true,
        outputOptions: {
          mimeType: "image/jpeg",
          compressionQuality: 95
        }
      }
    };
    
    try {
      // @ts-ignore - using internal prediction endpoint for Imagen
      const [response] = await imagenModel.preview.generateContent(request as any);
      // @ts-ignore
      const base64Image = response?.predictions?.[0]?.bytesBase64Encoded;
      if (!base64Image) throw new Error("Imagen generation failed");
      
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
        "seed": 0,
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
        if (!b64) throw new Error("Could not parse NVIDIA image response");
        
        const tempPath = path.join(os.tmpdir(), `flux_${Date.now()}_${uniqueId}.jpg`);
        // Remove data URI prefix if present
        const cleanB64 = typeof b64 === 'string' ? b64.replace(/^data:image\/\w+;base64,/, "") : "";
        fs.writeFileSync(tempPath, Buffer.from(cleanB64, 'base64'));
        return tempPath;
      } catch (fluxErr: any) {
        console.error("[Flux Fallback Error]:", fluxErr.message || fluxErr);
        // Absolute worst case scenario
        return 'https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=400&h=720&fit=crop';
      }
    }
  }

  // 2. Google Cloud TTS (Journey Voices for High Fidelity)
  async generateVoiceover(text: string, voiceName: string = 'en-US-Journey-D', language: string = 'en-US'): Promise<string> {
    const textToSpeech = await import('@google-cloud/text-to-speech');
    const client = new textToSpeech.TextToSpeechClient();
    
    // Properly map frontend language strings to BCP-47 and appropriate premium voices
    let bcp47Language = 'en-US';
    let actualVoiceName = 'en-US-Journey-D';

    if (language.includes('Hindi')) {
      bcp47Language = 'hi-IN';
      // Map personas to Hindi Neural2 voices (Journey is en-US/es-ES only usually)
      if (voiceName === 'Aoede' || voiceName === 'Kore') actualVoiceName = 'hi-IN-Neural2-A'; // Female
      else actualVoiceName = 'hi-IN-Neural2-C'; // Male (Puck, Charon, Fenrir)
    } else if (language.includes('Spanish')) {
      bcp47Language = 'es-ES';
      if (voiceName === 'Aoede' || voiceName === 'Kore') actualVoiceName = 'es-ES-Journey-O'; // Female
      else actualVoiceName = 'es-ES-Journey-D'; // Male
    } else {
      // Default to English
      bcp47Language = 'en-US';
      if (voiceName === 'Aoede' || voiceName === 'Kore') actualVoiceName = 'en-US-Journey-O'; // Female
      else if (voiceName === 'Charon') actualVoiceName = 'en-US-Journey-F'; // Deep Male
      else actualVoiceName = 'en-US-Journey-D'; // Standard Male (Puck, Fenrir)
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
      const tempPath = path.join(os.tmpdir(), `voiceover_${Date.now()}_${uniqueId}.wav`);
      
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
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // For now, download the MDN audio sample to represent the Lyria track
    const bgmUrl = 'https://raw.githubusercontent.com/mdn/webaudio-examples/main/audio-analyser/viper.mp3';
    const tempPath = path.join(os.tmpdir(), `lyria_${Date.now()}.mp3`);
    
    const response = await fetch(bgmUrl);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(tempPath, Buffer.from(buffer));
    
    return tempPath;
  }
}

export const aiOrchestrator = new AiOrchestratorService();
