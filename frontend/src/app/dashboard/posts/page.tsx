'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn, getPlatformColor } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, format, isAfter } from 'date-fns';
import {
  Loader2, Plus, Trash2, Edit, Clock, CheckCircle2,
  AlertCircle, FileText, ImageIcon, Video, ExternalLink,
  RefreshCw, ChevronDown, ChevronUp, Zap, Send, Ban,
  Calendar, XCircle
} from 'lucide-react';

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

const STATUS_CONFIG: Record<string, { label: string; icon: any; pill: string }> = {
  PUBLISHED:        { label: 'Published',        icon: CheckCircle2,  pill: 'bg-green-100 text-green-700 border-green-200' },
  QUEUED:           { label: 'Queued',            icon: Clock,         pill: 'bg-blue-100 text-blue-700 border-blue-200' },
  PROCESSING:       { label: 'Processing',        icon: Loader2,       pill: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  DRAFT:            { label: 'Draft',             icon: FileText,      pill: 'bg-slate-100 text-slate-600 border-slate-200' },
  FAILED:           { label: 'Failed',            icon: XCircle,       pill: 'bg-red-100 text-red-700 border-red-200' },
  PARTIALLY_FAILED: { label: 'Partial Fail',      icon: AlertCircle,   pill: 'bg-orange-100 text-orange-700 border-orange-200' },
  SCHEDULED:        { label: 'Scheduled',         icon: Calendar,      pill: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
};

function PlatformResultBadge({ result }: { result: any }) {
  const meta = PLATFORM_META[result.platform] || { label: result.platform, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' };
  const isOk = result.status === 'PUBLISHED';
  const isFailed = result.status === 'FAILED';
  const isPending = result.status === 'QUEUED' || result.status === 'PROCESSING';

  return (
    <div className={cn(
      'flex items-start gap-2 rounded-xl px-3 py-2 border text-xs',
      isFailed ? 'bg-red-50 border-red-200' : isOk ? `${meta.bg} ${meta.border}` : 'bg-slate-50 border-slate-200'
    )}>
      <div className={cn('mt-0.5 shrink-0', isFailed ? 'text-red-500' : isOk ? meta.color : 'text-slate-400')}>
        {isOk ? <CheckCircle2 className="h-3.5 w-3.5" /> :
         isFailed ? <XCircle className="h-3.5 w-3.5" /> :
         isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
         <Clock className="h-3.5 w-3.5" />}
      </div>
      <div className="min-w-0">
        <p className={cn('font-bold leading-none', isFailed ? 'text-red-700' : isOk ? meta.color : 'text-slate-500')}>
          {meta.label}
        </p>
        {result.publishedAt && (
          <p className="text-slate-400 mt-0.5 text-[10px]">
            {format(new Date(result.publishedAt), 'MMM d, h:mm a')}
          </p>
        )}
        {result.error && (
          <p className="text-red-500 mt-1 text-[10px] leading-snug break-all">
            {result.error}
          </p>
        )}
        {result.platformPostId && (
          <p className="text-slate-400 mt-0.5 text-[10px] font-mono truncate">
            ID: {result.platformPostId}
          </p>
        )}
      </div>
    </div>
  );
}

function PostCard({ post, onDelete }: { post: any; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.DRAFT;
  const StatusIcon = statusCfg.icon;
  const hasMedia = post.mediaUrls?.length > 0 || post.media?.length > 0;
  const mediaUrls: string[] = post.mediaUrls || [];
  const platformResults: any[] = Array.isArray(post.platformResults) ? post.platformResults : [];
  const publishedCount = platformResults.filter(r => r.status === 'PUBLISHED').length;
  const failedCount = platformResults.filter(r => r.status === 'FAILED').length;
  const isScheduledFuture = post.scheduledAt && isAfter(new Date(post.scheduledAt), new Date()) && post.status === 'QUEUED';

  return (
    <Card className="overflow-hidden border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all duration-200">
      <CardContent className="p-0">
        {/* Main row */}
        <div className="flex gap-4 p-4">
          {/* Media thumbnail or icon */}
          <div className="shrink-0">
            {mediaUrls.length > 0 ? (
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                {mediaUrls[0].match(/\.(mp4|mov|webm)/i) ? (
                  <div className="w-full h-full flex items-center justify-center bg-slate-800">
                    <Video className="h-6 w-6 text-white" />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrls[0]} alt="media" className="w-full h-full object-cover" />
                )}
                {mediaUrls.length > 1 && (
                  <div className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[9px] font-bold rounded px-1">
                    +{mediaUrls.length - 1}
                  </div>
                )}
              </div>
            ) : (
              <div className={cn(
                'w-16 h-16 rounded-xl flex items-center justify-center border',
                post.status === 'PUBLISHED' ? 'bg-green-50 border-green-100 text-green-500' :
                post.status === 'FAILED' || post.status === 'PARTIALLY_FAILED' ? 'bg-red-50 border-red-100 text-red-400' :
                post.status === 'QUEUED' || post.status === 'PROCESSING' ? 'bg-blue-50 border-blue-100 text-blue-400' :
                'bg-slate-50 border-slate-100 text-slate-400'
              )}>
                <FileText className="h-6 w-6" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border',
                  statusCfg.pill
                )}>
                  <StatusIcon className={cn('h-2.5 w-2.5', post.status === 'PROCESSING' && 'animate-spin')} />
                  {statusCfg.label}
                </span>
                {post.title && (
                  <h3 className="font-semibold text-sm text-slate-900 truncate max-w-xs">
                    {post.title}
                  </h3>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {post.status === 'DRAFT' && (
                  <Link href={`/dashboard/posts/new?id=${post.id}`}>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                  </Link>
                )}
                <Button
                  variant="ghost" size="sm"
                  className="h-7 px-2 text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={() => { if (confirm('Delete this post permanently?')) onDelete(post.id); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Content preview */}
            <p className="text-sm text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
              {post.rawContent || '(No content)'}
            </p>

            {/* Meta row */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {/* Platforms */}
              <div className="flex items-center gap-1">
                {post.platforms?.map((p: string) => {
                  const pm = PLATFORM_META[p];
                  return (
                    <span key={p} className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded border',
                      pm ? `${pm.bg} ${pm.color} ${pm.border}` : 'bg-slate-50 text-slate-500 border-slate-200'
                    )}>
                      {pm?.label || p}
                    </span>
                  );
                })}
              </div>

              <span className="text-slate-300 text-xs">|</span>

              {/* Date */}
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Calendar className="h-3 w-3" />
                {post.scheduledAt
                  ? format(new Date(post.scheduledAt), 'MMM d, yyyy @ h:mm a')
                  : format(new Date(post.createdAt), 'MMM d, yyyy')}
              </div>

              {/* Countdown for scheduled */}
              {isScheduledFuture && (
                <>
                  <span className="text-slate-300 text-xs">|</span>
                  <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {formatDistanceToNow(new Date(post.scheduledAt), { addSuffix: true })}
                  </span>
                </>
              )}

              {/* Platform result summary */}
              {platformResults.length > 0 && (
                <>
                  <span className="text-slate-300 text-xs">|</span>
                  <div className="flex items-center gap-1.5 text-xs">
                    {publishedCount > 0 && (
                      <span className="text-green-600 font-medium flex items-center gap-0.5">
                        <CheckCircle2 className="h-3 w-3" />
                        {publishedCount} ok
                      </span>
                    )}
                    {failedCount > 0 && (
                      <span className="text-red-500 font-medium flex items-center gap-0.5">
                        <XCircle className="h-3 w-3" />
                        {failedCount} failed
                      </span>
                    )}
                  </div>
                </>
              )}

              {/* Created */}
              <span className="text-slate-300 text-xs">|</span>
              <span className="text-[10px] text-slate-400">
                Created {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        {/* Expand toggle — show if there are platform results */}
        {platformResults.length > 0 && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <span className="font-medium">Platform Results</span>
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {expanded && (
              <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {platformResults.map((result: any) => (
                    <PlatformResultBadge key={result.platform} result={result} />
                  ))}
                </div>
                {/* Post ID */}
                <p className="text-[10px] text-slate-400 mt-2 font-mono">Post ID: {post.id}</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
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
      return hasPendingPosts ? 4000 : false;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.posts.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  });

  const posts = data?.posts || [];

  const tabs = [
    { id: 'all',       label: 'All',       count: posts.length },
    { id: 'draft',     label: 'Drafts',    count: posts.filter((p: any) => p.status === 'DRAFT').length },
    { id: 'scheduled', label: 'Scheduled', count: posts.filter((p: any) => p.status === 'QUEUED' || p.status === 'PROCESSING').length },
    { id: 'published', label: 'Published', count: posts.filter((p: any) => p.status === 'PUBLISHED').length },
    { id: 'failed',    label: 'Failed',    count: posts.filter((p: any) => p.status === 'FAILED' || p.status === 'PARTIALLY_FAILED').length },
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Post Management</h1>
          <p className="text-sm text-muted-foreground">
            {posts.length} post{posts.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          </Button>
          <Link href="/dashboard/posts/new">
            <Button size="sm" className="h-8">
              <Plus className="h-4 w-4 mr-1.5" />
              New Post
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      {!isLoading && posts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Published',  count: posts.filter((p: any) => p.status === 'PUBLISHED').length,                                   color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
            { label: 'Scheduled',  count: posts.filter((p: any) => p.status === 'QUEUED').length,                                      color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-100' },
            { label: 'Drafts',     count: posts.filter((p: any) => p.status === 'DRAFT').length,                                       color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
            { label: 'Failed',     count: posts.filter((p: any) => p.status === 'FAILED' || p.status === 'PARTIALLY_FAILED').length,   color: 'text-red-600',   bg: 'bg-red-50 border-red-100' },
          ].map(s => (
            <div key={s.label} className={cn('rounded-xl border p-3', s.bg)}>
              <p className={cn('text-2xl font-bold', s.color)}>{s.count}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                'text-[9px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center',
                activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-300 text-slate-600'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400 mr-2" />
          <p className="text-sm text-muted-foreground">Loading posts...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-2xl text-center">
          <Send className="h-10 w-10 text-slate-200 mb-3" />
          <p className="font-semibold text-slate-500">No posts here yet</p>
          <p className="text-sm text-slate-400 mt-1">
            {activeTab === 'all'
              ? 'Create your first post to get started.'
              : `No ${activeTab} posts found.`}
          </p>
          {activeTab === 'all' && (
            <Link href="/dashboard/posts/new" className="mt-4">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" /> Create Post
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((post: any) => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}