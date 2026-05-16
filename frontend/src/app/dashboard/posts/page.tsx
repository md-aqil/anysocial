'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format, isAfter, isBefore, addHours } from 'date-fns';
import {
  Loader2, Plus, Trash2, Edit, Clock, CheckCircle2,
  AlertCircle, FileText, Video, RefreshCw, ChevronDown, 
  ChevronUp, Zap, Send, Calendar, XCircle, MoreVertical,
  ExternalLink, ArrowUpRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PLATFORM_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  FACEBOOK:  { label: 'Facebook',  color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  INSTAGRAM: { label: 'Instagram', color: 'text-pink-600',   bg: 'bg-pink-50',   border: 'border-pink-200' },
  TWITTER:   { label: 'Twitter/X', color: 'text-sky-600',    bg: 'bg-sky-50',    border: 'border-sky-200' },
  LINKEDIN:  { label: 'LinkedIn',  color: 'text-blue-800',   bg: 'bg-blue-100',  border: 'border-blue-300' },
  YOUTUBE:   { label: 'YouTube',   color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
  THREADS:   { label: 'Threads',   color: 'text-slate-700',  bg: 'bg-slate-100', border: 'border-slate-300' },
  TIKTOK:    { label: 'TikTok',    color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  PINTEREST: { label: 'Pinterest', color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' },
  SNAPCHAT:  { label: 'Snapchat',  color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
};

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  PUBLISHED:        { label: 'Published',        icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
  QUEUED:           { label: 'Scheduled',        icon: Calendar,      color: 'text-indigo-600',  bg: 'bg-indigo-50 border-indigo-100' },
  PROCESSING:       { label: 'Processing',       icon: Loader2,       color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-100' },
  DRAFT:            { label: 'Draft',            icon: FileText,      color: 'text-slate-600',   bg: 'bg-slate-50 border-slate-200' },
  FAILED:           { label: 'Failed',           icon: XCircle,       color: 'text-rose-600',    bg: 'bg-rose-50 border-rose-100' },
  PARTIALLY_FAILED: { label: 'Partial Fail',     icon: AlertCircle,   color: 'text-orange-600',  bg: 'bg-orange-50 border-orange-100' },
};

function PlatformResultBadge({ result }: { result: any }) {
  const meta = PLATFORM_META[result.platform] || { label: result.platform, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' };
  const isOk = result.status === 'PUBLISHED';
  const isFailed = result.status === 'FAILED';
  const isPending = result.status === 'QUEUED' || result.status === 'PROCESSING';

  return (
    <div className={cn(
      'flex flex-col gap-1 rounded-xl px-3 py-2 border transition-all hover:shadow-sm',
      isFailed ? 'bg-rose-50 border-rose-100' : isOk ? `${meta.bg} ${meta.border}` : 'bg-slate-50 border-slate-200'
    )}>
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-[10px] font-black uppercase tracking-tight', isFailed ? 'text-rose-700' : isOk ? meta.color : 'text-slate-500')}>
          {meta.label}
        </span>
        <div className={cn('shrink-0', isFailed ? 'text-rose-500' : isOk ? meta.color : 'text-slate-400')}>
          {isOk ? <CheckCircle2 className="h-3 w-3" /> :
           isFailed ? <XCircle className="h-3 w-3" /> :
           isPending ? <Loader2 className="h-3 w-3 animate-spin" /> :
           <Clock className="h-3 w-3" />}
        </div>
      </div>
      {result.publishedAt && (
        <p className="text-slate-400 text-[10px] font-medium">
          {format(new Date(result.publishedAt), 'MMM d, h:mm a')}
        </p>
      )}
      {result.error && (
        <p className="text-rose-500 text-[9px] leading-tight font-medium line-clamp-2">
          {result.error}
        </p>
      )}
    </div>
  );
}

function PostCard({ post, onDelete }: { post: any; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.DRAFT;
  const StatusIcon = statusCfg.icon;
  const mediaUrls: string[] = post.mediaUrls || [];
  const platformResults: any[] = Array.isArray(post.platformResults) ? post.platformResults : [];
  const publishedCount = platformResults.filter(r => r.status === 'PUBLISHED').length;
  const failedCount = platformResults.filter(r => r.status === 'FAILED').length;
  
  const isScheduled = post.status === 'QUEUED' || post.status === 'PROCESSING';
  const scheduleDate = post.scheduledAt ? new Date(post.scheduledAt) : null;
  const isUrgent = scheduleDate && isBefore(scheduleDate, addHours(new Date(), 1)) && isAfter(scheduleDate, new Date());

  return (
    <div className="group relative">
      <Card className={cn(
        "overflow-hidden border border-[#D9E3D9] bg-white transition-all duration-300",
        "hover:border-[#D27D50]/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]",
        expanded ? "ring-1 ring-[#D27D50]/20 shadow-lg shadow-[#D27D50]/5" : ""
      )}>
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row sm:items-stretch">
            {/* Media/Visual Side */}
            <div className="relative shrink-0 sm:w-48 h-48 sm:h-auto bg-stone-50 border-b sm:border-b-0 sm:border-r border-[#D9E3D9]">
              {mediaUrls.length > 0 ? (
                <div className="w-full h-full relative group/media overflow-hidden">
                  {mediaUrls[0].match(/\.(mp4|mov|webm)/i) ? (
                    <div className="w-full h-full flex items-center justify-center bg-stone-900">
                      <Video className="h-8 w-8 text-white opacity-40" />
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={mediaUrls[0]} 
                      alt="media" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/media:scale-110" 
                    />
                  )}
                  {mediaUrls.length > 1 && (
                    <div className="absolute top-2 right-2 bg-stone-900/80 backdrop-blur-md text-white text-[10px] font-black rounded-lg px-2 py-1 shadow-sm">
                      +{mediaUrls.length - 1} FILES
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#F9FAF9]">
                  <FileText className="h-10 w-10 text-stone-200" strokeWidth={1.5} />
                </div>
              )}

              {/* Status Badge Over Image */}
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                <span className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider border shadow-sm backdrop-blur-md",
                  statusCfg.bg,
                  statusCfg.color
                )}>
                  <StatusIcon className={cn('h-3 w-3', post.status === 'PROCESSING' && 'animate-spin')} />
                  {statusCfg.label}
                </span>
              </div>
            </div>

            {/* Info Side */}
            <div className="flex-1 p-5 flex flex-col min-w-0">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0">
                  {post.title ? (
                    <h3 className="text-base font-bold text-slate-900 truncate mb-1 leading-tight group-hover:text-[#D27D50] transition-colors">
                      {post.title}
                    </h3>
                  ) : (
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Untitled Content</p>
                  )}
                  <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                    {post.rawContent || <span className="italic opacity-50">No text content provided...</span>}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-[#F0F4F0] text-stone-400 hover:text-stone-600">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl border-[#D9E3D9] shadow-xl">
                      {(post.status === 'DRAFT' || post.status === 'FAILED') && (
                        <DropdownMenuItem asChild className="rounded-lg focus:bg-[#F9EEE8] focus:text-[#D27D50] cursor-pointer font-bold text-xs">
                          <Link href={`/dashboard/posts/new?id=${post.id}`}>
                            <Edit className="h-3.5 w-3.5 mr-2" /> Edit Content
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        className="rounded-lg focus:bg-rose-50 focus:text-rose-600 cursor-pointer font-bold text-xs"
                        onClick={() => { if (confirm('Delete this post permanently?')) onDelete(post.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2 text-rose-500" /> Delete Post
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Channels Row */}
              <div className="flex flex-wrap items-center gap-1.5 mb-4">
                {post.platforms?.map((p: string) => {
                  const pm = PLATFORM_META[p];
                  return (
                    <span key={p} className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-black transition-all',
                      pm ? `${pm.bg} ${pm.color} ${pm.border}` : 'bg-slate-50 text-slate-500 border-slate-200'
                    )}>
                      {pm?.label || p}
                    </span>
                  );
                })}
              </div>

              {/* Footer Meta */}
              <div className="mt-auto pt-4 border-t border-[#F2F6F2] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-[11px] font-bold text-stone-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-stone-400" />
                    {scheduleDate ? (
                      <span className={cn(isUrgent ? "text-amber-600" : "text-stone-700")}>
                        {format(scheduleDate, 'MMM d, h:mm a')}
                      </span>
                    ) : (
                      format(new Date(post.createdAt), 'MMM d, yyyy')
                    )}
                  </div>

                  {platformResults.length > 0 && (
                    <div className="flex items-center gap-3 pl-4 border-l border-[#D9E3D9]">
                      {publishedCount > 0 && (
                        <div className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{publishedCount} SUCCESS</span>
                        </div>
                      )}
                      {failedCount > 0 && (
                        <div className="flex items-center gap-1 text-rose-500">
                          <XCircle className="h-3 w-3" />
                          <span>{failedCount} FAILED</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {scheduleDate && isScheduled && (
                  <div className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-black shadow-sm",
                    isUrgent ? "bg-amber-500 text-white animate-pulse" : "bg-[#F1F5F1] text-[#3C342C]"
                  )}>
                    <Clock className="h-3 w-3" />
                    <span>GO LIVE {formatDistanceToNow(scheduleDate, { addSuffix: true }).toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expand Details for results */}
          {platformResults.length > 0 && (
            <div className="border-t border-[#F2F6F2]">
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-black text-stone-400 hover:text-[#D27D50] hover:bg-[#F9FAF9] transition-all uppercase tracking-widest"
              >
                {expanded ? (
                  <>HIDE RESULTS <ChevronUp className="h-3 w-3" /></>
                ) : (
                  <>VIEW PLATFORM PERFORMANCE <ChevronDown className="h-3 w-3" /></>
                )}
              </button>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-stone-50/50 grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3">
                      {platformResults.map((result: any) => (
                        <PlatformResultBadge key={result.platform} result={result} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PostsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['posts'],
    queryFn: () => api.posts.list(),
    refetchInterval: (query) => {
      const hasPendingPosts = query.state.data?.posts?.some(
        (p: any) => p.status === 'QUEUED' || p.status === 'PROCESSING'
      );
      return hasPendingPosts ? 5000 : false;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.posts.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  });

  const posts = data?.posts || [];

  const tabs = [
    { id: 'all',       label: 'Library',   count: posts.length },
    { id: 'scheduled', label: 'Queued',    count: posts.filter((p: any) => p.status === 'QUEUED' || p.status === 'PROCESSING').length },
    { id: 'published', label: 'Published', count: posts.filter((p: any) => p.status === 'PUBLISHED').length },
    { id: 'draft',     label: 'Drafts',    count: posts.filter((p: any) => p.status === 'DRAFT').length },
    { id: 'failed',    label: 'Errors',    count: posts.filter((p: any) => p.status === 'FAILED' || p.status === 'PARTIALLY_FAILED').length },
  ];

  const filtered = posts.filter((p: any) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'draft') return p.status === 'DRAFT';
    if (activeTab === 'scheduled') return p.status === 'QUEUED' || p.status === 'PROCESSING';
    if (activeTab === 'published') return p.status === 'PUBLISHED';
    if (activeTab === 'failed') return p.status === 'FAILED' || p.status === 'PARTIALLY_FAILED';
    return true;
  });

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D27D50] animate-pulse" />
            <span className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em]">Content Engine</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Post Management
          </h1>
          <p className="text-sm text-stone-500 mt-2 font-medium">
            Monitor and manage your multi-platform social ecosystem.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-11 w-11 rounded-2xl border-[#D9E3D9] bg-white text-stone-500 hover:bg-[#F0F4F0] hover:text-[#D27D50] transition-all"
          >
            <RefreshCw className={cn('h-5 w-5', isFetching && 'animate-spin')} strokeWidth={2.5} />
          </Button>
          <Link href="/dashboard/posts/new">
            <Button className="h-11 rounded-2xl bg-[#D27D50] px-6 font-black text-white shadow-xl shadow-[#D27D50]/20 hover:bg-[#C06A3D] hover:-translate-y-0.5 active:translate-y-0 transition-all">
              <Plus className="mr-2 h-5 w-5" strokeWidth={3} />
              NEW MASTERPIECE
            </Button>
          </Link>
        </div>
      </div>

      {/* Modern Stats Grid */}
      {!isLoading && posts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Published', count: posts.filter((p: any) => p.status === 'PUBLISHED').length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-100' },
            { label: 'Scheduled', count: posts.filter((p: any) => p.status === 'QUEUED' || p.status === 'PROCESSING').length, icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50/50', border: 'border-indigo-100' },
            { label: 'Drafts', count: posts.filter((p: any) => p.status === 'DRAFT').length, icon: FileText, color: 'text-stone-600', bg: 'bg-stone-50/50', border: 'border-stone-200' },
            { label: 'Failed', count: posts.filter((p: any) => p.status === 'FAILED' || p.status === 'PARTIALLY_FAILED').length, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50/50', border: 'border-rose-100' },
          ].map((stat) => (
            <div key={stat.label} className={cn(
              "relative overflow-hidden rounded-3xl border p-6 transition-all hover:scale-[1.02]",
              stat.bg, stat.border
            )}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 mb-1">{stat.label}</p>
                  <p className={cn("text-3xl font-black", stat.color)}>{stat.count}</p>
                </div>
                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center bg-white shadow-sm", stat.color)}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Refined Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white/50 backdrop-blur-md p-2 rounded-[28px] border border-[#D9E3D9]">
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black transition-all uppercase tracking-wider',
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                  : 'text-stone-500 hover:bg-[#F0F4F0] hover:text-stone-700'
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={cn(
                  'flex h-5 min-w-[20px] items-center justify-center rounded-lg px-1.5 text-[10px] font-black',
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="min-h-[500px]">
        {isLoading ? (
          <div className="flex h-[400px] flex-col items-center justify-center rounded-[40px] bg-white border border-[#D9E3D9]">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 rounded-full border-4 border-[#D27D50]/10" />
              <div className="absolute inset-0 rounded-full border-4 border-[#D27D50] border-t-transparent animate-spin" />
            </div>
            <p className="mt-6 text-sm font-black text-stone-400 uppercase tracking-[0.2em]">Synchronizing Content...</p>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex h-[500px] flex-col items-center justify-center rounded-[40px] bg-white border border-[#D9E3D9] text-center p-8"
          >
            <div className="relative mb-8">
              <div className="h-24 w-24 rounded-[32px] bg-[#F2F6F2] flex items-center justify-center text-stone-300">
                <Send className="h-12 w-12" strokeWidth={1.5} />
              </div>
              <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl bg-[#D27D50] flex items-center justify-center text-white shadow-lg">
                <Plus className="h-6 w-6" strokeWidth={3} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3">Your Stage is Empty</h3>
            <p className="mx-auto max-w-[320px] text-sm text-stone-500 font-medium leading-relaxed mb-10">
              {activeTab === 'all'
                ? "Every big brand started with one post. Ready to broadcast your first message to the world?"
                : `No content found in the ${activeTab} section. Try adjusting your filters or creating new content.`}
            </p>
            {activeTab === 'all' && (
              <Link href="/dashboard/posts/new">
                <Button className="rounded-2xl bg-slate-900 h-14 px-10 font-black text-white shadow-2xl shadow-slate-900/20 hover:bg-slate-800 transition-all hover:-translate-y-1">
                  START CREATING
                </Button>
              </Link>
            )}
          </motion.div>
        ) : (
          <div className="grid gap-6">
            <AnimatePresence mode="popLayout">
              {filtered.map((post: any, idx: number) => (
                <motion.div
                  key={post.id}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ 
                    duration: 0.5, 
                    delay: idx * 0.05,
                    ease: [0.21, 1.11, 0.81, 0.99]
                  }}
                >
                  <PostCard
                    post={post}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Floating Refresh (Mobile) */}
      <div className="sm:hidden fixed bottom-6 right-6 z-50">
        <Button 
          size="icon" 
          onClick={() => refetch()} 
          className="h-14 w-14 rounded-full bg-[#D27D50] text-white shadow-2xl"
        >
          <RefreshCw className={cn('h-6 w-6', isFetching && 'animate-spin')} />
        </Button>
      </div>
    </div>
  );
}