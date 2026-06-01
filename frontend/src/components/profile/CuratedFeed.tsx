'use client';

import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Image as ImageIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface CuratedPost {
  id: string;
  externalPostId: string;
  platform: string;
  content: string | null;
  mediaUrls: string[];
  metrics: any;
  publishedAt: string;
}

export function CuratedFeed({ userId, platform }: { userId: string, platform?: string }) {
  const [posts, setPosts] = useState<CuratedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const response = await api.curation.getPublicFeed(userId, platform);
        setPosts(response.posts || []);
      } catch (error) {
        console.error('Failed to load curated feed', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeed();
  }, [userId, platform]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center dark:border-slate-700 dark:bg-slate-800/50">
        <p className="text-slate-500 dark:text-slate-400">No curated posts available.</p>
      </div>
    );
  }

  const formatInstagramTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 24) return `${diffHours} HOURS AGO`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} DAYS AGO`;
    return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' }).toUpperCase();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {posts.map(post => {
          if (post.platform === 'INSTAGRAM') {
            return (
              <div key={post.id} className="mx-auto w-full max-w-md overflow-hidden rounded-sm border border-slate-200 bg-white sm:rounded-lg">
                {/* Header */}
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-fuchsia-600 p-[2px]">
                      <div className="h-full w-full rounded-full border-2 border-white bg-slate-200">
                         {/* Avatar Placeholder */}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">anysocial_user</span>
                  </div>
                  <MoreHorizontal className="h-5 w-5 cursor-pointer text-slate-900" />
                </div>

                {/* Media */}
                <div className="relative flex aspect-square w-full items-center justify-center bg-black">
                  {post.mediaUrls && post.mediaUrls.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={post.mediaUrls[0]} 
                      alt="Instagram post" 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                      <ImageIcon className="mb-2 h-8 w-8 opacity-50" />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-3 pb-2">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Heart className="h-6 w-6 cursor-pointer text-slate-900 transition-colors hover:text-slate-600" strokeWidth={1.5} />
                      <MessageCircle className="h-6 w-6 cursor-pointer text-slate-900 transition-colors hover:text-slate-600" strokeWidth={1.5} />
                      <Send className="h-6 w-6 cursor-pointer text-slate-900 transition-colors hover:text-slate-600" strokeWidth={1.5} />
                    </div>
                    <Bookmark className="h-6 w-6 cursor-pointer text-slate-900 transition-colors hover:text-slate-600" strokeWidth={1.5} />
                  </div>

                  <div className="mb-1 text-sm font-semibold text-slate-900">
                    {post.metrics?.likes?.toLocaleString() || 0} likes
                  </div>

                  <div className="text-sm text-slate-900">
                    <span className="mr-1 font-semibold">anysocial_user</span>
                    {post.content}
                  </div>
                  
                  {post.metrics?.comments > 0 && (
                    <div className="mt-1 cursor-pointer text-sm text-slate-500">
                      View all {post.metrics.comments.toLocaleString()} comments
                    </div>
                  )}

                  <div className="mt-2 text-[10px] text-slate-500">
                    {formatInstagramTime(post.publishedAt)}
                  </div>
                </div>
              </div>
            );
          }

          // Default fallback for other platforms (e.g., LinkedIn)
          return (
            <div key={post.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
              <div className="relative flex h-48 items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-900">
                {post.mediaUrls && post.mediaUrls.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={post.mediaUrls[0]} 
                    alt="Post media" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center text-slate-400">
                    <ImageIcon className="mb-2 h-8 w-8 opacity-50" />
                    <span className="text-xs font-medium uppercase tracking-wider">Text Post</span>
                  </div>
                )}
                <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                  {post.platform}
                </div>
              </div>
              
              <div className="p-4">
                <p className="mb-4 line-clamp-3 text-sm text-slate-700 dark:text-slate-300">
                  {post.content || 'No description provided.'}
                </p>
                
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5" />
                      {post.metrics?.likes || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {post.metrics?.comments || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
