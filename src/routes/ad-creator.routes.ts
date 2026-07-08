import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { aiOrchestrator } from '../services/ai-orchestrator.service';
import { logger } from '../utils/logger';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const router = Router();

const upload = multer({
  dest: path.join(process.cwd(), 'uploads', 'temp'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post('/directions', authenticate, upload.single('image'), async (req: any, res: any) => {
  try {
    const { productName, description, usp, personality, audience, platform, mood } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Product image is required.' });
    }

    const prompt = `Analyze this product image and the provided details. Then propose exactly 5 distinct ad creative directions following the World-Class Ads framework.
    
    Details:
    - Product: ${productName}
    - Description: ${description}
    - USP: ${usp}
    - Personality: ${personality}
    - Audience: ${audience}
    - Platform: ${platform}
    - Mood: ${mood}
    
    Propose exactly 5 distinct ad creative directions. Use these 5 fixed directions:
    1. Hero Lifestyle Integration
    2. Dramatic Product Theater
    3. Ingredient/Component Explosion
    4. Action / Dynamic Moment
    5. Premium Minimalist Showcase
    
    Output exactly in this JSON format (no markdown blocks, just raw JSON):
    {
      "directions": [
        {
          "id": 1,
          "title": "Hero Lifestyle Integration",
          "description": "..."
        }
      ]
    }`;

    const imageData = fs.readFileSync(file.path).toString('base64');
    const mimeType = file.mimetype;

    const resultText = await aiOrchestrator.generateContent(prompt, [{
      data: imageData,
      mimeType: mimeType
    }]);

    const cleanedText = resultText.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(cleanedText);

    fs.unlinkSync(file.path);

    res.json(parsed);
  } catch (error: any) {
    logger.error('Ad directions error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate', authenticate, async (req: any, res: any) => {
  try {
    const { productName, direction, platform } = req.body;

    const briefPrompt = `You are a world-class advertising copywriter and art director. Create a full creative brief for "${productName}" targeting the "${direction.title}" direction for ${platform}.
    
    Output exactly in this JSON format (no markdown blocks, just raw JSON):
    {
      "tagline": "...",
      "copy": "...",
      "sceneSetup": "...",
      "lighting": "...",
      "imagePrompt": "A highly-detailed, hyper-realistic ad visual for a product..."
    }
    
    CRITICAL: The imagePrompt must be a massive descriptive text block designed for a high-end image generator. It MUST describe the full ad composition, setting, product position, background, color mood, and atmosphere. Include terms like 'commercial photography, advertising campaign, campaign-ready'.
    `;

    const briefText = await aiOrchestrator.generateContent(briefPrompt);
    const cleanedBrief = briefText.replace(/```json\n?|```/g, '').trim();
    const briefParsed = JSON.parse(cleanedBrief);

    const imagePayload = JSON.stringify({
      prompt: briefParsed.imagePrompt,
      negative_prompt: "anatomy normalization, body proportion averaging, dataset-average anatomy, beautification filters, skin smoothing, plastic skin, airbrushed texture, stylized realism, text, watermarks, borders, distortion, extra limbs, weird hands, poorly drawn faces",
      api_parameters: {
        resolution: "1K",
        output_format: "jpg",
        aspect_ratio: platform.toLowerCase().includes('stor') || platform.toLowerCase().includes('reel') ? '9:16' : '4:5'
      },
      settings: {
        resolution: "1K",
        quality: "high detail, commercial photography"
      }
    });

    const imageUrl = await aiOrchestrator.generateImage(imagePayload, Math.floor(Math.random() * 1000000));

    res.json({
      brief: briefParsed,
      imageUrl
    });
  } catch (error: any) {
    logger.error('Ad generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
