import { VertexAI } from '@google-cloud/vertexai';
import { storageService } from './media-upload.service.js';

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
    const model = this.vertexAI.getGenerativeModel({ model: process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash' });

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
}

export const aiOrchestrator = new AiOrchestratorService();
