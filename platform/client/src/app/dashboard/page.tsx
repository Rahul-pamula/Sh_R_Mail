'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    ArrowUpRight,
    BarChart3,
    CheckCircle2,
    ChevronRight,
    Globe,
    LayoutDashboard,
    Mail,
    Megaphone,
    ServerCog,
    Sparkles,
    TrendingUp,
    Users,
    Zap
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Badge, Button, InlineAlert, KeyValueList, PageHeader, SectionCard, StatCard, StatusBadge } from '@/components/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

type HealthStatus = 'green' | 'yellow' | 'red';

function getHealthTone(status?: HealthStatus) {
    if (status === 'red') return 'danger';
    if (status === 'yellow') return 'warning';
    return 'success';
}

function ChecklistItem({
    isCompleted,
    title,
    description,
    href,
    actionLabel,
}: {
    isCompleted: boolean;
    title: string;
    description?: string;
    href?: string;
    actionLabel?: string;
}) {
    return (
        <div className={`group relative overflow-hidden rounded-xl border p-5 transition-all ${isCompleted ? 'border-[var(--success-border)] bg-[var(--success-bg)]/10' : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent)]/30'}`}>
            {/* Subtle glow effect */}
            {!isCompleted && <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />}
            
            <div className="relative z-10 flex gap-4">
                <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-colors ${isCompleted ? 'bg-[var(--success)] text-white shadow-[0_0_15px_rgba(var(--success-rgb),0.4)]' : 'border border-[var(--border)] text-[var(--text-muted)] group-hover:border-[var(--accent)]/50 group-hover:text-[var(--accent)]'}`}>
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current opacity-40 group-hover:opacity-100" />}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                        <h3 className="heading-3">{title}</h3>
                        {isCompleted && <Badge variant="success" className="label-text">Done</Badge>}
                    </div>
                    {description && <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">{description}</p>}
                    {!isCompleted && href && actionLabel && (
                        <div className="mt-5">
                            <Link href={href}>
                                <Button size="sm" className="shadow-md shadow-[var(--accent)]/10 transition-all hover:shadow-[var(--accent)]/20">
                                    {actionLabel} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Custom compact metric card for unified grid
function MetricCard({ title, value, icon: Icon, trend, tone = 'default', isLoading }: any) {
    const toneColors = {
        default: 'text-[var(--text-primary)]',
        success: 'text-[var(--success)]',
        warning: 'text-[var(--warning)]',
        danger: 'text-[var(--danger)]',
    };
    
    return (
        <div className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all hover-float-right shadow-sm">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 label-text">
                    <Icon className="h-4 w-4 opacity-70" />
                    {title}
                </div>
                {trend && (
                    <Badge variant={tone} className="bg-transparent border-none p-0 text-xs font-bold">
                        {trend}
                    </Badge>
                )}
            </div>
            <div className="mt-4">
                {isLoading ? (
                    <div className="h-8 w-24 animate-pulse rounded bg-[var(--bg-secondary)]" />
                ) : (
                    <span className={`heading-2 ${toneColors[tone as keyof typeof toneColors]}`}>
                        {value}
                    </span>
                )}
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const { token } = useAuth();
    const [billing, setBilling] = useState<any>(null);
    const [health, setHealth] = useState<any>(null);
    const [domains, setDomains] = useState<any[]>([]);
    const [senders, setSenders] = useState<any[]>([]);
    const [contactsCount, setContactsCount] = useState(0);
    const [campaignsCount, setCampaignsCount] = useState(0);
    const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!token) return;

        fetch(`${API_BASE}/analytics/sender-health`, {
            headers: { Authorization: `Bearer ${token}` },
        }).then((r) => (r.ok ? r.json() : null)).then((data) => {
            if (data) setHealth(data);
        }).catch(() => { });

        fetch(`${API_BASE}/billing/plan`, {
            headers: { Authorization: `Bearer ${token}` },
        }).then((r) => (r.ok ? r.json() : null)).then((data) => {
            if (data) setBilling(data);
        }).catch(() => { });

        const cacheKey = `onboarding_status_${token.substring(0, 10)}`;
        const onboardingCached = localStorage.getItem(cacheKey) === 'completed';
        if (onboardingCached) {
            setIsOnboardingCompleted(true);
        }

        const fetchWithTimeout = (url: string, opts: RequestInit, ms = 5000): Promise<any> => {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), ms);
            return fetch(url, { ...opts, signal: ctrl.signal })
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null)
                .finally(() => clearTimeout(timer));
        };

        const headers = { Authorization: `Bearer ${token}` };
        Promise.all([
            fetchWithTimeout(`${API_BASE}/domains?limit=1`, { headers }),
            fetchWithTimeout(`${API_BASE}/senders?limit=1`, { headers }),
            fetchWithTimeout(`${API_BASE}/contacts/stats`, { headers }),
            fetchWithTimeout(`${API_BASE}/campaigns?limit=1`, { headers }),
        ]).then(([domainsData, sendersData, contactsData, campaignsData]) => {
            const doms = domainsData?.data || [];
            const snds = sendersData?.data || [];
            const contCount = contactsData?.total_contacts || 0;
            const campCount = campaignsData?.meta?.total || 0;

            setDomains(doms);
            setSenders(snds);
            setContactsCount(contCount);
            setCampaignsCount(campCount);

            const checkHasDomain = doms.some((d: any) => d.status === 'verified');
            const checkHasSender = snds.some((s: any) => s.status === 'verified');
            const checkSteps = 1 + (checkHasDomain ? 1 : 0) + (checkHasSender ? 1 : 0) + (contCount > 0 ? 1 : 0) + (campCount > 0 ? 1 : 0);

            if (checkSteps === 5) {
                localStorage.setItem(cacheKey, 'completed');
                setIsOnboardingCompleted(true);
            } else if (!onboardingCached) {
                setIsOnboardingCompleted(false);
            }
        }).catch((err) => {
            console.error('Failed to load dashboard data', err);
        }).finally(() => {
            setIsLoading(false);
        });
    }, [token]);

    const hasDomain = domains.some((d) => d.status === 'verified');
    const hasSender = senders.some((s) => s.status === 'verified');
    const hasContacts = contactsCount > 0;
    const hasCampaigns = campaignsCount > 0;
    const completedSteps = 1 + (hasDomain ? 1 : 0) + (hasSender ? 1 : 0) + (hasContacts ? 1 : 0) + (hasCampaigns ? 1 : 0);
    const totalSteps = 5;
    const progressPercent = Math.round((completedSteps / totalSteps) * 100);

    const isNearQuota = useMemo(() => {
        if (!billing) return false;
        const limit = billing.plan_details.max_monthly_emails;
        const used = billing.usage.emails_sent_this_cycle;
        if (!limit || limit === 0) return false;
        return (used / limit) >= 0.8;
    }, [billing]);

    const recommendedActions = useMemo(() => {
        const actions = [];
        if (!hasDomain) actions.push({ label: 'Verify your domain', desc: 'Unlock branded sending', href: '/settings/domain', priority: 'high' });
        if (hasDomain && !hasSender) actions.push({ label: 'Add a sender identity', desc: 'Set up your "From" address', href: '/settings/senders', priority: 'high' });
        if (hasDomain && hasSender && !hasContacts) actions.push({ label: 'Import audience', desc: 'Bring in your contacts', href: '/contacts', priority: 'medium' });
        if (hasContacts && !hasCampaigns) actions.push({ label: 'Draft campaign', desc: 'Send your first broadcast', href: '/campaigns/new', priority: 'medium' });
        if (health?.rates?.open_rate !== undefined && health.rates.open_rate < 15) actions.push({ label: 'Improve open rates', desc: 'Review deliverability best practices', href: '/analytics', priority: 'low' });
        
        // Default suggestions if all good
        if (actions.length === 0) {
            actions.push({ label: 'Create new campaign', desc: 'Engage your audience', href: '/campaigns/new', priority: 'low' });
            actions.push({ label: 'Review analytics', desc: 'Check your recent performance', href: '/analytics', priority: 'low' });
        }
        
        return actions.slice(0, 3); // Max 3 actions
    }, [hasDomain, hasSender, hasContacts, hasCampaigns, health]);

    const quickLinks = [
        { title: 'Campaigns', description: 'Schedule and monitor sends', href: '/campaigns', icon: Megaphone },
        { title: 'Contacts', description: 'Manage audiences and segments', href: '/contacts', icon: Users },
        { title: 'Analytics', description: 'Check delivery and engagement', href: '/analytics', icon: BarChart3 },
        { title: 'Infrastructure', description: 'Manage domains and keys', href: '/infrastructure', icon: ServerCog },
    ];

    const isSystemHealthy = health?.overall === 'green';
    const systemStatusTone = getHealthTone(health?.overall);

    return (
        <div className="space-y-8 pb-12 max-w-7xl mx-auto">
            {isNearQuota && billing && (
                <div>
                    <InlineAlert
                        variant="warning"
                        title="Approaching monthly limit"
                        description={`You have used ${(billing.usage.emails_sent_this_cycle / billing.plan_details.max_monthly_emails * 100).toFixed(0)}% of your monthly send capacity on the ${billing.plan_details.name} plan.`}
                        icon={<AlertTriangle className="mt-0.5 h-5 w-5" />}
                        action={<Link href="/settings/billing"><Button variant="secondary" size="sm">Review billing</Button></Link>}
                    />
                </div>
            )}

            {/* HERO SECTION - Control Center Feel */}
            <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 md:p-10 shadow-sm">
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 mb-4">
                            {isLoading ? (
                                <div className="h-6 w-24 animate-pulse rounded bg-[var(--bg-secondary)]" />
                            ) : (
                                <div className={`flex items-center gap-2 rounded-full px-3 py-1 label-text ${isSystemHealthy ? 'bg-[var(--success-bg)]/20 text-[var(--success)] ring-1 ring-[var(--success)]/30' : 'bg-[var(--warning-bg)]/20 text-[var(--warning)] ring-1 ring-[var(--warning)]/30'}`}>
                                    <div className={`h-2 w-2 rounded-full ${isSystemHealthy ? 'bg-[var(--success)] shadow-[0_0_8px_var(--success)]' : 'bg-[var(--warning)] shadow-[0_0_8px_var(--warning)]'} animate-pulse`} />
                                    {isSystemHealthy ? 'System Healthy' : (health?.overall ? 'Action Required' : 'Initializing')}
                                </div>
                            )}
                        </div>
                        <h1 className="heading-1">
                            {isOnboardingCompleted ? 'Control Center' : 'Set up your workspace'}
                        </h1>
                        <p className="max-w-xl body-text">
                            {isOnboardingCompleted
                                ? 'Monitor your infrastructure health, audience growth, and campaign performance in real-time.'
                                : 'Complete these core setup tasks to unlock sending capabilities and ensure high deliverability.'}
                        </p>
                    </div>

                    <div className="flex-shrink-0 flex gap-3">
                        {isOnboardingCompleted ? (
                            <>
                                <Link href="/analytics">
                                    <Button variant="outline" className="h-10 rounded-lg bg-transparent border-[var(--border)] hover:bg-[var(--bg-hover)] font-bold text-[10px] uppercase tracking-widest px-5">
                                        View Analytics
                                    </Button>
                                </Link>
                                <Link href="/campaigns/new">
                                    <Button className="h-10 rounded-lg shadow-lg shadow-[var(--accent)]/10 hover-float-right transition-all font-bold text-[10px] uppercase tracking-widest px-5">
                                        <Zap className="mr-2 h-3.5 w-3.5" /> New Campaign
                                    </Button>
                                </Link>
                            </>
                        ) : (
                            <div className="flex flex-col items-end gap-2">
                                <Badge variant="accent" className="px-3 py-1.5 text-sm shadow-sm">{progressPercent}% Setup Complete</Badge>
                                <p className="text-xs text-[var(--text-muted)] font-medium">{completedSteps} of {totalSteps} tasks done</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isOnboardingCompleted ? (
                <>
                    {/* UNIFIED METRICS GRID */}
                    <div className="space-y-4">
                        <h2 className="text-[10px] font-bold text-[var(--text-primary)] flex items-center gap-2 uppercase tracking-[0.2em]">
                            <Activity className="h-4 w-4 text-[var(--accent)]" /> Platform Metrics
                        </h2>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                            {/* Infrastructure & Audience Stats */}
                            <MetricCard title="Total Contacts" value={contactsCount.toLocaleString()} icon={Users} isLoading={isLoading} />
                            <MetricCard title="Campaigns Sent" value={campaignsCount.toLocaleString()} icon={Megaphone} isLoading={isLoading} />
                            <MetricCard title="Verified Domains" value={domains.filter(d => d.status === 'verified').length} icon={Globe} isLoading={isLoading} />
                            <MetricCard title="Verified Senders" value={senders.filter(s => s.status === 'verified').length} icon={Mail} isLoading={isLoading} />
                            
                            {/* Health Stats */}
                            <MetricCard 
                                title="Open Rate" 
                                value={`${health?.rates?.open_rate?.toFixed(1) || 0}%`} 
                                icon={TrendingUp} 
                                tone={getHealthTone(health?.health?.open?.status)}
                                trend={health?.health?.open?.status === 'green' ? 'Healthy' : 'Needs Work'}
                                isLoading={isLoading} 
                            />
                            <MetricCard 
                                title="Bounce Rate" 
                                value={`${health?.rates?.bounce_rate?.toFixed(1) || 0}%`} 
                                icon={AlertTriangle} 
                                tone={getHealthTone(health?.health?.bounce?.status)}
                                trend={health?.health?.bounce?.status === 'green' ? 'Good' : 'High'}
                                isLoading={isLoading} 
                            />
                            <MetricCard 
                                title="Spam Rate" 
                                value={`${health?.rates?.spam_rate?.toFixed(2) || 0}%`} 
                                icon={AlertTriangle} 
                                tone={getHealthTone(health?.health?.spam?.status)}
                                trend={health?.health?.spam?.status === 'green' ? 'Safe' : 'Critical'}
                                isLoading={isLoading} 
                            />
                            <MetricCard 
                                title="Total Emails Sent" 
                                value={health?.sent?.toLocaleString() || 0} 
                                icon={Activity} 
                                tone="default"
                                isLoading={isLoading} 
                            />
                        </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* PRODUCT AREAS REFACTOR */}
                        <div className="lg:col-span-2 space-y-4">
                            <h2 className="text-[10px] font-bold text-[var(--text-primary)] flex items-center gap-2 uppercase tracking-[0.2em]">
                                <LayoutDashboard className="h-4 w-4 text-[var(--accent)]" /> Workspaces
                            </h2>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {quickLinks.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <Link key={item.href} href={item.href} className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all hover-float-right shadow-sm">
                                            <div className="absolute top-0 right-0 p-4 opacity-0 transition-all group-hover:opacity-100">
                                                <ArrowUpRight className="h-4 w-4 text-[var(--accent)]" />
                                            </div>
                                            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-secondary)] text-[var(--accent)] shadow-inner">
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">{item.title}</h3>
                                            <p className="mt-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter opacity-70 line-clamp-2">{item.description}</p>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* RECOMMENDED ACTIONS */}
                        <div className="space-y-4">
                            <h2 className="text-[10px] font-bold text-[var(--text-primary)] flex items-center gap-2 uppercase tracking-[0.2em]">
                                <Sparkles className="h-4 w-4 text-[var(--ai-accent)]" /> Suggested Actions
                            </h2>
                            <div className="flex flex-col gap-3">
                                {recommendedActions.map((action, idx) => (
                                    <Link key={idx} href={action.href} className="group flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 transition-all hover-float-right shadow-sm">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-tight">{action.label}</span>
                                            <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-tighter opacity-60 mt-0.5">{action.desc}</span>
                                        </div>
                                        <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                                    </Link>
                                ))}
                                
                                {/* Placeholder for Data Visualization Feel (e.g. mini chart) */}
                                <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/30 p-5 h-[140px] flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Activity 7d</span>
                                        <Activity className="h-3 w-3 text-[var(--text-muted)]" />
                                    </div>
                                    <div className="flex items-end gap-1.5 h-16 w-full opacity-60">
                                        {/* Skeleton bar chart */}
                                        <div className="bg-[var(--accent)]/40 w-full rounded-t-sm h-[30%]" />
                                        <div className="bg-[var(--accent)]/40 w-full rounded-t-sm h-[50%]" />
                                        <div className="bg-[var(--accent)]/40 w-full rounded-t-sm h-[20%]" />
                                        <div className="bg-[var(--accent)]/40 w-full rounded-t-sm h-[80%]" />
                                        <div className="bg-[var(--accent)]/60 w-full rounded-t-sm h-[60%]" />
                                        <div className="bg-[var(--accent)] w-full rounded-t-sm h-[90%]" />
                                        <div className="bg-[var(--accent)] w-full rounded-t-sm h-[70%]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                /* ONBOARDING STATE */
                <div className="grid gap-8 lg:grid-cols-[1.35fr_0.95fr]">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-sm">
                        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div>
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">Launch Checklist</h2>
                                <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                                    Establish a solid foundation before sending your first campaign.
                                </p>
                            </div>
                            <div className="w-full sm:w-[160px] flex-shrink-0">
                                <div className="mb-2 flex items-center justify-between text-xs font-bold text-[var(--text-muted)]">
                                    <span>Progress</span>
                                    <span className="text-[var(--accent)]">{progressPercent}%</span>
                                </div>
                                <div className="h-2.5 overflow-hidden rounded-full bg-[var(--bg-secondary)] shadow-inner">
                                    <div className="h-full bg-gradient-to-r from-[var(--accent)] to-blue-400 transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <ChecklistItem isCompleted title="Workspace created" />
                            <ChecklistItem isCompleted={hasDomain} title={hasDomain ? 'Domain verified' : 'Authenticate your sending domain'} description="Improve deliverability and unlock branded sending by verifying DNS records." href="/settings/domain" actionLabel="Verify domain" />
                            <ChecklistItem isCompleted={hasSender} title={hasSender ? 'Sender identity verified' : 'Verify a sender identity'} description="Protect against spoofing and confirm who can send from your workspace." href="/settings/senders" actionLabel="Verify sender" />
                            <ChecklistItem isCompleted={hasContacts} title={hasContacts ? 'Audience imported' : 'Import your audience'} description="Bring in contacts so segmentation, suppressions, and delivery safeguards can start working." href="/contacts" actionLabel="Import contacts" />
                            <ChecklistItem isCompleted={hasCampaigns} title={hasCampaigns ? 'First campaign created' : 'Create your first campaign'} description="Use a template, select a segment, and run a preflight before sending." href="/campaigns/new" actionLabel="Create campaign" />
                        </div>
                    </div>

                    <div className="space-y-6">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-xl bg-[var(--ai-accent)]/10 text-[var(--ai-accent)]">
                                    <Sparkles className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-bold text-[var(--text-primary)]">Why this matters</h3>
                            </div>
                            
                            <div className="space-y-5 text-sm leading-relaxed text-[var(--text-muted)]">
                                <div className="flex gap-3">
                                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                                    <p><strong className="text-[var(--text-primary)] font-semibold">Inbox Placement.</strong> Verified infrastructure raises inbox trust and keeps analytics meaningful.</p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                                    <p><strong className="text-[var(--text-primary)] font-semibold">Audience Engine.</strong> Imported contacts feed the segmentation and suppression engine from day one.</p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                                    <p><strong className="text-[var(--text-primary)] font-semibold">Baseline Metrics.</strong> Your first campaign becomes the baseline for future deliverability and performance insights.</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Placeholder visual to make the right column look full and premium */}
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 overflow-hidden relative shadow-sm">
                            <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">System Status</p>
                                    <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Ready for launch</p>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center">
                                    <Activity className="h-4 w-4 text-[var(--text-muted)]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
