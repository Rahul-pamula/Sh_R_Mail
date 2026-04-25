'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
    ArrowRight, Globe, KeyRound, MailCheck, Shield, Webhook, 
    Activity, Clock, ChevronRight, AlertCircle, CheckCircle2
} from 'lucide-react';
import { PageHeader, Button, KeyValueList, SectionCard, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';

const infrastructureAreas = [
    {
        title: 'Sending Domains',
        description: 'Verify DNS, monitor authentication, and improve inbox placement.',
        href: '/settings/domain',
        icon: Globe,
    },
    {
        title: 'Sender Identities',
        description: 'Control who can send from each domain and keep spoofing protections in place.',
        href: '/settings/senders',
        icon: MailCheck,
    },
    {
        title: 'API Keys',
        description: 'Issue scoped credentials for internal tools, automation, and customer integrations.',
        href: '/settings/api-keys',
        icon: KeyRound,
    },
    {
        title: 'Compliance',
        description: 'Manage consent, data handling, and workspace compliance controls.',
        href: '/settings/compliance',
        icon: Shield,
    },
];

interface WebhookEvent {
    id: string;
    action: string;
    created_at: string;
    metadata: any;
}

export default function InfrastructurePage() {
    const [events, setEvents] = useState<WebhookEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ domains: 0, senders: 0, status: 'operational' });

    const fetchEvents = async () => {
        try {
            const res = await api.get('/infrastructure/webhooks/live');
            setEvents(res.data || []);
        } catch (err) {
            console.error('Failed to fetch live webhooks:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('/infrastructure/stats');
            setStats(res.data);
        } catch (err) {
            console.error('Failed to fetch infra stats:', err);
        }
    };

    useEffect(() => {
        fetchEvents();
        fetchStats();
        
        // Poll for new events every 5 seconds
        const interval = setInterval(fetchEvents, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-8 pb-8">
            <PageHeader
                title="Infrastructure"
                subtitle="The trust layer for sending, authentication, integrations, and compliance."
                action={
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">Systems Nominal</span>
                        </div>
                        <Link href="/settings/domain">
                            <Button>Verify sending domain</Button>
                        </Link>
                    </div>
                }
            />

            {/* Quick Stats Grid */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Active Domains', value: stats.domains, icon: Globe, color: 'text-blue-500' },
                    { label: 'Sender Identities', value: stats.senders, icon: MailCheck, color: 'text-purple-500' },
                    { label: 'System Uptime', value: '99.98%', icon: Activity, color: 'text-emerald-500' },
                    { label: 'Webhook Health', value: 'Healthy', icon: Webhook, color: 'text-orange-500' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg bg-[var(--bg-hover)] flex items-center justify-center ${stat.color}`}>
                            <stat.icon size={20} />
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">{stat.label}</p>
                            <p className="text-xl font-bold text-[var(--text-primary)]">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Infrastructure Management Areas */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest px-1">Management Hub</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {infrastructureAreas.map((area) => {
                            const Icon = area.icon;
                            return (
                                <Link
                                    key={area.href}
                                    href={area.href}
                                    className="group rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition hover:border-[var(--accent-border)] hover:bg-[var(--bg-hover)]"
                                >
                                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] group-hover:scale-110 transition-transform">
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <h2 className="text-sm font-bold text-[var(--text-primary)]">{area.title}</h2>
                                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-muted)] line-clamp-2">{area.description}</p>
                                    <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--accent)] uppercase tracking-wider">
                                        Configure
                                        <ChevronRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                    
                    <SectionCard title="Operating Model" className="mt-6">
                        <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
                            Infrastructure is intentionally separated from campaign creation so high-frequency work stays fast, while trust-critical setup stays discoverable and calm.
                        </p>
                        <KeyValueList
                            items={[
                                {
                                    label: 'System readiness',
                                    value: (
                                        <span className="inline-flex items-center gap-2 text-xs font-medium">
                                            <Webhook className="h-3.5 w-3.5 text-[var(--ai-accent)]" />
                                            Shared foundation
                                        </span>
                                    ),
                                    helper: 'Configured once, reused everywhere.',
                                },
                                {
                                    label: 'Compliance',
                                    value: (
                                        <span className="inline-flex items-center gap-2 text-xs font-medium">
                                            <Shield className="h-3.5 w-3.5 text-[var(--accent)]" />
                                            Audit-ready
                                        </span>
                                    ),
                                    helper: 'Legal and key management controls.',
                                },
                            ]}
                        />
                    </SectionCard>
                </div>

                {/* Live Webhook Feed */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest">Live Webhook Stream</h3>
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                            </span>
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Real-time</span>
                        </div>
                    </div>

                    <SectionCard noPadding className="min-h-[500px] flex flex-col">
                        <div className="flex-1 overflow-auto">
                            {loading && events.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
                                    <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin mb-4" />
                                    <p className="text-xs font-medium uppercase tracking-wider">Establishing connection...</p>
                                </div>
                            ) : events.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] text-center px-10">
                                    <Webhook size={40} className="opacity-20 mb-4" />
                                    <p className="text-sm font-bold text-[var(--text-primary)]">Waiting for events</p>
                                    <p className="text-xs mt-1">Incoming webhooks from SES, SendGrid, or Mailtrap will appear here in real-time.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-[var(--border)]">
                                    {events.map((event) => {
                                        const isError = event.action.includes('bounce') || event.action.includes('complaint') || event.action.includes('spam');
                                        const isSuccess = event.action.includes('delivery');
                                        
                                        return (
                                            <div key={event.id} className="p-4 hover:bg-[var(--bg-hover)] transition-colors group">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className={`mt-0.5 p-1.5 rounded-md ${isError ? 'bg-red-500/10 text-red-500' : isSuccess ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                            {isError ? <AlertCircle size={14} /> : isSuccess ? <CheckCircle2 size={14} /> : <Activity size={14} />}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-tight">
                                                                    {event.action.replace('webhook.', '').replace('ses.', '').toUpperCase()}
                                                                </p>
                                                                <StatusBadge 
                                                                    status={isError ? 'failed' : isSuccess ? 'sent' : 'active'} 
                                                                    className="h-4 text-[9px] px-1.5"
                                                                />
                                                            </div>
                                                            <p className="text-[11px] text-[var(--text-muted)] mt-0.5 font-medium truncate max-w-[250px]">
                                                                {event.metadata.email || event.metadata.message_id || 'Event processed'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
                                                            {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                        </p>
                                                        <p className="text-[9px] text-[var(--text-muted)] opacity-60 mt-0.5">
                                                            {event.metadata.provider || 'SES'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {/* Hidden metadata inspector that shows on hover */}
                                                <div className="mt-2 hidden group-hover:block border-t border-[var(--border)] pt-2 animate-in fade-in slide-in-from-top-1">
                                                    <div className="bg-black/5 rounded p-2 text-[9px] font-mono text-[var(--text-muted)] break-all">
                                                        {JSON.stringify(event.metadata, null, 2)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-hover)]/30 rounded-b-xl flex items-center justify-between">
                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                {events.length} Recent Events Logged
                            </p>
                            <button onClick={fetchEvents} className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider hover:underline">
                                Refresh Now
                            </button>
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}
