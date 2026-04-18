'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Upload, X, Video, AlertCircle, Wand2, Calendar, 
  MapPin, Share2, Sparkles, Loader2, Search, ArrowRight,
  ArrowLeft, ChevronRight, ChevronLeft, Heart, MessageCircle,
  Clock, Zap, Moon, Sun, FileText
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

const platforms = [
  { id: 'FACEBOOK', name: 'Facebook', icon: '👥' },
  { id: 'INSTAGRAM', name: 'Instagram', icon: '📷' },
  { id: 'LINKEDIN', name: 'LinkedIn', icon: '💼' },
  { id: 'TWITTER', name: 'Twitter/X', icon: '🐦' },
  { id: 'TIKTOK', name: 'TikTok', icon: '🎵' },
  { id: 'YOUTUBE', name: 'YouTube', icon: '🎬' },
  { id: 'THREADS', name: 'Threads', icon: '🧵' },
  { id: 'PINTEREST', name: 'Pinterest', icon: '📌' },
  { id: 'SNAPCHAT', name: 'Snapchat', icon: '👻' }
];

type LogEntry = { ts: string; level: 'info' | 'success' | 'error' | 'warn'; msg: string };

export default function NewPostPage() {
  const router = useRouter();
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [showScheduler, setShowScheduler] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pinterestBoards, setPinterestBoards] = useState<any[]>([]);
  const [isLoadingBoards, setIsLoadingBoards] = useState(false);

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
      threadsAutoFix: true
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
      setValue('platforms', current.filter((p) => p !== platformId));
    } else {
      setValue('platforms', [...current, platformId]);
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
        if (post.platformOptions) {
          const opts: any = post.platformOptions;
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
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold">Create Post</h1>
        <p className="text-muted-foreground">Compose and schedule your social media posts</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Post Content */}
        <Card>
          <CardHeader>
            <CardTitle>Post Details</CardTitle>
            <CardDescription>Enter the content for your post</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Post Title (Optional)</Label>
              <Input id="title" placeholder="Title for Facebook/YouTube" {...register('title')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Post Content *</Label>
              <Textarea id="content" placeholder="What's on your mind?" rows={6} {...register('content')} />
              {errors.content && <p className="text-sm text-destructive">{errors.content.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Platforms */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Select Platforms</CardTitle>
                <CardDescription className="mt-0.5">Tap to toggle. Connected accounts shown.</CardDescription>
              </div>
              {selectedPlatforms?.length > 0 && (
                <span className="text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                  {selectedPlatforms.length} selected
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {platforms.map(platform => {
                const isConnected = connectedPlatforms.includes(platform.id);
                const isSelected = selectedPlatforms?.includes(platform.id);
                return (
                  <button
                    key={platform.id}
                    type="button"
                    disabled={!isConnected}
                    onClick={() => isConnected && handlePlatformToggle(platform.id)}
                    className={cn(
                      'relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all duration-150 text-center',
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                        : isConnected
                          ? 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
                          : 'border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed'
                    )}
                  >
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center">
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 12 12">
                          <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                        </svg>
                      </span>
                    )}
                    <span className="text-xl leading-none">{platform.icon}</span>
                    <span className={cn('text-[11px] font-semibold leading-tight', isSelected ? 'text-primary' : 'text-slate-600')}>
                      {platform.name}
                    </span>
                    {!isConnected && (
                      <span className="text-[9px] text-slate-400 leading-none">not connected</span>
                    )}
                  </button>
                );
              })}
            </div>
            {errors.platforms && <p className="text-sm text-destructive mt-3">{errors.platforms.message}</p>}
            {connectedPlatforms.length < platforms.length && (
              <button type="button" onClick={() => router.push('/dashboard/social-accounts')}
                className="mt-3 text-xs text-primary hover:underline flex items-center gap-1">
                + Connect more accounts
              </button>
            )}
          </CardContent>
        </Card>

        {/* Unified Platform Configuration */}
        {selectedPlatforms?.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Platform Settings</CardTitle>
              <CardDescription>Configuration for each selected platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Facebook */}
              {selectedPlatforms.includes('FACEBOOK') && (
                <div className="rounded-xl border border-blue-100 overflow-hidden">
                  <div className="bg-blue-600 h-1 w-full" />
                  <div className="p-4 space-y-3">
                    <p className="text-sm font-bold text-blue-700">Facebook</p>
                    <div className="flex gap-2">
                      {['FEED', 'REEL', 'STORY'].map(t => (
                        <button key={t} type="button"
                          onClick={() => setValue('facebookPostType', t as any)}
                          className={cn('flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all',
                            fbType === t ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-300'
                          )}>
                          {t}
                        </button>
                      ))}
                    </div>
                    {fbType === 'REEL' && <Input placeholder="Reel title..." {...register('reelTitle')} className="text-sm h-8" />}
                    <Input placeholder="Location (optional)" {...register('location')} className="text-sm h-8" />
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <Wand2 className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-xs font-medium">Auto-Fix media</span>
                        <span className="text-[10px] text-slate-400">Trim & reformat automatically</span>
                      </div>
                      <Switch checked={fbAutoFix} onCheckedChange={(val) => setValue('facebookAutoFix', val)} />
                    </div>
                  </div>
                </div>
              )}

              {/* Instagram */}
              {selectedPlatforms.includes('INSTAGRAM') && (
                <div className="rounded-xl border border-pink-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 h-1 w-full" />
                  <div className="p-4 space-y-3">
                    <p className="text-sm font-bold text-pink-700">Instagram</p>
                    <div className="flex gap-2">
                      {['FEED', 'REEL', 'STORY'].map(t => (
                        <button key={t} type="button"
                          onClick={() => setValue('instagramPostType', t as any)}
                          className={cn('flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all',
                            igType === t ? 'bg-pink-500 text-white border-pink-500' : 'border-slate-200 text-slate-600 hover:border-pink-300'
                          )}>
                          {t}
                        </button>
                      ))}
                    </div>
                    {igType === 'REEL' && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">Share Reel to Feed</span>
                        <Switch checked={watch('shareToFeed')} onCheckedChange={(val) => setValue('shareToFeed', val)} />
                      </div>
                    )}
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <Wand2 className="h-3.5 w-3.5 text-pink-500" />
                        <span className="text-xs font-medium">Auto-Fix media</span>
                        <span className="text-[10px] text-slate-400">Conform to IG requirements</span>
                      </div>
                      <Switch checked={igAutoFix} onCheckedChange={(val) => setValue('instagramAutoFix', val)} />
                    </div>
                  </div>
                </div>
              )}

              {/* YouTube */}
              {selectedPlatforms.includes('YOUTUBE') && (
                <div className="rounded-xl border border-red-100 overflow-hidden">
                  <div className="bg-red-600 h-1 w-full" />
                  <div className="p-4 space-y-3">
                    <p className="text-sm font-bold text-red-700">YouTube</p>
                    <div className="flex gap-2">
                      {['VIDEO', 'SHORTS'].map(t => (
                        <button key={t} type="button"
                          onClick={() => setValue('youtubePostType', t as any)}
                          className={cn('flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all',
                            watch('youtubePostType') === t ? 'bg-red-600 text-white border-red-600' : 'border-slate-200 text-slate-600 hover:border-red-300'
                          )}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Privacy</Label>
                        <select className="w-full h-8 px-2 text-xs rounded-lg border bg-background" {...register('youtubePrivacy')}>
                          <option value="public">Public</option>
                          <option value="unlisted">Unlisted</option>
                          <option value="private">Private</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Category</Label>
                        <select className="w-full h-8 px-2 text-xs rounded-lg border bg-background" {...register('youtubeCategory')}>
                          <option value="22">People & Blogs</option>
                          <option value="23">Comedy</option>
                          <option value="24">Entertainment</option>
                          <option value="1">Film & Animation</option>
                          <option value="10">Music</option>
                          <option value="25">News & Politics</option>
                          <option value="26">How-to & Style</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">SEO Tags</Label>
                      <Input placeholder="fashion, review, tips (comma separated)" {...register('youtubeTags')} className="text-xs h-8" />
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <Wand2 className="h-3.5 w-3.5 text-red-500" />
                        <span className="text-xs font-medium">Auto-Fix media</span>
                      </div>
                      <Controller name="youtubeAutoFix" control={control}
                        render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                    </div>
                    <div className="flex items-center justify-between py-1 border-t border-red-100 pt-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-xs font-medium text-orange-700">Made for Kids?</span>
                      </div>
                      <Controller name="youtubeMadeForKids" control={control}
                        render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                    </div>
                    
                    <div className="space-y-2 pt-2 border-t border-red-100">
                      <Label className="text-xs font-semibold">Custom Thumbnail (Optional)</Label>
                      {watch('youtubeThumbnail') ? (
                        <div className="relative w-full rounded-lg overflow-hidden border border-red-200 aspect-video bg-black">
                          <img src={URL.createObjectURL(watch('youtubeThumbnail') as File)} className="w-full h-full object-cover" alt="Thumb" />
                          <button type="button" onClick={() => setValue('youtubeThumbnail', undefined)} className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-red-600">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full py-4 rounded-lg border-2 border-dashed border-red-200 bg-red-50 cursor-pointer hover:bg-red-100">
                          <Upload className="h-4 w-4 text-red-400 mb-1" />
                          <p className="text-[10px] text-red-600 font-medium">Upload thumbnail</p>
                          <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={(e) => {
                            if (e.target.files?.[0]) setValue('youtubeThumbnail', e.target.files[0] as any);
                          }} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Twitter/X */}
              {selectedPlatforms.includes('TWITTER') && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-black h-1 w-full" />
                  <div className="p-4 space-y-3">
                    <p className="text-sm font-bold text-slate-800">Twitter / X</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Who can reply?</Label>
                        <select className="w-full h-8 px-2 text-xs rounded-lg border bg-background"
                          {...register('twitterReplySettings')}>
                          <option value="everyone">Everyone</option>
                          <option value="following">Accounts you follow</option>
                          <option value="mentionedUsers">Mentioned only</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Long content</Label>
                        <select className="w-full h-8 px-2 text-xs rounded-lg border bg-background"
                          {...register('twitterThreadMode')}>
                          <option value="AUTO">Auto-Thread</option>
                          <option value="TRUNCATE">Truncate</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <Wand2 className="h-3.5 w-3.5 text-slate-600" />
                        <span className="text-xs font-medium">Auto-Fix media</span>
                      </div>
                      <Controller name="twitterAutoFix" control={control}
                        render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                    </div>
                  </div>
                </div>
              )}

              {/* Threads */}
              {selectedPlatforms.includes('THREADS') && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-900 h-1 w-full" />
                  <div className="p-4 space-y-3">
                    <p className="text-sm font-bold text-slate-800">Threads</p>
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <Wand2 className="h-3.5 w-3.5 text-slate-600" />
                        <span className="text-xs font-medium">Auto-Fix media</span>
                        <span className="text-[10px] text-slate-400">Force 4:5 portrait for Threads</span>
                      </div>
                      <Controller name="threadsAutoFix" control={control}
                        render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                    </div>
                  </div>
                </div>
              )}

              {/* Pinterest */}
              {selectedPlatforms.includes('PINTEREST') && (
                <div className="rounded-xl border border-red-100 overflow-hidden">
                  <div className="bg-red-600 h-1 w-full" />
                  <div className="p-4 space-y-3">
                    <p className="text-sm font-bold text-red-700">Pinterest</p>
                    {isLoadingBoards ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Fetching boards...
                      </div>
                    ) : pinterestBoards.length > 0 ? (
                      <div className="space-y-1">
                        <Label className="text-xs">Board</Label>
                        <select className="w-full h-8 px-2 text-xs rounded-lg border bg-background" {...register('pinterestBoardId')}>
                          {pinterestBoards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                        No boards found. Create one on Pinterest first.
                      </p>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs">Destination Link</Label>
                      <Input placeholder="https://your-website.com" {...register('pinterestLink')} className="text-xs h-8" />
                    </div>
                  </div>
                </div>
              )}

              {/* Snapchat */}
              {selectedPlatforms.includes('SNAPCHAT') && (
                <div className="rounded-xl border border-yellow-200 overflow-hidden">
                  <div className="bg-yellow-400 h-1 w-full" />
                  <div className="p-4 space-y-3">
                    <p className="text-sm font-bold text-yellow-700">Snapchat</p>
                    <div className="flex gap-2">
                      {['STORY', 'SPOTLIGHT'].map(t => (
                        <button key={t} type="button"
                          onClick={() => setValue('snapchatPostType', t as any)}
                          className={cn('flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all',
                            watch('snapchatPostType') === t ? 'bg-yellow-400 text-black border-yellow-400' : 'border-slate-200 text-slate-600 hover:border-yellow-300'
                          )}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {watch('snapchatPostType') === 'SPOTLIGHT'
                        ? 'Shared with the public community.'
                        : 'Visible to followers for 24 hours.'}
                    </p>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        )}

                  {/* YouTube SEO Preview (High Fidelity & Format-Aware) */}
        {selectedPlatforms?.includes('YOUTUBE') && (
          <Card className="bg-slate-50 border-dashed border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase text-muted-foreground flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="h-3 w-3" />
                  YouTube Format Preview
                </div>
                {mediaFiles[0] && mediaAnalysis[0]?.metadata && (
                  <div className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-bold text-white",
                    (mediaAnalysis[0]?.metadata?.aspectRatio || 1) < 1 ? "bg-red-500" : "bg-blue-500"
                  )}>
                    {(mediaAnalysis[0]?.metadata?.aspectRatio || 1) < 1 ? 'CLASSIFIED AS SHORTS' : 'CLASSIFIED AS VIDEO'}
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mediaAnalysis[0]?.metadata && mediaAnalysis[0]?.metadata?.aspectRatio < 1 ? (
                /* Shorts Mobile View */
                <div className="flex justify-center py-2">
                  <div className="w-[180px] aspect-[9/16] bg-black rounded-2xl border-[4px] border-slate-800 relative overflow-hidden shadow-xl">
                    {mediaFiles[0] ? (
                      <img src={URL.createObjectURL(mediaFiles[0])} className="w-full h-full object-cover opacity-80" alt="Shorts" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-700">
                        <Video className="h-10 w-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-400 border border-white/50" />
                        <span className="text-[10px] font-bold text-white truncate">@your_channel</span>
                        <button className="bg-white text-black text-[8px] px-2 py-0.5 rounded-full font-bold">Subscribe</button>
                      </div>
                      <p className="text-[10px] text-white line-clamp-2 leading-tight">
                        {watch('content') || 'Your Shorts description/tags...'}
                      </p>
                    </div>
                    <div className="absolute bottom-20 right-2 flex flex-col gap-4 items-center">
                       <div className="flex flex-col items-center gap-1">
                          <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"><Heart className="h-4 w-4 text-white" /></div>
                          <span className="text-[8px] text-white">Like</span>
                       </div>
                       <div className="flex flex-col items-center gap-1">
                          <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"><MessageCircle className="h-4 w-4 text-white" /></div>
                          <span className="text-[8px] text-white">Comm</span>
                       </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Standard Search View */
                <div className="bg-white p-4 rounded-xl shadow-sm border space-y-3">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-48 aspect-video bg-slate-200 rounded-lg flex items-center justify-center relative overflow-hidden shrink-0">
                      {mediaFiles[0] ? (
                        <img src={URL.createObjectURL(mediaFiles[0])} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <Video className="text-slate-400 h-8 w-8" />
                      )}
                      <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded">5:00</div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="font-bold text-sm leading-tight line-clamp-2">
                        {watch('title') || 'Your Video Title Here'}
                      </h3>
                      <div className="text-[10px] text-slate-500 flex gap-1">
                        <span>0 views</span>
                        <span>•</span>
                        <span>Just now</span>
                      </div>
                      <div className="flex items-center gap-1 py-1">
                        <div className="w-4 h-4 rounded-full bg-slate-300" />
                        <span className="text-[10px] font-medium text-slate-600">Your Channel</span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                        {watch('content') || 'Provide a compelling description...'}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {watch('youtubeTags')?.split(',').slice(0, 3).map((t, i) => (
                          <span key={i} className="text-[9px] text-blue-600 bg-blue-50 px-1 rounded">#{t.trim()}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-[10px] text-center text-muted-foreground mt-3 italic">
                {(mediaAnalysis[0]?.metadata?.aspectRatio || 1) < 1 
                  ? "Shorts are automatically discovered by users in the mobile feed. No special SEO required beyond tags!" 
                  : "Standard videos rely heavily on the first 100 characters of the title for search ranking."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Media Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Media</CardTitle>
            <CardDescription>Images and Videos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={cn(
                'border-2 border-dashed rounded-lg p-10 text-center cursor-pointer',
                isDragging ? 'border-primary bg-primary/5' : 'border-border'
              )}
              onClick={() => document.getElementById('media-upload')?.click()}
            >
              <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <p>Click or drag to upload</p>
              <input id="media-upload" type="file" multiple hidden onChange={handleFileSelect} />
            </div>

            {mediaFiles.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {mediaFiles.map((file, idx) => {
                  const analysis = mediaAnalysis[idx];
                  return (
                    <div key={idx} className="relative group border rounded-lg overflow-hidden">
                       <div className="aspect-square bg-muted flex items-center justify-center">
                          {file.type.startsWith('video/') ? <Video /> : <img src={URL.createObjectURL(file)} className="object-cover w-full h-full" alt="" />}
                       </div>
                       <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeMedia(idx); }}
                        className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                       >
                        <X className="h-3 w-3" />
                       </button>
                       
                       <div className="p-2 space-y-1">
                         <div className="flex flex-wrap gap-1">
                            {selectedPlatforms?.map(p => {
                              const val = analysis?.platformValidations[p];
                              const fixed = (p === 'FACEBOOK' && fbAutoFix) || (p === 'INSTAGRAM' && igAutoFix) || (p === 'THREADS' && watch('threadsAutoFix'));
                              if (!val) return null;
                              return (
                                <div key={p} className={cn(
                                  "px-1 py-0.5 rounded text-[8px] font-bold uppercase flex items-center gap-1",
                                  val.valid || fixed ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                )}>
                                  {p.slice(0, 2)}
                                  {fixed && <Wand2 className="h-2 w-2" />}
                                </div>
                              );
                            })}
                         </div>
                       </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

         {/* Final Re-Design of Scheduler */}
        <Card className="border-2 border-primary/5 shadow-2xl rounded-3xl overflow-hidden bg-white dark:bg-slate-950">
          <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 p-2 rounded-xl">
                 <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Publishing Strategy</CardTitle>
                <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Queue Management Engine</p>
              </div>
            </div>
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              {[
                { id: 'draft', label: 'Draft', icon: FileText, active: !showScheduler && !watch('publishNow') },
                { id: 'schedule', label: 'Schedule', icon: Calendar, active: showScheduler },
                { id: 'now', label: 'Post Now', icon: Zap, active: watch('publishNow') }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (tab.id === 'draft') { setShowScheduler(false); setValue('publishNow', false); }
                    if (tab.id === 'schedule') { setShowScheduler(true); setValue('publishNow', false); }
                    if (tab.id === 'now') { setShowScheduler(false); setValue('publishNow', true); }
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                    tab.active ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  <tab.icon className="h-3 w-3" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <CardContent className="p-8">
            {!showScheduler && !watch('publishNow') && (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center border-4 border-white shadow-inner">
                  <FileText className="h-10 w-10 text-slate-300" />
                </div>
                <div className="text-center">
                  <h4 className="font-bold text-slate-800">Saved to Workspace</h4>
                  <p className="text-sm text-slate-500">Pick up right where you left off from your Drafts page.</p>
                </div>
              </div>
            )}

            {watch('publishNow') && (
              publishLog.length > 0 ? (
                /* Live log panel replaces the "Direct-to-Feed" animation */
                <div className="space-y-1">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        createPostMutation.isPending ? "bg-yellow-400 animate-pulse" :
                        publishError ? "bg-red-500" : "bg-green-500"
                      )} />
                      <span className={cn(
                        "text-xs font-bold uppercase tracking-widest",
                        createPostMutation.isPending ? "text-yellow-400" :
                        publishError ? "text-red-400" : "text-green-400"
                      )}>
                        {createPostMutation.isPending ? "Publishing..." : publishError ? "Failed" : "Done"}
                      </span>
                    </div>
                    <button type="button" onClick={() => { setPublishLog([]); setPublishError(null); }} className="text-slate-500 hover:text-slate-300 text-xs">
                      x clear
                    </button>
                  </div>
                  <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs space-y-1 max-h-60 overflow-y-auto border border-slate-800">
                    {publishLog.map((entry, i) => (
                      <div key={i} className={cn(
                        "flex gap-2",
                        entry.level === 'error' ? "text-red-400" :
                        entry.level === 'success' ? "text-green-400" :
                        entry.level === 'warn' ? "text-yellow-400" : "text-slate-400"
                      )}>
                        <span className="text-slate-600 shrink-0">{entry.ts}</span>
                        <span className="break-all">{entry.msg}</span>
                      </div>
                    ))}
                    {createPostMutation.isPending && (
                      <div className="flex items-center gap-2 text-slate-500 animate-pulse">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Processing...</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                  <div className="w-20 h-20 rounded-full bg-yellow-50 flex items-center justify-center border-4 border-white shadow-inner animate-bounce">
                    <Zap className="h-10 w-10 text-yellow-500" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-bold text-slate-800">Direct-to-Feed</h4>
                    <p className="text-sm text-slate-500">Synchronized publishing to all selected platforms instantly.</p>
                  </div>
                </div>
              )
            )}

            {showScheduler && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-4 space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Quick Slots</Label>
                    <div className="grid grid-cols-1 gap-2">
                       {quickScheduleTimes.map(t => (
                         <button
                           key={t.label}
                           type="button"
                           onClick={() => setValue('scheduledAt', t.value())}
                           className="flex items-center justify-between p-3 rounded-2xl border-2 border-slate-50 bg-slate-50/30 hover:bg-white hover:border-primary/20 hover:shadow-md transition-all group"
                         >
                           <div className="flex items-center gap-3">
                             <div className="bg-white p-2 rounded-lg shadow-sm group-hover:bg-primary/5">
                               <t.icon className="h-4 w-4 text-slate-400 group-hover:text-primary" />
                             </div>
                             <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900">{t.label}</span>
                           </div>
                           <ChevronRight className="h-4 w-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="space-y-4 p-5 rounded-3xl bg-primary/5 border border-primary/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Clock className="h-20 w-20 text-primary" />
                    </div>
                    <div>
                      <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Live Preview</Label>
                      <h4 className="text-2xl font-black text-slate-900 mt-1">
                        {scheduledAt ? format(scheduledAt, 'p') : '--:--'}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {scheduledAt ? format(scheduledAt, 'EEEE, MMM do') : 'Select Date'}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-2">
                       <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                       <span className="text-[11px] font-bold text-green-600 uppercase">
                         {getTimePreview()}
                       </span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-8 flex flex-col md:flex-row gap-8">
                  <div className="bg-slate-50/50 p-4 lg:p-6 rounded-[2.5rem] border border-slate-100 shadow-inner overflow-visible flex-1 flex justify-center backdrop-blur-sm">
                    <DayPicker
                      mode="single"
                      selected={scheduledAt}
                      onSelect={d => {
                        if (!d) return;
                        const current = scheduledAt || new Date();
                        d.setHours(current.getHours(), current.getMinutes());
                        setValue('scheduledAt', d);
                      }}
                      classNames={{
                        day_selected: "bg-primary text-white !rounded-xl font-bold shadow-xl shadow-primary/30 scale-105",
                        day_today: "text-primary font-black scale-105",
                        day: "h-9 w-9 lg:h-10 lg:w-10 text-center text-xs lg:text-sm p-0 font-bold text-slate-600 hover:bg-white hover:shadow-lg hover:text-primary rounded-xl transition-all duration-300",
                        caption: "flex justify-between items-center py-4 px-1 font-black text-slate-400 uppercase tracking-widest text-[9px]",
                        head_cell: "text-slate-200 font-bold text-[9px] uppercase w-9 lg:w-10 pb-4",
                        table: "w-full border-collapse",
                        tbody: "space-y-1",
                        nav: "flex items-center gap-1.5",
                        nav_button: "p-1.5 hover:bg-white hover:shadow-md rounded-lg transition-all text-slate-300 hover:text-primary",
                      }}
                    />
                  </div>

                  <div className="w-full lg:w-80 space-y-8 flex-shrink-0">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center block">Precision Time</Label>
                      <div className="relative group">
                        <Input
                          type="time"
                          className="h-24 text-4xl lg:text-5xl font-black text-center rounded-[2rem] border-2 border-slate-50 focus-visible:ring-primary focus-visible:border-primary transition-all shadow-sm group-hover:shadow-2xl group-hover:scale-105 bg-white whitespace-nowrap"
                          value={scheduledAt ? format(scheduledAt, 'HH:mm') : ''}
                          onChange={e => {
                            const [h, m] = e.target.value.split(':');
                            const d = new Date(scheduledAt || new Date());
                            d.setHours(parseInt(h), parseInt(m));
                            setValue('scheduledAt', d);
                          }}
                        />
                        <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none opacity-5 group-hover:opacity-20 transition-opacity">
                           <Clock className="h-8 w-8 text-primary" />
                        </div>
                      </div>
                    </div>

                    <div className="text-center space-y-2">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Local Timezone</p>
                      <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-100/50 py-2 rounded-2xl px-4 border border-slate-100">
                        <MapPin className="h-3 w-3" />
                        {Intl.DateTimeFormat().resolvedOptions().timeZone}
                      </div>
                    </div>
                    
                    <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
                      <p className="text-[10px] text-yellow-800 font-medium leading-tight">
                        💡 <strong>Pro Tip:</strong> Meta posts perform best at 6:00 PM on weekdays in your local timezone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <div className="px-8 py-6 bg-slate-50 border-t flex items-center justify-between">
            <div className="hidden md:block">
              {scheduledAt && showScheduler && (
                <p className="text-xs text-slate-500">
                  Target: <strong className="text-slate-800">{format(scheduledAt, 'MMMM do, yyyy @ p')}</strong>
                </p>
              )}
            </div>
            <div className="flex gap-3 w-full md:w-auto">
               <Button type="button" variant="outline" className="flex-1 md:flex-none" onClick={() => router.back()}>Cancel</Button>
               <Button 
                size="lg" 
                className="flex-1 md:flex-none px-10 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 font-bold"
                disabled={createPostMutation.isPending}
               >
                 {createPostMutation.isPending ? (
                   <Loader2 className="h-4 w-4 animate-spin mr-2" />
                 ) : watch('publishNow') ? (
                   <Zap className="h-4 w-4 mr-2" />
                 ) : showScheduler ? (
                   <Calendar className="h-4 w-4 mr-2" />
                 ) : (
                   <FileText className="h-4 w-4 mr-2" />
                 )}
                 {watch('publishNow') ? 'Publish' : showScheduler ? 'Schedule' : 'Save Draft'}
               </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}