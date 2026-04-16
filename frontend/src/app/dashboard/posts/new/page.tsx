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
import { Loader2, Upload, X, Send, Calendar, FileText, Video, AlertCircle, CheckCircle2, Wand2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { DayPicker } from 'react-day-picker';

const postSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1, 'Content is required').max(5000),
  platforms: z.array(z.string()).min(1, 'Select at least one platform'),
  facebookPostType: z.enum(['FEED', 'REEL', 'STORY']).default('FEED').optional(),
  facebookAutoFix: z.boolean().default(false),
  instagramPostType: z.enum(['FEED', 'REEL', 'STORY']).default('FEED').optional(),
  instagramAutoFix: z.boolean().default(false),
  scheduledAt: z.date().optional(),
  timezone: z.string().default('America/New_York'),
  publishNow: z.boolean().default(false),
  reelTitle: z.string().optional(),
  location: z.string().optional(),
  shareToFeed: z.boolean().default(true),
});

type PostForm = z.infer<typeof postSchema>;

const platforms = [
  { id: 'FACEBOOK', name: 'Facebook', icon: '👥' },
  { id: 'INSTAGRAM', name: 'Instagram', icon: '📷' },
  { id: 'LINKEDIN', name: 'LinkedIn', icon: '💼' },
  { id: 'TWITTER', name: 'Twitter/X', icon: '🐦' },
  { id: 'TIKTOK', name: 'TikTok', icon: '🎵' },
  { id: 'YOUTUBE', name: 'YouTube', icon: '🎬' },
];

export default function NewPostPage() {
  const router = useRouter();
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [showScheduler, setShowScheduler] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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

  const createPostMutation = useMutation({
    mutationFn: async (data: PostForm) => {
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
          }
        },
        media: mediaFiles
      };
      return api.posts.create(postData as any);
    },
    onSuccess: () => {
      router.push('/dashboard/posts');
    },
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
      facebookAutoFix: false,
      instagramAutoFix: false,
      facebookPostType: 'FEED',
      instagramPostType: 'FEED'
    },
  });

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
          <CardHeader>
            <CardTitle>Select Platforms</CardTitle>
            <CardDescription>Choose where to publish</CardDescription>
          </CardHeader>
          <CardContent>
            {connectedPlatforms.length === 0 ? (
              <div className="p-8 border-2 border-dashed rounded-lg text-center">
                <p className="text-muted-foreground mb-4">No connected accounts yet.</p>
                <Button variant="outline" type="button" onClick={() => router.push('/dashboard/social-accounts')}>Connect Now</Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {platforms.filter(p => connectedPlatforms.includes(p.id)).map(platform => (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => handlePlatformToggle(platform.id)}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all flex flex-col items-center',
                      selectedPlatforms?.includes(platform.id) ? 'border-primary bg-primary/5' : 'border-dashed'
                    )}
                  >
                    <span className="text-2xl mb-2">{platform.icon}</span>
                    <span className="text-sm font-medium">{platform.name}</span>
                  </button>
                ))}
              </div>
            )}
            {errors.platforms && <p className="text-sm text-destructive mt-2">{errors.platforms.message}</p>}
          </CardContent>
        </Card>

        {/* Facebook Settings */}
        {selectedPlatforms?.includes('FACEBOOK') && (
          <Card>
            <CardHeader>
              <CardTitle>Facebook Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                {['FEED', 'REEL', 'STORY'].map(type => (
                  <Button
                    key={type}
                    type="button"
                    variant={fbType === type ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setValue('facebookPostType', type as any)}
                  >
                    {type}
                  </Button>
                ))}
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-bold">Auto-Fix for Facebook</p>
                    <p className="text-[10px] opacity-70">Will pad media to fit high-quality standard</p>
                  </div>
                </div>
                <Switch checked={fbAutoFix} onCheckedChange={(val) => setValue('facebookAutoFix', val)} />
              </div>

              {fbType === 'REEL' && (
                <div className="space-y-2">
                  <Label>Reel Title</Label>
                  <Input placeholder="Hook your audience..." {...register('reelTitle')} />
                </div>
              )}

              <div className="space-y-2">
                <Label>Location</Label>
                <Input placeholder="Where was this?" {...register('location')} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instagram Settings */}
        {selectedPlatforms?.includes('INSTAGRAM') && (
          <Card>
            <CardHeader>
              <CardTitle>Instagram Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                {['FEED', 'REEL', 'STORY'].map(type => (
                  <Button
                    key={type}
                    type="button"
                    variant={igType === type ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setValue('instagramPostType', type as any)}
                  >
                    {type}
                  </Button>
                ))}
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-pink-50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-900/30">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-pink-600" />
                  <div>
                    <p className="text-sm font-bold">Auto-Fix for Instagram</p>
                    <p className="text-[10px] opacity-70">Conform media to IG requirements</p>
                  </div>
                </div>
                <Switch checked={igAutoFix} onCheckedChange={(val) => setValue('instagramAutoFix', val)} />
              </div>

              {igType === 'REEL' && (
                <div className="flex items-center justify-between p-2 text-sm">
                   <Label>Share to Feed</Label>
                   <Switch checked={watch('shareToFeed')} onCheckedChange={(val) => setValue('shareToFeed', val)} />
                </div>
              )}
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
                              const fixed = (p === 'FACEBOOK' && fbAutoFix) || (p === 'INSTAGRAM' && igAutoFix);
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

        {/* Scheduler Overlay */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
               <Button type="button" variant={!showScheduler && !watch('publishNow') ? 'default' : 'outline'} onClick={() => { setShowScheduler(false); setValue('publishNow', false); }}>Draft</Button>
               <Button type="button" variant={showScheduler ? 'default' : 'outline'} onClick={() => setShowScheduler(true)}>Schedule</Button>
               <Button type="button" variant={watch('publishNow') ? 'default' : 'outline'} onClick={() => { setShowScheduler(false); setValue('publishNow', true); }}>Post Now</Button>
            </div>
            {showScheduler && (
               <div className="flex flex-col md:flex-row gap-4">
                  <DayPicker mode="single" selected={scheduledAt} onSelect={d => setValue('scheduledAt', d)} />
                  <Input type="time" onChange={e => {
                    const [h, m] = e.target.value.split(':');
                    const d = new Date(scheduledAt || new Date());
                    d.setHours(parseInt(h), parseInt(m));
                    setValue('scheduledAt', d);
                  }} />
               </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
           <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
           <Button type="submit" disabled={createPostMutation.isPending}>
             {createPostMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
             {showScheduler ? 'Schedule' : watch('publishNow') ? 'Publish' : 'Save Draft'}
           </Button>
        </div>
      </form>

      {createPostMutation.isPending && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-card p-8 rounded-2xl shadow-2xl flex flex-col items-center">
               <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
               <p className="font-bold">Magic in progress...</p>
               <p className="text-sm text-muted-foreground">Preparing and publishing your media.</p>
            </div>
        </div>
      )}
    </div>
  );
}