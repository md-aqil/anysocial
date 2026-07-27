'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Plus, Video, Calendar, Clock, Play, FileText, Loader2, Sparkles, CheckCircle2, AlertCircle, Wand2, MoreVertical, Trash2, Edit2, PauseCircle, Send, X, RefreshCcw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

import { api } from '@/lib/api';
import {
  InstagramLogo, FacebookLogo, LinkedinLogo, TwitterLogo,
  TiktokLogo, YoutubeLogo, ThreadsLogo, PinterestLogo, SnapchatLogo
} from '@/components/icons/social-icons';

const platformStyles: Record<string, {
  name: string;
  icon: any;
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

const getScheduleLabel = (cron: string) => {
  if (cron === '0 9 * * *') return '9 AM Daily';
  if (cron === '0 12 * * *') return '12 PM Daily';
  if (cron === '0 17 * * *') return '5 PM Daily';
  if (cron === '0 21 * * *') return '9 PM Daily';
  return cron;
};

const getVoiceGender = (lang: string, voiceId: string) => {
  const list = VOICES_BY_LANGUAGE[lang] || VOICES_BY_LANGUAGE['English'] || [];
  const voice = list.find(v => v.id === voiceId);
  return voice ? voice.type : 'Voice';
};

const VOICES_BY_LANGUAGE: Record<string, { id: string, name: string, type: string, description: string }[]> = {
  'English': [
    { id: 'Puck', name: 'Puck — Gemini 3.1 TTS', type: 'Male', description: 'Energetic, punchy and upbeat. Perfect for viral hooks.' },
    { id: 'Charon', name: 'Charon — Gemini 3.1 TTS', type: 'Male', description: 'Deep, resonant and authoritative. Cinematic narrator.' },
    { id: 'Fenrir', name: 'Fenrir — Gemini 3.1 TTS', type: 'Male', description: 'Gruff and dramatic. Great for intense storytelling.' },
    { id: 'Aoede', name: 'Aoede — Gemini 3.1 TTS', type: 'Female', description: 'Expressive and engaging. Warm storyteller voice.' },
    { id: 'Kore', name: 'Kore — Gemini 3.1 TTS', type: 'Female', description: 'Calm and soothing. Perfect for mystery & suspense.' },
    { id: 'Leda', name: 'Leda — Gemini 3.1 TTS', type: 'Female', description: 'Clear and confident. Great for educational reels.' },
  ],
  'Hindi': [
    { id: 'Puck', name: 'Puck — Gemini 3.1 TTS (Hindi)', type: 'Male', description: 'Energetic and upbeat Hindi voice.' },
    { id: 'Charon', name: 'Charon — Gemini 3.1 TTS (Hindi)', type: 'Male', description: 'Deep and authoritative Hindi voice.' },
    { id: 'Aoede', name: 'Aoede — Gemini 3.1 TTS (Hindi)', type: 'Female', description: 'Expressive and engaging Hindi narrator.' },
    { id: 'Kore', name: 'Kore — Gemini 3.1 TTS (Hindi)', type: 'Female', description: 'Calm soothing Hindi storyteller.' },
  ],
  'Spanish': [
    { id: 'Puck', name: 'Puck — Gemini 3.1 TTS (Spanish)', type: 'Male', description: 'Energetic Spanish voice.' },
    { id: 'Charon', name: 'Charon — Gemini 3.1 TTS (Spanish)', type: 'Male', description: 'Deep Spanish narrator.' },
    { id: 'Aoede', name: 'Aoede — Gemini 3.1 TTS (Spanish)', type: 'Female', description: 'Expressive Spanish female voice.' },
    { id: 'Kore', name: 'Kore — Gemini 3.1 TTS (Spanish)', type: 'Female', description: 'Calm Spanish storyteller.' },
  ]
};

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
const getReelStatus = (reel: any) => {
  if (reel.status === 'FAILED') {
    return {
      label: 'FAILED',
      classes: 'bg-red-100/90 text-red-700 border-red-200',
      icon: <AlertCircle className="h-3.5 w-3.5 text-red-600" />
    };
  }
  if (reel.status === 'PARTIALLY_FAILED') {
    return {
      label: 'PARTIALLY FAILED',
      classes: 'bg-amber-100/90 text-amber-700 border-amber-200',
      icon: <AlertCircle className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
    };
  }
  if (reel.status === 'GENERATING') {
    return {
      label: 'GENERATING',
      classes: 'bg-blue-100/90 text-blue-700 border-blue-200 animate-pulse',
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />
    };
  }
  if (reel.status === 'PENDING') {
    return {
      label: 'NEXT IN LINE',
      classes: 'bg-violet-100/90 text-violet-700 border-violet-200',
      icon: <Clock className="h-3.5 w-3.5" />
    };
  }

  let channels: string[] = [];
  try {
    channels = JSON.parse(reel.socialChannels || '[]');
  } catch (e) {
    channels = [];
  }

  if (channels.length === 0 || reel.status === 'READY') {
    return {
      label: 'READY',
      classes: 'bg-teal-100/90 text-teal-700 border-teal-200',
      icon: <Play className="h-3.5 w-3.5 text-teal-600" />
    };
  }

  // If there is a linked Post, check its actual status!
  if (reel.post) {
    if (reel.post.status === 'PUBLISHED' || reel.status === 'PUBLISHED') {
      return {
        label: 'POSTED',
        classes: 'bg-emerald-100/90 text-emerald-700 border-emerald-200',
        icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
      };
    }
    if (reel.post.status === 'FAILED') {
      return {
        label: 'FAILED TO POST',
        classes: 'bg-red-100/90 text-red-700 border-red-200',
        icon: <AlertCircle className="h-3.5 w-3.5 text-red-600" />
      };
    }
    if (reel.post.status === 'PARTIALLY_FAILED') {
      return {
        label: 'PARTIALLY FAILED',
        classes: 'bg-amber-100/90 text-amber-700 border-amber-200',
        icon: <AlertCircle className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
      };
    }
    if (reel.post.status === 'PROCESSING') {
      return {
        label: 'PUBLISHING',
        classes: 'bg-blue-100/90 text-blue-700 border-blue-200 animate-pulse',
        icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />
      };
    }
    if (reel.post.status === 'QUEUED') {
      const isFuture = reel.scheduledFor ? new Date(reel.scheduledFor) > new Date() : false;
      if (isFuture) {
        return {
          label: 'SCHEDULED',
          classes: 'bg-amber-100/90 text-amber-700 border-amber-200',
          icon: <Calendar className="h-3.5 w-3.5 text-amber-600" />
        };
      } else {
        return {
          label: 'PUBLISHING',
          classes: 'bg-blue-100/90 text-blue-700 border-blue-200 animate-pulse',
          icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />
        };
      }
    }
  }

  // Fallback if no Post relation yet
  const isFuture = reel.scheduledFor ? new Date(reel.scheduledFor) > new Date() : false;
  if (isFuture) {
    return {
      label: 'SCHEDULED',
      classes: 'bg-amber-100/90 text-amber-700 border-amber-200',
      icon: <Calendar className="h-3.5 w-3.5 text-amber-600" />
    };
  }

  if (reel.statusMessage && (reel.statusMessage.toLowerCase().includes('fail') || reel.statusMessage.toLowerCase().includes('error'))) {
    return {
      label: 'FAILED',
      classes: 'bg-red-100/90 text-red-700 border-red-200',
      icon: <AlertCircle className="h-3.5 w-3.5 text-red-600" />
    };
  }

  return {
    label: 'POSTED',
    classes: 'bg-emerald-100/90 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
  };
};

const renderPostStatus = (reel: any) => {
  if (!reel.post) return null;
  
  const results = reel.post.platformResults || [];
  if (results.length === 0) return null;

  return (
    <div className="mb-4 mt-2 p-3 bg-stone-50 border border-stone-100 rounded-xl space-y-2">
      <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest block">Publishing Status</span>
      <div className="flex flex-col gap-1.5">
        {results.map((res: any, idx: number) => {
          const platformName = res.platform.toUpperCase();
          const config = platformStyles[platformName];
          if (!config) return null;
          const Logo = config.icon;

          const isSuccess = res.status === 'PUBLISHED';
          const isFailed = res.status === 'FAILED';
          const isPending = res.status === 'QUEUED' || res.status === 'PROCESSING';

          let statusText = 'Publishing...';
          let isFuture = false;
          if (isPending && reel.post?.scheduledAt) {
            const schedDate = new Date(reel.post.scheduledAt);
            if (schedDate > new Date()) {
              statusText = `Scheduled for ${format(schedDate, 'MMM d, h:mm a')}`;
              isFuture = true;
            }
          }

          return (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <Logo className="h-3.5 w-3.5" style={{ color: config.color }} />
                <span className="font-semibold text-stone-700 truncate">{config.name}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isSuccess && (
                  <>
                    {res.url ? (
                      <a 
                        href={res.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-md hover:bg-emerald-100/80 transition-colors flex items-center gap-1"
                      >
                        <span>Live Link</span>
                        <span className="text-[9px]">↗</span>
                      </a>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-md">Posted</span>
                    )}
                  </>
                )}
                {isFailed && (
                  <span 
                    className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold rounded-md cursor-help font-semibold"
                    title={res.error || 'Unknown error'}
                  >
                    Failed
                  </span>
                )}
                {isPending && (
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md font-semibold ${isFuture ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'}`}>
                    {statusText}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const renderCompactStep = (
  title: string, 
  content: React.ReactNode, 
  isComplete: boolean, 
  isActive: boolean, 
  onClick?: () => void, 
  isSelected?: boolean
) => (
  <div 
    onClick={onClick} 
    className={`flex flex-col rounded-xl overflow-hidden transition-all duration-300 ${
      onClick ? 'cursor-pointer' : ''
    } ${
      isSelected 
        ? 'ring-2 ring-violet-500 bg-white shadow-md border-transparent' 
        : isComplete 
          ? 'bg-white border border-stone-200 hover:border-stone-300 hover:shadow-xs' 
          : isActive 
            ? 'bg-white border-2 border-violet-400 shadow-sm hover:shadow-xs' 
            : 'bg-transparent border border-dashed border-stone-200 opacity-60 hover:opacity-80'
    }`}
  >
    <div className={`px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider flex items-center justify-between border-b ${
      isComplete 
        ? 'text-stone-700 border-stone-100' 
        : isActive 
          ? 'text-violet-600 border-violet-100 bg-violet-50/50' 
          : 'text-stone-400 border-stone-200/50'
    }`}>
      <span className="flex items-center gap-1.5">
        {isActive && <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-500"></span></span>}
        {isComplete && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
        {title}
      </span>
    </div>
    <div className="p-2 flex-1 flex flex-col justify-center text-center bg-stone-50/30">
      {content}
    </div>
  </div>
);

const GenerationTimeline = ({ statusMessage, metadata, isCompleted = false }: { statusMessage: string, metadata?: any, isCompleted?: boolean }) => {
  const msg = (statusMessage || '').toLowerCase();
  
  let currentStep = 1;
  if (isCompleted) {
    currentStep = 5;
  } else {
    if (msg.includes('veo') || msg.includes('generating cinematic')) currentStep = 2;
    else if (msg.includes('copy') || msg.includes('voiceover') || msg.includes('synthesizing') || msg.includes('music')) currentStep = 3;
    else if (msg.includes('assembling') || msg.includes('finalizing') || msg.includes('successfully')) currentStep = 4;
  }

  // Parse metadata if it's stringified
  let meta = metadata || {};
  if (typeof meta === 'string') {
    try { meta = JSON.parse(meta); } catch(e) {}
  }

  const [activeDetails, setActiveDetails] = useState<string | null>(null);

  const toggleDetails = (step: string) => {
    setActiveDetails(prev => prev === step ? null : step);
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 px-1">
        {isCompleted ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
        )}
        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Generation Process</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {renderCompactStep(
          "Analysis",
          meta?.generatedVisualPrompt ? (
             <div className="w-full text-left flex flex-col h-[50px] overflow-hidden justify-center">
               {meta?.extractedImages?.length > 0 && (
                 <div className="flex -space-x-2 mb-1 transition-all duration-300" title={`Found ${meta.extractedImages.length} images`}>
                   {meta.extractedImages.slice(0, 3).map((imgUrl: string, idx: number) => (
                     <img key={idx} src={imgUrl} className="w-5 h-5 rounded border border-white shadow-sm object-cover z-10" style={{ zIndex: 10 - idx }} />
                   ))}
                   {meta.extractedImages.length > 3 && (
                     <div className="w-5 h-5 rounded border border-white shadow-sm bg-stone-100 flex items-center justify-center text-[7px] font-bold text-stone-500 relative z-0">
                       +{meta.extractedImages.length - 3}
                     </div>
                   )}
                 </div>
               )}
               <p className="text-[8px] text-stone-500 italic line-clamp-2 leading-snug">"{meta.generatedVisualPrompt}"</p>
             </div>
          ) : (
            <span className="text-[10px] font-medium text-stone-600">Assets & Prompts</span>
          ),
          currentStep > 1,
          currentStep === 1,
          () => toggleDetails('analysis'),
          activeDetails === 'analysis'
        )}
        {renderCompactStep(
          "Veo 3.0 Fast",
          meta?.rawVideoUrl ? (
            <div className="relative group w-full h-[50px] overflow-hidden rounded bg-black flex items-center justify-center">
              <span className="text-[9px] font-semibold text-emerald-400">Play Clip ▶</span>
            </div>
          ) : (
            <span className="text-[10px] font-medium text-stone-600">Video Generation</span>
          ),
          currentStep > 2,
          currentStep === 2,
          () => toggleDetails('veo'),
          activeDetails === 'veo'
        )}
        {renderCompactStep(
          "Audio",
          <span className="text-[10px] font-medium text-stone-600">Voiceover & Music</span>,
          currentStep > 3,
          currentStep === 3,
          () => toggleDetails('audio'),
          activeDetails === 'audio'
        )}
        {renderCompactStep(
          "Assembly",
          <span className="text-[10px] font-medium text-stone-600">Final Composition</span>,
          currentStep > 4,
          currentStep === 4,
          () => toggleDetails('assembly'),
          activeDetails === 'assembly'
        )}
      </div>

      {activeDetails && (
        <div className="mt-2.5 p-3 bg-stone-50 border border-stone-200/80 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-1 duration-150 text-left">
          <div className="flex items-center justify-between border-b border-stone-200/50 pb-1.5">
            <span className="text-[9px] font-extrabold uppercase text-stone-600 tracking-wider">
              {activeDetails === 'analysis' && "🔍 Extraction & Analysis"}
              {activeDetails === 'veo' && "🎬 Veo 3.0 Fast Video"}
              {activeDetails === 'audio' && "🗣️ Voiceover & Sound Settings"}
              {activeDetails === 'assembly' && "⚙️ Video Composer Assembly"}
            </span>
            <button 
              type="button" 
              onClick={() => setActiveDetails(null)} 
              className="text-[9px] font-bold text-stone-400 hover:text-stone-600"
            >
              Hide
            </button>
          </div>

          {activeDetails === 'analysis' && (
            <div className="space-y-2 text-[11px] leading-relaxed">
              {meta.generatedVisualPrompt && (
                <div>
                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Generated Visual Prompt</span>
                  <p className="p-2.5 bg-white rounded-xl border border-stone-200 text-stone-700 italic">
                    "{meta.generatedVisualPrompt}"
                  </p>
                </div>
              )}
              {meta.extractedImages && meta.extractedImages.length > 0 ? (
                <div>
                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block mb-1.5">Extracted Store Images ({meta.extractedImages.length})</span>
                  <div className="grid grid-cols-4 gap-1.5 max-h-[140px] overflow-y-auto p-1 bg-white border border-stone-200 rounded-xl">
                    {meta.extractedImages.map((imgUrl: string, idx: number) => (
                      <a key={idx} href={imgUrl} target="_blank" rel="noreferrer" className="block aspect-square rounded-lg border border-stone-100 overflow-hidden hover:scale-[1.03] transition-transform">
                        <img src={imgUrl} className="w-full h-full object-cover" alt="Extracted resource" />
                      </a>
                    ))}
                  </div>
                  <p className="text-[8px] text-stone-400 mt-1 font-medium italic">Click any image thumbnail to view full-size.</p>
                </div>
              ) : (
                <p className="text-stone-500 italic text-[10px]">No product images extracted yet or url invalid.</p>
              )}
            </div>
          )}

          {activeDetails === 'veo' && (
            <div className="space-y-2">
              {meta.rawVideoUrl ? (
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Raw Veo Video Clip (Without overlays/music)</span>
                  <video src={meta.rawVideoUrl} controls className="w-full rounded-xl bg-black border border-stone-200 shadow-inner" />
                  {meta.generatedVisualPrompt && (
                    <div>
                      <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Prompt configuration used for Veo</span>
                      <p className="text-[10px] text-stone-600 bg-white p-2 border border-stone-200 rounded-lg italic">
                        "{meta.generatedVisualPrompt}"
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-stone-500 italic text-[10px]">Raw Veo video url not available yet. Generation in progress...</p>
              )}
            </div>
          )}

          {activeDetails === 'audio' && (
            <div className="space-y-2 text-[11px]">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2 rounded-xl border border-stone-200">
                  <span className="text-[8px] font-bold text-stone-400 uppercase block tracking-wide">Voice Model</span>
                  <span className="font-semibold text-stone-700">{meta.model_voice || meta.configuration?.voiceId || 'Aoede'}</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-stone-200">
                  <span className="text-[8px] font-bold text-stone-400 uppercase block tracking-wide">Voice Style</span>
                  <span className="font-semibold text-amber-700">{meta.configuration?.voicePrompt || 'Standard'}</span>
                </div>
              </div>
              {meta.llmDetails && (
                <div className="bg-white p-2 rounded-xl border border-stone-200">
                  <span className="text-[8px] font-bold text-stone-400 uppercase block tracking-wide font-mono">Synthesis Engine</span>
                  <span className="text-stone-600 font-medium text-[10px]">{meta.llmDetails}</span>
                </div>
              )}
            </div>
          )}

          {activeDetails === 'assembly' && (
            <div className="space-y-2 text-[10px]">
              <div className="bg-white p-2.5 rounded-xl border border-stone-200 space-y-1 text-stone-600">
                <div className="flex justify-between">
                  <span>Aspect ratio settings:</span>
                  <span className="font-bold text-stone-800">9:16 Vertical video</span>
                </div>
                <div className="flex justify-between">
                  <span>Background Music:</span>
                  <span className="font-bold text-stone-800">Yes (Synth/Pop loop)</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtitles Burn-in:</span>
                  <span className="font-bold text-stone-800">Enabled (Dynamic words styling)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-2 text-[10px] font-mono text-violet-600 bg-violet-50 rounded px-2 py-1 flex items-center justify-between border border-violet-100 shadow-inner">
        <span className="truncate pr-2">{statusMessage}</span>
        <span className="animate-pulse inline-block w-1.5 h-3 bg-violet-400 shrink-0"></span>
      </div>
    </div>
  );
};

export default function ReelsDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as 'series' | 'product' | null;
  const [activeTab, setActiveTab] = useState<'product' | 'series'>(tabParam || 'product');
  const [selectedMetadataReel, setSelectedMetadataReel] = useState<any | null>(null);
  const [editedScript, setEditedScript] = useState("");
  const [editedVoiceModel, setEditedVoiceModel] = useState("");
  const [shotsToRegenerate, setShotsToRegenerate] = useState<number[]>([]);

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: 'product' | 'series') => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    router.replace(`/dashboard/reels-creator?${params.toString()}`);
  };


  const handleViewDetails = (reel: any) => {
    setSelectedMetadataReel(reel);
    setEditedScript(reel.script || "");
    const meta = reel.metadata as any;
    setEditedVoiceModel(meta?.model_voice || reel.series?.voiceId || "Aoede");
    setShotsToRegenerate([]);
  };

  const recomposeMutation = useMutation({
    mutationFn: async (data: { reelId: string; script: string; voiceModel: string; regenerateShots: number[]; seriesId: string }) => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/reels/${data.reelId}/recompose`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to recompose reel');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reel-series'] });
      setSelectedMetadataReel(null);
    }
  });
  const generateMutation = useMutation({
    mutationFn: async (seriesId: string) => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/reels/series/${seriesId}/generate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to generate reel');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reel-series'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (seriesId: string) => {
      if (!confirm('Are you sure you want to delete this series and all its reels?')) throw new Error('Cancelled');
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/reels/series/${seriesId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete series');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reel-series'] })
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (seriesId: string) => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/reels/series/${seriesId}/toggle-active`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to toggle active status');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reel-series'] })
  });

  const updateSeriesMutation = useMutation({
    mutationFn: async ({ seriesId, data }: { seriesId: string, data: any }) => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/reels/series/${seriesId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update series');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reel-series'] })
  });

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.oauth.getAccounts(),
  });

  const { data: seriesList, isLoading } = useQuery({
    queryKey: ['reel-series'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/reels/series`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch series');
      const json = await res.json();
      return json.data || [];
    },
    refetchInterval: 5000 // Refetch every 5 seconds to get updates on GENERATING status
  });

  // Fetch product reels for the logged‑in user
  const { data: productReels, isLoading: loadingProduct } = useQuery({
    queryKey: ['product-reels'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/reels/product`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch product reels');
      const json = await res.json();
      return json.data || [];
    },
    refetchInterval: 5000 // refresh every 5 seconds for live progress
  });

  const manualReels = productReels?.filter((r: any) => !r.metadata?.campaignId) || [];

  const { data: automatedCampaigns, isLoading: loadingCampaigns } = useQuery({
    queryKey: ['automated-campaigns'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/automation/campaigns`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      return res.json();
    },
    refetchInterval: 10000
  });

  const toggleCampaignMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string, isActive: boolean }) => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/automation/campaigns/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });
      if (!res.ok) throw new Error('Failed to toggle campaign');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automated-campaigns'] })
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm('Are you sure you want to delete this campaign?')) throw new Error('Cancelled');
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/automation/campaigns/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete campaign');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automated-campaigns'] })
  });

  const generateCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/automation/campaigns/${id}/generate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate reel');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automated-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['product-reels'] });
    },
    onError: (error: any) => {
      alert(error.message);
    }
  });

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2.5">
            <Video className="h-8 w-8 text-violet-600" />
            {activeTab === 'product' ? 'AI Product Reels' : 'Manual Reels'}
          </h1>
          <p className="text-stone-500 mt-2">
            {activeTab === 'product'
              ? 'Create AI-powered product reels with Veo animation, voiceover, and auto-posting.'
              : 'Create manual product reels, customize scripts, voiceovers, and manually compose posts.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 flex-nowrap">
          {activeTab === 'product' ? (
            <Button
              onClick={() => router.push('/dashboard/reels-creator/ai-product-reel')}
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-11 px-6 shadow-md font-bold"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              New Product Reel
            </Button>
          ) : (
            <Button
              onClick={() => router.push('/dashboard/reels-creator/manual')}
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-11 px-6 shadow-md font-bold"
            >
              <Plus className="mr-2 h-5 w-5" />
              New Manual Reel
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex border-b border-stone-200 mb-8">
        <button
          onClick={() => handleTabChange('product')}
          className={`py-3.5 px-6 text-sm font-bold border-b-2 transition-all relative ${
            activeTab === 'product'
              ? 'border-violet-600 text-violet-600 font-extrabold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          AI Product Campaigns
        </button>
        <button
          onClick={() => handleTabChange('series')}
          className={`py-3.5 px-6 text-sm font-bold border-b-2 transition-all relative ${
            activeTab === 'series'
              ? 'border-violet-600 text-violet-600 font-extrabold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Manual Reels
        </button>
      </div>

      {activeTab === 'series' ? (
        <>
          {loadingProduct ? (
            <div className="flex h-64 items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
            </div>
          ) : manualReels.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-sm">
              <div className="w-20 h-20 bg-violet-50 text-violet-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-10 w-10" />
              </div>
              <h2 className="text-xl font-bold text-stone-900 mb-2">No Manual Reels Yet</h2>
              <p className="text-stone-500 mb-8 max-w-md mx-auto">
                Create a manual product reel to customize video assets, voiceovers, and scripts before posting.
              </p>
              <Button onClick={() => router.push('/dashboard/reels-creator/manual')} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
                Create Your First Manual Reel
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
              {manualReels.map((reel: any) => {
                const badge = getReelStatus(reel);
                const hasThumbnail = !!reel.thumbnail;
                const thumbnailPath = hasThumbnail ? reel.thumbnail : '/assets/styles/cinematic.jpg';
                return (
                  <div key={reel.id} className="border border-stone-200 rounded-2xl bg-white overflow-hidden flex flex-col shadow-sm group relative">
                    <div className="w-full h-40 relative bg-stone-100 border-b border-stone-200 overflow-hidden">
                      <img
                        src={thumbnailPath}
                        alt="Reel preview"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                      <div className="absolute top-3 right-3 z-10">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full flex items-center gap-1.5 shadow-sm border backdrop-blur-md ${badge.classes}`}>
                          {badge.icon}
                          {badge.label}
                        </span>
                      </div>
                      {reel.videoUrl && (
                        <a
                          href={reel.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30 backdrop-blur-xs"
                        >
                          <div className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center shadow-lg text-violet-600 hover:scale-110 transition-transform">
                            <Play className="h-6 w-6 fill-violet-600 ml-1" />
                          </div>
                        </a>
                      )}
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                          {reel.createdAt ? format(new Date(reel.createdAt), 'MMM d, yyyy @ p') : 'Recently'}
                        </p>
                        <p className="text-sm text-stone-700 font-medium line-clamp-3 mb-4 italic leading-relaxed text-left">
                          "{reel.script || 'No script text generated'}"
                        </p>
                      </div>

                      <div className="space-y-3">
                        {/* Live Log or Timeline */}
                        {((reel.status === 'GENERATING' && reel.statusMessage) || reel.status === 'READY') && (
                          <GenerationTimeline statusMessage={reel.statusMessage || ''} metadata={reel.metadata} isCompleted={reel.status === 'READY'} />
                        )}

                        {renderPostStatus(reel)}

                        {/* Error log display */}
                        {(reel.status === 'FAILED' || reel.status === 'PARTIALLY_FAILED') && reel.statusMessage && (
                          <div className="w-full mt-2 text-xs text-red-650 bg-red-50 p-2.5 rounded-lg border border-red-100 font-mono break-all shadow-sm">
                            <strong>Error:</strong> {reel.statusMessage}
                          </div>
                        )}

                        {reel.metadata && (
                          <button
                            type="button"
                            onClick={() => handleViewDetails(reel)}
                            className="w-full flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-250/50 text-stone-700 font-semibold text-xs py-2 rounded-xl transition-colors shadow-2xs"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                            Edit / Re-compose script
                          </button>
                        )}

                        {reel.videoUrl && (
                          <div className="pt-3 border-t border-stone-100 flex gap-2">
                            <a
                              href={reel.videoUrl}
                              download
                              className="flex items-center justify-center gap-1.5 flex-1 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs"
                            >
                              <Video className="h-3.5 w-3.5 text-violet-600" />
                              Download
                            </a>
                            <Link
                              href={`/dashboard/posts/new?videoUrl=${encodeURIComponent(reel.videoUrl)}&content=${encodeURIComponent(reel.script || '')}&platforms=${encodeURIComponent(reel.socialChannels || '[]')}`}
                              className="flex items-center justify-center gap-1.5 flex-1 py-2 bg-violet-650 border border-transparent rounded-xl text-xs font-bold text-white hover:bg-violet-700 transition-all shadow-sm"
                            >
                              <Send className="h-3.5 w-3.5" />
                              Compose
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Automated Campaigns Section */}
          {automatedCampaigns && automatedCampaigns.length > 0 && (
            <div className="mb-8 space-y-6">
              <h2 className="text-xl font-bold text-stone-900">Active Campaigns</h2>
              <div className="grid gap-6">
                {automatedCampaigns.map((campaign: any) => {
                  const campaignReels = productReels?.filter((r: any) => r.metadata?.campaignId === campaign.id) || [];
                  const nextReel = campaignReels.find((r: any) => r.scheduledFor && new Date(r.scheduledFor) > new Date());
                  return (
                    <div key={campaign.id} className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                      <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-stone-900 break-all">{campaign.websiteUrl}</h3>
                          {campaign.isActive ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase">Active</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-stone-100 text-stone-600 text-[10px] font-bold rounded-full uppercase">Paused</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-stone-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            Schedule: {campaign.schedule}
                          </span>
                          <span className="flex items-center gap-1">
                            <Sparkles className="h-4 w-4 text-violet-500" />
                            Products Found: <span className="font-bold text-stone-700">{campaign._count?.products || 0}</span>
                          </span>
                          
                          {/* Connected Channels */}
                          {(() => {
                            try {
                              const channels = JSON.parse(campaign.socialChannels);
                              if (!channels || channels.length === 0) return null;
                              return (
                                <div className="flex items-center gap-1.5 ml-4 border-l border-stone-200 pl-4">
                                  <span className="text-xs text-stone-400 font-semibold uppercase tracking-wider">Channels:</span>
                                  <div className="flex items-center -space-x-1">
                                    {channels.map((chId: string) => {
                                      const acc = accountsData?.accounts?.find((a: any) => a.id === chId);
                                      if (!acc) return null;
                                      const config = platformStyles[acc.platform.toUpperCase()];
                                      if (!config) return null;
                                      const Logo = config.icon;
                                      return (
                                        <div
                                          key={chId}
                                          className="w-6 h-6 rounded-full border border-white bg-stone-50 flex items-center justify-center shadow-sm hover:scale-110 transition-transform duration-200"
                                          title={acc.metadata?.accountName || config.name}
                                          style={{ backgroundColor: config.bg }}
                                        >
                                          <Logo className="w-3 h-3" style={{ color: config.color }} />
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            } catch {
                              return null;
                            }
                          })()}

                          {/* Parent Campaign Configuration Chips */}
                          <div className="flex flex-wrap gap-1.5 ml-4 border-l border-stone-200 pl-4">
                            <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-bold rounded-lg shadow-xs flex items-center gap-1">
                              🗣️ {campaign.language || 'English'}
                            </span>
                            <span className="px-2 py-0.5 bg-violet-600 text-white text-[9px] font-bold rounded-lg shadow-xs flex items-center gap-1">
                              🎙️ {campaign.voiceId || 'Aoede'} ({getVoiceGender(campaign.language || 'English', campaign.voiceId || 'Aoede')})
                            </span>
                            {campaign.voicePrompt && (
                              <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-bold rounded-lg shadow-xs flex items-center gap-1 max-w-[150px] truncate" title={campaign.voicePrompt}>
                                ✨ {campaign.voicePrompt}
                              </span>
                            )}
                            {campaign.ingredientsToVideo && (
                              <span className="px-2 py-0.5 bg-pink-600 text-white text-[9px] font-bold rounded-lg shadow-xs flex items-center gap-1">
                                🎬 Ingredients to Video
                              </span>
                            )}
                            {campaign.imageToVideo && (
                              <span className="px-2 py-0.5 bg-violet-600 text-white text-[9px] font-bold rounded-lg shadow-xs flex items-center gap-1">
                                🎬 Image to Video
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 text-violet-700 border-violet-200 hover:bg-violet-50 hover:border-violet-300"
                          onClick={() => generateCampaignMutation.mutate(campaign.id)}
                          disabled={generateCampaignMutation.isPending}
                        >
                          {generateCampaignMutation.isPending && generateCampaignMutation.variables === campaign.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Wand2 className="h-4 w-4" />
                          )}
                          Generate Now
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 p-2 rounded-2xl border border-stone-100 shadow-xl bg-white/95 backdrop-blur-xl">
                            <DropdownMenuItem
                              className="gap-2.5 cursor-pointer rounded-xl p-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50 focus:bg-amber-50 transition-colors"
                              onClick={() => toggleCampaignMutation.mutate({ id: campaign.id, isActive: !campaign.isActive })}
                              disabled={toggleCampaignMutation.isPending}
                            >
                              <PauseCircle className="h-4 w-4" /> {campaign.isActive ? 'Pause Campaign' : 'Resume Campaign'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1" />
                            <DropdownMenuItem
                              className="gap-2.5 cursor-pointer rounded-xl p-2.5 text-sm font-medium text-red-600 hover:bg-red-50 focus:bg-red-50 transition-colors"
                              onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                              disabled={deleteCampaignMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" /> Delete Campaign
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="mt-8 space-y-4">
                      <h4 className="text-sm font-semibold text-stone-900 uppercase tracking-wider">Generated Reels</h4>
                      {(() => {
                        const campaignReels = productReels?.filter((r: any) => r.metadata?.campaignId === campaign.id) || [];
                        if (campaignReels.length === 0) {
                          return (
                            <div className="bg-stone-50 rounded-xl p-4 text-center text-sm text-stone-500">
                              No reels generated yet for this campaign.
                            </div>
                          );
                        }
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {campaignReels.map((reel: any) => {
                              const badge = getReelStatus(reel);
                              const hasThumbnail = !!reel.thumbnail;
                              const thumbnailPath = hasThumbnail
                                ? reel.thumbnail
                                : '/assets/styles/cinematic.jpg';

                              return (
                                <div key={reel.id} className="border border-stone-100 rounded-xl bg-white overflow-hidden flex flex-col shadow-sm group relative">
                                  <div className="w-full h-32 relative bg-stone-100 border-b border-stone-100 overflow-hidden">
                                    <img
                                      src={thumbnailPath}
                                      alt="Reel preview"
                                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                                    <div className="absolute top-2 right-2 z-10">
                                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full flex items-center gap-1.5 shadow-sm border backdrop-blur-md ${badge.classes}`}>
                                        {badge.icon}
                                        {badge.label}
                                      </span>
                                    </div>
                                    {reel.videoUrl && (
                                      <a
                                        href={reel.videoUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30 backdrop-blur-xs"
                                      >
                                        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg text-violet-600 hover:scale-110 transition-transform">
                                          <Play className="h-5 w-5 fill-violet-600 ml-1" />
                                        </div>
                                      </a>
                                    )}
                                  </div>

                                  <div className="p-4 flex-1 flex flex-col">
                                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                                      {reel.createdAt ? format(new Date(reel.createdAt), 'MMM d, yyyy') : 'Recently'}
                                    </p>
                                    <p className="text-sm text-stone-700 font-medium line-clamp-2 mb-4 italic leading-relaxed">
                                      "{reel.script || 'No script text generated'}"
                                    </p>
                                    
                                    {/* Config details moved to parent card */}
                                    
                                    {/* Detailed Live Log for Generation */}
                                    {((reel.status === 'GENERATING' && reel.statusMessage) || reel.status === 'READY') && (
                                      <GenerationTimeline statusMessage={reel.statusMessage || ''} metadata={reel.metadata} isCompleted={reel.status === 'READY'} />
                                    )}

                                    {renderPostStatus(reel)}

                                    {reel.videoUrl && (
                                      <div className="mt-auto pt-4 space-y-2 border-t border-stone-100">
                                        <div className="flex gap-2">
                                          <a
                                            href={reel.videoUrl}
                                            download
                                            className="flex items-center justify-center gap-1.5 flex-1 py-2 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-sm"
                                          >
                                            <Video className="h-3.5 w-3.5 text-violet-600" />
                                            Download Reel
                                          </a>
                                          {hasThumbnail && (
                                            <a
                                              href={reel.thumbnail}
                                              download={`thumb_${reel.videoUrl.split('/').pop() || 'reel'}`}
                                              className="flex items-center justify-center gap-1.5 flex-1 py-2 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-sm"
                                            >
                                              <FileText className="h-3.5 w-3.5 text-violet-600" />
                                              Thumbnail
                                            </a>
                                          )}
                                        </div>
                                        {reel.status === 'READY' && (
                                          <Link
                                            href={`/dashboard/posts/new?videoUrl=${encodeURIComponent(reel.videoUrl)}&content=${encodeURIComponent(reel.script || '')}&platforms=${encodeURIComponent(campaign.socialChannels || '[]')}`}
                                            className="flex items-center justify-center gap-1.5 w-full py-2 bg-violet-600 border border-transparent rounded-lg text-xs font-bold text-white hover:bg-violet-700 transition-all shadow-sm"
                                          >
                                            <Send className="h-3.5 w-3.5" />
                                            Post Now
                                          </Link>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}


        </>
      )}

      {/* Generation Details Modal */}
      {selectedMetadataReel && selectedMetadataReel.metadata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200">
            <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-stone-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-xl">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-stone-800">Generation Details</h3>
                  <p className="text-xs font-medium text-stone-500">Full audit of AI models used for this Reel</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMetadataReel(null)}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-stone-50/30">
              <div className="space-y-6">
                
                {/* Generated Script */}
                {/* Voice & Script Edit */}
                {selectedMetadataReel.script && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-stone-700 mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        Voice Model
                      </h4>
                      <select
                        value={editedVoiceModel}
                        onChange={(e) => setEditedVoiceModel(e.target.value)}
                        className="w-full rounded-xl border-stone-200 bg-white text-sm focus:border-violet-500 focus:ring-violet-500 shadow-sm p-3"
                      >
                        {Object.entries(VOICES_BY_LANGUAGE).map(([lang, voices]) => (
                          <optgroup key={lang} label={lang}>
                            {voices.map(v => (
                              <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-stone-700 mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Edit Script
                      </h4>
                      <textarea
                        value={editedScript}
                        onChange={(e) => setEditedScript(e.target.value)}
                        rows={6}
                        className="w-full rounded-2xl border-stone-200 bg-white p-4 text-sm font-medium text-stone-700 leading-relaxed shadow-sm focus:border-violet-500 focus:ring-violet-500 resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Global Engines */}
                {(selectedMetadataReel.metadata as any).llmDetails && (
                  <div>
                    <h4 className="text-sm font-bold text-stone-700 mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                      Core Engines
                    </h4>
                    <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-2">
                      <p className="text-sm font-mono text-stone-600">
                        {(selectedMetadataReel.metadata as any).llmDetails}
                      </p>
                      {(selectedMetadataReel.metadata as any).model_voice && (
                        <p className="text-sm font-mono font-bold text-violet-700">
                          Voice Model: {(selectedMetadataReel.metadata as any).model_voice}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Shot Breakdown */}
                {(selectedMetadataReel.metadata as any).shots && (selectedMetadataReel.metadata as any).shots.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-stone-700 mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      Shot-by-Shot Visual Generation
                    </h4>
                    <div className="space-y-3">
                      {(selectedMetadataReel.metadata as any).shots.map((shot: any, idx: number) => (
                        <div key={idx} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-row gap-4">
                          {/* LEFT: Image */}
                          {shot.imageUrl ? (
                            <div className="flex-shrink-0 w-24 h-40 bg-stone-100 rounded-lg overflow-hidden border border-stone-200">
                              <img src={shot.imageUrl} alt={`Shot ${shot.shotIndex}`} className="w-full h-full object-cover bg-stone-900" />
                            </div>
                          ) : (
                            <div className="flex-shrink-0 w-24 h-40 bg-stone-100 rounded-lg border border-stone-200 flex items-center justify-center">
                               <span className="text-[10px] text-stone-400 font-bold uppercase">No Image</span>
                            </div>
                          )}
                          
                          {/* RIGHT: Metadata */}
                          <div className="flex flex-col flex-grow min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Shot {shot.shotIndex}</span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200 uppercase tracking-wider truncate max-w-[150px]">
                                {shot.model}
                              </span>
                            </div>
                            <div className="flex-grow flex flex-col justify-between">
                              <div>
                                <span className="text-[10px] font-semibold text-stone-400 uppercase block mb-1">Generated Prompt / Search Query</span>
                                <p className="text-xs font-mono text-stone-700 leading-relaxed bg-stone-50 p-2.5 rounded-lg border border-stone-100 max-h-24 overflow-y-auto mb-2">
                                  {shot.keyword}
                                </p>
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer mt-1">
                                <input 
                                  type="checkbox" 
                                  className="rounded border-stone-300 text-violet-600 focus:ring-violet-600"
                                  checked={shotsToRegenerate.includes(shot.shotIndex)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setShotsToRegenerate(prev => [...prev, shot.shotIndex]);
                                    } else {
                                      setShotsToRegenerate(prev => prev.filter(s => s !== shot.shotIndex));
                                    }
                                  }}
                                />
                                <span className="text-xs font-bold text-stone-600">Regenerate Image on Re-compose</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
              </div>
            </div>
            
            <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-between items-center">
              <p className="text-xs text-stone-500 font-medium max-w-sm hidden md:block">Re-composing will keep unflagged images but update timings to match the new audio track.</p>
              <div className="flex gap-3 w-full md:w-auto justify-end">
                <button
                  onClick={() => setSelectedMetadataReel(null)}
                  className="px-6 py-2.5 bg-white text-stone-700 border border-stone-200 text-sm font-bold rounded-xl hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => recomposeMutation.mutate({
                    reelId: selectedMetadataReel.id,
                    seriesId: selectedMetadataReel.seriesId,
                    script: editedScript,
                    voiceModel: editedVoiceModel,
                    regenerateShots: shotsToRegenerate
                  })}
                  disabled={recomposeMutation.isPending}
                  className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-bold rounded-xl shadow-[0_4px_15px_rgba(139,92,246,0.3)] hover:shadow-[0_6px_25px_rgba(139,92,246,0.5)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none ring-1 ring-white/20"
                >
                  {recomposeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />}
                  Re-compose Reel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
