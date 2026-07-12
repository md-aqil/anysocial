'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';

export default function VeoShortsCreator() {
  const { token } = useAuthStore();
  const [topic, setTopic] = useState('');
  const [subtitleStyle, setSubtitleStyle] = useState('orange-box');
  const [status, setStatus] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [reelId, setReelId] = useState<string | null>(null);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (token) {
      fetchHistory();
    }
  }, [token]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/veo/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setHistory(data.data);
        
        // If the latest reel is still processing, automatically resume polling
        const latest = data.data[0];
        if (latest && (latest.status === 'PENDING' || latest.status === 'GENERATING')) {
          setReelId(latest.id);
          setStatus(latest.status);
          setStatusMessage(latest.statusMessage || 'Processing...');
          
          // Poll again in 5 seconds
          setTimeout(fetchHistory, 5000);
        } else if (latest && latest.id === reelId) {
           // If it finished, update the state
           setStatus(latest.status);
        }
      }
    } catch (e) {
      console.error('Failed to fetch history', e);
    }
  };

  const handleGenerate = async () => {
    try {
      setStatus('PENDING');
      setStatusMessage('Starting generation...');
      
      const formData = new FormData();
      formData.append('topic', topic);
      formData.append('subtitleStyle', subtitleStyle);
      if (productImage) {
        formData.append('productImage', productImage);
      }

      const res = await fetch(`/api/veo/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!res.ok) throw new Error('Failed to start generation');
      const data = await res.json();
      setReelId(data.data.reel.id);
      
      // Start polling by refreshing history
      setTimeout(fetchHistory, 2000);
    } catch (e: any) {
      setStatus('FAILED');
      setStatusMessage(e.message);
    }
  };

  const renderJourneyStep = (title: string, content: React.ReactNode, isComplete: boolean, isActive: boolean) => (
    <div className={`flex flex-col border-l-2 pl-4 py-2 relative ${isComplete ? 'border-orange-500' : isActive ? 'border-blue-500' : 'border-slate-200'}`}>
      <div className={`absolute -left-[9px] top-4 w-4 h-4 rounded-full border-2 bg-white ${isComplete ? 'border-orange-500 bg-orange-500' : isActive ? 'border-blue-500 animate-pulse' : 'border-slate-300'}`}></div>
      <h4 className={`text-sm font-bold mb-2 ${isComplete ? 'text-orange-600' : isActive ? 'text-blue-600' : 'text-slate-400'}`}>{title}</h4>
      <div className={!isComplete && !isActive ? 'opacity-50 grayscale pointer-events-none' : ''}>
        {content}
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 bg-slate-50 min-h-screen text-slate-900 font-sans">
      
      {/* Header */}
      <div className="flex flex-col gap-2 mb-8 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-rose-500 tracking-tight">
          Cinematic Shorts Studio
        </h1>
        <p className="text-slate-500 text-lg">
          Generate stunning photorealistic videos using Google's Veo 3 AI model. Complete transparency from text to final video.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-5 flex flex-col gap-8 bg-white border border-slate-200 p-8 rounded-3xl shadow-sm sticky top-8">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Video Topic or Idea</label>
            <textarea
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
              rows={4}
              placeholder="e.g. A dramatic cinematic shot of a neon city in cyberpunk style..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Product Image (Optional)</label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center text-center relative overflow-hidden group">
              {productImage ? (
                <div className="flex flex-col items-center">
                  <img src={URL.createObjectURL(productImage)} alt="Preview" className="w-32 h-32 object-cover rounded-xl border border-slate-200 mb-4 shadow-sm" />
                  <button onClick={() => setProductImage(null)} className="text-red-500 font-medium text-sm hover:text-red-600 transition-colors">Remove Image</button>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-200 text-slate-400 group-hover:text-orange-500 transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Click to upload a product reference image</p>
                  <p className="text-xs text-slate-500 max-w-sm">The generated cinematic video will keep your product looking 100% identical!</p>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => setProductImage(e.target.files?.[0] || null)}
                  />
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Subtitle Overlay Style</label>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'orange-box', name: 'Orange Block', color: 'bg-orange-500' },
                { id: 'blue-box', name: 'Blue Block', color: 'bg-blue-500' },
                { id: 'outline', name: 'Bold Outline', color: 'bg-black' },
                { id: 'minimal', name: 'Minimal Drop Shadow', color: 'bg-slate-800' }
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSubtitleStyle(style.id)}
                  className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${subtitleStyle === style.id ? 'border-orange-500 bg-orange-50 shadow-md scale-105' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                >
                  <div className={`w-full py-3 flex items-center justify-center rounded-lg text-white font-bold text-sm shadow-sm ${style.color} ${style.id === 'outline' ? 'border border-slate-700' : ''}`}>
                    Abc
                  </div>
                  <span className={`text-xs font-semibold ${subtitleStyle === style.id ? 'text-orange-700' : 'text-slate-500'}`}>{style.name}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!topic || status === 'GENERATING' || status === 'PENDING'}
            className="w-full bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-lg"
          >
            {status === 'GENERATING' || status === 'PENDING' ? 'Initializing Engine...' : 'Generate Cinematic Short'}
          </button>
        </div>

        {/* Right Column: Generation Journey History */}
        <div className="lg:col-span-7 space-y-8">
          {history.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 shadow-sm text-center flex flex-col items-center justify-center h-[500px]">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">No videos generated yet</h3>
              <p className="text-slate-500 max-w-sm">Enter a topic and generate your first cinematic short. Your entire creation journey will appear here.</p>
            </div>
          )}

          {history.length > 0 && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold text-slate-800 text-center">Your Creation Journey</h2>
              <div className="space-y-12">
                {history.map((reel) => {
                  const meta = reel.metadata || {};
                  const isCurrent = reel.id === reelId && (status === 'PENDING' || status === 'GENERATING');
                  
                  // Determine step statuses
                  const step1Done = !!meta.generatedScript;
                  const step2Done = !!meta.generatedImage;
                  const step3Done = !!meta.rawVideoUrl;
                  const step4Done = reel.status === 'READY' || reel.status === 'PUBLISHED';

                  return (
                    <div key={reel.id} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm relative overflow-hidden">
                      
                      {/* Current processing overlay bar at top */}
                      {isCurrent && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
                          <div className="h-full bg-gradient-to-r from-orange-400 to-rose-400 animate-pulse"></div>
                        </div>
                      )}

                      <div className="mb-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Topic: {reel.script}</h3>
                        <p className="text-sm text-slate-500">{new Date(reel.createdAt).toLocaleString()} • Style: {meta.subtitleStyle || 'Unknown'}</p>
                        
                        {isCurrent && (
                          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold border border-blue-100">
                            <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            {statusMessage}
                          </div>
                        )}
                        {reel.status === 'FAILED' && (
                          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-700 text-sm font-semibold border border-red-100">
                            Generation Failed. Check logs.
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        {/* Step 1: AI Prompt */}
                        {renderJourneyStep(
                          "Step 1: AI Director Script & Scene",
                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-sm">
                            <p className="text-slate-800"><span className="font-semibold">Script:</span> {meta.generatedScript || 'Waiting for AI...'}</p>
                            <p className="text-slate-600 mt-2 italic">"{meta.generatedVisualPrompt || 'Generating visual prompt...'}"</p>
                          </div>,
                          step1Done,
                          isCurrent && !step1Done
                        )}

                        {/* Step 2: Image Base */}
                        {renderJourneyStep(
                          "Step 2: Reference Image Generation",
                          <div className="rounded-xl overflow-hidden border border-slate-200 inline-block">
                            {meta.generatedImage ? (
                              <img src={meta.generatedImage} alt="Reference" className="h-48 object-cover" />
                            ) : (
                              <div className="h-48 w-48 bg-slate-50 flex items-center justify-center text-slate-400 text-sm p-4 text-center">
                                Awaiting AI Image Generation
                              </div>
                            )}
                          </div>,
                          step2Done,
                          isCurrent && step1Done && !step2Done
                        )}

                        {/* Step 3: Raw Veo Video */}
                        {renderJourneyStep(
                          "Step 3: Google Veo 3 Video Processing",
                          <div className="rounded-xl overflow-hidden border border-slate-200 inline-block bg-slate-900 relative">
                            {meta.rawVideoUrl ? (
                              <video src={meta.rawVideoUrl} controls className="h-64 object-cover" />
                            ) : (
                              <div className="h-64 w-[450px] max-w-full bg-slate-100 flex items-center justify-center text-slate-400 text-sm p-4 text-center">
                                Veo 3 is rendering (this takes a few minutes)...
                              </div>
                            )}
                          </div>,
                          step3Done,
                          isCurrent && step2Done && !step3Done
                        )}

                        {/* Step 4: Final Composition */}
                        {renderJourneyStep(
                          "Step 4: Final Subtitle Composition",
                          <div className="rounded-xl overflow-hidden border-2 border-orange-200 inline-block shadow-lg">
                            {reel.videoUrl ? (
                              <video src={reel.videoUrl} controls autoPlay muted loop className="h-[400px] object-cover" />
                            ) : (
                              <div className="h-[400px] w-[225px] max-w-full bg-slate-50 flex items-center justify-center text-slate-400 text-sm p-4 text-center border-t border-slate-200">
                                Awaiting Final Rendering
                              </div>
                            )}
                          </div>,
                          step4Done,
                          isCurrent && step3Done && !step4Done
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
