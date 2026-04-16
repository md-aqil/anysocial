'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn, formatDateTime, getPlatformColor } from '@/lib/utils';
import { Plus, Link2, FileText, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const statusIcons = {
  CONNECTED: CheckCircle,
  EXPIRED: Clock,
  REVOKED: XCircle,
  ERROR: XCircle,
};

const statusColors = {
  CONNECTED: 'text-green-500',
  EXPIRED: 'text-yellow-500',
  REVOKED: 'text-gray-500',
  ERROR: 'text-red-500',
};

export default function DashboardPage() {
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.oauth.getAccounts(),
  });

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: () => api.posts.list({ limit: 5 }),
  });

  const accounts = accountsData?.accounts || [];
  const posts = postsData?.posts || [];

  const upcomingPosts = posts.filter(
    (p) => p.status === 'QUEUED' || p.status === 'PROCESSING'
  );
  const recentPosts = posts.filter((p) => p.status !== 'DRAFT').slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Manage your social media accounts and posts</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected Accounts</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground">
              {accounts.filter((a) => a.status === 'CONNECTED').length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Posts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingPosts.length}</div>
            <p className="text-xs text-muted-foreground">waiting to publish</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{posts.length}</div>
            <p className="text-xs text-muted-foreground">all time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Connected Accounts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Connected Accounts</CardTitle>
              <CardDescription>Your linked social media platforms</CardDescription>
            </div>
            <Link href="/dashboard/social-accounts">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {accountsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No accounts connected</p>
                <Link href="/dashboard/social-accounts">
                  <Button variant="link" size="sm">
                    Connect your first account
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map((account) => {
                  const StatusIcon = statusIcons[account.status as keyof typeof statusIcons] || XCircle;
                  return (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'h-10 w-10 rounded-lg flex items-center justify-center text-white text-sm font-bold',
                            getPlatformColor(account.platform)
                          )}
                        >
                          {account.platform.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium">{account.platform}</p>
                          <p className="text-xs text-muted-foreground">
                            Connected {formatDateTime(account.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className={cn('flex items-center gap-1', statusColors[account.status as keyof typeof statusColors])}>
                        <StatusIcon className="h-4 w-4" />
                        <span className="text-xs font-medium">{account.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Posts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Posts</CardTitle>
              <CardDescription>Your latest published and scheduled posts</CardDescription>
            </div>
            <Link href="/dashboard/posts">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {postsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentPosts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No posts yet</p>
                <Link href="/dashboard/posts/new">
                  <Button variant="link" size="sm">
                    Create your first post
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {post.title || post.rawContent.slice(0, 50)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
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
                        {post.scheduledAt && (
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(post.scheduledAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={cn(
                        'px-2 py-1 rounded text-xs font-medium',
                        post.status === 'PUBLISHED' && 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                        post.status === 'QUEUED' && 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                        post.status === 'PROCESSING' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
                        post.status === 'FAILED' && 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
                        post.status === 'DRAFT' && 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      )}
                    >
                      {post.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}