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

const adUploadFields = upload.fields([
  { name: 'image', maxCount: 4 },
  { name: 'images', maxCount: 4 },
  { name: 'referenceImage', maxCount: 4 },
  { name: 'referenceImages', maxCount: 4 }
]);

router.post('/directions', authenticate, adUploadFields, async (req: any, res: any) => {
  try {
    const { productName, description, usp, personality, audience, platform, mood, specialInstructions } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const prodFiles = [...(files?.['image'] || []), ...(files?.['images'] || [])];
    const refFiles = [...(files?.['referenceImage'] || []), ...(files?.['referenceImages'] || [])];

    if (!productName || !description) {
      return res.status(400).json({ error: 'Product name and description are required.' });
    }

    const prompt = `Analyze the provided details${prodFiles.length > 0 ? ` and the ${prodFiles.length} attached product image(s)` : ''}${refFiles.length > 0 ? ` and ${refFiles.length} pose/style reference image(s)` : ''}. Then propose exactly 5 distinct ad creative directions following the World-Class Ads framework.
    
    Details:
    - Product: ${productName}
    - Description: ${description}
    - USP: ${usp}
    - Personality: ${personality}
    - Audience: ${audience}
    - Platform: ${platform}
    - Mood: ${mood}
    ${specialInstructions ? `- USER SPECIAL INSTRUCTIONS: "${specialInstructions}"` : ''}
    
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

    const mediaParts: { data: string; mimeType: string }[] = [];
    
    for (const f of prodFiles) {
      mediaParts.push({
        data: f.buffer.toString('base64'),
        mimeType: f.mimetype
      });
    }

    for (const f of refFiles) {
      mediaParts.push({
        data: f.buffer.toString('base64'),
        mimeType: f.mimetype
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

router.post('/generate', authenticate, adUploadFields, async (req: any, res: any) => {
  try {
    let { productName, direction, platform, specialInstructions } = req.body;
    
    if (typeof direction === 'string') {
      direction = JSON.parse(direction);
    }
    
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const prodFiles = [...(files?.['image'] || []), ...(files?.['images'] || [])];
    const refFiles = [...(files?.['referenceImage'] || []), ...(files?.['referenceImages'] || [])];

    const productImagesList: Array<{ data: string; mimeType: string }> = prodFiles.map(f => ({
      data: f.buffer.toString('base64'),
      mimeType: f.mimetype
    }));

    const styleImagesList: Array<{ data: string; mimeType: string }> = refFiles.map(f => ({
      data: f.buffer.toString('base64'),
      mimeType: f.mimetype
    }));

    const briefPrompt = `You are a world-class advertising creative assistant and art director. Create a full creative brief for "${productName}" targeting the "${direction.title}" direction for ${platform}.
    
    We are providing:
    ${productImagesList.length > 0 ? `- ${productImagesList.length} Product Image(s): Use this product/garment/object 100% identically in the generated visual. Keep exact logo, labels, fabric, cuts, color, and pattern unchanged. DO NOT alter the design.` : ''}
    ${styleImagesList.length > 0 ? `- ${styleImagesList.length} Pose & Style Reference Image(s): The pose, model stance, body angle, camera perspective, lighting, 3D environment, typography layout, and aesthetic style MUST adapt from these reference images while seamlessly featuring the identical product.` : ''}
    ${specialInstructions ? `- USER SPECIAL POSE/STYLE INSTRUCTION: "${specialInstructions}". Make sure to explicitly obey this instruction regarding what to look for or adapt from the reference images!` : ''}

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
    
    CRITICAL GUIDELINES FOR THE IMAGE PROMPT:
    1. COMPLETE COMMERCIAL ADVERTISEMENT WITH TYPOGRAPHY: Describe a complete, campaign-ready advertisement featuring the tagline headline "${direction.title || ''}" and CTA button clearly integrated into the layout. Get the text layout, typography font styles, and placement from the Pose & Style Reference Image.
    2. CAMERA MATH & OPTICAL PHYSICS: Include explicit focal length (85mm f/1.8 lens, ISO 100), natural directional lighting, rim lights, soft shadow falloff, and unretouched micro-surface texture details.
    3. PRIMARY HERO PRODUCT IDENTITY LOCK: ${productImagesList.length > 0 ? 'Instruct the generator to treat the Product Image as the strict hero product anchor. The original product, garment, logos, colors, fabric texture, cuts, and patterns must remain 100% identical and completely unaltered. Strictly prohibit any feature averaging or merging of clothing features with the style reference photos.' : 'Feature the product as the central hero element.'}
    4. CAMERA PERSPECTIVE & POSE MATCH: ${styleImagesList.length > 0 ? 'Instruct the generator to match and replicate the exact camera angle, optical perspective, camera elevation, framing, model pose, stance, body posture, lighting setup, and background scene from the attached style reference photo, while featuring the identical hero product.' : 'Use high-end commercial studio or aspirational lifestyle composition.'}
    ${specialInstructions ? `5. USER SPECIAL DIRECTIVE: "${specialInstructions}". Enforce this instruction strictly in the prompt!` : ''}
    `;

    const briefMediaParts: { data: string; mimeType: string }[] = [...productImagesList, ...styleImagesList];

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
      productImagesList, 
      null,
      styleImagesList,
      null
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

    let referenceImageUrl: string | null = null;
    if (refFiles.length > 0) {
      try {
        const refFileName = `ref_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
        const refPublicPath = path.join(publicDir, refFileName);
        fs.writeFileSync(refPublicPath, refFiles[0].buffer);
        referenceImageUrl = `/uploads/ai-images/${refFileName}`;
        briefParsed.referenceImageUrl = referenceImageUrl;
      } catch (e: any) {
        logger.warn(`Failed to save reference image copy: ${e.message || e}`);
      }
    }

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
      imageUrl,
      referenceImageUrl
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
