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

type WizardStep = 'niche' | 'voice' | 'music' | 'style' | 'details';

const PRESETS = [
  { id: 'scary', title: 'Scary stories', description: 'Scary stories that give you goosebumps' },
  { id: 'history', title: 'History', description: 'Viral videos about history spanning from ancient times to the modern day.' },
  { id: 'figures', title: 'Historical Figures', description: 'Life story in one minute videos about the most important historical figures.' },
  { id: 'mythology', title: 'Greek Mythology', description: 'Shocking and dramatic stories from Greek mythology.' },
];

const VOICES = [
  { id: 'adam', name: 'Adam', type: 'Male', description: 'The well known voice of tiktok and instagram.' },
  { id: 'john', name: 'John', type: 'Male', description: 'The perfect storyteller, very realistic and natural.' },
  { id: 'sarah', name: 'Sarah', type: 'Female', description: 'Clear and engaging female voice.' },
];

const STYLES = [
  { id: 'comic', title: 'Comic', image: 'https://images.unsplash.com/photo-1626278664285-f796b9ee7806?w=400&q=80' },
  { id: 'creepy', title: 'Creepy Comic', image: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=400&q=80' },
  { id: 'modern', title: 'Modern Cartoon', image: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?w=400&q=80' },
  { id: 'realistic', title: 'Cinematic', image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&q=80' },
];

export default function ReelCreatorPage() {
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const steps: WizardStep[] = ['niche', 'voice', 'music', 'style', 'details'];
  
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
  const [voiceId, setVoiceId] = useState('adam');
  
  const [musicType, setMusicType] = useState<'preset' | 'upload'>('preset');
  const [musicId, setMusicId] = useState('lofi-chill');
  
  const [artStyle, setArtStyle] = useState('creepy');
  
  const [seriesName, setSeriesName] = useState('');
  const [duration, setDuration] = useState('30-40 seconds');
  const [publishTime, setPublishTime] = useState('');
  const [createNow, setCreateNow] = useState(false);
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
        musicId,
        artStyle,
        seriesName: seriesName || 'Untitled Series',
        duration,
        publishTime,
        createNow,
        socialChannels: selectedChannels,
      };
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/reels`, {
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
              <span className="px-3 py-1 bg-violet-100 text-violet-700 text-sm font-medium rounded-full">Step 1 of 5</span>
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
              <div className="space-y-4">
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

        {/* Step 2: Language & Voice */}
        {currentStep === 'voice' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 mb-8">
              <h2 className="text-2xl font-bold text-stone-900">Language & Voice</h2>
              <span className="px-3 py-1 bg-violet-100 text-violet-700 text-sm font-medium rounded-full">Step 2 of 5</span>
            </div>
            
            <div className="space-y-8">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Language</label>
                <select 
                  className="w-full h-11 px-3 border border-stone-200 rounded-lg outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
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
                  {VOICES.map(voice => (
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
                      <button className="h-10 w-10 flex items-center justify-center rounded-full bg-stone-100 hover:bg-violet-100 hover:text-violet-700 transition-colors text-stone-600">
                        <Play className="h-4 w-4 ml-1" fill="currentColor" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Music */}
        {currentStep === 'music' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 mb-8">
              <h2 className="text-2xl font-bold text-stone-900">Background Music</h2>
              <span className="px-3 py-1 bg-violet-100 text-violet-700 text-sm font-medium rounded-full">Step 3 of 5</span>
            </div>
            
            <div className="flex gap-6 border-b border-stone-200 mb-6">
              <button 
                className={cn("pb-3 font-medium transition-colors border-b-2", musicType === 'preset' ? "border-violet-600 text-violet-700" : "border-transparent text-stone-500 hover:text-stone-700")}
                onClick={() => setMusicType('preset')}
              >
                Presets
              </button>
              <button 
                className={cn("pb-3 font-medium transition-colors border-b-2", musicType === 'upload' ? "border-violet-600 text-violet-700" : "border-transparent text-stone-500 hover:text-stone-700")}
                onClick={() => setMusicType('upload')}
              >
                Upload Custom
              </button>
            </div>

            {musicType === 'preset' ? (
              <div className="space-y-3">
                {[
                  { id: 'lofi-chill', name: 'Lofi Chill', desc: 'Relaxed and ambient' },
                  { id: 'dark-ambient', name: 'Dark Ambient', desc: 'Spooky and tense' },
                  { id: 'epic-orchestral', name: 'Epic Orchestral', desc: 'Grand and cinematic' }
                ].map(music => (
                   <div 
                   key={music.id}
                   onClick={() => setMusicId(music.id)}
                   className={cn(
                     "p-4 rounded-xl border-2 cursor-pointer transition-all hover:border-violet-300 flex items-center gap-4",
                     musicId === music.id ? "border-violet-600 bg-violet-50/50" : "border-stone-200 bg-white"
                   )}
                 >
                   <div className="flex-1 flex items-center gap-3">
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        musicId === music.id ? "border-violet-600" : "border-stone-300"
                      )}>
                        {musicId === music.id && <div className="w-2.5 h-2.5 bg-violet-600 rounded-full" />}
                      </div>
                     <div>
                       <div className="font-semibold text-stone-900">{music.name}</div>
                       <p className="text-stone-500 text-sm">{music.desc}</p>
                     </div>
                   </div>
                   <button className="h-10 w-10 flex items-center justify-center rounded-full bg-stone-100 hover:bg-violet-100 hover:text-violet-700 transition-colors text-stone-600">
                     <Play className="h-4 w-4 ml-1" fill="currentColor" />
                   </button>
                 </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-stone-300 rounded-xl p-12 flex flex-col items-center justify-center text-center">
                <div className="h-12 w-12 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center mb-4">
                  <Upload className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-stone-900 mb-1">Click to upload or drag and drop</h3>
                <p className="text-stone-500 text-sm mb-4">MP3, WAV up to 10MB</p>
                <Button variant="outline">Browse Files</Button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Art Style */}
        {currentStep === 'style' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="flex items-center gap-3 mb-8">
              <h2 className="text-2xl font-bold text-stone-900">Art Style</h2>
              <span className="px-3 py-1 bg-violet-100 text-violet-700 text-sm font-medium rounded-full">Step 4 of 5</span>
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
              <span className="px-3 py-1 bg-violet-100 text-violet-700 text-sm font-medium rounded-full">Step 5 of 5</span>
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
                <label className="block text-sm font-medium text-stone-700 mb-2">Video Duration</label>
                <select 
                  className="w-full h-11 px-3 border border-stone-200 rounded-lg outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 bg-white"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                >
                  <option value="15-30">15-30 seconds</option>
                  <option value="30-40">30-40 seconds</option>
                  <option value="40-60">40-60 seconds</option>
                </select>
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
                  <p className="text-stone-500 text-sm mb-3">Set when you want your videos to be published.</p>
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
