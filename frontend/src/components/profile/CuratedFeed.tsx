'use client';

import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, Image as ImageIcon } from 'lucide-react';
import api from '@/lib/api';

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
        const url = platform 
          ? `/api/curation/public/${userId}?platform=${platform}` 
          : `/api/curation/public/${userId}`;
        const response = await api.get(url);
        setPosts(response.data.posts || []);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
        <p className="text-slate-500 dark:text-slate-400">No curated posts available.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {posts.map(post => (
        <div key={post.id} className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
          <div className="h-48 bg-slate-100 dark:bg-slate-900 flex items-center justify-center relative overflow-hidden">
            {post.mediaUrls && post.mediaUrls.length > 0 ? (
              <img 
                src={post.mediaUrls[0]} 
                alt="Post media" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center text-slate-400">
                <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs uppercase tracking-wider font-medium">Text Post</span>
              </div>
            )}
            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded">
              {post.platform}
            </div>
          </div>
          
          <div className="p-4">
            <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3 mb-4">
              {post.content || 'No description provided.'}
            </p>
            
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5" />
                  {post.metrics?.likes || 0}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5" />
                  {post.metrics?.comments || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
