'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Sparkles, Image as ImageIcon, Loader2, Mic, Volume2 } from 'lucide-react';

const PRESET_PROMPTS = [
  {
    label: 'Candid Portrait',
    value: JSON.stringify({
      prompt: "A highly-detailed, hyper-realistic candid portrait. 85mm lens, f/1.8, ISO 200. The subject has visible pores, mild redness, subtle freckles, and unretouched skin texture. Direct on-camera flash creating sharp highlights on the skin and a slightly shadowed background. Do not beautify or alter facial features.",
      negative_prompt: "anatomy normalization, body proportion averaging, dataset-average anatomy, beautification filters, skin smoothing, plastic skin, airbrushed texture, stylized realism, editorial fashion proportions",
      api_parameters: { resolution: "1K", output_format: "jpg", aspect_ratio: "4:5" },
      settings: { style: "documentary realism", lighting: "direct on-camera flash", depth_of_field: "shallow depth of field", quality: "high detail, unretouched skin" }
    }, null, 2)
  },
  {
    label: 'Premium Product',
    value: JSON.stringify({
      prompt: "A highly-detailed, hyper-realistic product shot of a sleek espresso machine. 100mm macro lens, f/4, ISO 100. Brushed aluminum texture with micro-scratches on the anodized finish. Volumetric lighting from a single softbox creating sharp specular highlights. Clean sans-serif typography overlaid perfectly legible. No CGI or 3D rendering.",
      negative_prompt: "CGI, 3D render, cartoon, illustration, flat lighting, over-smoothed textures, plastic looking materials",
      api_parameters: { resolution: "1K", output_format: "jpg", aspect_ratio: "16:9" },
      settings: { style: "commercial realism", lighting: "dramatic studio softbox", depth_of_field: "deep focus on product", quality: "hyper-textured materials" }
    }, null, 2)
  }
];

const TTS_EXAMPLES = [
  { label: 'English (Marketing)', text: 'Welcome to the future of content creation! Our new AI system generates stunning visuals and ultra-realistic voiceovers in seconds.', lang: 'en-US' },
  { label: 'Hindi (Energetic)', text: 'Namaste! Aaj hum aapko dikhayenge kaise AI aapke business ko grow karne mein madad kar sakta hai. Chaliye shuru karte hain!', lang: 'hi-IN' },
  { label: 'Spanish (Engaging)', text: '¡Hola! Descubre cómo nuestra nueva herramienta puede transformar tu presencia en las redes sociales. ¡Es rápido y muy fácil de usar!', lang: 'es-ES' }
];

export default function PlaygroundPage() {
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<'image' | 'voice'>('image');
  
  // Image State
  const [prompt, setPrompt] = useState(PRESET_PROMPTS[0].value);
  const [images, setImages] = useState<{url: string, prompt: string}[]>([]);
  const [loadingImg, setLoadingImg] = useState(false);
  
  // Voice State
  const [ttsText, setTtsText] = useState(TTS_EXAMPLES[0].text);
  const [ttsLang, setTtsLang] = useState(TTS_EXAMPLES[0].lang);
  const [ttsVoice, setTtsVoice] = useState('Aoede');
  const [ttsModel, setTtsModel] = useState('gemini-2.5-flash');
  const [audios, setAudios] = useState<{url: string, text: string, config: string}[]>([]);
  const [loadingVoice, setLoadingVoice] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role === 'super_admin') {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/ai/playground-history', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        const formatted = data.map((item: any) => ({ url: item.imageUrl, prompt: item.prompt }));
        setImages(formatted);
      }
    } catch (e) {}
  };

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-stone-500 font-medium">Access Denied: Superadmin only.</p>
      </div>
    );
  }

  const handleGenerateImage = async () => {
    if (!prompt.trim()) return;
    setLoadingImg(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ prompt })
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed');
      const data = await response.json();
      setImages(prev => [{ url: data.url, prompt }, ...prev]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingImg(false);
    }
  };

  const handleGenerateVoice = async () => {
    if (!ttsText.trim()) return;
    setLoadingVoice(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/generate-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          text: ttsText, 
          voiceName: ttsVoice, 
          language: ttsLang, 
          useAdvancedModel: ttsModel.includes('gemini') 
        })
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed');
      const data = await response.json();
      setAudios(prev => [{ url: data.url, text: ttsText, config: `${ttsModel} | ${ttsVoice} | ${ttsLang}` }, ...prev]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingVoice(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#2F281F] tracking-tight mb-2">AI Playground</h1>
          <p className="text-[#AAA39D] font-medium text-lg">Test Gemini 2.5 Flash Models for Image and Voice Generation directly.</p>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setActiveTab('image')}
          className={`px-6 py-3 rounded-full font-bold transition-all ${activeTab === 'image' ? 'bg-[#D27D50] text-white shadow-md' : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'}`}
        >
          <ImageIcon className="w-5 h-5 inline-block mr-2" />
          Image Generation
        </button>
        <button 
          onClick={() => setActiveTab('voice')}
          className={`px-6 py-3 rounded-full font-bold transition-all ${activeTab === 'voice' ? 'bg-[#D27D50] text-white shadow-md' : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'}`}
        >
          <Mic className="w-5 h-5 inline-block mr-2" />
          Voice Generation
        </button>
      </div>

      {activeTab === 'image' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-stone-700">Image Prompt</label>
                <div className="flex gap-2">
                  {PRESET_PROMPTS.map((preset) => (
                    <button key={preset.label} onClick={() => setPrompt(preset.value)} className="text-[10px] font-bold px-2 py-1 rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200 uppercase transition-colors">
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-4 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] transition-all min-h-[160px] resize-none"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <div className="mt-4 flex justify-end">
                <Button onClick={handleGenerateImage} disabled={loadingImg || !prompt.trim()} className="bg-gradient-to-r from-[#D27D50] to-[#C26032] text-white rounded-xl font-bold px-6 h-12 w-full">
                  {loadingImg ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Sparkles className="w-5 h-5 mr-2" />}
                  {loadingImg ? 'Generating...' : 'Generate Image'}
                </Button>
              </div>
              {error && <p className="mt-4 text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-6">
            {images.map((img, idx) => (
              <div key={idx} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100 flex flex-col">
                <div className="relative w-full min-h-[400px] bg-stone-900 rounded-t-3xl overflow-hidden">
                  <img src={img.url} alt={`Generated`} className="absolute inset-0 w-full h-full object-contain" />
                </div>
                <div className="bg-stone-50 p-4 border-t border-stone-100">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase mb-1"><Sparkles className="w-3 h-3 inline mr-1"/> Gemini 2.5 Flash Image Model</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'voice' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">TTS Model</label>
                  <select value={ttsModel} onChange={e => setTtsModel(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-medium">
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                    <option value="gemini-3.1-flash-tts-preview">Gemini 3.1 TTS Preview</option>
                    <option value="google-cloud-standard">Google Cloud TTS (Journey / Chirp3-HD)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Language</label>
                  <select value={ttsLang} onChange={e => setTtsLang(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-medium">
                    <option value="en-US">English (US)</option>
                    <option value="hi-IN">Hindi (India)</option>
                    <option value="es-ES">Spanish (Spain)</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Voice Identity</label>
                <select value={ttsVoice} onChange={e => setTtsVoice(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-medium">
                  <option value="Aoede">Aoede (Female)</option>
                  <option value="Charon">Charon (Male)</option>
                  <option value="Puck">Puck (Male)</option>
                  <option value="Kore">Kore (Female)</option>
                  <option value="Fenrir">Fenrir (Male)</option>
                </select>
              </div>

              <div className="flex items-center justify-between mb-2 mt-6">
                <label className="block text-sm font-bold text-stone-700">Script Text</label>
                <div className="flex gap-2">
                  {TTS_EXAMPLES.map((preset) => (
                    <button key={preset.label} onClick={() => { setTtsText(preset.text); setTtsLang(preset.lang); }} className="text-[10px] font-bold px-2 py-1 rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200 uppercase transition-colors">
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <textarea
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-4 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] transition-all min-h-[120px] resize-none"
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
              />
              
              <div className="mt-4 flex justify-end">
                <Button onClick={handleGenerateVoice} disabled={loadingVoice || !ttsText.trim()} className="bg-gradient-to-r from-[#D27D50] to-[#C26032] text-white rounded-xl font-bold px-6 h-12 w-full">
                  {loadingVoice ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Mic className="w-5 h-5 mr-2" />}
                  {loadingVoice ? 'Generating Audio...' : 'Generate Voice'}
                </Button>
              </div>
              {error && <p className="mt-4 text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {audios.map((audio, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 flex flex-col">
                <div className="text-[10px] font-bold text-emerald-700 uppercase mb-3"><Volume2 className="w-4 h-4 inline mr-1"/> {audio.config}</div>
                <audio src={audio.url} controls className="w-full mb-4" />
                <p className="text-sm text-stone-600 italic">"{audio.text}"</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
