'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, ArrowLeft, Link2, Share2, CheckCircle2, Mic, Languages, Video, Upload, X, ImageIcon, Loader2, ArrowLeftRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { uploadFile } from '@/lib/upload';
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

const VOICE_EMOTION_PRESETS = [
  { label: '🔥 Energetic & Hype', prompt: 'Speak in an energetic, hype commercial tone with fast-paced excitement' },
  { label: '✨ Soft & Luxury', prompt: 'Speak in a smooth, quiet, luxurious aesthetic whisper with calm confidence' },
  { label: '🎙️ Professional Narrator', prompt: 'Speak in a clear, authoritative, highly professional documentary narration tone' },
  { label: '😊 Friendly & Warm', prompt: 'Speak in a warm, welcoming, friendly conversational tone' },
  { label: '⚡ Bold & Urgent', prompt: 'Speak in a fast, urgent, attention-grabbing promo tone' },
  { label: '🧘 Calm & Relaxing', prompt: 'Speak slowly in a calm, soothing, relaxing voice' },
  { label: '🎭 Dramatic Storyteller', prompt: 'Speak dramatically with expressive storytelling emotion and pauses' },
];

interface AssetFile {
  file: File;
  preview: string;
  type: 'IMAGE' | 'VIDEO';
}

export default function ManualReelPage() {
  const router = useRouter();
  
  // Website URL Scraper State
  const [magicLink, setMagicLink] = useState('');
  const [scraping, setScraping] = useState(false);
  const [scrapePhase, setScrapePhase] = useState<'idle' | 'fetching' | 'parsing' | 'downloading' | 'done'>('idle');

  // Form State
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [language, setLanguage] = useState('English');
  const [voiceId, setVoiceId] = useState('Aoede');
  const [voicePrompt, setVoicePrompt] = useState('');
  const [ingredientsToVideo, setIngredientsToVideo] = useState(false);
  const [imageToVideo, setImageToVideo] = useState(false);
  const [socialChannels, setSocialChannels] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Unified Assets State (contains File, preview URL, and type)
  const [assets, setAssets] = useState<AssetFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.oauth.getAccounts(),
  });

  const handleMagicLink = async () => {
    if (!magicLink) return;
    setScraping(true);
    setScrapePhase('fetching');
    setError(null);
    try {
      const phaseTimer = setTimeout(() => setScrapePhase('parsing'), 1200);
      const downloadTimer = setTimeout(() => setScrapePhase('downloading'), 2450);

      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: magicLink })
      });
      
      clearTimeout(phaseTimer);
      clearTimeout(downloadTimer);
      
      if (!res.ok) throw new Error('Failed to extract data from link');
      
      const data = await res.json();
      
      if (data.title) setProductName(data.title);
      if (data.description) setProductDescription(data.description);
      
      if (data.images && data.images.length > 0) {
        const fetchedAssets: AssetFile[] = [];
        for (let i = 0; i < Math.min(data.images.length, 4); i++) {
          try {
            const proxyUrl = `/api/scrape/proxy-image?url=${encodeURIComponent(data.images[i])}`;
            const imgRes = await fetch(proxyUrl);
            if (imgRes.ok) {
              const blob = await imgRes.blob();
              const file = new File([blob], `imported-product-${i + 1}.jpg`, { type: blob.type || 'image/jpeg' });
              fetchedAssets.push({
                file,
                preview: URL.createObjectURL(file),
                type: 'IMAGE'
              });
            }
          } catch (e) {
            console.warn('Failed to proxy scraped image', e);
          }
        }
        if (fetchedAssets.length > 0) {
          setAssets(prev => [...prev, ...fetchedAssets].slice(0, 4));
        }
      }
      setScrapePhase('done');
    } catch (err: any) {
      setError(err.message);
      setScrapePhase('idle');
    } finally {
      setScraping(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const newAssets: AssetFile[] = selectedFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        type: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE'
      }));
      setAssets(prev => [...prev, ...newAssets].slice(0, 4));
    }
  };

  const removeAsset = (index: number) => {
    setAssets(prev => prev.filter((_, i) => i !== index));
  };

  const moveAsset = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= assets.length) return;

    setAssets(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const toggleSocialChannel = (channel: string) => {
    setSocialChannels(prev => 
      prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
    );
  };

  const handleGenerateManualReel = async () => {
    if (!productName) {
      alert("Please enter a Product Name");
      return;
    }
    if (assets.length === 0) {
      alert("Please upload or import at least one product photo or video");
      return;
    }

    setIsCreating(true);
    setStatusMessage("Uploading visual assets to storage...");
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      // Upload files first
      const uploadedUrls: { url: string; type: 'IMAGE' | 'VIDEO' }[] = [];
      for (const asset of assets) {
        setStatusMessage(`Uploading ${asset.type.toLowerCase()} asset...`);
        const url = await uploadFile(asset.file);
        uploadedUrls.push({ url, type: asset.type });
      }

      setStatusMessage("Enqueuing custom reel generation with Google Veo...");

      const payload = {
        prompt: `Create a manual premium product commercial reel for "${productName}".`,
        productDescription: productDescription || productName,
        assets: uploadedUrls,
        language,
        voiceId,
        voicePrompt,
        ingredientsToVideo,
        imageToVideo,
        enableMusic: true,
        enableVoice: true,
      };

      const res = await fetch('/api/reels/generate-product-reel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to submit manual reel generation');
      }

      setIsSuccess(true);
      setStatusMessage("Reel generation queued successfully!");

      setTimeout(() => {
        router.push('/dashboard/reels-creator?tab=series');
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate reel. Please try again.");
      setIsCreating(false);
    }
  };

  const selectedVoice = VOICES_BY_LANGUAGE[language].find(v => v.id === voiceId);
  const selectedAccounts = accountsData?.accounts?.filter((a: any) => socialChannels.includes(a.id)) || [];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 relative pb-24 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <button
            onClick={() => router.push('/dashboard/reels-creator?tab=series')}
            className="flex items-center gap-2 text-stone-500 hover:text-stone-900 text-xs font-bold mb-2 transition-colors group uppercase tracking-widest"
          >
            <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
            Back to Reels
          </button>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-violet-600 animate-pulse" />
            Create Manual Reel
          </h1>
          <p className="text-stone-500 text-sm mt-1 font-medium">Import a product, customize settings, and generate a custom reel instantly.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 font-medium">
          {error}
        </div>
      )}

      {isSuccess ? (
        <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-lg border border-stone-200 p-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-5 border border-green-200">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Generation Enqueued!</h2>
          <p className="text-stone-500 font-medium max-w-sm">{statusMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Form Configuration */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Scraper / Magic Link Bar */}
            <div className="bg-gradient-to-r from-violet-50/50 via-stone-50 to-pink-50/30 border border-violet-100 rounded-2xl p-5 shadow-2xs">
              <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-stone-900 text-sm font-extrabold">
                  <Link2 className="w-4 h-4 text-violet-600" />
                  <span>Import Product Details</span>
                </span>
                <span className="text-[11px] font-bold text-violet-600 bg-white px-3 py-1 rounded-lg border border-violet-100 shadow-2xs">
                  ⚡ Auto-Fill from Shopify, Amazon, or Web Link
                </span>
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  value={magicLink} 
                  onChange={e => setMagicLink(e.target.value)} 
                  className="flex-1 bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all font-medium text-stone-850 placeholder-stone-400 shadow-2xs" 
                  placeholder="Paste store product URL..." 
                />
                <Button onClick={handleMagicLink} disabled={scraping || !magicLink} className="bg-stone-900 hover:bg-black text-white rounded-xl px-6 font-bold text-sm h-12 shadow-sm shrink-0 min-w-[150px]">
                  {scraping ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                      <span>
                        {scrapePhase === 'fetching' && 'Connecting...'}
                        {scrapePhase === 'parsing' && 'Extracting...'}
                        {scrapePhase === 'downloading' && 'Importing...'}
                      </span>
                    </div>
                  ) : (
                    'Import Specs'
                  )}
                </Button>
              </div>
            </div>

            {/* Product Gallery & Description */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-6">
              <div className="flex items-center gap-2 text-violet-600 border-b border-stone-100 pb-3">
                <ImageIcon className="h-5 w-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Product Info & Visual Assets</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-1.5">Product Title / Name *</label>
                  <Input 
                    value={productName} 
                    onChange={e => setProductName(e.target.value)} 
                    placeholder="e.g. Silk Cotton Kurti" 
                    className="h-11 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-1.5">Product Description</label>
                  <Textarea 
                    value={productDescription} 
                    onChange={e => setProductDescription(e.target.value)} 
                    placeholder="Describe your product key details, fabric details, sizing, or styling ideas..." 
                    className="min-h-[100px] rounded-xl resize-none"
                  />
                </div>

                {/* Upload Section */}
                <div className="bg-stone-50/70 border border-dashed border-stone-200 hover:border-violet-300 rounded-2xl p-5 space-y-3 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-stone-900">Product Photos & Videos</h4>
                      <p className="text-xs text-stone-500 font-medium mt-0.5">Drag to rearrange. Up to 4 files total. ({assets.length}/4)</p>
                    </div>
                    {assets.length < 4 && (
                      <Button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()} 
                        className="bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl h-8 px-3.5 shadow-2xs"
                      >
                        + Upload File
                      </Button>
                    )}
                  </div>

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept="image/*,video/*" 
                    multiple 
                  />

                  {assets.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                      {assets.map((asset, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200 shadow-sm group bg-stone-900 flex flex-col justify-between">
                          
                          {/* Media Preview */}
                          <div className="flex-1 w-full h-full relative overflow-hidden">
                            {asset.type === 'VIDEO' ? (
                              <video 
                                src={asset.preview} 
                                className="w-full h-full object-cover" 
                                muted 
                                loop 
                                playsInline 
                                autoPlay
                              />
                            ) : (
                              <img 
                                src={asset.preview} 
                                alt={`Product Asset ${idx+1}`} 
                                className="w-full h-full object-cover" 
                              />
                            )}

                            {/* Badge */}
                            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-black/60 text-white border border-white/20 uppercase tracking-widest">
                              {asset.type}
                            </span>
                          </div>

                          {/* Controls (Move & Delete) */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeAsset(idx); }}
                                className="w-6 h-6 bg-red-650 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            
                            {/* Reordering Controls */}
                            <div className="flex justify-center gap-1.5 bg-black/60 rounded-xl p-1 backdrop-blur-xs">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveAsset(idx, 'left')}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                title="Move Left"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <span className="text-[10px] font-bold text-white/80 self-center px-1">
                                #{idx + 1}
                              </span>
                              <button
                                type="button"
                                disabled={idx === assets.length - 1}
                                onClick={() => moveAsset(idx, 'right')}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                title="Move Right"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center cursor-pointer border border-dashed border-stone-300 rounded-xl p-5 hover:bg-stone-100/80 transition-colors"
                    >
                      <Upload className="w-8 h-8 text-stone-400 mb-1.5" />
                      <p className="font-bold text-xs text-stone-750 text-center">
                        Upload Product Photos / Videos<br/>
                        <span className="text-stone-400 font-normal text-[10px]">Select image or video files (up to 4)</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Language & Voice Grid */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-5">
              <div className="flex items-center gap-2 text-blue-655 border-b border-stone-100 pb-3">
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
                    placeholder="e.g. Speak in a luxurious aesthetic whisper with calm confidence..."
                    className="w-full h-10 px-3 border border-stone-200 rounded-lg bg-stone-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-stone-400"
                  />
                </div>
              </div>
            </div>

            {/* Video Motion Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Image to Video */}
              <div className={`bg-white p-5 rounded-2xl border shadow-2xs transition-all ${imageToVideo ? 'border-violet-400 ring-1 ring-violet-300' : 'border-stone-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-violet-650">
                    <Video className="h-5 w-5 shrink-0" />
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider">Image to Video</h3>
                      <p className="text-[10px] text-stone-400 font-medium mt-0.5">Animate 1 main product image</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setImageToVideo(v => !v);
                      setIngredientsToVideo(false);
                    }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${imageToVideo ? 'bg-violet-600' : 'bg-stone-200'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${imageToVideo ? 'translate-x-4' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              {/* Ingredients to Video */}
              <div className={`bg-white p-5 rounded-2xl border shadow-2xs transition-all ${ingredientsToVideo ? 'border-violet-400 ring-1 ring-violet-300' : 'border-stone-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-violet-650">
                    <Video className="h-5 w-5 shrink-0" />
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider">Ingredients to Video</h3>
                      <p className="text-[10px] text-stone-400 font-medium mt-0.5">Combine up to 3 product images</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIngredientsToVideo(v => !v);
                      setImageToVideo(false);
                    }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${ingredientsToVideo ? 'bg-violet-600' : 'bg-stone-200'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${ingredientsToVideo ? 'translate-x-4' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Target Social Channels */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-pink-650 border-b border-stone-100 pb-3">
                <Share2 className="h-5 w-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Target Channels</h3>
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

          {/* Right Column: Generation Summary */}
          <div className="lg:col-span-4">
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl sticky top-6 space-y-6">
              <h3 className="text-lg font-black tracking-tight border-b border-slate-800 pb-4">Manual Reel Summary</h3>
              
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Product Title</span>
                  <div className="text-sm font-medium bg-slate-800 rounded-lg p-2.5 truncate">
                    {productName || <span className="text-slate-500 italic">Not set</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Voice & Lang</span>
                    <div className="text-sm font-semibold">
                      {language} / {selectedVoice?.name || 'Aoede'}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Visual Assets</span>
                    <div className="text-sm font-semibold text-violet-400">
                      {assets.length} Files Selected
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-2">Publish Channels</span>
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
                <p className="text-xs text-slate-400 mb-4">Click below to generate. The reel will be added to your Manual Reels tab, allowing you to edit the script, regenerate frames, and post manually.</p>
                
                <Button
                  onClick={handleGenerateManualReel}
                  disabled={isCreating || !productName || assets.length === 0}
                  className="w-full h-12 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black rounded-xl transition-all hover:-translate-y-0.5 active:translate-y-0 text-xs uppercase tracking-widest gap-2"
                >
                  {isCreating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isCreating ? 'Creating Custom Reel...' : 'Generate Custom Reel'}
                </Button>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
