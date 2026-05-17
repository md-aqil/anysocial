'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import {
  Bell,
  BarChart3,
  Grid2X2,
  FileText,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Share2,
  Star,
  X,
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Grid2X2 },
  { name: 'New Post', href: '/dashboard/posts/new', icon: Plus },
  { name: 'Post Library', href: '/dashboard/posts', icon: FileText },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Channels', href: '/dashboard/social-accounts', icon: Share2 },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-[#F2F6F2] text-[#2F281F]">
      {/* Mobile sidebar */}
      <div className="lg:hidden">
        {sidebarOpen && (
          <div className="fixed inset-0 z-50">
            <div
              className="fixed inset-0 bg-stone-900/30 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 w-[240px] max-w-[86vw] border-r border-[#D9E3D9] bg-white p-4 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <Brand />
                <Button variant="ghost" size="icon" className="text-stone-500 hover:bg-[#F0F4F0]" onClick={() => setSidebarOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
                          isActive
                            ? 'bg-[#F9EEE8] text-[#D9774B]'
                            : 'text-[#7B746D] hover:bg-[#F7FAF7] hover:text-[#2F281F]'
                        )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
              <div className="absolute bottom-4 left-4 right-4">
                <Button variant="outline" className="w-full border-[#D9E3D9] bg-white text-[#C26032] hover:bg-[#F0F4F0]" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-[220px] lg:flex-col">
          <div className="flex flex-1 flex-col border-r border-[#D9E3D9] bg-white">
          <div className="flex h-16 items-center border-b border-[#D9E3D9] px-6">
            <Brand />
          </div>
          <nav className="flex-1 space-y-2 px-3 py-6">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href === '/dashboard/posts' && pathname === '/dashboard/drafts');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'relative flex min-h-[40px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition',
                    isActive
                      ? 'bg-[#F9EEE8] text-[#D9774B]'
                      : 'text-[#817A73] hover:bg-[#F7FAF7] hover:text-[#2F281F]'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                  <span className="truncate">{item.name}</span>
                  {isActive && <span className="ml-auto h-2 w-2 rounded-full bg-[#D9774B]" />}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-[#D9E3D9] px-3 py-5">
            <Link href="/dashboard" className="mb-4 flex min-h-[36px] items-center gap-3 px-3 text-sm font-medium text-[#817A73] hover:text-[#2F281F]">
              <Settings className="h-4 w-4" strokeWidth={1.8} />
              Settings
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="mb-6 flex min-h-[36px] w-full items-center gap-3 px-3 text-left text-sm font-medium text-[#C26032] hover:text-[#A64D22]"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.8} />
              Log Out
            </button>
            <div className="flex items-center gap-3 rounded-xl bg-[#F1F5F1] p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#D27D50] text-sm font-bold text-white">
                {user?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold leading-tight text-[#3C342C]">{user?.name || 'Alex Rivera'}</p>
                <p className="text-[13px] leading-tight text-[#AAA39D]">Premium Plan</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-[220px]">
        <div className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-[#D9E3D9] bg-white px-4 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="text-stone-600 hover:bg-[#F0F4F0] lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden items-center gap-3 text-[16px] font-medium lg:flex">
            <Link href="/dashboard/posts" className="text-[#AAA39D]">Posts</Link>
            <span className="text-[#D9E3D9]">›</span>
            <span className="font-bold text-[#3C342C]">Create New</span>
          </div>
        </div>
        <main>{children}</main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-32 items-center justify-start overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="SocialSched" className="h-full w-auto object-contain" />
      </div>
    </div>
  );
}
