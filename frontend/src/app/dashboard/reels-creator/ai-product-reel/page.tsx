'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, ArrowLeft, Link2, Calendar, Share2, CheckCircle2, Mic, Languages, Video, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  InstagramLogo, FacebookLogo, LinkedinLogo, TwitterLogo,
  TiktokLogo, YoutubeLogo, ThreadsLogo, PinterestLogo, SnapchatLogo
} from '@/components/icons/social-icons';
import { cn } from '@/lib/utils';
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

const VOICES_BY_LANGUAGE: Record<string, { id: string, name: string, type: string, description: string }[]> = {
  'English': [
    { id: 'Puck', name: 'Puck', type: 'Male', description: 'Energetic & upbeat' },
    { id: 'Charon', name: 'Charon', type: 'Male', description: 'Deep & authoritative' },
    { id: 'Fenrir', name: 'Fenrir', type: 'Male', description: 'Gruff & dramatic' },
    { id: 'Aoede', name: 'Aoede', type: 'Female', description: 'Expressive & engaging' },
    { id: 'Kore', name: 'Kore', type: 'Female', description: 'Calm & soothing' },
    { id: 'Leda', name: 'Leda', type: 'Female', description: 'Clear & confident' },
  ],
  'Hindi': [
    { id: 'Puck', name: 'Puck', type: 'Male', description: 'Energetic' },
    { id: 'Charon', name: 'Charon', type: 'Male', description: 'Authoritative' },
    { id: 'Aoede', name: 'Aoede', type: 'Female', description: 'Expressive' },
    { id: 'Kore', name: 'Kore', type: 'Female', description: 'Storyteller' },
  ],
  'Spanish': [
    { id: 'Puck', name: 'Puck', type: 'Male', description: 'Energetic' },
    { id: 'Charon', name: 'Charon', type: 'Male', description: 'Deep narrator' },
    { id: 'Aoede', name: 'Aoede', type: 'Female', description: 'Expressive' },
  ]
};

const SCHEDULE_PRESETS = [
  { 
    label: 'Morning Peak (9:00 AM)', 
    value: '0 9 * * *', 
    short: '9 AM Daily',
    insight: '⚡ Peak Morning Feed Check: Highest engagement for Instagram & LinkedIn as users open social feeds before starting work.' 
  },
  { 
    label: 'Lunch Break (12:00 PM)', 
    value: '0 12 * * *', 
    short: '12 PM Daily',
    insight: '🛒 Peak E-Commerce Shopping Window: Highest click-through rate on store product links during mid-day lunch breaks.' 
  },
  { 
    label: 'Evening Commute (5:00 PM)', 
    value: '0 17 * * *', 
    short: '5 PM Daily',
    insight: '🔥 Maximum Virality Window: Peak video watch time for TikTok & Instagram Reels as workday wraps up.' 
  },
  { 
    label: 'Night Owl (9:00 PM)', 
    value: '0 21 * * *', 
    short: '9 PM Daily',
    insight: '🎬 Longest Completion Rate: Highest full-video watch completion for YouTube Shorts & Reels while relaxing.' 
  }
];

const VOICE_EMOTION_PRESETS = [
  { label: '🔥 Energetic & Hype', prompt: 'Speak in an energetic, hype commercial tone with fast-paced excitement' },
  { label: '✨ Soft & Luxury', prompt: 'Speak in a smooth, quiet, luxurious aesthetic whisper with calm confidence' },
  { label: '🎙️ Professional Narrator', prompt: 'Speak in a clear, authoritative, highly professional documentary narration tone' },
  { label: '😊 Friendly & Warm', prompt: 'Speak in a warm, welcoming, friendly conversational tone' },
  { label: '⚡ Bold & Urgent', prompt: 'Speak in a fast, urgent, attention-grabbing promo tone' },
  { label: '🧘 Calm & Relaxing', prompt: 'Speak slowly in a calm, soothing, relaxing voice' },
  { label: '🎭 Dramatic Storyteller', prompt: 'Speak dramatically with expressive storytelling emotion and pauses' },
];

export default function AIProductReelPage() {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [schedule, setSchedule] = useState(SCHEDULE_PRESETS[0].value);
  const [socialChannels, setSocialChannels] = useState<string[]>([]);
  const [language, setLanguage] = useState('English');
  const [voiceId, setVoiceId] = useState('Puck');
  const [voicePrompt, setVoicePrompt] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [ingredientsToVideo, setIngredientsToVideo] = useState(false);
  const [imageToVideo, setImageToVideo] = useState(false);
  const [animateImageCount, setAnimateImageCount] = useState(3);

  const router = useRouter();

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.oauth.getAccounts(),
  });

  const handleCreateCampaign = async () => {
    if (!websiteUrl) {
      alert("Please enter a website URL");
      return;
    }
    
    setIsCreating(true);
    setStatusMessage("Analyzing store and setting up automation...");

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      const res = await fetch('/api/automation/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          websiteUrl,
          schedule,
          socialChannels,
          language,
          voiceId,
          ingredientsToVideo,
          imageToVideo,
          animateImageCount,
          voicePrompt,
        })
      });

      if (!res.ok) throw new Error("Failed to set up automation campaign");

      setIsSuccess(true);
      setStatusMessage("Automation campaign is live!");
      
      setTimeout(() => {
        router.push('/dashboard/reels-creator');
      }, 2000);

    } catch (err) {
      console.error(err);
      alert("Failed to setup campaign. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const toggleSocialChannel = (channel: string) => {
    setSocialChannels(prev => 
      prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
    );
  };

  const selectedSchedule = SCHEDULE_PRESETS.find(s => s.value === schedule);
  const selectedVoice = VOICES_BY_LANGUAGE[language].find(v => v.id === voiceId);
  const selectedAccounts = accountsData?.accounts?.filter((a: any) => socialChannels.includes(a.id)) || [];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 relative pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <button
            onClick={() => router.push('/dashboard/reels-creator')}
            className="flex items-center gap-2 text-stone-500 hover:text-stone-900 text-xs font-bold mb-2 transition-colors group uppercase tracking-widest"
          >
            <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
            Back to Reels
          </button>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-violet-600" />
            Product Reel Automation
          </h1>
          <p className="text-stone-500 text-sm mt-1 font-medium">Configure hands-free auto-posting from your store.</p>
        </div>
      </div>

      {isSuccess ? (
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-sm border border-stone-100 p-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-5">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Automation Active!</h2>
          <p className="text-stone-500 font-medium max-w-sm">We are discovering your products and will start auto-posting based on your schedule.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Configuration */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Store URL */}
            <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-violet-600">
                <Link2 className="h-5 w-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Connect Store</h3>
              </div>
              <div className="relative">
                <Input
                  placeholder="https://www.yourstore.com"
                  className="pl-4 h-12 rounded-xl border-stone-200 bg-stone-50 focus:bg-white focus:ring-violet-300 focus:border-violet-400 text-sm font-medium w-full"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  disabled={isCreating}
                />
              </div>
            </div>

            {/* Language & Voice Grid */}
            <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm space-y-5">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <Mic className="h-5 w-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Voiceover AI</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1 space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase flex items-center gap-1"><Languages className="w-3 h-3"/> Language</label>
                  <select
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      setVoiceId(VOICES_BY_LANGUAGE[e.target.value][0].id);
                    }}
                    className="w-full h-10 px-3 border border-stone-200 rounded-lg bg-stone-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.keys(VOICES_BY_LANGUAGE).map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-3 space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase">Voice Model</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {VOICES_BY_LANGUAGE[language].map(voice => (
                      <button
                        key={voice.id}
                        onClick={() => setVoiceId(voice.id)}
                        className={cn(
                          "p-2 rounded-lg border text-left transition-all flex flex-col justify-center",
                          voiceId === voice.id 
                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                            : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                        )}
                      >
                        <span className="text-xs font-bold text-stone-900">{voice.name}</span>
                        <span className="text-[10px] text-stone-500">{voice.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-4 space-y-3 pt-2 border-t border-stone-100">
                  <label className="text-xs font-bold text-stone-500 uppercase flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span>Voice Style / Emotion</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[9px] font-bold border border-amber-200">Gemini TTS Exclusive</span>
                    </span>
                    {voicePrompt && (
                      <button
                        type="button"
                        onClick={() => setVoicePrompt('')}
                        className="text-[10px] text-stone-400 hover:text-stone-600 underline font-semibold"
                      >
                        Clear Custom Style
                      </button>
                    )}
                  </label>

                  {/* Preset Emotion Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {VOICE_EMOTION_PRESETS.map((preset, idx) => {
                      const isActive = voicePrompt === preset.prompt;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setVoicePrompt(isActive ? '' : preset.prompt)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                            isActive
                              ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20 scale-[1.02]'
                              : 'bg-stone-50 hover:bg-amber-50 text-stone-700 hover:text-amber-900 border-stone-200 hover:border-amber-300'
                          }`}
                        >
                          <span>{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    value={voicePrompt}
                    onChange={(e) => setVoicePrompt(e.target.value)}
                    placeholder="e.g. Say in a spooky whisper, Make it sound very excited, Speak slowly and dynamically..."
                    className="w-full h-10 px-3 border border-stone-200 rounded-lg bg-stone-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-stone-400"
                  />
                  <p className="text-[10px] text-stone-400 font-medium leading-relaxed">
                    Click a preset chip above or type natural language instructions to control style, tone, and pacing.
                  </p>
                </div>
              </div>
            </div>

            {/* Posting Schedule */}
            <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between text-emerald-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Best Time to Post & AI Audience Schedule</h3>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  ⚡ Peak Virality Insights
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SCHEDULE_PRESETS.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setSchedule(item.value)}
                    disabled={isCreating}
                    className={cn(
                      "px-3 py-3 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-1",
                      schedule === item.value
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500 shadow-xs'
                        : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                    )}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Selected Schedule Optimal Posting Insight Box */}
              {selectedSchedule?.insight && (
                <div className="p-3.5 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5 animate-in fade-in">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold uppercase text-[10px] tracking-wider text-emerald-700 block mb-0.5">Optimal Posting Window Strategy</span>
                    <p className="font-medium text-stone-700 leading-relaxed">{selectedSchedule.insight}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Image to Video */}
            <div className={`bg-white p-6 rounded-2xl border shadow-sm transition-all ${imageToVideo ? 'border-violet-400 ring-1 ring-violet-300' : 'border-stone-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-violet-600">
                  <Video className="h-5 w-5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider">Image to Video</h3>
                    <p className="text-xs text-stone-400 font-medium mt-0.5">
                      Veo Omni animates <strong className="text-stone-600">exactly one main product image</strong> — 15 credits per reel
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImageToVideo(v => !v);
                    setIngredientsToVideo(false);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${imageToVideo ? 'bg-violet-600' : 'bg-stone-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${imageToVideo ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {imageToVideo && (
                <div className="mt-3 pt-3 border-t border-stone-100">
                  <div className="flex items-center gap-2 bg-violet-50 rounded-xl px-3 py-2">
                    <span className="text-violet-500 text-sm">🎬</span>
                    <p className="text-xs text-violet-700 font-medium">AI uses 1 product image as a starting anchor → 1 animated 6s hero clip with Veo Omni</p>
                  </div>
                </div>
              )}
            </div>

            {/* Ingredients to Video */}
            <div className={`bg-white p-6 rounded-2xl border shadow-sm transition-all ${ingredientsToVideo ? 'border-violet-400 ring-1 ring-violet-300' : 'border-stone-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-violet-600">
                  <Video className="h-5 w-5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider">Ingredients to Video</h3>
                    <p className="text-xs text-stone-400 font-medium mt-0.5">
                      Veo Omni analyses <strong className="text-stone-600">up to 3 product images</strong> as ingredients — 15 credits per reel
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIngredientsToVideo(v => !v);
                    setImageToVideo(false);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${ingredientsToVideo ? 'bg-violet-600' : 'bg-stone-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${ingredientsToVideo ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {ingredientsToVideo && (
                <div className="mt-3 pt-3 border-t border-stone-100">
                  <div className="flex items-center gap-2 bg-violet-50 rounded-xl px-3 py-2">
                    <span className="text-violet-500 text-sm">🎬</span>
                    <p className="text-xs text-violet-700 font-medium">AI uses up to 3 product images as ingredients → 1 animated 6s hero clip with Veo Omni</p>
                  </div>
                </div>
              )}
            </div>

            {/* Social Channels */}
            <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-pink-600">
                <Share2 className="h-5 w-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Auto-Post Channels</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {accountsData?.accounts?.length === 0 && (
                  <span className="text-xs text-stone-500 italic">No social accounts connected. Connect some in settings.</span>
                )}
                {accountsData?.accounts?.map((account: any) => {
                  const platformId = account.platform.toUpperCase();
                  const config = platformStyles[platformId];
                  if (!config) return null;
                  const selected = socialChannels.includes(account.id);
                  const Logo = config.icon;

                  return (
                    <button
                      key={account.id}
                      type="button"
                      disabled={isCreating}
                      onClick={() => toggleSocialChannel(account.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all',
                        selected ? 'border-pink-500 bg-pink-50 text-pink-900 shadow-sm' : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                      )}
                    >
                      <Logo className="h-3 w-3" style={{ color: config.color }} />
                      <span className="text-xs font-bold">{account.metadata?.accountName || config.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column: Summary & Confirmation */}
          <div className="lg:col-span-4">
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl sticky top-6 space-y-6">
              <h3 className="text-lg font-black tracking-tight border-b border-slate-800 pb-4">Automation Summary</h3>
              
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Target Store</span>
                  <div className="text-sm font-medium bg-slate-800 rounded-lg p-2 truncate">
                    {websiteUrl || <span className="text-slate-500 italic">Not set</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Voice & Lang</span>
                    <div className="text-sm font-medium">
                      {language} / {selectedVoice?.name || 'Puck'}
                      {voicePrompt && (
                        <div className="text-[10px] text-amber-400 font-bold mt-0.5 truncate" title={voicePrompt}>
                          "{voicePrompt}"
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Schedule</span>
                    <div className="text-sm font-medium text-emerald-400">
                      {selectedSchedule?.short}
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-2">Posting To</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedAccounts.length === 0 ? (
                      <span className="text-xs text-slate-500 italic">No channels selected</span>
                    ) : (
                      selectedAccounts.map((a: any) => {
                        const conf = platformStyles[a.platform.toUpperCase()];
                        const Logo = conf?.icon;
                        return (
                          <div key={a.id} className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center" title={a.metadata?.accountName || conf?.name}>
                            {Logo && <Logo className="w-3.5 h-3.5" style={{ color: conf.color }} />}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <p className="text-xs text-slate-400 mb-4">Reels will be automatically generated prior to the scheduled time so they post instantly.</p>
                <Button
                  onClick={handleCreateCampaign}
                  disabled={isCreating || !websiteUrl || selectedAccounts.length === 0}
                  className="w-full h-12 bg-violet-500 hover:bg-violet-600 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black rounded-xl transition-all hover:-translate-y-0.5 active:translate-y-0 text-xs uppercase tracking-widest gap-2"
                >
                  {isCreating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isCreating ? 'Processing...' : 'Start Automation'}
                </Button>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}