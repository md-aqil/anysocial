'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn, formatDateTime, getPlatformColor } from '@/lib/utils';
import { Loader2, Plus, Trash2, Edit, FileText, Sparkles, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DraftsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['posts', 'DRAFT'],
    queryFn: () => api.posts.list({ status: 'DRAFT' }),
    refetchInterval: 10000, // Poll every 10 seconds
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.posts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const drafts = data?.posts || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-slate-500" />
            Content Drafts
          </h1>
          <p className="text-muted-foreground">Review and finalize your AI-generated or manual drafts</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/generate">
            <Button variant="outline">
              <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
              AI Generate
            </Button>
          </Link>
          <Link href="/dashboard/posts/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Draft
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-2 border-slate-100 shadow-xl">
        <CardHeader className="bg-slate-50/50 border-b">
          <CardTitle>Your Drafts</CardTitle>
          <CardDescription>
            {drafts.length} draft{drafts.length !== 1 ? 's' : ''} waiting to be published
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground italic">Fetching your creative library...</p>
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                <FileText className="h-10 w-10 text-slate-300" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-semibold">No drafts found</p>
                <p className="text-muted-foreground max-w-xs mx-auto">
                  Start by generating an AI ad or creating a manual post draft.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <Link href="/dashboard/generate">
                  <Button variant="outline">Try AI Generator</Button>
                </Link>
                <Link href="/dashboard/posts/new">
                  <Button>Create Manually</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-6">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="group flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border-2 border-transparent bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-lg transition-all"
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-1">
                        {draft.mediaUrls.slice(0, 1).map((url, i) => (
                          <div key={i} className="h-12 w-12 rounded-lg border-2 border-white overflow-hidden shadow-sm bg-slate-200">
                             <img src={url} alt="Draft" className="h-full w-full object-cover" />
                          </div>
                        ))}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">
                          {draft.title || draft.rawContent.slice(0, 60)}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          Created {formatDateTime(draft.createdAt)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex gap-1">
                        {draft.platforms.map((platform) => (
                          <span
                            key={platform}
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider',
                              getPlatformColor(platform)
                            )}
                          >
                            {platform}
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-slate-400">•</span>
                      <p className="text-xs text-slate-600 italic line-clamp-1">
                        "{draft.rawContent.slice(0, 100)}..."
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-4 md:mt-0 md:ml-6 group-hover:translate-x-[-4px] transition-transform">
                    <Link href={`/dashboard/posts/new?id=${draft.id}`}>
                      <Button variant="outline" size="sm" className="bg-white hover:bg-slate-50">
                        <Edit className="h-4 w-4 mr-2" />
                        Refine
                      </Button>
                    </Link>
                    <Link href={`/dashboard/posts/new?id=${draft.id}`}>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Send className="h-4 w-4 mr-2" />
                        Post
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                      onClick={() => {
                        if (confirm('Delete this draft permanently?')) {
                          deleteMutation.mutate(draft.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
