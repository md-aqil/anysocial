'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import {
  Bell,
  BarChart3,
  Calendar,
  Grid2X2,
  FileText,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Share2,
  Star,
  Users,
  X,
  List,
  Wand2,
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Grid2X2 },
  { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
  { name: 'New Post', href: '/dashboard/posts/new', icon: Plus },
  { name: 'Post Library', href: '/dashboard/posts', icon: FileText },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Reel Creator', href: '/dashboard/reels-creator', icon: Star },
  { name: 'Ad/Post Creator', href: '/dashboard/post-creator', icon: Wand2 },
  { name: 'Channels', href: '/dashboard/social-accounts', icon: Share2 },
  { name: 'Feed Curation', href: '/dashboard/curation', icon: List },
  { name: 'Image Playground', href: '/dashboard/playground', icon: Grid2X2, adminOnly: true, superAdminOnly: true },
  { name: 'Users', href: '/dashboard/users', icon: Users, adminOnly: true },
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
            <div className="fixed inset-y-0 left-0 z-50 w-[240px] max-w-[86vw] border-r border-stone-100 bg-white/95 backdrop-blur-xl p-4 shadow-[0_0_40px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between mb-6">
                <Brand />
                <Button variant="ghost" size="icon" className="text-stone-400 hover:bg-stone-50 hover:text-stone-700" onClick={() => setSidebarOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="space-y-1">
                {navigation.filter(item => {
                  if (item.superAdminOnly && user?.role !== 'super_admin') return false;
                  if (item.adminOnly && !['super_admin', 'admin'].includes(user?.role || '')) return false;
                  return true;
                }).map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                          'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-300',
                          isActive
                            ? 'bg-gradient-to-r from-[#FBF3EE] to-white border border-[#D27D50]/10 shadow-[0_4px_20px_rgba(210,125,80,0.08)] text-[#D27D50]'
                            : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
                        )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
              <div className="absolute bottom-4 left-4 right-4">
                <Button variant="outline" className="w-full border-stone-100 bg-white text-[#C26032] hover:bg-[#FBF3EE] hover:border-[#D27D50]/20 rounded-2xl h-11 transition-all font-semibold shadow-sm" onClick={handleLogout}>
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
          <div className="flex flex-1 flex-col border-r border-stone-100 bg-white shadow-[4px_0_24px_rgba(0,0,0,0.01)] relative z-20">
          <div className="flex h-16 items-center border-b border-stone-50 px-6">
            <Brand />
          </div>
          <nav className="flex-1 space-y-2 px-3 py-6">
            {navigation.filter(item => {
                  if (item.superAdminOnly && user?.role !== 'super_admin') return false;
                  if (item.adminOnly && !['super_admin', 'admin'].includes(user?.role || '')) return false;
                  return true;
                }).map((item) => {
              const isActive = pathname === item.href || (item.href === '/dashboard/posts' && pathname === '/dashboard/drafts');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'relative flex min-h-[44px] items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition-all duration-300',
                    isActive
                      ? 'bg-gradient-to-r from-[#FBF3EE] to-white border border-[#D27D50]/10 shadow-[0_4px_20px_rgba(210,125,80,0.08)] text-[#D27D50]'
                      : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                  <span className="truncate">{item.name}</span>
                  {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#D27D50] shadow-[0_0_8px_rgba(210,125,80,0.6)]" />}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-stone-50 px-3 py-5 bg-gradient-to-t from-stone-50/50 to-white">
            <Link href="/dashboard" className="mb-4 flex min-h-[40px] items-center gap-3 px-3 text-sm font-semibold text-stone-500 hover:text-stone-800 rounded-2xl hover:bg-stone-50 transition-colors">
              <Settings className="h-4 w-4" strokeWidth={2} />
              Settings
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="mb-6 flex min-h-[40px] w-full rounded-2xl items-center gap-3 px-3 text-left text-sm font-semibold text-red-500 hover:bg-red-50/50 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
              Log Out
            </button>
            <div className="flex items-center gap-3 rounded-2xl bg-white border border-stone-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)] p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-[#D27D50] to-[#E8A583] shadow-inner text-sm font-black text-white tracking-widest">
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
        <div className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-white/50 bg-white/70 backdrop-blur-2xl px-4 lg:px-8 shadow-[0_4px_30px_rgba(0,0,0,0.01)]">
          <Button
            variant="ghost"
            size="icon"
            className="text-stone-500 hover:bg-stone-50 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden items-center gap-3 text-[16px] font-medium lg:flex">
            <Link href="/dashboard/posts" className="text-[#AAA39D]">Posts</Link>
            <span className="text-[#D9E3D9]">›</span>
            <span className="font-bold text-[#3C342C]">Create New</span>
          </div>
          <div className="ml-auto flex items-center">
            <Link 
              href="/privacy-policy" 
              className="text-sm font-bold text-[#AAA39D] transition-colors hover:text-[#D27D50]"
            >
              Privacy Policy
            </Link>
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
