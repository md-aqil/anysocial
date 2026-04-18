'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn, getPlatformColor } from '@/lib/utils';
import { Loader2, TrendingUp, Users, FileText, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function AnalyticsPage() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => api.analytics.getSummary(7),
  });

  const { data: postsData } = useQuery({
    queryKey: ['analytics-posts'],
    queryFn: () => api.analytics.getPosts(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const posts = postsData?.posts || [];

  const entries = summary?.platformBreakdown ? Object.entries(summary.platformBreakdown) : [];
  const topPlatform = entries.length > 0
    ? entries.reduce((a, b) => 
        ((a[1] as any).engagementRate || 0) > ((b[1] as any).engagementRate || 0) ? a : b
      )[0]
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Track your social media performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalPosts || 0}</div>
            <p className="text-xs text-muted-foreground">
              {summary?.publishedPosts || 0} published
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.totalPosts 
                ? Math.round((summary.publishedPosts / summary.totalPosts) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.failedPosts || 0} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(summary?.engagementRate || 0).toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.totalLikes || 0} likes, {summary?.totalComments || 0} comments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(summary?.totalReach || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Top: {topPlatform || 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Breakdown */}
      {summary?.platformBreakdown && Object.keys(summary.platformBreakdown).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Platform Breakdown</CardTitle>
            <CardDescription>Performance by platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(summary.platformBreakdown).map(([platform, metrics]: [string, any]) => (
                <div key={platform} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold',
                        getPlatformColor(platform)
                      )}
                    >
                      {platform.slice(0, 2)}
                    </div>
                    <span className="font-medium">{platform}</span>
                  </div>
                  <div className="flex items-center gap-8 text-sm text-muted-foreground">
                    <span>{metrics.likes} likes</span>
                    <span>{metrics.comments} comments</span>
                    <span>{metrics.shares} shares</span>
                    <span>{metrics.reach.toLocaleString()} reach</span>
                    <span className="font-medium text-foreground">
                      {metrics.engagementRate.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/dashboard/analytics/posts">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Post Analytics</CardTitle>
              <CardDescription>View detailed metrics for each post</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/analytics/export">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Export Report</CardTitle>
              <CardDescription>Download analytics in CSV, JSON, or PDF</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}