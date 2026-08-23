'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, Image as ImageIcon, Loader2, Upload, Target, CheckCircle2, 
  XCircle, PenSquare, Maximize2, Film, Download, X, Video, Share2, 
  Check, ArrowLeft, ArrowRight, Layers, Wand2, ExternalLink, Eye, Link2, RefreshCw,
  Lock, Camera, ChevronLeft, ChevronRight, Play
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

const getThemeBadge = (title: string, desc: string) => {
  const t = (title + ' ' + desc).toLowerCase();
  if (t.includes('viral') || t.includes('hook') || t.includes('trend')) return { text: 'Viral Hook', color: 'bg-orange-50 text-orange-700 border-orange-100' };
  if (t.includes('education') || t.includes('how') || t.includes('guide') || t.includes('did you')) return { text: 'Educational', color: 'bg-blue-50 text-blue-700 border-blue-100' };
  if (t.includes('premium') || t.includes('luxury') || t.includes('elegant') || t.includes('aesthetic')) return { text: 'Premium Style', color: 'bg-violet-50 text-violet-700 border-violet-100' };
  if (t.includes('story') || t.includes('narrator') || t.includes('behind')) return { text: 'Storytelling', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
  return { text: 'Creative Spec', color: 'bg-stone-50 text-stone-700 border-stone-100' };
};

const getRoleLabel = (role?: string) => {
  const map: Record<string, string> = {
    cover: 'Cover',
    hook: 'Hook',
    problem: 'Problem',
    reveal: 'Reveal',
    detail: 'Detail',
    benefit: 'Benefit',
    lifestyle: 'Lifestyle',
    guarantee: 'Proof',
    cta: 'CTA'
  };
  return map[role || ''] || 'Slide';
};

const getSlideBadgeColor = (role?: string) => {
  const map: Record<string, string> = {
    cover: 'bg-rose-50 text-rose-700 border-rose-100',
    hook: 'bg-orange-50 text-orange-700 border-orange-100',
    problem: 'bg-amber-50 text-amber-700 border-amber-100',
    reveal: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    detail: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    benefit: 'bg-blue-50 text-blue-700 border-blue-100',
    lifestyle: 'bg-violet-50 text-violet-700 border-violet-100',
    guarantee: 'bg-teal-50 text-teal-700 border-teal-100',
    cta: 'bg-stone-900 text-white border-stone-900'
  };
  return map[role || ''] || 'bg-stone-100 text-stone-600 border-stone-200';
};

export default function PostCreatorPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prompt builder form state
  const [motionGuide, setMotionGuide] = useState('');
  const [cameraGuide, setCameraGuide] = useState('');
  const [styleGuide, setStyleGuide] = useState('');
  const [textStyleGuide, setTextStyleGuide] = useState('');
  const [isCodeView, setIsCodeView] = useState(false);
  const [scrapePhase, setScrapePhase] = useState<'idle' | 'fetching' | 'parsing' | 'downloading' | 'done'>('idle');

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

  // Directions State
  const [directions, setDirections] = useState<any[]>([]);
  const [selectedDirections, setSelectedDirections] = useState<any[]>([]);

  // Carousel state (storyboard + locked design system used for continuity)
  const [carouselDesignSystem, setCarouselDesignSystem] = useState<any>(null);
  const [carouselActiveIndex, setCarouselActiveIndex] = useState(0);

  // Category Intelligence & Ratings State
  const [detectedCategory, setDetectedCategory] = useState<string | null>(null);
  const [categoryBenchmark, setCategoryBenchmark] = useState<string | null>(null);
  const [visionAngleAnalysis, setVisionAngleAnalysis] = useState<any[] | null>(null);
  const [slideRatings, setSlideRatings] = useState<Record<string, number>>({});
  const [ratingLoadingMap, setRatingLoadingMap] = useState<Record<string, boolean>>({});

  const handleRateSlide = async (adId: string, rating: number) => {
    if (!adId) return;
    setRatingLoadingMap(prev => ({ ...prev, [adId]: true }));
    try {
      const res = await fetch('/api/ad-creator/rate-slide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ adId, rating })
      });
      if (res.ok) {
        setSlideRatings(prev => ({ ...prev, [adId]: rating }));
      }
    } catch (e) {
      console.error('Failed to rate slide:', e);
    } finally {
      setRatingLoadingMap(prev => ({ ...prev, [adId]: false }));
    }
  };

  // Result & Detail Modal State
  const [results, setResults] = useState<any[]>([]);
  const [failedDirections, setFailedDirections] = useState<Array<{ direction: any; error: string }>>([]);
  const [selectedDetailAd, setSelectedDetailAd] = useState<any | null>(null);

  // Active Campaign Generation State (Series / Cinematic Post Spawn Pattern)
  const [activeCampaign, setActiveCampaign] = useState<{
    id: string;
    productName: string;
    platform: string;
    createdAt: string;
    referenceImageUrl: string | null;
    status: 'brainstorming' | 'directions_ready' | 'generating_ads' | 'completed' | 'partial' | 'failed';
    progressMessage: string;
    directions: any[];
    selectedDirections: any[];
    items: any[];
    designSystem?: any;
  } | null>(null);

  const archiveRef = useRef<HTMLDivElement>(null);

  // History State
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

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

  // Auto-update JSON prompt whenever visual inputs change
  useEffect(() => {
    if (!selectedAdForAnimate || isCodeView) return;
    const brief = selectedAdForAnimate.brief || {};
    const prodName = selectedAdForAnimate.productName || 'Product';
    const dirName = selectedAdForAnimate.direction || 'Creative Ad';
    const visualSetup = brief.visualSceneSetup || brief.sceneSetup || brief.campaignConcept || `Professional studio showcase of ${prodName}`;
    const layoutEffects = brief.layoutAndEffects || 'Dynamic lighting, subtle motion blur, crisp reflections, premium composition';
    const taglineText = brief.tagline || '';
    const supportingText = brief.supportingCopy || brief.copy || '';

    try {
      const updatedPrompt = {
        "veo_model": "veo-3.0-fast-generate-001",
        "prompt_type": "image_to_video_motion_graphic",
        "subject": {
          "name": prodName,
          "direction": dirName,
          "details": brief.imagePrompt || `High-end commercial advertisement featuring ${prodName}`,
          "physical_motion": motionGuide
        },
        "environment_and_scene": {
          "setup": visualSetup,
          "effects": layoutEffects,
          "background_motion": "Background lighting shifts gracefully, subtle environmental particle effects float with volumetric depth, ambient light reflections glide across the scene."
        },
        "camera": {
          "movement": cameraGuide,
          "framing": "9:16 vertical portrait composition"
        },
        "kinetic_typography": {
          "headline_text": taglineText,
          "supporting_text": supportingText,
          "animation_style": textStyleGuide
        },
        "cinematography_and_physics": {
          "lighting": styleGuide,
          "physics_realism": "Adheres strictly to physical weight, gravity, real-time natural human speed, and physical temporal consistency"
        }
      };
      setAnimatePrompt(JSON.stringify(updatedPrompt, null, 2));
    } catch (e) {}
  }, [motionGuide, cameraGuide, styleGuide, textStyleGuide, selectedAdForAnimate, isCodeView]);

  const openAnimateModal = (ad: any) => {
    setSelectedAdForAnimate(ad);
    const brief = ad.brief || {};
    const prodName = ad.productName || 'Product';
    const dirName = ad.direction || 'Creative Ad';
    
    // Extract metadata & image prompt information for deep scene analysis
    const imagePromptText = brief.imagePrompt || `High-end commercial advertisement featuring ${prodName}`;
    const visualSetup = brief.visualSceneSetup || brief.sceneSetup || brief.campaignConcept || `Professional studio showcase of ${prodName}`;
    const layoutEffects = brief.layoutAndEffects || 'Dynamic lighting, subtle motion blur, crisp reflections, premium composition';
    const taglineText = brief.tagline || '';
    const supportingText = brief.supportingCopy || brief.copy || '';
    const colorAndMood = brief.colorAndMood || {};
    const typographyTreatment = brief.typographyTreatment || {};
    const logoTreatment = brief.logoTreatment || {};
    const platformSpecs = brief.platformSpecs || { aspectRatio: '9:16' };

    const motionVal = `Full physical scene animation of ${prodName}. Subject dynamically moves with realistic temporal weight, surface reflections shift across materials, and physical properties animate with 3D depth.`;
    const cameraVal = "Slow 3D push-in camera tracking shot with natural depth parallax effect";
    const styleVal = "High-end commercial studio lighting, vibrant rim highlights, sharp focal clarity";
    const textStyleVal = taglineText 
      ? `Kinetic typography motion graphics animating text "${taglineText}" with snappy keyframe scaling and entrance motion design.`
      : `Dynamic kinetic text animation with bold typography motion graphics.`;

    setMotionGuide(motionVal);
    setCameraGuide(cameraVal);
    setStyleGuide(styleVal);
    setTextStyleGuide(textStyleVal);

    const veoAspectRatio = platformSpecs.aspectRatio || '9:16';

    const veo3JsonPrompt = JSON.stringify({
      "veo_model": "veo-3.0-fast-generate-001",
      "prompt_type": "image_to_video_motion_graphic",
      "nano_banana_constraints": {
        "camera_math": "85mm lens, f/2.0 aperture, ISO 200",
        "lighting": "Natural directional lighting with rim highlights and soft shadow falloff. Do not use flat studio lighting.",
        "material_physics": "Preserve micro-scratches, grain texture, natural wear on product surface. No smoothing or airbrushing.",
        "direct_commands": [
          "Do not beautify or alter the product in any way",
          "No plastic skin, no airbrushed texture, no stylized realism",
          "Product identity is absolute - no feature averaging or merging"
        ],
        "quality_anchors": "commercial photography, advertising campaign, campaign-ready, editorial composition"
      },
      "subject": {
        "name": prodName,
        "direction": dirName,
        "details": imagePromptText,
        "physical_motion": motionVal
      },
      "environment_and_scene": {
        "setup": visualSetup,
        "effects": layoutEffects,
        "background_motion": "Background lighting shifts gracefully, subtle environmental particle effects float with volumetric depth, ambient light reflections glide across the scene."
      },
      "camera": {
        "movement": cameraVal,
        "framing": `${veoAspectRatio} ${veoAspectRatio === '9:16' ? 'vertical portrait' : veoAspectRatio === '16:9' ? 'horizontal landscape' : veoAspectRatio === '1:1' ? 'square' : 'portrait'} composition`
      },
      "kinetic_typography": {
        "headline_text": taglineText,
        "supporting_text": supportingText,
        "animation_style": textStyleVal,
        "font_style": typographyTreatment.headlineFont || 'Bold condensed sans-serif, uppercase',
        "placement": typographyTreatment.textPlacement || 'bottom third overlay'
      },
      "cinematography_and_physics": {
        "lighting": styleVal,
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


  useEffect(() => {
    fetchHistory();
  }, []);

  // Restore campaign state from localStorage on mount
  useEffect(() => {
    try {
      const savedStep = localStorage.getItem('postCreator_step');
      if (savedStep) setStep(JSON.parse(savedStep) as 1 | 2 | 3);

      const savedDirections = localStorage.getItem('postCreator_directions');
      if (savedDirections) setDirections(JSON.parse(savedDirections));

      const savedSelectedDirections = localStorage.getItem('postCreator_selectedDirections');
      if (savedSelectedDirections) setSelectedDirections(JSON.parse(savedSelectedDirections));

      const savedResults = localStorage.getItem('postCreator_results');
      if (savedResults) setResults(JSON.parse(savedResults));

      const savedActiveCampaign = localStorage.getItem('postCreator_activeCampaign');
      if (savedActiveCampaign) {
        const parsed = JSON.parse(savedActiveCampaign);
        setActiveCampaign(parsed);
        if (parsed.designSystem) setCarouselDesignSystem(parsed.designSystem);
      }

      const savedDesignSystem = localStorage.getItem('postCreator_designSystem');
      if (savedDesignSystem) setCarouselDesignSystem(JSON.parse(savedDesignSystem));

      const savedCategory = localStorage.getItem('postCreator_category');
      if (savedCategory) setDetectedCategory(savedCategory);

      const savedBenchmark = localStorage.getItem('postCreator_benchmark');
      if (savedBenchmark) setCategoryBenchmark(savedBenchmark);

      const savedFormFields = localStorage.getItem('postCreator_formFields');
      if (savedFormFields) {
        const fields = JSON.parse(savedFormFields);
        if (fields.productName) setProductName(fields.productName);
        if (fields.description) setDescription(fields.description);
        if (fields.usp) setUsp(fields.usp);
        if (fields.personality) setPersonality(fields.personality);
        if (fields.audience) setAudience(fields.audience);
        if (fields.platform) setPlatform(fields.platform);
        if (fields.mood) setMood(fields.mood);
        if (fields.specialInstructions) setSpecialInstructions(fields.specialInstructions);
      }
    } catch (e) {
      console.error('Failed to restore post creator state:', e);
    }
  }, []);

  // Persist campaign state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('postCreator_step', JSON.stringify(step));
      localStorage.setItem('postCreator_directions', JSON.stringify(directions));
      localStorage.setItem('postCreator_selectedDirections', JSON.stringify(selectedDirections));
      localStorage.setItem('postCreator_results', JSON.stringify(results));
      if (carouselDesignSystem) {
        localStorage.setItem('postCreator_designSystem', JSON.stringify(carouselDesignSystem));
      }
      if (detectedCategory) {
        localStorage.setItem('postCreator_category', detectedCategory);
      }
      if (categoryBenchmark) {
        localStorage.setItem('postCreator_benchmark', categoryBenchmark);
      }
      if (activeCampaign) {
        localStorage.setItem('postCreator_activeCampaign', JSON.stringify(activeCampaign));
      }
      localStorage.setItem('postCreator_formFields', JSON.stringify({
        productName, description, usp, personality, audience, platform, mood, specialInstructions
      }));
    } catch (e) {
      console.error('Failed to persist post creator state:', e);
    }
  }, [step, directions, selectedDirections, results, activeCampaign, carouselDesignSystem, detectedCategory, categoryBenchmark, productName, description, usp, personality, audience, platform, mood, specialInstructions]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/ad-creator/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleMagicLink = async () => {
    if (!magicLink) return;
    setScraping(true);
    setScrapePhase('fetching');
    setError(null);
    try {
      const phaseTimer = setTimeout(() => setScrapePhase('parsing'), 1200);
      const downloadTimer = setTimeout(() => setScrapePhase('downloading'), 2400);

      const token = localStorage.getItem('token');
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ url: magicLink })
      });
      
      clearTimeout(phaseTimer);
      clearTimeout(downloadTimer);
      
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
            const imgRes = await fetch(proxyUrl, {
              headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              }
            });
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
      setScrapePhase('done');
    } catch (err: any) {
      setError(err.message);
      setScrapePhase('idle');
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
    setCarouselDesignSystem(null);
    setCarouselActiveIndex(0);
    setDetectedCategory(null);
    setCategoryBenchmark(null);
    setVisionAngleAnalysis(null);
    setResults([]);
    setFailedDirections([]);
    setActiveCampaign(null);
    setError(null);
    localStorage.removeItem('postCreator_step');
    localStorage.removeItem('postCreator_directions');
    localStorage.removeItem('postCreator_selectedDirections');
    localStorage.removeItem('postCreator_results');
    localStorage.removeItem('postCreator_activeCampaign');
    localStorage.removeItem('postCreator_designSystem');
    localStorage.removeItem('postCreator_category');
    localStorage.removeItem('postCreator_benchmark');
    localStorage.removeItem('postCreator_formFields');
  };

  const handleGenerateDirections = async () => {
    if (!productName || !description) {
        setError("Product Name and Description are required to generate carousel.");
        return;
    }
    setLoading(true);
    setError(null);
    setResults([]);
    setFailedDirections([]);
    setStep(3);

    const refImgUrl = referencePreviews[0] || imagePreviews[0] || null;
    const currentCampId = 'camp_' + Date.now();

    const newCamp = {
      id: currentCampId,
      productName,
      platform,
      createdAt: new Date().toISOString(),
      referenceImageUrl: refImgUrl,
      status: 'generating_ads' as const,
      progressMessage: 'AI Art Director is analyzing product photos & locking campaign design system...',
      directions: [],
      selectedDirections: [],
      items: []
    };

    setActiveCampaign(newCamp);

    setTimeout(() => {
      archiveRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

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
        throw new Error(data.error || 'Failed to analyze product & directions');
      }

      const data = await res.json();
      const storyboard = (data.directions || data.slides || []).slice();
      storyboard.sort((a: any, b: any) => (a.slideIndex ?? a.id ?? 0) - (b.slideIndex ?? b.id ?? 0));
      setDirections(storyboard);
      setSelectedDirections(storyboard);
      setCarouselDesignSystem(data.designSystem || null);
      setDetectedCategory(data.category || null);
      setCategoryBenchmark(data.categoryBenchmark || null);
      setVisionAngleAnalysis(data.visionAngleAnalysis || null);

      const dirsToUse = storyboard;
      const designSystem = data.designSystem || null;
      const generatedResults: any[] = [];
      const failures: Array<{ direction: any; error: string }> = [];

      for (let i = 0; i < dirsToUse.length; i++) {
        const direction = dirsToUse[i];
        const slideNo = direction.slideIndex ?? direction.id ?? (i + 1);

        setActiveCampaign(prev => prev ? {
          ...prev,
          status: 'generating_ads',
          progressMessage: `Generating Slide ${slideNo} of ${dirsToUse.length} (${direction.title})...`
        } : null);

        try {
          const genFormData = new FormData();
          genFormData.append('productName', productName);
          genFormData.append('direction', JSON.stringify(direction));
          genFormData.append('platform', platform);
          genFormData.append('campaignId', currentCampId);
          if (specialInstructions) {
            genFormData.append('specialInstructions', specialInstructions);
          }
          if (designSystem && dirsToUse.length > 0) {
            genFormData.append('carouselContext', JSON.stringify({ designSystem, slides: dirsToUse }));
          }
          imageFiles.forEach(file => {
            genFormData.append('images', file);
          });
          referenceFiles.forEach(refFile => {
            genFormData.append('referenceImages', refFile);
          });

          const genRes = await fetch('/api/ad-creator/generate', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: genFormData
          });

          if (genRes.ok) {
            const genData = await genRes.json();
            const newItem = { 
              brief: genData.brief, 
              imageUrl: genData.imageUrl, 
              direction,
              slideIndex: slideNo,
              id: genData.id || ('ad_' + Date.now() + '_' + Math.random().toString(36).substring(7)),
              productName,
              platform,
              createdAt: new Date().toISOString(),
              referenceImageUrl: genData.referenceImageUrl || refImgUrl
            };
            generatedResults.push(newItem);
            setResults(prev => [...prev, newItem]);

            setActiveCampaign(prev => prev ? {
              ...prev,
              items: [...generatedResults],
              progressMessage: `Generated Slide ${slideNo} of ${dirsToUse.length} carousel slides...`
            } : null);
          } else {
            failures.push({ direction, error: `HTTP ${genRes.status}` });
          }
        } catch (err: any) {
          failures.push({ direction, error: err.message });
        }
      }

      setActiveCampaign(prev => prev ? {
        ...prev,
        status: failures.length > 0 ? 'partial' : 'completed',
        progressMessage: failures.length > 0 
          ? `Generated ${generatedResults.length} of ${dirsToUse.length} carousel slides. ${failures.length} failed.`
          : `${dirsToUse.length}-slide Instagram Carousel complete! All slides share locked design system — ready to export.`
      } : null);

      fetchHistory();
    } catch (err: any) {
      setError(err.message);
      setActiveCampaign(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAd = async () => {
    let dirsToUse: any[] = activeCampaign?.selectedDirections?.length ? activeCampaign.selectedDirections : (selectedDirections.length ? selectedDirections : directions);
    if (dirsToUse.length === 0) return;
    dirsToUse = dirsToUse.slice().sort((a: any, b: any) => (a.slideIndex ?? a.id ?? 0) - (b.slideIndex ?? b.id ?? 0));
    const designSystem = carouselDesignSystem || activeCampaign?.designSystem || null;
    setLoading(true);
    setError(null);
    setResults([]);
    setFailedDirections([]);

    setActiveCampaign(prev => prev ? {
      ...prev,
      status: 'generating_ads',
      progressMessage: `Generating ${dirsToUse.length}-slide Instagram Carousel with a locked design system...`
    } : null);

    setStep(3);

    const generatedResults: any[] = [];
    const failures: Array<{ direction: any; error: string }> = [];

    for (let i = 0; i < dirsToUse.length; i++) {
      const direction = dirsToUse[i];
      const slideNo = direction.slideIndex ?? direction.id ?? (i + 1);
      try {
        const formData = new FormData();
        formData.append('productName', productName);
        formData.append('direction', JSON.stringify(direction));
        formData.append('platform', platform);
        const currentCampId = activeCampaign?.id || ('camp_' + Date.now());
        formData.append('campaignId', currentCampId);
        if (specialInstructions) {
          formData.append('specialInstructions', specialInstructions);
        }
        if (designSystem && dirsToUse.length > 0) {
          formData.append('carouselContext', JSON.stringify({ designSystem, slides: dirsToUse }));
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

        let data: any = null;
        const contentType = res.headers.get('content-type');
        
        if (!res.ok) {
          let errorMessage = `Generation failed (HTTP ${res.status})`;
          if (contentType && contentType.includes('application/json')) {
            try {
              data = await res.json();
              errorMessage = data.error || errorMessage;
            } catch {
              // Keep default error message
            }
          } else {
            const text = await res.text();
            if (text.includes('<!DOCTYPE') || text.includes('<html')) {
              errorMessage = `AI service returned an error (${res.status}). This may be due to rate limiting or service unavailability. Please retry in a moment.`;
            }
          }
          throw new Error(errorMessage);
        }

        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Invalid response from server. Expected JSON but received non-JSON response.');
        }

        try {
          data = await res.json();
        } catch (err) {
          console.error('JSON parse error:', err);
          throw new Error('Failed to parse server response. The AI service may have returned an error page. Please retry.');
        }
        const newItem = { 
          brief: data.brief, 
          imageUrl: data.imageUrl, 
          direction,
          slideIndex: slideNo,
          id: 'ad_' + Date.now() + '_' + Math.random().toString(36).substring(7),
          productName,
          platform,
          createdAt: new Date().toISOString()
        };
        generatedResults.push(newItem);
        setResults([...generatedResults]);

        setActiveCampaign(prev => prev ? {
          ...prev,
          items: [...generatedResults],
          progressMessage: `Generated Slide ${slideNo} of ${dirsToUse.length} carousel slides...`
        } : null);
        
        if (generatedResults.length === 1) {
          setStep(3);
        }
      } catch (err: any) {
        failures.push({ direction, error: err.message || 'Unknown error' });
        setFailedDirections([...failures]);
      }
    }
    
    if (generatedResults.length > 0) {
      setActiveCampaign(prev => prev ? {
        ...prev,
        status: failures.length > 0 ? 'partial' : 'completed',
        progressMessage: failures.length > 0 
          ? `Generated ${generatedResults.length} of ${dirsToUse.length} carousel slides. ${failures.length} failed - retry below.`
          : `${dirsToUse.length}-part carousel complete! All slides share the same locked design system - ready to export.`
      } : null);
    } else {
      setActiveCampaign(null);
    }

    fetchHistory();
    
    if (failures.length > 0 && generatedResults.length === 0) {
      setError(`${failures.length} slide(s) failed: ${failures[0].error}`);
    }
  };

  const handleRetryDirection = async (direction: any) => {
    setFailedDirections(prev => prev.filter(f => f.direction.title !== direction.title));
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('productName', productName);
      formData.append('direction', JSON.stringify(direction));
      formData.append('platform', platform);
      if (specialInstructions) {
        formData.append('specialInstructions', specialInstructions);
      }
      const designSystem = carouselDesignSystem || activeCampaign?.designSystem || null;
      const carouselSlides = (activeCampaign?.selectedDirections?.length ? activeCampaign.selectedDirections : (selectedDirections.length ? selectedDirections : directions));
      if (designSystem && carouselSlides.length > 0) {
        formData.append('carouselContext', JSON.stringify({ designSystem, slides: carouselSlides }));
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
      const newItem = { 
        brief: data.brief, 
        imageUrl: data.imageUrl, 
        direction, 
        id: 'ad_' + Date.now() + '_' + Math.random().toString(36).substring(7),
        productName,
        platform,
        createdAt: new Date().toISOString()
      };
      setResults(prev => [...prev, newItem]);
      setActiveCampaign(prev => prev ? {
        ...prev,
        items: [...(prev.items || []), newItem]
      } : null);
    } catch (err: any) {
      setFailedDirections(prev => [...prev, { direction, error: err.message || 'Retry failed' }]);
      setError(err.message);
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

    // Keep the carousel in slide order (Slide 1 → N)
    const ordered = items.slice().sort((a: any, b: any) => {
      const ia = a.slideIndex ?? a.brief?.carousel?.slideIndex ?? a.direction?.slideIndex ?? 0;
      const ib = b.slideIndex ?? b.brief?.carousel?.slideIndex ?? b.direction?.slideIndex ?? 0;
      return ia - ib;
    });

    const firstItem = ordered[0];
    const prodName = firstItem.productName || productName || 'Product Campaign';

    // Gather all media URLs (prefer videoUrl if animated, else imageUrl)
    const mediaUrls = ordered
      .map(item => item.videoUrl || renderedVideoMap[item.id] || item.imageUrl)
      .filter(Boolean);

    const firstBrief = firstItem.brief || {};
    const mainTagline = firstBrief.tagline ? `✨ ${firstBrief.tagline}\n\n` : '';
    const mainCopy = firstBrief.supportingCopy || firstBrief.copy || '';
    const mainCta = firstBrief.callToAction ? `\n\n${firstBrief.callToAction}` : '';

    const slideSummaries = ordered.map((item, idx) => {
      const b = item.brief || {};
      const slideTitle = item.direction?.title || b.carousel?.slideTitle || '';
      const t = slideTitle
        ? `"${slideTitle}"`
        : (b.tagline ? `"${b.tagline}"` : `Slide ${idx + 1}`);
      const captionLine = item.direction?.caption || b.carousel?.caption || '';
      return `Slide ${idx + 1}: ${t}${captionLine ? ` — ${captionLine}` : ''}`;
    }).join('\n');

    const fullCaption = `🚀 ${prodName.toUpperCase()}\n\n${mainTagline}${mainCopy}${mainCta}\n\n📸 Instagram Carousel (${ordered.length} slides):\n${slideSummaries}\n\n👉 Swipe through the story and shop the look!`.trim();

    const postData = {
      content: fullCaption,
      mediaUrls
    };

    localStorage.setItem('composeAdData', JSON.stringify(postData));
    router.push('/dashboard/posts/new');
  };

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
      {/* Clean Page Title Header */}
      <div className="pb-4 border-b border-stone-200/90">
        <h1 className="text-2xl lg:text-3xl font-black text-stone-900 tracking-tight flex items-center gap-2.5">
          <Target className="w-7 h-7 text-[#D27D50]" />
          <span>AI Ad & Post Creator</span>
        </h1>
        <p className="text-stone-500 text-sm font-medium mt-0.5">Generate one cohesive Instagram carousel campaign — the AI analyses each product photo (front / back / side / detail) and assigns the right angle to the right slide, with a locked design system across all slides.</p>
      </div>

      {/* Active Motion Graphic Video Progress Banner (Survives Refresh & Tab Switching) */}
      {activeReelId && animating && (
        <div className="p-5 bg-gradient-to-r from-amber-50/60 via-orange-50/40 to-amber-50/50 text-stone-800 rounded-2xl border border-amber-200/80 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-500">
          <div className="flex items-center gap-3.5">
            <div className="bg-orange-100 p-2 rounded-xl border border-orange-200 shrink-0">
              <Loader2 className="w-5 h-5 text-[#D27D50] animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-black uppercase tracking-wider text-[#D27D50]">Google Veo 3 Motion Video Engine</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-150 text-[#D27D50] border border-orange-200">In Progress</span>
              </div>
              <p className="text-sm font-extrabold text-stone-850">{animStatusMsg || 'Rendering video in background...'}</p>
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
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl font-medium border border-red-100 flex items-center gap-3 shadow-sm">
          <XCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Main Campaign Brief Form */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 lg:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-stone-200/80 space-y-8 animate-in fade-in duration-300">
        {/* 2-Column Split: Visual Assets Left vs Campaign Specs Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Visual Assets & References */}
            <div className="space-y-6">
              <h2 className="text-base font-extrabold text-stone-900 border-b border-stone-200 pb-2.5 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#D27D50]" />
                <span>Visual Assets & Inspiration</span>
              </h2>

              {/* Compact Magic Link Import */}
              <div className="bg-gradient-to-r from-amber-50/50 via-stone-50 to-orange-50/30 border border-amber-100 rounded-xl p-3.5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-stone-850 text-xs font-bold">
                    <Link2 className="w-3.5 h-3.5 text-[#D27D50]" />
                    <span>Import Product URL</span>
                  </span>
                  <span className="text-[9px] font-black text-[#D27D50] bg-white px-2 py-0.5 rounded border border-orange-100">
                    ⚡ Auto-Fill
                  </span>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={magicLink} 
                    onChange={e => setMagicLink(e.target.value)} 
                    className="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] transition-all font-medium text-stone-800 placeholder-stone-400 placeholder:text-[10px]" 
                    placeholder="Paste Shopify or Amazon link..." 
                  />
                  <Button 
                    onClick={handleMagicLink} 
                    disabled={scraping || !magicLink} 
                    className="bg-stone-900 hover:bg-black text-white rounded-lg px-4 font-bold text-xs h-8 shadow-sm shrink-0 min-w-[90px]"
                  >
                    {scraping ? (
                      <div className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin text-amber-300" />
                        <span className="text-[9px]">Importing</span>
                      </div>
                    ) : (
                      'Import'
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Photos (Identity Lock) */}
                <div className="bg-stone-50/75 border border-stone-200 hover:border-amber-300 rounded-2xl p-4 space-y-2.5 transition-colors flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-xs text-stone-900 flex flex-wrap items-center gap-1.5">
                      <span>Product Photos</span>
                      <span className="text-[8px] font-black uppercase tracking-wider text-[#D27D50] bg-orange-50 px-2 py-0.5 rounded border border-orange-100">🔒 Lock</span>
                    </h4>
                    <span className="text-[10px] text-stone-400 font-bold">{imagePreviews.length}/4</span>
                  </div>

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageChange} 
                    className="hidden" 
                    accept="image/*" 
                    multiple 
                  />

                  {imagePreviews.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {imagePreviews.map((src, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200 shadow-2xs group">
                          <img src={src} alt={`Product ${idx+1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeImageFile(idx); }}
                            className="absolute top-1 right-1 w-4 h-4 bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                      {imagePreviews.length < 4 && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="aspect-square rounded-xl border border-dashed border-stone-300 hover:border-amber-300 flex items-center justify-center bg-white text-stone-400 hover:text-stone-600 transition-colors text-lg font-bold"
                        >
                          +
                        </button>
                      )}
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center cursor-pointer border border-dashed border-stone-300 rounded-xl py-6 px-4 hover:bg-stone-100/60 transition-colors"
                    >
                      <Upload className="w-4 h-4 text-[#D27D50] mb-1.5" />
                      <p className="font-extrabold text-[11px] text-stone-700 text-center">
                        Upload Product Shots<br/>
                        <span className="text-stone-400 font-normal text-[9px]">Front/angle views</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Pose & Style Reference Photos */}
                <div className="bg-stone-50/75 border border-stone-200 hover:border-emerald-300 rounded-2xl p-4 space-y-2.5 transition-colors flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-xs text-stone-900 flex flex-wrap items-center gap-1.5">
                      <span>Style Refs</span>
                      <span className="text-[8px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">🎨 Style</span>
                    </h4>
                    <span className="text-[10px] text-stone-400 font-bold">{referencePreviews.length}/4</span>
                  </div>

                  <input 
                    type="file" 
                    ref={refInputRef} 
                    onChange={handleReferenceChange} 
                    className="hidden" 
                    accept="image/*" 
                    multiple 
                  />

                  {referencePreviews.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {referencePreviews.map((src, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200 shadow-2xs group">
                          <img src={src} alt={`Reference ${idx+1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeReferenceFile(idx); }}
                            className="absolute top-1 right-1 w-4 h-4 bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                      {referencePreviews.length < 4 && (
                        <button
                          type="button"
                          onClick={() => refInputRef.current?.click()}
                          className="aspect-square rounded-xl border border-dashed border-stone-300 hover:border-emerald-300 flex items-center justify-center bg-white text-stone-400 hover:text-stone-600 transition-colors text-lg font-bold"
                        >
                          +
                        </button>
                      )}
                    </div>
                  ) : (
                    <div 
                      onClick={() => refInputRef.current?.click()}
                      className="flex flex-col items-center justify-center cursor-pointer border border-dashed border-stone-300 rounded-xl py-6 px-4 hover:bg-stone-100/60 transition-colors"
                    >
                      <ImageIcon className="w-4 h-4 text-emerald-600 mb-1.5" />
                      <p className="font-extrabold text-[11px] text-stone-700 text-center">
                        Upload Poses/Styles<br/>
                        <span className="text-stone-400 font-normal text-[9px]">Model, lighting or angle</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Special Style & Pose Instructions Input */}
              <div className="bg-gradient-to-r from-amber-50/60 to-orange-50/30 border border-amber-200/80 rounded-2xl p-4 space-y-2">
                <label className="block text-xs font-extrabold text-stone-900 tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#D27D50]" />
                    Special Pose / AI Guidance <span className="text-stone-400 font-normal lowercase">(optional)</span>
                  </span>
                  <span className="text-[10px] text-[#D27D50] font-bold bg-white px-2 py-0.5 rounded-md border border-amber-200/80 shadow-2xs">Prompt Directive</span>
                </label>
                <textarea
                  value={specialInstructions}
                  onChange={e => setSpecialInstructions(e.target.value)}
                  rows={2}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-850 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] resize-none transition-all shadow-2xs font-semibold"
                  placeholder='e.g. "Focus on model posture and warm sunset studio lighting from Reference #1, keep model on a luxury marble balcony."'
                />
              </div>
            </div>

            {/* Right Column: Campaign Brief & Specs */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#D27D50]" />
                  <span>Campaign Brief & Specs</span>
                </h2>
                <Button onClick={handleClearForm} variant="ghost" className="text-stone-400 hover:text-red-500 font-semibold h-8 px-3 rounded-lg text-xs">Clear Form</Button>
              </div>
              
              <div>
                <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-1.5">Product Name <span className="text-red-500">*</span></label>
                <input type="text" value={productName} onChange={e => setProductName(e.target.value)} className="w-full bg-stone-50/70 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] transition-all font-semibold text-stone-900" placeholder="e.g. Vaclav Sky Blue Malmal Top" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-1.5">Core USP</label>
                  <input type="text" value={usp} onChange={e => setUsp(e.target.value)} className="w-full bg-stone-50/70 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] transition-all font-semibold text-stone-900" placeholder="Breathable cotton comfort" />
                </div>
                <div>
                  <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-1.5">Platform</label>
                  <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full bg-stone-50/70 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] transition-all font-semibold text-stone-900">
                    <option>Instagram Feed (4:5)</option>
                    <option>Instagram Stories (9:16)</option>
                    <option>Landscape Post (16:9)</option>
                    <option>Square Ad (1:1)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-1.5">Personality</label>
                  <input type="text" value={personality} onChange={e => setPersonality(e.target.value)} className="w-full bg-stone-50/70 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] transition-all font-semibold text-stone-900" placeholder="Elegant, chic, active" />
                </div>
                <div>
                  <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-1.5">Target Audience</label>
                  <input type="text" value={audience} onChange={e => setAudience(e.target.value)} className="w-full bg-stone-50/70 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] transition-all font-semibold text-stone-900" placeholder="Women, festive wear" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-1.5">Brief Description <span className="text-red-500">*</span></label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-stone-50/70 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] resize-none transition-all font-semibold text-stone-900" placeholder="A sky blue malmal top with straight pants designed for active, chic confidence..." />
              </div>



              <div className="pt-2">
                <Button 
                  onClick={handleGenerateDirections} 
                  disabled={loading || !productName || !description}
                  className="w-full bg-gradient-to-r from-[#D27D50] to-rose-500 hover:from-[#b86d45] hover:to-rose-600 text-white rounded-2xl h-14 font-black text-base transition-all shadow-lg hover:scale-[1.005] flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-white" />}
                  {loading ? 'Generating 4-Slide Carousel...' : 'Generate 4-Slide Instagram Carousel'}
                </Button>
              </div>
            </div>
          </div>
        </div>

      {/* History & Active Campaign Section */}
      <div ref={archiveRef} className="mt-20 border-t border-stone-200 pt-12 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-stone-900 flex items-center gap-3 tracking-tight">
            <Sparkles className="w-6 h-6 text-[#D27D50]" />
            <span>Campaign Archive</span>
          </h2>
        </div>

        {loadingHistory ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-stone-300 animate-spin" />
          </div>
        ) : history.length === 0 && !activeCampaign ? (
          <div className="text-center p-16 bg-stone-50 rounded-3xl border border-stone-100">
            <ImageIcon className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-500 font-medium text-lg">No past campaigns found.</p>
          </div>
        ) : (
          <div className="space-y-12 animate-in fade-in duration-300">
            {(() => {
              // Group history into separate Campaign Cards
              const campaignGroups: {
                campaignId: string;
                productName: string;
                platform: string;
                createdAt: string;
                items: any[];
                status?: string;
                progressMessage?: string;
                selectedDirections?: any[];
                directions?: any[];
                referenceImageUrl?: string | null;
              }[] = [];

              // Always prepend active campaign if it exists so it never hides or disappears
              if (activeCampaign) {
                campaignGroups.push({
                  campaignId: activeCampaign.id || 'active-campaign',
                  productName: activeCampaign.productName || 'Creative Campaign',
                  platform: activeCampaign.platform || 'INSTAGRAM',
                  createdAt: activeCampaign.createdAt || new Date().toISOString(),
                  items: activeCampaign.items || [],
                  status: activeCampaign.status,
                  progressMessage: activeCampaign.progressMessage,
                  selectedDirections: activeCampaign.selectedDirections,
                  directions: activeCampaign.directions,
                  referenceImageUrl: activeCampaign.referenceImageUrl
                });
              }

              history.forEach((item) => {
                const itemCampId = item.brief?.campaignId || item.brief?.carousel?.campaignId;
                
                const itemTime = new Date(item.createdAt).getTime();

                const existing = campaignGroups.find((g) => {
                  if (itemCampId && g.campaignId) {
                    return g.campaignId === itemCampId;
                  }
                  if (g.campaignId === 'active-campaign') return false;
                  if ((g.productName || '').toLowerCase() !== (item.productName || '').toLowerCase()) return false;
                  const groupTime = new Date(g.createdAt).getTime();
                  return Math.abs(itemTime - groupTime) < 10 * 60 * 1000;
                });

                if (existing) {
                  if (!existing.items.some((i: any) => i.id === item.id)) {
                    existing.items.push(item);
                  }
                } else {
                  campaignGroups.push({
                    campaignId: itemCampId || item.id,
                    productName: item.productName || 'Creative Campaign',
                    platform: item.platform || 'INSTAGRAM',
                    createdAt: item.createdAt,
                    items: [item]
                  });
                }
              });

              return campaignGroups.map((group) => {
                const groupRefImg = group.referenceImageUrl 
                  || group.items.find(i => i.referenceImageUrl || i.brief?.referenceImageUrl)?.referenceImageUrl 
                  || group.items.find(i => i.brief?.referenceImageUrl)?.brief?.referenceImageUrl;

                const isActive = group.campaignId === 'active-campaign' || group.campaignId.startsWith('camp_');
                const isCurrentlyGenerating = (loading || group.status === 'generating_ads') && activeCampaign && (group.campaignId === activeCampaign.id || group.campaignId === 'active-campaign');
                const isMcpCampaign = group.items.some((i: any) => i.brief?.createdVia === 'MCP' || i.brief?.isMcp || i.createdVia === 'MCP') || group.campaignId.includes('mcp');

                // Carousel-aware: keep the generated slides in Slide 1 → N order
                const isCarouselGroup = group.items.some((i: any) =>
                  i.slideIndex != null || i.direction?.slideIndex != null || i.brief?.carousel?.slideIndex != null || i.direction?.id != null || i.direction?.role
                );
                const sortedItems = group.items.slice().sort((a: any, b: any) => {
                  const ia = a.slideIndex ?? a.direction?.slideIndex ?? a.brief?.carousel?.slideIndex ?? (a.direction?.id ?? 0);
                  const ib = b.slideIndex ?? b.direction?.slideIndex ?? b.brief?.carousel?.slideIndex ?? (b.direction?.id ?? 0);
                  return ia - ib;
                });

                 return (
                  <div key={group.campaignId} className={cn("bg-white rounded-3xl p-6 lg:p-8 border shadow-sm space-y-6 transition-all duration-300", isCurrentlyGenerating ? 'border-[#D27D50]/40 ring-1 ring-[#D27D50]/20 shadow-md' : 'border-stone-200/80')}>
                    {/* Simplified Campaign Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-150 pb-6">
                      <div>
                        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                          <h3 className="text-xl lg:text-2xl font-black text-stone-900">{group.productName}</h3>
                          <span className="px-2.5 py-0.5 bg-stone-100 text-stone-700 text-[10px] font-extrabold rounded-full uppercase border border-stone-200/50">
                            {group.platform}
                          </span>
                          {isMcpCampaign && (
                            <span className="px-2.5 py-0.5 bg-[#D27D50]/20 text-[#D27D50] border border-[#D27D50]/40 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
                              ⚡ MCP
                            </span>
                          )}
                          {isCarouselGroup && (
                            <span className="px-2.5 py-0.5 bg-gradient-to-r from-[#D27D50] to-rose-500 text-white text-[10px] font-black rounded-md uppercase tracking-widest">
                              📸 {group.items.length}-Slide Carousel
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-stone-400">
                          {isCurrentlyGenerating ? (
                            `${group.items.length} ${isCarouselGroup ? 'Carousel Slides' : 'Post Variations'} • Started Just Now`
                          ) : (
                            `${group.items.length} ${isCarouselGroup ? 'Carousel Slides' : 'Post Variations'} • Created ${new Date(group.createdAt).toLocaleDateString()}`
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        {group.items.length > 0 && (
                          <Button
                            onClick={() => handleComposeEntireCampaign(group.items)}
                            className="bg-[#D27D50] hover:bg-[#b86d45] text-white rounded-xl font-bold px-4 py-2.5 text-xs shadow-sm flex items-center gap-1.5"
                          >
                            <Share2 className="w-3.5 h-3.5 text-white" />
                            <span>Compose Campaign ({group.items.length})</span>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* If Active Campaign: Live Progress Preloader Bar */}
                    {isCurrentlyGenerating && (
                      <div className="bg-amber-50/50 border border-amber-250/60 text-stone-850 p-4 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in duration-300">
                        <div className="flex items-center gap-3">
                          <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-400/20">
                            <Loader2 className="w-5 h-5 text-[#D27D50] animate-spin" />
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase text-[#D27D50] tracking-widest block">AI Art Director Engine</span>
                            <p className="text-xs font-bold text-stone-705">{group.progressMessage || 'Synthesizing campaign assets...'}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[#D27D50] bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">Processing</span>
                      </div>
                    )}

                    {/* Inside Campaign: Slide Cards Grid */}
                    {group.items.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                        {sortedItems.map((ad: any) => {
                          const adVideoUrl = ad.videoUrl || renderedVideoMap[ad.id];
                          const currentViewMode = viewModeMap[ad.id] || (adVideoUrl ? 'video' : 'image');

                          return (
                            <div key={ad.id} className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-lg transition-all duration-305 flex flex-col">
                              <div className="h-56 w-full bg-stone-900 relative overflow-hidden group/img">
                                {/* Small carousel slide order badge */}
                                {isCarouselGroup && (
                                  <span className="absolute top-2 right-2 z-20 bg-black/70 text-white text-[8px] font-black px-1.5 py-0.5 rounded border border-white/20">
                                    {ad.slideIndex ?? ad.direction?.slideIndex ?? ad.brief?.carousel?.slideIndex ?? 1}/{sortedItems.length}
                                  </span>
                                )}
                                {currentViewMode === 'video' && adVideoUrl ? (
                                  <video src={adVideoUrl} controls autoPlay muted loop className="w-full h-full object-cover" />
                                ) : (
                                  <img src={ad.imageUrl} alt={ad.productName} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105" />
                                )}

                                {/* Media Type Switcher */}
                                {adVideoUrl && (
                                  <div className="absolute top-3 left-3 z-20 flex gap-1 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/20 shadow-lg">
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setViewModeMap(prev => ({ ...prev, [ad.id]: 'image' })); }}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${currentViewMode === 'image' ? 'bg-[#D27D50] text-white shadow-sm' : 'text-stone-300 hover:text-white'}`}
                                    >
                                      Photo
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setViewModeMap(prev => ({ ...prev, [ad.id]: 'video' })); }}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${currentViewMode === 'video' ? 'bg-gradient-to-r from-[#D27D50] to-rose-500 text-white shadow-sm' : 'text-stone-300 hover:text-white'}`}
                                    >
                                      <Film className="w-3 h-3 animate-pulse" /> Motion Video
                                    </button>
                                  </div>
                                )}

                                {!adVideoUrl && (
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
                                    <a href={ad.imageUrl} target="_blank" rel="noopener noreferrer" className="bg-white/95 text-stone-800 hover:bg-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transform translate-y-4 group-hover/img:translate-y-0 transition-all duration-300 shadow-xl">
                                      <Maximize2 className="w-4 h-4" /> View Photo
                                    </a>
                                  </div>
                                )}

                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none"></div>
                                <div className="absolute bottom-3 left-3 right-3">
                                  <span className="text-white text-xs font-extrabold tracking-wide block drop-shadow-md line-clamp-1">
                                    <span className="text-amber-300 font-black uppercase text-[10px] tracking-wider mr-1.5">Narrative:</span>
                                    {ad.brief?.tagline || ad.direction?.caption || ad.direction?.title || group.productName}
                                  </span>
                                </div>
                              </div>

                              <div className="p-5 flex-1 flex flex-col">
                                <p className="text-sm font-black text-stone-850 line-clamp-2 mb-2 leading-tight">"{ad.brief?.tagline || ''}"</p>
                                <p className="text-xs font-medium text-stone-500 line-clamp-2 mb-4 flex-1">{ad.brief?.supportingCopy || ad.brief?.copy || ''}</p>

                                {/* 5-Star Slide Rating Bar */}
                                <div className="flex items-center justify-between py-2 my-2 border-y border-stone-100 text-xs">
                                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Rate Slide</span>
                                  <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => {
                                      const currentRating = slideRatings[ad.id] || ad.brief?.rating || 0;
                                      const isStarred = star <= currentRating;
                                      return (
                                        <button
                                          key={star}
                                          type="button"
                                          disabled={ratingLoadingMap[ad.id]}
                                          onClick={() => handleRateSlide(ad.id, star)}
                                          className={`text-sm transition-transform hover:scale-125 focus:outline-none ${isStarred ? 'text-amber-400' : 'text-stone-200 hover:text-amber-300'}`}
                                          title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                                        >
                                          ★
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="flex gap-1.5 mt-auto pt-2">
                                  <Button 
                                    onClick={() => openAnimateModal(ad)}
                                    className="flex-1 rounded-xl font-bold bg-[#D27D50] hover:bg-[#b86d45] text-white transition-all shadow-2xs flex items-center justify-center gap-1 text-xs py-2 px-2"
                                  >
                                    <Film className="w-3.5 h-3.5" />
                                    <span>{adVideoUrl ? 'Re-Animate' : 'Animate'}</span>
                                  </Button>
                                  <Button 
                                    onClick={() => handleComposePost(ad.brief, ad.imageUrl, adVideoUrl)}
                                    variant="outline"
                                    className="flex-1 rounded-xl font-bold border-stone-200 hover:border-[#D27D50] hover:text-[#D27D50] transition-colors flex items-center justify-center gap-1 text-xs py-2 px-2"
                                  >
                                    <PenSquare className="w-3.5 h-3.5" />
                                    Compose
                                  </Button>
                                  <Button
                                    onClick={() => setSelectedDetailAd(ad)}
                                    variant="ghost"
                                    className="rounded-xl font-bold text-stone-500 hover:text-stone-900 border border-stone-200 hover:bg-stone-100 flex items-center justify-center gap-1 text-xs py-2 px-2.5 shrink-0"
                                    title="See Full Post Brief Details"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-[#D27D50]" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* See Details Modal */}
      {selectedDetailAd && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedDetailAd(null)}>
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-stone-200 flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
              <div>
                <span className="text-[10px] font-black uppercase text-[#D27D50] tracking-wider block">Campaign Post Details</span>
                <h3 className="text-lg font-extrabold text-stone-900">{selectedDetailAd.productName || selectedDetailAd.brief?.productName || 'Post Details'}</h3>
              </div>
              <button 
                onClick={() => setSelectedDetailAd(null)}
                className="w-8 h-8 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center hover:bg-stone-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="aspect-[4/5] bg-stone-100 rounded-2xl overflow-hidden border border-stone-200 shadow-sm relative">
                  <img src={selectedDetailAd.imageUrl} alt="Ad Visual" className="w-full h-full object-cover" />
                </div>
                <a 
                  href={selectedDetailAd.imageUrl} 
                  download="ad_visual.jpg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-black text-white text-xs font-extrabold py-3 rounded-xl shadow-2xs transition-colors"
                >
                  <Download className="w-4 h-4 text-[#D27D50]" /> Download High-Res Image
                </a>
              </div>

              <div className="space-y-4 text-left">
                {selectedDetailAd.brief?.tagline && (
                  <div>
                    <h4 className="text-[11px] font-black text-stone-400 uppercase tracking-wider mb-1">Tagline</h4>
                    <p className="text-xl font-black text-stone-900 leading-snug">"{selectedDetailAd.brief.tagline}"</p>
                  </div>
                )}

                {(selectedDetailAd.brief?.supportingCopy || selectedDetailAd.brief?.copy) && (
                  <div>
                    <h4 className="text-[11px] font-black text-stone-400 uppercase tracking-wider mb-1">Supporting Copy</h4>
                    <p className="text-xs font-medium text-stone-700 leading-relaxed">{selectedDetailAd.brief?.supportingCopy || selectedDetailAd.brief?.copy}</p>
                  </div>
                )}

                {selectedDetailAd.brief?.callToAction && (
                  <div>
                    <h4 className="text-[11px] font-black text-stone-400 uppercase tracking-wider mb-1">Call To Action</h4>
                    <span className="inline-block bg-amber-100 text-amber-900 font-extrabold text-xs px-3 py-1 rounded-lg border border-amber-200">
                      {selectedDetailAd.brief.callToAction}
                    </span>
                  </div>
                )}

                {(selectedDetailAd.brief?.visualSceneSetup || selectedDetailAd.brief?.sceneSetup) && (
                  <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-1">
                    <h4 className="text-[11px] font-black text-stone-500 uppercase tracking-wider">Visual Scene Setup</h4>
                    <p className="text-xs text-stone-600 leading-relaxed">{selectedDetailAd.brief?.visualSceneSetup || selectedDetailAd.brief?.sceneSetup}</p>
                  </div>
                )}

                {selectedDetailAd.brief?.creativeRationale && (
                  <div>
                    <h4 className="text-[11px] font-black text-[#D27D50] uppercase tracking-wider mb-1">Creative Rationale</h4>
                    <p className="text-xs text-stone-600 italic leading-relaxed">{selectedDetailAd.brief.creativeRationale}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animate Modal */}
      {animateModalOpen && selectedAdForAnimate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto" onClick={() => setAnimateModalOpen(false)}>
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 lg:p-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setAnimateModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-2 rounded-full hover:bg-stone-100 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-[#D27D50]/10 text-[#D27D50] rounded-2xl">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-stone-900">Animate Image with Google Veo 3</h3>
                <p className="text-xs text-stone-500 font-medium">Turn your static ad into a cinematic motion short video</p>
              </div>
            </div>

            {/* Source Image & Details */}
            <div className="flex gap-4 p-4 bg-stone-50 border border-stone-100 rounded-2xl mb-6">
              <img src={selectedAdForAnimate.imageUrl} alt="Source" className="w-20 h-24 object-cover rounded-xl shadow-sm border border-stone-200 shrink-0" />
              <div className="flex-1 space-y-1 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#D27D50]">{selectedAdForAnimate.direction || 'Ad Campaign'}</span>
                <h4 className="font-bold text-stone-800 text-sm truncate">{selectedAdForAnimate.productName || 'Product'}</h4>
                <p className="text-xs text-stone-500 line-clamp-2">"{selectedAdForAnimate.brief?.tagline || ''}"</p>
              </div>
            </div>

            {animResultVideoUrl ? (
              <div className="space-y-6">
                <div className="relative w-full aspect-[9/16] max-h-[400px] bg-black rounded-2xl overflow-hidden flex items-center justify-center mx-auto shadow-xl">
                  <video src={animResultVideoUrl} controls autoPlay className="w-full h-full object-contain" />
                </div>
                <div className="flex gap-3">
                  <a 
                    href={animResultVideoUrl} 
                    download={`veo_anim_${Date.now()}.mp4`}
                    className="flex-1 flex items-center justify-center px-4 py-3 bg-[#3C342C] text-white text-sm font-bold rounded-xl hover:bg-black transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" /> Download Video
                  </a>
                  <Button 
                    onClick={() => {
                      const postData = {
                        content: selectedAdForAnimate.brief ? `${selectedAdForAnimate.brief.tagline ? selectedAdForAnimate.brief.tagline + '\n\n' : ''}${selectedAdForAnimate.brief.supportingCopy || selectedAdForAnimate.brief.copy || ''}\n\n${selectedAdForAnimate.brief.callToAction || ''}`.trim() : '',
                        mediaUrls: [animResultVideoUrl]
                      };
                      localStorage.setItem('composeAdData', JSON.stringify(postData));
                      router.push('/dashboard/posts/new');
                    }}
                    className="flex-1 bg-[#D27D50] hover:bg-[#b86d45] text-white font-bold h-11 rounded-xl shadow-sm"
                  >
                    <PenSquare className="w-4 h-4 mr-2" /> Compose Post
                  </Button>
                </div>
              </div>
            ) : animating || animStatus ? (
              <div className="py-8 space-y-6 bg-stone-50 rounded-2xl border border-stone-200 p-6">
                {animStatus === 'FAILED' ? (
                  <div className="text-center space-y-4">
                    <XCircle className="w-12 h-12 text-red-500 mx-auto" />
                    <h4 className="font-bold text-stone-850 text-lg">Animation Failed</h4>
                    <p className="text-sm text-red-600 font-medium">{animStatusMsg}</p>
                    <Button onClick={() => { setAnimating(false); setAnimStatus(null); }} className="bg-[#D27D50] text-white font-bold rounded-xl px-6 py-2">Try Again</Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-stone-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 text-[#D27D50] animate-spin" />
                        <h4 className="font-bold text-stone-850 text-base">Rendering Motion Graphic Video</h4>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-[#D27D50] border border-orange-200">
                        Veo 3 Fast Engine
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 font-medium bg-white p-3 rounded-xl border border-stone-200 text-left">
                      {animStatusMsg || 'Generating kinetic motion graphic video...'}
                    </p>

                    <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-[#D27D50] to-rose-500 h-full animate-pulse rounded-full w-3/4"></div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6 text-left">
                {/* Mode Selector Tab */}
                <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 w-fit">
                  <button
                    type="button"
                    onClick={() => setIsCodeView(false)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!isCodeView ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
                  >
                    🎨 Prompt Builder
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCodeView(true)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isCodeView ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
                  >
                    {'{ } Code / JSON View'}
                  </button>
                </div>

                {isCodeView ? (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider">
                        Google Veo 3.0 Raw JSON Guide Prompt
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedAdForAnimate) openAnimateModal(selectedAdForAnimate);
                        }}
                        className="text-[11px] font-semibold text-[#D27D50] hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> Re-synthesize JSON Prompt
                      </button>
                    </div>
                    <textarea 
                      value={animatePrompt} 
                      onChange={e => setAnimatePrompt(e.target.value)} 
                      rows={10} 
                      className="w-full bg-stone-950 border border-stone-850 text-amber-300 font-mono rounded-2xl p-4 text-xs focus:outline-none focus:ring-2 focus:ring-[#D27D50]/40 transition-shadow leading-relaxed" 
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-1">
                          Subject Physical Motion
                        </label>
                        <select
                          value={motionGuide}
                          onChange={e => setMotionGuide(e.target.value)}
                          className="w-full rounded-xl border-stone-200 bg-white text-xs focus:border-[#D27D50] focus:ring-[#D27D50]/20 p-2.5 shadow-2xs font-semibold text-stone-800"
                        >
                          <option value={`Full physical scene animation of ${selectedAdForAnimate.productName || 'product'}. Subject dynamically moves with realistic temporal weight, surface reflections shift across materials, and physical properties animate with 3D depth.`}>
                            Realistic Physical Depth (Default)
                          </option>
                          <option value={`Dynamic 360-degree rotation of ${selectedAdForAnimate.productName || 'product'} showcasing 3D depth, surface reflections glide naturally across materials.`}>
                            3D Showcase Spin
                          </option>
                          <option value={`Subtle ambient organic motion of ${selectedAdForAnimate.productName || 'product'}. Clean slow movements with elegant flow.`}>
                            Subtle Ambient Motion
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-1">
                          Camera Movement
                        </label>
                        <select
                          value={cameraGuide}
                          onChange={e => setCameraGuide(e.target.value)}
                          className="w-full rounded-xl border-stone-200 bg-white text-xs focus:border-[#D27D50] focus:ring-[#D27D50]/20 p-2.5 shadow-2xs font-semibold text-stone-800"
                        >
                          <option value="Slow 3D push-in camera tracking shot with natural depth parallax effect">
                            Slow 3D Push-In (Cinematic)
                          </option>
                          <option value="Slow sweeping camera pan left-to-right with wide lens angle and crisp focus">
                            Slow Wide Pan (Left-to-Right)
                          </option>
                          <option value="3D orbital camera tilt rotating around the product with shallow depth of field">
                            3D Orbital Tilt (Focus Spin)
                          </option>
                          <option value="Dramatic vertical camera push down showing high angle product layout">
                            High Angle Zoom-Out (Dramatic)
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-1">
                          Lighting & Visual Aesthetics
                        </label>
                        <select
                          value={styleGuide}
                          onChange={e => setStyleGuide(e.target.value)}
                          className="w-full rounded-xl border-stone-200 bg-white text-xs focus:border-[#D27D50] focus:ring-[#D27D50]/20 p-2.5 shadow-2xs font-semibold text-stone-850"
                        >
                          <option value="High-end commercial studio lighting, vibrant rim highlights, sharp focal clarity">
                            Commercial Studio Glow (Default)
                          </option>
                          <option value="Dramatic warm sunset lighting, volumetric sunbeams, long soft shadows, cinematic atmosphere">
                            Golden Hour Sunset
                          </option>
                          <option value="Cyberpunk neon lighting, vibrant magenta and cyan highlights, glossy reflective surfaces">
                            Neon Cyberpunk Vibe
                          </option>
                          <option value="Minimalist natural window shadows, diffuse soft daylight, clean pastel backdrop">
                            Minimalist Natural Light
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-stone-700 uppercase tracking-wider mb-1">
                          Typography Motion
                        </label>
                        <textarea
                          value={textStyleGuide}
                          onChange={e => setTextStyleGuide(e.target.value)}
                          rows={2}
                          className="w-full rounded-xl border-stone-200 bg-white text-xs focus:border-[#D27D50] focus:ring-[#D27D50]/20 p-2.5 shadow-2xs font-semibold text-stone-850 resize-none animate-in fade-in"
                          placeholder="Kinetic typography motion graphics style..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-stone-500 mt-1.5 italic">
                  Structured according to Google Veo 3 Prompting Guide JSON specification. Animates full scene physics (subject rotation, background particles, light reflections, camera tracking) AND kinetic typography.
                </p>

                <div className="pt-2 flex gap-3">
                  <Button 
                    onClick={() => setAnimateModalOpen(false)}
                    variant="outline"
                    className="flex-1 rounded-xl h-12 font-bold border-stone-200"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleStartAnimation}
                    disabled={!animatePrompt}
                    className="flex-1 bg-gradient-to-r from-[#D27D50] via-orange-500 to-rose-500 hover:from-[#b86d45] hover:to-rose-600 text-white rounded-xl h-12 font-bold shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                  >
                    <Film className="w-4 h-4" />
                    Generate Motion Graphic Video
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
