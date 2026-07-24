import { Router } from 'express';
import { jwtAuth as authenticate } from '../middleware/jwt-auth.js';
import { aiOrchestrator } from '../services/ai-orchestrator.service.js';
import { logger } from '../logger/pino.js';
import { prisma } from '../db/prisma.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post('/directions', authenticate, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'referenceImage', maxCount: 1 }]), async (req: any, res: any) => {
  try {
    const { productName, description, usp, personality, audience, platform, mood } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const file = files['image']?.[0];
    const referenceFile = files['referenceImage']?.[0];

    if (!productName || !description) {
      return res.status(400).json({ error: 'Product name and description are required.' });
    }

    const prompt = `Analyze the provided details${file ? ' and the attached product image' : ''}${referenceFile ? ' and reference image' : ''}. Then propose exactly 5 distinct ad creative directions following the World-Class Ads framework.
    
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

    const mediaParts = [];
    
    if (file) {
      mediaParts.push({
        data: file.buffer.toString('base64'),
        mimeType: file.mimetype
      });
    }

    if (referenceFile) {
      mediaParts.push({
        data: referenceFile.buffer.toString('base64'),
        mimeType: referenceFile.mimetype
      });
    }

    const resultText = await aiOrchestrator.generateContent(prompt, mediaParts);

    const cleanedText = resultText.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(cleanedText);

    res.json(parsed);
  } catch (error: any) {
    logger.error('Ad directions error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate', authenticate, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'referenceImage', maxCount: 1 }]), async (req: any, res: any) => {
  try {
    let { productName, direction, platform } = req.body;
    
    // Parse direction since it comes from FormData as a string
    if (typeof direction === 'string') {
      direction = JSON.parse(direction);
    }
    
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const file = files?.['image']?.[0];
    const referenceFile = files?.['referenceImage']?.[0];

    let productImageBase64 = null;
    let productMimeType = null;
    if (file) {
      productImageBase64 = file.buffer.toString('base64');
      productMimeType = file.mimetype;
    }

    let styleImageBase64 = null;
    let styleMimeType = null;
    if (referenceFile) {
      styleImageBase64 = referenceFile.buffer.toString('base64');
      styleMimeType = referenceFile.mimetype;
    }

    const briefPrompt = `You are a world-class advertising creative assistant and art director. Create a full creative brief for "${productName}" targeting the "${direction.title}" direction for ${platform}.
    
    We are providing:
    ${file ? '- A Product Image: Use this product exactly in the generated image. Describe its exact visual properties in detail.' : ''}
    ${referenceFile ? '- A Style Reference Image: The style of the final output image MUST look identical or highly inspired by this image\'s style, color palette, lighting, background, composition, and aesthetic. Describe how to replicate this aesthetic while featuring the product.' : ''}

    Output exactly in this JSON format (no markdown blocks, just raw JSON):
    {
      "campaignConcept": "One sentence describing the creative idea",
      "tagline": "Memorable headline (2-6 words)",
      "supportingCopy": "One descriptive line about the product benefit",
      "callToAction": "Action phrase like 'Shop Now'",
      "visualSceneSetup": "Detailed description of the photography/visual setup, lighting, and mood",
      "brandIntegration": "Logo placement, color overlays, typography style",
      "layoutAndEffects": "Product placement, negative space, special effects like glow/motion blur",
      "creativeRationale": "Explain which professional creative standards were applied and why",
      "imagePrompt": "A highly-detailed, hyper-realistic ad visual...",
      "negativePrompt": "Comma-separated list of things to exclude (e.g., humans, people, hands, if the product is an animal/cartoon and no humans are needed)"
    }
    
    CRITICAL INSTRUCTION FOR IMAGE PROMPT:
    The imagePrompt MUST describe a COMPLETE, PROFESSIONALLY DESIGNED ADVERTISEMENT, not just a product photo. 
    It MUST explicitly command the image generator to render the typography (Tagline and CTA) beautifully integrated into the layout, utilizing negative space.
    CRITICAL: The image generator MUST NOT include any fake logos, watermarks, brand icons, or signatures.
    CRITICAL: Do NOT add humans, people, or hands to the scene unless explicitly requested by the product description. If the product is an animal, pet, or cartoon, explicitly enforce "NO HUMANS, NO PEOPLE, NO HANDS" in the prompt.
    ${file ? 'IMPORTANT: We are passing the original product image. Instruct the image generator in the imagePrompt to use the reference image EXACTLY, and explicitly state that the product/dress/model MUST remain 100% identical and unaltered.' : ''}
    ${referenceFile ? 'IMPORTANT: We are also passing a style reference image. Instruct the image generator to replicate the visual style, background, lighting, composition, and color theme of the style reference image.' : ''}
    `;

    const briefMediaParts: { data: string; mimeType: string }[] = [];
    if (file && productImageBase64 && productMimeType) {
      briefMediaParts.push({
        data: productImageBase64,
        mimeType: productMimeType
      });
    }
    if (referenceFile && styleImageBase64 && styleMimeType) {
      briefMediaParts.push({
        data: styleImageBase64,
        mimeType: styleMimeType
      });
    }

    const briefText = await aiOrchestrator.generateContent(briefPrompt, briefMediaParts);
    const cleanedBrief = briefText.replace(/```json\n?|```/g, '').trim();
    const briefParsed = JSON.parse(cleanedBrief);

    const imagePayload = JSON.stringify({
      prompt: briefParsed.imagePrompt,
      negative_prompt: (briefParsed.negativePrompt ? briefParsed.negativePrompt + ", " : "") + "logo, logos, watermark, watermarks, signature, brand icon, anatomy normalization, body proportion averaging, dataset-average anatomy, beautification filters, skin smoothing, plastic skin, airbrushed texture, stylized realism, borders, distortion, extra limbs, weird hands, poorly drawn faces",
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

    const tempImageUrl = await aiOrchestrator.generateImage(
      imagePayload, 
      Math.floor(Math.random() * 1000000), 
      productImageBase64, 
      productMimeType,
      styleImageBase64,
      styleMimeType
    );
    
    // Move the temp file to the public uploads directory
    const fileName = `ad_creative_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
    const publicDir = path.join(process.cwd(), 'frontend', 'public', 'uploads', 'ai-images');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    const publicPath = path.join(publicDir, fileName);
    fs.copyFileSync(tempImageUrl, publicPath);
    
    const imageUrl = `/uploads/ai-images/${fileName}`;
    const adCreative = await prisma.adCreative.create({
      data: {
        userId: req.userId,
        productName,
        platform,
        direction: direction.title,
        brief: briefParsed,
        imageUrl
      }
    });

    res.json({
      id: adCreative.id,
      brief: briefParsed,
      imageUrl
    });
  } catch (error: any) {
    logger.error('Ad generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/history', authenticate, async (req: any, res: any) => {
  try {
    const history = await prisma.adCreative.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const reels = await prisma.reel.findMany({
      where: {
        userId: req.userId,
        type: 'VEO_SHORT',
        status: { in: ['READY', 'PUBLISHED'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    const enrichedHistory = history.map((ad: any) => {
      const matchingReel = reels.find((r: any) => {
        const meta = r.metadata as any;
        if (meta && meta.adId && meta.adId === ad.id) return true;
        if (meta && meta.sourceImageUrl && meta.sourceImageUrl === ad.imageUrl) return true;
        if (r.thumbnail && r.thumbnail === ad.imageUrl) return true;
        return false;
      });

      return {
        ...ad,
        videoUrl: matchingReel?.videoUrl || null
      };
    });

    res.json(enrichedHistory);
  } catch (error: any) {
    logger.error('Ad history fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
