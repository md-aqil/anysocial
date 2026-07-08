'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Upload, Sparkles, FileText, Music, Volume2, VolumeX,
  Wand2, Trash2, ArrowLeft, ArrowRight, Play, CheckCircle2, Heart, Link2
} from 'lucide-react';
import { uploadFile } from '@/lib/upload';
import { useRouter } from 'next/navigation';

const VOICES_BY_LANGUAGE: Record<string, { id: string, name: string, type: string, description: string }[]> = {
  'English': [
    { id: 'Puck', name: 'Puck', type: 'Male', description: 'Energetic, punchy and upbeat. Perfect for viral hooks.' },
    { id: 'Charon', name: 'Charon', type: 'Male', description: 'Deep, resonant and authoritative. Cinematic narrator.' },
    { id: 'Fenrir', name: 'Fenrir', type: 'Male', description: 'Gruff and dramatic. Great for intense storytelling.' },
    { id: 'Aoede', name: 'Aoede', type: 'Female', description: 'Expressive and engaging. Warm storyteller voice.' },
    { id: 'Kore', name: 'Kore', type: 'Female', description: 'Calm and soothing. Perfect for mystery & suspense.' },
    { id: 'Leda', name: 'Leda', type: 'Female', description: 'Clear and confident. Great for educational reels.' },
  ],
  'Hindi': [
    { id: 'Puck', name: 'Puck (Hindi)', type: 'Male', description: 'Energetic and upbeat Hindi voice.' },
    { id: 'Charon', name: 'Charon (Hindi)', type: 'Male', description: 'Deep and authoritative Hindi voice.' },
    { id: 'Aoede', name: 'Aoede (Hindi)', type: 'Female', description: 'Expressive and engaging Hindi narrator.' },
    { id: 'Kore', name: 'Kore (Hindi)', type: 'Female', description: 'Calm soothing Hindi storyteller.' },
  ],
  'Spanish': [
    { id: 'Puck', name: 'Puck (Spanish)', type: 'Male', description: 'Energetic Spanish voice.' },
    { id: 'Charon', name: 'Charon (Spanish)', type: 'Male', description: 'Deep Spanish narrator.' },
    { id: 'Aoede', name: 'Aoede (Spanish)', type: 'Female', description: 'Expressive Spanish female voice.' },
    { id: 'Kore', name: 'Kore (Spanish)', type: 'Female', description: 'Calm Spanish storyteller.' },
  ]
};

const DEFAULT_VOICE_FALLBACK = [
  { id: 'default-voice', name: 'Auto-detect', type: 'Auto', description: 'System automatically picks the best premium voice.' }
];

export default function AIProductReelPage() {
  const [currentStep, setCurrentStep] = useState(1);

  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const [prompt, setPrompt] = useState('');
  const [scriptMode, setScriptMode] = useState<'ai' | 'manual'>('ai');
  const [vibe, setVibe] = useState('High-energy & Viral');
  const [scriptText, setScriptText] = useState('');
  const [hookText, setHookText] = useState('');

  const [enableVoice, setEnableVoice] = useState(true);
  const [language, setLanguage] = useState('English');
  const [voiceId, setVoiceId] = useState('Puck');

  const [enableMusic, setEnableMusic] = useState(true);
  const [musicSource, setMusicSource] = useState<'ai' | 'custom'>('ai');
  const [customMusicFile, setCustomMusicFile] = useState<File | null>(null);

  const [isWritingScript, setIsWritingScript] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const [importLink, setImportLink] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const router = useRouter();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFiles = Array.from(event.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
      const urls = selectedFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...urls]);
    }
  };

  const handleCustomMusicChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setCustomMusicFile(event.target.files[0]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleMagicImport = async () => {
    if (!importLink) return;
    setIsImporting(true);
    setStatusMessage("Analyzing product page & extracting assets...");

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importLink })
      });

      if (!res.ok) throw new Error("Failed to fetch product data");

      const data = await res.json();

      if (data.images && data.images.length > 0) {
        // Create fake File objects for the UI
        const scrapedFiles = data.images.map((url: string, i: number) => new File([""], `scraped-image-${i}.jpg`, { type: "image/jpeg" }));

        setFiles(prev => [...prev, ...scrapedFiles]);
        setPreviewUrls(prev => [...prev, ...data.images]);
      }

      const domainName = new URL(importLink).hostname.replace('www.', '');
      const title = data.title || "premium product";
      const desc = data.description ? `\n\nDetails: ${data.description}` : '';

      setPrompt(`A product imported from ${domainName}.\nTitle: ${title}${desc}\n\nHighlight its core features, modern design, and high quality.`);

    } catch (err) {
      console.error(err);
      alert("Could not extract data from this link. Try uploading manually.");
    } finally {
      setIsImporting(false);
      setStatusMessage('');
      setImportLink('');
    }
  };

  const handleGenerateScript = async () => {
    setIsWritingScript(true);
    setStatusMessage("Writing a high-retention viral script...");
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      const duration = files.length > 0 ? Math.max(8, files.length * 4.0) : 15;

      const res = await fetch(`/api/reels/write-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt, whatMakesItHit: '', vibe, duration, language }),
      });

      if (!res.ok) throw new Error('Failed to generate script');
      const data = await res.json();

      setScriptText(data.script || '');
      setHookText(data.hook || '');
      setStatusMessage("Script generated successfully! Review and edit it below.");
    } catch (error: any) {
      console.error(error);
      alert(`Failed to write script: ${error.message}`);
    } finally {
      setIsWritingScript(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setStatusMessage("Uploading and preparing assets...");
    try {
      const uploadedUrls = await Promise.all(files.map(uploadFile));
      const assets = uploadedUrls.map((url, index) => ({
        url,
        type: files[index].type.startsWith('video') ? 'VIDEO' : 'IMAGE',
      }));

      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      setStatusMessage("Queueing generation task with AI Video Engine...");
      const res = await fetch(`/api/reels/generate-product-reel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: prompt || scriptText || "AI Product Reel",
          assets,
          enableMusic,
          enableVoice,
          scriptText: enableVoice ? scriptText : '',
          hookText,
          language,
          voiceId
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.details || errorData?.error || 'Failed to generate product reel');
      }

      router.push('/dashboard/reels-creator');
    } catch (error: any) {
      console.error(error);
      alert(`Failed to generate reel: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const STEPS = [
    { id: 1, name: 'Media' },
    { id: 2, name: 'Script' },
    { id: 3, name: 'Audio' },
    { id: 4, name: 'Generate' }
  ];

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
            AI Product Reel Creator
          </h1>
          <p className="text-stone-500 mt-2 font-medium">Design, compose, and export studio-quality viral product clips in seconds.</p>
        </div>
      </div>

      {/* Premium Stepper Progress */}
      <div className="relative pt-6 pb-6">
        <div className="absolute top-[52px] left-[10%] right-[10%] h-[3px] bg-stone-100 -translate-y-1/2 z-0 rounded-full" />
        <div
          className="absolute top-[52px] left-[10%] h-[3px] bg-gradient-to-r from-[#D27D50] to-[#E8A583] -translate-y-1/2 z-0 rounded-full transition-all duration-700 ease-in-out shadow-[0_0_10px_rgba(210,125,80,0.4)]"
          style={{ width: `${((currentStep - 1) / 3) * 80}%` }}
        />

        <div className="relative z-10 flex justify-between px-[5%]">
          {STEPS.map(step => {
            const isActive = currentStep === step.id;
            const isPassed = currentStep > step.id;
            return (
              <div key={step.id} className="flex flex-col items-center gap-3 w-24">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold transition-all duration-500 shadow-sm ${isActive
                    ? 'bg-gradient-to-br from-[#D27D50] to-[#C26032] text-white shadow-[0_8px_20px_rgba(210,125,80,0.3)] scale-110 border border-white/20'
                    : isPassed
                      ? 'bg-[#FBF3EE] text-[#D27D50] hover:bg-[#F0E4DC] border border-[#D27D50]/20'
                      : 'bg-white border-2 border-stone-100 text-stone-300 hover:border-[#D27D50]/40'
                    }`}
                >
                  {isPassed ? <CheckCircle2 className="h-6 w-6 stroke-[2.5]" /> : <span className="text-lg">{step.id}</span>}
                </button>
                <div className="flex flex-col items-center text-center">
                  <span className={`text-[11px] font-black uppercase tracking-widest transition-colors duration-300 ${isActive ? 'text-[#D27D50]' : isPassed ? 'text-stone-700' : 'text-stone-400'
                    }`}>
                    {step.name}
                  </span>
                  {isActive && <div className="w-1 h-1 rounded-full bg-[#D27D50] mt-1.5 animate-pulse" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="!mt-0 bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-white p-8 sm:p-12 min-h-[500px] flex flex-col relative overflow-hidden transition-all duration-500">

        {/* Step 1: Media */}
        {currentStep === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Add Product Media</h2>
              <p className="text-stone-500 font-medium">Upload photos/videos manually, or let our AI instantly extract assets from any product link.</p>
            </div>

            {/* Magic Import Section */}
            <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 p-6 sm:p-8 rounded-[2rem] border border-violet-100/50 shadow-inner space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-violet-600 animate-pulse" />
                <h3 className="text-[13px] font-black text-violet-900 uppercase tracking-widest">Magic Link Import</h3>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-violet-400">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <Input
                    placeholder="Paste Amazon, Shopify, or Flipkart link..."
                    className="pl-14 h-14 rounded-[1.25rem] border-violet-200 bg-white shadow-sm focus:ring-violet-300 focus:border-violet-400 text-sm font-medium w-full placeholder:text-violet-300"
                    value={importLink}
                    onChange={(e) => setImportLink(e.target.value)}
                    disabled={isImporting}
                  />
                </div>
                <Button
                  onClick={handleMagicImport}
                  disabled={isImporting || !importLink}
                  className="h-14 px-8 rounded-[1.25rem] bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-black shadow-[0_8px_20px_rgba(139,92,246,0.25)] transition-all hover:-translate-y-0.5 active:scale-95 text-xs uppercase tracking-widest w-full sm:w-auto shrink-0 gap-2"
                >
                  {isImporting ? <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Sparkles className="w-4 h-4" />}
                  {isImporting ? 'Extracting...' : 'Import Assets'}
                </Button>
              </div>
              {isImporting && (
                <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest text-center animate-pulse pt-2">{statusMessage}</p>
              )}
            </div>

            <div className="relative flex items-center justify-center py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-100" /></div>
              <div className="relative bg-white px-4 text-[10px] font-black text-stone-300 uppercase tracking-widest">OR MANUAL UPLOAD</div>
            </div>

            {/* Manual Upload Section */}
            <div className="flex justify-center px-6 pt-10 pb-10 border-2 border-stone-200/70 border-dashed rounded-[2.5rem] hover:border-violet-300 transition-all bg-stone-50/30 hover:bg-violet-50/30 group cursor-pointer relative shadow-inner">
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                multiple
                onChange={handleFileChange}
              />
              <div className="space-y-4 text-center pointer-events-none">
                <div className="w-16 h-16 bg-white rounded-[1.25rem] shadow-[0_4px_14px_rgba(0,0,0,0.05)] border border-stone-100 flex items-center justify-center mx-auto text-stone-400 group-hover:text-violet-600 group-hover:shadow-[0_8px_20px_rgba(139,92,246,0.15)] group-hover:scale-110 transition-all duration-300">
                  <Upload className="h-8 w-8" />
                </div>
                <div className="flex text-[15px] text-stone-500 justify-center font-medium pt-2">
                  <span className="font-bold text-violet-600 group-hover:text-violet-500 transition-colors">Upload files</span>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs font-bold text-stone-400 tracking-widest uppercase">Supports JPG, PNG, WEBP, MP4</p>
              </div>
            </div>

            {previewUrls.length > 0 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-black text-stone-400 uppercase tracking-widest">Uploaded Media ({files.length})</span>
                  <button onClick={() => { setFiles([]); setPreviewUrls([]); }} className="text-[11px] font-black text-red-500 hover:text-red-700 transition-colors uppercase tracking-widest bg-red-50 px-3 py-1.5 rounded-full">Clear All</button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative aspect-[9/16] group rounded-[1.25rem] overflow-hidden border border-stone-200 bg-stone-100 shadow-sm">
                      {files[index].type.startsWith('video') ? (
                        <video src={url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={url} alt={`preview ${index}`} className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <button onClick={() => removeFile(index)} className="p-2 bg-red-500/90 text-white rounded-full hover:bg-red-600 shadow-md transition-transform hover:scale-110">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Scripting */}
        {currentStep === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Script & Content</h2>
              <p className="text-stone-500 font-medium">Auto-generate a script using AI, or write your own manual script.</p>
            </div>

            <div className="flex p-1.5 bg-stone-100 rounded-[1.25rem] w-full sm:w-fit shadow-inner">
              <button
                onClick={() => setScriptMode('ai')}
                className={`flex-1 sm:px-6 py-2.5 rounded-[1rem] text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${scriptMode === 'ai' ? 'bg-white text-violet-700 shadow-[0_4px_12px_rgba(0,0,0,0.05)]' : 'text-stone-500 hover:text-stone-700'
                  }`}
              >
                <Sparkles className="h-4 w-4" />
                Generate with AI
              </button>
              <button
                onClick={() => setScriptMode('manual')}
                className={`flex-1 sm:px-6 py-2.5 rounded-[1rem] text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${scriptMode === 'manual' ? 'bg-white text-stone-900 shadow-[0_4px_12px_rgba(0,0,0,0.05)]' : 'text-stone-500 hover:text-stone-700'
                  }`}
              >
                <FileText className="h-4 w-4" />
                Review & Edit
              </button>
            </div>

            {scriptMode === 'ai' ? (
              <div className="space-y-6 bg-stone-50/50 p-6 rounded-[2rem] border border-stone-100/50 shadow-inner">
                <div>
                  <label className="block text-[11px] font-black text-stone-400 uppercase tracking-widest mb-2">Product Name & Core Idea</label>
                  <Textarea
                    rows={3}
                    className="rounded-[1.25rem] border-stone-100 bg-white shadow-sm focus:ring-violet-200 focus:border-violet-300 block w-full text-sm p-5 font-medium transition-all resize-none"
                    placeholder="e.g. Handmade natural lavender soaps. Organic oils, moisturizing."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-stone-400 uppercase tracking-widest mb-2">Target Language</label>
                  <select
                    className="w-full h-14 px-5 border border-stone-200/60 rounded-[1.25rem] outline-none focus:border-[#D27D50] focus:ring-2 focus:ring-[#D27D50]/20 text-sm font-bold bg-white text-slate-900 shadow-sm transition-all cursor-pointer hover:border-stone-300"
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
                    <option value="Hindi">🇮🇳 Hindi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-stone-400 uppercase tracking-widest mb-2">Select Vibe & Tone</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {['High-energy & Viral', 'Luxurious & Premium', 'Casual & Friendly'].map((item) => (
                      <button
                        key={item}
                        onClick={() => setVibe(item)}
                        className={`px-4 py-4 rounded-[1.25rem] text-xs font-bold border transition-all duration-300 ${vibe === item
                          ? 'border-violet-200 bg-gradient-to-br from-violet-50 to-white text-violet-700 shadow-[0_4px_14px_rgba(139,92,246,0.15)] scale-[1.02]'
                          : 'border-stone-200 bg-white text-stone-500 hover:border-violet-300'
                          }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                  {/* Left Column: Live Reel Preview */}
                  <div className="lg:col-span-1 max-w-[280px] mx-auto w-full">
                    <div className="relative aspect-[9/16] bg-stone-900 rounded-[2rem] overflow-hidden border-[6px] border-stone-100 shadow-[0_20px_40px_rgba(0,0,0,0.1)] flex flex-col justify-between">
                      {/* Background (First Media or Sample Reel) */}
                      {previewUrls.length > 0 ? (
                        <div className="absolute inset-0">
                          {files[0].type.startsWith('video') ? (
                            <video src={previewUrls[0]} className="w-full h-full object-cover opacity-80" muted autoPlay loop />
                          ) : (
                            <img src={previewUrls[0]} className="w-full h-full object-cover opacity-80" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                        </div>
                      ) : (
                        <div className="absolute inset-0">
                          <video src="/reel-7-july.mp4" className="w-full h-full object-cover opacity-80" muted autoPlay loop playsInline />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                        </div>
                      )}

                      {/* Reel UI Overlay */}
                      <div className="relative z-10 w-full h-full flex flex-col pt-12 pb-6 px-4">

                        {/* Dynamic Hook Render (No Background, High Contrast Text) */}
                        <div className="w-full flex justify-center">
                          <div
                            className={`text-center text-xl font-black uppercase transition-all duration-300 ${hookText ? 'text-white' : 'text-white/50'}`}
                            style={{
                              textShadow: hookText
                                ? '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 8px 16px rgba(0,0,0,0.8)'
                                : 'none',
                              WebkitTextStroke: hookText ? '1px black' : 'none'
                            }}
                          >
                            {hookText || "YOUR HOOK HERE"}
                          </div>
                        </div>

                        <div className="mt-auto flex items-end justify-between">
                          {/* Fake Caption Area */}
                          <div className="w-[70%] space-y-2">
                            <div className="h-3 w-1/3 bg-white/80 rounded-full shadow-sm" />
                            <div className="h-2 w-full bg-white/40 rounded-full shadow-sm" />
                            <div className="h-2 w-2/3 bg-white/40 rounded-full shadow-sm" />
                          </div>
                          {/* Fake Engagement Icons */}
                          <div className="flex flex-col gap-4">
                            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white/80"><Heart className="w-4 h-4" /></div>
                            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white/80"><FileText className="w-4 h-4" /></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-center text-[10px] font-black text-stone-400 mt-4 uppercase tracking-widest flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Live Preview
                    </p>
                  </div>

                  {/* Right Column: Inputs */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-stone-50/50 p-6 sm:p-8 rounded-[2rem] border border-stone-100/50 shadow-inner space-y-8">

                      {/* Hook Input */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-black text-stone-400 uppercase tracking-widest">Visual Overlay Hook</label>
                          <p className="text-[10px] font-bold text-stone-400 pb-1 uppercase tracking-widest leading-relaxed opacity-70">Bold title burned at the top of the video to grab attention.</p>
                        </div>
                        <Input
                          className="rounded-[1.25rem] border-stone-100 bg-white shadow-sm focus:ring-violet-200 focus:border-violet-300 h-14 px-5 text-sm font-bold transition-all"
                          placeholder="e.g. SECRET REVEALED..."
                          value={hookText}
                          onChange={(e) => setHookText(e.target.value)}
                        />
                      </div>

                      {/* Script Input */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="block text-[11px] font-black text-stone-400 uppercase tracking-widest">Voiceover Script & Subtitles</label>
                            <p className="text-[10px] font-bold text-stone-400 pb-1 uppercase tracking-widest leading-relaxed opacity-70">Keep it short (around 30-40 words for a 15-second reel).</p>
                          </div>
                          {!enableVoice && (
                            <span className="text-[9px] font-black text-amber-500 bg-amber-50 uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-amber-100/50">
                              Disabled
                            </span>
                          )}
                        </div>
                        <Textarea
                          rows={6}
                          disabled={!enableVoice}
                          className="rounded-[1.25rem] border-stone-100 bg-white shadow-sm focus:ring-violet-200 focus:border-violet-300 block w-full text-sm p-5 font-medium disabled:bg-stone-50/50 disabled:text-stone-400 transition-all resize-none"
                          placeholder={enableVoice ? "The script will be synthesized into voiceover and animated subtitles." : "Voiceover is disabled. No subtitles will be generated."}
                          value={scriptText}
                          onChange={(e) => setScriptText(e.target.value)}
                        />
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Audio & Voice Settings */}
        {currentStep === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Audio & Voice</h2>
              <p className="text-stone-500 font-medium">Select your AI voice persona and set the perfect background music.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Voiceover Settings */}
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-stone-50 p-4 rounded-2xl border border-stone-100/60 shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${enableVoice ? 'bg-violet-600 text-white shadow-md' : 'bg-white border border-stone-200 text-stone-400'}`}>
                      {enableVoice ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold">Voiceover</p>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">AI Narrator</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEnableVoice(!enableVoice)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${enableVoice ? 'bg-violet-600' : 'bg-stone-200'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${enableVoice ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className={`space-y-5 transition-all duration-300 ${!enableVoice ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-[11px] font-black text-stone-400 uppercase tracking-widest">Premium Voices</label>
                      <span className="text-[10px] font-bold text-[#D27D50] bg-[#FBF3EE] px-2.5 py-1 rounded-full uppercase tracking-widest">
                        {language}
                      </span>
                    </div>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {(VOICES_BY_LANGUAGE[language] || DEFAULT_VOICE_FALLBACK).map(voice => (
                        <div
                          key={voice.id}
                          onClick={() => setVoiceId(voice.id)}
                          className={`p-4 rounded-[1.25rem] border cursor-pointer transition-all duration-300 flex items-center gap-4 ${voiceId === voice.id
                            ? 'border-violet-300 bg-violet-50/30 shadow-[0_4px_14px_rgba(139,92,246,0.1)]'
                            : 'border-stone-100 bg-white hover:border-violet-200 hover:bg-stone-50'
                            }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 ${voiceId === voice.id ? 'border-violet-500 bg-violet-100 text-violet-700' : 'border-stone-100 bg-stone-50 text-stone-400'
                            }`}>
                            <Play className="h-4 w-4 ml-0.5" />
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-slate-900 leading-tight">{voice.name}</p>
                            <p className="text-[11px] font-medium text-stone-500 leading-tight mt-0.5">{voice.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Music Settings */}
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-stone-50 p-4 rounded-2xl border border-stone-100/60 shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${enableMusic ? 'bg-violet-600 text-white shadow-md' : 'bg-white border border-stone-200 text-stone-400'}`}>
                      <Music className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Background Music</p>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Cinematic Score</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEnableMusic(!enableMusic)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${enableMusic ? 'bg-violet-600' : 'bg-stone-200'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${enableMusic ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className={`space-y-5 transition-all duration-300 ${!enableMusic ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                  <div>
                    <label className="block text-[11px] font-black text-stone-400 uppercase tracking-widest mb-3">Music Source</label>
                    <div className="flex p-1.5 bg-stone-100 rounded-[1.25rem] shadow-inner">
                      <button
                        onClick={() => setMusicSource('ai')}
                        className={`flex-1 px-4 py-2.5 rounded-[1rem] text-xs font-bold transition-all ${musicSource === 'ai' ? 'bg-white text-violet-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                          }`}
                      >
                        AI Auto-Match
                      </button>
                      <button
                        onClick={() => setMusicSource('custom')}
                        className={`flex-1 px-4 py-2.5 rounded-[1rem] text-xs font-bold transition-all ${musicSource === 'custom' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                          }`}
                      >
                        Upload Custom
                      </button>
                    </div>
                  </div>

                  {musicSource === 'ai' ? (
                    <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100/50 p-6 rounded-[1.5rem] text-center">
                      <Sparkles className="h-8 w-8 text-violet-400 mx-auto mb-3 animate-pulse" />
                      <h4 className="text-sm font-bold text-violet-900 mb-1">AI Curated Score</h4>
                      <p className="text-xs text-violet-700/70 font-medium leading-relaxed">Our engine will automatically compose and align cinematic background music matching the vibe of your product reel.</p>
                    </div>
                  ) : (
                    <div className="mt-2 flex justify-center px-6 pt-8 pb-8 border-2 border-stone-200/70 border-dashed rounded-[1.5rem] hover:border-violet-300 transition-all bg-stone-50/30 hover:bg-violet-50/30 group cursor-pointer relative shadow-inner">
                      <input
                        type="file"
                        accept="audio/mpeg,audio/wav"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleCustomMusicChange}
                      />
                      <div className="space-y-3 text-center pointer-events-none">
                        <div className="w-12 h-12 bg-white rounded-[1rem] shadow-sm border border-stone-100 flex items-center justify-center mx-auto text-stone-400 group-hover:text-violet-600 transition-all">
                          <Upload className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-violet-600 group-hover:text-violet-500">Upload MP3/WAV</p>
                          {customMusicFile && (
                            <p className="text-[11px] font-bold text-stone-500 mt-1 truncate max-w-[200px] mx-auto bg-white px-3 py-1 rounded-full shadow-xs border border-stone-100">
                              {customMusicFile.name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Generate */}
        {currentStep === 4 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col items-center justify-center py-10">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Ready to Generate</h2>
              <p className="text-stone-500 font-medium max-w-md mx-auto leading-relaxed">Your media, script, and audio settings are locked in. Our AI engine will now synthesize everything into a premium vertical reel.</p>
            </div>

            <div className="w-full max-w-md bg-gradient-to-br from-stone-900 to-[#12141A] rounded-[2.5rem] p-10 text-white shadow-[0_30px_60px_rgba(15,23,42,0.2)] border border-slate-800 relative overflow-hidden text-center mt-6">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-500/20 rounded-full blur-[80px] pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center gap-8">

                {isGenerating ? (
                  <div className="bg-black/60 border border-white/10 rounded-[1.5rem] p-8 w-full shadow-[inset_0_0_40px_rgba(139,92,246,0.1)] space-y-5 backdrop-blur-xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                    <div className="flex flex-col items-center gap-5 relative z-10">
                      <div className="relative flex items-center justify-center">
                        <div className="w-14 h-14 border-[4px] border-violet-900/50 rounded-full absolute" />
                        <div className="w-14 h-14 border-[4px] border-violet-500 border-t-fuchsia-400 animate-spin rounded-full shadow-[0_0_25px_rgba(139,92,246,0.8)]" />
                        <Sparkles className="w-5 h-5 text-fuchsia-200 absolute animate-pulse" />
                      </div>
                      <div className="text-center space-y-1.5">
                        <span className="text-[17px] font-black bg-clip-text text-transparent bg-gradient-to-r from-violet-100 to-fuchsia-100 tracking-tight block drop-shadow-md">Synthesizing Masterpiece</span>
                        <p className="text-[10px] font-bold text-violet-300/80 uppercase tracking-[0.25em] animate-pulse">{statusMessage || 'Initializing...'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                      <p className="text-[20px] font-black text-white">{files.length}</p>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Media Files</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                      <p className="text-[20px] font-black text-white">{scriptText ? 'Yes' : 'No'}</p>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Voiceover</p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || files.length === 0}
                  className="w-full h-16 bg-violet-600 hover:bg-violet-500 disabled:bg-white/5 disabled:text-stone-500 text-white font-black rounded-2xl shadow-[0_8px_20px_rgba(139,92,246,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] gap-3 flex items-center justify-center text-sm uppercase tracking-[0.2em]"
                >
                  <Sparkles className="h-5 w-5" />
                  {isGenerating ? 'Synthesizing...' : 'Build Premium Reel'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="mt-auto pt-10 flex items-center justify-between border-t border-stone-100/50">
          <Button
            onClick={prevStep}
            disabled={currentStep === 1 || isGenerating}
            variant="outline"
            className="rounded-[1rem] h-12 px-6 font-bold text-stone-500 border-stone-200 hover:bg-stone-50 gap-2 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {currentStep === 2 && scriptMode === 'ai' ? (
            <Button
              onClick={() => {
                handleGenerateScript();
                setScriptMode('manual');
              }}
              disabled={isWritingScript || !prompt}
              className="rounded-[1rem] h-12 px-8 font-black text-white bg-violet-600 hover:bg-violet-700 shadow-[0_8px_20px_rgba(139,92,246,0.25)] gap-2 transition-all hover:scale-105 active:scale-95 text-xs uppercase tracking-widest"
            >
              <Wand2 className={`h-4 w-4 ${isWritingScript ? 'animate-spin' : ''}`} />
              {isWritingScript ? 'Writing...' : 'Generate Script'}
            </Button>
          ) : currentStep < 4 ? (
            <Button
              onClick={nextStep}
              className="rounded-[1rem] h-12 px-8 font-black text-white bg-slate-900 hover:bg-slate-800 shadow-[0_8px_20px_rgba(15,23,42,0.1)] gap-2 transition-all hover:scale-105 active:scale-95 text-xs uppercase tracking-widest"
            >
              Next Step
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="w-[100px]" /> /* Spacer to keep Back button on the left */
          )}
        </div>

      </div>
    </div>
  );
}