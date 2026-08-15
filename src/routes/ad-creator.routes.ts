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
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
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

    // Carousel slide count: exactly 4 slides (one core carousel arc), with product angle
    // assignment below ensuring every uploaded product photo is featured somewhere
    // across the 4 slides. If fewer than 4 photos are uploaded, angles are reused/
    const slideCount = 4;

    const prompt = `You are an elite advertising art director and commercial photographer using the Nano Banana 2 hyper-realistic imaging protocol combined with world-class Instagram Carousel campaign strategy.

Your task: design ONE COHESIVE Instagram Carousel campaign of exactly ${slideCount} slides. The slides are CHAPTERS OF A SINGLE STORY. They must feel like frames of the SAME photoshoot — same product, same set/environment, same lighting, same color grade, same typography, same model/pose world. ONLY the camera framing (shot type) and the featured PRODUCT ANGLE change from slide to slide.

STEP 1 — ANALYZE EVERY PRODUCT IMAGE INDIVIDUALLY:
There are ${prodFiles.length} Product Image(s). Analyze EACH uploaded photo and identify the exact view it shows — e.g. FRONT view, BACK view, SIDE view, DETAIL/close-up (logo, stitching, texture, sole, clasp). Number them "Product Image #1, Product Image #2, ...". You will assign each uploaded photo's best angle to the most relevant slide so every uploaded angle is used and none is ignored.

STEP 2 — LOCK THE CAROUSEL DESIGN SYSTEM (identical on every slide so the set feels continuous):
- environment: One consistent background/set/environment reused on every slide (describe it concretely).
- lighting: One exact lighting plan repeated on every slide (direction, quality, shadows, color temperature).
- colorPalette: The exact color palette (with hex codes) that appears on every slide.
- typography: The exact headline + subheadline font styles, text color, text placement used on every slide.
- compositionGrid: Where the product and any text always sit within the frame.
- mood: The emotional tone kept constant across all slides.

HARD CONSTRAINTS (apply to EVERY slide):
1. PRODUCT IDENTITY LOCK: The product must stay 100% identical across all ${slideCount} slides - exact shape, fabric, cuts, color, pattern, logo, labels, texture. STRICTLY PROHIBITED: feature averaging, merging, smoothing, or altering the product design.
2. PRODUCT ANGLE ASSIGNMENT: For every slide, specify which uploaded Product Image (#1..#${prodFiles.length}) is the anchor and the exact angle shown (productImageIndex + featuredAngle). A slide that features the BACK view must show exactly that back surface — never invent an angle you were not provided.
3. CAROUSEL VISUAL CONTINUITY: Every slide description must reuse the LOCKED design system VERBATIM (same environment, lighting, palette, typography, mood). Only the shot framing + product angle change. Slide N must read as the immediate next frame of Slide N-1.
4. REFERENCE IMAGE PINNING: ${refFiles.length > 0 ? `The ${refFiles.length} Pose & Style Reference Image(s) are ENVIRONMENT/POSE TEMPLATES for the WHOLE carousel. Describe how EVERY slide replicates the same camera angle, model pose, lighting plan, background and aesthetic from the reference. CRITICAL: If a reference contains text/typography, replicate its EXACT font style, weight, tracking, color, placement and size on EVERY slide; never overlap new text over pre-existing reference text. The ONLY changing element between slides is the product presentation.` : 'No reference images provided - build one consistent high-end commercial environment and reuse it across every slide.'}
5. NANO-BANANA QUALITY: every slide must be achievable with hyper-realistic imaging: camera math (85mm, f/2.0, ISO 200), natural directional lighting, shallow depth of field, visible material texture, unretouched surface details.

STEP 3 — WRITE THE 4-SLIDE STORYBOARD using the classic Instagram carousel arc:
- Slide 1 COVER / HOOK: a bold visual + punchy title line that stops the scroll and establishes the design system.
- Slide 2 PROBLEM: the situation / pain point the target audience feels (emotional, relatable).
- Slide 3 REVEAL: the product hero shot — anchor on Product Image #1 (usually the front / hero view).
- Then BENEFIT / HOW IT WORKS and LIFESTYLE-in-use slides — always inside the locked environment.
- Final slide CALL TO ACTION / OFFER: a strong CTA + urgency on the same end-card design.
Fill exactly 4 slides total (never fewer, never more).

For every slide, provide a JSON object with these field names:
- id: slide number (1..${slideCount})
- title: "Slide K — Short Name" (e.g. "Slide 1 — Hook")
- description: 2-3 sentences describing the scene, the shot framing, the camera angle, how the locked design system repeats, and the slide's job in the storyline
- caption: a short on-slide / carousel caption line for this slide (max 100 chars)
- role: one of "cover | hook | problem | reveal | detail | benefit | lifestyle | guarantee | cta"
- shotType: e.g. "hero wide establishing", "three-quarter", "medium", "close-up", "macro detail", "flat lay", "over-shoulder"
- productImageIndex: the number of the uploaded Product Image to anchor this slide on (or null when no product is shown)
- featuredAngle: one sentence describing the exact product view to show (e.g. "Front view of the garment from Product Image #1 - full placket and collar visible")

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
  "designSystem": {
    "environment": "...",
    "lighting": "...",
    "colorPalette": "...",
    "typography": "...",
    "compositionGrid": "...",
    "mood": "..."
  },
  "directions": [
    {
      "id": 1,
      "title": "Slide 1 — Hook",
      "description": "2-3 sentences describing the scene, the design system repetition, and the slide's role",
      "caption": "short on-slide caption",
      "role": "cover",
      "shotType": "wide establishing",
      "productImageIndex": 1,
      "featuredAngle": "exact product view to show"
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

// ── Carousel Continuity Context (optional) ─────────────────────────────────
    // The frontend sends the full storyboard + locked design system so every slide
    // is generated as a chapter of ONE Instagram carousel campaign (not a random ad).
    let carouselContext: any = null;
    if (req.body.carouselContext) {
      try {
        carouselContext = JSON.parse(req.body.carouselContext);
      } catch (e) {
        carouselContext = null;
      }
    }
    const carouselSlides: any[] = Array.isArray(carouselContext?.slides) ? carouselContext.slides : [];
    const designSystem = carouselContext?.designSystem || null;
    const totalSlides = carouselSlides.length;
    const slideIdx = Number(direction?.slideIndex ?? direction?.id ?? 0) || 0;
    const prevSlideObj = slideIdx > 1 ? carouselSlides[slideIdx - 2] : null;
    const nextSlideObj = slideIdx < totalSlides ? carouselSlides[slideIdx] : null;
    const isCarousel = totalSlides > 0;

    const carouselContinuityBlock = isCarousel
      ? `CAROUSEL CONTINUITY ENGINE (HARD - this is Slide ${slideIdx || '?'} of ${totalSlides} of a SINGLE Instagram carousel campaign for the same product):
- Slide title: "${direction?.title || ''}" | Role: ${direction?.role || 'slide'}
- Story context - Previous slide: "${prevSlideObj?.title || 'COVER (this is the first slide)'}"; Next slide: "${nextSlideObj?.title || 'END CARD'}"
- The LOCKED design system below appears on EVERY slide and must be replicated EXACTLY in this visual (same environment, same lighting, same color palette, same typography, same composition):
${JSON.stringify(designSystem, null, 2)}
- Only the shot framing and the featured product angle change from the other slides. Never invent a new background, new palette, or new lighting plan.
`
      : '';

    const carouselAngleBlock = isCarousel
      ? `- PRODUCT VIEW ASSIGNMENT FOR THIS SLIDE: The uploaded product photos are DIFFERENT VIEWS of the SAME product. Anchor the hero on Product Image #${direction?.productImageIndex ?? 1} and show exactly: "${direction?.featuredAngle || direction?.description || ''}". Keep the product 100% identical; feature this exact angle/surface.`
      : '';
    const briefPrompt = `You are an elite advertising creative assistant and art director using the Nano Banana 2 hyper-realistic imaging protocol combined with world-class campaign strategy. Create a full creative brief for "${productName}" targeting the "${direction.title}" ${isCarousel ? `creative for Slide ${slideIdx} of ${totalSlides} of a single Instagram carousel campaign` : 'direction'} for ${platform}.

We are providing:
${productImagesList.length > 0 ? `- ${productImagesList.length} Product Image(s): These are the HERO IDENTITY ANCHORS. The product/garment/object in the generated visual must remain 100% identical to these images in shape, fabric, cuts, color, pattern, logo, labels, and texture. STRICTLY PROHIBITED: any feature averaging, merging, smoothing, or altering of the product design. The product must look like the exact same physical object placed into the new scene.` : ''}
${styleImagesList.length > 0 ? `- ${styleImagesList.length} Pose & Style Reference Image(s): These are ENVIRONMENT/POSE TEMPLATES. The generated image MUST replicate the exact camera angle, optical perspective, camera elevation, shot framing, model pose, stance, body posture, lighting setup, 3D environment, background scene, typography layout, color grading, and aesthetic style from these reference images. CRITICAL: If the reference image contains text, typography, or copy, replicate the EXACT font style, font weight, letter spacing, text color, text placement, text size, and text alignment. Do NOT overlap or place new text over existing reference text. The ONLY element that changes is the product itself - everything else (model, setting, light, mood, typography) must match the reference with photographic precision.` : ''}
${specialInstructions ? `- USER SPECIAL POSE/STYLE INSTRUCTION: "${specialInstructions}". This is a hard constraint. Explicitly obey this instruction regarding what to look for or adapt from the reference images.` : ''}

${carouselContinuityBlock}
${carouselAngleBlock}
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

6. USER DIRECTIVE: ${specialInstructions ? `Enforce strictly: \"${specialInstructions}\"` : 'N/A'}
${isCarousel ? '7. CAROUSEL CONTINUITY: The imagePrompt must RESTATE at the top, verbatim: "Same environment/set, same lighting, same color palette, same typography, same composition as the other slides of this Instagram carousel. Only the shot framing and the featured product angle change. Never invent a new background, lighting plan, or palette."' : ''}`;


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

    // Persist carousel identity in the brief so the frontend can keep slide ordering
    // after a page refresh (the brief column is JSON — no schema migration needed).
    if (isCarousel) {
      briefParsed.carousel = {
        slideIndex: slideIdx || 1,
        slideTitle: direction?.title || '',
        role: direction?.role || '',
        slideCount: totalSlides,
        productImageIndex: direction?.productImageIndex ?? null,
        featuredAngle: direction?.featuredAngle || '',
        caption: direction?.caption || '',
        designSystem: designSystem || null,
        prevSlideTitle: prevSlideObj?.title || null,
        nextSlideTitle: nextSlideObj?.title || null
      };
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
