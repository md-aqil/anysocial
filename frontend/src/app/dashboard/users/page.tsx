'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, ShieldCheck, User as UserIcon, Calendar, Share2, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function UsersPage() {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<{ users: any[] }>({
    queryKey: ['admin-users'],
    queryFn: () => api.admin.getUsers(),
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#D27D50]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="rounded-full bg-rose-100 p-4">
          <ShieldCheck className="h-8 w-8 text-rose-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
        <p className="text-stone-500">You do not have permission to view this page.</p>
      </div>
    );
  }

  const users = data?.users || [];

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-10 space-y-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2 w-2 rounded-full bg-[#D27D50] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">Platform Administration</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Registered Users</h1>
          <p className="mt-4 text-lg text-stone-500 font-medium leading-relaxed">
            Manage and oversee all accounts connected to the SocialSched platform.
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-3xl border border-[#D9E3D9] shadow-sm">
          <div className="h-12 w-12 rounded-2xl bg-[#F9EEE8] flex items-center justify-center text-[#D27D50]">
            <Users className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <div className="pr-4 border-l border-[#D9E3D9] pl-4">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-wider">Total Users</p>
            <p className="text-xl font-bold text-slate-900">{users.length}</p>
          </div>
        </div>
      </div>

      <Card className="border-[#D9E3D9] shadow-sm overflow-hidden bg-white rounded-[32px]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F9FAF9] text-xs font-black uppercase tracking-wider text-stone-500 border-b border-[#D9E3D9]">
              <tr>
                <th className="px-8 py-5">User</th>
                <th className="px-8 py-5">Role</th>
                <th className="px-8 py-5">Engagement</th>
                <th className="px-8 py-5">Joined</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F6F2]">
              {users.map((user, idx) => (
                <React.Fragment key={user.id}>
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="hover:bg-[#FCFDFC] transition-colors cursor-pointer"
                  onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-[#F2F6F2] border border-[#D9E3D9] flex items-center justify-center font-black text-slate-400 text-lg">
                        {user.name?.[0] || user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-base">{user.name || 'Unknown User'}</p>
                        <p className="text-stone-500 font-medium">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border",
                      user.role === 'super_admin' ? "bg-purple-50 text-purple-700 border-purple-200" :
                      user.role === 'admin' ? "bg-blue-50 text-blue-700 border-blue-200" :
                      "bg-stone-50 text-stone-600 border-stone-200"
                    )}>
                      {user.role === 'super_admin' ? <ShieldCheck className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1.5 text-stone-500">
                        <Share2 className="h-4 w-4" />
                        <span className="font-bold">{user._count.socialAccounts}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-stone-500">
                        <FileText className="h-4 w-4" />
                        <span className="font-bold">{user._count.posts}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-stone-500 font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedUserId(expandedUserId === user.id ? null : user.id);
                      }}
                      className="p-2 hover:bg-stone-100 rounded-full transition-colors inline-flex items-center justify-center text-stone-500"
                    >
                      {expandedUserId === user.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </td>
                </motion.tr>
                {expandedUserId === user.id && (
                  <tr>
                    <td colSpan={5} className="bg-[#FAFCFA] p-0 border-b border-[#D9E3D9]">
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-8"
                      >
                        <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Connected Social Accounts</h4>
                        {user.socialAccounts && user.socialAccounts.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {user.socialAccounts.map((account: any) => (
                              <div key={account.id} className="bg-white border border-[#D9E3D9] p-4 rounded-2xl flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-[#F2F6F2] flex items-center justify-center text-stone-500 font-bold">
                                  {account.platform.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-bold text-sm text-slate-900">{account.platform}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={cn(
                                      "h-2 w-2 rounded-full",
                                      account.status === 'CONNECTED' ? "bg-green-500" : "bg-rose-500"
                                    )} />
                                    <span className="text-xs font-medium text-stone-500">{account.status}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-stone-500 text-sm">No social accounts connected.</div>
                        )}
                      </motion.div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="p-12 text-center text-stone-500">
              No users found.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
