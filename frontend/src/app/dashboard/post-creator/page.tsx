'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, Image as ImageIcon, Loader2, Upload, Target, CheckCircle2, 
  XCircle, PenSquare, Maximize2, Film, Download, X, Video, Share2, 
  Check, ArrowLeft, Layers, Wand2, ExternalLink, Cpu, Lock, Zap, ArrowRight, Bot
} from 'lucide-react';

const renderCompactStep = (title: string, content: React.ReactNode, isComplete: boolean, isActive: boolean) => (
  <div 
    className={`rounded-xl overflow-hidden transition-all duration-200 flex flex-col justify-between ${
      isComplete 
        ? 'bg-white border border-stone-200 shadow-2xs' 
        : isActive 
          ? 'bg-white border-2 border-[#D27D50] shadow-sm' 
          : 'bg-transparent border border-dashed border-stone-200 opacity-60'
    }`}
  >
    <div className={`px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider flex items-center justify-between border-b ${
      isComplete 
        ? 'text-stone-700 border-stone-100' 
        : isActive 
          ? 'text-[#D27D50] border-orange-100 bg-orange-50/50' 
          : 'text-stone-400 border-stone-200/50'
    }`}>
      <span className="flex items-center gap-1.5">
        {isActive && <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#D27D50]"></span></span>}
        {isComplete && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
        {title}
      </span>
    </div>
    <div className="p-2.5 flex-1 flex flex-col justify-center text-center bg-stone-50/30">
      {content}
    </div>
  </div>
);

const GenerationTimeline = ({ 
  statusMessage, 
  isCompleted = false, 
  referenceImageUrl,
  referenceImagePreviews = [],
  productImagePreviews = [] 
}: { 
  statusMessage: string; 
  isCompleted?: boolean;
  referenceImageUrl?: string;
  referenceImagePreviews?: string[];
  productImagePreviews?: string[];
}) => {
  const msg = (statusMessage || '').toLowerCase();
  
  let currentStep = 1;
  if (isCompleted) {
    currentStep = 5;
  } else {
    if (msg.includes('generating photo') || msg.includes('photo realism') || msg.includes('sdxl') || msg.includes('gemini')) currentStep = 2;
    else if (msg.includes('copy') || msg.includes('synthesizing') || msg.includes('brief') || msg.includes('rationale')) currentStep = 3;
    else if (msg.includes('finalizing') || msg.includes('completed') || msg.includes('assembling')) currentStep = 4;
  }

  const hasRefImg = referenceImageUrl || (referenceImagePreviews && referenceImagePreviews.length > 0);
  const refThumb = referenceImageUrl || referenceImagePreviews[0];

  return (
    <div className="mb-6 bg-stone-900 text-white p-5 rounded-2xl border border-stone-800 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
          )}
          <span className="text-xs font-black text-amber-300 uppercase tracking-widest">Generation Process Engine</span>
        </div>
        <span className="text-[10px] font-bold text-stone-400">Gemini 2.5 Realism + Style Transfer</span>
      </div>

      {/* Visual Reference & Product Previews Banner inside Process Engine */}
      {(hasRefImg || (productImagePreviews && productImagePreviews.length > 0)) && (
        <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {hasRefImg && (
              <div className="flex items-center gap-2 bg-emerald-950/60 p-1.5 pr-3 rounded-lg border border-emerald-500/30">
                <img src={refThumb} alt="Pose Reference" className="w-8 h-8 rounded object-cover border border-emerald-400/60 shadow-xs" />
                <div>
                  <span className="text-[9px] font-black uppercase text-emerald-300 block tracking-wider">🎨 Pose & Style Ref</span>
                  <span className="text-[9px] font-semibold text-stone-400">Pose & Lighting Vectors Injected</span>
                </div>
              </div>
            )}

            {productImagePreviews && productImagePreviews.length > 0 && (
              <div className="flex items-center gap-2 bg-amber-950/60 p-1.5 pr-3 rounded-lg border border-amber-500/30">
                <div className="flex -space-x-1.5">
                  {productImagePreviews.slice(0, 2).map((img, idx) => (
                    <img key={idx} src={img} alt="Product" className="w-8 h-8 rounded object-cover border border-amber-400/60 shadow-xs" />
                  ))}
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-amber-300 block tracking-wider">🔒 Identity Lock</span>
                  <span className="text-[9px] font-semibold text-stone-400">Exact Product Preserved 100%</span>
                </div>
              </div>
            )}
          </div>

          <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 shrink-0">
            Multi-Modal Active
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {renderCompactStep(
          "1. Analysis",
          <span className="text-[10px] font-extrabold text-stone-700">Multi-Modal Brief</span>,
          currentStep > 1,
          currentStep === 1
        )}
        {renderCompactStep(
          "2. AI Photo Realism",
          <span className="text-[10px] font-extrabold text-stone-700">Identity Lock & Style</span>,
          currentStep > 2,
          currentStep === 2
        )}
        {renderCompactStep(
          "3. Copy Synthesis",
          <span className="text-[10px] font-extrabold text-stone-700">Tagline & Rationale</span>,
          currentStep > 3,
          currentStep === 3
        )}
        {renderCompactStep(
          "4. Assembly",
          <span className="text-[10px] font-extrabold text-stone-700">Campaign Variations</span>,
          currentStep > 4,
          currentStep === 4
        )}
      </div>

      <div className="mt-3 text-xs font-mono text-emerald-400 bg-stone-950 rounded-xl p-3 flex items-center justify-between border border-stone-800 shadow-inner">
        <span className="truncate pr-2">$ {statusMessage}</span>
        <span className="animate-pulse inline-block w-1.5 h-3.5 bg-emerald-400 shrink-0"></span>
      </div>
    </div>
  );
};

const BrainstormingSynthesisVisualizer = ({
  productName,
  platform,
  personality,
  audience,
  referenceImagePreviews = [],
  productImagePreviews = [],
  referenceImageUrl
}: {
  productName: string;
  platform: string;
  personality?: string;
  audience?: string;
  referenceImagePreviews?: string[];
  productImagePreviews?: string[];
  referenceImageUrl?: string;
}) => {
  const refImg = referenceImageUrl || (referenceImagePreviews && referenceImagePreviews[0]);
  const prodImg = productImagePreviews && productImagePreviews[0];

  return (
    <div className="my-6 bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 text-white rounded-3xl p-6 border border-stone-800 shadow-2xl relative overflow-hidden">
      {/* Background Grid Pattern & Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-stone-800/80 pb-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-stone-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-black text-amber-300 uppercase tracking-widest flex items-center gap-2">
              <span>Multi-Modal Synthesis Pipeline</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            </h4>
            <p className="text-xs text-stone-400 font-medium">Merging visual inputs & creative brief parameters into 5 high-converting post directions...</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider rounded-xl hidden sm:inline-block">
          Active Neural Stream
        </span>
      </div>

      {/* Visual Pipeline Nodes Container */}
      <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 items-center relative z-10">
        
        {/* Node 1: Product Identity (3 Cols) */}
        <div className="lg:col-span-3 bg-stone-900/90 rounded-2xl p-4 border border-amber-500/30 shadow-lg relative group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-50 animate-pulse pointer-events-none" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-amber-300 block tracking-wider">Product Identity</span>
              <span className="text-[11px] font-bold text-stone-200 truncate block max-w-[150px]">{productName}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-stone-950 p-2.5 rounded-xl border border-stone-800 relative">
            {prodImg ? (
              <div className="relative shrink-0">
                <img src={prodImg} alt="Product" className="w-12 h-12 rounded-lg object-cover border border-amber-400/60 shadow-md" />
                <div className="absolute inset-0 bg-amber-400/20 animate-pulse rounded-lg" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-amber-400">
                <Layers className="w-6 h-6" />
              </div>
            )}
            <div className="text-[10px] space-y-1 text-stone-400 font-medium">
              <span className="text-emerald-400 font-extrabold flex items-center gap-1">✓ Fabric & Cut Preserved</span>
              <span className="text-stone-300 block">Logo / Label Lock Active</span>
            </div>
          </div>
        </div>

        {/* Connector 1 (1 Col) */}
        <div className="lg:col-span-1 flex lg:flex-col items-center justify-center gap-1 my-1 lg:my-0">
          <div className="h-0.5 lg:h-6 w-full lg:w-0.5 bg-gradient-to-r lg:bg-gradient-to-b from-amber-500 to-orange-500 animate-pulse" />
          <ArrowRight className="w-4 h-4 text-amber-400 rotate-90 lg:rotate-0 animate-bounce" />
          <div className="h-0.5 lg:h-6 w-full lg:w-0.5 bg-gradient-to-r lg:bg-gradient-to-b from-orange-500 to-rose-500 animate-pulse" />
        </div>

        {/* Node 2: Pose & Style Reference Transfer (3 Cols) */}
        <div className="lg:col-span-3 bg-stone-900/90 rounded-2xl p-4 border border-emerald-500/30 shadow-lg relative group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-50 animate-pulse pointer-events-none" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-300 block tracking-wider">Style & Pose Transfer</span>
              <span className="text-[11px] font-bold text-stone-200 block">Aesthetic Vectors</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-stone-950 p-2.5 rounded-xl border border-stone-800 relative">
            {refImg ? (
              <div className="relative shrink-0">
                <img src={refImg} alt="Style Reference" className="w-12 h-12 rounded-lg object-cover border border-emerald-400/60 shadow-md" />
                <div className="absolute inset-0 bg-emerald-400/20 animate-pulse rounded-lg" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-emerald-400">
                <Zap className="w-6 h-6" />
              </div>
            )}
            <div className="text-[10px] space-y-1 text-stone-400 font-medium">
              <span className="text-emerald-400 font-extrabold flex items-center gap-1">✓ Model Stance Extracted</span>
              <span className="text-stone-300 block">Lighting Physics Transfer</span>
            </div>
          </div>
        </div>

        {/* Connector 2 (1 Col) */}
        <div className="lg:col-span-1 flex lg:flex-col items-center justify-center gap-1 my-1 lg:my-0">
          <div className="h-0.5 lg:h-6 w-full lg:w-0.5 bg-gradient-to-r lg:bg-gradient-to-b from-emerald-500 to-rose-500 animate-pulse" />
          <ArrowRight className="w-4 h-4 text-emerald-400 rotate-90 lg:rotate-0 animate-bounce" />
          <div className="h-0.5 lg:h-6 w-full lg:w-0.5 bg-gradient-to-r lg:bg-gradient-to-b from-rose-500 to-orange-500 animate-pulse" />
        </div>

        {/* Node 3: Brand & Target Brief (3 Cols) */}
        <div className="lg:col-span-3 bg-stone-900/90 rounded-2xl p-4 border border-rose-500/30 shadow-lg relative group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-transparent opacity-50 animate-pulse pointer-events-none" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-rose-300 block tracking-wider">Commercial Brief</span>
              <span className="text-[11px] font-bold text-stone-200 block truncate max-w-[150px]">{platform}</span>
            </div>
          </div>

          <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800 space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between text-stone-300">
              <span className="font-bold text-rose-400">Tone:</span>
              <span className="truncate max-w-[120px] font-semibold">{personality || 'Bold & Premium'}</span>
            </div>
            <div className="flex items-center justify-between text-stone-300">
              <span className="font-bold text-rose-400">Audience:</span>
              <span className="truncate max-w-[120px] font-semibold">{audience || 'High Intent Buyers'}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Central Neural Synthesis Beam */}
      <div className="mt-5 pt-4 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono relative z-10">
        <div className="flex items-center gap-2 text-amber-400">
          <Bot className="w-4 h-4 animate-bounce" />
          <span className="font-bold">Gemini 2.5 Multi-Modal Brainstorming Active</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-[11px] font-semibold text-stone-400">Synthesizing 5 Commercial Post Variations...</span>
        </div>
      </div>
    </div>
  );
};

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
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [referencePreviews, setReferencePreviews] = useState<string[]>([]);
  const refInputRef = useRef<HTMLInputElement>(null);

  // Directions & History State
  const [directions, setDirections] = useState<any[]>([]);
  const [selectedDirections, setSelectedDirections] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Active Campaign State (Reels Creator UX pattern)
  const [activeCampaign, setActiveCampaign] = useState<{
    id: string;
    productName: string;
    platform: string;
    createdAt: string;
    referenceImageUrl?: string;
    status: 'BRAINSTORMING' | 'SELECTING_DIRECTIONS' | 'GENERATING' | 'COMPLETED';
    statusMessage?: string;
    directions: any[];
    selectedDirections: any[];
    items: any[];
  } | null>(null);

  // Brief Details Modal State
  const [selectedBriefDetail, setSelectedBriefDetail] = useState<any | null>(null);

  // Animate Image-to-Video State
  const [animateModalOpen, setAnimateModalOpen] = useState(false);
  const [selectedAdForAnimate, setSelectedAdForAnimate] = useState<any>(null);
  const [animatePrompt, setAnimatePrompt] = useState('');
  const [animating, setAnimating] = useState(false);
  const [activeReelId, setActiveReelId] = useState<string | null>(null);
  const [animStatus, setAnimStatus] = useState<string | null>(null);
  const [animStatusMsg, setAnimStatusMsg] = useState('');
  const [animResultVideoUrl, setAnimResultVideoUrl] = useState<string | null>(null);
  
  // Rendered Video Map & View Mode per campaign
  const [renderedVideoMap, setRenderedVideoMap] = useState<Record<string, string>>({});
  const [viewModeMap, setViewModeMap] = useState<Record<string, 'image' | 'video'>>({});

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/ad-creator/history', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Restore active campaign from localStorage on mount / page refresh
  useEffect(() => {
    const savedActiveCampaign = localStorage.getItem('postCreator_activeCampaign');
    if (savedActiveCampaign) {
      try {
        const parsed = JSON.parse(savedActiveCampaign);
        if (parsed && parsed.id) {
          setActiveCampaign(parsed);
          if (parsed.status === 'GENERATING') {
            setTimeout(() => {
              handleGenerateAd(parsed);
            }, 300);
          }
        }
      } catch (e) {
        console.warn('Failed to parse saved active campaign', e);
      }
    }
  }, []);

  // Sync activeCampaign state to localStorage whenever updated
  useEffect(() => {
    if (activeCampaign) {
      localStorage.setItem('postCreator_activeCampaign', JSON.stringify(activeCampaign));
    }
  }, [activeCampaign]);

  // Restore in-flight active reel animation from localStorage on mount
  useEffect(() => {
    const savedReelId = localStorage.getItem('postCreator_activeReelId');
    const savedAdStr = localStorage.getItem('postCreator_activeAd');
    if (savedReelId) {
      setActiveReelId(savedReelId);
      setAnimating(true);
      setAnimStatus('GENERATING');
      setAnimStatusMsg('Resuming Google Veo 3 video rendering...');
      if (savedAdStr) {
        try {
          setSelectedAdForAnimate(JSON.parse(savedAdStr));
        } catch (e) {}
      }
    }
  }, []);

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
            localStorage.removeItem('postCreator_activeReelId');
            localStorage.removeItem('postCreator_activeAd');

            if (selectedAdForAnimate?.id) {
              const adId = selectedAdForAnimate.id;
              setRenderedVideoMap(prev => ({ ...prev, [adId]: reel.videoUrl }));
              setViewModeMap(prev => ({ ...prev, [adId]: 'video' }));
              setHistory(prev => prev.map(item => item.id === adId ? { ...item, videoUrl: reel.videoUrl } : item));
            }
            clearInterval(interval);
          } else if (reel.status === 'FAILED') {
            setAnimating(false);
            localStorage.removeItem('postCreator_activeReelId');
            localStorage.removeItem('postCreator_activeAd');
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Failed to poll reel status', err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeReelId, selectedAdForAnimate]);

  const openAnimateModal = (ad: any) => {
    setSelectedAdForAnimate(ad);
    const brief = ad.brief || {};
    const prodName = ad.productName || productName || 'Product';
    const dirName = ad.direction || 'Creative Ad';
    
    const imagePromptText = brief.imagePrompt || `High-end commercial advertisement featuring ${prodName}`;
    const visualSetup = brief.visualSceneSetup || brief.sceneSetup || brief.campaignConcept || `Professional studio showcase of ${prodName}`;
    const layoutEffects = brief.layoutAndEffects || 'Dynamic lighting, subtle motion blur, crisp reflections, premium composition';
    const taglineText = brief.tagline || '';
    const supportingText = brief.supportingCopy || brief.copy || '';

    const veo3JsonPrompt = JSON.stringify({
      "veo_model": "veo-3.0-fast-generate-001",
      "prompt_type": "image_to_video_motion_graphic",
      "subject": {
        "name": prodName,
        "direction": dirName,
        "details": imagePromptText,
        "physical_motion": `Full physical scene animation of ${prodName}. Subject dynamically moves with realistic temporal weight, surface reflections shift across materials, and physical properties animate with 3D depth.`
      },
      "environment_and_scene": {
        "setup": visualSetup,
        "effects": layoutEffects,
        "background_motion": "Background lighting shifts gracefully, subtle environmental particle effects float with volumetric depth, ambient light reflections glide across the scene."
      },
      "camera": {
        "movement": "Slow 3D push-in camera tracking shot with natural depth parallax effect",
        "framing": "9:16 vertical portrait composition"
      },
      "kinetic_typography": {
        "headline_text": taglineText,
        "supporting_text": supportingText,
        "animation_style": taglineText 
          ? `Kinetic typography motion graphics animating text "${taglineText}" with snappy keyframe scaling and entrance motion design.`
          : `Dynamic kinetic text animation with bold typography motion graphics.`
      },
      "cinematography_and_physics": {
        "lighting": "High-end commercial studio lighting, vibrant rim highlights, sharp focal clarity",
        "physics_realism": "Adheres strictly to physical weight, gravity, real-time natural human speed, and physical temporal consistency"
      }
    }, null, 2);
    
    setAnimatePrompt(veo3JsonPrompt);
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
          model: 'veo-3.0-fast-generate-001',
          adId: selectedAdForAnimate.id
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to start video animation');
      }

      const data = await res.json();
      const reelId = data.data.reel.id;
      setActiveReelId(reelId);
      localStorage.setItem('postCreator_activeReelId', reelId);
      if (selectedAdForAnimate) {
        localStorage.setItem('postCreator_activeAd', JSON.stringify(selectedAdForAnimate));
      }
    } catch (err: any) {
      setAnimating(false);
      setAnimStatus('FAILED');
      setAnimStatusMsg(err.message || 'Error starting animation');
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
        const fetchedFiles: File[] = [];
        const fetchedPreviews: string[] = [];
        for (let i = 0; i < Math.min(data.images.length, 4); i++) {
          try {
            const proxyUrl = `/api/scrape/proxy-image?url=${encodeURIComponent(data.images[i])}`;
            const imgRes = await fetch(proxyUrl);
            if (imgRes.ok) {
              const blob = await imgRes.blob();
              const file = new File([blob], `imported-product-${i + 1}.jpg`, { type: blob.type || 'image/jpeg' });
              fetchedFiles.push(file);
              fetchedPreviews.push(URL.createObjectURL(file));
            }
          } catch (e) {
            console.warn('Failed to proxy scraped image', e);
          }
        }
        if (fetchedFiles.length > 0) {
          setImageFiles(prev => [...prev, ...fetchedFiles].slice(0, 4));
          setImagePreviews(prev => [...prev, ...fetchedPreviews].slice(0, 4));
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setScraping(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const newFiles = [...imageFiles, ...selectedFiles].slice(0, 4);
      setImageFiles(newFiles);
      setImagePreviews(newFiles.map(f => URL.createObjectURL(f)));
    }
  };

  const removeImageFile = (index: number) => {
    const updatedFiles = imageFiles.filter((_, i) => i !== index);
    setImageFiles(updatedFiles);
    setImagePreviews(updatedFiles.map(f => URL.createObjectURL(f)));
  };

  const handleReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const newFiles = [...referenceFiles, ...selectedFiles].slice(0, 4);
      setReferenceFiles(newFiles);
      setReferencePreviews(newFiles.map(f => URL.createObjectURL(f)));
    }
  };

  const removeReferenceFile = (index: number) => {
    const updatedFiles = referenceFiles.filter((_, i) => i !== index);
    setReferenceFiles(updatedFiles);
    setReferencePreviews(updatedFiles.map(f => URL.createObjectURL(f)));
  };

  const handleClearForm = () => {
    setProductName('');
    setDescription('');
    setUsp('');
    setPersonality('');
    setAudience('');
    setMagicLink('');
    setSpecialInstructions('');
    setImageFiles([]);
    setImagePreviews([]);
    setReferenceFiles([]);
    setReferencePreviews([]);
    setStep(1);
    setDirections([]);
    setSelectedDirections([]);
    setActiveCampaign(null);
    localStorage.removeItem('postCreator_activeCampaign');
    setError(null);
  };

  const handleGenerateDirections = async () => {
    if (!productName || !description) {
        setError("Product Name and Description are required to brainstorm directions.");
        return;
    }
    setLoading(true);
    setError(null);

    const groupRefImg = referencePreviews[0] || imagePreviews[0] || (magicLink ? `/api/scrape/proxy-image?url=${encodeURIComponent(magicLink)}` : undefined);

    const newCampaign = {
      id: `camp-${Date.now()}`,
      productName: productName,
      platform: platform,
      createdAt: new Date().toISOString(),
      referenceImageUrl: groupRefImg,
      status: 'BRAINSTORMING' as const,
      statusMessage: 'Gemini 2.5 Multi-Modal Engine: Analyzing product brief, pose references & synthesizing 5 directions...',
      directions: [],
      selectedDirections: [],
      items: []
    };

    setActiveCampaign(newCampaign);
    localStorage.setItem('postCreator_activeCampaign', JSON.stringify(newCampaign));

    // Smooth scroll to campaign card instantly
    setTimeout(() => {
      const campaignEl = document.getElementById('active-campaign-card');
      if (campaignEl) campaignEl.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      const formData = new FormData();
      imageFiles.forEach(file => {
        formData.append('images', file);
      });
      referenceFiles.forEach(refFile => {
        formData.append('referenceImages', refFile);
      });
      formData.append('productName', productName);
      formData.append('description', description);
      formData.append('usp', usp);
      formData.append('personality', personality);
      formData.append('audience', audience);
      formData.append('platform', platform);
      formData.append('mood', mood);
      if (specialInstructions) {
        formData.append('specialInstructions', specialInstructions);
      }

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
      setSelectedDirections([...data.directions]);

      setActiveCampaign(prev => prev ? ({
        ...prev,
        status: 'SELECTING_DIRECTIONS',
        statusMessage: '5 Creative Directions Proposed. Select options below to generate campaign.',
        directions: data.directions,
        selectedDirections: [...data.directions]
      }) : null);

    } catch (err: any) {
      setError(err.message);
      setActiveCampaign(prev => prev ? ({
        ...prev,
        statusMessage: `Brainstorming Error: ${err.message}`
      }) : null);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAd = async (targetCampaign?: any) => {
    const campaignToRun = targetCampaign || activeCampaign;
    if (!campaignToRun || !campaignToRun.selectedDirections || campaignToRun.selectedDirections.length === 0) return;

    setLoading(true);
    setError(null);

    setActiveCampaign(prev => prev ? ({
      ...prev,
      status: 'GENERATING',
      statusMessage: 'Initializing AI photo realism engine & prompt analysis...'
    }) : null);

    try {
      const generatedResults = [...(campaignToRun.items || [])];
      let stepIndex = 0;

      for (const direction of campaignToRun.selectedDirections) {
        const dirTitle = direction.title || direction;
        const alreadyGenerated = generatedResults.some((it: any) => 
          (it.direction?.title || it.direction) === dirTitle
        );

        if (alreadyGenerated) {
          continue;
        }

        stepIndex++;
        setActiveCampaign(prev => prev ? ({
          ...prev,
          status: 'GENERATING',
          statusMessage: `Synthesizing Direction ${stepIndex} of ${campaignToRun.selectedDirections.length}: "${dirTitle}"...`
        }) : null);

        const formData = new FormData();
        formData.append('productName', productName || campaignToRun.productName);
        formData.append('direction', JSON.stringify(direction));
        formData.append('platform', platform || campaignToRun.platform);
        if (specialInstructions) {
          formData.append('specialInstructions', specialInstructions);
        }
        imageFiles.forEach(file => {
          formData.append('images', file);
        });
        referenceFiles.forEach(refFile => {
          formData.append('referenceImages', refFile);
        });

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
        const newItem = { brief: data.brief, imageUrl: data.imageUrl, direction, id: data.brief?.id || `ad-${Date.now()}-${stepIndex}` };
        generatedResults.push(newItem);

        setActiveCampaign(prev => prev ? ({
          ...prev,
          items: [...generatedResults],
          statusMessage: `Completed ${generatedResults.length} of ${campaignToRun.selectedDirections.length} variations.`
        }) : null);
      }

      setActiveCampaign(prev => prev ? ({
        ...prev,
        items: [...generatedResults],
        status: 'COMPLETED',
        statusMessage: `Successfully generated ${generatedResults.length} post variations!`
      }) : null);

      fetchHistory();
    } catch (err: any) {
      setError(err.message);
      setActiveCampaign(prev => prev ? ({
        ...prev,
        statusMessage: `Generation Error: ${err.message}`
      }) : null);
    } finally {
      setLoading(false);
    }
  };

  const handleComposePost = (brief: any, imageUrl: string, videoUrl?: string) => {
    const postData = {
      content: `${brief.tagline ? brief.tagline + '\n\n' : ''}${brief.supportingCopy ? brief.supportingCopy + '\n\n' : ''}${brief.copy || ''}\n\n${brief.callToAction || ''}`.trim(),
      mediaUrls: videoUrl ? [videoUrl] : (imageUrl ? [imageUrl] : [])
    };
    localStorage.setItem('composeAdData', JSON.stringify(postData));
    router.push('/dashboard/posts/new');
  };

  const handleComposeEntireCampaign = (items: any[]) => {
    if (!items || items.length === 0) return;

    const firstItem = items[0];
    const prodName = (firstItem.productName || productName || 'Product Campaign').toUpperCase();

    const mediaUrls = items
      .map(item => item.videoUrl || renderedVideoMap[item.id] || item.imageUrl)
      .filter(Boolean);

    const firstBrief = firstItem.brief || {};
    const mainTagline = firstBrief.tagline ? '✨ ' + firstBrief.tagline + '\n\n' : '';
    const mainCopy = firstBrief.supportingCopy || firstBrief.copy || '';
    const mainCta = firstBrief.callToAction ? '\n\n' + firstBrief.callToAction : '';

    const slideSummaries = items.map((item, idx) => {
      const b = item.brief || {};
      const t = b.tagline ? '"' + b.tagline + '"' : (item.direction || ('Option ' + (idx + 1)));
      return 'Slide ' + (idx + 1) + ': ' + t;
    }).join('\n');

    const fullCaption = ('🚀 ' + prodName + '\n\n' + mainTagline + mainCopy + mainCta + '\n\n📸 Carousel Collection (' + items.length + ' Variations):\n' + slideSummaries + '\n\n👉 Swipe to explore all creative styles!').trim();

    const postData = {
      content: fullCaption,
      mediaUrls
    };

    localStorage.setItem('composeAdData', JSON.stringify(postData));
    router.push('/dashboard/posts/new');
  };

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
      {/* Motion Graphic In-Progress Banner */}
      {activeReelId && animating && (
        <div className="mb-8 p-5 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white rounded-2xl border border-stone-700 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-500">
          <div className="flex items-center gap-3.5">
            <div className="bg-orange-500/20 p-2.5 rounded-xl border border-orange-500/30 shrink-0">
              <Loader2 className="w-6 h-6 text-[#D27D50] animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-black uppercase tracking-wider text-[#D27D50]">Google Veo 3 Motion Video Engine</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">In Progress</span>
              </div>
              <p className="text-sm font-bold text-stone-200">{animStatusMsg || 'Rendering video in background...'}</p>
            </div>
          </div>
          
          <Button
            onClick={() => setAnimateModalOpen(true)}
            className="bg-gradient-to-r from-[#D27D50] to-rose-500 hover:from-[#b86d45] hover:to-rose-600 text-white font-bold rounded-xl px-5 py-2.5 shadow-md flex items-center gap-2 text-xs shrink-0"
          >
            <Film className="w-4 h-4 text-white" />
            <span>Open Motion Graphic Live Preview</span>
          </Button>
        </div>
      )}

      {error && (
        <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-2xl font-medium border border-red-100 flex items-center gap-3 shadow-sm">
          <XCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Step 1: Brief & Assets Container */}
      {step === 1 && (
        <div className="bg-gradient-to-br from-[#1C1814] via-[#241F1A] to-[#171310] text-white rounded-[36px] p-8 lg:p-10 shadow-[0_25px_70px_rgba(0,0,0,0.3)] border border-amber-500/20 grid grid-cols-1 lg:grid-cols-2 gap-10 relative overflow-hidden">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-amber-500/10 blur-[90px] rounded-full pointer-events-none"></div>
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-rose-500/10 blur-[90px] rounded-full pointer-events-none"></div>

          <div className="space-y-6 relative z-10">
            <h2 className="text-xl font-extrabold text-white border-b border-stone-800 pb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-amber-400" />
              <span>1. Visual Assets & Inspiration</span>
            </h2>
            
            {/* Magic Link Box */}
            <div className="bg-stone-900/90 border border-amber-500/30 rounded-2xl p-4 shadow-lg backdrop-blur-md hover:border-amber-400/50 transition-colors">
              <label className="block text-xs font-black text-amber-200 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                  Magic Link Import
                </span>
                <span className="text-[10px] text-amber-300 bg-amber-500/20 font-bold px-2.5 py-0.5 rounded-md border border-amber-400/30">Auto-Extract Photos</span>
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={magicLink} 
                  onChange={e => setMagicLink(e.target.value)} 
                  className="flex-1 bg-stone-950 border border-stone-800 text-stone-100 placeholder-stone-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all font-medium" 
                  placeholder="Paste Shopify, Amazon, or store product URL..." 
                />
                <Button onClick={handleMagicLink} disabled={scraping || !magicLink} className="bg-gradient-to-r from-[#D27D50] via-amber-600 to-rose-500 hover:from-[#b86d45] hover:to-rose-600 text-white rounded-xl px-6 transition-all shadow-md font-bold text-sm">
                  {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product Photos (Identity Lock) - Clean header without extra button */}
              <div className="bg-gradient-to-br from-stone-900/90 via-stone-900/60 to-stone-950/80 border-2 border-dashed border-amber-500/40 rounded-3xl p-5 flex flex-col justify-between min-h-[230px] relative shadow-inner hover:border-amber-400/70 transition-all group/prodCard">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  className="hidden" 
                  accept="image/*" 
                  multiple 
                />
                <div className="mb-3">
                  <h4 className="font-extrabold text-sm text-white mb-1">Product Photos</h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/30">🔒 Identity Lock</span>
                    <span className="text-[11px] text-stone-400 font-medium">Product stays 100% identical ({imagePreviews.length}/4)</span>
                  </div>
                </div>

                {imagePreviews.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {imagePreviews.map((src, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-stone-800 shadow-sm group">
                        <img src={src} alt={`Product ${idx+1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeImageFile(idx); }}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex flex-col items-center justify-center cursor-pointer border border-dashed border-stone-800 rounded-2xl p-4 hover:bg-stone-900/80 transition-colors"
                  >
                    <div className="w-10 h-10 bg-stone-900 rounded-full flex items-center justify-center mb-2 shadow-xs border border-amber-500/30">
                      <Upload className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="font-bold text-xs text-stone-200 text-center">
                      Upload Product Shots<br/>
                      <span className="text-stone-400 font-normal text-[11px]">Upload front, angle, or close-ups</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Pose & Style Reference Photos - Clean header without extra button */}
              <div className="bg-gradient-to-br from-stone-900/90 via-stone-900/60 to-stone-950/80 border-2 border-dashed border-emerald-500/40 rounded-3xl p-5 flex flex-col justify-between min-h-[230px] relative shadow-inner hover:border-emerald-400/70 transition-all group/refCard">
                <input 
                  type="file" 
                  ref={refInputRef} 
                  onChange={handleReferenceChange} 
                  className="hidden" 
                  accept="image/*" 
                  multiple 
                />
                <div className="mb-3">
                  <h4 className="font-extrabold text-sm text-white mb-1">Pose & Style References</h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-400/30">🎨 Style Transfer</span>
                    <span className="text-[11px] text-stone-400 font-medium">Model pose & lighting ({referencePreviews.length}/4)</span>
                  </div>
                </div>

                {referencePreviews.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {referencePreviews.map((src, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-stone-800 shadow-sm group">
                        <img src={src} alt={`Reference ${idx+1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeReferenceFile(idx); }}
                          className="absolute top-1 right-1 w-5 h-5 bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div 
                    onClick={() => refInputRef.current?.click()}
                    className="flex-1 flex flex-col items-center justify-center cursor-pointer border border-dashed border-stone-800 rounded-2xl p-4 hover:bg-stone-900/80 transition-colors"
                  >
                    <div className="w-10 h-10 bg-stone-900 rounded-full flex items-center justify-center mb-2 shadow-xs border border-emerald-500/30">
                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="font-bold text-xs text-stone-200 text-center">
                      Upload Pose / Style References<br/>
                      <span className="text-stone-400 font-normal text-[11px]">Upload model poses or lighting</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Special Instructions Input */}
            <div className="bg-stone-950/90 border border-amber-500/30 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-2">
              <label className="block text-xs font-black text-white tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Special Style & Pose Instructions <span className="text-stone-400 font-normal lowercase">(optional)</span>
                </span>
                <span className="text-[9px] text-amber-300 font-black uppercase tracking-wider bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-400/30">AI Guidance</span>
              </label>
              <textarea
                value={specialInstructions}
                onChange={e => setSpecialInstructions(e.target.value)}
                rows={2}
                className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-amber-200 placeholder-stone-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 resize-none transition-shadow font-medium"
                placeholder='e.g. "Focus on model posture and warm sunset studio lighting from Reference #1, keep the model on a luxury marble balcony overlooking the ocean."'
              />
            </div>
          </div>

          <div className="space-y-6 relative z-10">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-400" />
                <span>2. Campaign Brief & Specs</span>
              </h2>
              <Button onClick={handleClearForm} variant="ghost" className="text-stone-400 hover:text-red-400 font-semibold h-8 px-3 rounded-lg text-xs">Clear Form</Button>
            </div>
            
            <div>
              <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-1.5">Product Name <span className="text-red-400">*</span></label>
              <input type="text" value={productName} onChange={e => setProductName(e.target.value)} className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-shadow shadow-xs font-medium" placeholder="e.g. Aura Smart Mug" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-1.5">Core USP</label>
                <input type="text" value={usp} onChange={e => setUsp(e.target.value)} className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-shadow shadow-xs font-medium" placeholder="Keeps coffee hot all day" />
              </div>
              <div>
                <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-1.5">Platform</label>
                <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-shadow shadow-xs font-medium">
                  <option>Instagram Feed (4:5)</option>
                  <option>Instagram Stories (9:16)</option>
                  <option>Landscape Post (16:9)</option>
                  <option>Square Ad (1:1)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-1.5">Personality</label>
                <input type="text" value={personality} onChange={e => setPersonality(e.target.value)} className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-shadow shadow-xs font-medium" placeholder="Bold, premium, tech" />
              </div>
              <div>
                <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-1.5">Target Audience</label>
                <input type="text" value={audience} onChange={e => setAudience(e.target.value)} className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-shadow shadow-xs font-medium" placeholder="Remote workers, creatives" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-1.5">Brief Description <span className="text-red-400">*</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 resize-none transition-shadow shadow-xs font-medium" placeholder="A matte black smart mug with a glowing LED ring at the base..." />
            </div>

            <div className="pt-3">
              <Button 
                onClick={handleGenerateDirections} 
                disabled={!productName || !description}
                className="w-full bg-gradient-to-r from-[#D27D50] via-rose-500 to-[#C26032] hover:from-[#b86d45] hover:to-rose-600 text-white rounded-2xl h-14 font-extrabold text-base transition-all shadow-xl shadow-orange-500/25 hover:scale-[1.005] uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>Propose 5 Creative Directions</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Active Campaign Card (Same UX pattern as reels-creator) */}
      {activeCampaign && (
        <div id="active-campaign-card" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto pt-6">
          <div className="bg-white rounded-[32px] p-6 lg:p-8 border border-stone-200/90 shadow-md space-y-6">
            
            {/* Campaign Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-100/80 text-[#D27D50] flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-2xl font-black text-stone-900 tracking-tight">{activeCampaign.productName}</h3>
                  <span className="px-3 py-1 bg-stone-100 text-stone-700 text-xs font-black rounded-full uppercase tracking-wider border border-stone-200/60">
                    {activeCampaign.platform}
                  </span>
                  {activeCampaign.status === 'BRAINSTORMING' && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-900 text-xs font-extrabold rounded-full uppercase tracking-wider border border-amber-300 flex items-center gap-1.5 animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                      Brainstorming 5 Directions...
                    </span>
                  )}
                  {activeCampaign.status === 'SELECTING_DIRECTIONS' && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-extrabold rounded-full uppercase tracking-wider border border-amber-200">
                      5 Directions Proposed
                    </span>
                  )}
                  {activeCampaign.status === 'GENERATING' && (
                    <span className="px-3 py-1 bg-orange-100 text-[#D27D50] text-xs font-extrabold rounded-full uppercase tracking-wider border border-orange-200 animate-pulse">
                      Generating Assets...
                    </span>
                  )}
                  {activeCampaign.status === 'COMPLETED' && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full uppercase tracking-wider border border-emerald-200">
                      Campaign Ready
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-stone-500 pl-11 flex items-center gap-2">
                  <span>Created {new Date(activeCampaign.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {activeCampaign.referenceImageUrl && (
                  <a 
                    href={activeCampaign.referenceImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 bg-stone-900 text-white p-1.5 pr-3.5 rounded-2xl border border-stone-800 shadow-md hover:scale-105 transition-all group/refHead"
                    title="View Style Reference"
                  >
                    <img src={activeCampaign.referenceImageUrl} alt="Target Reference" className="w-9 h-9 rounded-xl object-cover border border-amber-400/80 shadow-xs" />
                    <div className="text-left">
                      <span className="text-[9px] font-black uppercase text-amber-300 block tracking-wider">Style Ref</span>
                      <span className="text-[10px] font-extrabold text-stone-200 flex items-center gap-1">
                        View <ExternalLink className="w-3 h-3 text-amber-300" />
                      </span>
                    </div>
                  </a>
                )}

                {activeCampaign.status === 'COMPLETED' && activeCampaign.items.length > 0 && (
                  <Button
                    onClick={() => handleComposeEntireCampaign(activeCampaign.items)}
                    className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 hover:from-stone-800 hover:to-stone-700 text-white rounded-2xl font-bold px-6 py-3 shadow-md flex items-center gap-2 text-xs"
                  >
                    <Share2 className="w-4 h-4 text-[#D27D50]" />
                    <span>Compose Entire Campaign ({activeCampaign.items.length} Variations)</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Phase 0: Live Brainstorming Process State */}
            {activeCampaign.status === 'BRAINSTORMING' && (
              <div className="space-y-6">
                <GenerationTimeline 
                  statusMessage={activeCampaign.statusMessage || 'Brainstorming 5 commercial creative directions...'} 
                  referenceImageUrl={activeCampaign.referenceImageUrl}
                  referenceImagePreviews={referencePreviews}
                  productImagePreviews={imagePreviews}
                />

                {/* Animated Multi-Modal Synthesis Pipeline Visualizer */}
                <BrainstormingSynthesisVisualizer
                  productName={activeCampaign.productName}
                  platform={activeCampaign.platform}
                  personality={personality}
                  audience={audience}
                  referenceImagePreviews={referencePreviews}
                  productImagePreviews={imagePreviews}
                  referenceImageUrl={activeCampaign.referenceImageUrl}
                />

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div>
                      <h4 className="text-base font-black text-stone-900">Brainstorming Creative Directions...</h4>
                      <p className="text-xs text-stone-500 font-medium">Gemini 2.5 Multi-Modal Engine is synthesizing 5 high-converting commercial directions.</p>
                    </div>
                    <span className="text-xs font-mono font-extrabold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 animate-pulse flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                      Synthesizing Angles (0/5)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <div key={num} className="bg-stone-50/80 rounded-2xl p-5 border-2 border-dashed border-stone-200 animate-pulse space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="bg-stone-200 text-stone-500 font-black text-[10px] uppercase px-2.5 py-1 rounded-lg">Option {num}</span>
                          <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                        </div>
                        <div className="h-5 bg-stone-200 rounded-lg w-3/4"></div>
                        <div className="h-3 bg-stone-200 rounded-lg w-full"></div>
                        <div className="h-3 bg-stone-200 rounded-lg w-5/6"></div>
                        <div className="pt-2 text-center text-[10px] font-black text-amber-600 uppercase tracking-wider">
                          Synthesizing Creative Rationale...
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Phase 1: Direction Options Selection inside Campaign Card */}
            {activeCampaign.status === 'SELECTING_DIRECTIONS' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-black text-stone-900">Select Creative Directions for Campaign</h4>
                    <p className="text-xs text-stone-500 font-medium">Click to select which direction options to generate for this campaign card.</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const allSelected = activeCampaign.selectedDirections.length === activeCampaign.directions.length;
                      setActiveCampaign(prev => prev ? ({
                        ...prev,
                        selectedDirections: allSelected ? [] : [...prev.directions]
                      }) : null);
                    }} 
                    className="font-bold text-xs rounded-xl border-stone-200 hover:bg-stone-50 h-9 px-3.5"
                  >
                    {activeCampaign.selectedDirections.length === activeCampaign.directions.length ? 'Deselect All' : 'Select All (5)'}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {activeCampaign.directions.map((dir, idx) => {
                    const isSelected = activeCampaign.selectedDirections.some(d => d.id === dir.id || d.title === dir.title);
                    return (
                      <div 
                        key={idx}
                        onClick={() => {
                          const exists = activeCampaign.selectedDirections.some(d => d.id === dir.id || d.title === dir.title);
                          setActiveCampaign(prev => prev ? ({
                            ...prev,
                            selectedDirections: exists
                              ? prev.selectedDirections.filter(d => d.id !== dir.id && d.title !== dir.title)
                              : [...prev.selectedDirections, dir]
                          }) : null);
                        }}
                        className={`bg-white rounded-2xl p-5 cursor-pointer border-2 transition-all duration-300 flex flex-col justify-between group ${
                          isSelected 
                            ? 'border-[#D27D50] shadow-md shadow-[#D27D50]/10 bg-amber-50/20 -translate-y-0.5' 
                            : 'border-stone-200 hover:border-stone-300 hover:shadow-sm'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                              isSelected 
                                ? 'bg-[#D27D50] text-white shadow-xs' 
                                : 'bg-stone-100 text-stone-600 group-hover:bg-stone-200'
                            }`}>
                              Option {idx + 1}
                            </span>
                            {isSelected ? (
                              <div className="w-6 h-6 rounded-full bg-[#D27D50] text-white flex items-center justify-center shadow-xs">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full border-2 border-stone-200 group-hover:border-stone-300" />
                            )}
                          </div>

                          <h3 className="text-base font-black text-stone-900 mb-2 leading-snug group-hover:text-[#D27D50] transition-colors">
                            {dir.title}
                          </h3>
                          <p className="text-xs font-medium text-stone-600 leading-relaxed line-clamp-3 mb-4">
                            {dir.description}
                          </p>
                        </div>

                        <div className={`mt-auto pt-3 border-t text-center transition-colors ${isSelected ? 'border-amber-200/60' : 'border-stone-100'}`}>
                          <span className={`text-[11px] font-bold inline-flex items-center gap-1 ${
                            isSelected ? 'text-[#D27D50]' : 'text-stone-400 group-hover:text-stone-600'
                          }`}>
                            {isSelected ? '✓ Direction Selected' : '+ Click to Select'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  <span className="text-xs font-bold text-stone-600">
                    {activeCampaign.selectedDirections.length} of {activeCampaign.directions.length} directions selected
                  </span>
                  <Button 
                    onClick={() => handleGenerateAd(activeCampaign)}
                    disabled={loading || activeCampaign.selectedDirections.length === 0}
                    className="bg-gradient-to-r from-[#D27D50] via-rose-500 to-[#C26032] hover:from-[#b86d45] hover:to-rose-600 text-white rounded-xl font-black px-8 h-12 shadow-lg transition-all text-sm w-full sm:w-auto flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>{loading ? 'Generating Assets...' : `Generate Selected Campaigns (${activeCampaign.selectedDirections.length})`}</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Phase 2: Live Generation Process Details & Timeline */}
            {activeCampaign.status === 'GENERATING' && (
              <div className="space-y-6">
                <GenerationTimeline 
                  statusMessage={activeCampaign.statusMessage || 'Processing campaign assets...'} 
                  referenceImageUrl={activeCampaign.referenceImageUrl}
                  referenceImagePreviews={referencePreviews}
                  productImagePreviews={imagePreviews}
                />

                {activeCampaign.items.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                    {activeCampaign.items.map((ad: any) => (
                      <div key={ad.id} className="bg-stone-50/50 rounded-2xl overflow-hidden border border-stone-200/80 shadow-2xs flex flex-col">
                        <div className="h-56 w-full bg-stone-950 relative overflow-hidden">
                          <img src={ad.imageUrl} alt={ad.direction?.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                          <div className="absolute bottom-3 left-3 right-3">
                            <span className="text-white text-xs font-black uppercase block">{ad.direction?.title}</span>
                          </div>
                        </div>
                        <div className="p-4 flex-1 flex flex-col bg-white">
                          <p className="text-xs font-black text-stone-900 line-clamp-2 mb-2">"{ad.brief?.tagline || ''}"</p>
                          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 self-start">Variation Ready</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Phase 3: Generated Post Variations Grid inside Campaign Card */}
            {activeCampaign.status === 'COMPLETED' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeCampaign.items.map((ad: any) => {
                    const adVideoUrl = ad.videoUrl || renderedVideoMap[ad.id];
                    const currentViewMode = viewModeMap[ad.id] || (adVideoUrl ? 'video' : 'image');

                    return (
                      <div key={ad.id} className="bg-stone-50/50 rounded-2xl overflow-hidden border border-stone-200/80 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col group/card">
                        <div className="h-56 w-full bg-stone-950 relative overflow-hidden group/img">
                          {currentViewMode === 'video' && adVideoUrl ? (
                            <video src={adVideoUrl} controls autoPlay muted loop className="w-full h-full object-cover" />
                          ) : (
                            <img src={ad.imageUrl} alt={ad.productName} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105" />
                          )}

                          {adVideoUrl && (
                            <div className="absolute top-3 left-3 z-20 flex gap-1 bg-black/75 backdrop-blur-md p-1 rounded-xl border border-white/20 shadow-lg">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setViewModeMap(prev => ({ ...prev, [ad.id]: 'image' })); }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all ${currentViewMode === 'image' ? 'bg-[#D27D50] text-white shadow-sm' : 'text-stone-300 hover:text-white'}`}
                              >
                                Photo
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setViewModeMap(prev => ({ ...prev, [ad.id]: 'video' })); }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 ${currentViewMode === 'video' ? 'bg-gradient-to-r from-[#D27D50] to-rose-500 text-white shadow-sm' : 'text-stone-300 hover:text-white'}`}
                              >
                                <Film className="w-3 h-3 animate-pulse" /> Motion Video
                              </button>
                            </div>
                          )}

                          {!adVideoUrl && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
                              <a href={ad.imageUrl} target="_blank" rel="noopener noreferrer" className="bg-white/95 text-stone-900 hover:bg-white px-4 py-2 rounded-xl font-extrabold flex items-center gap-2 transform translate-y-4 group-hover/img:translate-y-0 transition-all duration-300 shadow-xl text-xs">
                                <Maximize2 className="w-3.5 h-3.5" /> View High-Res
                              </a>
                            </div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none"></div>
                          <div className="absolute bottom-3 left-3 right-3">
                            <span className="text-white text-xs font-black uppercase tracking-wider block drop-shadow-md">
                              {ad.direction?.title || ad.direction}
                            </span>
                          </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col bg-white">
                          <p className="text-sm font-black text-stone-900 line-clamp-2 mb-1.5 leading-tight">"{ad.brief?.tagline || ''}"</p>
                          <p className="text-xs font-medium text-stone-500 line-clamp-2 mb-3 flex-1">{ad.brief?.supportingCopy || ad.brief?.copy || ''}</p>

                          {ad.brief && (
                            <button
                              type="button"
                              onClick={() => setSelectedBriefDetail(ad.brief)}
                              className="mb-3 flex w-full items-center justify-center gap-1.5 bg-[#F2F6F2] hover:bg-[#E8EDE8] border border-emerald-100/50 text-emerald-700 font-semibold text-xs py-2 rounded-lg transition-colors shadow-2xs"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              View Generation Details
                            </button>
                          )}

                          <div className="flex gap-2 mt-auto pt-3 border-t border-stone-100">
                            <Button 
                              onClick={() => openAnimateModal(ad)}
                              className="flex-1 rounded-xl font-extrabold bg-gradient-to-r from-[#D27D50] via-orange-500 to-rose-500 hover:from-[#b86d45] hover:to-rose-600 text-white transition-all duration-300 shadow-md flex items-center justify-center gap-1.5 text-xs py-2.5"
                            >
                              <Film className="w-3.5 h-3.5" />
                              <span>{adVideoUrl ? 'Re-Animate' : 'Animate'}</span>
                            </Button>
                            <Button 
                              onClick={() => handleComposePost(ad.brief, ad.imageUrl, adVideoUrl)}
                              variant="outline"
                              className="flex-1 rounded-xl font-extrabold border-stone-200 hover:border-[#D27D50] hover:text-[#D27D50] transition-colors flex items-center justify-center gap-1.5 text-xs py-2.5"
                            >
                              <PenSquare className="w-3.5 h-3.5" />
                              Compose
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Brief Details Modal */}
      {selectedBriefDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 lg:p-8 shadow-2xl border border-stone-200 relative space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#D27D50] block">AI Brief Details & Rationale</span>
                <h3 className="text-xl font-black text-stone-900">{selectedBriefDetail.tagline || selectedBriefDetail.campaignConcept || 'Campaign Brief Specs'}</h3>
              </div>
              <button
                onClick={() => setSelectedBriefDetail(null)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 hover:text-stone-900 flex items-center justify-center font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {selectedBriefDetail.tagline && (
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  <span className="text-[10px] font-black uppercase text-stone-400 block mb-1">Tagline</span>
                  <p className="text-lg font-black text-stone-900">"{selectedBriefDetail.tagline}"</p>
                </div>
              )}

              {selectedBriefDetail.supportingCopy && (
                <div>
                  <span className="text-[10px] font-black uppercase text-stone-400 block mb-1">Supporting Copy</span>
                  <p className="text-stone-700 font-medium leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100">{selectedBriefDetail.supportingCopy}</p>
                </div>
              )}

              {selectedBriefDetail.visualSceneSetup && (
                <div>
                  <span className="text-[10px] font-black uppercase text-stone-400 block mb-1">Visual Scene Setup</span>
                  <p className="text-stone-700 font-medium leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100">{selectedBriefDetail.visualSceneSetup}</p>
                </div>
              )}

              {selectedBriefDetail.layoutAndEffects && (
                <div>
                  <span className="text-[10px] font-black uppercase text-stone-400 block mb-1">Layout & Special Effects</span>
                  <p className="text-stone-700 font-medium leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100">{selectedBriefDetail.layoutAndEffects}</p>
                </div>
              )}

              {selectedBriefDetail.creativeRationale && (
                <div>
                  <span className="text-[10px] font-black uppercase text-[#D27D50] block mb-1">Creative Rationale</span>
                  <p className="text-stone-600 italic leading-relaxed bg-orange-50/50 p-3 rounded-xl border border-orange-100">{selectedBriefDetail.creativeRationale}</p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-stone-100 flex justify-end">
              <Button onClick={() => setSelectedBriefDetail(null)} className="bg-stone-900 text-white rounded-xl font-bold px-6 py-2.5 text-xs">
                Close Details
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* History / Campaign Archive Section */}
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
          <div className="space-y-12">
            {(() => {
              const campaignGroups: {
                campaignId: string;
                productName: string;
                platform: string;
                createdAt: string;
                items: any[];
              }[] = [];

              history.forEach((item) => {
                const itemTime = new Date(item.createdAt).getTime();
                const existing = campaignGroups.find((g) => {
                  if ((g.productName || '').toLowerCase() !== (item.productName || '').toLowerCase()) return false;
                  const groupTime = new Date(g.createdAt).getTime();
                  return Math.abs(itemTime - groupTime) < 15 * 60 * 1000;
                });

                if (existing) {
                  existing.items.push(item);
                } else {
                  campaignGroups.push({
                    campaignId: item.id,
                    productName: item.productName || 'Creative Campaign',
                    platform: item.platform || 'INSTAGRAM',
                    createdAt: item.createdAt,
                    items: [item]
                  });
                }
              });

              return campaignGroups.map((group) => {
                const groupRefImg = group.items.find(i => i.referenceImageUrl || i.brief?.referenceImageUrl)?.referenceImageUrl 
                  || group.items.find(i => i.brief?.referenceImageUrl)?.brief?.referenceImageUrl;

                return (
                  <div key={group.campaignId} className="bg-white rounded-[28px] p-6 lg:p-8 border border-stone-200/90 shadow-sm hover:shadow-md transition-all space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-orange-100/80 text-[#D27D50] flex items-center justify-center font-bold">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <h3 className="text-2xl font-black text-stone-900 tracking-tight">{group.productName}</h3>
                          <span className="px-3 py-1 bg-stone-100 text-stone-700 text-xs font-black rounded-full uppercase tracking-wider border border-stone-200/60">
                            {group.platform}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-stone-500 pl-11 flex items-center gap-2">
                          <span>{group.items.length} Post Variations</span>
                          <span>•</span>
                          <span>Created {new Date(group.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {groupRefImg && (
                          <a 
                            href={groupRefImg}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 bg-stone-900 text-white p-1.5 pr-3.5 rounded-2xl border border-stone-800 shadow-md hover:scale-105 transition-all group/refHead"
                            title="View Target Reference Style Photo"
                          >
                            <img src={groupRefImg} alt="Target Reference" className="w-9 h-9 rounded-xl object-cover border border-amber-400/80 shadow-xs" />
                            <div className="text-left">
                              <span className="text-[9px] font-black uppercase text-amber-300 block tracking-wider">Style Ref</span>
                              <span className="text-[10px] font-extrabold text-stone-200 flex items-center gap-1">
                                View <ExternalLink className="w-3 h-3 text-amber-300" />
                              </span>
                            </div>
                          </a>
                        )}

                        <Button
                          onClick={() => handleComposeEntireCampaign(group.items)}
                          className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 hover:from-stone-800 hover:to-stone-700 text-white rounded-2xl font-bold px-6 py-3 shadow-md flex items-center gap-2 text-xs"
                        >
                          <Share2 className="w-4 h-4 text-[#D27D50]" />
                          <span>Compose Entire Campaign ({group.items.length} Variations)</span>
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {group.items.map((ad: any) => {
                        const adVideoUrl = ad.videoUrl || renderedVideoMap[ad.id];
                        const currentViewMode = viewModeMap[ad.id] || (adVideoUrl ? 'video' : 'image');

                        return (
                          <div key={ad.id} className="bg-stone-50/50 rounded-2xl overflow-hidden border border-stone-200/80 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col group/card">
                            <div className="h-56 w-full bg-stone-950 relative overflow-hidden group/img">
                              {currentViewMode === 'video' && adVideoUrl ? (
                                <video src={adVideoUrl} controls autoPlay muted loop className="w-full h-full object-cover" />
                              ) : (
                                <img src={ad.imageUrl} alt={ad.productName} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105" />
                              )}

                              {adVideoUrl && (
                                <div className="absolute top-3 left-3 z-20 flex gap-1 bg-black/75 backdrop-blur-md p-1 rounded-xl border border-white/20 shadow-lg">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setViewModeMap(prev => ({ ...prev, [ad.id]: 'image' })); }}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all ${currentViewMode === 'image' ? 'bg-[#D27D50] text-white shadow-sm' : 'text-stone-300 hover:text-white'}`}
                                  >
                                    Photo
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setViewModeMap(prev => ({ ...prev, [ad.id]: 'video' })); }}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 ${currentViewMode === 'video' ? 'bg-gradient-to-r from-[#D27D50] to-rose-500 text-white shadow-sm' : 'text-stone-300 hover:text-white'}`}
                                  >
                                    <Film className="w-3 h-3 animate-pulse" /> Motion Video
                                  </button>
                                </div>
                              )}

                              {!adVideoUrl && (
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
                                  <a href={ad.imageUrl} target="_blank" rel="noopener noreferrer" className="bg-white/95 text-stone-900 hover:bg-white px-4 py-2 rounded-xl font-extrabold flex items-center gap-2 transform translate-y-4 group-hover/img:translate-y-0 transition-all duration-300 shadow-xl text-xs">
                                    <Maximize2 className="w-3.5 h-3.5" /> View High-Res
                                  </a>
                                </div>
                              )}

                              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none"></div>
                              <div className="absolute bottom-3 left-3 right-3">
                                <span className="text-white text-xs font-black uppercase tracking-wider block drop-shadow-md">
                                  {ad.direction?.title || ad.direction}
                                </span>
                              </div>
                            </div>

                            <div className="p-5 flex-1 flex flex-col bg-white">
                              <p className="text-sm font-black text-stone-900 line-clamp-2 mb-1.5 leading-tight">"{ad.brief?.tagline || ''}"</p>
                              <p className="text-xs font-medium text-stone-500 line-clamp-2 mb-3 flex-1">{ad.brief?.supportingCopy || ad.brief?.copy || ''}</p>

                              {ad.brief && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedBriefDetail(ad.brief)}
                                  className="mb-3 flex w-full items-center justify-center gap-1.5 bg-[#F2F6F2] hover:bg-[#E8EDE8] border border-emerald-100/50 text-emerald-700 font-semibold text-xs py-2 rounded-lg transition-colors shadow-2xs"
                                >
                                  <Sparkles className="h-3.5 w-3.5" />
                                  View Generation Details
                                </button>
                              )}

                              <div className="flex gap-2 mt-auto pt-3 border-t border-stone-100">
                                <Button 
                                  onClick={() => openAnimateModal(ad)}
                                  className="flex-1 rounded-xl font-extrabold bg-gradient-to-r from-[#D27D50] via-orange-500 to-rose-500 hover:from-[#b86d45] hover:to-rose-600 text-white transition-all duration-300 shadow-md flex items-center justify-center gap-1.5 text-xs py-2.5"
                                >
                                  <Film className="w-3.5 h-3.5" />
                                  <span>{adVideoUrl ? 'Re-Animate' : 'Animate'}</span>
                                </Button>
                                <Button 
                                  onClick={() => handleComposePost(ad.brief, ad.imageUrl, adVideoUrl)}
                                  variant="outline"
                                  className="flex-1 rounded-xl font-extrabold border-stone-200 hover:border-[#D27D50] hover:text-[#D27D50] transition-colors flex items-center justify-center gap-1.5 text-xs py-2.5"
                                >
                                  <PenSquare className="w-3.5 h-3.5" />
                                  Compose
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Animation Modal */}
      {animateModalOpen && selectedAdForAnimate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-stone-950 text-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 lg:p-8 shadow-2xl border border-stone-800 relative space-y-6">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#D27D50] block">Google Veo 3 Motion Video Engine</span>
                <h3 className="text-xl font-black text-white">Animate Photo to Motion Graphic</h3>
              </div>
              <button
                onClick={() => setAnimateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-900 text-stone-400 hover:text-white flex items-center justify-center font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-stone-800">
                {animResultVideoUrl ? (
                  <video src={animResultVideoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                ) : (
                  <img src={selectedAdForAnimate.imageUrl} alt="Source Photo" className="w-full h-full object-contain opacity-80" />
                )}

                {animating && (
                  <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <Loader2 className="w-10 h-10 text-[#D27D50] animate-spin" />
                    <p className="font-extrabold text-sm text-amber-300">{animStatusMsg || 'Synthesizing 3D Motion Graphics...'}</p>
                    <span className="text-xs text-stone-400">Powered by Google Veo 3.0 Fast Engine</span>
                  </div>
                )}
              </div>

              {!animating && !animResultVideoUrl && (
                <div className="space-y-3">
                  <label className="block text-xs font-black uppercase tracking-wider text-amber-300">
                    Veo 3 JSON Motion Prompt Specification
                  </label>
                  <textarea
                    value={animatePrompt}
                    onChange={e => setAnimatePrompt(e.target.value)}
                    rows={6}
                    className="w-full bg-stone-900 border border-stone-800 text-amber-300 font-mono rounded-2xl p-4 text-xs focus:outline-none focus:ring-2 focus:ring-[#D27D50]/40 transition-shadow leading-relaxed" 
                  />
                  <p className="text-[10px] text-stone-500 italic">
                    Structured according to Google Veo 3 Prompting Guide JSON specification. Animates full scene physics (subject rotation, background particles, light reflections, camera tracking) AND kinetic typography.
                  </p>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <Button 
                  onClick={() => setAnimateModalOpen(false)}
                  variant="outline"
                  className="flex-1 rounded-xl h-12 font-bold border-stone-800 text-stone-300 hover:bg-stone-900"
                >
                  Close
                </Button>
                {!animResultVideoUrl && (
                  <Button 
                    onClick={handleStartAnimation}
                    disabled={animating || !animatePrompt}
                    className="flex-1 bg-gradient-to-r from-[#D27D50] via-orange-500 to-rose-500 hover:from-[#b86d45] hover:to-rose-600 text-white rounded-xl h-12 font-bold shadow-md flex items-center justify-center gap-2 text-xs"
                  >
                    {animating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
                    <span>{animating ? 'Rendering Video...' : 'Generate Motion Graphic Video'}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
