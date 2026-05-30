import fs from 'fs';
const file = 'frontend/src/app/dashboard/reels-creator/ai-product-reel/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add VOICES_BY_LANGUAGE at the top level
const voicesByLanguageDef = `
const VOICES_BY_LANGUAGE: Record<string, { id: string, name: string, type: string, description: string }[]> = {
  'English': [
    { id: 'Puck',   name: 'Puck — Gemini 3.1 TTS',   type: 'Male',   description: 'Energetic, punchy and upbeat. Perfect for viral hooks.' },
    { id: 'Charon', name: 'Charon — Gemini 3.1 TTS', type: 'Male',   description: 'Deep, resonant and authoritative. Cinematic narrator.' },
    { id: 'Fenrir', name: 'Fenrir — Gemini 3.1 TTS', type: 'Male',   description: 'Gruff and dramatic. Great for intense storytelling.' },
    { id: 'Aoede',  name: 'Aoede — Gemini 3.1 TTS',  type: 'Female', description: 'Expressive and engaging. Warm storyteller voice.' },
    { id: 'Kore',   name: 'Kore — Gemini 3.1 TTS',   type: 'Female', description: 'Calm and soothing. Perfect for mystery & suspense.' },
    { id: 'Leda',   name: 'Leda — Gemini 3.1 TTS',   type: 'Female', description: 'Clear and confident. Great for educational reels.' },
  ],
  'Hindi': [
    { id: 'Puck',   name: 'Puck — Gemini 3.1 TTS (Hindi)',   type: 'Male',   description: 'Energetic and upbeat Hindi voice.' },
    { id: 'Charon', name: 'Charon — Gemini 3.1 TTS (Hindi)', type: 'Male',   description: 'Deep and authoritative Hindi voice.' },
    { id: 'Aoede',  name: 'Aoede — Gemini 3.1 TTS (Hindi)',  type: 'Female', description: 'Expressive and engaging Hindi narrator.' },
    { id: 'Kore',   name: 'Kore — Gemini 3.1 TTS (Hindi)',   type: 'Female', description: 'Calm soothing Hindi storyteller.' },
  ],
  'Spanish': [
    { id: 'Puck',   name: 'Puck — Gemini 3.1 TTS (Spanish)',   type: 'Male',   description: 'Energetic Spanish voice.' },
    { id: 'Charon', name: 'Charon — Gemini 3.1 TTS (Spanish)', type: 'Male',   description: 'Deep Spanish narrator.' },
    { id: 'Aoede',  name: 'Aoede — Gemini 3.1 TTS (Spanish)',  type: 'Female', description: 'Expressive Spanish female voice.' },
    { id: 'Kore',   name: 'Kore — Gemini 3.1 TTS (Spanish)',   type: 'Female', description: 'Calm Spanish storyteller.' },
  ]
};

const DEFAULT_VOICE_FALLBACK = [
  { id: 'default-voice', name: 'Auto-detect Voice', type: 'Auto', description: 'The system will automatically pick the best premium voice.' }
];
`;

content = content.replace("export default function AIProductReelPage() {", voicesByLanguageDef + "\nexport default function AIProductReelPage() {");

// 2. Add states
const stateCode = `  const [language, setLanguage] = useState('English');
  const [voiceId, setVoiceId] = useState('Puck');`;
content = content.replace("const [hookText, setHookText] = useState('');", "const [hookText, setHookText] = useState('');\n" + stateCode);

// 3. Add to handleGenerate payload
content = content.replace("hookText\n        }),", "hookText,\n          language,\n          voiceId\n        }),");

// 4. Add UI to the Audio section
const audioSectionRegex = /<h2 className="text-lg font-bold text-stone-900">Audio Composition<\/h2>\s*<div className="space-y-4">/;
const uiReplacement = `<h2 className="text-lg font-bold text-stone-900">Audio Composition</h2>

            <div className="space-y-4">
              {/* Language & Voice Selector */}
              <div className="space-y-3 bg-stone-50/50 p-4 rounded-2xl border border-stone-100">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Language</label>
                  <select 
                    className="w-full h-10 px-3 border border-stone-200 rounded-xl outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm font-medium bg-white"
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      const voices = VOICES_BY_LANGUAGE[e.target.value] || DEFAULT_VOICE_FALLBACK;
                      setVoiceId(voices[0].id);
                    }}
                  >
                    <option value="English">🇬🇧 English</option>
                    <option value="Spanish">🇪🇸 Spanish</option>
                    <option value="French">🇫🇷 French</option>
                    <option value="German">🇩🇪 German</option>
                    <option value="Italian">🇮🇹 Italian</option>
                    <option value="Portuguese">🇵🇹 Portuguese</option>
                    <option value="Japanese">🇯🇵 Japanese</option>
                    <option value="Korean">🇰🇷 Korean</option>
                    <option value="Chinese">🇨🇳 Chinese</option>
                    <option value="Arabic">🇸🇦 Arabic</option>
                    <option value="Hindi">🇮🇳 Hindi</option>
                  </select>
                </div>
                
                {enableVoice && (
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Voice Style</label>
                    <select 
                      className="w-full h-10 px-3 border border-stone-200 rounded-xl outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm font-medium bg-white"
                      value={voiceId}
                      onChange={(e) => setVoiceId(e.target.value)}
                    >
                      {(VOICES_BY_LANGUAGE[language] || DEFAULT_VOICE_FALLBACK).map(voice => (
                        <option key={voice.id} value={voice.id}>
                          {voice.name} - {voice.description}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
`;

content = content.replace(audioSectionRegex, uiReplacement);

// 5. Enhance UI Layout by changing bg-white and border styles slightly
content = content.replace(/bg-white rounded-3xl shadow-sm border border-stone-200/g, "bg-white/80 backdrop-blur-md rounded-3xl shadow-md border border-stone-200/60");

fs.writeFileSync(file, content);
console.log("Patched successfully");
