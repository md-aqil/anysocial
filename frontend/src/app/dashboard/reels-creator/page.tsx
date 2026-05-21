'use client';

import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, Video, Calendar, Clock, Play, FileText, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export default function ReelsDashboard() {
  const router = useRouter();

  const { data: seriesList, isLoading } = useQuery({
    queryKey: ['reel-series'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/reels/series`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch series');
      const json = await res.json();
      return json.data || [];
    },
    refetchInterval: 5000 // Refetch every 5 seconds to get updates on GENERATING status
  });

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Reel Creator</h1>
          <p className="text-stone-500 mt-2">Manage your automated short-form video series</p>
        </div>
        <Button 
          onClick={() => router.push('/dashboard/reels-creator/new')}
          className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-11 px-6 shadow-md"
        >
          <Plus className="mr-2 h-5 w-5" />
          Create New Series
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
      ) : seriesList?.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-violet-50 text-violet-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 mb-2">No Series Yet</h2>
          <p className="text-stone-500 mb-8 max-w-md mx-auto">
            Create an automated video series and let our AI generate, assemble, and post highly engaging reels for you automatically.
          </p>
          <Button 
            onClick={() => router.push('/dashboard/reels-creator/new')}
            className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl"
          >
            Create Your First Series
          </Button>
        </div>
      ) : (
        <div className="grid gap-6">
          {seriesList?.map((series: any) => (
            <div key={series.id} className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                    {series.name}
                    {series.isActive && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase">Active</span>}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-stone-500">
                    <span className="flex items-center gap-1"><FileText className="h-4 w-4" /> {series.niche || 'Custom Script'}</span>
                    <span className="flex items-center gap-1"><Video className="h-4 w-4" /> {series.artStyle}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-stone-900 uppercase tracking-wider">Generated Reels</h4>
                {series.reels?.length === 0 ? (
                  <div className="bg-stone-50 rounded-xl p-4 text-center text-sm text-stone-500">
                    No reels generated yet for this series.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {series.reels?.map((reel: any) => (
                      <div key={reel.id} className="border border-stone-100 rounded-xl bg-[#FBF3EE]/30 overflow-hidden flex flex-col">
                        <div className="p-4 flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full flex items-center gap-1.5 ${
                              reel.status === 'READY' ? 'bg-green-100 text-green-700' :
                              reel.status === 'GENERATING' ? 'bg-blue-100 text-blue-700 animate-pulse' :
                              reel.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                              'bg-stone-200 text-stone-700'
                            }`}>
                              {reel.status === 'READY' && <CheckCircle2 className="h-3 w-3" />}
                              {reel.status === 'GENERATING' && <Loader2 className="h-3 w-3 animate-spin" />}
                              {reel.status === 'FAILED' && <AlertCircle className="h-3 w-3" />}
                              {reel.status}
                            </span>
                          </div>
                          
                          {reel.script && (
                            <p className="text-xs text-stone-600 line-clamp-3 mb-4 italic">
                              "{reel.script}"
                            </p>
                          )}

                          <div className="mt-auto space-y-2 text-xs font-medium text-stone-500">
                            {reel.scheduledFor && (
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                {format(new Date(reel.scheduledFor), 'MMM d, yyyy @ p')}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {reel.videoUrl && (
                          <div className="bg-stone-100 p-3 border-t border-stone-100">
                            <a 
                              href={reel.videoUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex items-center justify-center gap-2 w-full py-2 bg-white border border-stone-200 rounded-lg text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
                            >
                              <Play className="h-4 w-4 text-violet-600" />
                              Watch Final Reel
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
