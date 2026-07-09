'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Settings, Save, Loader2, Bot, Image as ImageIcon, Mic } from 'lucide-react';

const TEXT_MODELS = [
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Preview)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast & Reliable)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Advanced Reasoning)' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Legacy)' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Legacy)' }
];

const IMAGE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash Image' },
  { id: 'pollinations', name: 'Pollinations AI (Fallback)' },
  { id: 'stock', name: 'Stock Photos (Pexels/Unsplash)' }
];

const VOICE_MODELS = [
  { id: 'google-cloud-standard', name: 'Google Cloud TTS (Standard/Journey)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Generative Audio)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Generative Audio)' },
  { id: 'gemini-3.1-flash-tts-preview', name: 'Gemini 3.1 TTS (Preview)' }
];

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  const [config, setConfig] = useState({
    text: { primary: 'gemini-2.5-flash', secondary: 'gemini-1.5-pro', tertiary: 'gemini-2.5-pro' },
    image: { primary: 'gemini-2.5-flash', secondary: 'pollinations', tertiary: 'stock' },
    voice: { primary: 'google-cloud-standard', secondary: 'gemini-2.5-flash', tertiary: 'gemini-2.5-pro' }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/ai-models', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/ai-models', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        setMessage({ text: "AI Configuration updated successfully!", type: 'success' });
      } else {
        setMessage({ text: "Failed to save settings.", type: 'error' });
      }
    } catch (e) {
      setMessage({ text: "An error occurred.", type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-stone-500 font-medium">Access Denied: Superadmin only.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-stone-400" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#2F281F] tracking-tight mb-2 flex items-center">
            <Settings className="w-8 h-8 mr-3 text-[#D27D50]" />
            Global AI Settings
          </h1>
          <p className="text-[#AAA39D] font-medium text-lg">Configure the Primary, Secondary, and Tertiary models across the entire platform.</p>
        </div>
        <div className="flex flex-col items-end">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-6 h-12 shadow-sm transition-all"
          >
            {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
          {message && (
            <p className={`mt-2 text-sm font-bold ${message.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
              {message.text}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-8">
        
        {/* TEXT MODELS */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100">
          <h2 className="text-xl font-bold text-stone-800 mb-6 flex items-center">
            <Bot className="w-6 h-6 mr-2 text-blue-500" /> Text Generation (LLM)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Primary Model</label>
              <select 
                value={config.text.primary} 
                onChange={e => setConfig({ ...config, text: { ...config.text, primary: e.target.value }})}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-medium"
              >
                {TEXT_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Secondary (Fallback 1)</label>
              <select 
                value={config.text.secondary} 
                onChange={e => setConfig({ ...config, text: { ...config.text, secondary: e.target.value }})}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-medium"
              >
                {TEXT_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Tertiary (Fallback 2)</label>
              <select 
                value={config.text.tertiary} 
                onChange={e => setConfig({ ...config, text: { ...config.text, tertiary: e.target.value }})}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-medium"
              >
                {TEXT_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* IMAGE MODELS */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100">
          <h2 className="text-xl font-bold text-stone-800 mb-6 flex items-center">
            <ImageIcon className="w-6 h-6 mr-2 text-pink-500" /> Image Generation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Primary Model</label>
              <select 
                value={config.image.primary} 
                onChange={e => setConfig({ ...config, image: { ...config.image, primary: e.target.value }})}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-medium"
              >
                {IMAGE_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Secondary (Fallback 1)</label>
              <select 
                value={config.image.secondary} 
                onChange={e => setConfig({ ...config, image: { ...config.image, secondary: e.target.value }})}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-medium"
              >
                {IMAGE_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Tertiary (Fallback 2)</label>
              <select 
                value={config.image.tertiary} 
                onChange={e => setConfig({ ...config, image: { ...config.image, tertiary: e.target.value }})}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-medium"
              >
                {IMAGE_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* VOICE MODELS */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100">
          <h2 className="text-xl font-bold text-stone-800 mb-6 flex items-center">
            <Mic className="w-6 h-6 mr-2 text-amber-500" /> Voice Synthesis (TTS)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Primary Model</label>
              <select 
                value={config.voice.primary} 
                onChange={e => setConfig({ ...config, voice: { ...config.voice, primary: e.target.value }})}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-medium"
              >
                {VOICE_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Secondary (Fallback 1)</label>
              <select 
                value={config.voice.secondary} 
                onChange={e => setConfig({ ...config, voice: { ...config.voice, secondary: e.target.value }})}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-medium"
              >
                {VOICE_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Tertiary (Fallback 2)</label>
              <select 
                value={config.voice.tertiary} 
                onChange={e => setConfig({ ...config, voice: { ...config.voice, tertiary: e.target.value }})}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm font-medium"
              >
                {VOICE_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
