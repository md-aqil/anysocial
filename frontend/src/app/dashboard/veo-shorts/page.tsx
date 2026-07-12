'use client';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';

export default function VeoShortsCreator() {
  const { token } = useAuthStore();
  const [topic, setTopic] = useState('');
  const [subtitleStyle, setSubtitleStyle] = useState('orange-box');
  const [status, setStatus] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [reelId, setReelId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    try {
      setStatus('PENDING');
      setStatusMessage('Starting generation...');
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/veo/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ topic, subtitleStyle })
      });
      
      if (!res.ok) throw new Error('Failed to start generation');
      const data = await res.json();
      setReelId(data.data.reel.id);
      
      // Start polling
      pollStatus(data.data.reel.id);
    } catch (e: any) {
      setStatus('FAILED');
      setStatusMessage(e.message);
    }
  };

  const pollStatus = async (id: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reels/status/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      setStatus(data.data.status);
      setStatusMessage(data.data.statusMessage || 'Processing...');
      
      if (data.data.status === 'READY' || data.data.status === 'PUBLISHED') {
        setVideoUrl(data.data.videoUrl);
      } else if (data.data.status !== 'FAILED') {
        setTimeout(() => pollStatus(id), 5000);
      }
    } catch (e: any) {
      console.error(e);
      setTimeout(() => pollStatus(id), 5000);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-rose-400">
          Cinematic Shorts (Veo 3)
        </h1>
        <p className="text-zinc-400">
          Generate highly detailed, photorealistic videos using Google's state-of-the-art Veo 3 Video AI model.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Video Topic or Idea</label>
          <textarea
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            rows={4}
            placeholder="e.g. A dramatic cinematic shot of a neon city in cyberpunk style..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Subtitle Overlay Style</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { id: 'orange-box', name: 'Orange Block', color: 'bg-orange-500' },
              { id: 'blue-box', name: 'Blue Block', color: 'bg-blue-500' },
              { id: 'outline', name: 'Bold Outline', color: 'bg-black' },
              { id: 'minimal', name: 'Minimal Drop Shadow', color: 'bg-zinc-800' }
            ].map((style) => (
              <button
                key={style.id}
                onClick={() => setSubtitleStyle(style.id)}
                className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${subtitleStyle === style.id ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950'}`}
              >
                <div className={`w-full py-2 flex items-center justify-center rounded text-white font-bold text-sm ${style.color} ${style.id === 'outline' ? 'border border-zinc-700' : ''}`}>
                  Abc
                </div>
                <span className="text-xs text-zinc-400 font-medium">{style.name}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!topic || status === 'GENERATING' || status === 'PENDING'}
          className="w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-semibold py-3 px-4 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {status === 'GENERATING' || status === 'PENDING' ? 'Generating...' : 'Generate Veo Short'}
        </button>
      </div>

      {(status || videoUrl) && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center space-y-4">
          <h2 className="text-lg font-semibold text-white">Status: {status}</h2>
          <p className="text-zinc-400 text-sm animate-pulse">{statusMessage}</p>
          
          {videoUrl && (
            <div className="mt-4 flex justify-center">
              <video src={videoUrl} controls className="max-h-[500px] rounded-lg shadow-2xl border border-zinc-800" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
