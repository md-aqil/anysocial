'use client';

import { useState, useEffect, type ComponentType, type SVGProps } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api, SocialAccount } from '@/lib/api';
import { cn } from '@/lib/utils';
import { 
  Loader2, CheckCircle, XCircle, AlertCircle, Plus, 
  RefreshCw, Trash2, ExternalLink, Settings, ShieldCheck, 
  ChevronRight, Info, Zap
} from 'lucide-react';
import { 
  InstagramLogo, FacebookLogo, LinkedinLogo, TwitterLogo, 
  TiktokLogo, YoutubeLogo, ThreadsLogo, PinterestLogo, SnapchatLogo 
} from '@/components/icons/social-icons';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Actual Platform SVGs
const PlatformLogos: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  instagram: InstagramLogo,
  facebook: FacebookLogo,
  linkedin: LinkedinLogo,
  twitter: TwitterLogo,
  tiktok: TiktokLogo,
  youtube: YoutubeLogo,
  threads: ThreadsLogo,
  pinterest: PinterestLogo,
  snapchat: SnapchatLogo,
};

interface PlatformConfig {
  id: string;
  name: string;
  color: string;
  bg: string;
  border: string;
  description: string;
}

const platforms: PlatformConfig[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    border: 'border-pink-100',
    description: 'Post stunning visuals and stories to your Instagram feed.'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    description: 'Connect with pages and groups across the Meta ecosystem.'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    description: 'Build your professional brand and share thought leadership.'
  },
  {
    id: 'twitter',
    name: 'X / Twitter',
    color: 'text-slate-900',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    description: 'Reach your audience with real-time updates and threads.'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    color: 'text-stone-900',
    bg: 'bg-stone-50',
    border: 'border-stone-200',
    description: 'Engage the world with creative short-form video content.'
  },
  {
    id: 'youtube',
    name: 'YouTube',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-100',
    description: 'Upload high-quality videos and Shorts to your channel.'
  },
  {
    id: 'threads',
    name: 'Threads',
    color: 'text-slate-900',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    description: 'Join conversations and share updates on Meta Threads.'
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-100',
    description: 'Curate boards and pin your creative ideas for the world.'
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    description: 'Share authentic moments to your Snapchat profile.'
  }
];

export default function SocialAccountsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [refreshingAccount, setRefreshingAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [pendingAccounts, setPendingAccounts] = useState<any[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [selectionStateToken, setSelectionStateToken] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectionPlatform, setSelectionPlatform] = useState<string | null>(null);

  useEffect(() => {
    const status = searchParams.get('status');
    const msg = searchParams.get('message');
    
    if (status === 'success') {
      setSuccessMessage('Channel integrated successfully!');
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
      router.replace('/dashboard/social-accounts');
    } else if (status === 'select') {
      const state = searchParams.get('state');
      const platform = searchParams.get('platform');
      if (state) {
        setSelectionStateToken(state);
        setSelectionPlatform(platform);
        setIsSelectionModalOpen(true);
        fetchPendingAccounts(state);
      }
      router.replace('/dashboard/social-accounts');
    } else if (status === 'error') {
      setError(msg || 'Failed to authorize account.');
      router.replace('/dashboard/social-accounts');
    }
  }, [searchParams, queryClient, router]);

  const fetchPendingAccounts = async (stateToken: string) => {
    try {
      const data = await api.oauth.getPendingAccounts(stateToken);
      setPendingAccounts(data.accounts);
      setSelectedAccountIds(data.accounts.map((a: any) => a.id));
    } catch (err: any) {
      setError('Discovery failed. Please try again.');
      setIsSelectionModalOpen(false);
    }
  };

  const handleConfirmSelection = async () => {
    if (!selectionStateToken || selectedAccountIds.length === 0) return;
    setIsConfirming(true);
    try {
      await api.oauth.confirmSelection(selectionStateToken, selectedAccountIds);
      setSuccessMessage(`Successfully connected ${selectedAccountIds.length} channels!`);
      setIsSelectionModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
    } finally {
      setIsConfirming(false);
    }
  };

  const { data, isLoading } = useQuery<{ accounts: SocialAccount[] }>({
    queryKey: ['social-accounts'],
    queryFn: () => api.oauth.getAccounts(),
  });

  const { data: configData } = useQuery<{ configuredPlatforms: string[] }>({
    queryKey: ['oauth-config'],
    queryFn: () => api.oauth.getConfig(),
  });

  const connectMutation = useMutation({
    mutationFn: async (platform: string) => {
      const { authUrl, state } = await api.oauth.connect(platform);
      localStorage.setItem(`oauth_state_${platform}`, state);
      window.location.href = authUrl;
    },
    onMutate: (platform) => {
      setConnectingPlatform(platform);
      setError(null);
    },
    onError: (err: any) => {
      setConnectingPlatform(null);
      setError(err?.message || 'Connection handshake failed.');
    },
  });

  const refreshMutation = useMutation({
    mutationFn: ({ platform, id }: { platform: string; id: string }) =>
      api.oauth.refreshToken(platform, id),
    onMutate: ({ id }) => setRefreshingAccount(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['social-accounts'] }),
    onSettled: () => setRefreshingAccount(null),
  });

  const revokeMutation = useMutation({
    mutationFn: ({ platform, id }: { platform: string; id: string }) =>
      api.oauth.revokeAccount(platform, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['social-accounts'] }),
  });

  const handleRefresh = (platform: string, id: string) => {
    refreshMutation.mutate({ platform, id });
  };

  const handleDisconnect = (platform: string, id: string) => {
    if (confirm('Are you sure you want to disconnect this account?')) {
      revokeMutation.mutate({ platform, id });
    }
  };

  const accounts = data?.accounts || [];
  const getAccountsForPlatform = (platformId: string) => {
    return accounts.filter(a => a.platform.toLowerCase() === platformId.toLowerCase() && a.status !== 'REVOKED');
  };

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2 w-2 rounded-full bg-[#D27D50] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">Channel Management</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Social Connections</h1>
          <p className="mt-4 text-lg text-stone-500 font-medium leading-relaxed">
            Unify your social presence. Link your accounts once and broadcast across all platforms from a single command center.
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-3xl border border-[#D9E3D9] shadow-sm">
          <div className="flex -space-x-3 overflow-hidden p-1">
            {platforms.slice(0, 5).map((p) => {
              const Logo = PlatformLogos[p.id];
              return (
                <div key={p.id} className={cn("inline-block h-8 w-8 rounded-full border-2 border-white bg-white p-1.5 shadow-sm", p.color)}>
                  <Logo className="h-full w-full" />
                </div>
              );
            })}
          </div>
          <div className="pr-4 border-l border-[#D9E3D9] pl-4">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-wider">Configured</p>
            <p className="text-sm font-bold text-slate-900">{accounts.length} Active Channels</p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {(error || successMessage) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "p-5 rounded-[24px] border-2 flex items-center gap-4 shadow-xl",
              error ? "bg-rose-50 border-rose-100 text-rose-800" : "bg-emerald-50 border-emerald-100 text-emerald-800"
            )}
          >
            {error ? <AlertCircle className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
            <div className="flex-1 font-bold text-sm">
              {error ? error : successMessage}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-xl hover:bg-white/20"
              onClick={() => { setError(null); setSuccessMessage(null); }}
            >
              Dismiss
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Platform Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
        {platforms.map((platform, idx) => {
          const platformAccounts = getAccountsForPlatform(platform.id);
          const Logo = PlatformLogos[platform.id];
          const isConnecting = connectingPlatform === platform.id;
          const isConfigured = configData?.configuredPlatforms?.includes(platform.id.toUpperCase()) ?? true;

          return (
            <motion.div
              key={platform.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className={cn(
                "group h-full overflow-hidden border-[#D9E3D9] bg-white transition-all duration-500",
                "hover:border-[#D27D50]/30 hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] hover:-translate-y-1",
                platformAccounts.length > 0 ? "ring-1 ring-[#D27D50]/10" : ""
              )}>
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn(
                      "h-16 w-16 rounded-[22px] flex items-center justify-center p-3.5 transition-all duration-500 shadow-sm",
                      platform.bg, platform.color,
                      "group-hover:scale-110 group-hover:rotate-3"
                    )}>
                      <Logo className="h-full w-full" />
                    </div>
                    {platformAccounts.length > 0 && (
                      <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-600 border border-emerald-100 uppercase tracking-widest">
                        <CheckCircle className="h-3 w-3" /> Linked
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-xl font-black text-slate-900 group-hover:text-[#D27D50] transition-colors">
                    {platform.name}
                  </CardTitle>
                  <CardDescription className="text-stone-500 font-medium leading-relaxed min-h-[48px]">
                    {platform.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-8 pt-4 space-y-6">
                  {/* Linked Accounts List */}
                  {platformAccounts.length > 0 && (
                    <div className="space-y-3">
                      {platformAccounts.map((account) => (
                        <div key={account.id} className="p-4 rounded-2xl bg-[#F9FAF9] border border-[#D9E3D9] group/account hover:border-[#D27D50]/20 transition-all">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-8 w-8 rounded-xl bg-white flex items-center justify-center font-black text-xs text-stone-400 border border-[#D9E3D9]">
                                {account.metadata?.accountName?.[0] || 'A'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black text-slate-900 truncate">
                                  {account.metadata?.accountName || account.externalAccountId}
                                </p>
                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">
                                  {account.status}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg hover:bg-white text-stone-400 hover:text-[#D27D50]"
                                onClick={() => handleRefresh(platform.id, account.id)}
                                disabled={refreshingAccount === account.id}
                              >
                                <RefreshCw className={cn("h-3.5 w-3.5", refreshingAccount === account.id && "animate-spin")} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-600"
                                onClick={() => handleDisconnect(platform.id, account.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={() => isConfigured && connectMutation.mutate(platform.id)}
                    disabled={isConnecting || !isConfigured}
                    className={cn(
                      "w-full h-12 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                      platformAccounts.length > 0 
                        ? "bg-white text-slate-900 border-2 border-[#D9E3D9] hover:bg-[#F2F6F2] hover:border-[#D27D50]/30"
                        : cn(platform.color, platform.bg, "border border-transparent hover:brightness-95 shadow-sm"),
                      !isConfigured && "opacity-50 grayscale cursor-not-allowed"
                    )}
                  >
                    {isConnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" strokeWidth={3} />
                    )}
                    {platformAccounts.length > 0 ? "Link Another" : `Activate ${platform.name}`}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Selection Modal (Simplified & Modern) */}
      <AnimatePresence>
        {isSelectionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-md" 
              onClick={() => setIsSelectionModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl"
            >
              <Card className="rounded-[40px] border-none shadow-2xl overflow-hidden">
                <CardHeader className="p-10 pb-4">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6">
                    <ShieldCheck className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-3xl font-black text-slate-900 leading-tight">
                    Channels Discovered
                  </CardTitle>
                  <CardDescription className="text-lg font-medium text-stone-500 mt-2">
                    We found several entities on {selectionPlatform}. Which ones should we bring on board?
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-10 pt-4 space-y-8">
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {pendingAccounts.map((account) => {
                      const isSelected = selectedAccountIds.includes(account.id);
                      return (
                        <div 
                          key={account.id}
                          onClick={() => setSelectedAccountIds(prev => isSelected ? prev.filter(i => i !== account.id) : [...prev, account.id])}
                          className={cn(
                            "group/item flex items-center justify-between p-5 rounded-[24px] border-2 cursor-pointer transition-all",
                            isSelected ? "bg-[#F9EEE8] border-[#D27D50] shadow-md" : "bg-white border-[#F2F6F2] hover:border-[#D9E3D9]"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-white border border-[#D9E3D9] flex items-center justify-center font-black text-slate-400">
                              {account.name?.[0] || 'A'}
                            </div>
                            <div>
                              <p className="font-black text-slate-900">{account.name}</p>
                              {account.username && <p className="text-xs font-bold text-stone-400 uppercase tracking-tighter">@{account.username}</p>}
                            </div>
                          </div>
                          <div className={cn(
                            "h-7 w-7 rounded-xl border-2 flex items-center justify-center transition-all shadow-sm",
                            isSelected ? "bg-[#D27D50] border-[#D27D50] text-white" : "bg-white border-[#D9E3D9]"
                          )}>
                            {isSelected && <CheckCircle className="h-4 w-4" strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-4">
                    <Button 
                      variant="outline" 
                      className="h-14 flex-1 rounded-2xl font-black text-xs uppercase tracking-widest border-[#D9E3D9] text-stone-500"
                      onClick={() => setIsSelectionModalOpen(false)}
                    >
                      ABORT
                    </Button>
                    <Button 
                      className="h-14 flex-1 rounded-2xl bg-slate-900 font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all hover:-translate-y-1"
                      disabled={selectedAccountIds.length === 0 || isConfirming}
                      onClick={handleConfirmSelection}
                    >
                      {isConfirming ? <Loader2 className="h-5 w-5 animate-spin" /> : "FINALIZE INTEGRATION"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Support */}
      <div className="p-8 rounded-[40px] bg-white border border-[#D9E3D9] flex flex-col md:flex-row items-center gap-8 shadow-sm">
        <div className="h-16 w-16 rounded-[24px] bg-[#F2F6F2] flex items-center justify-center text-[#D27D50] shrink-0">
          <Zap className="h-8 w-8" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl font-black text-slate-900 mb-2">Need Technical Assistance?</h3>
          <p className="text-stone-500 font-medium leading-relaxed">
            Connection failures are often due to missing Meta Developer permissions or expired session cookies. 
            Ensure your platform credentials are correctly configured in your secure environment.
          </p>
        </div>
        <Button variant="outline" className="rounded-2xl h-12 px-8 font-black text-xs border-[#D9E3D9] hover:bg-[#F2F6F2]">
          READ GUIDE
        </Button>
      </div>
    </div>
  );
}
