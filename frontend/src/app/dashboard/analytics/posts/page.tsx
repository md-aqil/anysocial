'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn, getPlatformColor, formatDateTime } from '@/lib/utils';
import { Loader2, ArrowUpDown } from 'lucide-react';

type SortKey = 'publishedAt' | 'likes' | 'comments' | 'shares' | 'reach' | 'engagementRate';
type SortOrder = 'asc' | 'desc';

export default function AnalyticsPostsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-posts'],
    queryFn: () => api.analytics.getPosts(),
  });

  const posts = data?.posts || [];
  const [sortKey, setSortKey] = useState<SortKey>('publishedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const sortedPosts = [...posts].sort((a, b) => {
    const aVal = a[sortKey] ?? 0;
    const bVal = b[sortKey] ?? 0;
    return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Post Analytics</h1>
        <p className="text-muted-foreground">Detailed metrics for your posts</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No posts with analytics yet</p>
              <p className="text-sm">Publish some posts to see analytics</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Post</th>
                    <th className="text-left py-3 px-4 font-medium">Platforms</th>
                    <th 
                      className="text-left py-3 px-4 font-medium cursor-pointer hover:text-primary"
                      onClick={() => handleSort('publishedAt')}
                    >
                      <div className="flex items-center gap-1">
                        Published
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th 
                      className="text-right py-3 px-4 font-medium cursor-pointer hover:text-primary"
                      onClick={() => handleSort('likes')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Likes
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th 
                      className="text-right py-3 px-4 font-medium cursor-pointer hover:text-primary"
                      onClick={() => handleSort('comments')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Comments
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th 
                      className="text-right py-3 px-4 font-medium cursor-pointer hover:text-primary"
                      onClick={() => handleSort('shares')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Shares
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th 
                      className="text-right py-3 px-4 font-medium cursor-pointer hover:text-primary"
                      onClick={() => handleSort('reach')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Reach
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th 
                      className="text-right py-3 px-4 font-medium cursor-pointer hover:text-primary"
                      onClick={() => handleSort('engagementRate')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Eng. Rate
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPosts.map((post) => (
                    <tr key={post.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="max-w-[200px] truncate">
                          {post.title || post.rawContent?.slice(0, 30) || 'Untitled'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          {post.platforms?.map((platform: string) => (
                            <span
                              key={platform}
                              className={cn(
                                'px-2 py-0.5 rounded text-xs font-medium text-white',
                                getPlatformColor(platform)
                              )}
                            >
                              {platform.slice(0, 3)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {post.publishedAt ? formatDateTime(post.publishedAt) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">{post.likes || 0}</td>
                      <td className="py-3 px-4 text-right">{post.comments || 0}</td>
                      <td className="py-3 px-4 text-right">{post.shares || 0}</td>
                      <td className="py-3 px-4 text-right">{(post.reach || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-medium">
                        {(post.engagementRate || 0).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}