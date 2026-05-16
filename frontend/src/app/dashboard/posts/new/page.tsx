'use client';

import { useState, useCallback, useEffect, type ComponentType, type SVGProps } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  AtSign,
  Calendar,
  Check,
  CircleHelp,
  Clock,
  Facebook,
  FileText,
  Hash,
  ImageDown,
  Instagram,
  Linkedin,
  Loader2,
  Moon,
  Music2,
  Paperclip,
  Pin,
  Play,
  Plus,
  Send,
  Smile,
  Sparkles,
  Sun,
  Twitter,
  Upload,
  Video,
  Wand2,
  X,
  Youtube,
  Zap
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { DayPicker } from 'react-day-picker';
import { formatDistanceToNow, format, isAfter } from 'date-fns';

const postSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1, 'Content is required').max(5000),
  platforms: z.array(z.string()).min(1, 'Select at least one platform'),
  facebookPostType: z.enum(['FEED', 'REEL', 'STORY']).default('FEED').optional(),
  facebookAutoFix: z.boolean().default(true),
  instagramPostType: z.enum(['FEED', 'REEL', 'STORY']).default('FEED').optional(),
  instagramAutoFix: z.boolean().default(true),
  scheduledAt: z.date().optional(),
  timezone: z.string().default('America/New_York'),
  publishNow: z.boolean().default(false),
  reelTitle: z.string().optional(),
  location: z.string().optional(),
  shareToFeed: z.boolean().default(true),
  youtubePrivacy: z.enum(['public', 'private', 'unlisted']).default('public').optional(),
  youtubeCategory: z.string().default('22').optional(),
  youtubeMadeForKids: z.boolean().default(false),
  youtubeTags: z.string().optional(),
  youtubeAutoFix: z.boolean().default(true),
  youtubePostType: z.enum(['VIDEO', 'SHORTS']).default('VIDEO'),
  youtubeThumbnail: z.instanceof(File).optional(),
  twitterThreadMode: z.enum(['AUTO', 'TRUNCATE']).default('AUTO').optional(),
  twitterReplySettings: z.enum(['everyone', 'mentionedUsers', 'following']).default('everyone').optional(),
  twitterAutoFix: z.boolean().default(true),
  threadsAutoFix: z.boolean().default(true),
  pinterestBoardId: z.string().optional(),
  pinterestLink: z.string().optional(),
  snapchatPostType: z.enum(['STORY', 'SPOTLIGHT']).default('STORY').optional(),
});

type PostForm = z.infer<typeof postSchema>;

const platformStyles: Record<string, {
  name: string;
  label?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  color: string;
  bg: string;
}> = {
  FACEBOOK: { name: 'Facebook', icon: Facebook, color: '#1877F2', bg: '#EBF4FF' },
  INSTAGRAM: { name: 'Instagram', icon: Instagram, color: '#E4405F', bg: '#FFF0F3' },
  LINKEDIN: { name: 'LinkedIn', icon: Linkedin, color: '#0A66C2', bg: '#EBF4FF' },
  TWITTER: { name: 'X / Twitter', icon: Twitter, color: '#111111', bg: '#F3F4F6' },
  TIKTOK: { name: 'TikTok', icon: Music2, color: '#111111', bg: '#F3F4F6' },
  YOUTUBE: { name: 'YouTube', icon: Youtube, color: '#FF0000', bg: '#FFF1F1' },
  THREADS: { name: 'Threads', icon: AtSign, color: '#111111', bg: '#F3F4F6' },
  PINTEREST: { name: 'Pinterest', icon: Pin, color: '#E60023', bg: '#FFF1F1' },
  SNAPCHAT: { name: 'Snapchat', icon: Sparkles, color: '#B89400', bg: '#FFF8D9' },
};

const platforms = [
  { id: 'FACEBOOK', ...platformStyles.FACEBOOK },
  { id: 'INSTAGRAM', ...platformStyles.INSTAGRAM },
  { id: 'LINKEDIN', ...platformStyles.LINKEDIN },
  { id: 'TWITTER', ...platformStyles.TWITTER },
  { id: 'TIKTOK', ...platformStyles.TIKTOK },
  { id: 'YOUTUBE', ...platformStyles.YOUTUBE },
  { id: 'THREADS', ...platformStyles.THREADS },
  { id: 'PINTEREST', ...platformStyles.PINTEREST },
  { id: 'SNAPCHAT', ...platformStyles.SNAPCHAT },
];

type LogEntry = { ts: string; level: 'info' | 'success' | 'error' | 'warn'; msg: string };

export default function NewPostPage() {
  const router = useRouter();
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [showScheduler, setShowScheduler] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pinterestBoards, setPinterestBoards] = useState<any[]>([]);
  const [isLoadingBoards, setIsLoadingBoards] = useState(false);
  const [activePlatform, setActivePlatform] = useState<string | null>(null);

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.oauth.getAccounts(),
  });

  const { data: rules } = useQuery({
    queryKey: ['platform-rules'],
    queryFn: () => api.config.getRules(),
  });

  const [mediaAnalysis, setMediaAnalysis] = useState<Record<number, {
    width: number;
    height: number;
    ratio: number;
    platformValidations: Record<string, { valid: boolean; errors: string[] }>;
  }>>({});


  const [publishLog, setPublishLog] = useState<LogEntry[]>([]);
  const [publishError, setPublishError] = useState<string | null>(null);

  const addLog = (level: LogEntry['level'], msg: string) => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    setPublishLog(prev => [...prev, { ts, level, msg }]);
  };

  const createPostMutation = useMutation({
    mutationFn: async (data: PostForm) => {
      setPublishLog([]);
      setPublishError(null);

      const platformList = data.platforms.join(', ');
      addLog('info', `>> Starting publish to: ${platformList}`);

      if (mediaFiles.length > 0) {
        addLog('info', `[media] ${mediaFiles.length} file(s) attached`);
        for (const f of mediaFiles) {
          addLog('info', `  - ${f.name} (${(f.size / 1024 / 1024).toFixed(1)} MB, ${f.type})`);
        }
      } else {
        addLog('warn', `[warn] No media attached - text-only post`);
      }

      addLog('info', `[...] Validating & uploading media...`);

      const postData = {
        content: data.content,
        title: data.title || '',
        platforms: data.platforms,
        scheduledAt: data.scheduledAt ? data.scheduledAt.toISOString() : null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        publishNow: data.publishNow,
        platformOptions: {
          FACEBOOK: {
            postType: data.facebookPostType,
            autoFix: data.facebookAutoFix,
            reelTitle: data.reelTitle,
            location: data.location
          },
          INSTAGRAM: {
            postType: data.instagramPostType,
            autoFix: data.instagramAutoFix,
            shareToFeed: data.shareToFeed,
            location: data.location
          },
          YOUTUBE: {
            privacy: data.youtubePrivacy,
            category: data.youtubeCategory,
            madeForKids: data.youtubeMadeForKids,
            title: data.title,
            tags: data.youtubeTags,
            autoFix: data.youtubeAutoFix,
            postType: data.youtubePostType,
            customThumbnail: data.youtubeThumbnail || null
          },
          TWITTER: {
            threadMode: data.twitterThreadMode,
            replySettings: data.twitterReplySettings,
            autoFix: data.twitterAutoFix
          },
          THREADS: {
            autoFix: data.threadsAutoFix
          },
          PINTEREST: {
            boardId: data.pinterestBoardId,
            link: data.pinterestLink
          },
          SNAPCHAT: {
            postType: data.snapchatPostType
          }
        },
        media: mediaFiles
      };

      try {
        const result = await api.posts.create(postData as any);
        addLog('success', `[ok] Post created (ID: ${result.id})`);
        addLog('success', `[ok] Queued for: ${platformList}`);
        if (data.publishNow) {
          addLog('info', `[>>] Publishing now - check Posts tab for live status`);
        } else if (data.scheduledAt) {
          addLog('info', `[cal] Scheduled for: ${data.scheduledAt.toLocaleString()}`);
        } else {
          addLog('info', `[draft] Saved as draft`);
        }
        return result;
      } catch (err: any) {
        const msg = err?.message || 'Unknown error';
        addLog('error', `[fail] ${msg}`);
        if (err?.details) {
          for (const d of err.details) {
            addLog('error', `  - ${d.message || JSON.stringify(d)}`);
          }
        }
        throw err;
      }
    },
    onSuccess: () => {
      // Short delay so user can read the success log before navigating
      setTimeout(() => router.push('/dashboard/posts'), 1800);
    },
    onError: (err: any) => {
      setPublishError(err?.message || 'Submission failed');
    }
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<PostForm>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      timezone: 'America/New_York',
      facebookAutoFix: true,
      instagramAutoFix: true,
      facebookPostType: 'FEED',
      instagramPostType: 'FEED',
      twitterThreadMode: 'AUTO',
      twitterReplySettings: 'everyone',
      twitterAutoFix: true,
      threadsAutoFix: true,
      shareToFeed: true,
      platforms: []
    },
  });

  const quickScheduleTimes = [
    { label: '1 hour', icon: Zap, value: () => { const d = new Date(); d.setHours(d.getHours() + 1); return d; } },
    { label: 'Tonight (8 PM)', icon: Moon, value: () => { const d = new Date(); d.setHours(20, 0, 0, 0); return d; } },
    { label: 'Tomorrow (9 AM)', icon: Sun, value: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; } },
  ];

  const getTimePreview = () => {
    if (!scheduledAt) return null;
    if (!isAfter(scheduledAt, new Date())) return "Select a future time";
    return `Publishes in ${formatDistanceToNow(scheduledAt)}`;
  };

  const selectedPlatforms = watch('platforms');
  const scheduledAt = watch('scheduledAt');
  const fbAutoFix = watch('facebookAutoFix');
  const igAutoFix = watch('instagramAutoFix');
  const fbType = watch('facebookPostType');
  const igType = watch('instagramPostType');

  const handlePlatformToggle = (platformId: string) => {
    const current = selectedPlatforms || [];
    if (current.includes(platformId)) {
      const next = current.filter((p) => p !== platformId);
      setValue('platforms', next);
      if (activePlatform === platformId) {
        setActivePlatform(next[0] || null);
      }
    } else {
      setValue('platforms', [...current, platformId]);
      setActivePlatform(platformId);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    setMediaFiles((prev) => [...prev, ...files]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setMediaFiles((prev) => [...prev, ...files]);
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const connectedPlatforms = accountsData?.accounts?.map((a) => a.platform) || [];

  useEffect(() => {
    if (!activePlatform && selectedPlatforms?.length > 0) {
      setActivePlatform(selectedPlatforms[0]);
    }
  }, [selectedPlatforms, activePlatform]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const source = params.get('source');
    const draftId = params.get('id');

    if (source === 'ai_gen') {
      const pendingData = sessionStorage.getItem('pending_ai_post');
      if (pendingData) {
        const { content, mediaUrl, title, youtubeTags } = JSON.parse(pendingData);
        setValue('content', content);
        if (title) setValue('title', title);
        if (youtubeTags) setValue('youtubeTags', youtubeTags);

        fetch(mediaUrl)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], 'ai-generated-ad.jpg', { type: 'image/jpeg' });
            setMediaFiles([file]);
          })
          .catch(err => console.error('Failed to pre-load AI media', err));

        sessionStorage.removeItem('pending_ai_post');
      }
    } else if (draftId) {
      api.posts.get(draftId).then(post => {
        setValue('content', post.rawContent);
        if (post.title) setValue('title', post.title);
        if (post.platforms) setValue('platforms', post.platforms);

        // Load platform options if any
        const draftPlatformOptions = (post as any).platformOptions;
        if (draftPlatformOptions) {
          const opts: any = draftPlatformOptions;
          if (opts.FACEBOOK?.postType) setValue('facebookPostType', opts.FACEBOOK.postType);
          if (opts.INSTAGRAM?.postType) setValue('instagramPostType', opts.INSTAGRAM.postType);
          if (opts.YOUTUBE?.tags) setValue('youtubeTags', opts.YOUTUBE.tags);
          if (opts.YOUTUBE?.privacy) setValue('youtubePrivacy', opts.YOUTUBE.privacy);
        }

        // Fetch media
        if (post.mediaUrls && post.mediaUrls.length > 0) {
          Promise.all(post.mediaUrls.map(url => fetch(url).then(res => res.blob())))
            .then(blobs => {
              const files = blobs.map((blob, i) => new File([blob], `draft-media-${i}.jpg`, { type: blob.type }));
              setMediaFiles(files);
            })
            .catch(err => console.error('Failed to fetch draft media', err));
        }
      }).catch(err => console.error('Failed to load draft', err));
    }
  }, [setValue]);

  // Fetch Pinterest boards when Pinterest is selected
  useEffect(() => {
    const isPinterestSelected = selectedPlatforms?.includes('PINTEREST');
    const pinterestAccount = accountsData?.accounts?.find(a => a.platform === 'PINTEREST');

    if (isPinterestSelected && pinterestAccount && pinterestBoards.length === 0) {
      const fetchBoards = async () => {
        setIsLoadingBoards(true);
        try {
          const response = await api.oauth.getPinterestBoards(pinterestAccount.id);
          setPinterestBoards(response.boards || []);
          if (response.boards?.length > 0) {
            setValue('pinterestBoardId', response.boards[0].id);
          }
        } catch (err) {
          console.error('Failed to fetch Pinterest boards', err);
        } finally {
          setIsLoadingBoards(false);
        }
      };
      fetchBoards();
    }
  }, [selectedPlatforms, accountsData, pinterestBoards.length, setValue]);

  // Load last saved settings
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasSpecialSource = params.get('source') === 'ai_gen' || params.get('id');

    if (!hasSpecialSource) {
      const saved = localStorage.getItem('anysocial_last_settings');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          Object.keys(data).forEach(key => {
            setValue(key as any, data[key]);
          });
        } catch (e) {
          console.error('Failed to load saved settings', e);
        }
      }
    }
  }, [setValue]);

  // Persist settings on change
  const currentPlatforms = watch('platforms');
  const fbPType = watch('facebookPostType');
  const fbAFix = watch('facebookAutoFix');
  const igPType = watch('instagramPostType');
  const igAFix = watch('instagramAutoFix');
  const twMode = watch('twitterThreadMode');
  const twReply = watch('twitterReplySettings');
  const twAFix = watch('twitterAutoFix');
  const thAFix = watch('threadsAutoFix');
  const sToFeed = watch('shareToFeed');
  const ytPriv = watch('youtubePrivacy');
  const ytCat = watch('youtubeCategory');
  const ytAFix = watch('youtubeAutoFix');
  const ytPType = watch('youtubePostType');
  const scPType = watch('snapchatPostType');

  useEffect(() => {
    const persistable = {
      platforms: currentPlatforms,
      facebookPostType: fbPType,
      facebookAutoFix: fbAFix,
      instagramPostType: igPType,
      instagramAutoFix: igAFix,
      twitterThreadMode: twMode,
      twitterReplySettings: twReply,
      twitterAutoFix: twAFix,
      threadsAutoFix: thAFix,
      shareToFeed: sToFeed,
      youtubePrivacy: ytPriv,
      youtubeCategory: ytCat,
      youtubeAutoFix: ytAFix,
      youtubePostType: ytPType,
      snapchatPostType: scPType,
    };
    localStorage.setItem('anysocial_last_settings', JSON.stringify(persistable));
  }, [
    currentPlatforms, fbPType, fbAFix, igPType, igAFix, 
    twMode, twReply, twAFix, thAFix, sToFeed, 
    ytPriv, ytCat, ytAFix, ytPType, scPType
  ]);

  useEffect(() => {
    const analyze = async () => {
      if (!rules) return;
      const newAnalysis: typeof mediaAnalysis = {};

      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        const isVideo = file.type.startsWith('video/');

        const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
          if (isVideo) {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => resolve({ width: video.videoWidth, height: video.videoHeight });
            video.src = URL.createObjectURL(file);
          } else {
            const img = new Image();
            img.onload = () => resolve({ width: img.width, height: img.height });
            img.src = URL.createObjectURL(file);
          }
        });

        const ratio = dimensions.width / dimensions.height;
        const platformValidations: Record<string, { valid: boolean; errors: string[] }> = {};

        selectedPlatforms?.forEach((platform) => {
          const pRules = rules[platform];
          if (!pRules) return;

          const errors: string[] = [];
          let targetRatios = [...pRules.aspectRatios];
          let minW = pRules.minDimensions.width;
          let minH = pRules.minDimensions.height;

          if (platform === 'INSTAGRAM') {
            const type = igType || 'FEED';
            if (type === 'REEL' || type === 'STORY') {
              targetRatios = [0.562, 0.5, 0.45, 0.4, 0.8];
              minW = 320;
              minH = 480;
            }
          }

          const ratioMatched = targetRatios.some((r: number) => Math.abs(ratio - r) <= 0.15);
          if (!ratioMatched) {
            errors.push(`Aspect ratio ${ratio.toFixed(2)} is not recommended.`);
          }

          if (dimensions.width < minW || dimensions.height < minH) {
            errors.push(`Dimensions ${dimensions.width}x${dimensions.height} below minimum ${minW}x${minH}`);
          }

          if (!pRules.allowedMimeTypes.includes(file.type)) {
            errors.push(`Format ${file.type} not officially supported`);
          }

          platformValidations[platform] = {
            valid: errors.length === 0,
            errors
          };
        });

        newAnalysis[i] = { ...dimensions, ratio, platformValidations };
      }
      setMediaAnalysis(newAnalysis);
    };

    analyze();
  }, [mediaFiles, selectedPlatforms, fbType, igType, rules]);

  const onSubmit = (data: PostForm) => {
    createPostMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="min-h-[calc(100vh-64px)] bg-[#F2F6F2] text-[#2F281F]">
      <div className="flex min-h-[calc(100vh-64px)]">
        <aside className="hidden w-16 shrink-0 border-r border-[#D9E3D9] bg-white px-2 pb-24 pt-6 lg:block">
          <p className="mb-4 text-center text-[10px] font-bold uppercase text-[#AAA39D]">Channels</p>
          <div className="flex flex-col items-center gap-2.5">
            {accountsData?.accounts?.map((account) => {
              const platformId = account.platform.toUpperCase();
              const config = platformStyles[platformId];
              if (!config) return null;

              const selected = selectedPlatforms?.includes(platformId);
              const Icon = config.icon;
              const accountName = account.metadata?.accountName || account.externalAccountId;

              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => {
                    handlePlatformToggle(platformId);
                    setActivePlatform(platformId);
                  }}
                  className={cn(
                    'relative flex h-12 w-12 items-center justify-center rounded-2xl transition',
                    selected ? 'shadow-[0_8px_18px_rgba(0,0,0,0.10)]' : 'bg-[#EEF3EE]',
                    activePlatform === platformId && "ring-2 ring-[#D27D50] ring-offset-2"
                  )}
                  style={{ backgroundColor: selected ? config.bg : undefined }}
                  title={`${accountName} (${config.name})`}
                >
                  <Icon className="h-5 w-5" style={{ color: selected ? config.color : '#AAA39D' }} strokeWidth={2.2} />
                  {selected && (
                    <span
                      className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-white shadow-sm"
                      style={{ backgroundColor: config.color }}
                    >
                      <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />
                    </span>
                  )}
                </button>
              );
            })}
            <div className="my-1.5 h-px w-10 bg-[#D9E3D9]" />
            <button
              type="button"
              onClick={() => router.push('/dashboard/social-accounts')}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-dashed border-[#D9E3D9] text-[#AAA39D]"
              aria-label="Add channel"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </aside>

        <main className="relative flex min-w-0 flex-1 flex-col bg-[#F2F6F2] px-5 pb-24 pt-8 lg:px-8">
          <div className="mx-auto w-full max-w-[880px]">

            <div className="space-y-4">
              <Label htmlFor="content" className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#AAA39D]">
                Caption
              </Label>
              <Textarea
                id="content"
                placeholder="What do you want to share today?"
                rows={8}
                {...register('content')}
                className="min-h-[250px] resize-none border-0 bg-transparent p-0 text-[20px] leading-relaxed text-[#2F281F] shadow-none outline-none placeholder:text-[#D7D2CE] focus-visible:ring-0"
              />
              {errors.content && <p className="text-sm font-semibold text-red-600">{errors.content.message}</p>}
            </div>

            <div className="mt-6 flex h-12 items-center gap-4 rounded-2xl border border-[#D9E3D9] bg-white px-5 text-[#AAA39D] shadow-[0_14px_30px_rgba(58,72,58,0.09)]">
              <Smile className="h-4 w-4" strokeWidth={1.8} />
              <ImageDown className="h-4 w-4" strokeWidth={1.8} />
              <Hash className="h-4 w-4" strokeWidth={1.8} />
              <Paperclip className="h-4 w-4" strokeWidth={1.8} />
              <span className="h-6 w-px bg-[#E8EEE8]" />
              <button type="button" className="flex h-9 items-center gap-2 rounded-xl bg-[#FBF3EE] px-3 text-[14px] font-bold text-[#D9774B]">
                <Sparkles className="h-4 w-4" />
                AI Assist
              </button>
              <span className="h-6 w-px bg-[#E8EEE8]" />
            </div>

            <div className="mt-8 space-y-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#AAA39D]">Media</p>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('media-upload')?.click()}
                className={cn(
                  'flex min-h-[170px] cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed text-center transition',
                  isDragging ? 'border-[#D9774B] bg-[#FBF3EE]' : 'border-[#D9E3D9] bg-transparent'
                )}
              >
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#AAA39D]">
                  <Upload className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <p className="text-[16px] font-bold text-[#5F5A54]">Drop media here or <span className="text-[#D9774B]">browse</span></p>
                <p className="mt-1 text-[13px] text-[#AAA39D]">JPG, PNG, MP4, MOV · Max 50MB</p>
                <input id="media-upload" type="file" multiple hidden accept="image/*,video/*" onChange={handleFileSelect} />
              </div>

              {mediaFiles.length > 0 && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {mediaFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="group overflow-hidden rounded-xl border border-[#D9E3D9] bg-white">
                      <div className="relative aspect-square bg-stone-200">
                        {file.type.startsWith('video/') ? (
                          <div className="flex h-full w-full items-center justify-center">
                            <Play className="h-7 w-7 text-stone-500" />
                          </div>
                        ) : (
                          <img src={URL.createObjectURL(file)} className="h-full w-full object-cover" alt="" />
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeMedia(index); }}
                          className="absolute right-2 top-2 rounded-full bg-stone-900/80 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label="Remove media"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {showScheduler && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div
                  className="fixed inset-0 bg-[#1A1816]/40 backdrop-blur-md animate-in fade-in duration-300"
                  onClick={() => setShowScheduler(false)}
                />
                <div className="relative w-full max-w-[680px] animate-in zoom-in-95 fade-in duration-200 rounded-[32px] border border-[#D9E3D9] bg-white p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)]">
                  <div className="mb-8 flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-[#171717]">Schedule Post</h2>
                      <p className="mt-1 text-[14px] text-[#AAA39D]">
                        {getTimePreview() || 'Choose the perfect time for your audience.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowScheduler(false)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F2F6F2] text-[#AAA39D] transition hover:bg-[#EEF3EE] hover:text-[#2F281F]"
                    >
                      <X className="h-5 w-5" strokeWidth={2} />
                    </button>
                  </div>

                  <div className="grid gap-8 lg:grid-cols-[1fr_240px]">
                    <div className="rounded-[24px] border border-[#D9E3D9] bg-[#F8FAF8] p-4 shadow-inner">
                      <DayPicker
                        mode="single"
                        selected={scheduledAt}
                        onSelect={(date) => {
                          if (!date) return;
                          const current = scheduledAt || new Date();
                          date.setHours(current.getHours(), current.getMinutes());
                          setValue('scheduledAt', date);
                        }}
                        classNames={{
                          day_selected: 'bg-[#D27D50] text-white !rounded-xl font-bold shadow-lg shadow-[#D27D50]/30',
                          day_today: 'text-[#D27D50] font-bold',
                          day: 'h-10 w-10 text-center text-sm p-0 font-semibold text-stone-600 hover:bg-white hover:text-[#D27D50] rounded-xl transition-all active:scale-90',
                          caption: 'flex justify-between items-center py-3 px-1 font-bold text-stone-800 text-sm mb-2',
                          head_cell: 'text-[#AAA39D] font-bold text-[10px] uppercase w-10 pb-4',
                          table: 'w-full border-collapse',
                          nav: 'flex items-center gap-1',
                          nav_button: 'p-2 hover:bg-white rounded-xl transition text-stone-400 hover:text-[#D27D50] border border-transparent hover:border-[#D9E3D9]',
                        }}
                      />
                    </div>

                    <div className="flex flex-col gap-6">
                      <div className="space-y-3">
                        <Label className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#AAA39D]">Exact Time</Label>
                        <div className="relative">
                          <Input
                            type="time"
                            value={scheduledAt ? format(scheduledAt, 'HH:mm') : ''}
                            onChange={(e) => {
                              const [hours, minutes] = e.target.value.split(':');
                              const date = new Date(scheduledAt || new Date());
                              date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
                              setValue('scheduledAt', date);
                            }}
                            className="h-14 rounded-[18px] border-[#D9E3D9] bg-[#F8FAF8] text-center text-2xl font-bold text-[#171717] transition focus-visible:ring-2 focus-visible:ring-[#D27D50]/20"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#AAA39D]">Quick Select</Label>
                        <div className="grid gap-2">
                          {quickScheduleTimes.map((slot) => (
                            <button
                              key={slot.label}
                              type="button"
                              onClick={() => setValue('scheduledAt', slot.value())}
                              className="flex items-center gap-3 rounded-xl border border-[#D9E3D9] bg-white px-4 py-3 text-[13px] font-bold text-[#5F5A54] transition hover:border-[#D27D50]/40 hover:bg-[#FBF3EE] hover:text-[#D27D50]"
                            >
                              <slot.icon className="h-4 w-4" />
                              {slot.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-auto">
                        <Button
                          type="button"
                          onClick={() => setShowScheduler(false)}
                          className="h-14 w-full rounded-2xl bg-[#D27D50] text-sm font-bold text-white shadow-lg shadow-[#D27D50]/20 transition hover:bg-[#C06A3D] active:scale-[0.98]"
                        >
                          Set Schedule
                        </Button>
                      </div>
                    </div>
                  </div>

                  {scheduledAt && (
                    <div className="mt-8 flex items-center justify-center gap-2 rounded-2xl bg-[#FBF3EE] py-3 text-[13px] font-bold text-[#A8562F]">
                      <Calendar className="h-4 w-4" />
                      <span>Scheduled for {format(scheduledAt, 'MMMM do, yyyy @ p')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {publishLog.length > 0 && (
              <div className="rounded-2xl border border-stone-800 bg-stone-950 p-4 font-mono text-xs">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-bold uppercase tracking-widest text-stone-400">
                    {createPostMutation.isPending ? 'Publishing...' : publishError ? 'Failed' : 'Done'}
                  </span>
                  <button type="button" onClick={() => { setPublishLog([]); setPublishError(null); }} className="text-stone-500 hover:text-white">
                    clear
                  </button>
                </div>
                <div className="max-h-60 space-y-1 overflow-y-auto">
                  {publishLog.map((entry, index) => (
                    <div
                      key={`${entry.ts}-${index}`}
                      className={cn(
                        'flex gap-2',
                        entry.level === 'error' ? 'text-red-400' :
                          entry.level === 'success' ? 'text-green-400' :
                            entry.level === 'warn' ? 'text-yellow-400' : 'text-stone-400'
                      )}
                    >
                      <span className="shrink-0 text-stone-600">{entry.ts}</span>
                      <span className="break-all">{entry.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className="h-[calc(100vh-64px)] w-full shrink-0 overflow-y-auto border-l border-[#D9E3D9] bg-white pb-24 xl:w-[320px]">
          <div className="sticky top-0 z-10 border-b border-[#D9E3D9] bg-white/80 px-6 py-4 backdrop-blur-sm">
            <h2 className="text-[16px] font-bold tracking-tight text-[#24211E]">Settings</h2>
            <p className="mt-0.5 text-[12px] text-[#AAA39D]">Configure platform-specific options.</p>
          </div>

          <div className="space-y-4 px-4 py-4">
            {(selectedPlatforms?.length === 0) && (
              <div className="rounded-2xl border border-dashed border-[#D9E3D9] bg-white p-5 text-center">
                <p className="text-sm font-bold text-stone-800">No channels selected</p>
                <p className="mt-1 text-[11px] leading-snug text-stone-400">Select a connected channel on the left to configure platform-specific options.</p>
              </div>
            )}

            {selectedPlatforms?.includes('FACEBOOK') && (
              <div className="rounded-2xl border border-[#D9E3D9] bg-white">
                <OverrideHeader platform="FACEBOOK" value={fbType || 'FEED'} />
                <div className="space-y-3 px-4 py-3">
                  <SegmentedOptions label="Post Type" options={['FEED', 'REEL', 'STORY']} value={fbType || 'FEED'} onChange={(value) => setValue('facebookPostType', value as any)} color={platformStyles.FACEBOOK.color} />
                  {fbType === 'REEL' && <Input placeholder="Reel title" {...register('reelTitle')} className="h-9 rounded-lg border-[#D9E3D9] text-xs" />}
                  <Input placeholder="Location" {...register('location')} className="h-9 rounded-lg border-[#D9E3D9] text-xs" />
                  <SwitchRow label="Auto-fix media" description="Trim & reformat to platform specs" checked={fbAutoFix} onChange={(value) => setValue('facebookAutoFix', value)} />
                </div>
              </div>
            )}

            {selectedPlatforms?.includes('LINKEDIN') && (
              <div className="rounded-2xl border border-[#D9E3D9] bg-white">
                <OverrideHeader platform="LINKEDIN" value="Story" />
                <div className="space-y-3 px-5 py-4">
                  <SegmentedOptions label="Post Type" options={['Post', 'Story']} value="Story" onChange={() => undefined} color={platformStyles.LINKEDIN.color} />
                  <SegmentedOptions label="Visibility" options={['Anyone', 'Connections']} value="Connections" onChange={() => undefined} color="#171717" />
                  <SwitchRow label="Auto-fix media" checked={true} onChange={() => undefined} />
                </div>
              </div>
            )}

            {selectedPlatforms?.includes('TWITTER') && (
              <div className="rounded-2xl border border-[#D9E3D9] bg-white">
                <OverrideHeader platform="TWITTER" value="Post" />
                <div className="space-y-3 px-5 py-4">
                  <SegmentedOptions label="Who can reply" options={['everyone', 'following', 'mentionedUsers']} value={watch('twitterReplySettings') || 'everyone'} onChange={(value) => setValue('twitterReplySettings', value as any)} color={platformStyles.TWITTER.color} />
                  <Controller name="twitterAutoFix" control={control} render={({ field }) => <SwitchRow label="Auto-fix media" checked={field.value} onChange={field.onChange} />} />
                </div>
              </div>
            )}

            {selectedPlatforms?.includes('INSTAGRAM') && (
              <div className="rounded-2xl border border-[#D9E3D9] bg-white">
                <OverrideHeader platform="INSTAGRAM" value={igType || 'FEED'} />
                <div className="space-y-3 px-5 py-4">
                  <SegmentedOptions label="Post Type" options={['FEED', 'REEL', 'STORY']} value={igType || 'FEED'} onChange={(value) => setValue('instagramPostType', value as any)} color={platformStyles.INSTAGRAM.color} />
                  {igType === 'REEL' && <SwitchRow label="Share Reel to Feed" checked={watch('shareToFeed')} onChange={(value) => setValue('shareToFeed', value)} />}
                  <SwitchRow label="Auto-fix media" description="Conforms to IG specs" checked={igAutoFix} onChange={(value) => setValue('instagramAutoFix', value)} />
                </div>
              </div>
            )}

            {selectedPlatforms?.includes('YOUTUBE') && (
              <div className="rounded-2xl border border-[#D9E3D9] bg-white">
                <OverrideHeader platform="YOUTUBE" value={watch('youtubePostType')} />
                <div className="space-y-3 px-5 py-4">
                  <SegmentedOptions label="Format" options={['VIDEO', 'SHORTS']} value={watch('youtubePostType')} onChange={(value) => setValue('youtubePostType', value as any)} color={platformStyles.YOUTUBE.color} />
                  <div className="grid grid-cols-2 gap-2">
                    <select className="h-9 rounded-lg border border-[#D9E3D9] bg-white px-2 text-xs text-stone-600" {...register('youtubePrivacy')}>
                      <option value="public">Public</option>
                      <option value="unlisted">Unlisted</option>
                      <option value="private">Private</option>
                    </select>
                    <select className="h-9 rounded-lg border border-[#D9E3D9] bg-white px-2 text-xs text-stone-600" {...register('youtubeCategory')}>
                      <option value="22">People & Blogs</option>
                      <option value="23">Comedy</option>
                      <option value="24">Entertainment</option>
                      <option value="1">Film & Animation</option>
                      <option value="10">Music</option>
                    </select>
                  </div>
                  <Input placeholder="SEO tags" {...register('youtubeTags')} className="h-9 rounded-lg border-[#D9E3D9] text-xs" />
                  <Controller name="youtubeAutoFix" control={control} render={({ field }) => <SwitchRow label="Auto-fix media" checked={field.value} onChange={field.onChange} />} />
                  <Controller name="youtubeMadeForKids" control={control} render={({ field }) => <SwitchRow label="Made for Kids" checked={field.value} onChange={field.onChange} icon={AlertCircle} />} />
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#D9E3D9] bg-[#F8FAF8] px-3 py-4 text-center hover:border-red-300">
                    <Upload className="mb-1 h-4 w-4 text-red-500" />
                    <span className="text-[10px] font-semibold text-stone-500">{watch('youtubeThumbnail') ? 'Thumbnail selected' : 'Upload thumbnail'}</span>
                    <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={(e) => {
                      if (e.target.files?.[0]) setValue('youtubeThumbnail', e.target.files[0] as any);
                    }} />
                  </label>
                </div>
              </div>
            )}

            {selectedPlatforms?.includes('THREADS') && (
              <div className="rounded-2xl border border-[#D9E3D9] bg-white">
                <OverrideHeader platform="THREADS" value="Post" />
                <div className="px-4 py-4">
                  <Controller name="threadsAutoFix" control={control} render={({ field }) => <SwitchRow label="Auto-fix media" description="Force 4:5 portrait for Threads" checked={field.value} onChange={field.onChange} />} />
                </div>
              </div>
            )}

            {selectedPlatforms?.includes('PINTEREST') && (
              <div className="rounded-2xl border border-[#D9E3D9] bg-white">
                <OverrideHeader platform="PINTEREST" value="Pin" />
                <div className="space-y-3 px-4 py-4">
                  {isLoadingBoards ? (
                    <p className="flex items-center gap-2 text-xs text-stone-500"><Loader2 className="h-3 w-3 animate-spin" /> Fetching boards...</p>
                  ) : pinterestBoards.length > 0 ? (
                    <select className="h-9 w-full rounded-lg border border-[#D9E3D9] bg-white px-2 text-xs text-stone-600" {...register('pinterestBoardId')}>
                      {pinterestBoards.map((board) => <option key={board.id} value={board.id}>{board.name}</option>)}
                    </select>
                  ) : (
                    <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">No boards found. Create one on Pinterest first.</p>
                  )}
                  <Input placeholder="Destination link" {...register('pinterestLink')} className="h-9 rounded-lg border-[#D9E3D9] text-xs" />
                </div>
              </div>
            )}

            {selectedPlatforms?.includes('SNAPCHAT') && (
              <div className="rounded-2xl border border-[#D9E3D9] bg-white">
                <OverrideHeader platform="SNAPCHAT" value={watch('snapchatPostType') || 'STORY'} />
                <div className="px-4 py-4">
                  <SegmentedOptions label="Post Type" options={['STORY', 'SPOTLIGHT']} value={watch('snapchatPostType') || 'STORY'} onChange={(value) => setValue('snapchatPostType', value as any)} color={platformStyles.SNAPCHAT.color} />
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-xl border border-[#C5DCFA] bg-[#EBF4FF]/60 px-3 py-3">
              <CircleHelp className="mt-0.5 h-3 w-3 shrink-0 text-[#0A66C2]" />
              <p className="text-[11px] leading-snug text-[#0A66C2]">Override settings apply per-platform. Global caption is shared across all selected channels.</p>
            </div>
          </div>
        </aside>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#D9E3D9] bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] backdrop-blur-sm lg:left-[280px]">
        <div className="flex min-h-16 flex-col gap-3 px-5 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <button
            type="button"
            onClick={() => { setShowScheduler(true); setValue('publishNow', false); }}
            className="flex w-fit items-center gap-2 rounded-xl border border-[#D9E3D9] bg-white px-3 py-1.5 text-sm font-medium text-stone-500 transition hover:border-[#D27D50]/30 hover:text-stone-700"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>{scheduledAt ? format(scheduledAt, 'MMM d, p') : 'Pick date & time'}</span>
            <Clock className="h-3 w-3 text-stone-400" />
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              onClick={() => { setShowScheduler(false); setValue('publishNow', false); }}
              disabled={createPostMutation.isPending}
              className="flex items-center gap-1.5 rounded-xl border border-transparent px-4 py-2 text-sm font-medium text-stone-500 transition hover:border-[#D9E3D9] hover:bg-[#F0F4F0]"
            >
              <FileText className="h-3.5 w-3.5" />
              Save Draft
            </button>
            <button
              type="submit"
              onClick={() => { setShowScheduler(false); setValue('publishNow', false); }}
              disabled={createPostMutation.isPending}
              className="flex items-center gap-1.5 rounded-xl border border-[#D27D50]/30 bg-white px-4 py-2 text-sm font-semibold text-[#D27D50] transition hover:bg-[#FBF3EE]"
            >
              <Calendar className="h-3.5 w-3.5" />
              Schedule
            </button>
            <button
              type="submit"
              onClick={() => { setShowScheduler(false); setValue('publishNow', true); }}
              disabled={createPostMutation.isPending}
              className="group relative flex items-center gap-2 overflow-hidden rounded-xl px-5 py-2.5 text-sm font-bold tracking-wide text-white shadow-[0_2px_12px_rgba(210,125,80,0.45)] transition active:scale-95 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #D27D50 0%, #C06A3D 60%, #A8562F 100%)' }}
            >
              {createPostMutation.isPending ? <Loader2 className="relative z-10 h-3.5 w-3.5 animate-spin" /> : <Zap className="relative z-10 h-3.5 w-3.5 fill-current" />}
              <span className="relative z-10">Post Now</span>
              <Send className="relative z-10 h-3.5 w-3.5 opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
            </button>
          </div>
        </div>
      </footer>
    </form>
  );
}

function OverrideHeader({ platform, value }: { platform: string; value?: string }) {
  const config = platformStyles[platform];
  if (!config) return null;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2 border-b border-[#F0F4F0] px-4 py-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: config.bg }}>
        <Icon className="h-3 w-3" style={{ color: config.color }} />
      </span>
      <span className="text-[13px] font-bold text-[#2F281F]">{config.name}</span>
      {value && (
        <span className="ml-auto rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: config.bg, color: config.color }}>
          {value}
        </span>
      )}
    </div>
  );
}

function SegmentedOptions({
  label,
  options,
  value,
  onChange,
  color,
}: {
  label: string;
  options: string[];
  value?: string;
  onChange: (value: string) => void;
  color: string;
}) {
  return (
    <div>
      <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-stone-400">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = value === option;

          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={cn(
                'h-8 rounded-lg border px-3 text-[11px] font-semibold transition-all duration-150',
                selected ? 'border-transparent text-white' : 'border-[#D9E3D9] bg-white text-stone-500 hover:border-stone-400 hover:text-stone-700'
              )}
              style={selected ? { backgroundColor: color, borderColor: color } : undefined}
            >
              {option.charAt(0).toUpperCase() + option.slice(1).toLowerCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SwitchRow({
  label,
  description,
  checked,
  onChange,
  icon: Icon = CircleHelp,
}: {
  label: string;
  description?: string;
  checked?: boolean;
  onChange: (checked: boolean) => void;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium leading-tight text-stone-600">{label}</span>
        {description && (
          <div className="group relative">
            <Icon className="h-2.5 w-2.5 cursor-help text-stone-300" />
            <div className="pointer-events-none absolute bottom-5 left-1/2 z-50 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-stone-800 px-2 py-1 text-[10px] text-white shadow-lg group-hover:block">
              {description}
            </div>
          </div>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className={cn(
          "h-4 w-8 transition-colors",
          checked ? 'bg-[#D27D50]' : 'bg-stone-200'
        )}
      />
    </div>
  );
}
