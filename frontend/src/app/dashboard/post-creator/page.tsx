'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Image as ImageIcon, Loader2, Upload, Target, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function PostCreatorPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
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

  // Directions State
  const [directions, setDirections] = useState<any[]>([]);
  const [selectedDirection, setSelectedDirection] = useState<any | null>(null);

  // Result State
  const [resultBrief, setResultBrief] = useState<any>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleGenerateDirections = async () => {
    if (!imageFile || !productName) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
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
    if (!selectedDirection) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ad-creator/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          productName,
          direction: selectedDirection,
          platform
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate ad');
      }

      const data = await res.json();
      setResultBrief(data.brief);
      setResultImageUrl(data.imageUrl);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#2F281F] tracking-tight mb-2 flex items-center gap-2">
            <Target className="w-8 h-8 text-[#D27D50]" />
            AI Ad & Post Creator
          </h1>
          <p className="text-[#AAA39D] font-medium text-lg">Generate world-class creative campaigns using Nano Banana realism.</p>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-2xl font-medium border border-red-100">
          {error}
        </div>
      )}

      {/* Step 1: Input */}
      {step === 1 && (
        <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-stone-100 grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-stone-800 border-b border-stone-100 pb-4">1. Product Image (Required)</h2>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-stone-200 rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-stone-50 hover:border-[#D27D50] transition-colors relative min-h-[300px]"
            >
              <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover rounded-3xl" />
              ) : (
                <>
                  <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                    <Upload className="w-8 h-8 text-stone-400" />
                  </div>
                  <p className="font-bold text-stone-600">Upload Product Image</p>
                  <p className="text-sm text-stone-400 mt-2 text-center">This anchors the visual direction for the AI.</p>
                </>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <h2 className="text-xl font-bold text-stone-800 border-b border-stone-100 pb-4">2. Campaign Details</h2>
            
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1.5">Product Name</label>
              <input type="text" value={productName} onChange={e => setProductName(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50]" placeholder="e.g. Aura Smart Mug" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">Core USP</label>
                <input type="text" value={usp} onChange={e => setUsp(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50]" placeholder="Keeps coffee hot all day" />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">Platform</label>
                <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50]">
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
                <input type="text" value={personality} onChange={e => setPersonality(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50]" placeholder="Bold, premium, tech" />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">Target Audience</label>
                <input type="text" value={audience} onChange={e => setAudience(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50]" placeholder="Remote workers, creatives" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1.5">Brief Description (Optional)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] resize-none" placeholder="A matte black smart mug with a glowing LED ring at the base..." />
            </div>

            <div className="pt-4">
              <Button 
                onClick={handleGenerateDirections} 
                disabled={loading || !imageFile || !productName}
                className="w-full bg-[#3C342C] text-white hover:bg-black rounded-xl h-14 font-bold text-base transition-all"
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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-stone-800">Select a Direction</h2>
            <Button variant="ghost" onClick={() => setStep(1)} className="text-stone-500 font-bold">← Back</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {directions.map((dir, idx) => (
              <div 
                key={idx}
                onClick={() => setSelectedDirection(dir)}
                className={`bg-white rounded-3xl p-6 cursor-pointer border-2 transition-all ${selectedDirection?.id === dir.id ? 'border-[#D27D50] shadow-[0_8px_30px_rgba(210,125,80,0.15)] ring-4 ring-[#D27D50]/10' : 'border-stone-100 hover:border-stone-300 shadow-sm'}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">Option {idx + 1}</span>
                  {selectedDirection?.id === dir.id && <CheckCircle2 className="w-6 h-6 text-[#D27D50]" />}
                </div>
                <h3 className="text-lg font-black text-stone-800 mb-2">{dir.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{dir.description}</p>
              </div>
            ))}
          </div>

          <div className="pt-8 flex justify-end">
            <Button 
              onClick={handleGenerateAd}
              disabled={loading || !selectedDirection}
              className="bg-gradient-to-r from-[#D27D50] to-[#C26032] text-white rounded-xl font-bold px-10 h-14 shadow-[0_8px_20px_rgba(210,125,80,0.2)] hover:-translate-y-1 transition-all text-lg w-full md:w-auto"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <ImageIcon className="w-6 h-6 mr-3" />}
              {loading ? 'Generating Final Ad...' : 'Generate Creative Brief & Image'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 3 && resultBrief && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              Campaign Generated
            </h2>
            <Button variant="ghost" onClick={() => { setStep(1); setResultBrief(null); setResultImageUrl(null); setSelectedDirection(null); }} className="text-stone-500 font-bold">Start Over</Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-stone-100 flex flex-col group">
              <div className="relative w-full aspect-[4/5] max-h-[500px] bg-stone-900 overflow-hidden flex items-center justify-center p-4">
                {resultImageUrl ? (
                  <img src={resultImageUrl} alt="Generated Ad" className="w-full h-full object-contain drop-shadow-2xl rounded-lg" />
                ) : (
                  <p className="text-stone-500">Image Failed</p>
                )}
              </div>
              <div className="bg-stone-50 p-6 border-t border-stone-100 rounded-b-3xl">
                  <a 
                    href={resultImageUrl || '#'} 
                    download={`ad_${productName.replace(/\s+/g, '_')}_${Date.now()}.jpg`}
                    className="w-full flex items-center justify-center px-4 py-3 bg-white border-2 border-stone-200 text-stone-700 text-sm font-black rounded-xl hover:bg-stone-100 transition-colors uppercase tracking-widest"
                  >
                    Download Image
                  </a>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-stone-100 overflow-y-auto max-h-[700px]">
              <h3 className="text-sm font-black text-stone-400 uppercase tracking-widest mb-6">Creative Brief</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-[#D27D50] uppercase tracking-wider mb-2">Tagline</h4>
                  <p className="text-2xl font-black text-stone-900 leading-tight">"{resultBrief.tagline}"</p>
                </div>
                
                <div>
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Copywriting</h4>
                  <p className="text-stone-700 font-medium whitespace-pre-wrap">{resultBrief.copy}</p>
                </div>

                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Scene Setup</h4>
                  <p className="text-sm text-stone-600 mb-4">{resultBrief.sceneSetup}</p>
                  
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Lighting & Mood</h4>
                  <p className="text-sm text-stone-600">{resultBrief.lighting}</p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Image Prompt</h4>
                  <p className="text-xs font-mono text-stone-500 bg-stone-900 text-stone-300 p-4 rounded-xl max-h-[150px] overflow-y-auto leading-relaxed">{resultBrief.imagePrompt}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
