'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Briefcase, Sparkles, Plus, X, ChevronRight, ChevronLeft, Wand2,
  CheckCircle2, Clock, AlertCircle, Play, Loader2, Trash2, ToggleLeft,
  ToggleRight, Brain, Target, Zap, TrendingUp, Building2, Users, Mic, Calendar
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery as useApiQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  InstagramLogo, FacebookLogo, LinkedinLogo, TwitterLogo,
  TiktokLogo, YoutubeLogo, ThreadsLogo, PinterestLogo, SnapchatLogo
} from '@/components/icons/social-icons';

const platformStyles: Record<string, { name: string; icon: any; color: string; bg: string }> = {
  FACEBOOK: { name: 'Facebook', icon: FacebookLogo, color: '#1877F2', bg: '#EBF4FF' },
  INSTAGRAM: { name: 'Instagram', icon: InstagramLogo, color: '#E4405F', bg: '#FFF0F3' },
  LINKEDIN: { name: 'LinkedIn', icon: LinkedinLogo, color: '#0A66C2', bg: '#EBF4FF' },
  TWITTER: { name: 'X / Twitter', icon: TwitterLogo, color: '#111111', bg: '#F3F4F6' },
  TIKTOK: { name: 'TikTok', icon: TiktokLogo, color: '#111111', bg: '#F3F4F6' },
  YOUTUBE: { name: 'YouTube', icon: YoutubeLogo, color: '#FF0000', bg: '#FFF1F1' },
  THREADS: { name: 'Threads', icon: ThreadsLogo, color: '#111111', bg: '#F3F4F6' },
  PINTEREST: { name: 'Pinterest', icon: PinterestLogo, color: '#E60023', bg: '#FFF1F1' },
  SNAPCHAT: { name: 'Snapchat', icon: SnapchatLogo, color: '#B89400', bg: '#FFF8D9' },
};

const VOICES = [
  { id: 'Puck', name: 'Puck', type: 'Male', desc: 'Energetic & confident. Great for B2B authority content.' },
  { id: 'Charon', name: 'Charon', type: 'Male', desc: 'Deep, resonant. Ideal for thought leadership reels.' },
  { id: 'Fenrir', name: 'Fenrir', type: 'Male', desc: 'Bold & direct. Perfect for bold problem-focused hooks.' },
  { id: 'Aoede', name: 'Aoede', type: 'Female', desc: 'Warm & engaging. Excellent for educational content.' },
  { id: 'Kore', name: 'Kore', type: 'Female', desc: 'Calm & authoritative. Great for professional storytelling.' },
  { id: 'Leda', name: 'Leda', type: 'Female', desc: 'Clear & confident. Perfect for data-driven insights.' },
];

const TONES = [
  { id: 'Professional', label: 'Professional', desc: 'Polished, expert, trust-building' },
  { id: 'Conversational', label: 'Conversational', desc: 'Friendly, approachable, relatable' },
  { id: 'Bold', label: 'Bold', desc: 'Direct, disruptive, attention-grabbing' },
  { id: 'Educational', label: 'Educational', desc: 'Informative, insightful, value-driven' },
];

const SCHEDULE_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const LANGUAGES = ['English', 'Hindi', 'Spanish', 'French', 'Arabic', 'Portuguese'];

const INDUSTRIES = [
  'IT Services & Consulting', 'SaaS / Software', 'Digital Marketing Agency',
  'Design & Creative Agency', 'E-Commerce', 'FinTech', 'HealthTech', 'EdTech',
  'Real Estate', 'Manufacturing', 'Legal Services', 'HR & Recruitment', 'Other'
];

type WizardStep = 'identity' | 'positioning' | 'voice' | 'strategy';

// ─── TagInput Helper ──────────────────────────────────────────────────────────
function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('');
  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed]);
    setInput('');
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1 rounded-xl border-stone-200 bg-stone-50 focus:bg-white"
        />
        <Button type="button" onClick={add} variant="outline" className="rounded-xl px-3 shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 text-sm font-medium px-3 py-1 rounded-full border border-indigo-100">
              {tag}
              <button type="button" onClick={() => onChange(tags.filter(t => t !== tag))} className="text-indigo-400 hover:text-indigo-700 ml-1">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Reel Status Badge ────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string; icon: any }> = {
    PENDING: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Pending', icon: Clock },
    GENERATING: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Generating', icon: Loader2 },
    READY: { color: 'bg-green-100 text-green-700 border-green-200', label: 'Ready', icon: CheckCircle2 },
    PUBLISHING: { color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Publishing', icon: Loader2 },
    POSTED: { color: 'bg-green-100 text-green-700 border-green-200', label: 'Posted', icon: CheckCircle2 },
    FAILED: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Failed', icon: AlertCircle },
    SCHEDULED: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Scheduled', icon: Calendar },
  };
  const s = map[status] || map['PENDING'];
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${s.color}`}>
      <Icon className={`h-3 w-3 ${status === 'GENERATING' || status === 'PUBLISHING' ? 'animate-spin' : ''}`} />
      {s.label}
    </span>
  );
}

// ─── Knowledge Base Creation Wizard ──────────────────────────────────────────
function KBWizard({ onComplete, accounts }: { onComplete: () => void; accounts: any[] }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<WizardStep>('identity');
  const steps: WizardStep[] = ['identity', 'positioning', 'voice'];

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [services, setServices] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState('');
  const [painPoints, setPainPoints] = useState('');
  const [usps, setUsps] = useState<string[]>([]);
  const [caseStudies, setCaseStudies] = useState('');
  const [tone, setTone] = useState('Professional');
  const [language, setLanguage] = useState('English');
  const [voiceId, setVoiceId] = useState('Puck');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [scheduleDays, setScheduleDays] = useState<string[]>(['MON', 'WED', 'FRI']);
  const [scheduleTime, setScheduleTime] = useState('10:00');

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/company-reels/knowledge-base', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create company KB');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-kbs'] });
      onComplete();
    }
  });

  const handleSubmit = () => {
    createMutation.mutate({
      companyName, industry, services, targetAudience, painPoints,
      usps, caseStudies, tone, language, voiceId,
      socialChannels: selectedChannels, scheduleDays, scheduleTime,
      timezoneOffset: new Date().getTimezoneOffset()
    });
  };

  const stepIndex = steps.indexOf(step);
  const isLastStep = stepIndex === steps.length - 1;

  const canProceed = () => {
    if (step === 'identity') return companyName.trim() && industry && services.length > 0 && targetAudience.trim() && painPoints.trim();
    if (step === 'positioning') return usps.length > 0;
    return true;
  };

  const stepLabels = [
    { id: 'identity', label: 'Company Identity', icon: Building2 },
    { id: 'positioning', label: 'Positioning', icon: Target },
    { id: 'voice', label: 'Voice & Channels', icon: Mic },
  ];

  return (
    <div className="bg-white rounded-3xl border border-stone-100 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 px-8 py-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">New Company Knowledge Base</h2>
            <p className="text-indigo-200 text-sm">AI will analyze your company to generate high-converting reels</p>
          </div>
        </div>
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {stepLabels.map((s, i) => {
            const Icon = s.icon;
            const done = i < stepIndex;
            const active = s.id === step;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${active ? 'bg-white text-indigo-700' : done ? 'bg-white/30 text-white' : 'bg-white/10 text-indigo-300'}`}>
                  {done ? <CheckCircle2 className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                  {s.label}
                </div>
                {i < stepLabels.length - 1 && <ChevronRight className="h-3 w-3 text-indigo-400" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-8 space-y-6">
        {step === 'identity' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1 space-y-1.5">
                <label className="text-sm font-semibold text-stone-700">Company Name *</label>
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. TechBridge Solutions" className="rounded-xl" />
              </div>
              <div className="col-span-2 md:col-span-1 space-y-1.5">
                <label className="text-sm font-semibold text-stone-700">Industry *</label>
                <select value={industry} onChange={e => setIndustry(e.target.value)} className="w-full h-10 rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-stone-700">Services You Offer * <span className="text-stone-400 font-normal">(press Enter to add)</span></label>
              <TagInput tags={services} onChange={setServices} placeholder="e.g. Custom Software Development" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-stone-700">Who is your ideal client? *</label>
              <Input value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="e.g. CTOs and Founders of B2B SaaS startups with 10-200 employees" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-stone-700">What problems do your clients face before hiring you? *</label>
              <Textarea value={painPoints} onChange={e => setPainPoints(e.target.value)} placeholder="e.g. Struggling with slow development timelines, high developer costs, poor code quality, missed deadlines..." rows={3} className="rounded-xl resize-none" />
            </div>
          </>
        )}

        {step === 'positioning' && (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-stone-700">What makes you different from competitors? * <span className="text-stone-400 font-normal">(press Enter to add)</span></label>
              <TagInput tags={usps} onChange={setUsps} placeholder="e.g. 50% faster delivery than industry average" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-stone-700">Preferred Tone</label>
              <div className="grid grid-cols-2 gap-3">
                {TONES.map(t => (
                  <button key={t.id} type="button" onClick={() => setTone(t.id)} className={`p-3 rounded-xl border-2 text-left transition-all ${tone === t.id ? 'border-indigo-500 bg-indigo-50' : 'border-stone-200 hover:border-stone-300'}`}>
                    <p className="font-bold text-sm text-stone-900">{t.label}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-stone-700">Results / Case Studies <span className="text-stone-400 font-normal">(optional but makes reels much stronger)</span></label>
              <Textarea value={caseStudies} onChange={e => setCaseStudies(e.target.value)} placeholder="e.g. Helped XYZ Corp reduce software costs by 40% in 3 months. Delivered a fintech app in 6 weeks that raised $2M seed round." rows={3} className="rounded-xl resize-none" />
            </div>
          </>
        )}

        {step === 'voice' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-stone-700">Content Language</label>
                <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full h-10 rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-stone-700">Schedule Time</label>
                <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="rounded-xl" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-stone-700">Voice</label>
              <div className="grid grid-cols-2 gap-2">
                {VOICES.map(v => (
                  <button key={v.id} type="button" onClick={() => setVoiceId(v.id)} className={`p-3 rounded-xl border-2 text-left transition-all ${voiceId === v.id ? 'border-indigo-500 bg-indigo-50' : 'border-stone-200 hover:border-stone-300'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-stone-900">{v.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${v.type === 'Male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>{v.type}</span>
                    </div>
                    <p className="text-xs text-stone-500">{v.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-stone-700">Publish Days</label>
              <div className="flex gap-2 flex-wrap">
                {SCHEDULE_DAYS.map(day => (
                  <button key={day} type="button" onClick={() => setScheduleDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])} className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${scheduleDays.includes(day) ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-stone-200 text-stone-600 hover:border-stone-400'}`}>
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-stone-700">Publish to Channels</label>
              {accounts.length === 0 ? (
                <div className="text-sm text-stone-500 bg-stone-50 rounded-xl p-4">No channels connected. Connect in <span className="font-semibold text-indigo-600">Channels →</span></div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {accounts.map((acc: any) => {
                    const style = platformStyles[acc.platform] || {};
                    const Icon = style.icon;
                    const selected = selectedChannels.includes(acc.id);
                    return (
                      <button key={acc.id} type="button" onClick={() => setSelectedChannels(prev => prev.includes(acc.id) ? prev.filter(id => id !== acc.id) : [...prev, acc.id])} className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${selected ? 'border-indigo-500 bg-indigo-50' : 'border-stone-200 hover:border-stone-300'}`}>
                        {Icon && <Icon className="h-4 w-4 shrink-0" style={{ color: style.color }} />}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-stone-900 truncate">{acc.platform}</p>
                          <p className="text-[10px] text-stone-400 truncate">{acc.externalAccountId}</p>
                        </div>
                        {selected && <CheckCircle2 className="h-4 w-4 text-indigo-500 ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-8 pb-8 flex items-center justify-between">
        <Button variant="ghost" onClick={() => stepIndex > 0 ? setStep(steps[stepIndex - 1]) : undefined} disabled={stepIndex === 0} className="text-stone-500 rounded-xl">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button
          onClick={() => isLastStep ? handleSubmit() : setStep(steps[stepIndex + 1])}
          disabled={!canProceed() || createMutation.isPending}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 font-bold"
        >
          {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {isLastStep ? '🚀 Create & Analyze with AI' : 'Continue'}
          {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
        </Button>
      </div>
    </div>
  );
}

// ─── KB Card ──────────────────────────────────────────────────────────────────
function KBCard({ kb, onGenerate, onDelete, onToggle, accounts }: { kb: any; onGenerate: (id: string) => void; onDelete: (id: string) => void; onToggle: (id: string) => void; accounts: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const strategy = kb.strategy;

  const channelIds: string[] = JSON.parse(kb.socialChannels || '[]');
  const connectedAccounts = accounts.filter((a: any) => channelIds.includes(a.id));

  const scheduleDays: string[] = JSON.parse(kb.scheduleDays || '[]');

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
              <Briefcase className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-stone-900 text-base truncate">{kb.companyName}</h3>
                <span className="text-[10px] font-bold bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">{kb.industry}</span>
                {kb.isActive
                  ? <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">● Active</span>
                  : <span className="text-[10px] font-bold bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">Paused</span>
                }
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-stone-400 flex-wrap">
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{kb.targetAudience.substring(0, 50)}...</span>
              </div>
              {scheduleDays.length > 0 && kb.scheduleTime && (
                <div className="flex items-center gap-1 mt-1 text-xs text-stone-400">
                  <Calendar className="h-3 w-3" />
                  {scheduleDays.join(', ')} @ {kb.scheduleTime}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => onGenerate(kb.id)} className="gap-1 rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-bold">
              <Wand2 className="h-3.5 w-3.5" /> Generate Now
            </Button>
            <button onClick={() => onToggle(kb.id)} className="text-stone-400 hover:text-stone-700 p-1">
              {kb.isActive ? <ToggleRight className="h-6 w-6 text-green-500" /> : <ToggleLeft className="h-6 w-6" />}
            </button>
            <button onClick={() => onDelete(kb.id)} className="text-stone-300 hover:text-red-500 p-1">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* AI Strategy Preview */}
        {strategy && (
          <div className="mt-4 pt-4 border-t border-stone-100">
            <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
              <Brain className="h-3.5 w-3.5" />
              {expanded ? 'Hide' : 'View'} AI Strategy
              <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>
            {expanded && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-indigo-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-2 flex items-center gap-1"><Target className="h-3 w-3" /> Audience Personas</p>
                  <ul className="space-y-1">
                    {(strategy.audiencePersonas || []).slice(0, 3).map((p: string, i: number) => (
                      <li key={i} className="text-xs text-stone-700 flex items-start gap-1.5"><span className="text-indigo-400 mt-0.5">•</span>{p}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-1"><Zap className="h-3 w-3" /> Viral Hook Angles</p>
                  <ul className="space-y-1">
                    {(strategy.viralHooks || []).slice(0, 3).map((h: string, i: number) => (
                      <li key={i} className="text-xs text-stone-700 flex items-start gap-1.5"><span className="text-amber-400 mt-0.5">•</span>{h}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-green-50 rounded-xl p-3 md:col-span-2">
                  <p className="text-[10px] font-bold text-green-600 uppercase tracking-wide mb-2 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Keywords</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(strategy.keywords || []).map((k: string, i: number) => (
                      <span key={i} className="text-[11px] font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{k}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!strategy && (
          <div className="mt-3 flex items-center gap-2 text-xs text-stone-400 bg-stone-50 rounded-xl px-3 py-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            AI is analyzing your company to build content strategy...
          </div>
        )}
      </div>

      {/* Recent Reels */}
      {kb.reels && kb.reels.length > 0 && (
        <div className="border-t border-stone-100 px-6 py-4">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-3">Recent Reels</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {kb.reels.map((reel: any) => (
              <div key={reel.id} className="shrink-0 w-28">
                <div className="relative w-28 h-20 bg-stone-100 rounded-xl overflow-hidden">
                  {reel.thumbnail ? (
                    <img src={reel.thumbnail} alt="thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="h-5 w-5 text-stone-400" />
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1">
                    <StatusBadge status={reel.status} />
                  </div>
                </div>
                <p className="text-[10px] text-stone-500 mt-1 truncate">{reel.topic || 'Generating...'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Company Reel Video Card ──────────────────────────────────────────────────
function CompanyReelCard({ reel }: { reel: any }) {
  const meta = reel.metadata as any || {};

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden group">
      <div className="relative">
        <div className="aspect-[9/16] max-h-60 w-full bg-stone-100 overflow-hidden">
          {reel.videoUrl ? (
            <video src={reel.videoUrl} poster={reel.thumbnail || ''} className="w-full h-full object-cover" controls preload="none" />
          ) : reel.thumbnail ? (
            <img src={reel.thumbnail} alt="thumbnail" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              {reel.status === 'GENERATING' ? (
                <><Loader2 className="h-8 w-8 text-indigo-400 animate-spin" /><p className="text-xs text-stone-400">Generating...</p></>
              ) : (
                <Play className="h-8 w-8 text-stone-300" />
              )}
            </div>
          )}
        </div>
        <div className="absolute top-2 left-2">
          <StatusBadge status={reel.status} />
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs font-bold text-stone-900 line-clamp-2 mb-1">{reel.topic || 'Topic generating...'}</p>
        {meta.targetPersona && <p className="text-[10px] text-stone-400 truncate">🎯 {meta.targetPersona}</p>}
        {meta.contentPillar && <span className="text-[10px] font-medium bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full mt-1 inline-block">{meta.contentPillar}</span>}
        {meta.hasVeoScene && <span className="text-[10px] font-medium bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full mt-1 ml-1 inline-block">🎬 Veo Scene</span>}
        <p className="text-[10px] text-stone-300 mt-1.5">{reel.kb?.companyName} • {new Date(reel.createdAt).toLocaleDateString()}</p>
        {reel.statusMessage && reel.status === 'GENERATING' && (
          <div className="mt-2 text-[10px] font-mono text-indigo-600 bg-indigo-50 rounded-lg px-2 py-1 truncate">{reel.statusMessage}</div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CompanyReelPage() {
  const queryClient = useQueryClient();
  const [showWizard, setShowWizard] = useState(false);
  const [activeTab, setActiveTab] = useState<'kbs' | 'reels'>('kbs');

  const { data: accountsData } = useApiQuery({
    queryKey: ['accounts'],
    queryFn: () => api.oauth.getAccounts(),
  });
  const accounts = accountsData?.data || [];

  const { data: kbsData, isLoading: loadingKBs } = useQuery({
    queryKey: ['company-kbs'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/company-reels/knowledge-base', { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch KBs');
      return (await res.json()).data || [];
    },
    refetchInterval: 15000
  });

  const { data: reelsData, isLoading: loadingReels } = useQuery({
    queryKey: ['company-reels'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/company-reels', { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch company reels');
      return (await res.json()).data || [];
    },
    refetchInterval: 8000
  });

  const generateMutation = useMutation({
    mutationFn: async (kbId: string) => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/company-reels/knowledge-base/${kbId}/generate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to trigger generation');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-reels'] });
      queryClient.invalidateQueries({ queryKey: ['company-kbs'] });
      setActiveTab('reels');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (kbId: string) => {
      if (!confirm('Delete this company knowledge base and all its reels?')) throw new Error('Cancelled');
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/company-reels/knowledge-base/${kbId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['company-kbs'] })
  });

  const toggleMutation = useMutation({
    mutationFn: async (kbId: string) => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/company-reels/knowledge-base/${kbId}/toggle`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to toggle');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['company-kbs'] })
  });

  const kbs: any[] = kbsData || [];
  const reels: any[] = reelsData || [];

  if (showWizard) {
    return (
      <div className="max-w-2xl mx-auto p-6 lg:p-8">
        <button onClick={() => setShowWizard(false)} className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800 mb-6 font-medium transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back to Company Reels
        </button>
        <KBWizard onComplete={() => setShowWizard(false)} accounts={accounts} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            Company Reels
          </h1>
          <p className="text-stone-500 mt-2 max-w-xl">
            AI-powered B2B video reels that attract clients. Set up your company profile once — our AI finds winning viral topics, writes scripts, and generates cinematic reels automatically.
          </p>
          <div className="flex items-center gap-4 mt-3 text-sm text-stone-400">
            <span className="flex items-center gap-1"><Brain className="h-3.5 w-3.5 text-indigo-400" /> AI Strategy Analysis</span>
            <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-purple-400" /> Veo Cinematic Opener</span>
            <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-green-400" /> Auto-Post to Socials</span>
          </div>
        </div>
        <Button onClick={() => setShowWizard(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-6 shadow-lg font-bold shrink-0">
          <Plus className="mr-2 h-4 w-4" /> Add Company
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex mb-6 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden w-fit">
        <button
          className={`py-2.5 px-6 text-sm font-bold border-b-2 transition-all ${activeTab === 'kbs' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
          onClick={() => setActiveTab('kbs')}
        >
          Company Profiles {kbs.length > 0 && <span className="ml-1.5 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full">{kbs.length}</span>}
        </button>
        <div className="w-px bg-stone-200" />
        <button
          className={`py-2.5 px-6 text-sm font-bold border-b-2 transition-all ${activeTab === 'reels' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
          onClick={() => setActiveTab('reels')}
        >
          Generated Reels {reels.length > 0 && <span className="ml-1.5 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full">{reels.length}</span>}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'kbs' && (
        <>
          {loadingKBs ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : kbs.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-16 text-center">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Briefcase className="h-10 w-10 text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-stone-900 mb-2">No Company Profiles Yet</h2>
              <p className="text-stone-500 mb-8 max-w-md mx-auto">
                Set up your company profile and let our AI build a content strategy that generates high-converting B2B reels to attract clients automatically.
              </p>
              <Button onClick={() => setShowWizard(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 py-2.5 font-bold">
                <Sparkles className="mr-2 h-4 w-4" /> Set Up Your First Company
              </Button>

              {/* Feature cards */}
              <div className="mt-12 grid grid-cols-3 gap-4 text-left max-w-lg mx-auto">
                {[
                  { icon: Brain, color: 'indigo', title: 'AI Strategy', desc: 'Analyzes your KB to find winning viral angles for your audience' },
                  { icon: Zap, color: 'purple', title: 'Veo Opener', desc: 'First scene animated with Google Veo for cinematic impact' },
                  { icon: TrendingUp, color: 'green', title: 'Auto-Post', desc: 'Publishes to Instagram, LinkedIn, TikTok on your schedule' },
                ].map(({ icon: Icon, color, title, desc }) => (
                  <div key={title} className={`bg-${color}-50 rounded-2xl p-4`}>
                    <Icon className={`h-6 w-6 text-${color}-500 mb-2`} />
                    <p className="font-bold text-sm text-stone-900">{title}</p>
                    <p className="text-xs text-stone-500 mt-1">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {kbs.map((kb: any) => (
                <KBCard
                  key={kb.id}
                  kb={kb}
                  accounts={accounts}
                  onGenerate={(id) => generateMutation.mutate(id)}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onToggle={(id) => toggleMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'reels' && (
        <>
          {loadingReels ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : reels.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="h-8 w-8 text-indigo-400" />
              </div>
              <h2 className="text-lg font-bold text-stone-900 mb-2">No Reels Generated Yet</h2>
              <p className="text-stone-500 text-sm">Set up a company profile and click "Generate Now" to create your first reel.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {reels.map((reel: any) => (
                <CompanyReelCard key={reel.id} reel={reel} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
