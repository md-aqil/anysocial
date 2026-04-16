const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;
  
  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...fetchOptions.headers,
  };

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'An error occurred' }));
    throw new ApiError(response.status, error.error || 'An error occurred');
  }

  return response.json();
}

export const api = {
  auth: {
    register: (data: { email: string; password: string; name?: string }) =>
      request<{ user: User; token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    login: (data: { email: string; password: string }) =>
      request<{ user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    me: () => request<User>('/api/auth/me'),

    logout: () =>
      request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),

    updateProfile: (data: { name?: string; avatarUrl?: string }) =>
      request<User>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      request<{ success: boolean }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  oauth: {
    getConfig: () =>
      request<{ configuredPlatforms: string[] }>('/oauth/config'),

    connect: (platform: string) =>
      request<{ authUrl: string; state: string }>(`/oauth/${platform}/connect`, {
        method: 'POST',
      }),

    getAccounts: () =>
      request<{ accounts: SocialAccount[] }>('/oauth/accounts'),

    getAccountStatus: (platform: string, id: string) =>
      request<SocialAccount>(`/oauth/${platform}/${id}/status`),

    refreshToken: (platform: string, id: string) =>
      request<{ success: boolean }>(`/oauth/${platform}/refresh/${id}`, {
        method: 'POST',
      }),

    revokeAccount: (platform: string, id: string) =>
      request<{ success: boolean }>(`/oauth/${platform}/${id}`, {
        method: 'DELETE',
      }),

    getPendingAccounts: (stateToken: string) =>
      request<{ platform: string; accounts: Array<{ id: string; name?: string; username?: string }> }>(
        `/oauth/pending/${stateToken}`
      ),

    confirmSelection: (stateToken: string, accountIds: string[]) =>
      request<{ success: boolean; accounts: SocialAccount[] }>(`/oauth/confirm/${stateToken}`, {
        method: 'POST',
        body: JSON.stringify({ accountIds }),
      }),
  },

  posts: {
    list: (params?: { status?: string; platform?: string; limit?: number; offset?: number }) =>
      request<{ posts: Post[] }>('/api/posts', { params: params as Record<string, string> }),

    get: (id: string) => request<Post>(`/api/posts/${id}`),

    create: async (data: CreatePostInput): Promise<Post> => {
      const formData = new FormData();
      const postData = {
        content: data.content,
        title: data.title || '',
        platforms: data.platforms,
        scheduledAt: data.scheduledAt || '',
        timezone: data.timezone,
        publishNow: data.publishNow
      };
      formData.append('data', JSON.stringify(postData));
      
      if (data.platformOptions) {
        formData.append('platformOptions', JSON.stringify(data.platformOptions));
      }

      if (data.media && data.media.length > 0) {
        data.media.forEach((file) => {
          formData.append('media', file);
        });
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch(`${API_BASE}/api/posts`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'An error occurred' }));
        throw new ApiError(response.status, error.error || 'An error occurred');
      }

      return response.json();
    },

    update: (id: string, data: Partial<CreatePostInput>) =>
      request<Post>(`/api/posts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request<{ success: boolean }>(`/api/posts/${id}`, {
        method: 'DELETE',
      }),

    preview: (data: { content: string; platform: string }) =>
      request<{ platform: string; originalContent: string; formattedContent: string }>('/api/posts/preview', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  analytics: {
    getSummary: (days: number = 7) =>
      request<any>(`/api/analytics/summary?days=${days}`),

    getPosts: (params?: { start?: string; end?: string }) => {
      const query = new URLSearchParams();
      if (params?.start) query.set('start', params.start);
      if (params?.end) query.set('end', params.end);
      return request<{ posts: any[] }>(`/api/analytics/posts?${query.toString()}`);
    },

    getPostAnalytics: (postId: string) =>
      request<any>(`/api/analytics/posts/${postId}`),

    refreshPostAnalytics: (postId: string) =>
      request<{ success: boolean; results: any[] }>(`/api/analytics/refresh/${postId}`, {
        method: 'POST',
      }),

    exportReport: async (start: string, end: string, format: 'csv' | 'json' | 'pdf') => {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/api/analytics/export?start=${start}&end=${end}&format=${format}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        }
      );
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      return response.blob();
    },
  },

  webhooks: {
    getSubscriptions: () =>
      request<{ subscriptions: any[] }>('/api/webhooks/subscriptions'),

    createSubscription: (data: { endpointUrl: string; events: string[] }) =>
      request<any>('/api/webhooks/subscriptions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    deleteSubscription: (id: string) =>
      request<{ success: boolean }>(`/api/webhooks/subscriptions/${id}`, {
        method: 'DELETE',
      }),

    testEndpoint: (endpointUrl: string) =>
      request<{ success: boolean; statusCode?: number; error?: string }>('/api/webhooks/test', {
        method: 'POST',
        body: JSON.stringify({ endpointUrl }),
      }),

    getLogs: (limit?: number, offset?: number) =>
      request<{ logs: any[] }>(`/api/webhooks/logs?limit=${limit || 20}&offset=${offset || 0}`),
  },

  notifications: {
    list: (limit: number = 20) =>
      request<any[]>(`/api/notifications?limit=${limit}`),

    markAsRead: (id: string) =>
      request<{ success: boolean }>(`/api/notifications/${id}/read`, {
        method: 'POST',
      }),

    markAllAsRead: () =>
      request<{ success: boolean }>('/api/notifications/read-all', {
        method: 'POST',
      }),
  },
  config: {
    getRules: () => request<Record<string, any>>('/api/config/platform-rules'),
    getPlatformRules: (platform: string) =>
      request<any>(`/api/config/platform-rules/${platform}`),
  },
};

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface SocialAccount {
  id: string;
  platform: string;
  externalAccountId: string;
  status: string;
  scopes: string[];
  createdAt: string;
  updatedAt: string;
  lastRefreshed?: string;
  tokenExpiry?: string;
  metadata?: any;
}

export interface Post {
  id: string;
  title: string | null;
  rawContent: string;
  mediaUrls: string[];
  platforms: string[];
  timezone: string;
  scheduledAt: string | null;
  status: string;
  platformResults: unknown[];
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformOptions {
  postType?: 'FEED' | 'REEL' | 'STORY';
  autoFix?: boolean;
  reelTitle?: string;
  location?: string;
  shareToFeed?: boolean;
}

export interface CreatePostInput {
  content: string;
  title?: string;
  platforms: string[];
  scheduledAt?: string;
  timezone: string;
  publishNow?: boolean;
  media?: File[];
  platformOptions?: Record<string, PlatformOptions>;
}