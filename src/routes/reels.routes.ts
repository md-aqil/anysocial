import { Router } from 'express';
import { z } from 'zod';
import { jwtAuth as requireAuth } from '../middleware/jwt-auth.js';
import { prisma } from '../db/prisma.js';
import { queueReelGeneration, reelGenerationQueue } from '../queues/reel-queue.js';
import { scheduleNextReel, getNextScheduledDate } from '../services/reel-scheduler.service.js';
import { aiOrchestrator } from '../services/ai-orchestrator.service.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Multer disk storage for local uploads in reels
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'frontend', 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, ''));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// POST /api/reels/upload - Upload file to public directory
router.post('/upload', requireAuth, upload.single('file'), (req: any, res: any) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.status(200).json({ success: true, url: fileUrl });
});

// Validation schema for creating a reel series
const createReelSeriesSchema = z.object({
  niche: z.string().optional().nullable(),
  customPrompt: z.string().optional().nullable(),
  language: z.string(),
  voiceId: z.string(),
  musicId: z.string().optional().nullable(),
  artStyle: z.string(),
  seriesName: z.string().min(1, 'Series name is required'),
  duration: z.string(),
  publishTime: z.string().optional(),
  scheduleDays: z.array(z.string()).optional().default([]),
  createNow: z.boolean().optional().default(false),
  socialChannels: z.array(z.string()).optional().default([]),
  timezoneOffset: z.number().optional(),
  targetRegion: z.string().optional().default("Global"),
});

/**
 * POST /api/reels
 * Create a new ReelSeries and schedule the first Reel generation.
 */
router.post('/', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.userId;
    
    // Validate request body
    const validatedData = createReelSeriesSchema.parse(req.body);

    // Create the ReelSeries in the database
    const series = await prisma.reelSeries.create({
      data: {
        userId,
        name: validatedData.seriesName,
        niche: validatedData.niche || null,
        customPrompt: validatedData.customPrompt || null,
        language: validatedData.language,
        voiceId: validatedData.voiceId,
        musicId: validatedData.musicId || null,
        artStyle: validatedData.artStyle,
        duration: validatedData.duration,
        scheduleDays: JSON.stringify(validatedData.scheduleDays),
        scheduleTime: validatedData.publishTime || null,
        timezoneOffset: validatedData.timezoneOffset !== undefined ? validatedData.timezoneOffset : null,
        socialChannels: JSON.stringify(validatedData.socialChannels),
        targetRegion: validatedData.targetRegion,
      },
    });

    // Determine next publish date/time based on publishTime (e.g., "12:00") and scheduleDays
    const now = new Date();
    let scheduledDate = now;
    
    if (!validatedData.createNow && validatedData.publishTime) {
      scheduledDate = getNextScheduledDate(
        JSON.stringify(validatedData.scheduleDays),
        validatedData.publishTime,
        validatedData.timezoneOffset
      );
    }

    // Create the initial Reel entry (Pending Generation)
    const reel = await prisma.reel.create({
      data: {
        userId,
        seriesId: series.id,
        status: 'PENDING',
        scheduledFor: scheduledDate,
        socialChannels: JSON.stringify(validatedData.socialChannels),
      },
    });

    // Enqueue BullMQ job to start generating the video asynchronously with correct delay
    const delay = Math.max(0, scheduledDate.getTime() - Date.now());
    await reelGenerationQueue.add(
      'generate-reel',
      { reelId: reel.id, seriesId: series.id },
      {
        jobId: `reel-${reel.id}`,
        delay,
      }
    );

    res.status(201).json({
      success: true,
      data: {
        series,
        reel,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('Error creating ReelSeries:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error', 
      details: error?.message || String(error),
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined 
    });
  }
});

/**
 * GET /api/reels/series
 * Get all reel series for the authenticated user.
 */
router.get('/series', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const series = await prisma.reelSeries.findMany({
      where: { userId },
      include: {
        reels: {
          orderBy: { createdAt: 'desc' },
          include: { post: true }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: series });
  } catch (error) {
    console.error('Error fetching ReelSeries:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/reels/series/:seriesId
 * Get a specific reel series.
 */
router.get('/series/:seriesId', requireAuth, async (req: any, res: any) => {
  try {
    const { seriesId } = req.params;
    const userId = req.userId;
    const series = await prisma.reelSeries.findUnique({
      where: { id: seriesId, userId },
      include: {
        reels: {
          orderBy: { createdAt: 'desc' },
          include: { post: true }
        }
      }
    });

    if (!series) {
      return res.status(404).json({ success: false, error: 'Series not found' });
    }
    res.status(200).json({ success: true, data: series });
  } catch (error) {
    console.error('Error fetching ReelSeries:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PUT /api/reels/series/:seriesId
 * Update a specific reel series.
 */
router.put('/series/:seriesId', requireAuth, async (req: any, res: any) => {
  try {
    const { seriesId } = req.params;
    const userId = req.userId;
    const { name, isActive, voiceId, artStyle, socialChannels, scheduleDays, scheduleTime, timezoneOffset } = req.body;
    
    const series = await prisma.reelSeries.findUnique({
      where: { id: seriesId, userId },
    });

    if (!series) {
      return res.status(404).json({ success: false, error: 'Series not found' });
    }

    const updatedSeries = await prisma.reelSeries.update({
      where: { id: seriesId },
      data: { 
        name: name !== undefined ? name : series.name,
        isActive: isActive !== undefined ? isActive : series.isActive,
        voiceId: voiceId !== undefined ? voiceId : series.voiceId,
        artStyle: artStyle !== undefined ? artStyle : series.artStyle,
        socialChannels: socialChannels !== undefined ? (typeof socialChannels === 'string' ? socialChannels : JSON.stringify(socialChannels)) : series.socialChannels,
        scheduleDays: scheduleDays !== undefined ? (typeof scheduleDays === 'string' ? scheduleDays : JSON.stringify(scheduleDays)) : series.scheduleDays,
        scheduleTime: scheduleTime !== undefined ? scheduleTime : series.scheduleTime,
        timezoneOffset: timezoneOffset !== undefined ? timezoneOffset : series.timezoneOffset
      }
    });

    res.status(200).json({ success: true, data: updatedSeries });
  } catch (error) {
    console.error('Error updating ReelSeries:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/reels/series/:seriesId/generate
 * Manually trigger the generation of a new reel for an existing series.
 */
router.post('/series/:seriesId/generate', requireAuth, async (req: any, res: any) => {
  try {
    const { seriesId } = req.params;
    const userId = req.userId;

    const series = await prisma.reelSeries.findUnique({
      where: { id: seriesId, userId },
    });

    if (!series) {
      return res.status(404).json({ success: false, error: 'Series not found' });
    }

    // Create the new Reel entry, inheriting socialChannels from the series
    const reel = await prisma.reel.create({
      data: {
        userId,
        seriesId: series.id,
        status: 'PENDING',
        socialChannels: series.socialChannels, // Inherit social channels from the parent series
      },
    });

    // Enqueue BullMQ job
    await queueReelGeneration(reel.id, series.id);

    res.status(201).json({
      success: true,
      data: reel,
    });
  } catch (error) {
    console.error('Error manually generating reel:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PATCH /api/reels/series/:seriesId/toggle-active
 * Toggles the isActive status of the series (Stop/Start auto-posting)
 */
router.patch('/series/:seriesId/toggle-active', requireAuth, async (req: any, res: any) => {
  try {
    const { seriesId } = req.params;
    const userId = req.userId;

    const series = await prisma.reelSeries.findUnique({
      where: { id: seriesId, userId },
    });

    if (!series) {
      return res.status(404).json({ success: false, error: 'Series not found' });
    }

    const updatedSeries = await prisma.reelSeries.update({
      where: { id: seriesId },
      data: { isActive: !series.isActive },
    });

    if (updatedSeries.isActive) {
      // Automatically trigger scheduling the next reel since series is active now
      await scheduleNextReel(seriesId);
    }

    res.status(200).json({ success: true, data: updatedSeries });
  } catch (error) {
    console.error('Error toggling series active state:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * DELETE /api/reels/series/:seriesId
 * Deletes a series and all its associated reels
 */
router.delete('/series/:seriesId', requireAuth, async (req: any, res: any) => {
  try {
    const { seriesId } = req.params;
    const userId = req.userId;

    const series = await prisma.reelSeries.findUnique({
      where: { id: seriesId, userId },
    });

    if (!series) {
      return res.status(404).json({ success: false, error: 'Series not found' });
    }

    // Delete associated reels first
    await prisma.reel.deleteMany({
      where: { seriesId },
    });

    await prisma.reelSeries.delete({
      where: { id: seriesId },
    });

    res.status(200).json({ success: true, message: 'Series deleted successfully' });
  } catch (error) {
    console.error('Error deleting series:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/reels/write-script
 * Generate highly compelling script and hook using AI for pre-editing.
 */
router.post("/write-script", requireAuth, async (req: any, res: any) => {
  try {
    const { prompt, whatMakesItHit, vibe, duration, language } = req.body;
    const targetWordCount = Math.round((duration || 15) * 2.3);

    let languagePrompt = `Write the script ONLY in ${language || 'English'}.`;
    if (language === 'Hindi') {
      languagePrompt = `Language: Hindi. CRITICAL: You MUST write the entire script exclusively in the Devanagari script (हिंदी लिपि) so the TTS engine pronounces it perfectly. However, the TONE and VOCABULARY should NOT be formal or pure bookish Hindi. Use a natural, everyday mix of Desi Hindi, Urdu words, and common English words (transliterated into Devanagari, e.g., 'टाइम', 'फीलिंग', 'सस्पेंस'), exactly like a modern Indian TikToker or YouTuber speaks. Make it sound highly conversational, natural, and relatable.`;
    }

    const copywritingPrompt = `You are a world-class viral ad copywriter and video director for short-form TikTok, Reels, and YouTube Shorts. 
We are creating a high-retention video ad. 

Product/Offer Details: "${prompt || 'Check out our amazing new product!'}"
Key Selling Points (what makes it hit): "${whatMakesItHit || 'Premium quality, sleek design, and satisfying user experience.'}"
Vibe / Tone of ad: "${vibe || 'High-energy, direct, and captivating'}"

CRITICAL INSTRUCTION FOR SCRIPT QUALITY:
You MUST avoid writing a boring, robotic list of features (e.g., "Clear Title. Ready to Build. High Rental Yield. Wide Road. Auction Date: [Date]."). 
Instead, weave the facts into a highly engaging, emotional, and cinematic narrative. Create intense FOMO, use storytelling, and make it sound like a premium, top-tier influencer speaking directly to the viewer.

CRITICAL FORMATTING RULES:
You MUST structure your response EXACTLY like a video script with scenes, durations, visual descriptions, on-screen text, and voiceover. 
${languagePrompt} The total voiceover should take about ${duration || 15} seconds to speak at a fast pace.

Use this EXACT format for EVERY scene:

Scene [Number]
Duration: [X]s

📹 [Visual description of the shot]
📝 [On-screen text, if any]
🎙️ [Voiceover text to be spoken in the specified language]

Your task:
1. Write the highly compelling, cinematic viral ad script using the strict Scene format above. Spell out all numbers as words in the voiceover so TTS reads them correctly. Do NOT use any emojis or hashtags in the voiceover (🎙️).
2. Write a highly catchy, bold 3-5 word HOOK text to overlay on the screen during the first scene (e.g. "Secret Revealed...", "Must-Have Tech!"). CRITICAL: The HOOK text MUST ALWAYS BE IN ENGLISH, regardless of the script language.

Output your response strictly as a valid JSON object matching the provided schema.`;

    const responseSchema = {
      type: "OBJECT",
      properties: {
        script: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              duration: { type: "STRING" },
              visual: { type: "STRING" },
              on_screen_text: { type: "STRING" },
              voiceover: { type: "STRING" }
            },
            required: ["duration", "visual", "on_screen_text", "voiceover"]
          }
        },
        hook: { type: "STRING" }
      },
      required: ["script", "hook"]
    };

    const resultText = await aiOrchestrator.generateContent(copywritingPrompt, undefined, true, responseSchema);
    const rawContent = resultText.match(/\{[\s\S]*\}/) ? resultText.match(/\{[\s\S]*\}/)![0] : resultText.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(rawContent);

    let finalScriptStr = '';
    if (Array.isArray(parsed.script)) {
      finalScriptStr = parsed.script.map((scene: any, i: number) => {
        let s = `Scene ${i + 1}\n`;
        s += `Duration: ${scene.duration || '3s'}\n\n`;
        s += `📹 ${scene.visual || ''}\n`;
        s += `📝 ${scene.on_screen_text || ''}\n`;
        s += `🎙️ ${scene.voiceover || ''}`;
        return s;
      }).join('\n\n');
    } else if (typeof parsed.script === 'object' && parsed.script !== null) {
      finalScriptStr = JSON.stringify(parsed.script, null, 2);
    }

    res.status(200).json({
      success: true,
      script: finalScriptStr || parsed.script,
      hook: parsed.hook,
    });
  } catch (error: any) {
    console.error("Error writing script:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error?.message || String(error),
    });
  }
});

// Validation schema for creating a product reel
const generateProductReelSchema = z.object({
  prompt: z.string().optional(),
  assets: z.array(z.object({
    url: z.string(),
    type: z.string(), // IMAGE or VIDEO
  })),
  enableMusic: z.boolean().optional().default(true),
  enableVoice: z.boolean().optional().default(true),
  scriptText: z.string().optional().nullable(),
  hookText: z.string().optional().nullable(),
  language: z.string().optional().default('English'),
  voiceId: z.string().optional().default('Aoede'),
});

/**
 * POST /api/reels/generate-product-reel
 * Create a new one-time product reel.
 */
router.post("/generate-product-reel", requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const validatedData = generateProductReelSchema.parse(req.body);

    const reel = await prisma.reel.create({
      data: {
        userId,
        type: "PRODUCT",
        status: "PENDING",
        script: validatedData.scriptText || validatedData.prompt || null,
        assets: {
          create: validatedData.assets.map((asset) => ({
            url: asset.url,
            type: asset.type,
          })),
        },
      },
    });

    // Pass detailed customization flags to the worker queue
    await reelGenerationQueue.add("generate-reel", { 
      reelId: reel.id,
      enableMusic: validatedData.enableMusic,
      enableVoice: validatedData.enableVoice,
      scriptText: validatedData.scriptText,
      hookText: validatedData.hookText,
      language: validatedData.language,
      voiceId: validatedData.voiceId,
    });

    res.status(201).json({
      success: true,
      data: {
        reel,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error("Error creating Product Reel:", error);
    res.status(500).json({ 
      success: false, 
      error: "Internal server error", 
      details: error?.message || String(error),
    });
  }
});

// GET /api/reels/product - fetch product reels for the user
router.get('/product', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const productReels = await prisma.reel.findMany({
      where: { userId, type: 'PRODUCT' },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, data: productReels });
  } catch (error) {
    console.error('Error fetching product reels:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

const recomposeReelSchema = z.object({
  script: z.string(),
  voiceModel: z.string(),
  regenerateShots: z.array(z.number()),
  seriesId: z.string(),
});

router.post("/:id/recompose", requireAuth, async (req: any, res: any) => {
  try {
    const reelId = req.params.id;
    const validatedData = recomposeReelSchema.parse(req.body);

    const reel = await prisma.reel.findUnique({
      where: { id: reelId, userId: req.userId },
    });

    if (!reel) {
      return res.status(404).json({ success: false, error: "Reel not found" });
    }

    await prisma.reel.update({
      where: { id: reelId },
      data: { status: "PROCESSING", script: validatedData.script },
    });

    await reelGenerationQueue.add("generate-reel", { 
      reelId: reel.id,
      seriesId: validatedData.seriesId,
      isRecompose: true,
      scriptText: validatedData.script,
      voiceId: validatedData.voiceModel,
      regenerateShots: validatedData.regenerateShots,
    });

    res.status(200).json({ success: true, message: "Recomposition queued" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error("Error recomposing Reel:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export const reelsRoutes = router;
