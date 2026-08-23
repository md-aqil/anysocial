'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export default function HermesAgentRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/hermes-connection?tab=tasks');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-64 text-stone-500 space-y-3">
      <RefreshCw className="w-8 h-8 animate-spin text-[#D27D50]" />
      <p className="text-sm font-medium">Redirecting to unified AI Agent & MCP Control Panel...</p>
    </div>
  );
}
