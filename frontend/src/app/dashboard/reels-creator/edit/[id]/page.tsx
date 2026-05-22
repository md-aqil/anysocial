'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function EditReelSeries() {
  const router = useRouter();
  const params = useParams();
  const seriesId = params.id as string;
  const queryClient = useQueryClient();

  const [seriesName, setSeriesName] = useState('');

  const { data: seriesData, isLoading } = useQuery({
    queryKey: ['reel-series', seriesId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/reels/series/${seriesId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch series');
      return res.json();
    }
  });

  useEffect(() => {
    if (seriesData?.data) {
      setSeriesName(seriesData.data.name);
    }
  }, [seriesData]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/reels/series/${seriesId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: seriesName })
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
          <p className="text-stone-500 mt-1">Update your series details</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
        <div className="space-y-6 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Series Name</label>
            <Input 
              value={seriesName} 
              onChange={(e) => setSeriesName(e.target.value)} 
              placeholder="e.g. Spooky Sundays"
            />
          </div>

          <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
            <p className="text-sm text-stone-600">
              <strong className="text-stone-900">Note:</strong> Editing the core prompt, niche, and voice settings for an existing series is currently locked to preserve consistency. If you want to change the niche or voice, please create a new series.
            </p>
          </div>

          <div className="pt-4 flex gap-4">
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
    </div>
  );
}
