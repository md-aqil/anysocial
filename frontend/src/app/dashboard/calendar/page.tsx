'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
  format, 
  addDays, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  isToday,
  parseISO,
  startOfToday,
  setHours,
  setMinutes
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(startOfToday());

  const { data, isLoading } = useQuery({
    queryKey: ['calendar-posts'],
    queryFn: () => api.posts.list({ limit: 100 })
  });

  const { data: reelsData } = useQuery({
    queryKey: ['calendar-reels'],
    queryFn: () => api.reels.list()
  });

  const { data: accountsData } = useQuery({
    queryKey: ['calendar-accounts'],
    queryFn: () => api.oauth.getAccounts()
  });

  const posts = data?.posts || [];
  const reels = reelsData?.data || [];
  const accounts = accountsData?.accounts || [];

  // Helper to map account ID to platform string
  const getPlatformName = (idOrPlatform: string) => {
    // If it's already a platform string, return it
    if (['FACEBOOK', 'INSTAGRAM', 'TWITTER', 'LINKEDIN', 'YOUTUBE', 'TIKTOK', 'THREADS', 'PINTEREST', 'SNAPCHAT'].includes(idOrPlatform)) {
      return idOrPlatform;
    }
    // Otherwise it's an ID, find the account
    const account = accounts.find((a: any) => a.id === idOrPlatform);
    return account ? account.platform : idOrPlatform;
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const nextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const prevWeek = () => setCurrentDate(subDays(currentDate, 7));

  const postsByTime = useMemo(() => {
    const map: Record<string, any[]> = {};
    posts.forEach((post: any) => {
      if (!post.scheduledAt) return;
      const date = parseISO(post.scheduledAt);
      const dayKey = format(date, 'yyyy-MM-dd');
      const hour = date.getHours();
      const key = `${dayKey}-${hour}`;
      if (!map[key]) map[key] = [];
      
      // Map post.platforms if they are IDs
      let platforms = post.platforms || [];
      try {
        if (typeof platforms === 'string') platforms = JSON.parse(platforms);
      } catch {
        platforms = [];
      }
      if (!Array.isArray(platforms)) platforms = [];
      const mappedPlatforms = platforms.map(getPlatformName);

      map[key].push({
        ...post,
        platforms: mappedPlatforms
      });
    });

    reels.forEach((reel: any) => {
      // If the reel has no postId (meaning no Post has been created yet) and is scheduled
      if (!reel.postId && reel.scheduledFor) {
        let channels: string[] = [];
        try {
          channels = JSON.parse(reel.socialChannels || '[]');
        } catch {
          channels = [];
        }
        
        const date = parseISO(reel.scheduledFor);
        const dayKey = format(date, 'yyyy-MM-dd');
        const hour = date.getHours();
        const key = `${dayKey}-${hour}`;
        if (!map[key]) map[key] = [];

        map[key].push({
          id: reel.id,
          title: `🎬 Reel: ${reel.series?.name || 'Standalone'}`,
          content: reel.script || 'No script generated yet',
          platforms: channels.map(getPlatformName),
          scheduledAt: reel.scheduledFor,
          status: reel.status, // PENDING, GENERATING, READY, FAILED
          isReel: true
        });
      }
    });

    return map;
  }, [posts, reels, accounts]);

  const handleCellClick = (day: Date, hour: number) => {
    const scheduledDate = setMinutes(setHours(day, hour), 0);
    router.push(`/dashboard/posts/new?scheduledAt=${scheduledDate.toISOString()}`);
  };

  const getPlatformIcon = (platform: string) => {
    const colors: Record<string, string> = {
      FACEBOOK: 'bg-[#1877F2]',
      INSTAGRAM: 'bg-[#E4405F]',
      TWITTER: 'bg-[#1DA1F2]',
      LINKEDIN: 'bg-[#0A66C2]',
      YOUTUBE: 'bg-[#FF0000]',
      TIKTOK: 'bg-[#000000]',
      THREADS: 'bg-[#000000]',
      PINTEREST: 'bg-[#E60023]',
      SNAPCHAT: 'bg-[#FFFC00]'
    };
    return (
      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm ring-1 ring-white/80", colors[platform] || 'bg-gray-500')}>
        {platform.substring(0, 1)}
      </div>
    );
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return {
          wrapper: 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-800',
          badge: 'bg-emerald-100/80 text-emerald-700 border-emerald-200/50',
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" />,
          label: 'Published'
        };
      case 'FAILED':
      case 'PARTIALLY_FAILED':
        return {
          wrapper: 'bg-red-50 hover:bg-red-100/80 border-red-200 text-red-800',
          badge: 'bg-red-100/80 text-red-700 border-red-200/50',
          icon: <AlertCircle className="w-3 h-3 text-red-600" />,
          label: 'Failed'
        };
      case 'PROCESSING':
      case 'QUEUED':
      case 'DRAFT':
      default:
        return {
          wrapper: 'bg-orange-50 hover:bg-orange-100/80 border-orange-200 text-orange-800',
          badge: 'bg-orange-100/80 text-orange-700 border-orange-200/50',
          icon: <Clock className="w-3 h-3 text-orange-600" />,
          label: 'Scheduled'
        };
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col p-6 max-w-[1600px] mx-auto overflow-hidden">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-[#2F281F]">Content Calendar</h1>
          <p className="text-sm text-[#7B746D] mt-1">Plan and schedule your social media posts</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white rounded-xl shadow-[0_2px_12px_rgba(47,40,31,0.04)] border border-[#F0F4F0] p-1.5">
          <button onClick={prevWeek} className="p-2 hover:bg-[#F2F6F2] rounded-lg text-[#2F281F] transition">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="font-semibold text-sm min-w-[140px] text-center text-[#2F281F]">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </span>
          <button onClick={nextWeek} className="p-2 hover:bg-[#F2F6F2] rounded-lg text-[#2F281F] transition">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-2xl bg-white shadow-[0_2px_24px_rgba(47,40,31,0.04)] border border-[#F0F4F0]">
        <div className="min-w-[900px]">
          {/* Header row */}
          <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] border-b border-[#F0F4F0] sticky top-0 bg-white/95 backdrop-blur-md z-20 shadow-sm">
            <div className="p-4 flex items-center justify-center text-[11px] font-bold uppercase tracking-widest text-[#AAA39D]">
              Time
            </div>
            {daysInWeek.map((day) => (
              <div 
                key={day.toString()} 
                className={cn(
                  "p-4 flex flex-col items-center justify-center gap-1.5 border-l border-[#F0F4F0]",
                  isToday(day) && "bg-[#FBF3EE]"
                )}
              >
                <span className={cn("text-xs font-bold uppercase tracking-wider", isToday(day) ? "text-[#D27D50]" : "text-[#7B746D]")}>
                  {format(day, 'EEE')}
                </span>
                <span className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-[15px] font-black",
                  isToday(day) ? "bg-[#D27D50] text-white shadow-md" : "text-[#2F281F]"
                )}>
                  {format(day, 'd')}
                </span>
              </div>
            ))}
          </div>

          {/* Grid body */}
          <div className="relative pb-10">
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] border-b border-[#F0F4F0]/60 group">
                <div className="p-3 text-[11px] font-bold text-[#AAA39D] flex items-start justify-center pt-3 border-r border-[#F0F4F0]/60 bg-[#FAFBFA]">
                  {format(setHours(new Date(), hour), 'h a')}
                </div>
                {daysInWeek.map((day) => {
                  const dayKey = format(day, 'yyyy-MM-dd');
                  const key = `${dayKey}-${hour}`;
                  const cellPosts = postsByTime[key] || [];

                  return (
                    <div 
                      key={day.toString()} 
                      onClick={() => handleCellClick(day, hour)}
                      className={cn(
                        "relative min-h-[90px] border-l border-[#F0F4F0]/60 p-2 cursor-pointer transition-colors duration-150",
                        "hover:bg-[#F9FAF9]",
                        isToday(day) && "bg-[#FBF3EE]/30 hover:bg-[#FBF3EE]/50"
                      )}
                    >
                      {/* Hover Add Button */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-0 hover:!opacity-100 transition-opacity z-20">
                         <div className="bg-[#D27D50] text-white p-2.5 rounded-full shadow-lg transform scale-90 hover:scale-100 transition-transform">
                           <Plus className="h-5 w-5" />
                         </div>
                      </div>

                      {/* Scheduled Posts */}
                      <div className="relative z-10 flex flex-col gap-2 h-full">
                        {cellPosts.map(post => {
                          const statusConfig = getStatusConfig(post.status);
                          return (
                          <div 
                            key={post.id} 
                            className={cn(
                              "relative p-2.5 rounded-xl border flex flex-col gap-2 transform transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer",
                              statusConfig.wrapper
                            )}
                            onClick={(e) => {
                               e.stopPropagation();
                               if (post.isReel) {
                                 router.push('/dashboard/reels-creator');
                               } else {
                                 router.push(`/dashboard/posts/edit/${post.id}`);
                               }
                             }}
                            title={post.title || post.content || 'Untitled Post'}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex -space-x-1.5 shrink-0">
                                {post.platforms.map((p: string, i: number) => (
                                  <div key={i} className="relative z-10 rounded-full">
                                    {getPlatformIcon(p)}
                                  </div>
                                ))}
                              </div>
                              <div 
                                className="text-[10px] font-medium text-[#8D8681] flex items-center"
                              >
                                <Clock className="w-2.5 h-2.5 mr-1" />
                                {format(parseISO(post.scheduledAt!), 'h:mm a')}
                              </div>
                            </div>
                            <div className="text-xs font-semibold line-clamp-2 pr-1 leading-snug">
                              {post.title || post.content || 'Untitled Post'}
                            </div>
                            <div className={cn("mt-1 self-start inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium border", statusConfig.badge)}>
                              {statusConfig.icon}
                              {statusConfig.label}
                            </div>
                          </div>
                        )})}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
