'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { Loader2, Sparkles, ArrowRight, ArrowLeft, Wand2, Image as ImageIcon, Send, X, Save, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type Step = 'info' | 'directions' | 'brief' | 'generating' | 'result';

export default function AiGeneratePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('info');
  const [productDetails, setProductDetails] = useState({
    name: '',
    category: '',
    description: '',
    usp: '',
    personality: 'bold, premium, modern',
    targetAudience: 'young professionals',
    platforms: ['INSTAGRAM'],
    mood: 'expressive, high-energy'
  });

  const [directions, setDirections] = useState<any[]>([]);
  const [selectedDirection, setSelectedDirection] = useState<any>(null);
  const [brief, setBrief] = useState<any>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [generatedAsset, setGeneratedAsset] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  // Persistence
  useEffect(() => {
    const savedPlatforms = localStorage.getItem('ai_gen_platforms');
    if (savedPlatforms) {
      try {
        setProductDetails(prev => ({ ...prev, platforms: JSON.parse(savedPlatforms) }));
      } catch (e) {}
    }
  }, []);

  const { data: accountsData } = useQuery({
    queryKey: ['social-accounts'],
    queryFn: () => api.oauth.getAccounts(),
  });

  const availablePlatforms = ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'THREADS'];

  // Mutations
  const proposeMutation = useMutation({
    mutationFn: (details: typeof productDetails) => api.ai.proposeDirections(details),
    onMutate: () => {
      setStep('generating');
      setLogs([{ message: '🔍 Analyzing product niche and market trends...', timestamp: new Date().toISOString() }]);
    },
    onSuccess: (data) => {
      setLogs(prev => [...prev, { message: '✅ Generated 5 strategic ad directions.', timestamp: new Date().toISOString() }]);
      setTimeout(() => {
        setDirections(data.directions);
        setStep('directions');
      }, 800);
    },
    onError: (err: any) => {
      setStep('info');
      setError(err.message || 'The AI engine timed out. This usually happens when the reasoning model is thinking deeply. Please try again.');
      setLogs([]);
    }
  });

  const briefMutation = useMutation({
    mutationFn: (directionId: string) => api.ai.generateBrief({ directionId, productDetails }),
    onMutate: () => {
      setStep('generating');
      setLogs([{ message: '✍️ Drafting full ad strategy and visual brief...', timestamp: new Date().toISOString() }]);
    },
    onSuccess: (data) => {
      setLogs(prev => [...prev, { message: '✅ Strategy brief and visual specs ready.', timestamp: new Date().toISOString() }]);
      setTimeout(() => {
        setBrief(data.brief);
        setStep('brief');
      }, 800);
    },
    onError: (err: any) => {
      setStep('directions');
      setError(err.message || 'Generation failed. Please try again.');
      setLogs([]);
    }
  });

  const generateMutation = useMutation({
    mutationFn: (data: { brief: any; productDetails: any }) => api.ai.generateAssets(data),
    onSuccess: (data) => {
      setTaskId(data.taskId);
      setStep('generating'); // Stay/Enter generating state
      startPolling(data.taskId);
    }
  });

  const [logs, setLogs] = useState<{message: string, timestamp: string}[]>([]);
  const [magicPrompt, setMagicPrompt] = useState('');

  const handleMagicCommand = () => {
    if (!magicPrompt) return;
    setStep('generating');
    setLogs([{ message: `⚡ Processing magic command: "${magicPrompt}"...`, timestamp: new Date().toISOString() }]);
    
    // Simulate natural language intelligence
    const isVaclav = magicPrompt.toLowerCase().includes('vaclav');
    
    setTimeout(() => {
      setLogs(prev => [...prev, { message: `✅ Loaded context: ${isVaclav ? 'Vaclav Fashion' : 'General Strategy'}`, timestamp: new Date().toISOString() }]);
      
      const magicBrief = { 
        tagline: isVaclav ? 'Heritage Meets High Fashion.' : 'Experience the Extraordinary.', 
        concept: isVaclav ? 'A cinematic heritage story for Vaclav.' : 'A premium showcases of your product.', 
        visualSpec: { lighting: 'Golden Hour', background: 'Palatial', composition: 'Full frame hero' },
        direction: 'hero-lifestyle'
      };

      const magicDetails = { 
        ...productDetails, 
        name: isVaclav ? 'Vaclav Fashion' : productDetails.name,
        description: isVaclav ? 'Premium heritage patiala suits' : productDetails.description
      };

      // Set states so the result page has data to show
      setBrief(magicBrief);
      setProductDetails(magicDetails);

      api.ai.generateAssets({ 
        brief: magicBrief,
        productDetails: magicDetails
      }).then(res => {
        setTaskId(res.taskId);
        startPolling(res.taskId);
      });
    }, 1500);
  };

  const startPolling = async (id: string) => {
    const timer = setInterval(async () => {
      try {
        const resp = await api.ai.getStatus(id);
        if (resp.logs) setLogs(resp.logs);
        
        if (resp.status === 'completed') {
          clearInterval(timer);
          setGeneratedAsset(resp.asset);
          setStep('result');
        }
      } catch (e) {
        clearInterval(timer);
        console.error('Polling failed', e);
      }
    }, 2000);
  };

  const handleCreatePost = () => {
    // Generate the post content from the brief
    const suggestedContent = `${brief.tagline}\n\n${brief.concept}\n\n✨ Shop the look at ${productDetails.name}. Link in bio! #fashion #ad #style`;
    
    // We can use session storage or state management to pass this to the new post page
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pending_ai_post', JSON.stringify({
        content: brief?.youtubeSEO?.optimizedDescription || suggestedContent,
        mediaUrl: generatedAsset.url,
        title: brief?.tagline || `AI Ad: ${productDetails.name}`,
        youtubeTags: brief?.youtubeSEO?.recommendedTags || ''
      }));
    }
    
    router.push('/dashboard/posts/new?source=ai_gen');
  };

  const handleSaveDraft = async () => {
    if (!generatedAsset || !brief) return;
    setIsSavingDraft(true);
    try {
      // Generate the post content from the brief
      const suggestedContent = `${brief.tagline}\n\n${brief.concept}\n\n✨ Shop the look at ${productDetails.name}. Link in bio! #fashion #ad #style`;
      const content = brief?.youtubeSEO?.optimizedDescription || suggestedContent;

      // Create draft via API
      // Since generatedAsset is already uploaded to our storage, we pass the URL
      // We need to fetch the file back as a blob and send it to createDraft if it expects a file, 
      // or we modify createDraft to accept a URL if available.
      // But looking at postRoutes, createDraft expects a buffer.
      
      const response = await fetch(generatedAsset.url);
      const blob = await response.blob();
      const file = new File([blob], `ai-gen-${Date.now()}.jpg`, { type: blob.type });

      await api.posts.createDraft({
        content,
        title: brief?.tagline || `AI Ad: ${productDetails.name}`,
        platforms: productDetails.platforms,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        media: [file]
      });

      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 3000);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    } catch (err: any) {
      setError('Failed to save draft. Please try again.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-purple-500" />
            AI Ad Generator
          </h1>
          <p className="text-muted-foreground">Transform product info into world-class social ads</p>
        </div>
        <div className="flex gap-2">
          {step !== 'info' && step !== 'generating' && (
            <Button variant="outline" onClick={() => setStep('info')}>
              Start Over
            </Button>
          )}
        </div>
      
      {error && (
        <div className="bg-destructive/15 border border-destructive/20 text-destructive px-4 py-3 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="bg-destructive text-white p-1 rounded-full">
              <X className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium">{error}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      </div>

      {/* Step Progress */}
      <div className="flex justify-between items-center px-4">
        {[
          { id: 'info', label: 'Product' },
          { id: 'directions', label: 'Direction' },
          { id: 'brief', label: 'Strategy' },
          { id: 'result', label: 'Review' }
        ].map((s, idx) => (
          <div key={s.id} className="flex items-center">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors",
              step === s.id ? "border-purple-500 bg-purple-50 text-purple-700" : "border-muted text-muted-foreground"
            )}>
              {idx + 1}
            </div>
            <span className={cn(
              "ml-2 text-sm font-medium hidden sm:inline",
              step === s.id ? "text-purple-700" : "text-muted-foreground"
            )}>
              {s.label}
            </span>
            {idx < 3 && <div className="mx-4 w-12 h-[2px] bg-muted hidden sm:block" />}
          </div>
        ))}
      </div>

      {/* Step 1: Info */}
      {step === 'info' && (
        <Card className="border-2 border-purple-100 shadow-xl">
          <CardHeader>
            <CardTitle>Tell us about your product</CardTitle>
            <CardDescription>The more detail you provide, the better the AI results.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* NEW: Magic Command Bar */}
            <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <div className="bg-purple-500 p-1.5 rounded-lg">
                  <Wand2 className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-bold text-purple-900">Magic Command</h3>
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="e.g. Plan today's social content for Vaclav Fashion..." 
                  className="border-purple-200 focus-visible:ring-purple-400"
                  value={magicPrompt}
                  onChange={(e) => setMagicPrompt(e.target.value)}
                />
                <Button 
                  onClick={handleMagicCommand}
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={!magicPrompt}
                >
                  Execute
                </Button>
              </div>
              <p className="text-xs text-purple-600">Pro tip: Use this to trigger automated content planning for saved clients.</p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or fill manually</span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Product Name</Label>
              <Input 
                id="name" 
                placeholder="e.g. Rose Patiala Suit Set" 
                value={productDetails.name}
                onChange={e => setProductDetails({...productDetails, name: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="usp">USP (Unique Selling Point)</Label>
              <Input 
                id="usp" 
                placeholder="e.g. Crafted for every celebration, every spin, every story" 
                value={productDetails.usp}
                onChange={e => setProductDetails({...productDetails, usp: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Brief Description</Label>
              <Textarea 
                id="description" 
                placeholder="What exactly are you selling? (Materials, features, etc.)" 
                value={productDetails.description}
                onChange={e => setProductDetails({...productDetails, description: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="personality">Brand Personality</Label>
                <Input 
                  id="personality" 
                  value={productDetails.personality}
                  onChange={e => setProductDetails({...productDetails, personality: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="audience">Target Audience</Label>
                <Input 
                  id="audience" 
                  value={productDetails.targetAudience}
                  onChange={e => setProductDetails({...productDetails, targetAudience: e.target.value})}
                />
              </div>
            </div>
            <div className="grid gap-2 pt-2">
              <Label>Target Platforms</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {availablePlatforms.map(platform => {
                  const isSelected = productDetails.platforms.includes(platform);
                  const isConnected = accountsData?.accounts?.some((a: any) => a.platform === platform && a.status === 'CONNECTED');
                  
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => {
                        const newPlatforms = isSelected 
                          ? productDetails.platforms.filter(p => p !== platform)
                          : [...productDetails.platforms, platform];
                        
                        setProductDetails({ ...productDetails, platforms: newPlatforms });
                        localStorage.setItem('ai_gen_platforms', JSON.stringify(newPlatforms));
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5",
                        isSelected 
                          ? "bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-200" 
                          : "bg-white border-slate-200 text-slate-600 hover:border-purple-300"
                      )}
                    >
                      {platform}
                      {isConnected && <div className="w-1.5 h-1.5 rounded-full bg-green-400" title="Connected" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Choices are saved for your next session. Green dot indicates a connected account.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-12 text-lg"
              disabled={!productDetails.name || proposeMutation.isPending}
              onClick={() => proposeMutation.mutate(productDetails)}
            >
              {proposeMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
              Generate Creative Directions
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Directions */}
      {step === 'directions' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {directions.map((dir) => (
            <Card 
              key={dir.id}
              className={cn(
                "cursor-pointer transition-all hover:border-purple-400 hover:shadow-md",
                selectedDirection?.id === dir.id ? "border-2 border-purple-500 bg-purple-50/50" : ""
              )}
              onClick={() => setSelectedDirection(dir)}
            >
              <CardHeader>
                <CardTitle className="text-xl">{dir.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{dir.description}</p>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant={selectedDirection?.id === dir.id ? "default" : "outline"}
                  disabled={briefMutation.isPending}
                  onClick={() => briefMutation.mutate(dir.id)}
                >
                  Choose This Direction
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Step 3: Brief */}
      {step === 'brief' && brief && (
        <Card className="border-2 border-blue-100 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white text-center">
            <h2 className="text-2xl font-bold italic">"{brief.tagline}"</h2>
            <p className="mt-2 text-blue-100 opacity-90">{brief.concept}</p>
          </div>
          <CardHeader>
            <CardTitle>Ad Strategy & Visual Spec</CardTitle>
            <CardDescription>Review the campaign direction before generating high-fidelity assets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="p-4 rounded-xl bg-slate-50 border">
                <p className="text-xs font-bold uppercase text-slate-400 mb-1">Lighting</p>
                <p className="text-sm font-medium">{brief.visualSpec.lighting}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border">
                <p className="text-xs font-bold uppercase text-slate-400 mb-1">Background</p>
                <p className="text-sm font-medium">{brief.visualSpec.background}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border">
                <p className="text-xs font-bold uppercase text-slate-400 mb-1">Composition</p>
                <p className="text-sm font-medium">{brief.visualSpec.composition}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800">
              <Sparkles className="h-6 w-6 flex-shrink-0" />
              <p className="text-sm font-medium">
                This will trigger our <strong>Nano-Banana-2</strong> engine to render a hyper-realistic 2K ad image. This process takes about 30–60 seconds.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex gap-4">
            <Button variant="outline" size="lg" onClick={() => setStep('directions')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Change Direction
            </Button>
            <Button 
              className="flex-1 bg-black hover:bg-slate-800 h-12 text-lg"
              onClick={() => generateMutation.mutate({ brief, productDetails })}
            >
              <ImageIcon className="mr-2 h-5 w-5" />
              Generate Ad Image & Copy
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 4: Generating */}
      {step === 'generating' && (
        <div className="flex flex-col items-center justify-center py-24 space-y-6">
          <div className="relative">
            <Loader2 className="h-24 w-24 text-purple-500 animate-spin" />
            <Sparkles className="h-8 w-8 text-pink-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
              Rerendering Reality...
            </h2>
            <p className="text-muted-foreground max-w-sm">
              Our AI is currently simulating the studio, lighting your product, and capturing the perfect "Hero" moment.
            </p>
          </div>
          <div className="w-full max-w-lg bg-black rounded-lg overflow-hidden shadow-2xl border border-slate-800">
            <div className="bg-slate-900 px-4 py-2 flex items-center gap-2 border-b border-slate-800">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest ml-2">AI Execution Logs — NVIDIA NIM</span>
            </div>
            <div className="p-4 h-48 overflow-y-auto font-mono text-xs space-y-2 scrollbar-hide bg-black/90">
              {logs.length === 0 && (
                <div className="text-slate-600 animate-pulse">Waiting for AI heartbeat...</div>
              )}
              {logs.map((log, i) => (
                <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                  <span className="text-slate-600 shrink-0">[{log.timestamp.split('T')[1].split('.')[0]}]</span>
                  <span className={cn(
                    "break-words",
                    log.message.startsWith('✅') ? "text-green-400" : 
                    log.message.startsWith('❌') ? "text-red-400" : "text-purple-300"
                  )}>
                    {log.message}
                  </span>
                </div>
              ))}
              <div id="logs-end" />
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Result */}
      {step === 'result' && generatedAsset && (
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <Card className="overflow-hidden border-0 shadow-2xl rounded-2xl">
              <img 
                src={generatedAsset.url} 
                alt="Generated Ad" 
                className="w-full aspect-[4/5] object-cover"
              />
            </Card>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => window.open(generatedAsset.url, '_blank')}>
                <ImageIcon className="mr-2 h-4 w-4" /> View Full Size
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 bg-slate-50 hover:bg-slate-100"
                onClick={handleSaveDraft}
                disabled={isSavingDraft || draftSaved}
              >
                {isSavingDraft ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : draftSaved ? (
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {draftSaved ? 'Saved to Drafts' : 'Save as Draft'}
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="border-2 border-green-100">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-blue-500" />
                    Recommended Caption
                  </CardTitle>
                  <Button variant="ghost" size="sm">Copy</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-slate-50 rounded-lg text-sm leading-relaxed font-mono">
                  {brief?.tagline || 'Experience the extraordinary.'}
                  <br /><br />
                  {brief?.concept || 'A premium showcase of your product.'}
                  <br /><br />
                  ✨ Now available at {productDetails?.name || 'our store'}. Shop link in bio!
                  <br /><br />
                  #fashion #ad #celebration #style {productDetails?.name?.toLowerCase().replace(/\s/g, '') ? `#${productDetails.name.toLowerCase().replace(/\s/g, '')}` : ''}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="text-lg font-bold">Ready to Publish?</h3>
              <p className="text-sm text-muted-foreground">
                Everything looks perfect. We've synchronized your generated ad with your social media draft.
              </p>
              <Button 
                size="lg" 
                className="w-full h-16 text-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                onClick={handleCreatePost}
              >
                Send to Posting Engine
                <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes loading-bar {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 95%; }
        }
      `}</style>
    </div>
  );
}
