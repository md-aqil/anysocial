'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Plus, Video, Calendar, Clock, Play, FileText, Loader2, Sparkles, CheckCircle2, AlertCircle, Wand2, MoreVertical, Trash2, Edit2, PauseCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
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

const STYLES = [
  { id: 'cinematic', title: 'Cinematic 3D', image: '/uploads/styles/cinematic.jpg' },
  { id: 'watercolor', title: 'Watercolor', image: '/uploads/styles/watercolor.jpg' },
  { id: 'digital-art', title: 'Digital Illustration', image: '/uploads/styles/digital-art.jpg' },
  { id: 'hyper-realistic', title: 'Hyper-realistic', image: '/uploads/styles/hyper-realistic.jpg' },
  { id: 'anime', title: 'Anime Style', image: '/uploads/styles/anime.jpg' },
  { id: 'fantasy', title: 'Dark Fantasy', image: '/uploads/styles/fantasy.jpg' },
  { id: 'cyberpunk', title: 'Cyberpunk', image: '/uploads/styles/cyberpunk.jpg' },
  { id: 'pixel-art', title: 'Pixel Art', image: '/uploads/styles/pixel-art.jpg' },
  { id: 'vintage-vhs', title: 'Vintage VHS', image: '/uploads/styles/vintage-vhs.jpg' },
  { id: 'claymation', title: 'Claymation', image: '/uploads/styles/claymation.jpg' },
  { id: 'oil-painting', title: 'Classic Oil Painting', image: '/uploads/styles/oil-painting.jpg' },
  { id: 'pop-art', title: 'Pop Art Comic', image: '/uploads/styles/pop-art.jpg' },
  { id: 'origami', title: 'Paper Origami', image: '/uploads/styles/origami.jpg' },
  { id: 'gothic', title: 'Gothic Noir', image: '/uploads/styles/gothic.jpg' },
];
const getReelStatus = (reel: any) => {
  if (reel.status === 'FAILED') {
    return {
      label: 'FAILED',
      classes: 'bg-red-100/90 text-red-700 border-red-200',
      icon: <AlertCircle className="h-3.5 w-3.5" />
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

  if (channels.length === 0) {
    return {
      label: 'READY',
      classes: 'bg-teal-100/90 text-teal-700 border-teal-200',
      icon: <Play className="h-3.5 w-3.5 text-teal-600" />
    };
  }
  
  const isFuture = reel.scheduledFor ? new Date(reel.scheduledFor) > new Date() : false;
  if (isFuture) {
    return {
      label: 'SCHEDULED',
      classes: 'bg-amber-100/90 text-amber-700 border-amber-200',
      icon: <Calendar className="h-3.5 w-3.5" />
    };
  }
  
  return {
    label: 'POSTED',
    classes: 'bg-emerald-100/90 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />
  };
};

export default function ReelsDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();

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

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Reel Creator</h1>
          <p className="text-stone-500 mt-2">Manage your automated short-form video series</p>
        </div>
        <Button 
          onClick={() => router.push('/dashboard/reels-creator/new')}
          className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-11 px-6 shadow-md"
        >
          <Plus className="mr-2 h-5 w-5" />
          Create New Series
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
      ) : seriesList?.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-violet-50 text-violet-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 mb-2">No Series Yet</h2>
          <p className="text-stone-500 mb-8 max-w-md mx-auto">
            Create an automated video series and let our AI generate, assemble, and post highly engaging reels for you automatically.
          </p>
          <Button 
            onClick={() => router.push('/dashboard/reels-creator/new')}
            className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl"
          >
            Create Your First Series
          </Button>
        </div>
      ) : (
        <div className="grid gap-6">
          {seriesList?.map((series: any) => (
            <div key={series.id} className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                      {series.name}
                      {series.isActive && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase">Active</span>}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="gap-2 text-violet-700 border-violet-200 hover:bg-violet-50 hover:border-violet-300"
                        onClick={() => generateMutation.mutate(series.id)}
                        disabled={generateMutation.isPending}
                      >
                        {generateMutation.isPending && generateMutation.variables === series.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wand2 className="h-4 w-4" />
                        )}
                        Generate Now
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-500 hover:text-stone-900">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem 
                            className="gap-2 cursor-pointer"
                            onClick={() => {
                              const readyReels = series.reels?.filter((r: any) => r.status === 'READY');
                              if (readyReels && readyReels.length > 0) {
                                window.open(readyReels[0].videoUrl, '_blank');
                              } else {
                                alert('No finished reels to play yet. Generate one first!');
                              }
                            }}
                          >
                            <Play className="h-4 w-4" /> Play Latest Reel
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="gap-2 cursor-pointer"
                            onClick={() => router.push(`/dashboard/reels-creator/edit/${series.id}`)}
                          >
                            <Edit2 className="h-4 w-4" /> Edit Series
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="gap-2 cursor-pointer text-amber-600 focus:text-amber-700 focus:bg-amber-50"
                            onClick={() => toggleActiveMutation.mutate(series.id)}
                            disabled={toggleActiveMutation.isPending}
                          >
                            <PauseCircle className="h-4 w-4" /> {series.isActive ? 'Stop Auto Posting' : 'Resume Auto Posting'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="gap-2 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                            onClick={() => deleteMutation.mutate(series.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" /> Delete Series
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-stone-500">
                    <span className="flex items-center gap-1" title="Niche / Topic"><FileText className="h-4 w-4 text-violet-500" /> {series.niche || 'Custom Script'}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <span className="flex items-center gap-1 cursor-pointer hover:text-pink-600 transition-colors" title="Art Style (Click to change)">
                          <Video className="h-4 w-4 text-pink-500" />
                          {STYLES.find(s => s.id === series.artStyle)?.title || series.artStyle}
                        </span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <div className="px-2 py-1.5 text-xs font-semibold text-stone-500">Change Art Style</div>
                        <DropdownMenuSeparator />
                        {STYLES.map(style => (
                          <DropdownMenuItem 
                            key={style.id} 
                            onClick={() => updateSeriesMutation.mutate({ seriesId: series.id, data: { artStyle: style.id } })}
                            className={series.artStyle === style.id ? 'bg-pink-50 text-pink-900 font-medium' : ''}
                          >
                            <div className="flex items-center gap-2">
                              <img src={style.image} alt={style.title} className="w-10 h-10 rounded-md object-cover" />
                              {style.title}
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <span className="flex items-center gap-1 cursor-pointer hover:text-amber-600 transition-colors" title="Voice & Language (Click to change)">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                          {series.voiceName} ({series.language || 'English'})
                        </span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <div className="px-2 py-1.5 text-xs font-semibold text-stone-500">Change Voice ({series.language || 'English'})</div>
                        <DropdownMenuSeparator />
                        {(VOICES_BY_LANGUAGE[series.language || 'English'] || VOICES_BY_LANGUAGE['English']).map(v => (
                          <DropdownMenuItem 
                            key={v.id} 
                            onClick={() => updateSeriesMutation.mutate({ seriesId: series.id, data: { voiceId: v.id, voiceName: v.name } })}
                            className={series.voiceId === v.id ? 'bg-amber-50 text-amber-900 font-medium' : ''}
                          >
                            {v.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-blue-500" />  
                      {(() => {
                        try {
                          const days = JSON.parse(series.scheduleDays);
                          if (!days || days.length === 0) return 'No schedule';
                          return `${days.join(', ')} at ${series.scheduleTime || '12:00'}`;
                        } catch {
                          return 'No schedule';
                        }
                      })()}
                    </span>

                    {(() => {
                      try {
                        const channels = JSON.parse(series.socialChannels);
                        if (!channels || channels.length === 0) return null;
                        return (
                          <div className="flex items-center gap-1.5 sm:ml-auto">
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
                                    title={`${acc.metadata?.accountName || config.name}`}
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
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-stone-900 uppercase tracking-wider">Generated Reels</h4>
                {series.reels?.length === 0 ? (
                  <div className="bg-stone-50 rounded-xl p-4 text-center text-sm text-stone-500">
                    No reels generated yet for this series.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {series.reels?.map((reel: any) => (
                      <div key={reel.id} className="border border-stone-100 rounded-xl bg-white overflow-hidden flex flex-col shadow-sm">
                        <div className="w-full h-24 relative bg-stone-100 border-b border-stone-100 group">
                          <img 
                            src={STYLES.find(s => s.id === series.artStyle)?.image || '/uploads/styles/cinematic.jpg'} 
                            alt={series.artStyle}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                          <div className="absolute top-2 right-2">
                            {(() => {
                              const badge = getReelStatus(reel);
                              return (
                                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full flex items-center gap-1.5 shadow-sm border backdrop-blur-md ${badge.classes}`}>
                                  {badge.icon}
                                  {badge.label}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                          
                          {reel.script && (
                            <details className="group mb-4">
                              <summary className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-violet-600 hover:text-violet-700 select-none list-none">
                                <FileText className="h-3.5 w-3.5" />
                                View Generated Script
                              </summary>
                              <div className="mt-2 text-xs text-stone-600 italic max-h-32 overflow-y-auto pr-2 custom-scrollbar p-2.5 bg-stone-50 rounded-lg border border-stone-100">
                                "{reel.script}"
                              </div>
                            </details>
                          )}

                          {/* Detailed Live Log for Generation */}
                          {reel.status === 'GENERATING' && reel.statusMessage && (
                            <div className="mb-4 bg-stone-900 border border-stone-800 rounded-lg p-3 shadow-inner">
                              <div className="flex items-center gap-2 mb-1.5">
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Live Engine Log</span>
                              </div>
                              <div className="text-xs font-mono text-emerald-400 break-words leading-relaxed">
                                <span className="text-stone-500 mr-2">$</span>
                                {reel.statusMessage}
                                <span className="animate-pulse inline-block w-1.5 h-3.5 bg-emerald-400 ml-1 align-middle"></span>
                              </div>
                            </div>
                          )}

                          <div className="mt-auto space-y-2 text-xs font-medium text-stone-500">
                            {(() => {
                              const isFuture = reel.scheduledFor ? new Date(reel.scheduledFor) > new Date() : false;
                              let channels: string[] = [];
                              try {
                                channels = JSON.parse(reel.socialChannels || '[]');
                              } catch {}
                              const hasChannels = channels.length > 0;

                              return (
                                <div className="flex items-center gap-1.5">
                                  {reel.scheduledFor ? (
                                    <>
                                      <Calendar className={`h-3.5 w-3.5 ${isFuture ? 'text-amber-500' : 'text-emerald-500'}`} />
                                      <span>
                                        {hasChannels 
                                          ? (isFuture ? 'Scheduled to Post:' : 'Posted on:')
                                          : (isFuture ? 'Scheduled to Generate:' : 'Generated on:')}{' '}
                                        <span className="font-semibold text-stone-700">
                                          {format(new Date(reel.scheduledFor), 'MMM d, yyyy @ p')}
                                        </span>
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="h-3.5 w-3.5 text-stone-400" />
                                      <span>
                                        Created:{' '}
                                        <span className="font-semibold text-stone-700">
                                          {format(new Date(reel.createdAt), 'MMM d, yyyy @ p')}
                                        </span>
                                      </span>
                                    </>
                                  )}
                                </div>
                              );
                            })()}
                            
                            {/* Detailed Error Reason Display */}
                            {reel.status === 'FAILED' && reel.statusMessage && (
                              <div className="w-full mt-2 text-[10px] sm:text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 font-mono break-all" title={reel.statusMessage}>
                                <strong>Error:</strong> {reel.statusMessage}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {reel.videoUrl && (
                          <div className="bg-stone-100 p-3 border-t border-stone-100">
                            <a 
                              href={reel.videoUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex items-center justify-center gap-2 w-full py-2 bg-white border border-stone-200 rounded-lg text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
                            >
                              <Play className="h-4 w-4 text-violet-600" />
                              Watch Final Reel
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
