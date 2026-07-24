'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sparkles, Image as ImageIcon, Loader2, Upload, Target, CheckCircle2, XCircle, PenSquare, Maximize2, Film, Download, X, Video } from 'lucide-react';
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
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
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
  const [animateScript, setAnimateScript] = useState('');
  const [animating, setAnimating] = useState(false);
  const [activeReelId, setActiveReelId] = useState<string | null>(null);
  const [animStatus, setAnimStatus] = useState<string | null>(null);
  const [animStatusMsg, setAnimStatusMsg] = useState('');
  const [animResultVideoUrl, setAnimResultVideoUrl] = useState<string | null>(null);

  const openAnimateModal = (ad: any) => {
    setSelectedAdForAnimate(ad);
    const brief = ad.brief || {};
    const prodName = ad.productName || 'Product';
    const dirName = ad.direction || 'Creative Ad';
    
    // Extract metadata & image prompt information
    const imagePromptText = brief.imagePrompt || '';
    const visualSetup = brief.visualSceneSetup || brief.sceneSetup || brief.campaignConcept || `High impact commercial ad scene featuring ${prodName}`;
    const taglineText = brief.tagline || '';
    const copyText = brief.supportingCopy || brief.copy || '';
    const ctaText = brief.callToAction || '';

    // Synthesize Google Veo 3 Prompt Guide format:
    // [Subject Details] + [Action & Kinetic Typography Motion] + [Camera Specs] + [Lighting & Environment] + [Style]
    const kineticTextDirective = taglineText 
      ? `Kinetic typography animation displaying dynamic animated text "${taglineText}" with snappy kinetic motion graphic transitions.`
      : `Dynamic kinetic text animation with bold kinetic typography motion graphics.`;

    let synthesizedPrompt = '';
    if (imagePromptText) {
      synthesizedPrompt = `Motion graphic video animating source ad image of ${prodName} (${dirName}). Subject & Details: "${imagePromptText}". Visual Action: ${visualSetup}. Motion Graphics & Text: ${kineticTextDirective} Sleek motion design graphic elements, smooth fluid transitions. Camera: Slow push-in tracking shot, locked 9:16 vertical portrait composition. Lighting & Aesthetic: Commercial studio lighting, vibrant reflections, ultra-clean background. High-end motion graphics video, physical temporal consistency, 4k resolution.`;
    } else {
      synthesizedPrompt = `Motion graphic video of ${prodName} (${dirName}). Subject & Details: ${prodName} hero product. Visual Scene: ${visualSetup}. Motion Graphics & Text: ${kineticTextDirective} Dynamic visual motion, sleek particle highlights. Camera: Smooth orbiting camera movement, 9:16 vertical portrait layout. Lighting & Aesthetic: Vibrant studio lighting, high contrast commercial graphic design. Photorealistic motion graphic video, 4k resolution.`;
    }
    
    const scriptText = `${taglineText ? taglineText + '\n\n' : ''}${copyText}\n\n${ctaText}`.trim();
    
    setAnimatePrompt(synthesizedPrompt);
    setAnimateScript(scriptText);
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
          script: animateScript,
          model: 'veo-3.0-fast-generate-001',
          adId: selectedAdForAnimate.id
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to start video animation');
      }

      const data = await res.json();
      setActiveReelId(data.data.reel.id);
    } catch (err: any) {
      setAnimating(false);
      setAnimStatus('FAILED');
      setAnimStatusMsg(err.message || 'Error starting animation');
    }
  };

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
            clearInterval(interval);
          } else if (reel.status === 'FAILED') {
            setAnimating(false);
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Failed to poll reel status', err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeReelId]);


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
        try {
          const imgRes = await fetch(data.images[0]);
          const blob = await imgRes.blob();
          const file = new File([blob], 'scraped-image.jpg', { type: blob.type });
          setImageFile(file);
          setImagePreview(URL.createObjectURL(file));
        } catch (e) {
          console.error('Failed to load image from URL', e);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setScraping(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReferenceFile(file);
      setReferencePreview(URL.createObjectURL(file));
    }
  };

  const handleClearForm = () => {
    setProductName('');
    setDescription('');
    setUsp('');
    setPersonality('');
    setAudience('');
    setMagicLink('');
    setImageFile(null);
    setImagePreview(null);
    setReferenceFile(null);
    setReferencePreview(null);
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
      if (imageFile) {
          formData.append('image', imageFile);
      }
      if (referenceFile) {
        formData.append('referenceImage', referenceFile);
      }
      formData.append('productName', productName);
      formData.append('description', description);
      formData.append('usp', usp);
      formData.append('personality', personality);
      formData.append('audience', audience);
      formData.append('platform', platform);
      formData.append('mood', mood);

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
          if (imageFile) {
            formData.append('image', imageFile);
          }
          if (referenceFile) {
            formData.append('referenceImage', referenceFile);
          }

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

  const handleComposePost = (brief: any, imageUrl: string) => {
    const postData = {
      content: `${brief.tagline ? brief.tagline + '\n\n' : ''}${brief.supportingCopy ? brief.supportingCopy + '\n\n' : ''}${brief.copy || ''}\n\n${brief.callToAction || ''}`.trim(),
      mediaUrls: imageUrl ? [imageUrl] : []
    };
    localStorage.setItem('composeAdData', JSON.stringify(postData));
    router.push('/dashboard/posts/new');
  };

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#2F281F] tracking-tight mb-2 flex items-center gap-2">
            <Target className="w-8 h-8 text-[#D27D50]" />
            AI Ad & Post Creator
          </h1>
          <p className="text-[#AAA39D] font-medium text-lg">Generate world-class creative campaigns using Advanced AI realism.</p>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-2xl font-medium border border-red-100 flex items-center gap-3 shadow-sm">
          <XCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Step 1: Input */}
      {step === 1 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-stone-100 grid grid-cols-1 lg:grid-cols-2 gap-10 relative overflow-hidden">
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-stone-800 border-b border-stone-100 pb-4">1. Images (Optional)</h2>
            
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 mb-2">
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Magic Link Import</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={magicLink} 
                  onChange={e => setMagicLink(e.target.value)} 
                  className="flex-1 bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] transition-shadow" 
                  placeholder="Paste product URL (Shopify, Amazon, etc.) to auto-fill..." 
                />
                <Button onClick={handleMagicLink} disabled={scraping || !magicLink} className="bg-[#D27D50] hover:bg-[#b86d45] text-white rounded-xl px-6 transition-colors shadow-sm">
                  {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="bg-stone-50 border-2 border-dashed border-stone-200 rounded-3xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-stone-100 hover:border-[#D27D50] transition-all relative min-h-[200px]"
              >
                <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover rounded-3xl shadow-sm" />
                ) : (
                  <>
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
                      <Upload className="w-5 h-5 text-[#D27D50]" />
                    </div>
                    <p className="font-bold text-sm text-stone-600 text-center">Product Image<br/><span className="text-stone-400 font-normal">Optional</span></p>
                  </>
                )}
              </div>

              <div 
                onClick={() => refInputRef.current?.click()}
                className="bg-stone-50 border-2 border-dashed border-stone-200 rounded-3xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-stone-100 hover:border-[#D27D50] transition-all relative min-h-[200px]"
              >
                <input type="file" ref={refInputRef} onChange={handleReferenceChange} className="hidden" accept="image/*" />
                {referencePreview ? (
                  <img src={referencePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover rounded-3xl shadow-sm" />
                ) : (
                  <>
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
                      <ImageIcon className="w-5 h-5 text-stone-400" />
                    </div>
                    <p className="font-bold text-sm text-stone-600 text-center">Style Reference<br/><span className="text-stone-400 font-normal">Optional</span></p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <h2 className="text-xl font-bold text-stone-800">2. Campaign Details</h2>
              <Button onClick={handleClearForm} variant="ghost" className="text-stone-400 hover:text-red-500 font-semibold h-8 px-3 rounded-lg text-xs">Clear Form</Button>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1.5">Product Name <span className="text-red-500">*</span></label>
              <input type="text" value={productName} onChange={e => setProductName(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] transition-shadow" placeholder="e.g. Aura Smart Mug" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">Core USP</label>
                <input type="text" value={usp} onChange={e => setUsp(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] transition-shadow" placeholder="Keeps coffee hot all day" />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">Platform</label>
                <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] transition-shadow">
                  <option>Instagram Feed (4:5)</option>
                  <option>Instagram Stories (9:16)</option>
                  <option>Landscape Post (16:9)</option>
                  <option>Square Ad (1:1)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">Personality</label>
                <input type="text" value={personality} onChange={e => setPersonality(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] transition-shadow" placeholder="Bold, premium, tech" />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">Target Audience</label>
                <input type="text" value={audience} onChange={e => setAudience(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] transition-shadow" placeholder="Remote workers, creatives" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1.5">Brief Description <span className="text-red-500">*</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] resize-none transition-shadow" placeholder="A matte black smart mug with a glowing LED ring at the base..." />
            </div>

            <div className="pt-4 flex gap-3">
              <Button 
                onClick={handleGenerateDirections} 
                disabled={loading || !productName || !description}
                className="w-full bg-[#3C342C] text-white hover:bg-black rounded-xl h-14 font-bold text-base transition-all shadow-lg hover:shadow-xl"
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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-stone-800">Select Directions</h2>
            <div className="flex gap-4">
                <Button variant="outline" onClick={() => setSelectedDirections(directions)} className="font-bold rounded-xl border-stone-200">Select All</Button>
                <Button variant="ghost" onClick={() => setStep(1)} className="text-stone-500 font-bold">← Back</Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  className={`bg-white rounded-3xl p-6 cursor-pointer border-2 transition-all duration-300 ${isSelected ? 'border-[#D27D50] shadow-[0_8px_30px_rgba(210,125,80,0.15)] bg-[#D27D50]/5 -translate-y-1' : 'border-stone-100 hover:border-stone-300 shadow-sm'}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">Option {idx + 1}</span>
                    {isSelected && <CheckCircle2 className="w-6 h-6 text-[#D27D50]" />}
                  </div>
                  <h3 className="text-lg font-black text-stone-800 mb-2">{dir.title}</h3>
                  <p className="text-sm text-stone-500 leading-relaxed">{dir.description}</p>
                </div>
              );
            })}
          </div>

          <div className="pt-8 flex justify-end">
            <Button 
              onClick={handleGenerateAd}
              disabled={loading || selectedDirections.length === 0}
              className="bg-gradient-to-r from-[#D27D50] to-[#C26032] text-white rounded-xl font-bold px-10 h-14 shadow-[0_8px_20px_rgba(210,125,80,0.2)] hover:-translate-y-1 transition-all text-lg w-full md:w-auto"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <ImageIcon className="w-6 h-6 mr-3" />}
              {loading ? 'Generating Final Ads...' : `Generate Campaigns (${selectedDirections.length})`}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 3 && results.length > 0 && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black text-stone-800 flex items-center gap-3 tracking-tight">
              {loading ? <Loader2 className="w-10 h-10 text-[#D27D50] animate-spin" /> : <CheckCircle2 className="w-10 h-10 text-emerald-500" />}
              {loading ? `Generating ${results.length} of ${selectedDirections.length}...` : 'Campaigns Generated'}
            </h2>
            <Button variant="outline" onClick={handleClearForm} disabled={loading} className="font-bold rounded-xl h-12 px-6">Start New Campaign</Button>
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
                            Compose Post
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {history.map((ad: any) => (
              <div key={ad.id} className="bg-white rounded-3xl overflow-hidden border border-stone-100 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col">
                <div className="h-56 w-full bg-stone-100 relative overflow-hidden group/img">
                  <img src={ad.imageUrl} alt={ad.productName} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
                    <a href={ad.imageUrl} target="_blank" rel="noopener noreferrer" className="bg-white/90 text-stone-800 hover:bg-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transform translate-y-4 group-hover/img:translate-y-0 transition-all duration-300 shadow-xl">
                      <Maximize2 className="w-4 h-4" /> View Full Photo
                    </a>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="inline-block px-2 py-1 bg-white/20 backdrop-blur-md rounded-lg text-white text-[10px] font-bold uppercase tracking-wider mb-2">
                      {ad.platform}
                    </span>
                    <h3 className="text-white font-bold text-lg leading-tight truncate">{ad.productName}</h3>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-4">
                    <span className="text-xs font-black tracking-wider uppercase text-[#D27D50] truncate pr-4">{ad.direction}</span>
                    <span className="text-xs font-bold text-stone-400 shrink-0">{new Date(ad.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-base font-black text-stone-800 line-clamp-2 mb-2 leading-tight">"{ad.brief.tagline}"</p>
                  <p className="text-sm font-medium text-stone-500 line-clamp-2 mb-6 flex-1">{ad.brief.supportingCopy || ad.brief.copy}</p>
                  
                  <div className="flex gap-2.5 mt-auto pt-2">
                    <Button 
                      onClick={() => openAnimateModal(ad)}
                      className="flex-1 rounded-xl font-bold bg-gradient-to-r from-[#D27D50] via-orange-500 to-rose-500 hover:from-[#b86d45] hover:to-rose-600 text-white transition-all duration-300 shadow-md hover:shadow-orange-500/25 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0 group/btn overflow-hidden relative"
                    >
                      <Film className="w-4 h-4 animate-pulse group-hover/btn:rotate-12 transition-transform" />
                      <span>Animate</span>
                    </Button>
                    <Button 
                      onClick={() => handleComposePost(ad.brief, ad.imageUrl)}
                      variant="outline"
                      className="flex-1 rounded-xl font-bold border-stone-200 hover:border-[#D27D50] hover:text-[#D27D50] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <PenSquare className="w-4 h-4" />
                      Compose
                    </Button>
                  </div>
                </div>
              </div>
            ))}
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
                {/* Synthesized Veo Prompt Editor */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Kinetic Motion Prompt (Google Veo Guide & Typography Optimized)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedAdForAnimate) openAnimateModal(selectedAdForAnimate);
                      }}
                      className="text-[11px] font-semibold text-[#D27D50] hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> Re-synthesize Prompt
                    </button>
                  </div>
                  <textarea 
                    value={animatePrompt} 
                    onChange={e => setAnimatePrompt(e.target.value)} 
                    rows={5} 
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] transition-shadow resize-none leading-relaxed" 
                  />
                  <p className="text-[10px] text-stone-400 mt-1 italic">
                    Prompt follows Google DeepMind Veo Prompt Guide (Subject + Action + Kinetic Motion Graphic Text + Camera + Lighting) for direct image-to-motion graphic animation.
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

