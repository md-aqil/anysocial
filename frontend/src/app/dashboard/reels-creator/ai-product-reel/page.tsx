'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, ArrowLeft, Link2, Calendar, Share2, CheckCircle2 } from 'lucide-react';
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
    { id: 'Puck', name: 'Puck — Gemini 3.1 TTS', type: 'Male', description: 'Energetic, punchy and upbeat.' },
    { id: 'Charon', name: 'Charon — Gemini 3.1 TTS', type: 'Male', description: 'Deep, resonant and authoritative.' },
    { id: 'Fenrir', name: 'Fenrir — Gemini 3.1 TTS', type: 'Male', description: 'Gruff and dramatic.' },
    { id: 'Aoede', name: 'Aoede — Gemini 3.1 TTS', type: 'Female', description: 'Expressive and engaging.' },
    { id: 'Kore', name: 'Kore — Gemini 3.1 TTS', type: 'Female', description: 'Calm and soothing.' },
    { id: 'Leda', name: 'Leda — Gemini 3.1 TTS', type: 'Female', description: 'Clear and confident.' },
  ],
  'Hindi': [
    { id: 'Puck', name: 'Puck — Gemini (Hindi)', type: 'Male', description: 'Energetic and upbeat.' },
    { id: 'Charon', name: 'Charon — Gemini (Hindi)', type: 'Male', description: 'Deep and authoritative.' },
    { id: 'Aoede', name: 'Aoede — Gemini (Hindi)', type: 'Female', description: 'Expressive and engaging.' },
    { id: 'Kore', name: 'Kore — Gemini (Hindi)', type: 'Female', description: 'Calm soothing storyteller.' },
  ],
  'Spanish': [
    { id: 'Puck', name: 'Puck — Gemini (Spanish)', type: 'Male', description: 'Energetic Spanish voice.' },
    { id: 'Charon', name: 'Charon — Gemini (Spanish)', type: 'Male', description: 'Deep Spanish narrator.' },
    { id: 'Aoede', name: 'Aoede — Gemini (Spanish)', type: 'Female', description: 'Expressive Spanish female voice.' },
  ]
};

export default function AIProductReelPage() {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [schedule, setSchedule] = useState('0 10 * * *'); // Default: Daily at 10 AM
  const [socialChannels, setSocialChannels] = useState<string[]>([]);
  const [language, setLanguage] = useState('English');
  const [voiceId, setVoiceId] = useState('Aoede');
  const [isCreating, setIsCreating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

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
          voiceId
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

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-10 space-y-10 relative pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => router.push('/dashboard/reels-creator')}
            className="flex items-center gap-2 text-stone-400 hover:text-stone-900 text-sm font-bold mb-3 transition-colors group uppercase tracking-widest"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Reels
          </button>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-violet-600 animate-pulse" />
            100% Automated Product Reels
          </h1>
          <p className="text-stone-500 mt-2 font-medium">Connect your store, choose a schedule, and let our AI discover products and auto-post viral reels hands-free.</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-white p-8 sm:p-12 min-h-[500px] flex flex-col relative overflow-hidden transition-all duration-500">
        
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center text-center py-20 animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Automation Active!</h2>
            <p className="text-stone-500 font-medium max-w-sm">We are discovering your products and will start auto-posting based on your schedule.</p>
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
            
            {/* Store URL */}
            <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 p-6 sm:p-8 rounded-[2rem] border border-violet-100/50 shadow-inner space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-5 w-5 text-violet-600" />
                <h3 className="text-[13px] font-black text-violet-900 uppercase tracking-widest">Connect Your Store</h3>
              </div>
              <p className="text-xs font-medium text-violet-700/80 mb-2">We will automatically scan for new products and create reels.</p>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-violet-400">
                  <Link2 className="w-5 h-5" />
                </div>
                <Input
                  placeholder="https://www.yourstore.com"
                  className="pl-14 h-14 rounded-[1.25rem] border-violet-200 bg-white shadow-sm focus:ring-violet-300 focus:border-violet-400 text-sm font-medium w-full placeholder:text-violet-300"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  disabled={isCreating}
                />
              </div>
            </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-stone-900 mb-2">Language</h3>
              <select
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  setVoiceId(VOICES_BY_LANGUAGE[e.target.value][0].id);
                }}
                className="w-full h-11 px-4 border border-stone-200 rounded-xl bg-white shadow-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 font-medium text-stone-900"
              >
                {Object.keys(VOICES_BY_LANGUAGE).map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            <div>
              <h3 className="text-sm font-bold text-stone-900 mb-2">Voice Model</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VOICES_BY_LANGUAGE[language].map(voice => (
                  <button
                    key={voice.id}
                    onClick={() => setVoiceId(voice.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      voiceId === voice.id 
                        ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500 shadow-sm' 
                        : 'border-stone-200 bg-white hover:border-violet-200 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-bold text-stone-900">{voice.name.split('—')[0].trim()}</span>
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">{voice.type}</span>
                    </div>
                    <p className="text-xs text-stone-500">{voice.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Button */}
            <div className="bg-stone-50/50 p-6 sm:p-8 rounded-[2rem] border border-stone-100/50 shadow-inner space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-slate-700" />
                <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-widest">Posting Frequency</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Daily (1x)', value: '0 10 * * *' },
                  { label: 'Twice a Day (2x)', value: '0 9,17 * * *' },
                  { label: 'Weekly (1x)', value: '0 10 * * 1' }
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setSchedule(item.value)}
                    disabled={isCreating}
                    className={`px-4 py-4 rounded-[1.25rem] text-sm font-bold border transition-all duration-300 ${
                      schedule === item.value
                        ? 'border-violet-200 bg-gradient-to-br from-violet-50 to-white text-violet-700 shadow-[0_4px_14px_rgba(139,92,246,0.15)] scale-[1.02]'
                        : 'border-stone-200 bg-white text-stone-500 hover:border-violet-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Social Channels */}
            <div className="bg-stone-50/50 p-6 sm:p-8 rounded-[2rem] border border-stone-100/50 shadow-inner space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <Share2 className="h-5 w-5 text-slate-700" />
                <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-widest">Auto-Post Channels</h3>
              </div>
              <p className="text-xs text-stone-500 font-medium">Select the connected accounts to publish these product reels.</p>
              <div className="flex flex-wrap gap-3">
                {accountsData?.accounts?.length === 0 && (
                  <span className="text-sm text-stone-500 italic">No social accounts connected. Connect some in settings to auto-post.</span>
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
                        'flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300',
                        selected ? 'border-violet-600 bg-violet-50 text-violet-900 shadow-md' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                      )}
                    >
                      <Logo className="h-4 w-4" style={{ color: config.color }} />
                      <span className="text-sm font-bold">{account.metadata?.accountName || config.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <div className="pt-6">
              <Button
                onClick={handleCreateCampaign}
                disabled={isCreating || !websiteUrl}
                className="w-full h-16 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-black rounded-2xl shadow-[0_8px_20px_rgba(139,92,246,0.25)] transition-all hover:-translate-y-1 active:translate-y-0 text-sm uppercase tracking-[0.2em] gap-3"
              >
                {isCreating ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                {isCreating ? statusMessage : 'Start 100% Automation'}
              </Button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}