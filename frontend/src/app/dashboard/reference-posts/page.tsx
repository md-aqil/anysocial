'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, Heart, ExternalLink, Trash2, Analyze, Search } from 'lucide-react';

interface ReferencePost {
  id: string;
  title: string;
  url: string;
  platform: string;
  contentType: string;
  caption: string;
  hashtags: string;
  styleTags: string;
  mood: string;
  aesthetic: string;
  notes: string;
  isFavorite: boolean;
  createdAt: string;
}

interface ReferenceStats {
  total: number;
  byPlatform: Record<string, number>;
  favoriteCount: number;
  recentCount: number;
}

export default function ReferencePostsPage() {
  const [posts, setPosts] = useState<ReferencePost[]>([]);
  const [stats, setStats] = useState<ReferenceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '', url: '', platform: 'INSTAGRAM', contentType: 'POST',
    caption: '', mood: '', aesthetic: '', notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [postsRes, statsRes] = await Promise.all([
        api.autonomous.getReferences(),
        api.autonomous.getReferenceStats()
      ]);
      setPosts(postsRes.posts || []);
      setStats(statsRes.stats || null);
    } catch (err) {
      console.error('Failed to load references:', err);
    } finally {
      setLoading(false);
    }
  };

  const addPost = async () => {
    try {
      await api.autonomous.createReference(newPost);
      setIsAddOpen(false);
      setNewPost({ title: '', url: '', platform: 'INSTAGRAM', contentType: 'POST', caption: '', mood: '', aesthetic: '', notes: '' });
      await loadData();
    } catch (err) {
      console.error('Failed to add reference:', err);
    }
  };

  const toggleFavorite = async (postId: string) => {
    try {
      await api.autonomous.updateReference(postId, { isFavorite: !posts.find(p => p.id === postId)?.isFavorite });
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, isFavorite: !p.isFavorite } : p
      ));
    } catch (err) {
      console.error('Toggle favorite failed:', err);
    }
  };

  const deletePost = async (postId: string) => {
    try {
      await api.autonomous.deleteReference(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const analyzeStyle = async (postId: string) => {
    try {
      const result = await api.autonomous.analyzeReference(postId);
      console.log('Style analysis:', result);
    } catch (err) {
      console.error('Analysis failed:', err);
    }
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      INSTAGRAM: 'bg-pink-100 text-pink-800',
      TIKTOK: 'bg-purple-100 text-purple-800',
      TWITTER: 'bg-blue-100 text-blue-800',
      LINKEDIN: 'bg-blue-100 text-blue-800',
      PINTEREST: 'bg-red-100 text-red-800'
    };
    return colors[platform] || 'bg-gray-100 text-gray-800';
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
          <h1 className="text-2xl font-bold">Reference Posts</h1>
          <p className="text-muted-foreground">Collect and analyze inspiring posts for AI content generation</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Reference
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Reference Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Title" value={newPost.title} onChange={e => setNewPost(p => ({ ...p, title: e.target.value }))} />
              <Input placeholder="URL" value={newPost.url} onChange={e => setNewPost(p => ({ ...p, url: e.target.value }))} />
              <Select value={newPost.platform} onValueChange={val => setNewPost(p => ({ ...p, platform: val }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                  <SelectItem value="TIKTOK">TikTok</SelectItem>
                  <SelectItem value="TWITTER">Twitter</SelectItem>
                  <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                  <SelectItem value="PINTEREST">Pinterest</SelectItem>
                </SelectContent>
              </Select>
              <Select value={newPost.contentType} onValueChange={val => setNewPost(p => ({ ...p, contentType: val }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">Post</SelectItem>
                  <SelectItem value="REEL">Reel</SelectItem>
                  <SelectItem value="CAROUSEL">Carousel</SelectItem>
                  <SelectItem value="STORY">Story</SelectItem>
                </SelectContent>
              </Select>
              <Textarea placeholder="Caption text" value={newPost.caption} onChange={e => setNewPost(p => ({ ...p, caption: e.target.value }))} />
              <Input placeholder="Mood (e.g., Elegant, Fun, Minimal)" value={newPost.mood} onChange={e => setNewPost(p => ({ ...p, mood: e.target.value }))} />
              <Input placeholder="Aesthetic (e.g., Modern, Vintage, Luxurious)" value={newPost.aesthetic} onChange={e => setNewPost(p => ({ ...p, aesthetic: e.target.value }))} />
              <Textarea placeholder="Notes" value={newPost.notes} onChange={e => setNewPost(p => ({ ...p, notes: e.target.value }))} />
              <Button onClick={addPost} className="w-full">Add Reference</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Favorites</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.favoriteCount}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Recent (24h)</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.recentCount}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Platforms</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{Object.keys(stats.byPlatform).length}</div></CardContent>
          </Card>
        </div>
      )}

      {/* Filter */}
      <Select value={filterPlatform} onValueChange={setFilterPlatform}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filter by platform" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Platforms</SelectItem>
          <SelectItem value="INSTAGRAM">Instagram</SelectItem>
          <SelectItem value="TIKTOK">TikTok</SelectItem>
          <SelectItem value="TWITTER">Twitter</SelectItem>
          <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
          <SelectItem value="PINTEREST">Pinterest</SelectItem>
        </SelectContent>
      </Select>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({posts.length})</TabsTrigger>
          <TabsTrigger value="favorites">Favorites ({posts.filter(p => p.isFavorite).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {posts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No reference posts yet</p>
                <p className="text-sm text-muted-foreground">Add inspiring posts to improve AI content generation</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.map(post => (
                <ReferenceCard key={post.id} post={post} onFavorite={toggleFavorite} onDelete={deletePost} onAnalyze={analyzeStyle} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="space-y-4">
          {posts.filter(p => p.isFavorite).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Heart className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No favorites yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.filter(p => p.isFavorite).map(post => (
                <ReferenceCard key={post.id} post={post} onFavorite={toggleFavorite} onDelete={deletePost} onAnalyze={analyzeStyle} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReferenceCard({ post, onFavorite, onDelete, onAnalyze }: {
  post: ReferencePost;
  onFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onAnalyze: (id: string) => void;
}) {
  const hashtags = (() => {
    try { return JSON.parse(post.hashtags || '[]'); } catch { return []; }
  })();

  const styleTags = (() => {
    try { return JSON.parse(post.styleTags || '[]'); } catch { return []; }
  })();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{post.title}</CardTitle>
            <div className="flex gap-2">
              <Badge className={getPlatformColor(post.platform)}>{post.platform}</Badge>
              <Badge variant="outline">{post.contentType}</Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onFavorite(post.id)}>
            <Heart className={`h-4 w-4 ${post.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {post.caption && (
          <p className="text-sm text-muted-foreground line-clamp-3">{post.caption}</p>
        )}
        <div className="flex flex-wrap gap-1">
          {styleTags.slice(0, 5).map((tag: string, i: number) => (
            <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
        {post.mood && <Badge variant="outline">{post.mood}</Badge>}
        {post.aesthetic && <Badge variant="outline">{post.aesthetic}</Badge>}
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={() => onAnalyze(post.id)}>
            <Analyze className="h-4 w-4 mr-1" />
            Analyze
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(post.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
          {post.url && (
            <Button variant="ghost" size="sm" asChild>
              <a href={post.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getPlatformColor(platform: string) {
  const colors: Record<string, string> = {
    INSTAGRAM: 'bg-pink-100 text-pink-800',
    TIKTOK: 'bg-purple-100 text-purple-800',
    TWITTER: 'bg-blue-100 text-blue-800',
    LINKEDIN: 'bg-blue-100 text-blue-800',
    PINTEREST: 'bg-red-100 text-red-800'
  };
  return colors[platform] || 'bg-gray-100 text-gray-800';
}
