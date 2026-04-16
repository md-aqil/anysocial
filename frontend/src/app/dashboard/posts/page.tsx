'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn, formatDateTime, getPlatformColor } from '@/lib/utils';
import { Loader2, Plus, Calendar, List, Trash2, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';

type ViewMode = 'list' | 'calendar';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  QUEUED: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  PROCESSING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  PARTIALLY_FAILED: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export default function PostsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['posts', statusFilter],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      return api.posts.list(params);
    },
    refetchInterval: (query) => {
      // Auto-poll every 3 seconds if any posts are stuck in transient states
      const hasPendingPosts = query.state.data?.posts?.some(
        (p) => p.status === 'QUEUED' || p.status === 'PROCESSING'
      );
      return hasPendingPosts ? 3000 : false; // false shuts down the polling
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.posts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const posts = data?.posts || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Posts</h1>
          <p className="text-muted-foreground">Manage your scheduled and published posts</p>
        </div>
        <Link href="/dashboard/posts/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Post
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('calendar')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </Button>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="all">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="QUEUED">Queued</option>
          <option value="PROCESSING">Processing</option>
          <option value="PUBLISHED">Published</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {/* Posts List */}
      {viewMode === 'list' && (
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No posts found</p>
                <Link href="/dashboard/posts/new">
                  <Button variant="link" size="sm">
                    Create your first post
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">
                          {post.title || post.rawContent.slice(0, 50)}
                        </p>
                        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', statusColors[post.status])}>
                          {post.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex gap-1">
                          {post.platforms.map((platform) => (
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
                        {post.scheduledAt && (
                          <span>• {formatDateTime(post.scheduledAt)}</span>
                        )}
                        {post.status === 'FAILED' && post.retryCount > 0 && (
                          <span>• {post.retryCount} retries</span>
                        )}
                      </div>
                      {post.mediaUrls.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {post.mediaUrls.length} media attachment(s)
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {post.status === 'DRAFT' && (
                        <Link href={`/dashboard/posts/new?id=${post.id}`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this post?')) {
                            deleteMutation.mutate(post.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <Card>
          <CardHeader>
            <CardTitle>Calendar View</CardTitle>
            <CardDescription>Visualize your scheduled posts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Calendar view coming soon</p>
              <p className="text-sm">Switch to list view to see all posts</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}