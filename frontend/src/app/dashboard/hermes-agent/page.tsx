'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import {
  Bot,
  Send,
  Calendar,
  Plus,
  Play,
  Square,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Activity,
  Settings,
  Zap,
  BarChart3,
  List,
  ChevronRight,
  AlertTriangle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
type TaskAction = 'schedule_post' | 'generate_content' | 'create_campaign' | 'analyze_accounts' | 'monitor_health' | 'bulk_schedule' | 'custom';

interface HermesTask {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: TaskStatus;
  priority: string;
  payload: any;
  result: any;
  error: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface HermesExecution {
  id: string;
  taskId: string;
  agentId: string;
  agentName: string;
  action: string;
  input: any;
  output: any;
  status: string;
  duration: number | null;
  error: string | null;
  createdAt: string;
}

interface HermesStatus {
  agentId: string;
  agentName: string;
  status: string;
  uptime: number;
  stats: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
}

const ACTION_OPTIONS: { value: TaskAction; label: string; description: string; icon: any }[] = [
  { value: 'schedule_post', label: 'Schedule Post', description: 'Create and schedule a social media post', icon: Calendar },
  { value: 'generate_content', label: 'Generate Content', description: 'Generate AI content from a prompt', icon: Zap },
  { value: 'create_campaign', label: 'Create Campaign', description: 'Set up an automated campaign', icon: BarChart3 },
  { value: 'analyze_accounts', label: 'Analyze Accounts', description: 'Analyze connected social accounts', icon: Activity },
  { value: 'monitor_health', label: 'Monitor Health', description: 'Check system and post health', icon: Settings },
  { value: 'bulk_schedule', label: 'Bulk Schedule', description: 'Schedule multiple posts at once', icon: List },
  { value: 'custom', label: 'Custom Command', description: 'Execute a custom Hermes command', icon: Bot },
];

const STATUS_COLORS: Record<TaskStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  RUNNING: 'bg-blue-50 text-blue-700 border-blue-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-stone-100 text-stone-600 border-stone-200',
};

const STATUS_ICONS: Record<TaskStatus, any> = {
  PENDING: Clock,
  RUNNING: Loader2,
  COMPLETED: CheckCircle2,
  FAILED: XCircle,
  CANCELLED: Square,
};

export default function HermesAgentPage() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<HermesTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<HermesTask | null>(null);
  const [executions, setExecutions] = useState<HermesExecution[]>([]);
  const [status, setStatus] = useState<HermesStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'create' | 'status'>('tasks');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Form state
  const [selectedAction, setSelectedAction] = useState<TaskAction>('schedule_post');
  const [customPrompt, setCustomPrompt] = useState('');
  const [formData, setFormData] = useState({
    content: '',
    title: '',
    platforms: '',
    scheduledAt: '',
    timezone: 'UTC',
    postType: 'FEED',
    customPrompt: '',
    websiteUrl: '',
    campaignSchedule: 'daily',
    voiceId: 'Aoede',
    language: 'English',
    niche: '',
    targetRegion: 'Global',
    count: 1,
    intervalHours: 24,
    priority: 'NORMAL',
    bulkPosts: ''
  });

  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'super_admin') return;
    fetchTasks();
    fetchStatus();
    
    refreshInterval.current = setInterval(() => {
      fetchTasks();
      fetchStatus();
      setLastRefresh(new Date());
    }, 10000);

    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current);
    };
  }, [user]);

  const fetchTasks = async () => {
    try {
      const res = await api.hermes.getTasks({ limit: 50 });
      setTasks(res.tasks || []);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await api.hermes.getStatus();
      setStatus(res);
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  };

  const fetchTaskDetails = async (taskId: string) => {
    try {
      const [taskRes, execRes] = await Promise.all([
        api.hermes.getTask(taskId),
        api.hermes.getExecutions(taskId)
      ]);
      setSelectedTask(taskRes.task);
      setExecutions(execRes.executions || []);
    } catch (err) {
      console.error('Failed to fetch task details:', err);
    }
  };

  const handleCreateTask = async () => {
    setActionLoading(true);
    try {
      const payload: any = {
        action: selectedAction,
        priority: formData.priority
      };

      if (selectedAction === 'schedule_post') {
        if (!formData.content) throw new Error('Content is required');
        payload.content = formData.content;
        payload.title = formData.title;
        payload.platforms = formData.platforms.split(',').map((p: string) => p.trim()).filter(Boolean);
        payload.scheduledAt = formData.scheduledAt || undefined;
        payload.timezone = formData.timezone;
        payload.platformOptions = { postType: formData.postType };
      } else if (selectedAction === 'generate_content') {
        if (!formData.customPrompt) throw new Error('Prompt is required');
        payload.prompt = formData.customPrompt;
      } else if (selectedAction === 'create_campaign') {
        if (!formData.websiteUrl) throw new Error('Website URL is required');
        payload.websiteUrl = formData.websiteUrl;
        payload.campaignSchedule = formData.campaignSchedule;
        payload.socialChannels = [];
        payload.language = formData.language;
        payload.voiceId = formData.voiceId;
        payload.niche = formData.niche;
        payload.targetRegion = formData.targetRegion;
      } else if (selectedAction === 'custom') {
        if (!customPrompt) throw new Error('Custom prompt is required');
        payload.prompt = customPrompt;
      } else if (selectedAction === 'bulk_schedule') {
        payload.posts = formData.bulkPosts.split('\n').filter((line: string) => line.trim()).map((line: string) => {
          const [content, ...rest] = line.split('|');
          return {
            content: content.trim(),
            platforms: formData.platforms.split(',').map((p: string) => p.trim()).filter(Boolean),
            scheduledAt: formData.scheduledAt || undefined,
            timezone: formData.timezone
          };
        });
        payload.count = formData.count;
        payload.intervalHours = formData.intervalHours;
      } else if (selectedAction === 'analyze_accounts' || selectedAction === 'monitor_health') {
        // No additional payload needed
      }

      const task = await api.hermes.createTask(payload);
      
      // Auto-execute
      const result = await api.hermes.executeTask(task.task.id);
      
      await fetchTasks();
      fetchStatus();
      setActiveTab('tasks');
      
      // Reset form
      setFormData({
        content: '',
        title: '',
        platforms: '',
        scheduledAt: '',
        timezone: 'UTC',
        postType: 'FEED',
        customPrompt: '',
        websiteUrl: '',
        campaignSchedule: 'daily',
        voiceId: 'Aoede',
        language: 'English',
        niche: '',
        targetRegion: 'Global',
        count: 1,
        intervalHours: 24,
        priority: 'NORMAL',
        bulkPosts: ''
      });
      setCustomPrompt('');
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteTask = async (taskId: string) => {
    setActionLoading(true);
    try {
      const result = await api.hermes.executeTask(taskId);
      await fetchTasks();
      if (selectedTask?.id === taskId) {
        fetchTaskDetails(taskId);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to execute task');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      await api.hermes.cancelTask(taskId);
      await fetchTasks();
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
        setExecutions([]);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to cancel task');
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-stone-500 font-medium">Access Denied: Superadmin only.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col relative">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-black text-[#2F281F] tracking-tight flex items-center gap-2">
            <Bot className="w-8 h-8 text-[#D27D50]" /> Hermes Agent
          </h1>
          <p className="text-[#AAA39D] font-medium text-sm">Autonomous AI agent for scheduling, content creation, and platform control.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-400">
            Last refreshed: {lastRefresh.toLocaleTimeString()}
          </span>
          <Button variant="outline" size="sm" onClick={() => { fetchTasks(); fetchStatus(); setLastRefresh(new Date()); }}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 flex gap-2 border-b border-stone-100 flex-shrink-0">
        {[
          { id: 'tasks', label: 'Tasks', icon: List },
          { id: 'create', label: 'Create Task', icon: Plus },
          { id: 'status', label: 'Agent Status', icon: Activity }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all border-b-2',
              activeTab === tab.id
                ? 'border-[#D27D50] text-[#D27D50]'
                : 'border-transparent text-stone-400 hover:text-stone-600'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === 'tasks' && tasks.length > 0 && (
              <span className="bg-stone-100 text-stone-600 text-xs px-2 py-0.5 rounded-full">{tasks.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {activeTab === 'tasks' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Task List */}
            <div className="w-1/2 border-r border-stone-100 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-20 text-stone-400">
                  <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No tasks yet. Create one to get started.</p>
                </div>
              ) : (
                tasks.map(task => {
                  const StatusIcon = STATUS_ICONS[task.status as TaskStatus] || Clock;
                  return (
                    <div
                      key={task.id}
                      onClick={() => { setSelectedTask(task); fetchTaskDetails(task.id); }}
                      className={cn(
                        'p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-md',
                        selectedTask?.id === task.id
                          ? 'border-[#D27D50]/30 shadow-[0_4px_20px_rgba(210,125,80,0.08)] bg-white'
                          : 'border-stone-100 bg-white hover:border-stone-200'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-sm text-[#2F281F] truncate">{task.name}</h3>
                            <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', STATUS_COLORS[task.status as TaskStatus])}>
                              {task.status}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 line-clamp-2">{task.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
                            <span className="font-medium">{task.type}</span>
                            <span>•</span>
                            <span>{new Date(task.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                        <StatusIcon className={cn('w-5 h-5 flex-shrink-0', task.status === 'RUNNING' && 'animate-spin')} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Task Detail */}
            <div className="w-1/2 overflow-y-auto p-4">
              {selectedTask ? (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-stone-100 p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-bold text-[#2F281F]">{selectedTask.name}</h2>
                        <p className="text-sm text-stone-500 mt-1">{selectedTask.description}</p>
                      </div>
                      <span className={cn('text-xs px-3 py-1 rounded-full border font-medium', STATUS_COLORS[selectedTask.status as TaskStatus])}>
                        {selectedTask.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-stone-50 rounded-xl p-3">
                        <p className="text-xs text-stone-400 font-medium mb-1">Type</p>
                        <p className="text-sm font-bold text-stone-800">{selectedTask.type}</p>
                      </div>
                      <div className="bg-stone-50 rounded-xl p-3">
                        <p className="text-xs text-stone-400 font-medium mb-1">Priority</p>
                        <p className="text-sm font-bold text-stone-800">{selectedTask.priority}</p>
                      </div>
                      <div className="bg-stone-50 rounded-xl p-3">
                        <p className="text-xs text-stone-400 font-medium mb-1">Created</p>
                        <p className="text-sm font-bold text-stone-800">{new Date(selectedTask.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="bg-stone-50 rounded-xl p-3">
                        <p className="text-xs text-stone-400 font-medium mb-1">Scheduled</p>
                        <p className="text-sm font-bold text-stone-800">{selectedTask.scheduledAt ? new Date(selectedTask.scheduledAt).toLocaleString() : '-'}</p>
                      </div>
                    </div>

                    {selectedTask.payload && (
                      <div className="mb-4">
                        <p className="text-xs text-stone-400 font-medium mb-2">Payload</p>
                        <pre className="bg-stone-50 rounded-xl p-3 text-xs text-stone-600 overflow-x-auto">
                          {JSON.stringify(selectedTask.payload, null, 2)}
                        </pre>
                      </div>
                    )}

                    {selectedTask.result && (
                      <div className="mb-4">
                        <p className="text-xs text-stone-400 font-medium mb-2">Result</p>
                        <pre className="bg-emerald-50 rounded-xl p-3 text-xs text-emerald-800 overflow-x-auto border border-emerald-100">
                          {JSON.stringify(selectedTask.result, null, 2)}
                        </pre>
                      </div>
                    )}

                    {selectedTask.error && (
                      <div className="mb-4">
                        <p className="text-xs text-red-400 font-medium mb-2">Error</p>
                        <pre className="bg-red-50 rounded-xl p-3 text-xs text-red-800 overflow-x-auto border border-red-100">
                          {selectedTask.error}
                        </pre>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {(selectedTask.status === 'PENDING' || selectedTask.status === 'FAILED') && (
                        <Button
                          onClick={() => handleExecuteTask(selectedTask.id)}
                          disabled={actionLoading}
                          className="flex-1 bg-[#2F281F] hover:bg-black text-white"
                        >
                          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                          Execute
                        </Button>
                      )}
                      {(selectedTask.status === 'PENDING' || selectedTask.status === 'RUNNING') && (
                        <Button
                          variant="outline"
                          onClick={() => handleCancelTask(selectedTask.id)}
                          className="flex-1"
                        >
                          <Square className="w-4 h-4 mr-2" /> Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Executions */}
                  <div className="bg-white rounded-2xl border border-stone-100 p-5">
                    <h3 className="font-bold text-sm text-[#2F281F] mb-3">Execution History</h3>
                    {executions.length === 0 ? (
                      <p className="text-sm text-stone-400 text-center py-8">No executions yet</p>
                    ) : (
                      <div className="space-y-3">
                        {executions.map(exec => (
                          <div key={exec.id} className="bg-stone-50 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', 
                                  exec.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' :
                                  exec.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                                  'bg-amber-100 text-amber-700'
                                )}>
                                  {exec.status}
                                </span>
                                <span className="text-xs font-medium text-stone-600">{exec.action}</span>
                              </div>
                              <span className="text-xs text-stone-400">{formatDuration(exec.duration)}</span>
                            </div>
                            {exec.error && (
                              <p className="text-xs text-red-600 mt-1">{exec.error}</p>
                            )}
                            <p className="text-xs text-stone-400 mt-1">{new Date(exec.createdAt).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-stone-400">
                  <List className="w-12 h-12 mb-3 opacity-30" />
                  <p>Select a task to view details</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'create' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Action Selector */}
              <div className="bg-white rounded-2xl border border-stone-100 p-6">
                <h3 className="font-bold text-[#2F281F] mb-4">Select Action</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {ACTION_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedAction(opt.value)}
                      className={cn(
                        'p-4 rounded-xl border-2 text-left transition-all',
                        selectedAction === opt.value
                          ? 'border-[#D27D50] bg-[#FBF3EE] shadow-[0_4px_15px_rgba(210,125,80,0.1)]'
                          : 'border-stone-100 hover:border-stone-200 bg-white'
                      )}
                    >
                      <opt.icon className={cn('w-5 h-5 mb-2', selectedAction === opt.value ? 'text-[#D27D50]' : 'text-stone-400')} />
                      <p className="text-sm font-bold text-stone-800">{opt.label}</p>
                      <p className="text-xs text-stone-500 mt-1">{opt.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Form */}
              <div className="bg-white rounded-2xl border border-stone-100 p-6 space-y-4">
                <h3 className="font-bold text-[#2F281F]">Task Configuration</h3>

                {(selectedAction === 'schedule_post' || selectedAction === 'bulk_schedule') && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-stone-500 mb-1 block">Content *</label>
                      <textarea
                        value={formData.content}
                        onChange={e => setFormData({ ...formData, content: e.target.value })}
                        placeholder="Enter post content..."
                        className="w-full rounded-xl border border-stone-200 p-3 text-sm focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] outline-none"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-stone-500 mb-1 block">Title</label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={e => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Post title"
                          className="w-full rounded-xl border border-stone-200 p-3 text-sm focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-stone-500 mb-1 block">Platforms (comma-separated)</label>
                        <input
                          type="text"
                          value={formData.platforms}
                          onChange={e => setFormData({ ...formData, platforms: e.target.value })}
                          placeholder="INSTAGRAM, FACEBOOK, TWITTER"
                          className="w-full rounded-xl border border-stone-200 p-3 text-sm focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-stone-500 mb-1 block">Schedule At (ISO 8601)</label>
                        <input
                          type="text"
                          value={formData.scheduledAt}
                          onChange={e => setFormData({ ...formData, scheduledAt: e.target.value })}
                          placeholder="2025-01-15T10:00:00Z"
                          className="w-full rounded-xl border border-stone-200 p-3 text-sm focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-stone-500 mb-1 block">Timezone</label>
                        <input
                          type="text"
                          value={formData.timezone}
                          onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                          placeholder="UTC"
                          className="w-full rounded-xl border border-stone-200 p-3 text-sm focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] outline-none"
                        />
                      </div>
                    </div>
                    {selectedAction === 'bulk_schedule' && (
                      <div>
                        <label className="text-xs font-bold text-stone-500 mb-1 block">Bulk Posts (one per line, format: content | platforms | scheduledAt)</label>
                        <textarea
                          value={formData.bulkPosts}
                          onChange={e => setFormData({ ...formData, bulkPosts: e.target.value })}
                          placeholder="Post 1 content | INSTAGRAM,FACEBOOK | 2025-01-15T10:00:00Z"
                          className="w-full rounded-xl border border-stone-200 p-3 text-sm focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] outline-none"
                          rows={4}
                        />
                      </div>
                    )}
                  </>
                )}

                {(selectedAction === 'generate_content' || selectedAction === 'custom') && (
                  <div>
                    <label className="text-xs font-bold text-stone-500 mb-1 block">Prompt *</label>
                    <textarea
                      value={selectedAction === 'custom' ? customPrompt : formData.customPrompt}
                      onChange={e => selectedAction === 'custom' ? setCustomPrompt(e.target.value) : setFormData({ ...formData, customPrompt: e.target.value })}
                      placeholder="Describe the content you want to generate..."
                      className="w-full rounded-xl border border-stone-200 p-3 text-sm focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] outline-none"
                      rows={4}
                    />
                  </div>
                )}

                {selectedAction === 'create_campaign' && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-stone-500 mb-1 block">Website URL *</label>
                      <input
                        type="text"
                        value={formData.websiteUrl}
                        onChange={e => setFormData({ ...formData, websiteUrl: e.target.value })}
                        placeholder="https://example.com"
                        className="w-full rounded-xl border border-stone-200 p-3 text-sm focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-stone-500 mb-1 block">Schedule</label>
                        <select
                          value={formData.campaignSchedule}
                          onChange={e => setFormData({ ...formData, campaignSchedule: e.target.value })}
                          className="w-full rounded-xl border border-stone-200 p-3 text-sm focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] outline-none"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-stone-500 mb-1 block">Voice</label>
                        <select
                          value={formData.voiceId}
                          onChange={e => setFormData({ ...formData, voiceId: e.target.value })}
                          className="w-full rounded-xl border border-stone-200 p-3 text-sm focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] outline-none"
                        >
                          <option value="Aoede">Aoede</option>
                          <option value="Charon">Charon</option>
                          <option value="Puck">Puck</option>
                          <option value="Ojas">Ojas (Hindi)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-stone-500 mb-1 block">Niche</label>
                      <input
                        type="text"
                        value={formData.niche}
                        onChange={e => setFormData({ ...formData, niche: e.target.value })}
                        placeholder="e.g., Fashion, Tech, Food"
                        className="w-full rounded-xl border border-stone-200 p-3 text-sm focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] outline-none"
                      />
                    </div>
                  </>
                )}

                {selectedAction === 'schedule_post' && (
                  <div>
                    <label className="text-xs font-bold text-stone-500 mb-1 block">Post Type</label>
                    <select
                      value={formData.postType}
                      onChange={e => setFormData({ ...formData, postType: e.target.value })}
                      className="w-full rounded-xl border border-stone-200 p-3 text-sm focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] outline-none"
                    >
                      <option value="FEED">Feed Post</option>
                      <option value="REEL">Reel</option>
                      <option value="STORY">Story</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-stone-500 mb-1 block">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full rounded-xl border border-stone-200 p-3 text-sm focus:ring-2 focus:ring-[#D27D50]/20 focus:border-[#D27D50] outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <Button
                  onClick={handleCreateTask}
                  disabled={actionLoading}
                  className="w-full bg-[#D27D50] hover:bg-[#C26032] text-white font-bold py-3"
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                  Create & Execute Task
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'status' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {status && (
                <>
                  <div className="bg-white rounded-2xl border border-stone-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                          <Bot className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[#2F281F]">{status.agentName}</h3>
                          <p className="text-sm text-stone-500">ID: {status.agentId}</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {status.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-4">
                      <div className="bg-stone-50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-black text-stone-800">{status.stats.total}</p>
                        <p className="text-xs text-stone-500 font-medium mt-1">Total Tasks</p>
                      </div>
                      <div className="bg-amber-50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-black text-amber-700">{status.stats.pending}</p>
                        <p className="text-xs text-amber-600 font-medium mt-1">Pending</p>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-black text-blue-700">{status.stats.running}</p>
                        <p className="text-xs text-blue-600 font-medium mt-1">Running</p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-black text-emerald-700">{status.stats.completed}</p>
                        <p className="text-xs text-emerald-600 font-medium mt-1">Completed</p>
                      </div>
                      <div className="bg-red-50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-black text-red-700">{status.stats.failed}</p>
                        <p className="text-xs text-red-600 font-medium mt-1">Failed</p>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-stone-100">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-sm text-stone-600">
                          <Activity className="w-4 h-4" />
                          <span>Uptime: {formatUptime(status.uptime)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-stone-600">
                          <Info className="w-4 h-4" />
                          <span>Auto-refresh: Every 10s</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-stone-100 p-6">
                    <h3 className="font-bold text-[#2F281F] mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Button
                        variant="outline"
                        onClick={fetchTasks}
                        className="flex items-center gap-2 py-3"
                      >
                        <RefreshCw className="w-4 h-4" /> Refresh Tasks
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab('create')}
                        className="flex items-center gap-2 py-3"
                      >
                        <Plus className="w-4 h-4" /> New Task
                      </Button>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            await api.hermes.execute({ action: 'monitor_health' });
                            await fetchTasks();
                          } catch (err: any) {
                            alert(err.message);
                          }
                        }}
                        className="flex items-center gap-2 py-3"
                      >
                        <Activity className="w-4 h-4" /> Health Check
                      </Button>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            await api.hermes.execute({ action: 'analyze_accounts' });
                            await fetchTasks();
                          } catch (err: any) {
                            alert(err.message);
                          }
                        }}
                        className="flex items-center gap-2 py-3"
                      >
                        <BarChart3 className="w-4 h-4" /> Analyze Accounts
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
