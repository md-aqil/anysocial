'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api, SocialAccount } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle, XCircle, AlertCircle, Plus, RefreshCw, Trash2, ExternalLink, Settings } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface PlatformConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  hoverColor: string;
  description: string;
}

const platforms: PlatformConfig[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📷',
    color: 'bg-gradient-to-br from-purple-500 to-pink-500',
    hoverColor: 'hover:from-purple-600 hover:to-pink-600',
    description: 'Connect your Instagram account to post photos and videos'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: '👥',
    color: 'bg-blue-600',
    hoverColor: 'hover:bg-blue-700',
    description: 'Share content on your Facebook page or profile'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    color: 'bg-blue-600',
    hoverColor: 'hover:bg-blue-700',
    description: 'Share professional content on your LinkedIn profile'
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: '🐦',
    color: 'bg-black',
    hoverColor: 'hover:bg-gray-800',
    description: 'Post tweets and engage with your Twitter audience'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    color: 'bg-black',
    hoverColor: 'hover:bg-gray-800',
    description: 'Share your TikTok videos with your followers'
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: '🎥',
    color: 'bg-red-600',
    hoverColor: 'hover:bg-red-700',
    description: 'Upload and manage your YouTube videos'
  },
  {
    id: 'threads',
    name: 'Threads',
    icon: '🧵',
    color: 'bg-black',
    hoverColor: 'hover:bg-gray-800',
    description: 'Share text and media on Threads'
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    icon: '📌',
    color: 'bg-red-600',
    hoverColor: 'hover:bg-red-700',
    description: 'Pin your ideas and images to your Pinterest boards'
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    icon: '👻',
    color: 'bg-yellow-400',
    hoverColor: 'hover:bg-yellow-500',
    description: 'Post Stories and Spotlight content to your Snapchat Public Profile'
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

  // Selection state
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
      setSuccessMessage('Account connected successfully!');
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
      setSelectedAccountIds(data.accounts.map((a: any) => a.id)); // Select all by default
    } catch (err: any) {
      setError('Failed to fetch discovered accounts');
      setIsSelectionModalOpen(false);
    }
  };

  const handleConfirmSelection = async () => {
    if (!selectionStateToken || selectedAccountIds.length === 0) return;
    
    setIsConfirming(true);
    try {
      await api.oauth.confirmSelection(selectionStateToken, selectedAccountIds);
      setSuccessMessage(`Successfully connected ${selectedAccountIds.length} accounts!`);
      setIsSelectionModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
    } catch (err: any) {
      setError(err.message || 'Failed to confirm selection');
    } finally {
      setIsConfirming(false);
    }
  };

  const toggleAccountSelection = (id: string) => {
    setSelectedAccountIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
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
      const errorMessage = err?.message || err?.response?.data?.error || 'Failed to connect';
      setError(errorMessage);
      setTimeout(() => setError(null), 30000);
    },
  });

  const refreshMutation = useMutation({
    mutationFn: ({ platform, id }: { platform: string; id: string }) =>
      api.oauth.refreshToken(platform, id),
    onMutate: ({ id }) => {
      setRefreshingAccount(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
    },
    onError: () => {
      setRefreshingAccount(null);
    },
    onSettled: () => {
      setRefreshingAccount(null);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: ({ platform, id }: { platform: string; id: string }) =>
      api.oauth.revokeAccount(platform, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
    },
  });

  const accounts = data?.accounts || [];

  const getAccountsForPlatform = (platformId: string) => {
    return accounts.filter(
      (account) =>
        account.platform.toLowerCase() === platformId.toLowerCase() &&
        account.status !== 'REVOKED'
    );
  };

  const handleConnect = (platformId: string) => {
    connectMutation.mutate(platformId);
  };

  const handleRefresh = (platform: string, id: string) => {
    refreshMutation.mutate({ platform, id });
  };

  const handleDisconnect = (platform: string, id: string) => {
    if (confirm('Are you sure you want to disconnect this account? You will need to re-authorize to connect it again.')) {
      revokeMutation.mutate({ platform, id });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'EXPIRED':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'REVOKED':
        return <XCircle className="h-5 w-5 text-gray-500" />;
      case 'ERROR':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return 'text-green-500';
      case 'EXPIRED':
        return 'text-yellow-500';
      case 'REVOKED':
        return 'text-gray-500';
      case 'ERROR':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return 'Connected';
      case 'EXPIRED':
        return 'Token Expired';
      case 'REVOKED':
        return 'Revoked';
      case 'ERROR':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 lg:p-8">
      {/* Account Selection Modal */}
      {isSelectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-lg shadow-2xl border-purple-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-purple-500" />
                Select Accounts to Connect
              </CardTitle>
              <CardDescription>
                We found multiple {selectionPlatform || 'social'} accounts. 
                Please select the ones you want to manage in Anyshare.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {pendingAccounts.map((account) => (
                  <div 
                    key={account.id}
                    onClick={() => toggleAccountSelection(account.id)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all",
                      selectedAccountIds.includes(account.id) 
                        ? "border-purple-600 bg-purple-50/50 dark:bg-purple-950/20" 
                        : "border-transparent bg-muted/50 hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                        {account.name?.[0] || 'A'}
                      </div>
                      <div>
                        <p className="font-semibold">{account.name}</p>
                        {account.username && (
                          <p className="text-xs text-muted-foreground">@{account.username}</p>
                        )}
                      </div>
                    </div>
                    <div className={cn(
                      "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
                      selectedAccountIds.includes(account.id)
                        ? "bg-purple-600 border-purple-600 text-white"
                        : "border-muted-foreground/30"
                    )}>
                      {selectedAccountIds.includes(account.id) && <CheckCircle className="h-4 w-4" />}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsSelectionModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={selectedAccountIds.length === 0 || isConfirming}
                  onClick={handleConfirmSelection}
                >
                  {isConfirming ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Connect {selectedAccountIds.length} Accounts
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900 dark:text-red-100">
                Connection Failed
              </h3>
              <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">
                Success
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                {successMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-center flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Connect Social Accounts</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-2">
            Link your social media accounts to schedule and publish content across multiple platforms.
            Click on any platform below to connect it instantly.
          </p>
        </div>
        <Link href="/dashboard/social-accounts">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Detailed View
          </Button>
        </Link>
      </div>

      {/* Platform Connection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platforms.map((platform) => {
          const platformAccounts = getAccountsForPlatform(platform.id);
          const hasAnyConnected = platformAccounts.some(a => a.status === 'CONNECTED');
          const hasAnyIssue = platformAccounts.some(a => a.status === 'EXPIRED' || a.status === 'ERROR');
          const isConnecting = connectingPlatform === platform.id;
          const isConfigured = configData?.configuredPlatforms?.includes(platform.id.toUpperCase()) ?? true;

          // Derive card-level border from worst status
          const cardBorderClass = hasAnyConnected
            ? 'border-green-500 shadow-sm'
            : hasAnyIssue
            ? platformAccounts.some(a => a.status === 'ERROR') ? 'border-red-500' : 'border-yellow-500'
            : '';

          const indicatorClass = hasAnyConnected
            ? 'bg-green-500'
            : platformAccounts.some(a => a.status === 'ERROR')
            ? 'bg-red-500'
            : platformAccounts.some(a => a.status === 'EXPIRED')
            ? 'bg-yellow-500'
            : null;

          return (
            <Card
              key={platform.id}
              className={cn(
                'relative overflow-hidden transition-all duration-200',
                cardBorderClass
              )}
            >
              {/* Status indicator bar */}
              {indicatorClass && (
                <div className={cn('absolute top-0 left-0 right-0 h-1', indicatorClass)} />
              )}

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'h-12 w-12 rounded-lg flex items-center justify-center text-2xl text-white transition-all',
                        platform.color,
                        !hasAnyConnected && platform.hoverColor
                      )}
                    >
                      {platform.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{platform.name}</CardTitle>
                      {platformAccounts.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {platformAccounts.length} account{platformAccounts.length > 1 ? 's' : ''} connected
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{platform.description}</p>

                {/* Per-account rows */}
                {platformAccounts.length > 0 && (
                  <div className="space-y-3">
                    {platformAccounts.map((connectedAccount) => {
                      const isAccountConnected = connectedAccount.status === 'CONNECTED';
                      const isAccountExpired = connectedAccount.status === 'EXPIRED';
                      const isAccountError = connectedAccount.status === 'ERROR';
                      const accountName = connectedAccount.metadata?.accountName || connectedAccount.externalAccountId;

                      return (
                        <div key={connectedAccount.id} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{accountName}</p>
                              <div className={cn('flex items-center gap-1 mt-0.5', getStatusColor(connectedAccount.status))}>
                                {getStatusIcon(connectedAccount.status)}
                                <span className="text-xs">{getStatusText(connectedAccount.status)}</span>
                              </div>
                            </div>
                          </div>

                          {(isAccountExpired || isAccountError) && (
                            <div className="p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-200">
                              {isAccountExpired
                                ? 'Token expired — please reconnect.'
                                : 'Connection error — please reconnect.'}
                            </div>
                          )}

                          <div className="flex gap-2">
                            {isAccountConnected && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs"
                                onClick={() => handleRefresh(platform.id.toLowerCase(), connectedAccount.id)}
                                disabled={refreshingAccount === connectedAccount.id}
                              >
                                {refreshingAccount === connectedAccount.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                )}
                                Refresh
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDisconnect(platform.id.toLowerCase(), connectedAccount.id)}
                              disabled={revokeMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Disconnect
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Connect / Add another button */}
                {platformAccounts.length === 0 ? (
                  <Button
                    className={cn(
                      'w-full',
                      isConfigured
                        ? cn(platform.color, platform.hoverColor)
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-800'
                    )}
                    onClick={() => isConfigured && handleConnect(platform.id)}
                    disabled={isConnecting || !isConfigured}
                    title={!isConfigured ? 'Platform credentials not configured by administrator' : ''}
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        {isConfigured ? `Connect ${platform.name}` : 'Not Configured'}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => isConfigured && handleConnect(platform.id)}
                    disabled={isConnecting || !isConfigured}
                  >
                    {isConnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Add Another Account
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connected Accounts Summary */}
      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Connected Accounts Summary</CardTitle>
            <CardDescription>
              Overview of all your connected social media accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {accounts.map((account) => {
                const platformConfig = platforms.find(
                  (p) => p.id.toLowerCase() === account.platform.toLowerCase()
                );
                return (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'h-10 w-10 rounded-lg flex items-center justify-center text-xl text-white',
                          platformConfig?.color || 'bg-gray-500'
                        )}
                      >
                        {platformConfig?.icon || '🔗'}
                      </div>
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          {account.platform}
                          {account.metadata?.accountName && <span className="text-xs text-muted-foreground ml-1">({account.metadata.accountName})</span>}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ID: {account.externalAccountId}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={cn('flex items-center gap-1.5', getStatusColor(account.status))}>
                        {getStatusIcon(account.status)}
                        <span className="text-sm font-medium">
                          {getStatusText(account.status)}
                        </span>
                      </div>
                      {account.status === 'CONNECTED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleRefresh(account.platform.toLowerCase(), account.id)
                          }
                          disabled={refreshingAccount === account.id}
                        >
                          {refreshingAccount === account.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <ExternalLink className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Need help connecting your accounts?
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Make sure you have created developer applications for each platform and configured
                the OAuth credentials in your environment variables. Each platform requires specific
                permissions to be granted during the connection process.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
