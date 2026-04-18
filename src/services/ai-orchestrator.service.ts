import axios from 'axios';
import { storageService } from './media-upload.service.js';
import { prisma } from '../db/prisma.js';
import { v4 as uuidv4 } from 'uuid';

export interface ProductDetails {
  name: string;
  category: string;
  description: string;
  usp: string;
  personality: string;
  targetAudience: string;
  platforms: string[];
  mood: string;
}

export interface AdDirection {
  id: string;
  title: string;
  description: string;
}

export class AiOrchestratorService {
  private nvidiaKey: string;
  private tasks: Map<string, { 
    params: string, 
    status: string, 
    result?: string,
    logs: { message: string, timestamp: string }[]
  }> = new Map();

  constructor() {
    this.nvidiaKey = process.env.NVIDIA_API_KEY || '';
  }

  /**
   * Helper to call NVIDIA NIM (Text) via REST API
   */
  private async callNvidiaText(systemPrompt: string, userPrompt: string, model: string = "moonshotai/kimi-k2-thinking"): Promise<string> {
    if (!this.nvidiaKey) {
      return "NVIDIA_API_KEY_MISSING";
    }

    const url = "https://integrate.api.nvidia.com/v1/chat/completions";
    const payload = {
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1,
      top_p: 0.9,
      max_tokens: 4096,
      stream: false
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          "Authorization": `Bearer ${this.nvidiaKey}`,
          "Content-Type": "application/json"
        }
      });

      return response.data.choices[0]?.message?.content || "";
    } catch (error: any) {
      console.error("NVIDIA API call failed:", error.response?.data || error.message);
      return "NVIDIA_API_CALL_ERROR";
    }
  }

  /**
   * Proposes 5 distinct creative directions based on product details.
   */
  async proposeDirections(details: ProductDetails): Promise<AdDirection[]> {
    const systemPrompt = "You are a world-class Creative Director. Propose 5 distinct ad creative directions following the World-Class Ads framework: Hero Lifestyle, Dramatic Theater, Ingredient Explosion, Action/Dynamic, and Premium Minimalist. Return ONLY a JSON array of objects with id, title, and description.";
    const userPrompt = `Product: ${details.name}\nCategory: ${details.category}\nUSP: ${details.usp}\nAudience: ${details.targetAudience}\nMood: ${details.mood}`;

    const response = await this.callNvidiaText(systemPrompt, userPrompt, "meta/llama-3.1-70b-instruct");
    
    if (response === "NVIDIA_API_KEY_MISSING" || response === "NVIDIA_API_CALL_ERROR") {
      return [
        { id: 'hero-lifestyle', title: '🌟 Hero Lifestyle Integration', description: `Aspirational usage of ${details.name} in a real-world context.` },
        { id: 'dramatic-theater', title: '🎭 Dramatic Product Theater', description: `Cinematic showcase of ${details.name} as the sole hero.` },
        { id: 'component-explosion', title: '💎 Ingredient/Component Explosion', description: `High-energy deconstruction of ${details.name}.` },
        { id: 'dynamic-motion', title: '⚡ Action / Dynamic Moment', description: `Frozen-motion energy of ${details.name}.` },
        { id: 'premium-minimalist', title: '🤍 Premium Minimalist Showcase', description: `Craftsmanship focus with elegant composition.` }
      ];
    }

    try {
      return JSON.parse(response);
    } catch (e) {
      console.error("Failed to parse Gemini response for directions", response);
      throw new Error("Failed to generate creative directions. Please try again.");
    }
  }

  /**
   * Generates a full ad brief based on the chosen direction.
   */
  async generateBrief(directionId: string, details: ProductDetails) {
    const systemPrompt = "You are a world-class Ad Strategist and Copywriter. Generate a detailed creative brief including Tagline (max 8 words), Concept Story, and Visual Specs (Lighting, Background, Composition). Also include a 'youtubeSEO' object with 'recommendedTags' (comma-separated list of 10 search terms) and 'optimizedDescription' (search-friendly version of the copy). Return ONLY a JSON object with keys: tagline, concept, visualSpec (object with lighting, background, composition), and youtubeSEO (object).";
    const userPrompt = `Direction: ${directionId}\nProduct: ${details.name}\nDetails: ${details.description}\nMood: ${details.mood}`;

    const response = await this.callNvidiaText(systemPrompt, userPrompt);

    if (response === "NVIDIA_API_KEY_MISSING" || response === "NVIDIA_API_CALL_ERROR") {
      return {
        direction: directionId,
        tagline: "Experience the exceptional.",
        concept: `A premium showcase of ${details.name} tailored for ${details.targetAudience}.`,
        visualSpec: {
          lighting: "Professional studio lighting",
          background: "Minimalist brand-aligned backdrop",
          composition: "Center-weighted hero shot"
        }
      };
    }

    // Fallback if response is empty or not valid JSON
    if (!response || typeof response !== "string" || response.trim() === "") {
      console.warn("Empty response from NVIDIA for generateBrief, using fallback brief.");
      return {
        direction: directionId,
        tagline: "Elevate your style.",
        concept: `Showcase ${details.name} with elegance and modern flair.`,
        visualSpec: {
          lighting: "Soft ambient lighting",
          background: "Clean minimalist background",
          composition: "Focused product hero"
        },
        youtubeSEO: {
          recommendedTags: "fashion, premium, modern, style, luxury, ad, showcase, product, branding, marketing",
          optimizedDescription: `Discover ${details.name}, a premium fashion piece perfect for ${details.targetAudience}. Experience elegance and modern design.`
        }
      };
    }

    try {
      return JSON.parse(response);
    } catch (e) {
      console.error("Failed to parse NVIDIA response for brief", response);
      // Return a generic fallback brief instead of throwing
      return {
        direction: directionId,
        tagline: "Premium fashion redefined.",
        concept: `A high‑end visual narrative for ${details.name}.`,
        visualSpec: {
          lighting: "Studio lighting",
          background: "Elegant backdrop",
          composition: "Heroic composition"
        },
        youtubeSEO: {
          recommendedTags: "fashion, luxury, premium, ad, style, modern, branding, marketing, product, showcase",
          optimizedDescription: `Introducing ${details.name}: premium fashion for the modern professional.`
        }
      };
    }
  }

  private addLog(taskId: string, message: string) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.logs.push({ message, timestamp: new Date().toISOString() });
      this.tasks.set(taskId, task);
    }
  }

  /**
   * Triggers the NVIDIA FLUX generation (Synchronous fallback for polling flow).
   */
  async generateImage(params: { brief: any, productDetails: ProductDetails, imageUrl?: string }) {
    // We return a fake taskId to maintain the polling flow the frontend expects
    const taskId = `nv-${uuidv4()}`;
    
    // Use in-memory store instead of Prisma to avoid migration dependency
    this.tasks.set(taskId, {
      params: JSON.stringify(params),
      status: 'PENDING',
      logs: [{ message: 'Initializing AI Task...', timestamp: new Date().toISOString() }]
    });

    return { data: { taskId } };
  }

  /**
   * Calls NVIDIA FLUX API and stages the result.
   */
  async pollAndStageAsset(taskId: string, userId: string) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error('Task not found');
    if (task.status === 'COMPLETED') return JSON.parse(task.result!);

    this.addLog(taskId, 'Starting visual rendering on NVIDIA NIM...');
    const params = JSON.parse(task.params);
    const { brief, productDetails } = params;

    this.addLog(taskId, `Constructing prompt for ${productDetails.name} in ${brief.direction} style...`);
    const densePrompt = `${brief.visualSpec.composition}. Feature the ${productDetails.name} in a ${brief.direction} setting. Lighting: ${brief.visualSpec.lighting}. Atmosphere: ${productDetails.mood}, ${brief.concept}. Style: commercial photography, high-end advertising campaign.`;

    const url = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b";
    const payload = {
      prompt: densePrompt,
      width: 1024,
      height: 1024,
      seed: 0,
      steps: 4
    };

    this.addLog(taskId, 'Submitting job to black-forest-labs/flux.2-klein-4b...');
    const response = await axios.post(url, payload, {
      headers: {
        "Authorization": `Bearer ${this.nvidiaKey}`,
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });

    this.addLog(taskId, 'Visual received! Processing base64 data...');
    const base64Data = response.data.b64_json || response.data.artifacts?.[0]?.base64;
    if (!base64Data) throw new Error('No image data returned from NVIDIA');

    const buffer = Buffer.from(base64Data, 'base64');

    this.addLog(taskId, 'Staging asset to local edge storage...');
    // Save to our app's storage
    const uploadResult = await storageService.upload(buffer, {
      mimeType: 'image/jpeg',
      originalName: `ai-nv-${taskId}.jpg`,
      postId: 'system-gen'
    });

    this.addLog(taskId, 'Success! Asset is ready for publishing.');
    this.tasks.set(taskId, {
      ...task,
      status: 'COMPLETED',
      result: JSON.stringify(uploadResult)
    });

    return uploadResult;
  }
}

export const aiOrchestrator = new AiOrchestratorService();
