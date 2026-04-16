'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { Loader2, Plus, Trash2, TestTube, CheckCircle, XCircle } from 'lucide-react';

const eventOptions = [
  { value: 'post.published', label: 'Post Published' },
  { value: 'post.failed', label: 'Post Failed' },
  { value: 'post.viral', label: 'Post Viral' },
  { value: 'quota.warning', label: 'Quota Warning' },
];

export default function WebhooksPage() {
  const queryClient = useQueryClient();
  const [newUrl, setNewUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => api.webhooks.getSubscriptions(),
  });

  const { data: logsData } = useQuery({
    queryKey: ['webhooks-logs'],
    queryFn: () => api.webhooks.getLogs(10),
  });

  const createMutation = useMutation({
    mutationFn: () => api.webhooks.createSubscription({
      endpointUrl: newUrl,
      events: selectedEvents,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setNewUrl('');
      setSelectedEvents([]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.webhooks.deleteSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: () => api.webhooks.testEndpoint(testUrl),
    onSuccess: (result) => {
      setTestResult({
        success: result.success,
        message: result.success ? 'Test successful!' : `Failed: ${result.error}`,
      });
    },
  });

  const subscriptions = data?.subscriptions || [];
  const logs = logsData?.logs || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Webhooks</h1>
        <p className="text-muted-foreground">Configure webhook notifications</p>
      </div>

      {/* Create New Webhook */}
      <Card>
        <CardHeader>
          <CardTitle>Add Webhook</CardTitle>
          <CardDescription>Subscribe to receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="endpoint">Endpoint URL</Label>
            <Input
              id="endpoint"
              placeholder="https://your-server.com/webhook"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Events</Label>
            <div className="flex flex-wrap gap-4">
              {eventOptions.map((event) => (
                <label key={event.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEvents([...selectedEvents, event.value]);
                      } else {
                        setSelectedEvents(selectedEvents.filter((ev) => ev !== event.value));
                      }
                    }}
                    className="accent-primary"
                  />
                  <span>{event.label}</span>
                </label>
              ))}
            </div>
          </div>
          <Button 
            onClick={() => createMutation.mutate()} 
            disabled={!newUrl || selectedEvents.length === 0 || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Webhook
          </Button>
        </CardContent>
      </Card>

      {/* Active Webhooks */}
      <Card>
        <CardHeader>
          <CardTitle>Active Webhooks</CardTitle>
          <CardDescription>Your configured webhook endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No webhooks configured</p>
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((sub: any) => (
                <div key={sub.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{sub.endpointUrl}</p>
                    <div className="flex gap-2 mt-1">
                      {sub.events.map((event: string) => (
                        <span key={event} className="px-2 py-0.5 bg-muted rounded text-xs">
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={sub.isActive ? 'text-green-500' : 'text-gray-500'}>
                      {sub.isActive ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('Delete this webhook?')) {
                          deleteMutation.mutate(sub.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Endpoint */}
      <Card>
        <CardHeader>
          <CardTitle>Test Endpoint</CardTitle>
          <CardDescription>Send a test event to verify your webhook</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="https://your-server.com/webhook"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={() => testMutation.mutate()} 
              disabled={!testUrl || testMutation.isPending}
            >
              {testMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
            </Button>
          </div>
          {testResult && (
            <div className={testResult.success ? 'text-green-500' : 'text-red-500'}>
              {testResult.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Deliveries</CardTitle>
          <CardDescription>Webhook delivery history</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No deliveries yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="text-sm font-medium">{log.event}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()} • {log.attempts} attempts
                    </p>
                  </div>
                  <span className={log.status === 'SENT' ? 'text-green-500' : 'text-red-500'}>
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}