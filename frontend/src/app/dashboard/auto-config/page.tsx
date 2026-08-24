'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Settings, Play, Pause, Save } from 'lucide-react';

interface AutonomousConfig {
  id: string;
  isEnabled: boolean;
  scanFrequency: string;
  trendCategories: string;
  platforms: string;
  minEngagement: number;
  autoGenerate: boolean;
  autoSchedule: boolean;
  voiceId: string;
  language: string;
  niche: string;
  targetAudience: string;
  brandTone: string;
  maxPostsPerDay: number;
  minScore: number;
  referencePostIds: string;
}

export default function AutoConfigPage() {
  const [config, setConfig] = useState<AutonomousConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workerStatus, setWorkerStatus] = useState({ isRunning: false });
  const [categories, setCategories] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const [configRes, statusRes] = await Promise.all([
        api.autonomous.getConfig(),
        api.autonomous.getWorkerStatus()
      ]);
      
      const c = configRes.config;
      setConfig(c);
      setWorkerStatus(statusRes.status);
      
      try { setCategories(JSON.parse(c.trendCategories || '[]')); } catch { setCategories([]); }
      try { setPlatforms(JSON.parse(c.platforms || '[]')); } catch { setPlatforms([]); }
    } catch (err) {
      console.error('Failed to load config:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.autonomous.updateConfig({
        ...config,
        trendCategories: categories,
        platforms: platforms
      });
    } catch (err) {
      console.error('Failed to save config:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleWorker = async () => {
    if (workerStatus.isRunning) {
      await api.autonomous.stopWorker();
    } else {
      await api.autonomous.startWorker();
    }
    await loadConfig();
  };

  const triggerScan = async () => {
    try {
      await api.autonomous.triggerScan();
    } catch (err) {
      console.error('Scan failed:', err);
    }
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
          <h1 className="text-2xl font-bold">Autonomous Settings</h1>
          <p className="text-muted-foreground">Configure AI-powered automatic content generation</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={triggerScan} variant="outline">
            <Play className="h-4 w-4 mr-2" />
            Run Scan
          </Button>
          <Button onClick={toggleWorker}>
            {workerStatus.isRunning ? (
              <><Pause className="h-4 w-4 mr-2" /> Stop Worker</>
            ) : (
              <><Play className="h-4 w-4 mr-2" /> Start Worker</>
            )}
          </Button>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Worker Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant={workerStatus.isRunning ? "default" : "secondary"}>
              {workerStatus.isRunning ? "Running" : "Stopped"}
            </Badge>
            <Badge variant={config?.isEnabled ? "default" : "outline"}>
              {config?.isEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Main Config */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Configure autonomous behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Enable Autonomous Mode</label>
              <Switch
                checked={config?.isEnabled || false}
                onCheckedChange={(checked) => setConfig(prev => prev ? { ...prev, isEnabled: checked } : null)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Scan Frequency</label>
              <Select
                value={config?.scanFrequency || 'hourly'}
                onValueChange={(val) => setConfig(prev => prev ? { ...prev, scanFrequency: val } : null)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minute">Every Minute</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Niche</label>
              <Input
                placeholder="e.g., Fashion, Lifestyle, Beauty"
                value={config?.niche || ''}
                onChange={(e) => setConfig(prev => prev ? { ...prev, niche: e.target.value } : null)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Target Audience</label>
              <Input
                placeholder="e.g., Young professionals, Fashion enthusiasts"
                value={config?.targetAudience || ''}
                onChange={(e) => setConfig(prev => prev ? { ...prev, targetAudience: e.target.value } : null)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Brand Tone</label>
              <Select
                value={config?.brandTone || 'Professional'}
                onValueChange={(val) => setConfig(prev => prev ? { ...prev, brandTone: val } : null)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Casual">Casual</SelectItem>
                  <SelectItem value="Playful">Playful</SelectItem>
                  <SelectItem value="Luxurious">Luxurious</SelectItem>
                  <SelectItem value="Minimalist">Minimalist</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Content Generation */}
        <Card>
          <CardHeader>
            <CardTitle>Content Generation</CardTitle>
            <CardDescription>Configure how content is created</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Auto Generate Content</label>
              <Switch
                checked={config?.autoGenerate ?? true}
                onCheckedChange={(checked) => setConfig(prev => prev ? { ...prev, autoGenerate: checked } : null)}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Auto Schedule Posts</label>
              <Switch
                checked={config?.autoSchedule || false}
                onCheckedChange={(checked) => setConfig(prev => prev ? { ...prev, autoSchedule: checked } : null)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Max Posts Per Day</label>
              <Input
                type="number"
                min="1"
                max="10"
                value={config?.maxPostsPerDay || 3}
                onChange={(e) => setConfig(prev => prev ? { ...prev, maxPostsPerDay: parseInt(e.target.value) || 3 } : null)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Language</label>
              <Select
                value={config?.language || 'English'}
                onValueChange={(val) => setConfig(prev => prev ? { ...prev, language: val } : null)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Hindi">Hindi</SelectItem>
                  <SelectItem value="Spanish">Spanish</SelectItem>
                  <SelectItem value="French">French</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">AI Voice</label>
              <Select
                value={config?.voiceId || 'Aoede'}
                onValueChange={(val) => setConfig(prev => prev ? { ...prev, voiceId: val } : null)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aoede">Aoede</SelectItem>
                  <SelectItem value="Puck">Puck</SelectItem>
                  <SelectItem value="Fenrir">Fenrir</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Trend Filters</CardTitle>
            <CardDescription>Select categories and platforms to monitor</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Categories</label>
              <div className="flex flex-wrap gap-2">
                {['FASHION', 'BEAUTY', 'LIFESTYLE', 'TECH', 'FOOD', 'TRAVEL', 'FITNESS'].map(cat => (
                  <Badge
                    key={cat}
                    variant={categories.includes(cat) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setCategories(prev =>
                      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                    )}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Platforms</label>
              <div className="flex flex-wrap gap-2">
                {['TWITTER', 'INSTAGRAM', 'TIKTOK', 'REDDIT'].map(p => (
                  <Badge
                    key={p}
                    variant={platforms.includes(p) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setPlatforms(prev =>
                      prev.includes(p) ? prev.filter(pl => pl !== p) : [...prev, p]
                    )}
                  >
                    {p}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Minimum Engagement</label>
              <Input
                type="number"
                min="0"
                value={config?.minEngagement || 100}
                onChange={(e) => setConfig(prev => prev ? { ...prev, minEngagement: parseInt(e.target.value) || 100 } : null)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Minimum Score</label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={config?.minScore || 0.5}
                onChange={(e) => setConfig(prev => prev ? { ...prev, minScore: parseFloat(e.target.value) || 0.5 } : null)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveConfig} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
