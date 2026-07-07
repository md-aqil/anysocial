'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Sparkles, Image as ImageIcon, Loader2 } from 'lucide-react';

export default function PlaygroundPage() {
  const { user } = useAuthStore();
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
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
    setImageUrl(null);

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
      setImageUrl(data.url);
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
            <label className="block text-sm font-bold text-stone-700 mb-2">Image Prompt</label>
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

        <div className="bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-stone-100 flex items-center justify-center min-h-[400px]">
          {imageUrl ? (
            <div className="relative w-full h-full group">
              <img src={imageUrl} alt="Generated" className="w-full h-full object-contain bg-stone-900" />
            </div>
          ) : (
            <div className="text-center p-8 flex flex-col items-center opacity-50">
              <ImageIcon className="w-16 h-16 text-stone-300 mb-4" />
              <p className="text-stone-400 font-semibold">Generated image will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
