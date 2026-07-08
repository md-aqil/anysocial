const fs = require('fs');
const path = '/Users/mdaqil/Documents/anysocial/src/workers/reel-worker.ts';
let code = fs.readFileSync(path, 'utf8');

const newPrompt = `      const storyPrompt = \`You are an elite short-form video scriptwriter (TikTok/Reels/Shorts). Your task is to write a highly engaging \${durationStr} script about: "\${series.niche || series.customPrompt}".\${pastReelsPrompt}\${regionStoryRule}
 
CRITICAL TONE & ADAPTABILITY RULE: 
Analyze the topic carefully and adapt your tone to perfectly match it:
- If the topic is real estate, a product, or a business (e.g. "Bank auction shop in Gurugram"), act as a world-class ad copywriter. Write a premium, high-converting cinematic ad script that creates intense FOMO and highlights the massive opportunity. DO NOT just list dry facts or prices. Wrap it in an emotional narrative.
- If the topic is a mystery, history, or storytelling, act as a suspenseful storyteller. Make it edgy, captivating, and relatable, building up to a massive twist.

KOKORO TTS OPTIMIZATION RULES (CRITICAL):\`;`;

code = code.replace(
  /const storyPrompt = `You are a TikTok\/Reels storyteller[\s\S]*?KOKORO TTS OPTIMIZATION RULES \(CRITICAL\):/m,
  newPrompt
);

const newStructure = `STORYTELLING STRUCTURE (Adapt based on topic):
1. HOOK (0-3s): Start with a massive, pattern-interrupting statement or question (e.g., "The biggest real estate secret in Gurugram..." or "This is the scariest place on Earth...").
2. THE BUILD-UP: Explain the core topic or opportunity using highly visual, engaging language. 
3. THE CLIMAX/OFFER: The most mind-blowing fact, twist, or the massive value of the opportunity.
4. ENDING: A strong lingering thought or a powerful Call to Action.`;

code = code.replace(
  /STORYTELLING STRUCTURE:[\s\S]*?4\. ENDING: End with a lingering thought or simple call to action\./m,
  newStructure
);

fs.writeFileSync(path, code);
console.log('Patched story prompt in reel-worker.ts');
