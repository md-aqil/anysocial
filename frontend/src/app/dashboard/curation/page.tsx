'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, Image as ImageIcon, Sparkles, Filter } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FetchedPost {
  externalPostId: string;
  content: string | null;
  mediaUrls: string[];
  metrics: any;
  publishedAt: string;
}

export default function FeedCurationPage() {
  const [platform, setPlatform] = useState('LINKEDIN');
  const [posts, setPosts] = useState<FetchedPost[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPosts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.curation.getFeed(platform);
      setPosts(response.posts || []);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to fetch posts. Make sure your account is connected.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSave = async () => {
    if (selectedIds.size === 0) return;
    setIsSaving(true);
    try {
      const selectedPosts = posts.filter(p => selectedIds.has(p.externalPostId));
      await api.curation.selectPosts(platform, selectedPosts);
      alert('Selected posts saved successfully!');
      setSelectedIds(new Set()); // Reset selection after save
    } catch (err: any) {
      console.error(err);
      alert('Failed to save posts.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F9EEE8] text-[#D9774B]">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold tracking-wide text-[#D9774B] uppercase">Curation</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[#2F281F]">Curate Your Feed</h1>
          <p className="mt-2 text-lg text-[#817A73]">
            Select the best performing posts from your connected accounts to beautifully display on your public profile.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#817A73]" />
            <select 
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="h-10 cursor-pointer appearance-none rounded-xl border border-[#D9E3D9] bg-white pl-9 pr-10 text-sm font-medium text-[#3C342C] shadow-sm transition-all hover:border-[#C26032] focus:border-[#D9774B] focus:outline-none focus:ring-2 focus:ring-[#D9774B]/20"
            >
              <option value="LINKEDIN">LinkedIn</option>
              <option value="INSTAGRAM">Instagram</option>
            </select>
          </div>
          
          <Button 
            onClick={fetchPosts}
            disabled={isLoading}
            variant="outline"
            className="h-10 gap-2 rounded-xl border-[#D9E3D9] text-[#3C342C] hover:bg-[#F0F4F0] hover:text-[#2F281F]"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>

          <Button
            onClick={handleSave}
            disabled={selectedIds.size === 0 || isSaving}
            className="h-10 gap-2 rounded-xl bg-[#D9774B] px-6 text-white shadow-md shadow-[#D9774B]/20 transition-all hover:bg-[#C26032] hover:shadow-lg hover:shadow-[#D9774B]/30 disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {isSaving ? 'Saving...' : `Save ${selectedIds.size} Selected`}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 shadow-sm">
          {error}
        </div>
      )}

      {/* Main Grid */}
      {isLoading ? (
        <div className="flex h-[400px] items-center justify-center rounded-3xl border border-dashed border-[#D9E3D9] bg-white/50">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="h-8 w-8 animate-spin text-[#D9774B]" />
            <p className="text-sm font-medium text-[#817A73]">Fetching your latest content...</p>
          </div>
        </div>
      ) : posts.length === 0 && !error ? (
        <div className="flex h-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-[#D9E3D9] bg-white/50 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F0F4F0]">
            <ImageIcon className="h-8 w-8 text-[#AAA39D]" />
          </div>
          <h3 className="mb-1 text-lg font-semibold text-[#2F281F]">No posts found</h3>
          <p className="text-[#817A73]">Make sure your {platform} account is connected properly.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {posts.map((post, i) => {
            const isSelected = selectedIds.has(post.externalPostId);
            return (
              <div 
                key={post.externalPostId}
                onClick={() => toggleSelection(post.externalPostId)}
                className={cn(
                  'group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white transition-all duration-300',
                  isSelected 
                    ? 'scale-[0.98] border-2 border-[#D9774B] shadow-md ring-4 ring-[#D9774B]/10' 
                    : 'border border-[#D9E3D9] shadow-sm hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5'
                )}
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
              >
                {/* Checkbox Overlay */}
                <div className="absolute right-3 top-3 z-10 transition-transform duration-200 hover:scale-110">
                  <div className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border-2 backdrop-blur-md transition-all',
                    isSelected 
                      ? 'border-transparent bg-[#D9774B] text-white shadow-sm' 
                      : 'border-white/80 bg-black/20 text-transparent opacity-0 group-hover:opacity-100'
                  )}>
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </div>

                {/* Media Section */}
                <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-[#F0F4F0]">
                  {post.mediaUrls && post.mediaUrls.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={post.mediaUrls[0]} 
                      alt="Post media" 
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-[#AAA39D]">
                      <ImageIcon className="mb-2 h-10 w-10 opacity-40" />
                      <span className="text-[11px] font-bold uppercase tracking-widest opacity-60">Text Post</span>
                    </div>
                  )}
                  {/* Subtle Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>

                {/* Content Section */}
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="inline-flex items-center rounded-full bg-[#F9EEE8] px-2.5 py-0.5 text-[11px] font-semibold text-[#D9774B]">
                        {new Date(post.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="line-clamp-3 text-sm leading-relaxed text-[#3C342C]">
                      {post.content || 'No text content'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
