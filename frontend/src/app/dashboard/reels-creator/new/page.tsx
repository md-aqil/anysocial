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
];

const VOICES_BY_LANGUAGE: Record<string, { id: string, name: string, type: string, description: string }[]> = {
  'English': [
    { id: 'Aoede', name: 'Aoede', type: 'Female', description: 'Expressive and engaging narrator.' },
    { id: 'Puck', name: 'Puck', type: 'Male', description: 'Energetic and upbeat.' },
    { id: 'Charon', name: 'Charon', type: 'Male', description: 'Deep, resonant and authoritative.' },
    { id: 'Kore', name: 'Kore', type: 'Female', description: 'Calm, soothing storyteller.' },
    { id: 'Fenrir', name: 'Fenrir', type: 'Male', description: 'Gruff and dramatic.' },
  ],
  'Hindi': [
    { id: 'Aoede', name: 'Aoede (Hindi)', type: 'Female', description: 'Expressive and engaging narrator.' },
    { id: 'Puck', name: 'Puck (Hindi)', type: 'Male', description: 'Energetic and upbeat.' },
    { id: 'Charon', name: 'Charon (Hindi)', type: 'Male', description: 'Deep, resonant and authoritative.' },
    { id: 'Kore', name: 'Kore (Hindi)', type: 'Female', description: 'Calm, soothing storyteller.' },
    { id: 'Fenrir', name: 'Fenrir (Hindi)', type: 'Male', description: 'Gruff and dramatic.' },
  ],
  'Spanish': [
    { id: 'Aoede', name: 'Aoede (Spanish)', type: 'Female', description: 'Expressive and engaging narrator.' },
    { id: 'Puck', name: 'Puck (Spanish)', type: 'Male', description: 'Energetic and upbeat.' },
    { id: 'Charon', name: 'Charon (Spanish)', type: 'Male', description: 'Deep, resonant and authoritative.' },
    { id: 'Kore', name: 'Kore (Spanish)', type: 'Female', description: 'Calm, soothing storyteller.' },
    { id: 'Fenrir', name: 'Fenrir (Spanish)', type: 'Male', description: 'Gruff and dramatic.' },
  ]
};

const DEFAULT_VOICE_FALLBACK = [
  { id: 'default-voice', name: 'Auto-detect Voice', type: 'Auto', description: 'The system will automatically pick the best premium voice for this language.' }
];

const STYLES = [
  { id: 'cinematic', title: 'Cinematic 3D', image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&q=80' },
  { id: 'watercolor', title: 'Watercolor', image: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=400&q=80' },
  { id: 'digital-art', title: 'Digital Illustration', image: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?w=400&q=80' },
  { id: 'hyper-realistic', title: 'Hyper-realistic', image: 'https://images.unsplash.com/photo-1626278664285-f796b9ee7806?w=400&q=80' },
  { id: 'anime', title: 'Anime Style', image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80' },
  { id: 'fantasy', title: 'Dark Fantasy', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80' },
  { id: 'cyberpunk', title: 'Cyberpunk', image: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=400&q=80' },
  { id: 'pixel-art', title: 'Pixel Art', image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80' },
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

  // Form State
  const [nicheType, setNicheType] = useState<'preset' | 'custom'>('preset');
  const [selectedPreset, setSelectedPreset] = useState('scary');
  const [customNiche, setCustomNiche] = useState('');
  const [customScript, setCustomScript] = useState('');
  
  const [language, setLanguage] = useState('English');
  const [voiceId, setVoiceId] = useState('en-US-Journey-F');
  

  
  const [artStyle, setArtStyle] = useState('cinematic');
  
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

      const payload = {
        niche: nicheType === 'preset' ? PRESETS.find(p => p.id === selectedPreset)?.title : customNiche,
        customPrompt: customScript,
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
        throw new Error('Failed to create reel series');
      }
      
      router.push('/dashboard/reels-creator');
    } catch (error) {
      console.error(error);
      alert('Failed to save. Please try again.');
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
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Language</label>
                <select 
                  className="w-full h-11 px-3 border border-stone-200 rounded-lg outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
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

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-4">Voice Style</label>
                <div className="space-y-3">
                  {(() => {
                    const availableVoices = VOICES_BY_LANGUAGE[language] || DEFAULT_VOICE_FALLBACK;
                    return availableVoices.map(voice => (
                      <div 
                        key={voice.id}
                        onClick={() => setVoiceId(voice.id)}
                        className={cn(
                          "p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-violet-300 flex items-center gap-4",
                          voiceId === voice.id ? "border-violet-600 bg-violet-50/50" : "border-stone-200 bg-white"
                        )}
                      >
                        <div className="flex-1 flex items-center gap-3">
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                            voiceId === voice.id ? "border-violet-600" : "border-stone-300"
                          )}>
                            {voiceId === voice.id && <div className="w-2.5 h-2.5 bg-violet-600 rounded-full" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-stone-900">{voice.name}</span>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[11px] font-bold rounded-full uppercase tracking-wider">{voice.type}</span>
                            </div>
                            <p className="text-stone-500 text-sm mt-0.5">{voice.description}</p>
                          </div>
                        </div>
                        {voice.id !== 'default-voice' && (
                          <button className="h-10 w-10 flex items-center justify-center rounded-full bg-stone-100 hover:bg-violet-100 hover:text-violet-700 transition-colors text-stone-600">
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
