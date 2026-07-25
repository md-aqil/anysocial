'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, Image as ImageIcon, Loader2, Upload, Target, CheckCircle2, 
  XCircle, PenSquare, Maximize2, Film, Download, X, Video, Share2, 
  Check, ArrowLeft, Layers, Wand2, ExternalLink
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function PostCreatorPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [magicLink, setMagicLink] = useState('');
  const [scraping, setScraping] = useState(false);
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [usp, setUsp] = useState('');
  const [personality, setPersonality] = useState('');
  const [audience, setAudience] = useState('');
  const [platform, setPlatform] = useState('Instagram Feed (4:5)');
  const [mood, setMood] = useState('High energy');
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [referencePreviews, setReferencePreviews] = useState<string[]>([]);
  const refInputRef = useRef<HTMLInputElement>(null);

  // Directions State
  const [directions, setDirections] = useState<any[]>([]);
  const [selectedDirections, setSelectedDirections] = useState<any[]>([]);

  // Result State
  const [results, setResults] = useState<any[]>([]);

  // History State
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Animate Image-to-Video State
  const [animateModalOpen, setAnimateModalOpen] = useState(false);
  const [selectedAdForAnimate, setSelectedAdForAnimate] = useState<any>(null);
  const [animatePrompt, setAnimatePrompt] = useState('');
  const [animating, setAnimating] = useState(false);
  const [activeReelId, setActiveReelId] = useState<string | null>(null);
  const [animStatus, setAnimStatus] = useState<string | null>(null);
  const [animStatusMsg, setAnimStatusMsg] = useState('');
  const [animResultVideoUrl, setAnimResultVideoUrl] = useState<string | null>(null);
  
  // Rendered Video Map & View Mode per campaign
  const [renderedVideoMap, setRenderedVideoMap] = useState<Record<string, string>>({});
  const [viewModeMap, setViewModeMap] = useState<Record<string, 'image' | 'video'>>({});

  const openAnimateModal = (ad: any) => {
    setSelectedAdForAnimate(ad);
    const brief = ad.brief || {};
    const prodName = ad.productName || 'Product';
    const dirName = ad.direction || 'Creative Ad';
    
    // Extract metadata & image prompt information for deep scene analysis
    const imagePromptText = brief.imagePrompt || `High-end commercial advertisement featuring ${prodName}`;
    const visualSetup = brief.visualSceneSetup || brief.sceneSetup || brief.campaignConcept || `Professional studio showcase of ${prodName}`;
    const layoutEffects = brief.layoutAndEffects || 'Dynamic lighting, subtle motion blur, crisp reflections, premium composition';
    const taglineText = brief.tagline || '';
    const supportingText = brief.supportingCopy || brief.copy || '';

    // Synthesize Google Veo 3 JSON Prompt Guide structure (veo-3-prompting-guide format)
    const veo3JsonPrompt = JSON.stringify({
      "veo_model": "veo-3.0-fast-generate-001",
      "prompt_type": "image_to_video_motion_graphic",
      "subject": {
        "name": prodName,
        "direction": dirName,
        "details": imagePromptText,
        "physical_motion": `Full physical scene animation of ${prodName}. Subject dynamically moves with realistic temporal weight, surface reflections shift across materials, and physical properties animate with 3D depth.`
      },
      "environment_and_scene": {
        "setup": visualSetup,
        "effects": layoutEffects,
        "background_motion": "Background lighting shifts gracefully, subtle environmental particle effects float with volumetric depth, ambient light reflections glide across the scene."
      },
      "camera": {
        "movement": "Slow 3D push-in camera tracking shot with natural depth parallax effect",
        "framing": "9:16 vertical portrait composition"
      },
      "kinetic_typography": {
        "headline_text": taglineText,
        "supporting_text": supportingText,
        "animation_style": taglineText 
          ? `Kinetic typography motion graphics animating text "${taglineText}" with snappy keyframe scaling and entrance motion design.`
          : `Dynamic kinetic text animation with bold typography motion graphics.`
      },
      "cinematography_and_physics": {
        "lighting": "High-end commercial studio lighting, vibrant rim highlights, sharp focal clarity",
        "physics_realism": "Adheres strictly to physical weight, gravity, real-time natural human speed, and physical temporal consistency"
      }
    }, null, 2);
    
    setAnimatePrompt(veo3JsonPrompt);
    setAnimResultVideoUrl(null);
    setAnimStatus(null);
    setAnimStatusMsg('');
    setActiveReelId(null);
    setAnimateModalOpen(true);
  };

  const handleStartAnimation = async () => {
    if (!selectedAdForAnimate || !animatePrompt) return;
    setAnimating(true);
    setAnimStatus('PENDING');
    setAnimStatusMsg('Generating Kinetic Motion Graphic Video with Veo 3 Fast...');

    try {
      const res = await fetch('/api/veo/animate-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageUrl: selectedAdForAnimate.imageUrl,
          prompt: animatePrompt,
          model: 'veo-3.0-fast-generate-001',
          adId: selectedAdForAnimate.id
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to start video animation');
      }

      const data = await res.json();
      const reelId = data.data.reel.id;
      setActiveReelId(reelId);
      localStorage.setItem('postCreator_activeReelId', reelId);
      if (selectedAdForAnimate) {
        localStorage.setItem('postCreator_activeAd', JSON.stringify(selectedAdForAnimate));
      }
    } catch (err: any) {
      setAnimating(false);
      setAnimStatus('FAILED');
      setAnimStatusMsg(err.message || 'Error starting animation');
    }
  };

  // Restore in-flight active reel animation from localStorage on mount
  useEffect(() => {
    const savedReelId = localStorage.getItem('postCreator_activeReelId');
    const savedAdStr = localStorage.getItem('postCreator_activeAd');
    if (savedReelId) {
      setActiveReelId(savedReelId);
      setAnimating(true);
      setAnimStatus('GENERATING');
      setAnimStatusMsg('Resuming Google Veo 3 video rendering...');
      if (savedAdStr) {
        try {
          setSelectedAdForAnimate(JSON.parse(savedAdStr));
        } catch (e) {}
      }
    }
  }, []);

  useEffect(() => {
    if (!activeReelId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/veo/status/${activeReelId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (!res.ok) return;
        const result = await res.json();
        const reel = result.data;
        if (reel) {
          setAnimStatus(reel.status);
          setAnimStatusMsg(reel.statusMessage || 'Processing video...');
          if (reel.status === 'READY') {
            setAnimResultVideoUrl(reel.videoUrl);
            setAnimating(false);
            localStorage.removeItem('postCreator_activeReelId');
            localStorage.removeItem('postCreator_activeAd');

            if (selectedAdForAnimate?.id) {
              const adId = selectedAdForAnimate.id;
              setRenderedVideoMap(prev => ({ ...prev, [adId]: reel.videoUrl }));
              setViewModeMap(prev => ({ ...prev, [adId]: 'video' }));
              setHistory(prev => prev.map(item => item.id === adId ? { ...item, videoUrl: reel.videoUrl } : item));
            }
            clearInterval(interval);
          } else if (reel.status === 'FAILED') {
            setAnimating(false);
            localStorage.removeItem('postCreator_activeReelId');
            localStorage.removeItem('postCreator_activeAd');
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Failed to poll reel status', err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeReelId, selectedAdForAnimate]);


  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/ad-creator/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleMagicLink = async () => {
    if (!magicLink) return;
    setScraping(true);
    setError(null);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: magicLink })
      });
      
      if (!res.ok) throw new Error('Failed to extract data from link');
      
      const data = await res.json();
      
      if (data.title) setProductName(data.title);
      if (data.description) setDescription(data.description);
      
      if (data.images && data.images.length > 0) {
        const fetchedFiles: File[] = [];
        const fetchedPreviews: string[] = [];
        for (let i = 0; i < Math.min(data.images.length, 4); i++) {
          try {
            const proxyUrl = `/api/scrape/proxy-image?url=${encodeURIComponent(data.images[i])}`;
            const imgRes = await fetch(proxyUrl);
            if (imgRes.ok) {
              const blob = await imgRes.blob();
              const file = new File([blob], `imported-product-${i + 1}.jpg`, { type: blob.type || 'image/jpeg' });
              fetchedFiles.push(file);
              fetchedPreviews.push(URL.createObjectURL(file));
            }
          } catch (e) {
            console.warn('Failed to proxy scraped image', e);
          }
        }
        if (fetchedFiles.length > 0) {
          setImageFiles(prev => [...prev, ...fetchedFiles].slice(0, 4));
          setImagePreviews(prev => [...prev, ...fetchedPreviews].slice(0, 4));
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setScraping(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const newFiles = [...imageFiles, ...selectedFiles].slice(0, 4);
      setImageFiles(newFiles);
      setImagePreviews(newFiles.map(f => URL.createObjectURL(f)));
    }
  };

  const removeImageFile = (index: number) => {
    const updatedFiles = imageFiles.filter((_, i) => i !== index);
    setImageFiles(updatedFiles);
    setImagePreviews(updatedFiles.map(f => URL.createObjectURL(f)));
  };

  const handleReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const newFiles = [...referenceFiles, ...selectedFiles].slice(0, 4);
      setReferenceFiles(newFiles);
      setReferencePreviews(newFiles.map(f => URL.createObjectURL(f)));
    }
  };

  const removeReferenceFile = (index: number) => {
    const updatedFiles = referenceFiles.filter((_, i) => i !== index);
    setReferenceFiles(updatedFiles);
    setReferencePreviews(updatedFiles.map(f => URL.createObjectURL(f)));
  };

  const handleClearForm = () => {
    setProductName('');
    setDescription('');
    setUsp('');
    setPersonality('');
    setAudience('');
    setMagicLink('');
    setSpecialInstructions('');
    setImageFiles([]);
    setImagePreviews([]);
    setReferenceFiles([]);
    setReferencePreviews([]);
    setStep(1);
    setDirections([]);
    setSelectedDirections([]);
    setResults([]);
    setError(null);
  };

  const handleGenerateDirections = async () => {
    if (!productName || !description) {
        setError("Product Name and Description are required to brainstorm directions.");
        return;
    }
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      imageFiles.forEach(file => {
        formData.append('images', file);
      });
      referenceFiles.forEach(refFile => {
        formData.append('referenceImages', refFile);
      });
      formData.append('productName', productName);
      formData.append('description', description);
      formData.append('usp', usp);
      formData.append('personality', personality);
      formData.append('audience', audience);
      formData.append('platform', platform);
      formData.append('mood', mood);
      if (specialInstructions) {
        formData.append('specialInstructions', specialInstructions);
      }

      const res = await fetch('/api/ad-creator/directions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate directions');
      }

      const data = await res.json();
      setDirections(data.directions);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAd = async () => {
    if (selectedDirections.length === 0) return;
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const generatedResults = [];
      for (const direction of selectedDirections) {
          const formData = new FormData();
          formData.append('productName', productName);
          formData.append('direction', JSON.stringify(direction));
          formData.append('platform', platform);
          if (specialInstructions) {
            formData.append('specialInstructions', specialInstructions);
          }
          imageFiles.forEach(file => {
            formData.append('images', file);
          });
          referenceFiles.forEach(refFile => {
            formData.append('referenceImages', refFile);
          });

          const res = await fetch('/api/ad-creator/generate', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to generate ad');
          }

          const data = await res.json();
          generatedResults.push({ brief: data.brief, imageUrl: data.imageUrl, direction });
          // Update the UI progressively
          setResults([...generatedResults]);
          
          if (generatedResults.length === 1) {
            setStep(3); // Move to results view as soon as first ad is ready
          }
      }
      
      fetchHistory();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComposePost = (brief: any, imageUrl: string, videoUrl?: string) => {
    const postData = {
      content: `${brief.tagline ? brief.tagline + '\n\n' : ''}${brief.supportingCopy ? brief.supportingCopy + '\n\n' : ''}${brief.copy || ''}\n\n${brief.callToAction || ''}`.trim(),
      mediaUrls: videoUrl ? [videoUrl] : (imageUrl ? [imageUrl] : [])
    };
    localStorage.setItem('composeAdData', JSON.stringify(postData));
    router.push('/dashboard/posts/new');
  };

  const handleComposeEntireCampaign = (items: any[]) => {
    if (!items || items.length === 0) return;

    const firstItem = items[0];
    const prodName = firstItem.productName || productName || 'Product Campaign';

    // Gather all media URLs (prefer videoUrl if animated, else imageUrl)
    const mediaUrls = items
      .map(item => item.videoUrl || renderedVideoMap[item.id] || item.imageUrl)
      .filter(Boolean);

    const firstBrief = firstItem.brief || {};
    const mainTagline = firstBrief.tagline ? `✨ ${firstBrief.tagline}\n\n` : '';
    const mainCopy = firstBrief.supportingCopy || firstBrief.copy || '';
    const mainCta = firstBrief.callToAction ? `\n\n${firstBrief.callToAction}` : '';

    const slideSummaries = items.map((item, idx) => {
      const b = item.brief || {};
      const t = b.tagline ? `"${b.tagline}"` : (item.direction || `Option ${idx + 1}`);
      return `Slide ${idx + 1}: ${t}`;
    }).join('\n');

    const fullCaption = `🚀 ${prodName.toUpperCase()}\n\n${mainTagline}${mainCopy}${mainCta}\n\n📸 Carousel Collection (${items.length} Variations):\n${slideSummaries}\n\n👉 Swipe to explore all creative styles!`.trim();

    const postData = {
      content: fullCaption,
      mediaUrls
    };

    localStorage.setItem('composeAdData', JSON.stringify(postData));
    router.push('/dashboard/posts/new');
  };

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
      {/* Header & Step Indicator */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 text-white rounded-[32px] p-8 lg:p-10 shadow-2xl border border-stone-800/80 relative overflow-hidden">
        {/* Ambient Glow Backdrop */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-black uppercase tracking-widest">
            <Wand2 className="w-3.5 h-3.5" /> AI Ad Studio & Art Director
          </div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-white">
            Create High-Converting Visual Campaigns
          </h1>
          <p className="text-stone-300 text-sm max-w-xl font-medium">
            Generate product-identical commercial ads with AI model pose, camera angle, and aesthetic style transfer.
          </p>
        </div>

        {/* Step Progress Pills */}
        <div className="flex items-center gap-2 z-10 shrink-0 bg-stone-900/90 backdrop-blur-md p-2 rounded-2xl border border-stone-800/90 shadow-inner">
          <div className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${step === 1 ? 'bg-gradient-to-r from-[#D27D50] to-rose-500 text-white shadow-md' : 'text-stone-400'}`}>
            <span>1. Brief & Assets</span>
          </div>
          <div className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${step === 2 ? 'bg-gradient-to-r from-[#D27D50] to-rose-500 text-white shadow-md' : 'text-stone-400'}`}>
            <span>2. Directions</span>
          </div>
          <div className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${step === 3 ? 'bg-gradient-to-r from-[#D27D50] to-rose-500 text-white shadow-md' : 'text-stone-400'}`}>
            <span>3. Studio</span>
          </div>
        </div>
      </div>

      {/* Active Motion Graphic Video Progress Banner (Survives Refresh & Tab Switching) */}
      {activeReelId && animating && (
        <div className="mb-8 p-5 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white rounded-2xl border border-stone-700 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-500">
          <div className="flex items-center gap-3.5">
            <div className="bg-orange-500/20 p-2.5 rounded-xl border border-orange-500/30 shrink-0">
              <Loader2 className="w-6 h-6 text-[#D27D50] animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-black uppercase tracking-wider text-[#D27D50]">Google Veo 3 Motion Video Engine</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">In Progress</span>
              </div>
              <p className="text-sm font-bold text-stone-200">{animStatusMsg || 'Rendering video in background...'}</p>
            </div>
          </div>
          
          <Button
            onClick={() => setAnimateModalOpen(true)}
            className="bg-gradient-to-r from-[#D27D50] to-rose-500 hover:from-[#b86d45] hover:to-rose-600 text-white font-bold rounded-xl px-5 py-2.5 shadow-md flex items-center gap-2 text-xs shrink-0"
          >
            <Film className="w-4 h-4 text-white" />
            <span>Open Motion Graphic Live Preview</span>
          </Button>
        </div>
      )}

      {error && (
        <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-2xl font-medium border border-red-100 flex items-center gap-3 shadow-sm">
          <XCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Step 1: Input */}
      {step === 1 && (
        <div className="bg-gradient-to-br from-[#1C1814] via-[#241F1A] to-[#171310] text-white rounded-[36px] p-8 lg:p-10 shadow-[0_25px_70px_rgba(0,0,0,0.3)] border border-amber-500/20 grid grid-cols-1 lg:grid-cols-2 gap-10 relative overflow-hidden">
          {/* Ambient Lighting Accents */}
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-amber-500/10 blur-[90px] rounded-full pointer-events-none"></div>
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-rose-500/10 blur-[90px] rounded-full pointer-events-none"></div>

          <div className="space-y-6 relative z-10">
            <h2 className="text-xl font-extrabold text-white border-b border-stone-800 pb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-amber-400" />
              <span>1. Visual Assets & Inspiration</span>
            </h2>
            
            {/* Magic Link Box */}
            <div className="bg-stone-900/90 border border-amber-500/30 rounded-2xl p-4 shadow-lg backdrop-blur-md hover:border-amber-400/50 transition-colors">
              <label className="block text-xs font-black text-amber-200 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                  Magic Link Import
                </span>
                <span className="text-[10px] text-amber-300 bg-amber-500/20 font-bold px-2.5 py-0.5 rounded-md border border-amber-400/30">Auto-Extract Photos</span>
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={magicLink} 
                  onChange={e => setMagicLink(e.target.value)} 
                  className="flex-1 bg-stone-950 border border-stone-800 text-stone-100 placeholder-stone-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all font-medium" 
                  placeholder="Paste Shopify, Amazon, or store product URL..." 
                />
                <Button onClick={handleMagicLink} disabled={scraping || !magicLink} className="bg-gradient-to-r from-[#D27D50] via-amber-600 to-rose-500 hover:from-[#b86d45] hover:to-rose-600 text-white rounded-xl px-6 transition-all shadow-md font-bold text-sm">
                  {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product Photos (Identity Lock) */}
              <div className="bg-gradient-to-br from-stone-900/90 via-stone-900/60 to-stone-950/80 border-2 border-dashed border-amber-500/40 rounded-3xl p-5 flex flex-col justify-between min-h-[230px] relative shadow-inner hover:border-amber-400/70 transition-all group/prodCard">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  className="hidden" 
                  accept="image/*" 
                  multiple 
                />
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                      <span>Product Photos</span>
                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/30">🔒 Identity Lock</span>
                    </h4>
                    <p className="text-[11px] text-stone-400 font-medium">Original product stays 100% identical ({imagePreviews.length}/4)</p>
                  </div>
                  {imagePreviews.length < 4 && (
                    <Button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()} 
                      className="bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-black rounded-xl h-8 px-3 shadow-xs"
                    >
                      + Add Photo
                    </Button>
                  )}
                </div>

                {imagePreviews.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {imagePreviews.map((src, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-stone-800 shadow-sm group">
                        <img src={src} alt={`Product ${idx+1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeImageFile(idx); }}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex flex-col items-center justify-center cursor-pointer border border-dashed border-stone-800 rounded-2xl p-4 hover:bg-stone-900/80 transition-colors"
                  >
                    <div className="w-10 h-10 bg-stone-900 rounded-full flex items-center justify-center mb-2 shadow-xs border border-amber-500/30">
                      <Upload className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="font-bold text-xs text-stone-200 text-center">
                      Upload Product Shots<br/>
                      <span className="text-stone-400 font-normal text-[11px]">Upload front, angle, or fabric close-ups</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Pose & Style Reference Photos */}
              <div className="bg-gradient-to-br from-stone-900/90 via-stone-900/60 to-stone-950/80 border-2 border-dashed border-emerald-500/40 rounded-3xl p-5 flex flex-col justify-between min-h-[230px] relative shadow-inner hover:border-emerald-400/70 transition-all group/refCard">
                <input 
                  type="file" 
                  ref={refInputRef} 
                  onChange={handleReferenceChange} 
                  className="hidden" 
                  accept="image/*" 
                  multiple 
                />
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                      <span>Pose & Style References</span>
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30">🎨 Style Transfer</span>
                    </h4>
                    <p className="text-[11px] text-stone-400 font-medium">Model pose, lighting & aesthetic ({referencePreviews.length}/4)</p>
                  </div>
                  {referencePreviews.length < 4 && (
                    <Button 
                      type="button"
                      onClick={() => refInputRef.current?.click()} 
                      className="bg-emerald-500 hover:bg-emerald-600 text-stone-950 text-xs font-black rounded-xl h-8 px-3 shadow-xs"
                    >
                      + Add Ref
                    </Button>
                  )}
                </div>

                {referencePreviews.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {referencePreviews.map((src, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-stone-800 shadow-sm group">
                        <img src={src} alt={`Reference ${idx+1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeReferenceFile(idx); }}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div 
                    onClick={() => refInputRef.current?.click()}
                    className="flex-1 flex flex-col items-center justify-center cursor-pointer border border-dashed border-stone-800 rounded-2xl p-4 hover:bg-stone-900/80 transition-colors"
                  >
                    <div className="w-10 h-10 bg-stone-900 rounded-full flex items-center justify-center mb-2 shadow-xs border border-emerald-500/30">
                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="font-bold text-xs text-stone-200 text-center">
                      Upload Pose / Style References<br/>
                      <span className="text-stone-400 font-normal text-[11px]">Upload model poses, lighting, or aesthetic inspiration</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Special Style & Pose Instructions Input */}
            <div className="bg-stone-950/90 border border-amber-500/30 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-2">
              <label className="block text-xs font-black text-white tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Special Style & Pose Instructions <span className="text-stone-400 font-normal lowercase">(optional)</span>
                </span>
                <span className="text-[9px] text-amber-300 font-black uppercase tracking-wider bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-400/30">AI Guidance</span>
              </label>
              <textarea
                value={specialInstructions}
                onChange={e => setSpecialInstructions(e.target.value)}
                rows={2}
                className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-amber-200 placeholder-stone-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 resize-none transition-shadow font-medium"
                placeholder='e.g. "Focus on model posture and warm sunset studio lighting from Reference #1, keep the model on a luxury marble balcony overlooking the ocean."'
              />
            </div>
          </div>

          <div className="space-y-6 relative z-10">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-400" />
                <span>2. Campaign Brief & Specs</span>
              </h2>
              <Button onClick={handleClearForm} variant="ghost" className="text-stone-400 hover:text-red-400 font-semibold h-8 px-3 rounded-lg text-xs">Clear Form</Button>
            </div>
            
            <div>
              <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-1.5">Product Name <span className="text-red-400">*</span></label>
              <input type="text" value={productName} onChange={e => setProductName(e.target.value)} className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-shadow shadow-xs font-medium" placeholder="e.g. Aura Smart Mug" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-1.5">Core USP</label>
                <input type="text" value={usp} onChange={e => setUsp(e.target.value)} className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-shadow shadow-xs font-medium" placeholder="Keeps coffee hot all day" />
              </div>
              <div>
                <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-1.5">Platform</label>
                <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-shadow shadow-xs font-medium">
                  <option>Instagram Feed (4:5)</option>
                  <option>Instagram Stories (9:16)</option>
                  <option>Landscape Post (16:9)</option>
                  <option>Square Ad (1:1)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-1.5">Personality</label>
                <input type="text" value={personality} onChange={e => setPersonality(e.target.value)} className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-shadow shadow-xs font-medium" placeholder="Bold, premium, tech" />
              </div>
              <div>
                <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-1.5">Target Audience</label>
                <input type="text" value={audience} onChange={e => setAudience(e.target.value)} className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-shadow shadow-xs font-medium" placeholder="Remote workers, creatives" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-1.5">Brief Description <span className="text-red-400">*</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 resize-none transition-shadow shadow-xs font-medium" placeholder="A matte black smart mug with a glowing LED ring at the base..." />
            </div>

            <div className="pt-3">
              <Button 
                onClick={handleGenerateDirections} 
                disabled={loading || !productName || !description}
                className="w-full bg-gradient-to-r from-[#D27D50] via-rose-500 to-[#C26032] hover:from-[#b86d45] hover:to-rose-600 text-white rounded-2xl h-14 font-extrabold text-base transition-all shadow-xl shadow-orange-500/25 hover:scale-[1.005] uppercase tracking-wider"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                {loading ? 'Brainstorming Directions...' : 'Propose 5 Creative Directions'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Directions Selection */}
      {step === 2 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
          {/* Header Bar */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-[#D27D50] block mb-0.5">Step 2 of 3</span>
              <h2 className="text-2xl font-black text-stone-900 tracking-tight">Select Creative Directions</h2>
              <p className="text-xs font-medium text-stone-500">Choose one or more directions for your final ad assets.</p>
            </div>
            
            <div className="flex items-center gap-2.5">
              <Button 
                variant="outline" 
                onClick={() => {
                  if (selectedDirections.length === directions.length) {
                    setSelectedDirections([]);
                  } else {
                    setSelectedDirections([...directions]);
                  }
                }} 
                className="font-bold text-xs rounded-xl border-stone-200 hover:bg-stone-50 h-10 px-4"
              >
                {selectedDirections.length === directions.length ? 'Deselect All' : 'Select All (5)'}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setStep(1)} 
                className="text-stone-600 hover:text-stone-900 font-bold text-xs h-10 px-3 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Brief</span>
              </Button>
            </div>
          </div>

          {/* Compact Directions Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {directions.map((dir, idx) => {
              const isSelected = selectedDirections.some(d => d.id === dir.id);
              return (
                <div 
                  key={idx}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedDirections(selectedDirections.filter(d => d.id !== dir.id));
                    } else {
                      setSelectedDirections([...selectedDirections, dir]);
                    }
                  }}
                  className={`bg-white rounded-2xl p-5 cursor-pointer border-2 transition-all duration-300 flex flex-col justify-between group ${
                    isSelected 
                      ? 'border-[#D27D50] shadow-md shadow-[#D27D50]/10 bg-amber-50/20 -translate-y-0.5' 
                      : 'border-stone-200 hover:border-stone-300 hover:shadow-sm'
                  }`}
                >
                  <div>
                    {/* Header Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        isSelected 
                          ? 'bg-[#D27D50] text-white shadow-xs' 
                          : 'bg-stone-100 text-stone-600 group-hover:bg-stone-200'
                      }`}>
                        Option {idx + 1}
                      </span>
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-[#D27D50] text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-stone-200 group-hover:border-stone-300" />
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-black text-stone-900 mb-2 leading-snug group-hover:text-[#D27D50] transition-colors">
                      {dir.title}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-xs font-medium text-stone-600 leading-relaxed line-clamp-3 mb-4">
                      {dir.description}
                    </p>
                  </div>

                  {/* Toggle Status Pill */}
                  <div className={`mt-auto pt-3 border-t text-center transition-colors ${isSelected ? 'border-amber-200/60' : 'border-stone-100'}`}>
                    <span className={`text-[11px] font-bold inline-flex items-center gap-1 ${
                      isSelected ? 'text-[#D27D50]' : 'text-stone-400 group-hover:text-stone-600'
                    }`}>
                      {isSelected ? '✓ Direction Selected' : '+ Click to Select'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
            <span className="text-xs font-bold text-stone-500">
              {selectedDirections.length} of {directions.length} directions selected
            </span>
            <Button 
              onClick={handleGenerateAd}
              disabled={loading || selectedDirections.length === 0}
              className="bg-gradient-to-r from-[#D27D50] to-rose-500 hover:from-[#b86d45] hover:to-rose-600 text-white rounded-xl font-black px-8 h-12 shadow-lg hover:shadow-orange-500/20 transition-all text-sm w-full sm:w-auto flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
              <span>{loading ? 'Generating Final Assets...' : `Generate Campaigns (${selectedDirections.length})`}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 3 && results.length > 0 && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* Step 3 Campaign Container Header */}
          <div className="bg-stone-900 text-white rounded-3xl p-6 lg:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-stone-800">
            <div>
              <span className="text-[#D27D50] font-black text-xs uppercase tracking-widest block mb-1">
                Generated Campaign • {results.length} Post Variations
              </span>
              <h2 className="text-3xl font-black tracking-tight">{productName}</h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <Button 
                onClick={() => handleComposeEntireCampaign(results)}
                className="bg-gradient-to-r from-[#D27D50] to-rose-500 hover:from-[#b86d45] hover:to-rose-600 text-white font-black rounded-xl h-12 px-6 shadow-lg flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Compose Entire Campaign ({results.length} Images/Videos)</span>
              </Button>
              <Button variant="outline" onClick={handleClearForm} disabled={loading} className="border-stone-700 text-stone-300 hover:bg-stone-800 font-bold rounded-xl h-12 px-5">
                Start New Campaign
              </Button>
            </div>
          </div>

          <div className="space-y-16">
            {results.map((result, idx) => (
                <div key={idx} className="bg-white rounded-3xl p-8 shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-stone-100 overflow-hidden">
                    <div className="mb-8 flex items-center justify-between border-b border-stone-100 pb-6">
                        <div>
                            <span className="text-[#D27D50] font-bold text-sm tracking-widest uppercase mb-1 block">Direction {idx + 1}</span>
                            <h3 className="text-2xl font-black text-stone-900">{result.direction.title}</h3>
                        </div>
                        <Button 
                            onClick={() => handleComposePost(result.brief, result.imageUrl)}
                            className="bg-black hover:bg-stone-800 text-white rounded-xl font-bold h-12 px-6 shadow-md transition-transform hover:-translate-y-0.5"
                        >
                            <PenSquare className="w-4 h-4 mr-2" />
                            Compose This Post
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="flex flex-col group">
                            <div className="relative w-full aspect-[4/5] max-h-[600px] bg-stone-50 rounded-2xl overflow-hidden flex items-center justify-center p-4 border border-stone-100 shadow-inner">
                                {result.imageUrl ? (
                                    <img src={result.imageUrl} alt="Generated Ad" className="w-full h-full object-contain drop-shadow-2xl rounded-lg" />
                                ) : (
                                    <p className="text-stone-500 font-medium">Image Generation Failed</p>
                                )}
                            </div>
                            <div className="mt-4">
                                <a 
                                    href={result.imageUrl || '#'} 
                                    download={`ad_${productName.replace(/\s+/g, '_')}_${Date.now()}.jpg`}
                                    className="w-full flex items-center justify-center px-4 py-4 bg-stone-50 border-2 border-stone-200 text-stone-700 text-sm font-black rounded-xl hover:bg-stone-100 transition-colors uppercase tracking-widest"
                                >
                                    Download High-Res Image
                                </a>
                            </div>
                        </div>

                        <div className="overflow-y-auto max-h-[650px] pr-4 space-y-8">
                            <div>
                                <h4 className="text-xs font-bold text-[#D27D50] uppercase tracking-wider mb-2">Campaign Concept</h4>
                                <p className="text-stone-700 font-medium whitespace-pre-wrap">{result.brief.campaignConcept}</p>
                            </div>
                            
                            <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">Tagline</h4>
                                <p className="text-3xl font-black text-stone-900 leading-tight">"{result.brief.tagline}"</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Supporting Copy</h4>
                                    <p className="text-stone-700 font-medium whitespace-pre-wrap leading-relaxed">{result.brief.supportingCopy || result.brief.copy}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Call to Action</h4>
                                    <p className="text-stone-700 font-medium whitespace-pre-wrap leading-relaxed">{result.brief.callToAction}</p>
                                </div>
                            </div>

                            <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100 space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Visual Scene Setup</h4>
                                    <p className="text-sm text-stone-600 leading-relaxed">{result.brief.visualSceneSetup || result.brief.sceneSetup}</p>
                                </div>
                                
                                <div>
                                    <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Layout & Brand Integration</h4>
                                    <p className="text-sm text-stone-600 mb-2"><span className="font-bold text-stone-700">Layout & Effects:</span> {result.brief.layoutAndEffects}</p>
                                    <p className="text-sm text-stone-600"><span className="font-bold text-stone-700">Brand Integration:</span> {result.brief.brandIntegration}</p>
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="text-xs font-bold text-[#D27D50] uppercase tracking-wider mb-2">Creative Rationale</h4>
                                <p className="text-sm text-stone-600 italic leading-relaxed">{result.brief.creativeRationale}</p>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
          </div>
        </div>
      )}

      {/* History Section */}
      <div className="mt-24 border-t border-stone-200 pt-16">
        <h2 className="text-3xl font-black text-stone-800 mb-8 flex items-center gap-3 tracking-tight">
          <Sparkles className="w-8 h-8 text-[#D27D50]" />
          Campaign Archive
        </h2>
        
        {loadingHistory ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-stone-300 animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center p-16 bg-stone-50 rounded-3xl border border-stone-100">
            <ImageIcon className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-500 font-medium text-lg">No past campaigns found.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {(() => {
              // Group history into separate Campaign Cards
              const campaignGroups: {
                campaignId: string;
                productName: string;
                platform: string;
                createdAt: string;
                items: any[];
              }[] = [];

              history.forEach((item) => {
                const itemTime = new Date(item.createdAt).getTime();
                const existing = campaignGroups.find((g) => {
                  if ((g.productName || '').toLowerCase() !== (item.productName || '').toLowerCase()) return false;
                  const groupTime = new Date(g.createdAt).getTime();
                  return Math.abs(itemTime - groupTime) < 15 * 60 * 1000;
                });

                if (existing) {
                  existing.items.push(item);
                } else {
                  campaignGroups.push({
                    campaignId: item.id,
                    productName: item.productName || 'Creative Campaign',
                    platform: item.platform || 'INSTAGRAM',
                    createdAt: item.createdAt,
                    items: [item]
                  });
                }
              });

              return campaignGroups.map((group) => {
                const groupRefImg = group.items.find(i => i.referenceImageUrl || i.brief?.referenceImageUrl)?.referenceImageUrl 
                  || group.items.find(i => i.brief?.referenceImageUrl)?.brief?.referenceImageUrl;

                return (
                  <div key={group.campaignId} className="bg-white rounded-[28px] p-6 lg:p-8 border border-stone-200/90 shadow-sm hover:shadow-md transition-all space-y-6">
                    {/* Separate Campaign Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-orange-100/80 text-[#D27D50] flex items-center justify-center font-bold">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <h3 className="text-2xl font-black text-stone-900 tracking-tight">{group.productName}</h3>
                          <span className="px-3 py-1 bg-stone-100 text-stone-700 text-xs font-black rounded-full uppercase tracking-wider border border-stone-200/60">
                            {group.platform}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-stone-500 pl-11 flex items-center gap-2">
                          <span>{group.items.length} Post Variations</span>
                          <span>•</span>
                          <span>Created {new Date(group.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Small Floating Reference Image Thumbnail in Top Right of Series Card Header */}
                        {groupRefImg && (
                          <a 
                            href={groupRefImg}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 bg-stone-900 text-white p-1.5 pr-3.5 rounded-2xl border border-stone-800 shadow-md hover:scale-105 transition-all group/refHead"
                            title="View Target Reference Style Photo"
                          >
                            <img src={groupRefImg} alt="Target Reference" className="w-9 h-9 rounded-xl object-cover border border-amber-400/80 shadow-xs" />
                            <div className="text-left">
                              <span className="text-[9px] font-black uppercase text-amber-300 block tracking-wider">Style Ref</span>
                              <span className="text-[10px] font-extrabold text-stone-200 flex items-center gap-1">
                                View <ExternalLink className="w-3 h-3 text-amber-300" />
                              </span>
                            </div>
                          </a>
                        )}

                        <Button
                          onClick={() => handleComposeEntireCampaign(group.items)}
                          className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 hover:from-stone-800 hover:to-stone-700 text-white rounded-2xl font-bold px-6 py-3 shadow-md flex items-center gap-2 text-xs"
                        >
                          <Share2 className="w-4 h-4 text-[#D27D50]" />
                          <span>Compose Entire Campaign ({group.items.length} Variations)</span>
                        </Button>
                      </div>
                    </div>

                    {/* Inside Campaign: Separate Post Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {group.items.map((ad: any) => {
                        const adVideoUrl = ad.videoUrl || renderedVideoMap[ad.id];
                        const currentViewMode = viewModeMap[ad.id] || (adVideoUrl ? 'video' : 'image');

                        return (
                          <div key={ad.id} className="bg-stone-50/50 rounded-2xl overflow-hidden border border-stone-200/80 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col group/card">
                            <div className="h-56 w-full bg-stone-950 relative overflow-hidden group/img">
                              {currentViewMode === 'video' && adVideoUrl ? (
                                <video src={adVideoUrl} controls autoPlay muted loop className="w-full h-full object-cover" />
                              ) : (
                                <img src={ad.imageUrl} alt={ad.productName} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105" />
                              )}

                              {/* Media Type Switcher */}
                              {adVideoUrl && (
                                <div className="absolute top-3 left-3 z-20 flex gap-1 bg-black/75 backdrop-blur-md p-1 rounded-xl border border-white/20 shadow-lg">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setViewModeMap(prev => ({ ...prev, [ad.id]: 'image' })); }}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all ${currentViewMode === 'image' ? 'bg-[#D27D50] text-white shadow-sm' : 'text-stone-300 hover:text-white'}`}
                                  >
                                    Photo
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setViewModeMap(prev => ({ ...prev, [ad.id]: 'video' })); }}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 ${currentViewMode === 'video' ? 'bg-gradient-to-r from-[#D27D50] to-rose-500 text-white shadow-sm' : 'text-stone-300 hover:text-white'}`}
                                  >
                                    <Film className="w-3 h-3 animate-pulse" /> Motion Video
                                  </button>
                                </div>
                              )}

                              {!adVideoUrl && (
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
                                  <a href={ad.imageUrl} target="_blank" rel="noopener noreferrer" className="bg-white/95 text-stone-900 hover:bg-white px-4 py-2 rounded-xl font-extrabold flex items-center gap-2 transform translate-y-4 group-hover/img:translate-y-0 transition-all duration-300 shadow-xl text-xs">
                                    <Maximize2 className="w-3.5 h-3.5" /> View High-Res
                                  </a>
                                </div>
                              )}

                              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none"></div>
                              <div className="absolute bottom-3 left-3 right-3">
                                <span className="text-white text-xs font-black uppercase tracking-wider block drop-shadow-md">
                                  {ad.direction}
                                </span>
                              </div>
                            </div>

                            <div className="p-5 flex-1 flex flex-col bg-white">
                              <p className="text-sm font-black text-stone-900 line-clamp-2 mb-1.5 leading-tight">"{ad.brief?.tagline || ''}"</p>
                              <p className="text-xs font-medium text-stone-500 line-clamp-2 mb-4 flex-1">{ad.brief?.supportingCopy || ad.brief?.copy || ''}</p>

                              <div className="flex gap-2 mt-auto pt-3 border-t border-stone-100">
                                <Button 
                                  onClick={() => openAnimateModal(ad)}
                                  className="flex-1 rounded-xl font-extrabold bg-gradient-to-r from-[#D27D50] via-orange-500 to-rose-500 hover:from-[#b86d45] hover:to-rose-600 text-white transition-all duration-300 shadow-md flex items-center justify-center gap-1.5 text-xs py-2.5"
                                >
                                  <Film className="w-3.5 h-3.5" />
                                  <span>{adVideoUrl ? 'Re-Animate' : 'Animate'}</span>
                                </Button>
                                <Button 
                                  onClick={() => handleComposePost(ad.brief, ad.imageUrl, adVideoUrl)}
                                  variant="outline"
                                  className="flex-1 rounded-xl font-extrabold border-stone-200 hover:border-[#D27D50] hover:text-[#D27D50] transition-colors flex items-center justify-center gap-1.5 text-xs py-2.5"
                                >
                                  <PenSquare className="w-3.5 h-3.5" />
                                  Compose
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Animate Modal */}
      {animateModalOpen && selectedAdForAnimate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto" onClick={() => setAnimateModalOpen(false)}>
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 lg:p-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setAnimateModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-2 rounded-full hover:bg-stone-100 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-[#D27D50]/10 text-[#D27D50] rounded-2xl">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-stone-900">Animate Image with Google Veo 3</h3>
                <p className="text-xs text-stone-500 font-medium">Turn your static ad into a cinematic motion short video</p>
              </div>
            </div>

            {/* Source Image & Details */}
            <div className="flex gap-4 p-4 bg-stone-50 border border-stone-100 rounded-2xl mb-6">
              <img src={selectedAdForAnimate.imageUrl} alt="Source" className="w-20 h-24 object-cover rounded-xl shadow-sm border border-stone-200 shrink-0" />
              <div className="flex-1 space-y-1 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#D27D50]">{selectedAdForAnimate.direction || 'Ad Campaign'}</span>
                <h4 className="font-bold text-stone-800 text-sm truncate">{selectedAdForAnimate.productName || 'Product'}</h4>
                <p className="text-xs text-stone-500 line-clamp-2">"{selectedAdForAnimate.brief?.tagline || ''}"</p>
              </div>
            </div>

            {/* Active Video Result */}
            {animResultVideoUrl ? (
              <div className="space-y-6">
                <div className="relative w-full aspect-[9/16] max-h-[400px] bg-black rounded-2xl overflow-hidden flex items-center justify-center mx-auto shadow-xl">
                  <video src={animResultVideoUrl} controls autoPlay className="w-full h-full object-contain" />
                </div>
                <div className="flex gap-3">
                  <a 
                    href={animResultVideoUrl} 
                    download={`veo_anim_${Date.now()}.mp4`}
                    className="flex-1 flex items-center justify-center px-4 py-3 bg-[#3C342C] text-white text-sm font-bold rounded-xl hover:bg-black transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" /> Download Video
                  </a>
                  <Button 
                    onClick={() => {
                      const postData = {
                        content: selectedAdForAnimate.brief ? `${selectedAdForAnimate.brief.tagline ? selectedAdForAnimate.brief.tagline + '\n\n' : ''}${selectedAdForAnimate.brief.supportingCopy || selectedAdForAnimate.brief.copy || ''}\n\n${selectedAdForAnimate.brief.callToAction || ''}`.trim() : '',
                        mediaUrls: [animResultVideoUrl]
                      };
                      localStorage.setItem('composeAdData', JSON.stringify(postData));
                      router.push('/dashboard/posts/new');
                    }}
                    className="flex-1 bg-[#D27D50] hover:bg-[#b86d45] text-white font-bold h-11 rounded-xl shadow-sm"
                  >
                    <PenSquare className="w-4 h-4 mr-2" /> Compose Post
                  </Button>
                </div>
              </div>
            ) : animating || animStatus ? (
              <div className="py-8 space-y-6 bg-stone-50 rounded-2xl border border-stone-200 p-6">
                {animStatus === 'FAILED' ? (
                  <div className="text-center space-y-4">
                    <XCircle className="w-12 h-12 text-red-500 mx-auto" />
                    <h4 className="font-bold text-stone-800 text-lg">Animation Failed</h4>
                    <p className="text-sm text-red-600 font-medium">{animStatusMsg}</p>
                    <Button onClick={() => { setAnimating(false); setAnimStatus(null); }} className="bg-[#D27D50] text-white font-bold rounded-xl px-6 py-2">Try Again</Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-stone-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 text-[#D27D50] animate-spin" />
                        <h4 className="font-bold text-stone-800 text-base">Rendering Motion Graphic Video</h4>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-[#D27D50] border border-orange-200">
                        Veo 3 Fast Engine
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 font-medium bg-white p-3 rounded-xl border border-stone-200">
                      {animStatusMsg || 'Generating kinetic motion graphic video...'}
                    </p>

                    <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-[#D27D50] to-rose-500 h-full animate-pulse rounded-full w-3/4"></div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Synthesized Veo 3 JSON Prompt Editor */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#D27D50]" />
                      Google Veo 3 JSON Prompt (Full Scene + Kinetic Typography Guide Format)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedAdForAnimate) openAnimateModal(selectedAdForAnimate);
                      }}
                      className="text-[11px] font-semibold text-[#D27D50] hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> Re-synthesize JSON Prompt
                    </button>
                  </div>
                  <textarea 
                    value={animatePrompt} 
                    onChange={e => setAnimatePrompt(e.target.value)} 
                    rows={8} 
                    className="w-full bg-stone-900 border border-stone-800 text-amber-300 font-mono rounded-2xl p-4 text-xs focus:outline-none focus:ring-2 focus:ring-[#D27D50]/40 transition-shadow leading-relaxed" 
                  />
                  <p className="text-[10px] text-stone-500 mt-1.5 italic">
                    Structured according to Google Veo 3 Prompting Guide JSON specification. Animates full scene physics (subject rotation, background particles, light reflections, camera tracking) AND kinetic typography.
                  </p>
                </div>

                <div className="pt-2 flex gap-3">
                  <Button 
                    onClick={() => setAnimateModalOpen(false)}
                    variant="outline"
                    className="flex-1 rounded-xl h-12 font-bold border-stone-200"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleStartAnimation}
                    disabled={!animatePrompt}
                    className="flex-1 bg-gradient-to-r from-[#D27D50] via-orange-500 to-rose-500 hover:from-[#b86d45] hover:to-rose-600 text-white rounded-xl h-12 font-bold shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                  >
                    <Film className="w-4 h-4" />
                    Generate Motion Graphic Video
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

