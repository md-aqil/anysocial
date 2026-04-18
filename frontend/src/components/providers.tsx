'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { ThemeProvider } from 'next-themes';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { checkAuth, isAuthenticated, isLoading } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!mounted || isLoading) return;
    
    const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/signup');
    const isHomePage = pathname === '/';
    const isPublicPage = isHomePage || pathname?.startsWith('/privacy');
    
    if (!isAuthenticated && !isAuthPage && !isPublicPage) {
      router.push('/login');
    } else if (isAuthenticated && isAuthPage) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, pathname, router, mounted]);

  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}