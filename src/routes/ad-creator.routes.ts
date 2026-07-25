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
    
    if (direction) {
      if (typeof direction === 'string') {
        try {
          direction = JSON.parse(direction);
        } catch (e) {
          direction = { title: direction };
        }
      }
    } else {
      direction = { title: 'Creative Direction' };
    }
    const dirTitle = direction.title || direction.name || (typeof direction === 'string' ? direction : 'Creative Direction');
    
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

    const briefPrompt = `You are an elite advertising creative director and master commercial photographer combining the "world-class-ads" creative framework with the "nano-banana-images" hyper-realism engine.

Create a full, high-converting commercial creative brief for "${productName}" targeting the "${dirTitle}" direction for ${platform}.
    
    Provided Input:
    ${productImagesList.length > 0 ? `- PRIMARY HERO PRODUCT ANCHOR (IMAGE 1): The first attached product image is the SINGLE GROUND TRUTH HERO PRODUCT PHOTO. Reproduce this exact product/garment/object 100% identically with zero feature mutation or hallucination. Preserve exact logos, labels, fabric, cuts, color, and silhouette unaltered.` : ''}
    ${styleImagesList.length > 0 ? `- ${styleImagesList.length} Pose & Style Reference Image(s) (STYLE TRANSFER ONLY): Adapt ONLY the model pose, body stance, camera perspective, lighting, 3D environment, and visual aesthetic from these style reference images. DO NOT use or reproduce any clothing or product present in these reference images—the product MUST come strictly from the Primary Hero Product Photo!` : ''}
    ${specialInstructions ? `- USER SPECIAL POSE/STYLE INSTRUCTION: "${specialInstructions}". Make sure to explicitly obey this instruction regarding what to look for or adapt from the reference images!` : ''}

    Output exactly in this JSON format (no markdown blocks, just raw JSON):
    {
      "campaignConcept": "One sentence describing the creative idea and emotional hook",
      "tagline": "Memorable, high-impact headline (2-6 words)",
      "supportingCopy": "One crisp line highlighting the core product benefit",
      "callToAction": "Action-oriented CTA phrase (e.g., 'Shop Now', 'Discover the Collection')",
      "visualSceneSetup": "Detailed description of setting, camera physics (85mm f/1.8 lens, ISO 100), category-specific lighting (backlit translucency for drinks, specular marble light for luxury, macro fabric movement for fashion), and mood",
      "brandIntegration": "Logo placement ratio, typography style hierarchy, color palette integration",
      "layoutAndEffects": "Product placement, negative space safe zone composition for typography overlays, visual effects (lens flare, light streak, motion blur, reflection)",
      "creativeRationale": "Explain which professional advertising category standards and emotional triggers were applied and why",
      "imagePrompt": "A highly-detailed, hyper-realistic dense narrative description for commercial image generation...",
      "negativePrompt": "Comma-separated list of exclusions (e.g., plastic skin, airbrushed textures, dataset-average anatomy, beautification filters, fake logos, watermarks, product mutation, feature averaging, hybrid garment)"
    }
    
    CRITICAL GUIDELINES FOR THE IMAGE PROMPT:
    1. PRIORITY #1 — MANDATORY PRODUCT PRESERVATION: The primary hero product image (Image #1) is the absolute ground truth. Instruct the image generator to reproduce the exact product, garment, logo, fabric, cuts, color, and silhouette 100% identically without feature blending or hallucination.
    2. COMPLETE COMMERCIAL ADVERTISEMENT WITH TYPOGRAPHY: Describe a complete, campaign-ready advertisement featuring the tagline headline "${dirTitle}" and CTA button clearly integrated into the layout.
    3. OPTICAL CAMERA PHYSICS: Include explicit focal length (85mm f/1.8 lens, ISO 100), natural directional lighting, rim lights, soft shadow falloff, and unretouched micro-surface texture details.
    4. POSE & STYLE TRANSFER ONLY: ${styleImagesList.length > 0 ? 'Instruct the generator to closely replicate the model pose, posture, body angle, lighting, background scene, and visual aesthetic from the style reference photo, while keeping the primary hero product 100% identical. EXPLICITLY PROHIBIT replacing or blending the product with any clothing worn in style reference photos.' : 'Use high-end commercial studio or aspirational lifestyle composition.'}
    ${specialInstructions ? `5. USER SPECIAL DIRECTIVE: "${specialInstructions}". Enforce this instruction strictly in the prompt!` : ''}
    `;

    const briefMediaParts: { data: string; mimeType: string }[] = [...productImagesList, ...styleImagesList];

    const briefText = await aiOrchestrator.generateContent(briefPrompt, briefMediaParts);
    const cleanedBrief = briefText.replace(/```json\n?|```/g, '').trim();
    let briefParsed: any;
    try {
      briefParsed = JSON.parse(cleanedBrief);
    } catch (e) {
      briefParsed = {
        campaignConcept: briefText.substring(0, 120),
        tagline: productName,
        supportingCopy: "High-impact commercial campaign",
        callToAction: "Shop Now",
        visualSceneSetup: "Commercial studio setting with directional lighting",
        brandIntegration: "Hero placement",
        layoutAndEffects: "Clean dynamic layout",
        creativeRationale: "Standard advertising benchmark",
        imagePrompt: briefText,
        negativePrompt: "low quality, blur, distortion"
      };
    }

    const nanoBananaNegativeStack = "logo, logos, watermark, watermarks, signature, brand icon, anatomy normalization, body proportion averaging, dataset-average anatomy, beautification filters, skin smoothing, plastic skin, airbrushed texture, stylized realism, borders, distortion, extra limbs, weird hands, poorly drawn faces";

    const taglineText = briefParsed.tagline ? briefParsed.tagline.toUpperCase() : productName.toUpperCase();
    const ctaText = briefParsed.callToAction ? briefParsed.callToAction.toUpperCase() : 'SHOP NOW';
    const subCopyText = briefParsed.supportingCopy || '';

    const typographyDirective = `\n\nWORLD-CLASS ADVERTISING GRAPHIC LAYOUT & TYPOGRAPHY DIRECTIVE:\n1. HEADLINE OVERLAY: Render the exact tagline headline "${taglineText}" as bold, ultra-crisp, high-contrast commercial advertising typography overlaid on the graphic visual.\n2. SUPPORTING COPY: Render "${subCopyText}" in clean, modern secondary typography below the headline.\n3. CALL TO ACTION: Render a clean, modern CTA button pill with text "${ctaText}" in the bottom safe zone.`;

    const promptWithTypography = `${briefParsed.imagePrompt}${typographyDirective}`;

    const imagePayload = JSON.stringify({
      prompt: promptWithTypography,
      negative_prompt: (briefParsed.negativePrompt ? briefParsed.negativePrompt + ", " : "") + nanoBananaNegativeStack,
      api_parameters: {
        resolution: "1K",
        output_format: "jpg",
        aspect_ratio: platform.toLowerCase().includes('stor') || platform.toLowerCase().includes('reel') ? '9:16' : '4:5'
      },
      settings: {
        resolution: "1K",
        style: "documentary commercial realism",
        quality: "high detail, unretouched skin, optical camera physics"
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
