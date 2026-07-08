'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Sparkles, Image as ImageIcon, Loader2 } from 'lucide-react';

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
  },
  {
    label: 'Nature Macro',
    value: JSON.stringify({
      prompt: "A highly-detailed, hyper-realistic macro shot of a rare orchid. 100mm macro lens, f/2.8, ISO 400. Dew-covered velvety petals with subsurface scattering. Subtle browning edges on leaves showing natural wear. Natural dappled sunlight filtering through a dark green canopy. Unfiltered sensor grain.",
      negative_prompt: "stylized illustration, vibrant oversaturation, artificial lighting, plastic plants, smooth unnatural textures, depth flattening",
      api_parameters: { resolution: "1K", output_format: "jpg", aspect_ratio: "1:1" },
      settings: { style: "nature documentary", lighting: "natural dappled sunlight", depth_of_field: "extreme shallow depth of field", quality: "microscopic organic details" }
    }, null, 2)
  }
];

export default function PlaygroundPage() {
  const { user } = useAuthStore();
  const [prompt, setPrompt] = useState(PRESET_PROMPTS[0].value);
  const [images, setImages] = useState<{url: string, prompt: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-stone-500 font-medium">Access Denied: Superadmin only.</p>
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
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

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate image');
      }

      const data = await response.json();
      setImages(prev => [{ url: data.url, prompt }, ...prev]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#2F281F] tracking-tight mb-2">Image Playground</h1>
          <p className="text-[#AAA39D] font-medium text-lg">Test the Gemini 2.5 Flash Image generation model directly.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-stone-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-stone-700">Image Prompt</label>
              <div className="flex gap-2">
                {PRESET_PROMPTS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setPrompt(preset.value)}
                    className="text-[10px] font-bold px-2 py-1 rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200 uppercase tracking-widest transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-4 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] transition-all min-h-[160px] resize-none"
              placeholder="e.g. A penguin driving a taxi in New York City"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={handleGenerate} 
                disabled={loading || !prompt.trim()}
                className="bg-gradient-to-r from-[#D27D50] to-[#C26032] text-white rounded-xl font-bold px-6 h-12 shadow-[0_8px_20px_rgba(210,125,80,0.2)] hover:shadow-[0_12px_24px_rgba(210,125,80,0.3)] hover:-translate-y-0.5 transition-all w-full"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5 mr-2" />
                )}
                {loading ? 'Generating...' : 'Generate Image'}
              </Button>
            </div>
            {error && (
              <p className="mt-4 text-red-500 font-medium text-sm bg-red-50 p-3 rounded-xl">{error}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {images.length > 0 ? (
            images.map((img, idx) => (
              <div key={idx} className="bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-stone-100 flex flex-col group">
                <div className="relative w-full min-h-[400px] bg-stone-900 rounded-t-3xl overflow-hidden">
                  <img src={img.url} alt={`Generated ${idx}`} className="absolute inset-0 w-full h-full object-contain" />
                </div>
                <div className="bg-stone-50 p-4 border-t border-stone-100 rounded-b-3xl">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                        <Sparkles className="w-3 h-3" />
                        Gemini 2.5 Flash Image Model
                      </div>
                      <p className="text-xs text-stone-600 font-mono line-clamp-2">Prompt: {img.prompt}</p>
                    </div>
                    <a 
                      href={img.url} 
                      download={`gemini_playground_${Date.now()}_${idx}.jpg`}
                      className="flex-shrink-0 px-4 py-2 bg-white border border-stone-200 text-stone-700 text-xs font-bold rounded-xl hover:bg-stone-100 transition-colors shadow-sm"
                    >
                      Download
                    </a>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-stone-100 flex items-center justify-center min-h-[400px]">
              <div className="text-center p-8 flex flex-col items-center opacity-50">
                <ImageIcon className="w-16 h-16 text-stone-300 mb-4" />
                <p className="text-stone-400 font-semibold">Generated images will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
