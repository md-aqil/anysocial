'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, TrendingUp, Bookmark, Trash2, RefreshCw, Plus, ExternalLink } from 'lucide-react';

interface Trend {
  id: string;
  title: string;
  description: string;
  category: string;
  source: string;
  tags: string;
  engagement: number;
  score: number;
  isSaved: boolean;
  createdAt: string;
}

interface TrendStats {
  total: number;
  byCategory: Record<string, number>;
  bySource: Record<string, number>;
  recentCount: number;
  savedCount: number;
  avgScore: number;
}

export default function TrendsPage() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [stats, setStats] = useState<TrendStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [trendsRes, statsRes] = await Promise.all([
        api.autonomous.getTrends(),
        api.autonomous.getTrendStats()
      ]);
      setTrends(trendsRes.trends || []);
      setStats(statsRes.stats || null);
    } catch (err) {
      console.error('Failed to load trends:', err);
    } finally {
      setLoading(false);
    }
  };

  const scanTrends = async () => {
    setScanning(true);
    try {
      await api.autonomous.scanTrends({
        categories: filterCategory !== 'all' ? [filterCategory] : [],
        platforms: filterSource !== 'all' ? [filterSource] : []
      });
      await loadData();
    } catch (err) {
      console.error('Scan failed:', err);
    } finally {
      setScanning(false);
    }
  };

  const toggleSave = async (trendId: string) => {
    try {
      await api.autonomous.toggleTrendSave(trendId);
      setTrends(prev => prev.map(t =>
        t.id === trendId ? { ...t, isSaved: !t.isSaved } : t
      ));
    } catch (err) {
      console.error('Toggle save failed:', err);
    }
  };

  const deleteTrend = async (trendId: string) => {
    try {
      await api.autonomous.deleteTrend(trendId);
      setTrends(prev => prev.filter(t => t.id !== trendId));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      TWITTER: 'bg-blue-100 text-blue-800',
      INSTAGRAM: 'bg-pink-100 text-pink-800',
      TIKTOK: 'bg-purple-100 text-purple-800',
      REDDIT: 'bg-orange-100 text-orange-800'
    };
    return colors[source] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trend Discovery</h1>
          <p className="text-muted-foreground">Monitor and discover trending topics across platforms</p>
        </div>
        <Button onClick={scanTrends} disabled={scanning}>
          {scanning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Scan Trends
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.savedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Recent (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats.avgScore * 100).toFixed(0)}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="FASHION">Fashion</SelectItem>
            <SelectItem value="BEAUTY">Beauty</SelectItem>
            <SelectItem value="LIFESTYLE">Lifestyle</SelectItem>
            <SelectItem value="TECH">Tech</SelectItem>
            <SelectItem value="FOOD">Food</SelectItem>
            <SelectItem value="TRAVEL">Travel</SelectItem>
            <SelectItem value="FITNESS">Fitness</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="TWITTER">Twitter</SelectItem>
            <SelectItem value="INSTAGRAM">Instagram</SelectItem>
            <SelectItem value="TIKTOK">TikTok</SelectItem>
            <SelectItem value="REDDIT">Reddit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Trends ({trends.length})</TabsTrigger>
          <TabsTrigger value="saved">Saved ({trends.filter(t => t.isSaved).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {trends.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No trends discovered yet</p>
                <p className="text-sm text-muted-foreground">Click &quot;Scan Trends&quot; to discover trending topics</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trends.map(trend => (
                <TrendCard key={trend.id} trend={trend} onSave={toggleSave} onDelete={deleteTrend} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="space-y-4">
          {trends.filter(t => t.isSaved).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bookmark className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No saved trends yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trends.filter(t => t.isSaved).map(trend => (
                <TrendCard key={trend.id} trend={trend} onSave={toggleSave} onDelete={deleteTrend} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TrendCard({ trend, onSave, onDelete }: { trend: Trend; onSave: (id: string) => void; onDelete: (id: string) => void }) {
  const tags = (() => {
    try { return JSON.parse(trend.tags || '[]'); } catch { return []; }
  })();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{trend.title}</CardTitle>
            <div className="flex gap-2">
              <Badge className={getSourceColor(trend.source)}>{trend.source}</Badge>
              <Badge variant="outline">{trend.category}</Badge>
            </div>
          </div>
          <Badge className={getScoreColor(trend.score)}>
            {Math.round(trend.score * 100)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {trend.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{trend.description}</p>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 5).map((tag: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{trend.engagement.toLocaleString()} engagements</span>
          <span>{new Date(trend.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => onSave(trend.id)}>
            <Bookmark className={`h-4 w-4 ${trend.isSaved ? 'fill-current' : ''}`} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(trend.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
          {trend.sourceUrl && (
            <Button variant="ghost" size="sm" asChild>
              <a href={trend.sourceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getSourceColor(source: string) {
  const colors: Record<string, string> = {
    TWITTER: 'bg-blue-100 text-blue-800',
    INSTAGRAM: 'bg-pink-100 text-pink-800',
    TIKTOK: 'bg-purple-100 text-purple-800',
    REDDIT: 'bg-orange-100 text-orange-800'
  };
  return colors[source] || 'bg-gray-100 text-gray-800';
}

function getScoreColor(score: number) {
  if (score >= 0.8) return 'bg-green-100 text-green-800';
  if (score >= 0.5) return 'bg-yellow-100 text-yellow-800';
  return 'bg-gray-100 text-gray-800';
}
