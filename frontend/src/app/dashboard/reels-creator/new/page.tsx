'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Check, ChevronRight, ArrowLeft, Play, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  InstagramLogo, FacebookLogo, LinkedinLogo, TwitterLogo,
  TiktokLogo, YoutubeLogo, ThreadsLogo, PinterestLogo, SnapchatLogo
} from '@/components/icons/social-icons';
import { Switch } from '@/components/ui/switch';
import type { ComponentType, SVGProps } from 'react';

const platformStyles: Record<string, {
  name: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  color: string;
  bg: string;
}> = {
  FACEBOOK: { name: 'Facebook', icon: FacebookLogo, color: '#1877F2', bg: '#EBF4FF' },
  INSTAGRAM: { name: 'Instagram', icon: InstagramLogo, color: '#E4405F', bg: '#FFF0F3' },
  LINKEDIN: { name: 'LinkedIn', icon: LinkedinLogo, color: '#0A66C2', bg: '#EBF4FF' },
  TWITTER: { name: 'X / Twitter', icon: TwitterLogo, color: '#111111', bg: '#F3F4F6' },
  TIKTOK: { name: 'TikTok', icon: TiktokLogo, color: '#111111', bg: '#F3F4F6' },
  YOUTUBE: { name: 'YouTube', icon: YoutubeLogo, color: '#FF0000', bg: '#FFF1F1' },
  THREADS: { name: 'Threads', icon: ThreadsLogo, color: '#111111', bg: '#F3F4F6' },
  PINTEREST: { name: 'Pinterest', icon: PinterestLogo, color: '#E60023', bg: '#FFF1F1' },
  SNAPCHAT: { name: 'Snapchat', icon: SnapchatLogo, color: '#B89400', bg: '#FFF8D9' },
};

type WizardStep = 'niche' | 'dynamics' | 'voice' | 'music' | 'style' | 'details';

const PRESETS = [
  { id: 'matrix', title: 'Glitch in the Matrix', description: 'Bizarre real-world anomalies, Mandela effects, and simulation theories.' },
  { id: 'psychology', title: 'Dark Psychology', description: 'Manipulation tactics, reading people, and shocking cognitive biases.' },
  { id: 'history', title: 'Forbidden History', description: 'Bizarre, brutal, and shocking historical events that schools refuse to teach.' },
  { id: 'urban', title: 'Terrifying Urban Legends', description: 'Chilling local myths, cryptid sightings, and deep-woods lore.' },
  { id: 'space', title: 'Cosmic Terrors', description: 'Existential space dread, mind-bending anomalies, and the Fermi Paradox.' },
  { id: 'internet', title: 'Unsolved Internet Lore', description: 'Deep web mysteries, bizarre rabbit holes, and unsettling digital footprints.' },
  { id: 'wealth', title: 'The 1% Secrets', description: 'High-status life advice, wealth psychology, and unspoken power dynamics.' },
  { id: 'stoic', title: 'Brutal Stoicism', description: 'High-energy discipline, extreme philosophy, and building an unbreakable mind.' },
  { id: 'truecrime', title: 'Unsolved True Crime', description: 'Chilling cold cases, mysterious disappearances, and baffling crime scenes.' },
  { id: 'mythology', title: 'Ancient Mythology', description: 'Epic tales of gods, monsters, and forgotten civilizations.' },
  { id: 'tech', title: 'Creepy Tech & AI', description: 'Rogue AI, dystopian futures, and unsettling technological advancements.' },
  { id: 'survival', title: 'Extreme Survival', description: 'Incredible stories of human endurance against impossible odds.' },
  {
    id: 'fashion-edu',
    title: 'Indian Fashion Education',
    description: 'Beginner-friendly guide to personal style for Indian women, focusing on practical rules.',
    customNiche: "A beginner-friendly guide to personal style and self-confidence specifically for **Indian women**. The content should focus on practical fashion rules applied ONLY to Indian ethnic and fusion wear (like kurtis, lehngas, sararas, and palazzos). NO JEANS OR WESTERN WEAR. Key concepts include the **Sandwich Rule**, the **Three-Color Rule**, and the **Third Piece Rule**. **CRITICAL INSTRUCTION:** Always use **Indian-based images and models** that reflect the diversity of Indian skin tones and body shapes. The tone should be that of an encouraging 'Didi' (older sister), emphasizing that fashion is about self-expression and confidence, not just expensive clothes. Image generator must be highly consistent and strictly follow scene descriptions without hallucinating elements.",
    customPrompt: "CRITICAL SYSTEM INSTRUCTION: Ensure absolute visual consistency across all generated images. Images MUST EXACTLY match the described visual scene. DO NOT include any jeans, trousers, or western clothing. ONLY use Indian ethnic women's fashion.\n\nVisual Hook (0:00-0:03):\n*   Visual: An Indian woman looking at a closet with a mix of beautiful kurtis and traditional palazzos, looking confused.\n*   Text Overlay: \"Nothing to wear? Let’s fix that, Sis! ✨\"\n*   Audio: \"You don't need a new wardrobe to look stylish. You just need these three rules.\"\n\nPoint 1: The Sandwich Rule (Desi Version) (0:03-0:10):\n*   Visual: Transition from a mismatched outfit to a pink kurti, white palazzos, and pink jootis.\n*   Audio: \"First, the Sandwich Rule. Match your top and your footwear color, like this pink kurti and pink jooti. It creates a balanced, put-together look instantly.\"\n*   Text Overlay: Rule #1: The Sandwich Rule 🥪\n\nPoint 2: The Third Piece Rule (0:10-0:18):\n*   Visual: Showing a simple white kurti and leggings, then adding a beautifully printed dupatta or an embroidered ethnic jacket.\n*   Audio: \"Next, the Third Piece Rule. A basic top and bottom is just 'clothes.' Add a jacket, a belt, or a dupatta to turn it into an 'outfit'.\"\n*   Text Overlay: Rule #2: Add a 'Third Piece' 🧣\n\nPoint 3: The Shopping \"Rule of Three\" (0:18-0:25):\n*   Visual: A woman in a bustling Indian local market holding a trendy ethnic top but looking thoughtful.\n*   Audio: \"Stop 'revenge shopping' just because there's a sale! Before buying, ask: 'Can I style this in three different ways?' If the answer is yes, it’s a smart investment.\"\n*   Text Overlay: Rule #3: The Rule of Three 🛍️\n\nThe Confidence Closer (0:25-0:30):\n*   Visual: Close-up of a woman smiling confidently, standing with straight posture and making eye contact, wearing a stylish Anarkali.\n*   Audio: \"The best thing you can wear is your confidence. Stand tall, own your vibe, and remember—you look your best when you feel your best!\"\n*   Text Overlay: \"I AM CONFIDENT\" 💖\n\nSpecific Instructions for the AI Agent's Visuals:\n*   Imagery: Use images of women in Indian settings (e.g., college campuses, local markets, or family functions). Must be HIGHLY ACCURATE to the photo described in scene. Duration: 1 minute.\n*   Clothing Constraints: NO JEANS, NO WESTERN WEAR. Only Indian ethnic and fusion wear (kurtis, lehngas, sararas).\n*   Footwear Focus: Ensure the AI shows jootis, mojaris, or ethnic flats ONLY.\n*   Accessory Focus: Use visuals of minimalist jewelry like simple golden/silver chains, jhumkas, and bangles.\n*   Wardrobe Staples: Feature elegant kurtis, matching leggings, and vibrant dupattas as the \"must-have\" basics for the Indian wardrobe."
  },
];

const GEMINI_VOICES_BY_LANGUAGE: Record<string, { id: string, name: string, type: string, description: string }[]> = {
  'English': [
    { id: 'Puck', name: 'Puck — Gemini TTS', type: 'Male', description: 'Energetic, punchy and upbeat. Perfect for viral hooks.' },
    { id: 'Charon', name: 'Charon — Gemini TTS', type: 'Male', description: 'Deep, resonant and authoritative. Cinematic narrator.' },
    { id: 'Fenrir', name: 'Fenrir — Gemini TTS', type: 'Male', description: 'Gruff and dramatic. Great for intense storytelling.' },
    { id: 'Aoede', name: 'Aoede — Gemini TTS', type: 'Female', description: 'Expressive and engaging. Warm storyteller voice.' },
    { id: 'Kore', name: 'Kore — Gemini TTS', type: 'Female', description: 'Calm and soothing. Perfect for mystery & suspense.' },
    { id: 'Leda', name: 'Leda — Gemini TTS', type: 'Female', description: 'Clear and confident. Great for educational reels.' },
  ],
  'Hindi': [
    { id: 'Ojas', name: 'Ojas — Gemini TTS', type: 'Male', description: 'Energetic and upbeat Hindi voice.' },
    { id: 'Aarav', name: 'Aarav — Gemini TTS', type: 'Male', description: 'Deep and authoritative Hindi voice.' },
    { id: 'Ananya', name: 'Ananya — Gemini TTS', type: 'Female', description: 'Expressive and engaging Hindi narrator.' },
    { id: 'Kavya', name: 'Kavya — Gemini TTS', type: 'Female', description: 'Calm soothing Hindi storyteller.' },
  ],
  'Spanish': [
    { id: 'Tomas', name: 'Tomas — Gemini TTS', type: 'Male', description: 'Energetic Spanish voice.' },
    { id: 'Isidora', name: 'Isidora — Gemini TTS', type: 'Female', description: 'Expressive Spanish female voice.' },
    { id: 'Elena', name: 'Elena — Gemini TTS', type: 'Female', description: 'Calm Spanish storyteller.' },
  ]
};

const GOOGLE_CLOUD_VOICES_BY_LANGUAGE: Record<string, { id: string, name: string, type: string, description: string }[]> = {
  'English': [
    { id: 'en-US-Journey-D', name: 'Journey D — Google Cloud TTS', type: 'Male', description: 'Expressive and natural male voice. Perfect for conversational storytelling.' },
    { id: 'en-US-Journey-F', name: 'Journey F — Google Cloud TTS', type: 'Female', description: 'Expressive and confident female voice.' },
    { id: 'en-US-Journey-O', name: 'Journey O — Google Cloud TTS', type: 'Female', description: 'Warm and inviting female voice.' },
    { id: 'en-US-Studio-Q', name: 'Studio Q — Google Cloud TTS', type: 'Male', description: 'Premium professional male studio voice.' },
    { id: 'en-US-Studio-O', name: 'Studio O — Google Cloud TTS', type: 'Female', description: 'Premium professional female studio voice.' },
    { id: 'en-US-Wavenet-D', name: 'Wavenet D — Google Cloud TTS', type: 'Male', description: 'Classic Wavenet energetic male voice.' },
  ],
  'Hindi': [
    { id: 'hi-IN-Neural2-B', name: 'Neural2 B — Google Cloud TTS (Hindi)', type: 'Male', description: 'Clear and natural male Hindi voice.' },
    { id: 'hi-IN-Neural2-A', name: 'Neural2 A — Google Cloud TTS (Hindi)', type: 'Female', description: 'Professional female Hindi voice.' },
    { id: 'hi-IN-Wavenet-B', name: 'Wavenet B — Google Cloud TTS (Hindi)', type: 'Male', description: 'Standard male Hindi voice.' },
  ],
  'Spanish': [
    { id: 'es-ES-Journey-D', name: 'Journey D — Google Cloud TTS (Spanish)', type: 'Male', description: 'Expressive natural Spanish male voice.' },
    { id: 'es-ES-Journey-O', name: 'Journey O — Google Cloud TTS (Spanish)', type: 'Female', description: 'Expressive natural Spanish female voice.' },
    { id: 'es-ES-Neural2-B', name: 'Neural2 B — Google Cloud TTS (Spanish)', type: 'Male', description: 'Professional Spanish male voice.' },
  ]
};

const DEFAULT_VOICE_FALLBACK = [
  { id: 'default-voice', name: 'Auto-detect Voice', type: 'Auto', description: 'The system will automatically pick the best premium voice for this language.' }
];

const STYLES = [
  { id: 'cinematic', title: 'Cinematic 3D', image: '/assets/styles/cinematic.jpg' },
  { id: 'watercolor', title: 'Watercolor', image: '/assets/styles/watercolor.jpg' },
  { id: 'digital-art', title: 'Digital Illustration', image: '/assets/styles/digital-art.jpg' },
  { id: 'hyper-realistic', title: 'Hyper-realistic', image: '/assets/styles/hyper-realistic.jpg' },
  { id: 'anime', title: 'Anime Style', image: '/assets/styles/anime.jpg' },
  { id: 'fantasy', title: 'Dark Fantasy', image: '/assets/styles/fantasy.jpg' },
  { id: 'cyberpunk', title: 'Cyberpunk', image: '/assets/styles/cyberpunk.jpg' },
  { id: 'pixel-art', title: 'Pixel Art', image: '/assets/styles/pixel-art.jpg' },
  { id: 'vintage-vhs', title: 'Vintage VHS', image: '/assets/styles/vintage-vhs.jpg' },
  { id: 'claymation', title: 'Claymation', image: '/assets/styles/claymation.jpg' },
  { id: 'oil-painting', title: 'Classic Oil Painting', image: '/assets/styles/oil-painting.jpg' },
  { id: 'pop-art', title: 'Pop Art Comic', image: '/assets/styles/pop-art.jpg' },
  { id: 'origami', title: 'Paper Origami', image: '/assets/styles/origami.jpg' },
  { id: 'gothic', title: 'Gothic Noir', image: '/assets/styles/gothic.jpg' },
];

export default function ReelCreatorPage() {
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const steps: WizardStep[] = ['niche', 'dynamics', 'voice', 'style', 'details'];

  const currentStep = steps[currentStepIndex];

  // Fetch social accounts
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.oauth.getAccounts(),
  });

  // Fetch AI Settings to determine the primary voice engine
  const { data: aiSettings } = useQuery({
    queryKey: ['aiSettings'],
    queryFn: async () => {
      const res = await fetch('/api/settings/ai-models', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      return res.json();
    }
  });

  const isGoogleCloudTTS = aiSettings?.voice?.primary === 'google-cloud-tts';
  const currentVoicesByLanguage = isGoogleCloudTTS ? GOOGLE_CLOUD_VOICES_BY_LANGUAGE : GEMINI_VOICES_BY_LANGUAGE;

  // Form State
  const [nicheType, setNicheType] = useState<'preset' | 'custom'>('preset');
  const [selectedPreset, setSelectedPreset] = useState('scary');
  const [customNiche, setCustomNiche] = useState('');
  const [customScript, setCustomScript] = useState('');

  const [language, setLanguage] = useState('English');
  const [voiceId, setVoiceId] = useState('Aoede');
  const [targetRegion, setTargetRegion] = useState('Global');



  const [artStyle, setArtStyle] = useState('hyper-realistic');

  const [hookType, setHookType] = useState('The Mystery');
  const [tone, setTone] = useState('Cinematic & Mysterious');
  const [storyStructure, setStoryStructure] = useState('The 3-Act Mini Story');

  const [seriesName, setSeriesName] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const duration = '1m'; // Hardcoded standard duration for Reels/TikTok
  const [publishTime, setPublishTime] = useState('');
  const [createNow, setCreateNow] = useState(false);
  const [scheduleDays, setScheduleDays] = useState<string[]>(['MON', 'WED', 'FRI']);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleChannel = (accountId: string) => {
    setSelectedChannels(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      const selected = PRESETS.find(p => p.id === selectedPreset);
      const payload = {
        niche: nicheType === 'preset' ? (selected?.customNiche || selected?.title) : customNiche,
        customPrompt: nicheType === 'preset' ? (selected?.customPrompt || '') : customScript,
        language,
        voiceId,
        artStyle,
        hookType,
        tone,
        storyStructure,
        seriesName: seriesName || 'Untitled Series',
        duration,
        publishTime,
        scheduleDays,
        createNow,
        socialChannels: selectedChannels,
        timezoneOffset: new Date().getTimezoneOffset(),
        targetRegion,
      };

      const res = await fetch(`/api/reels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.details || errorData?.error || 'Failed to create reel series');
      }

      router.push('/dashboard/reels-creator');
    } catch (error: any) {
      console.error(error);
      alert(`Failed to save: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8">
      {/* Progress Bar */}
      <div className="flex items-center gap-2 mb-10 max-w-xl">
        {steps.map((step, idx) => (
          <div
            key={step}
            className={cn(
              "h-2 flex-1 rounded-full transition-colors",
              idx <= currentStepIndex ? "bg-violet-600" : "bg-stone-200"
            )}
          />
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 min-h-[600px] flex flex-col relative">
        {/* Step 1: Niche */}
        {currentStep === 'niche' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 mb-8">
              <h2 className="text-2xl font-bold text-stone-900">Choose your niche</h2>
              <span className="px-3 py-1 bg-violet-100 text-violet-700 text-sm font-medium rounded-full">{`Step ${currentStepIndex + 1} of ${steps.length}`}</span>
            </div>
            <p className="text-stone-500 mb-6">Select a preset or describe your own niche</p>

            <div className="flex gap-6 border-b border-stone-200 mb-6">
              <button
                className={cn("pb-3 font-medium transition-colors border-b-2", nicheType === 'preset' ? "border-violet-600 text-violet-700" : "border-transparent text-stone-500 hover:text-stone-700")}
                onClick={() => setNicheType('preset')}
              >
                Presets
              </button>
              <button
                className={cn("pb-3 font-medium transition-colors border-b-2", nicheType === 'custom' ? "border-violet-600 text-violet-700" : "border-transparent text-stone-500 hover:text-stone-700")}
                onClick={() => setNicheType('custom')}
              >
                Custom
              </button>
            </div>

            {nicheType === 'preset' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PRESETS.map(preset => (
                  <div
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset.id)}
                    className={cn(
                      "p-5 rounded-xl border-2 cursor-pointer transition-all hover:border-violet-300 flex items-center justify-between",
                      selectedPreset === preset.id ? "border-violet-600 bg-violet-50/50" : "border-stone-200 bg-white"
                    )}
                  >
                    <div>
                      <h3 className="font-semibold text-stone-900 mb-1">{preset.title}</h3>
                      <p className="text-stone-500 text-sm">{preset.description}</p>
                    </div>
                    {selectedPreset === preset.id && <Check className="text-violet-600 h-5 w-5" />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Describe your topic</label>
                  <Textarea
                    value={customNiche}
                    onChange={(e) => setCustomNiche(e.target.value)}
                    placeholder="Storytelling format. True historical horror stories..."
                    className="min-h-[150px] resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Example script (Optional)</label>
                  <Textarea
                    value={customScript}
                    onChange={(e) => setCustomScript(e.target.value)}
                    placeholder="Write an example script here to set the tone..."
                    className="min-h-[150px] resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Story Dynamics */}
        {currentStep === 'dynamics' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 mb-8">
              <h2 className="text-2xl font-bold text-stone-900">Story Dynamics</h2>
              <span className="px-3 py-1 bg-violet-100 text-violet-700 text-sm font-medium rounded-full">{`Step ${currentStepIndex + 1} of ${steps.length}`}</span>
            </div>
            <p className="text-stone-500 mb-6">Select the psychological triggers and pacing for your script.</p>

            <div className="space-y-8">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-3">The Hook (First 3 seconds)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['The "Secret" Reveal', 'The Mystery / Curiosity', 'The Contrarian', 'Direct Question'].map(hook => (
                    <div
                      key={hook}
                      onClick={() => setHookType(hook)}
                      className={cn(
                        "p-3 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-between text-sm font-medium",
                        hookType === hook ? "border-violet-600 bg-violet-50 text-violet-900" : "border-stone-200 bg-white hover:border-violet-300"
                      )}
                    >
                      {hook}
                      {hookType === hook && <Check className="h-4 w-4 text-violet-600" />}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-3">Pacing & Tone</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['High-Energy & Aggressive', 'Cinematic & Mysterious', 'Casual & Conversational', 'Humorous & Sarcastic'].map(t => (
                    <div
                      key={t}
                      onClick={() => setTone(t)}
                      className={cn(
                        "p-3 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-between text-sm font-medium",
                        tone === t ? "border-violet-600 bg-violet-50 text-violet-900" : "border-stone-200 bg-white hover:border-violet-300"
                      )}
                    >
                      {t}
                      {tone === t && <Check className="h-4 w-4 text-violet-600" />}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-3">Story Structure</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['The 3-Act Mini Story', 'Problem-Agitate-Solve (PAS)', 'Listicle / Top 3', "The Hero's Journey"].map(structure => (
                    <div
                      key={structure}
                      onClick={() => setStoryStructure(structure)}
                      className={cn(
                        "p-3 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-between text-sm font-medium",
                        storyStructure === structure ? "border-violet-600 bg-violet-50 text-violet-900" : "border-stone-200 bg-white hover:border-violet-300"
                      )}
                    >
                      {structure}
                      {storyStructure === structure && <Check className="h-4 w-4 text-violet-600" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Language & Voice */}
        {currentStep === 'voice' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 mb-8">
              <h2 className="text-2xl font-bold text-stone-900">Language & Voice</h2>
              <span className="px-3 py-1 bg-violet-100 text-violet-700 text-sm font-medium rounded-full">{`Step ${currentStepIndex + 1} of ${steps.length}`}</span>
            </div>

            <div className="space-y-8">
              {/* Language Selection Grid */}
              <div>
                <label className="block text-sm font-medium text-stone-900 mb-4">1. Select Language</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[
                    { id: 'English', label: 'English', flag: '🇬🇧' },
                    { id: 'Spanish', label: 'Spanish', flag: '🇪🇸' },
                    { id: 'French', label: 'French', flag: '🇫🇷' },
                    { id: 'German', label: 'German', flag: '🇩🇪' },
                    { id: 'Italian', label: 'Italian', flag: '🇮🇹' },
                    { id: 'Portuguese', label: 'Portuguese', flag: '🇵🇹' },
                    { id: 'Japanese', label: 'Japanese', flag: '🇯🇵' },
                    { id: 'Korean', label: 'Korean', flag: '🇰🇷' },
                    { id: 'Chinese', label: 'Chinese', flag: '🇨🇳' },
                    { id: 'Arabic', label: 'Arabic', flag: '🇸🇦' },
                    { id: 'Hindi', label: 'Hindi', flag: '🇮🇳' },
                  ].map(lang => (
                    <div
                      key={lang.id}
                      onClick={() => {
                        setLanguage(lang.id);
                        const voices = currentVoicesByLanguage[lang.id] || DEFAULT_VOICE_FALLBACK;
                        setVoiceId(voices[0].id);
                      }}
                      className={cn(
                        "px-4 py-3 rounded-xl border-2 cursor-pointer transition-all duration-200 flex items-center gap-3 select-none",
                        language === lang.id
                          ? "border-violet-600 bg-violet-50 text-violet-900 font-semibold shadow-[0_0_0_2px_rgba(124,58,237,0.1)]"
                          : "border-stone-200 bg-white text-stone-600 hover:border-violet-300 hover:bg-stone-50"
                      )}
                    >
                      <span className="text-xl">{lang.flag}</span>
                      <span>{lang.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Target Region Grid */}
              <div className="pt-6 border-t border-stone-100">
                <div>
                  <label className="block text-sm font-medium text-stone-900 mb-1">2. Target Region / Cultural Context</label>
                  <p className="text-stone-500 text-sm mb-4">Ensures AI characters, locations, and stock footage match a specific demographic.</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'Global', label: 'Global / Western', icon: '🌍' },
                    { id: 'Indian', label: 'Indian / South Asian', icon: '🇮🇳' },
                    { id: 'East Asian', label: 'East Asian', icon: '🇯🇵' },
                    { id: 'Middle Eastern', label: 'Middle Eastern', icon: '🇦🇪' },
                    { id: 'European', label: 'European', icon: '🇪🇺' },
                    { id: 'African', label: 'African', icon: '🌍' },
                    { id: 'Latin American', label: 'Latin American', icon: '🇧🇷' },
                    { id: 'North American', label: 'North American', icon: '🇺🇸' },
                  ].map(region => (
                    <div
                      key={region.id}
                      onClick={() => setTargetRegion(region.id)}
                      className={cn(
                        "p-4 flex flex-col items-center justify-center text-center rounded-xl border-2 cursor-pointer transition-all duration-200 select-none",
                        targetRegion === region.id
                          ? "border-violet-600 bg-violet-50 text-violet-900 shadow-[0_0_0_2px_rgba(124,58,237,0.1)]"
                          : "border-stone-200 bg-white hover:border-violet-300 hover:bg-stone-50 text-stone-600"
                      )}
                    >
                      <span className="text-3xl mb-2 transform transition-transform group-hover:scale-110">{region.icon}</span>
                      <span className="text-xs font-semibold leading-tight">{region.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Voice Style Grid */}
              <div className="pt-6 border-t border-stone-100">
                <label className="block text-sm font-medium text-stone-900 mb-4">3. Select Narrator Voice</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(() => {
                    const availableVoices = currentVoicesByLanguage[language] || DEFAULT_VOICE_FALLBACK;
                    return availableVoices.map(voice => (
                      <div
                        key={voice.id}
                        onClick={() => setVoiceId(voice.id)}
                        className={cn(
                          "p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex items-center gap-4 select-none",
                          voiceId === voice.id
                            ? "border-violet-600 bg-violet-50 text-violet-900 shadow-[0_0_0_2px_rgba(124,58,237,0.1)]"
                            : "border-stone-200 bg-white hover:border-violet-300 hover:bg-stone-50"
                        )}
                      >
                        <div className="flex-1 flex items-center gap-3">
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                            voiceId === voice.id ? "border-violet-600" : "border-stone-300"
                          )}>
                            {voiceId === voice.id && <div className="w-2.5 h-2.5 bg-violet-600 rounded-full animate-in zoom-in duration-200" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-stone-900">{voice.name}</span>
                              <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-bold rounded-full uppercase tracking-wider">{voice.type}</span>
                            </div>
                            <p className={cn(
                              "text-sm mt-0.5 transition-colors",
                              voiceId === voice.id ? "text-violet-700/80" : "text-stone-500"
                            )}>{voice.description}</p>
                          </div>
                        </div>
                        {voice.id !== 'default-voice' && (
                          <button
                            className={cn(
                              "h-10 w-10 flex items-center justify-center rounded-full transition-colors flex-shrink-0",
                              voiceId === voice.id
                                ? "bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-600/20"
                                : "bg-stone-100 text-stone-600 hover:bg-violet-100 hover:text-violet-700"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Play preview logic here if applicable
                            }}
                          >
                            <Play className="h-4 w-4 ml-1" fill="currentColor" />
                          </button>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Step 4: Art Style */}
        {currentStep === 'style' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 mb-8">
              <h2 className="text-2xl font-bold text-stone-900">Art Style</h2>
              <span className="px-3 py-1 bg-violet-100 text-violet-700 text-sm font-medium rounded-full">{`Step ${currentStepIndex + 1} of ${steps.length}`}</span>
            </div>
            <p className="text-stone-500 mb-6">Choose the visual style for your video</p>

            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4">
              {STYLES.map(style => (
                <div
                  key={style.id}
                  onClick={() => setArtStyle(style.id)}
                  className="cursor-pointer group relative"
                >
                  <div className={cn(
                    "aspect-[9/16] rounded-xl overflow-hidden border-4 transition-all duration-300 relative",
                    artStyle === style.id ? "border-violet-600" : "border-transparent group-hover:border-violet-300"
                  )}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={style.image} alt={style.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                      <span className="text-white font-semibold text-sm">{style.title}</span>
                    </div>
                  </div>
                  {artStyle === style.id && (
                    <div className="absolute top-3 right-3 bg-violet-600 text-white rounded-full p-1 shadow-lg">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Details */}
        {currentStep === 'details' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 mb-8">
              <h2 className="text-2xl font-bold text-stone-900">Series Details</h2>
              <span className="px-3 py-1 bg-violet-100 text-violet-700 text-sm font-medium rounded-full">{`Step ${currentStepIndex + 1} of ${steps.length}`}</span>
            </div>
            <p className="text-stone-500 mb-6">Finalize your series details and posting schedule</p>

            <div className="space-y-6 max-w-lg">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Series Name</label>
                <Input
                  value={seriesName}
                  onChange={(e) => setSeriesName(e.target.value)}
                  placeholder="e.g. Spooky Sundays"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Social Channels</label>
                <p className="text-stone-500 text-sm mb-3">Select the channels where this series will be auto-posted.</p>
                <div className="flex flex-wrap gap-3">
                  {accountsData?.accounts?.length === 0 && (
                    <span className="text-sm text-stone-500 italic">No social accounts connected. Connect some in settings to auto-post.</span>
                  )}
                  {accountsData?.accounts?.map((account: any) => {
                    const platformId = account.platform.toUpperCase();
                    const config = platformStyles[platformId];
                    if (!config) return null;
                    const selected = selectedChannels.includes(account.id);
                    const Logo = config.icon;

                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => toggleChannel(account.id)}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300',
                          selected ? 'border-violet-600 bg-violet-50 text-violet-900' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                        )}
                      >
                        <Logo className="h-4 w-4" style={{ color: config.color }} />
                        <span className="text-sm font-medium">{account.metadata?.accountName || config.name}</span>
                        {selected && <Check className="h-3 w-3 text-violet-600 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700">Generation Mode</label>
                    <p className="text-stone-500 text-sm">Create the first video immediately, or wait for the schedule.</p>
                  </div>
                  <Switch checked={createNow} onCheckedChange={setCreateNow} />
                </div>
              </div>

              {!createNow && (
                <div className="animate-in fade-in duration-300">
                  <label className="block text-sm font-medium text-stone-700 mb-2">Schedule</label>
                  <p className="text-stone-500 text-sm mb-3">Set which days and times you want videos to be published.</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
                      <button
                        key={day}
                        onClick={() => {
                          setScheduleDays(prev =>
                            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                          )
                        }}
                        className={cn(
                          "px-3 py-1.5 text-xs font-semibold rounded-md border transition-all",
                          scheduleDays.includes(day)
                            ? "bg-violet-600 text-white border-violet-600"
                            : "bg-white text-stone-600 border-stone-200 hover:border-violet-300"
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Publish time:</span>
                    <Input type="time" value={publishTime} onChange={(e) => setPublishTime(e.target.value)} className="w-auto" />
                  </div>
                </div>
              )}

              <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 text-sm text-stone-600">
                <span className="font-semibold text-stone-900">Note:</span> {createNow ? 'Your first reel will begin generating immediately after you save.' : 'Videos will be generated a few hours before the scheduled publish time.'}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-auto pt-8 flex items-center justify-between border-t border-stone-100">
          <Button
            variant="outline"
            onClick={handleBack}
            className={currentStepIndex === 0 ? "invisible" : ""}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={isSubmitting}
            className="bg-violet-600 hover:bg-violet-700 text-white min-w-[120px]"
          >
            {isSubmitting ? (
              <div className="h-5 w-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : currentStepIndex === steps.length - 1 ? (
              'Create Series'
            ) : (
              <>
                Continue
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
