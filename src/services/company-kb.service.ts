import { prisma } from '../db/prisma.js';
import { aiOrchestrator } from './ai-orchestrator.service.js';
import { logger } from '../logger/pino.js';

export interface StrategyMetadata {
  audiencePersonas: string[];
  topicAngles: string[];
  viralHooks: string[];
  keywords: string[];
  contentPillars: string[];
  toneSuggestion: string;
}

export interface TopicResult {
  topic: string;
  hook: string;
  contentPillar: string;
  targetPersona: string;
  scriptHint: string;
}

export interface SceneScript {
  duration: string;
  visual: string;
  on_screen_text: string;
  voiceover: string;
}

export const CompanyKBService = {
  /**
   * Analyze a company knowledge base and return an AI strategy.
   * Results are stored back into the KB record.
   */
  async analyzeKnowledgeBase(kbId: string): Promise<StrategyMetadata> {
    const kb = await prisma.companyKnowledgeBase.findUniqueOrThrow({ where: { id: kbId } });

    const prompt = `You are an expert B2B content strategist and viral marketing consultant.

Analyze the following company profile and produce a comprehensive content strategy for generating high-converting social media reels that attract clients.

Company Profile:
- Company Name: ${kb.companyName}
- Industry: ${kb.industry}
- Services: ${kb.services}
- Target Audience: ${kb.targetAudience}
- Problems they solve: ${kb.painPoints}
- Unique Selling Points: ${kb.usps}
${kb.caseStudies ? `- Case Studies / Results: ${kb.caseStudies}` : ''}
- Desired Tone: ${kb.tone}
- Language: ${kb.language}

Output a JSON object with the following structure:
{
  "audiencePersonas": ["CTO of a mid-size IT startup", "Founder of a bootstrapped SaaS", ...],
  "topicAngles": ["3 signs your software vendor is burning your budget", "Why 80% of custom software projects fail (and how to avoid it)", ...],
  "viralHooks": ["Nobody tells you this about outsourcing tech...", "Your startup is losing money on software. Here's why:", ...],
  "keywords": ["IT outsourcing", "custom software development", "digital transformation", ...],
  "contentPillars": ["Problem → Solution", "Social Proof", "Educational", "Authority", "Myth Busting"],
  "toneSuggestion": "Confident, analytical, and trust-building. Speak directly to decision-makers."
}

CRITICAL: Output ONLY the JSON object. No markdown, no explanation.`;

    const raw = await aiOrchestrator.generateContent(prompt, undefined, true);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI did not return valid JSON for strategy analysis');
    const strategy: StrategyMetadata = JSON.parse(match[0]);

    // Persist strategy to DB
    await prisma.companyKnowledgeBase.update({
      where: { id: kbId },
      data: { strategy: strategy as any }
    });

    logger.info({ event: 'company_kb_strategy_analyzed', kbId });
    return strategy;
  },

  /**
   * Pick a fresh viral topic for the next company reel, avoiding past topics.
   */
  async pickViralTopic(kbId: string): Promise<TopicResult> {
    const kb = await prisma.companyKnowledgeBase.findUniqueOrThrow({ where: { id: kbId } });
    const strategy = kb.strategy as StrategyMetadata | null;

    // Fetch past topics to avoid repetition
    const pastReels = await prisma.companyReel.findMany({
      where: { kbId, topic: { not: '' } },
      select: { topic: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    const pastTopics = pastReels.map(r => r.topic).filter(Boolean);

    const strategySummary = strategy
      ? `Available topic angles: ${strategy.topicAngles.join('; ')}\nViral hooks: ${strategy.viralHooks.join('; ')}\nContent pillars: ${strategy.contentPillars.join(', ')}\nAudience personas: ${strategy.audiencePersonas.join('; ')}\nKeywords: ${strategy.keywords.join(', ')}`
      : `Company: ${kb.companyName}\nIndustry: ${kb.industry}\nServices: ${kb.services}\nTarget: ${kb.targetAudience}`;

    const pastTopicsStr = pastTopics.length > 0
      ? `\nALREADY COVERED TOPICS (DO NOT REPEAT):\n${pastTopics.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
      : '';

    const prompt = `You are a viral B2B content strategist.

Select the single best, most compelling topic for a ${kb.language}-language 30-second social media reel for this company:

Company: ${kb.companyName} (${kb.industry})
Services: ${kb.services}
Target audience: ${kb.targetAudience}

${strategySummary}
${pastTopicsStr}

Pick ONE fresh, specific topic that will genuinely hook the target audience. It must be problem-focused, highly relatable, and lead naturally to this company's services.

Output ONLY this JSON:
{
  "topic": "Short topic title (e.g. '3 warning signs your dev team is wasting your money')",
  "hook": "Opening hook sentence for the reel (e.g. 'Most founders don't realize their biggest tech mistake until it costs them everything...')",
  "contentPillar": "One of: Problem → Solution | Social Proof | Educational | Authority | Myth Busting",
  "targetPersona": "The specific audience persona this reel targets",
  "scriptHint": "Brief direction for the script writer (e.g. 'Start with pain → reveal 3 specific mistakes → position company as the expert solution')"
}`;

    const raw = await aiOrchestrator.generateContent(prompt, undefined, true);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI did not return valid JSON for topic selection');
    return JSON.parse(match[0]) as TopicResult;
  },

  /**
   * Generate a full scene-by-scene script for a company reel.
   */
  async generateCompanyScript(
    kbId: string,
    topic: TopicResult,
    language: string
  ): Promise<SceneScript[]> {
    const kb = await prisma.companyKnowledgeBase.findUniqueOrThrow({ where: { id: kbId } });
    const strategy = kb.strategy as StrategyMetadata | null;

    const langInstruction = language === 'Hindi'
      ? 'Write all voiceover and on-screen text in Roman script (Hinglish). DO NOT use Devanagari script.'
      : `Write entirely in ${language}.`;

    const prompt = `You are a world-class B2B video scriptwriter. Write a high-converting 30-45 second social media reel script.

Company: ${kb.companyName}
Industry: ${kb.industry}
Services: ${kb.services}
Tone: ${kb.tone}
USPs: ${kb.usps}
${kb.caseStudies ? `Results/Case Studies: ${kb.caseStudies}` : ''}
${strategy ? `Brand keywords: ${strategy.keywords.join(', ')}` : ''}

Topic: "${topic.topic}"
Hook: "${topic.hook}"
Content Pillar: ${topic.contentPillar}
Target Persona: ${topic.targetPersona}
Script Direction: ${topic.scriptHint}

LANGUAGE: ${langInstruction}

RULES:
1. The FIRST SCENE must be a powerful cinematic hook with a strong visual — it will be ANIMATED by an AI video model. Describe the visual as a dynamic, motion-rich scene (e.g., "A frustrated developer staring at a screen full of error messages, hands on head" NOT "a logo slide").
2. Keep the voiceover conversational and real. NO robotic sales language or buzzwords.
3. On-screen text must be short (3-5 words max), punchy, and complementary to the voiceover.
4. End with a soft, natural call to engagement (e.g., "DM us to see how we did this for our clients"). Never say "Call Now" or "Visit our website".
5. Generate exactly 4-6 scenes.

Output ONLY this JSON array:
[
  {
    "duration": "4s",
    "visual": "Detailed description of what will be shown on screen (for the AI image/video generator)",
    "on_screen_text": "Short punchy text overlay",
    "voiceover": "Exactly what the narrator says"
  }
]

CRITICAL: Output ONLY the JSON array. No markdown fences, no explanation.`;

    const raw = await aiOrchestrator.generateContent(prompt, undefined, true);
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error(`AI script generation did not return valid JSON array. Got: ${raw.substring(0, 200)}`);

    return JSON.parse(match[0]) as SceneScript[];
  }
};
