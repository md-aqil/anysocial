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

async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const isLastAttempt = i === retries - 1;
      const isRetryable = /429|503|500|rate.?limit|quota|unavailable|timeout|ECONNRESET|ENOTFOUND/i.test(err.message || '');
      
      if (isLastAttempt || !isRetryable) {
        throw err;
      }
      
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
      logger.warn(`Retry ${i + 1}/${retries} after error: ${err.message}. Waiting ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Retry logic failed unexpectedly');
}

router.post('/directions', authenticate, adUploadFields, async (req: any, res: any) => {
  try {
    const { productName, description, usp, personality, audience, platform, mood, specialInstructions } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const prodFiles = [...(files?.['image'] || []), ...(files?.['images'] || [])];
    const refFiles = [...(files?.['referenceImage'] || []), ...(files?.['referenceImages'] || [])];

    if (!productName || !description) {
      return res.status(400).json({ error: 'Product name and description are required.' });
    }

    if (prodFiles.length === 0) {
      return res.status(400).json({ error: 'At least one product image is required to generate directions. Please upload a product photo.' });
    }

    const prompt = `You are an elite advertising art director and commercial photographer using the Nano Banana 2 hyper-realistic imaging protocol combined with world-class campaign strategy.

Analyze the provided product image(s) and reference image(s). Then propose exactly 4 distinct ad creative directions.

HARD CONSTRAINTS (apply to ALL 4 directions):
1. PRODUCT IDENTITY LOCK: The product(s) in the Product Image(s) must remain 100% identical in every direction - exact shape, fabric, cuts, color, pattern, logo, labels, texture. STRICTLY PROHIBITED: feature averaging, merging, smoothing, or altering the product design.
2. REFERENCE IMAGE PINNING: ${refFiles.length > 0 ? `The ${refFiles.length} Style/Pose Reference Image(s) are ENVIRONMENT/POSE TEMPLATES. For each direction, describe how the scene would replicate the exact camera angle, model pose, lighting setup, background, and aesthetic from the reference image(s). CRITICAL: If the reference image contains text, typography, or copy, replicate the EXACT font style, font weight, letter spacing, text color, text placement, text size, and text alignment. Do NOT overlap or place new text over existing reference text. The ONLY element that changes between directions is the product presentation - everything else (model, setting, light, mood, typography) is locked to the reference.` : 'No reference images provided - use high-end commercial studio or aspirational lifestyle composition.'}
3. NANO-BANANA QUALITY: Every direction must be achievable with hyper-realistic imaging: camera math (85mm, f/2.0, ISO 200), natural directional lighting, shallow depth of field, visible material texture, unretouched surface details.

For each direction, provide:
- title: The direction name (use exactly these 4)
- description: A 2-3 sentence concept explaining the scene, how the reference image is replicated, how the product identity is preserved, and what makes this direction distinct from the others. Be specific about camera angle, lighting, model pose, background, text/typography treatment, and product presentation.

Use these 4 fixed directions:
1. Hero Lifestyle Integration - Aspirational usage in a real-world lifestyle context matching the reference
2. Dramatic Product Theater - Cinematic, high-contrast, product as the sole hero, replicating reference lighting
3. Action / Dynamic Moment - Motion, energy, decisive moment, matching reference camera angle and energy
4. Premium Minimalist Showcase - Clean, elegant, negative space, craftsmanship focus within reference composition

Details:
- Product: ${productName}
- Description: ${description}
- USP: ${usp}
- Personality: ${personality}
- Audience: ${audience}
- Platform: ${platform}
- Mood: ${mood}
- Aspect Ratio: ${platform.toLowerCase().includes('stor') || platform.toLowerCase().includes('reel') ? '9:16 vertical' : platform.toLowerCase().includes('landscape') ? '16:9 horizontal' : platform.toLowerCase().includes('square') ? '1:1 square' : '4:5 portrait'}
${specialInstructions ? `- USER SPECIAL INSTRUCTIONS (HARD CONSTRAINT): "${specialInstructions}"` : ''}

Output exactly in this JSON format (no markdown blocks, just raw JSON):
{
  "directions": [
    {
      "id": 1,
      "title": "Hero Lifestyle Integration",
      "description": "2-3 sentences describing the scene, reference replication, product lock, and camera/lighting specifics."
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

    const briefPrompt = `You are an elite advertising creative assistant and art director using the Nano Banana 2 hyper-realistic imaging protocol combined with world-class campaign strategy. Create a full creative brief for "${productName}" targeting the "${direction.title}" direction for ${platform}.

We are providing:
${productImagesList.length > 0 ? `- ${productImagesList.length} Product Image(s): These are the HERO IDENTITY ANCHORS. The product/garment/object in the generated visual must remain 100% identical to these images in shape, fabric, cuts, color, pattern, logo, labels, and texture. STRICTLY PROHIBITED: any feature averaging, merging, smoothing, or altering of the product design. The product must look like the exact same physical object placed into the new scene.` : ''}
${styleImagesList.length > 0 ? `- ${styleImagesList.length} Pose & Style Reference Image(s): These are ENVIRONMENT/POSE TEMPLATES. The generated image MUST replicate the exact camera angle, optical perspective, camera elevation, shot framing, model pose, stance, body posture, lighting setup, 3D environment, background scene, typography layout, color grading, and aesthetic style from these reference images. CRITICAL: If the reference image contains text, typography, or copy, replicate the EXACT font style, font weight, letter spacing, text color, text placement, text size, and text alignment. Do NOT overlap or place new text over existing reference text. The ONLY element that changes is the product itself - everything else (model, setting, light, mood, typography) must match the reference with photographic precision.` : ''}
${specialInstructions ? `- USER SPECIAL POSE/STYLE INSTRUCTION: "${specialInstructions}". This is a hard constraint. Explicitly obey this instruction regarding what to look for or adapt from the reference images.` : ''}

Output exactly in this JSON format (no markdown blocks, just raw JSON):
{
  "campaignConcept": "One sentence describing the creative idea and emotional trigger",
  "tagline": "Memorable headline (2-6 words)",
  "supportingCopy": "One descriptive line about the product benefit",
  "callToAction": "Action phrase like 'Shop Now'",
  "visualSceneSetup": "Detailed description of the photography/visual setup, lighting, and mood",
  "colorAndMood": {
    "palette": "Primary + accent colors with hex codes if inferable from reference",
    "mood": "Adjectives describing the overall feeling"
  },
  "typographyTreatment": {
    "headlineFont": "Font style for tagline (e.g., 'Bold condensed serif, uppercase')",
    "supportingFont": "Font style for supporting copy (e.g., 'Light sans-serif, generous tracking')",
    "textPlacement": "Where text lives in the frame (e.g., 'top third', 'bottom quarter', 'overlay center')"
  },
  "graphicOverlaysAndEffects": "Describe any graphic elements: gradients, vignettes, texture overlays, motion blur, light flares, etc.",
  "logoTreatment": {
    "placement": "Where the logo goes (e.g., 'Bottom right, 10% frame width, white knockout')",
    "size": "Relative size in frame"
  },
  "platformSpecs": {
    "platform": "${platform}",
    "aspectRatio": "${platform.toLowerCase().includes('stor') || platform.toLowerCase().includes('reel') ? '9:16' : platform.toLowerCase().includes('landscape') ? '16:9' : platform.toLowerCase().includes('square') ? '1:1' : '4:5'}",
    "textSafeZone": "Inner 80% of frame"
  },
  "referenceInfluence": ${styleImagesList.length > 0 ? `"Explain exactly how the attached reference image(s) influenced this direction - which specific elements were replicated (camera angle, lighting, pose, background, color grading) and how the product was integrated without altering the reference's core aesthetic."` : `"No reference images were provided. Professional creative standards from the commercial advertising playbook were applied: clean composition, professional color grading, and editorial photography techniques."`},
  "creativeRationale": "Explain which professional creative standards were applied and why",
  "imagePrompt": "Dense narrative ad visual in nano-banana-images format...",
  "negativePrompt": "Comma-separated list of things to exclude"
}

CRITICAL IMAGE PROMPT CONSTRUCTION RULES:
1. DENSE NARRATIVE FORMAT: The imagePrompt must be a single, ultra-descriptive paragraph using the nano-banana-images Dense Narrative Format. Include ALL of the following:
   - Camera mathematics: exact focal length (e.g., 85mm lens), aperture (e.g., f/2.0), ISO (e.g., ISO 200)
   - Lighting behavior: not just the light name, but what it DOES (e.g., "golden hour side light creating long soft shadows across the surface")
   - Explicit imperfections for the product: micro-scratches, material texture, natural wear (e.g., "subtle scoring on anodized aluminum", "natural fiber fuzz on cotton seam", "light oxidation on brass fitting")
   - Direct commands inside the prompt: "Do not beautify or alter the product surface. No plastic skin or airbrushed texture."
   - Depth of field: shallow depth of field, bokeh background
   - Complete scene composition: not just the product in isolation, but the full ad frame with tagline, CTA, background, and graphic atmosphere

 2. REFERENCE IMAGE PINNING: ${styleImagesList.length > 0 ? 'The imagePrompt must explicitly state: "Match the exact camera angle, model pose, body posture, lighting setup, background environment, typography layout, text style, font family, font weight, letter spacing, text color, text placement, text size, and visual aesthetic from the attached Style/Pose Reference Image(s). If the reference contains text, replicate the exact typography style - do NOT create new text styles or overlap text over existing reference text. The product is the ONLY element that changes - everything else (model, setting, light, mood, typography) is locked to the reference."' : 'Use high-end commercial studio or aspirational lifestyle composition.'}

3. PRODUCT IDENTITY LOCK: ${productImagesList.length > 0 ? 'The imagePrompt must explicitly state: "The product is the strict hero anchor. Preserve 100% identity: exact shape, fabric texture, logo, color, pattern, cuts, and labels. No feature averaging or merging with reference images. No smoothing, beautification, or redesign of the product."' : 'Feature the product as the central hero element.'}

4. COMMERCIAL CAMPAIGN ANCHORS: The imagePrompt must include these style anchors: "commercial photography, advertising campaign, campaign-ready, professional color grading, editorial composition"

5. TYPOGRAPHY INTEGRATION: The imagePrompt must describe where the tagline and CTA appear in the frame, what font styles they use, and how they integrate with the scene - not as an afterthought, but as a composed part of the advertisement.

6. USER DIRECTIVE: ${specialInstructions ? `Enforce strictly: "${specialInstructions}"` : 'N/A'}`;

    const briefMediaParts: { data: string; mimeType: string }[] = [...productImagesList, ...styleImagesList];

    let briefText: string;
    try {
      briefText = await withRetry(() => aiOrchestrator.generateContent(briefPrompt, briefMediaParts), 3, 2000);
    } catch (err: any) {
      logger.error({ event: 'brief_generation_failed', error: err.message }, 'Brief generation failed after retries');
      return res.status(502).json({ error: `AI brief generation failed: ${err.message}. Please retry.` });
    }

    const cleanedBrief = briefText.replace(/```json\n?|```/g, '').trim();
    let briefParsed: any;
    try {
      briefParsed = JSON.parse(cleanedBrief);
    } catch (err) {
      logger.error({ event: 'brief_json_parse_failed', raw: cleanedBrief.substring(0, 500) }, 'Failed to parse brief JSON');
      return res.status(502).json({ error: 'AI returned invalid brief format. Please retry.' });
    }

    const imagePayload = JSON.stringify({
      prompt: briefParsed.imagePrompt,
      negative_prompt: (briefParsed.negativePrompt ? briefParsed.negativePrompt + ", " : "") + "logo, logos, watermark, watermarks, signature, brand icon, anatomy normalization, body proportion averaging, dataset-average anatomy, beautification filters, skin smoothing, plastic skin, airbrushed texture, stylized realism, borders, distortion, extra limbs, weird hands, poorly drawn faces, editorial fashion proportions, more realistic reinterpretation, mirror selfies, reflections, wide-angle distortion not in reference, lens compression not in reference, cropping that removes volume, depth flattening",
      api_parameters: {
        resolution: "1K",
        output_format: "jpg",
        aspect_ratio: platform.toLowerCase().includes('stor') || platform.toLowerCase().includes('reel') ? '9:16' : platform.toLowerCase().includes('landscape') ? '16:9' : platform.toLowerCase().includes('square') ? '1:1' : '4:5'
      },
      settings: {
        resolution: "1K",
        style: "commercial photography, advertising campaign, campaign-ready, editorial composition",
        lighting: "natural directional lighting, rim lights, soft shadow falloff, high dynamic range",
        camera_angle: "85mm lens, f/2.0, ISO 200, shallow depth of field, tack sharp focus",
        depth_of_field: "shallow depth of field",
        quality: "high detail, unretouched surface texture, visible material grain, hyper-realistic"
      },
      image_quality_simulation: {
        sharpness: "tack_sharp",
        noise: "visible_film_grain",
        compression_artifacts: false,
        dynamic_range: "hdr_capable",
        white_balance: "slightly_warm",
        lens_imperfections: [
          "subtle chromatic aberration",
          "minor vignetting",
          "natural lens falloff"
        ]
      },
      structural_preservation: {
        preservation_rules: [
          "Exact product shape, fabric texture, logo, color, pattern, cuts, and labels must remain 100% identical",
          "No feature averaging or merging product features with reference images",
          "No smoothing, beautification, or redesign of the product surface"
        ]
      },
      explicit_restrictions: {
        no_professional_retouching: true,
        no_studio_lighting: false,
        no_ai_beauty_filters: true,
        no_high_end_camera_look: false
      }
    });

    let tempImageUrl: string;
    try {
      tempImageUrl = await withRetry(() => aiOrchestrator.generateImage(
        imagePayload, 
        Math.floor(Math.random() * 1000000), 
        productImagesList, 
        null,
        styleImagesList,
        null
      ), 3, 2000);
    } catch (err: any) {
      logger.error({ event: 'image_generation_failed', error: err.message }, 'Image generation failed after retries');
      return res.status(502).json({ error: `AI image generation failed: ${err.message}. Please retry.` });
    }
    
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
