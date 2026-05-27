'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Upload, Sparkles, FileText, Music, Volume2, VolumeX, 
  Wand2, Trash2, ArrowLeft, X, Heart, HelpCircle
} from 'lucide-react';
import { uploadFile } from '@/lib/upload';
import { useRouter } from 'next/navigation';

export default function AIProductReelPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [enableMusic, setEnableMusic] = useState(true);
  const [enableVoice, setEnableVoice] = useState(true);
  const [scriptText, setScriptText] = useState('');
  const [hookText, setHookText] = useState('');
  
  // Custom interactive copywriting popup states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [whatMakesItHit, setWhatMakesItHit] = useState('');
  const [vibe, setVibe] = useState('High-energy & Viral');

  const [isWritingScript, setIsWritingScript] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const router = useRouter();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFiles = Array.from(event.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
      const urls = selectedFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...urls]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateScript = async () => {
    if (files.length === 0) {
      alert("Please upload at least one image/video clip to generate a script.");
      return;
    }
    setIsWritingScript(true);
    setIsModalOpen(false); // Close the beautiful modal
    setStatusMessage("Writing a high-retention viral script...");
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      // 4 seconds per asset
      const duration = Math.max(8, files.length * 4.0);

      const res = await fetch(`/api/reels/write-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt, whatMakesItHit, vibe, duration }),
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
          hookText
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

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-8 space-y-8 relative">
      
      {/* Interactive Beautiful Script Assistant Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-stone-200/80 space-y-6 transform scale-100 transition-transform duration-300 relative">
            
            {/* Modal Close Button */}
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-stone-100 transition-colors text-stone-400 hover:text-stone-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-violet-600 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-stone-900">Write Viral Script</h3>
              <p className="text-xs text-stone-500">Provide a few highlights about your product, and watch the magic happen.</p>
            </div>

            <div className="space-y-4">
              {/* Question 1: Product Name & Context */}
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Product Name & Context</label>
                <Input
                  className="rounded-xl border-stone-200 focus:ring-violet-500 shadow-xs text-sm"
                  placeholder="e.g. Organic Lavender Soap, premium leather wallet"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              {/* Question 2: What makes it a hit? */}
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">What makes this product a hit? (Key selling points)</label>
                <Textarea
                  rows={2}
                  className="rounded-xl border-stone-200 focus:ring-violet-500 shadow-xs text-sm"
                  placeholder="e.g. Eco-friendly packaging, leaves skin smooth, relaxing aroma"
                  value={whatMakesItHit}
                  onChange={(e) => setWhatMakesItHit(e.target.value)}
                />
              </div>

              {/* Question 3: Vibe Selector */}
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Select Vibe & Tone</label>
                <div className="grid grid-cols-3 gap-2">
                  {['High-energy & Viral', 'Luxurious & Premium', 'Casual & Friendly'].map((item) => (
                    <button
                      key={item}
                      onClick={() => setVibe(item)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                        vibe === item 
                          ? 'border-violet-600 bg-violet-50 text-violet-700 shadow-sm' 
                          : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 rounded-xl h-11 text-stone-600 border-stone-200 hover:bg-stone-50 font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateScript}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-11 font-bold shadow-lg"
              >
                Generate Script
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => router.push('/dashboard/reels-creator')} 
            className="flex items-center gap-2 text-stone-500 hover:text-stone-900 text-sm font-medium mb-3 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Reels
          </button>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-violet-600 animate-pulse" />
            AI Product Reel Creator
          </h1>
          <p className="text-stone-500 mt-2">Design, compose, and export studio-quality viral product clips in seconds.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Main settings & Media upload */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Media Upload Box */}
          <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-stone-900 mb-1">Product Media</h2>
              <p className="text-xs text-stone-500">Upload 9:16 vertical photos or video clips of your product. High-res images are best.</p>
            </div>

            <div className="mt-2 flex justify-center px-6 pt-8 pb-8 border-2 border-stone-200 border-dashed rounded-2xl hover:border-violet-400 transition-colors bg-stone-50/50 group cursor-pointer relative">
              <input 
                id="file-upload" 
                name="file-upload" 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                multiple 
                onChange={handleFileChange} 
              />
              <div className="space-y-2 text-center pointer-events-none">
                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto text-stone-400 group-hover:text-violet-600 transition-colors">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="flex text-sm text-stone-600 justify-center">
                  <span className="font-semibold text-violet-600 hover:text-violet-500">Upload files</span>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-stone-400">Supports JPG, PNG, WEBP, and MP4 (Up to 50MB)</p>
              </div>
            </div>

            {previewUrls.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Uploaded Media ({files.length})</span>
                  <button 
                    onClick={() => { setFiles([]); setPreviewUrls([]); }}
                    className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative aspect-9/16 group rounded-xl overflow-hidden border border-stone-200 bg-stone-100 shadow-xs">
                      {files[index].type.startsWith('video') ? (
                        <video src={url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={url} alt={`preview ${index}`} className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          onClick={() => removeFile(index)}
                          className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md transition-transform hover:scale-115"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Copywriting / Script Panel */}
          <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-stone-900 mb-1">Viral Copywriting & Scripts</h2>
                <p className="text-xs text-stone-500">Provide product details to generate script or compose your own.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (files.length === 0) {
                    alert("Please upload at least one image/video clip to generate a script.");
                    return;
                  }
                  setIsModalOpen(true);
                }}
                disabled={isWritingScript || files.length === 0}
                className="border-violet-200 text-violet-700 hover:bg-violet-50 font-semibold gap-1.5 rounded-xl shadow-xs"
              >
                <Wand2 className="h-4 w-4 text-violet-600 animate-pulse" />
                {isWritingScript ? 'Writing...' : 'Write with AI'}
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Product Description / Core Idea</label>
                <Textarea
                  rows={2}
                  className="rounded-xl border-stone-200 shadow-xs focus:ring-violet-500 focus:border-violet-500 block w-full text-sm"
                  placeholder="e.g. Handmade natural lavender soaps. Organic oils, moisturizing, soothing bedtime scent. 15% off launch special."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              {/* Dynamic Hook Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Visual Overlay Hook</label>
                  <Input
                    className="rounded-xl border-stone-200 shadow-xs focus:ring-violet-500 animate-pulse"
                    placeholder="e.g. SECRET REVEALED..."
                    value={hookText}
                    onChange={(e) => setHookText(e.target.value)}
                  />
                  <p className="text-[10px] text-stone-400 mt-1">Bold title burned at the top center of the reel.</p>
                </div>
                
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">Voiceover Script & Subtitles</label>
                    {!enableVoice && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                        Voiceover Disabled
                      </span>
                    )}
                  </div>
                  <Textarea
                    rows={4}
                    disabled={!enableVoice}
                    className="rounded-xl border-stone-200 shadow-xs focus:ring-violet-500 block w-full text-sm disabled:bg-stone-50 disabled:text-stone-400"
                    placeholder={enableVoice ? "Generate with AI above or type your custom script here. The script will be synthezised into voiceover and animated subtitles." : "Voiceover is disabled. No subtitles will be generated."}
                    value={scriptText}
                    onChange={(e) => setScriptText(e.target.value)}
                  />
                  {enableVoice && (
                    <p className="text-[10px] text-stone-400 mt-1">Keep it short (around 30-40 words for a 15-second reel) to sound natural and match the video speed. If left empty, voice narration is automatically bypassed.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Generation controls & Audio settings */}
        <div className="space-y-6">
          
          {/* Audio Setup Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 space-y-6">
            <h2 className="text-lg font-bold text-stone-900">Audio Composition</h2>

            <div className="space-y-4">
              {/* Voiceover Toggle */}
              <div 
                onClick={() => setEnableVoice(!enableVoice)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-center gap-4 ${
                  enableVoice 
                    ? 'border-violet-200 bg-violet-50/50 hover:bg-violet-50 text-stone-900' 
                    : 'border-stone-200 hover:bg-stone-50 text-stone-500'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${enableVoice ? 'bg-violet-600 text-white' : 'bg-stone-100 text-stone-400'}`}>
                  {enableVoice ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">Voiceover Narration</p>
                  <p className="text-xs text-stone-500 line-clamp-1">AI voiceover and word captions</p>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${enableVoice ? 'border-violet-600 bg-violet-600 text-white' : 'border-stone-300 bg-white'}`}>
                  {enableVoice && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>

              {/* BGM Toggle */}
              <div 
                onClick={() => setEnableMusic(!enableMusic)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-center gap-4 ${
                  enableMusic 
                    ? 'border-violet-200 bg-violet-50/50 hover:bg-violet-50 text-stone-900' 
                    : 'border-stone-200 hover:bg-stone-50 text-stone-500'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${enableMusic ? 'bg-violet-600 text-white' : 'bg-stone-100 text-stone-400'}`}>
                  <Music className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">Background Music</p>
                  <p className="text-xs text-stone-500 line-clamp-1">Tailored cinematic music track</p>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${enableMusic ? 'border-violet-600 bg-violet-600 text-white' : 'border-stone-300 bg-white'}`}>
                  {enableMusic && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>
            </div>
          </div>

          {/* Action Card */}
          <div className="bg-stone-900 rounded-3xl p-6 text-white space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-violet-500/20 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold">Generate Video</h3>
              <p className="text-xs text-stone-400">Our engine crops your media, adds dynamic zoompan, sequences clips, synthesizes voice, applies BGM, and merges the final vertical video.</p>
            </div>

            {isGenerating || isWritingScript ? (
              <div className="bg-stone-800/80 border border-stone-700/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent animate-spin rounded-full" />
                  <span className="text-xs font-bold text-stone-200">Processing Reel...</span>
                </div>
                <p className="text-[11px] text-stone-400 italic leading-relaxed">{statusMessage}</p>
              </div>
            ) : null}

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || files.length === 0}
              className="w-full h-12 bg-violet-600 hover:bg-violet-700 disabled:bg-stone-800 disabled:text-stone-500 text-white font-bold rounded-2xl shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] gap-2 flex items-center justify-center"
            >
              <Sparkles className="h-5 w-5" />
              {isGenerating ? 'Generating Video...' : 'Build Premium Reel'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}