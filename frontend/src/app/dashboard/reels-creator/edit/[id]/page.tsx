'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Loader2, Check } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  InstagramLogo, FacebookLogo, LinkedinLogo, TwitterLogo,
  TiktokLogo, YoutubeLogo, ThreadsLogo, PinterestLogo, SnapchatLogo
} from '@/components/icons/social-icons';
import type { ComponentType, SVGProps } from 'react';

const platformStyles: Record<string, {
  name: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  color: string;
  bg: string;
}> = {
  FACEBOOK: { name: 'Facebook', icon: FacebookLogo, color: '#1877F2', bg: '#EBF4FF' },
  INSTAGRAM: { name: 'Instagram', icon: InstagramLogo, color: '#E4405F', bg: '#FFF0F3' },
  LINKEDIN: { name: 'LinkedIn', icon: LinkedinLogo, color: '#0A66C2', bg: '#EBF4FF' },
  TWITTER: { name: 'X / Twitter', icon: TwitterLogo, color: '#111111', bg: '#F3F4F6' },
  TIKTOK: { name: 'TikTok', icon: TiktokLogo, color: '#111111', bg: '#F3F4F6' },
  YOUTUBE: { name: 'YouTube', icon: YoutubeLogo, color: '#FF0000', bg: '#FFF1F1' },
  THREADS: { name: 'Threads', icon: ThreadsLogo, color: '#111111', bg: '#F3F4F6' },
  PINTEREST: { name: 'Pinterest', icon: PinterestLogo, color: '#E60023', bg: '#FFF1F1' },
  SNAPCHAT: { name: 'Snapchat', icon: SnapchatLogo, color: '#B89400', bg: '#FFF8D9' },
};

export default function EditReelSeries() {
  const router = useRouter();
  const params = useParams();
  const seriesId = params.id as string;
  const queryClient = useQueryClient();

  const [seriesName, setSeriesName] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [scheduleDays, setScheduleDays] = useState<string[]>(['MON', 'WED', 'FRI']);
  const [publishTime, setPublishTime] = useState('12:00');
  const [isActive, setIsActive] = useState(true);

  // Fetch social accounts
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.oauth.getAccounts(),
  });

  const { data: seriesData, isLoading } = useQuery({
    queryKey: ['reel-series', seriesId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/reels/series/${seriesId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch series');
      return res.json();
    }
  });

  useEffect(() => {
    if (seriesData?.data) {
      setSeriesName(seriesData.data.name);
      setIsActive(seriesData.data.isActive);
      setPublishTime(seriesData.data.scheduleTime || '12:00');
      
      try {
        const channels = JSON.parse(seriesData.data.socialChannels || '[]');
        setSelectedChannels(channels);
      } catch (e) {
        setSelectedChannels([]);
      }

      try {
        const days = JSON.parse(seriesData.data.scheduleDays || '[]');
        setScheduleDays(days);
      } catch (e) {
        setScheduleDays(['MON', 'WED', 'FRI']);
      }
    }
  }, [seriesData]);

  const toggleChannel = (accountId: string) => {
    setSelectedChannels(prev => 
      prev.includes(accountId) 
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/reels/series/${seriesId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name: seriesName,
          isActive,
          socialChannels: selectedChannels,
          scheduleDays,
          scheduleTime: publishTime
        })
      });
      if (!res.ok) throw new Error('Failed to update series');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reel-series'] });
      router.push('/dashboard/reels-creator');
    }
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-white/50">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Edit Series</h1>
          <p className="text-stone-500 mt-1">Configure your auto-posting settings</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 space-y-8">
        {/* Series Name */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-stone-700">Series Name</label>
          <Input 
            value={seriesName} 
            onChange={(e) => setSeriesName(e.target.value)} 
            placeholder="e.g. Spooky Sundays"
            className="max-w-lg"
          />
        </div>

        {/* Active Status */}
        <div className="flex items-center justify-between max-w-lg border-t border-stone-100 pt-6">
          <div>
            <label className="block text-sm font-medium text-stone-700">Auto Posting Active</label>
            <p className="text-stone-500 text-xs mt-0.5">Toggle automated scheduling and posting</p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        {/* Social Channels Checklist */}
        <div className="space-y-3 border-t border-stone-100 pt-6">
          <div>
            <label className="block text-sm font-medium text-stone-700">Publishing Channels</label>
            <p className="text-stone-500 text-xs mt-0.5">Select connected accounts to auto-publish new reels</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {accountsData?.accounts?.length === 0 && (
              <span className="text-sm text-stone-500 italic">No social accounts connected. Connect some in settings to auto-post.</span>
            )}
            {accountsData?.accounts?.map((account: any) => {
              const platformId = account.platform.toUpperCase();
              const config = platformStyles[platformId];
              if (!config) return null;
              const selected = selectedChannels.includes(account.id);
              const Logo = config.icon;

              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => toggleChannel(account.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300',
                    selected ? 'border-violet-600 bg-violet-50 text-violet-900 shadow-sm' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                  )}
                >
                  <Logo className="h-4 w-4" style={{ color: config.color }} />
                  <span className="text-sm font-medium">{account.metadata?.accountName || config.name}</span>
                  {selected && <Check className="h-3 w-3 text-violet-600 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Schedule settings */}
        <div className="space-y-4 border-t border-stone-100 pt-6 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-stone-700">Posting Schedule</label>
            <p className="text-stone-500 text-xs mt-0.5">Configure the days and time to post</p>
          </div>
          
          <div className="space-y-3">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Days of Week</span>
            <div className="flex flex-wrap gap-2">
              {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => {
                const isSelected = scheduleDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      setScheduleDays(prev => 
                        prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                      )
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200',
                      isSelected 
                        ? 'border-violet-600 bg-violet-600 text-white shadow-sm' 
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Posting Time</span>
            <Input 
              type="time" 
              value={publishTime} 
              onChange={(e) => setPublishTime(e.target.value)} 
              className="max-w-[150px]"
            />
          </div>
        </div>

        {/* Save/Cancel Buttons */}
        <div className="pt-6 flex gap-4 border-t border-stone-100">
          <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button 
            className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || !seriesName.trim()}
          >
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
