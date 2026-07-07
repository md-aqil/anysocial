'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn, formatDateTime, getPlatformColor } from '@/lib/utils';
import { 
  Plus, Link2, FileText, Clock, CheckCircle, XCircle, 
  Loader2, Zap, ArrowUpRight, Calendar, Users, BarChart3,
  MessageSquare, Settings, Bell, Search, TrendingUp,
  LayoutDashboard, Share2, Video
} from 'lucide-react';
import { 
  InstagramLogo, FacebookLogo, LinkedinLogo, TwitterLogo, 
  TiktokLogo, YoutubeLogo, ThreadsLogo, PinterestLogo, SnapchatLogo 
} from '@/components/icons/social-icons';
import { motion } from 'framer-motion';

const statusIcons = {
  CONNECTED: CheckCircle,
  EXPIRED: Clock,
  REVOKED: XCircle,
  ERROR: XCircle,
};

const statusColors = {
  CONNECTED: 'text-green-500 bg-green-50',
  EXPIRED: 'text-yellow-500 bg-yellow-50',
  REVOKED: 'text-stone-400 bg-stone-50',
  ERROR: 'text-red-500 bg-red-50',
};

const platformLogos: Record<string, any> = {
  INSTAGRAM: InstagramLogo,
  FACEBOOK: FacebookLogo,
  LINKEDIN: LinkedinLogo,
  TWITTER: TwitterLogo,
  X: TwitterLogo,
  TIKTOK: TiktokLogo,
  YOUTUBE: YoutubeLogo,
  THREADS: ThreadsLogo,
  PINTEREST: PinterestLogo,
  SNAPCHAT: SnapchatLogo,
};

export default function DashboardPage() {
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.oauth.getAccounts(),
  });

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: () => api.posts.list({ limit: 10 }),
  });

  const accounts = accountsData?.accounts || [];
  const posts = postsData?.posts || [];

  const upcomingPosts = posts.filter(
    (p) => p.status === 'QUEUED' || p.status === 'PROCESSING'
  );
  
  const stats = [
    { label: 'Active Channels', value: accounts.length, sub: 'Linked platforms', icon: Share2, color: '#D27D50', bg: '#FBF3EE' },
    { label: 'Scheduled', value: upcomingPosts.length, sub: 'Waiting to post', icon: Calendar, color: '#4F46E5', bg: '#EEF2FF' },
    { label: 'Total Posts', value: posts.length, sub: 'All-time volume', icon: FileText, color: '#059669', bg: '#ECFDF5' },
    { label: 'Avg Engagement', value: '4.2%', sub: '+12.5% this week', icon: TrendingUp, color: '#D97706', bg: '#FFFBEB' },
  ];

  return (
    <div className="max-w-[1400px] mx-auto p-6 lg:p-10 space-y-10 pb-12">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[#D27D50] font-black text-[10px] uppercase tracking-[0.2em] mb-2">
            <Zap className="h-3.5 w-3.5 fill-current" />
            Social Command Center
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Welcome back!</h1>
          <p className="text-stone-500 font-medium mt-1 text-lg">Here's what's happening across your channels today.</p>
        </div>
        <Link href="/dashboard/posts/new">
          <Button className="h-14 bg-slate-900 hover:bg-slate-800 text-white px-8 rounded-[1.25rem] font-black text-sm uppercase tracking-widest shadow-[0_8px_20px_rgba(15,23,42,0.15)] transition-all active:scale-95">
            <Plus className="h-5 w-5 mr-2 stroke-[3]" />
            Create New Post
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-gradient-to-b from-white to-[#FAFCFA] rounded-[2.5rem] overflow-hidden group hover:shadow-[0_15px_40px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 rounded-[1.25rem] flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm border border-black/[0.03]" style={{ backgroundColor: stat.bg }}>
                    <stat.icon className="h-5 w-5" style={{ color: stat.color }} strokeWidth={2.5} />
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-stone-300 group-hover:text-[#D27D50] transition-colors" />
                </div>
                <div className="text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</div>
                <div className="text-[11px] font-black text-stone-400 uppercase tracking-[0.15em] mt-2">{stat.label}</div>
                <div className="mt-5 pt-4 border-t border-stone-100 text-[13px] font-semibold text-stone-500">
                  {stat.sub}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
        {/* Recent Posts List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Recent Activity</h2>
            <Link href="/dashboard/posts" className="text-[11px] font-black text-[#D27D50] hover:text-[#B86A42] hover:underline uppercase tracking-[0.15em] transition-colors">
              View All Posts
            </Link>
          </div>

          <div className="space-y-4">
            {postsLoading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="h-24 rounded-3xl bg-stone-50/50 animate-pulse border border-stone-100" />
              ))
            ) : posts.length === 0 ? (
              <Card className="border border-dashed border-stone-200 bg-stone-50/50 rounded-[2.5rem] p-12 text-center shadow-sm">
                <div className="h-16 w-16 bg-white rounded-[1.25rem] flex items-center justify-center shadow-sm mx-auto mb-4 border border-stone-100">
                  <FileText className="h-8 w-8 text-stone-300" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">No posts yet</h3>
                <p className="text-stone-500 font-medium mt-2 max-w-[300px] mx-auto text-sm">Start reaching your audience by creating your first scheduled post.</p>
                <Link href="/dashboard/posts/new">
                  <Button className="mt-8 bg-[#D27D50] hover:bg-[#B86A42] text-white px-8 rounded-xl font-bold shadow-[0_4px_14px_rgba(210,125,80,0.25)]">Get Started</Button>
                </Link>
              </Card>
            ) : (
              posts.slice(0, 5).map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="group relative flex items-center gap-5 p-5 bg-white rounded-3xl border border-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-[#D27D50]/20 hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                >
                  <div className="h-16 w-16 rounded-[1.25rem] bg-stone-50/50 border border-stone-100 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {post.mediaUrls?.[0] ? (
                      post.mediaUrls[0].match(/\.(mp4|mov|webm)/i) ? (
                        <div className="w-full h-full flex items-center justify-center bg-stone-900">
                          <Video className="h-6 w-6 text-white opacity-60" />
                        </div>
                      ) : (
                        <img src={post.mediaUrls[0]} className="h-full w-full object-cover" alt="" />
                      )
                    ) : (
                      <FileText className="h-6 w-6 text-stone-300" strokeWidth={2} />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate pr-4">
                      {post.title || post.rawContent.slice(0, 60) + (post.rawContent.length > 60 ? '...' : '')}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex -space-x-1.5">
                        {post.platforms.map((platform) => {
                          const Logo = platformLogos[platform.toUpperCase()];
                          return (
                            <div key={platform} className="h-6 w-6 rounded-lg bg-white border border-[#F0F4F0] flex items-center justify-center shadow-sm p-1">
                              {Logo ? <Logo className="h-full w-full" /> : <Share2 className="h-3 w-3 text-stone-400" />}
                            </div>
                          );
                        })}
                      </div>
                      <span className="h-1 w-1 rounded-full bg-stone-300" />
                      <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">
                        {post.scheduledAt ? formatDateTime(post.scheduledAt) : 'Draft'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 pr-2">
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                      post.status === 'PUBLISHED' && "bg-green-50 text-green-600",
                      post.status === 'QUEUED' && "bg-blue-50 text-blue-600",
                      post.status === 'FAILED' && "bg-red-50 text-red-600",
                      post.status === 'DRAFT' && "bg-stone-100 text-stone-600",
                    )}>
                      {post.status}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-stone-200 group-hover:text-[#D27D50] transition-colors" />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          {/* Connected Channels Widget */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Channels</h2>
              <Link href="/dashboard/social-accounts">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg bg-white shadow-sm border border-stone-100 text-stone-400 hover:text-[#D27D50] hover:bg-stone-50">
                  <Plus className="h-4 w-4 stroke-[3]" />
                </Button>
              </Link>
            </div>
            
            <Card className="border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-gradient-to-b from-white to-[#FAFCFA] rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-6">
                {accountsLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-stone-300" /></div>
                ) : accounts.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-[11px] font-black text-stone-400 uppercase tracking-[0.15em]">No Channels</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {accounts.map((account) => {
                      const platformId = account.platform.toUpperCase();
                      const Logo = platformLogos[platformId];
                      const statusColor = statusColors[account.status as keyof typeof statusColors] || statusColors.ERROR;
                      
                      return (
                        <div key={account.id} className="flex items-center justify-between p-2 hover:bg-stone-50/50 rounded-2xl transition-colors -mx-2">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-[0.85rem] bg-white border border-stone-100 shadow-sm flex items-center justify-center p-2.5">
                              {Logo ? <Logo className="h-full w-full" /> : <Share2 className="h-5 w-5 text-stone-400" />}
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-slate-900 leading-tight">{account.platform}</p>
                              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{account.status.toLowerCase()}</p>
                            </div>
                          </div>
                          <div className={cn("h-1.5 w-1.5 rounded-full shadow-sm", statusColor.split(' ')[0].replace('text-', 'bg-'))} />
                        </div>
                      );
                    })}
                  </div>
                )}
                <Link href="/dashboard/social-accounts">
                  <Button className="w-full mt-6 h-11 rounded-[1rem] bg-stone-900 text-white hover:bg-stone-800 font-bold text-[11px] uppercase tracking-[0.15em] border-none shadow-md">
                    Manage Channels
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Tips Card */}
          <Card className="border border-slate-700/50 bg-gradient-to-br from-slate-900 to-[#0B0F19] rounded-[2.5rem] overflow-hidden shadow-[0_20px_40px_rgba(15,23,42,0.15)] relative">
            <div className="absolute top-[-50px] right-[-50px] w-[150px] h-[150px] bg-[#D27D50]/10 blur-[50px] rounded-full pointer-events-none" />
            <CardContent className="p-8 text-white relative z-10">
              <Zap className="h-8 w-8 text-[#D27D50] mb-4 fill-current" />
              <h3 className="text-lg font-black tracking-tight">Growth Tip</h3>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                Posts with <span className="text-white font-bold">high-quality visuals</span> tend to get 40% more engagement on Instagram and Facebook.
              </p>
              <Button className="mt-6 w-full h-11 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-widest border-none backdrop-blur-sm">
                Learn More
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <footer className="pt-12 border-t border-[#D9E3D9] flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">
        <div className="flex items-center gap-8">
          <Link href="/privacy-policy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
          <Link href="/terms-of-service" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
        </div>
        <div>© 2026 SocialSched • Elevated Content Control</div>
      </footer>
    </div>
  );
}
