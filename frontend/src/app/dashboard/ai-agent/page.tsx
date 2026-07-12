'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Sparkles, Image as ImageIcon, Loader2, Mic, MessageSquare, Send, Bot, User, Volume2 } from 'lucide-react';

type MessageType = 'text' | 'image' | 'voice';

interface Message {
  id: string;
  role: 'user' | 'ai';
  type: MessageType;
  content: string;
  url?: string;
  metadata?: string;
  timestamp: number;
}
const VOICES_BY_LANGUAGE: Record<string, string[]> = {
  'en-US': [
    'Aoede', 'Charon', 'Fenrir', 'Kore', 'Puck', 
    'en-US-Journey-D', 'en-US-Journey-F', 'en-US-Journey-O',
    'en-US-Studio-M', 'en-US-Studio-O', 'en-US-Studio-Q',
    'en-US-Wavenet-A', 'en-US-Wavenet-B', 'en-US-Wavenet-C', 'en-US-Wavenet-D', 'en-US-Wavenet-E', 'en-US-Wavenet-F', 'en-US-Wavenet-G', 'en-US-Wavenet-H', 'en-US-Wavenet-I', 'en-US-Wavenet-J',
    'en-US-Neural2-A', 'en-US-Neural2-C', 'en-US-Neural2-D', 'en-US-Neural2-E', 'en-US-Neural2-F', 'en-US-Neural2-G', 'en-US-Neural2-H', 'en-US-Neural2-I', 'en-US-Neural2-J',
    'en-US-Standard-A', 'en-US-Standard-B', 'en-US-Standard-C', 'en-US-Standard-D', 'en-US-Standard-E', 'en-US-Standard-F', 'en-US-Standard-G', 'en-US-Standard-H', 'en-US-Standard-I', 'en-US-Standard-J',
    'en-US-Polyglot-1'
  ],
  'hi-IN': [
    'Ojas', 'Aarav', 'Ananya', 'Kavya',
    'hi-IN-Journey-D', 'hi-IN-Journey-F', 'hi-IN-Journey-O',
    'hi-IN-Wavenet-A', 'hi-IN-Wavenet-B', 'hi-IN-Wavenet-C', 'hi-IN-Wavenet-D',
    'hi-IN-Neural2-A', 'hi-IN-Neural2-B', 'hi-IN-Neural2-C', 'hi-IN-Neural2-D',
    'hi-IN-Standard-A', 'hi-IN-Standard-B', 'hi-IN-Standard-C', 'hi-IN-Standard-D'
  ],
  'es-ES': [
    'Isidora', 'Elena', 'Tomas',
    'es-ES-Journey-D', 'es-ES-Journey-F', 'es-ES-Journey-O',
    'es-ES-Studio-C', 'es-ES-Studio-F',
    'es-ES-Wavenet-B', 'es-ES-Wavenet-C', 'es-ES-Wavenet-D',
    'es-ES-Neural2-A', 'es-ES-Neural2-B', 'es-ES-Neural2-C', 'es-ES-Neural2-D', 'es-ES-Neural2-E', 'es-ES-Neural2-F',
    'es-ES-Standard-A', 'es-ES-Standard-B', 'es-ES-Standard-C', 'es-ES-Standard-D'
  ],
  'fr-FR': [
    'fr-FR-Journey-D', 'fr-FR-Journey-F', 'fr-FR-Journey-O',
    'fr-FR-Studio-A', 'fr-FR-Studio-D',
    'fr-FR-Wavenet-A', 'fr-FR-Wavenet-B', 'fr-FR-Wavenet-C', 'fr-FR-Wavenet-D', 'fr-FR-Wavenet-E',
    'fr-FR-Neural2-A', 'fr-FR-Neural2-B', 'fr-FR-Neural2-C', 'fr-FR-Neural2-D', 'fr-FR-Neural2-E',
    'fr-FR-Standard-A', 'fr-FR-Standard-B', 'fr-FR-Standard-C', 'fr-FR-Standard-D', 'fr-FR-Standard-E'
  ],
  'de-DE': [
    'de-DE-Journey-D', 'de-DE-Journey-F', 'de-DE-Journey-O',
    'de-DE-Studio-B', 'de-DE-Studio-C',
    'de-DE-Wavenet-A', 'de-DE-Wavenet-B', 'de-DE-Wavenet-C', 'de-DE-Wavenet-D', 'de-DE-Wavenet-E', 'de-DE-Wavenet-F',
    'de-DE-Neural2-B', 'de-DE-Neural2-C', 'de-DE-Neural2-D', 'de-DE-Neural2-F',
    'de-DE-Standard-A', 'de-DE-Standard-B', 'de-DE-Standard-C', 'de-DE-Standard-D', 'de-DE-Standard-E', 'de-DE-Standard-F'
  ]
};

export default function AIAgentPage() {
  const { user } = useAuthStore();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<MessageType>('text');
  const [loading, setLoading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);

  // Testing Overrides
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [selectedVoice, setSelectedVoice] = useState('Aoede');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  useEffect(() => {
    if (user && user.role === 'super_admin') {
      const saved = localStorage.getItem('ai-agent-chat-history');
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse history");
        }
      } else {
        // Initial greeting
        setMessages([{
          id: 'welcome',
          role: 'ai',
          type: 'text',
          content: 'Hello! I am your AI Agent. I can chat with you, generate images, or create voiceovers. How can I help you today?',
          timestamp: Date.now()
        }]);
      }
    }
  }, [user]);

  // Save history on change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('ai-agent-chat-history', JSON.stringify(messages));
    }
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-stone-500 font-medium">Access Denied: Superadmin only.</p>
      </div>
    );
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      type: mode,
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      if (mode === 'text') {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ 
            messages: JSON.stringify([{ role: 'user', content: currentInput }]),
            model: selectedModel 
          })
        });
        if (!response.ok) throw new Error('Failed to get response');
        const data = await response.json();
        
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'ai',
          type: 'text',
          content: data.text || 'Done.',
          timestamp: Date.now()
        }]);
      } 
      else if (mode === 'image') {
        const response = await fetch('/api/ai/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ prompt: currentInput })
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Failed');
        const data = await response.json();
        
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'ai',
          type: 'image',
          content: 'Here is your generated image:',
          url: data.url,
          timestamp: Date.now()
        }]);
      }
      else if (mode === 'voice') {
        const isGeminiVoice = ['Aoede', 'Charon', 'Fenrir', 'Kore', 'Puck', 'Ojas', 'Aarav', 'Ananya', 'Kavya', 'Isidora', 'Elena', 'Tomas'].includes(selectedVoice);
        const forceGoogleTTS = selectedModel === 'google-cloud-tts';
        const useAdvancedModel = forceGoogleTTS ? false : isGeminiVoice;
        
        const response = await fetch('/api/ai/generate-voice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ 
            text: currentInput, 
            voiceName: selectedVoice, 
            language: selectedLanguage, 
            useAdvancedModel: useAdvancedModel,
            model: selectedModel
          })
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Failed');
        const data = await response.json();
        
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'ai',
          type: 'voice',
          content: 'Here is your generated voiceover:',
          url: data.url,
          metadata: `Voice: ${selectedVoice} | Lang: ${selectedLanguage}`,
          timestamp: Date.now()
        }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        type: 'text',
        content: `❌ Error: ${err.message}`,
        timestamp: Date.now()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const improvePrompt = async () => {
    if (!input.trim() || isImproving) return;
    setIsImproving(true);
    try {
      const response = await fetch('/api/ai/improve-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ prompt: input, type: mode })
      });
      if (!response.ok) throw new Error('Failed to improve prompt');
      const data = await response.json();
      if (data.text) {
        setInput(data.text);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsImproving(false);
    }
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear the chat history?')) {
      localStorage.removeItem('ai-agent-chat-history');
      setMessages([{
        id: 'welcome',
        role: 'ai',
        type: 'text',
        content: 'History cleared. How can I help you?',
        timestamp: Date.now()
      }]);
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-80px)] flex flex-col p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-black text-[#2F281F] tracking-tight flex items-center gap-2">
            <Bot className="w-8 h-8 text-[#D27D50]" /> AI Agent
          </h1>
          <p className="text-[#AAA39D] font-medium text-sm">Chat, generate images, and synthesize voice using Vertex AI.</p>
        </div>
        <Button variant="outline" size="sm" onClick={clearHistory} className="text-xs">
          Clear History
        </Button>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-stone-100 overflow-y-auto p-6 mb-4 flex flex-col gap-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${msg.role === 'user' ? 'bg-stone-200 text-stone-600' : 'bg-[#D27D50] text-white'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-[#2F281F] text-white rounded-tr-sm' 
                    : 'bg-stone-50 border border-stone-100 text-stone-800 rounded-tl-sm'
                }`}>
                  {msg.type !== 'text' && msg.role === 'user' && (
                    <div className="text-[10px] uppercase font-bold opacity-70 mb-1 flex items-center gap-1">
                      {msg.type === 'image' ? <ImageIcon className="w-3 h-3"/> : msg.type === 'voice' ? <Mic className="w-3 h-3"/> : <MessageSquare className="w-3 h-3" />}
                      Generate {msg.type}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>

                {/* Media Attachments */}
                {msg.type === 'image' && msg.url && (
                  <div className="mt-1 rounded-2xl overflow-hidden border border-stone-100 shadow-sm max-w-sm">
                    <img src={msg.url} alt="Generated" className="w-full h-auto object-cover" />
                  </div>
                )}
                
                {msg.type === 'voice' && msg.url && (
                  <div className="mt-1 bg-stone-50 rounded-2xl p-4 border border-stone-100 min-w-[280px]">
                    <div className="text-[10px] font-bold text-emerald-700 uppercase mb-2 flex items-center gap-1">
                      <Volume2 className="w-3 h-3"/> {msg.metadata}
                    </div>
                    <audio src={msg.url} controls className="w-full h-10" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#D27D50] text-white flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-stone-50 border border-stone-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-[#D27D50] animate-spin" />
                <span className="text-stone-500 font-medium">Agent is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-2 flex-shrink-0 flex items-end gap-2">
        {/* Mode Selector */}
        <div className="flex flex-col gap-1 p-2 bg-stone-50 rounded-2xl">
          <button 
            onClick={() => setMode('text')} 
            className={`p-2 rounded-xl transition-colors ${mode === 'text' ? 'bg-white shadow-sm text-[#D27D50]' : 'text-stone-400 hover:text-stone-600'}`}
            title="Chat Mode"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setMode('image')} 
            className={`p-2 rounded-xl transition-colors ${mode === 'image' ? 'bg-white shadow-sm text-[#D27D50]' : 'text-stone-400 hover:text-stone-600'}`}
            title="Image Mode"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setMode('voice')} 
            className={`p-2 rounded-xl transition-colors ${mode === 'voice' ? 'bg-white shadow-sm text-[#D27D50]' : 'text-stone-400 hover:text-stone-600'}`}
            title="Voice Mode"
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col">
          {/* Options Row */}
          <div className="flex items-center gap-2 mb-2 px-2">
            {(mode === 'text' || mode === 'voice') && (
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-stone-600 focus:outline-none"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                {mode === 'voice' && (
                  <>
                    <option value="gemini-2.5-flash-preview-tts">Gemini 2.5 Flash TTS (AI Studio)</option>
                    <option value="google-cloud-tts">Google Cloud TTS</option>
                  </>
                )}
              </select>
            )}

            {mode === 'voice' && (
              <>
                <select
                  value={selectedLanguage}
                  onChange={(e) => {
                    setSelectedLanguage(e.target.value);
                    setSelectedVoice(VOICES_BY_LANGUAGE[e.target.value][0]);
                  }}
                  className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-stone-600 focus:outline-none"
                >
                  {Object.keys(VOICES_BY_LANGUAGE).map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-stone-600 focus:outline-none"
                >
                  {VOICES_BY_LANGUAGE[selectedLanguage].map(voice => (
                    <option key={voice} value={voice}>{voice}</option>
                  ))}
                </select>
              </>
            )}
          </div>
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask the agent to generate ${mode}... (Shift+Enter for new line)`}
            className="w-full max-h-32 min-h-[56px] resize-none bg-transparent border-0 focus:ring-0 px-2 py-1 text-stone-800 placeholder:text-stone-400"
            rows={1}
          />
        </div>
        
        <div className="p-2 flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={improvePrompt}
            disabled={!input.trim() || isImproving || loading}
            title="Improve Prompt with AI"
            className="w-12 h-10 rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50 p-0 flex items-center justify-center"
          >
            {isImproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || loading}
            className="w-12 h-12 rounded-2xl bg-[#2F281F] hover:bg-black text-white p-0 flex items-center justify-center transition-transform active:scale-95"
          >
            <Send className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
